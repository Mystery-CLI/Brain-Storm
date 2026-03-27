#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, vec, Address, Env, Symbol, Vec,
};

// TTL thresholds (in ledgers)
const TTL_THRESHOLD: u32 = 100;
const TTL_EXTEND_TO: u32 = 500;

// =============================================================================
// Storage keys
// =============================================================================

#[contracttype]
pub enum DataKey {
    Admin,
    Progress(Address, Symbol),   // persistent: ProgressRecord
    StudentCourses(Address),     // persistent: Vec<Symbol> — secondary index
}

// =============================================================================
// Types
// =============================================================================

#[contracttype]
#[derive(Clone)]
pub struct ProgressRecord {
    pub student: Address,
    pub course_id: Symbol,
    pub progress_pct: u32,
    pub completed: bool,
    pub timestamp: u64,
}

// =============================================================================
// Contract
// =============================================================================
#[contracttype]
pub enum DataKey {
    Admin,
    Progress(Address, Symbol),
    Locked, // reentrancy guard
}

// ── Reentrancy guard ─────────────────────────────────────────────────────────

fn acquire_lock(env: &Env) {
    let locked: bool = env
        .storage()
        .instance()
        .get(&DataKey::Locked)
        .unwrap_or(false);
    assert!(!locked, "reentrant call");
    env.storage().instance().set(&DataKey::Locked, &true);
}

fn release_lock(env: &Env) {
    env.storage().instance().set(&DataKey::Locked, &false);
}

// ── Contract ─────────────────────────────────────────────────────────────────

#[contract]
pub struct AnalyticsContract;

#[contractimpl]
impl AnalyticsContract {
    // -------------------------------------------------------------------------
    // Admin
    // -------------------------------------------------------------------------

    pub fn initialize(env: Env, admin: Address) {
        assert!(
            !env.storage().instance().has(&DataKey::Admin),
            "Already initialized"
        );
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    pub fn set_admin(env: Env, new_admin: Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &new_admin);
    }

    pub fn get_admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).unwrap()
    }

    // -------------------------------------------------------------------------
    // Progress
    // -------------------------------------------------------------------------

    /// Record or update a student's course progress.
    /// Callable by the student themselves OR the admin.
    pub fn record_progress(
        env: Env,
        caller: Address,
        student: Address,
        course_id: Symbol,
        progress_pct: u32,
    ) {
        caller.require_auth();
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(
            caller == student || caller == admin,
            "Unauthorized: must be student or admin"
        );
        assert!(progress_pct <= 100, "Progress must be 0-100");

        let record = ProgressRecord {
            student: student.clone(),
            course_id: course_id.clone(),
            progress_pct,
            completed: progress_pct == 100,
            timestamp: env.ledger().timestamp(),
        };

        // Write progress record to persistent storage
        let progress_key = DataKey::Progress(student.clone(), course_id.clone());
        env.storage().persistent().set(&progress_key, &record);
        env.storage()
            .persistent()
            .extend_ttl(&progress_key, TTL_THRESHOLD, TTL_EXTEND_TO);

        // Update secondary index: student → [course_ids]
        let index_key = DataKey::StudentCourses(student.clone());
        let mut courses: Vec<Symbol> = env
            .storage()
            .persistent()
            .get(&index_key)
            .unwrap_or_else(|| vec![&env]);

        if !courses.contains(&course_id) {
            courses.push_back(course_id.clone());
            env.storage().persistent().set(&index_key, &courses);
        }
        env.storage()
            .persistent()
            .extend_ttl(&index_key, TTL_THRESHOLD, TTL_EXTEND_TO);

        // Emit events
        env.events().publish(
            (symbol_short!("analytics"), symbol_short!("prog_upd")),
            (student.clone(), course_id.clone(), progress_pct),
        );
        if progress_pct == 100 {
            env.events().publish(
                (symbol_short!("analytics"), symbol_short!("completed")),
                (student, course_id),
            );
        }
    }

    /// Reset a student's progress for a specific course (admin only).
    pub fn reset_progress(env: Env, admin: Address, student: Address, course_id: Symbol) {
        admin.require_auth();
        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(admin == stored_admin, "Only admin can reset progress");

        let progress_key = DataKey::Progress(student.clone(), course_id.clone());
        env.storage().persistent().remove(&progress_key);

        // Remove from secondary index
        let index_key = DataKey::StudentCourses(student.clone());
        if let Some(mut courses) = env
            .storage()
            .persistent()
            .get::<DataKey, Vec<Symbol>>(&index_key)
        {
            let pos = courses.iter().position(|c| c == course_id);
            if let Some(i) = pos {
                courses.remove(i as u32);
                env.storage().persistent().set(&index_key, &courses);
                env.storage()
                    .persistent()
                    .extend_ttl(&index_key, TTL_THRESHOLD, TTL_EXTEND_TO);
            }
        }
    }

    // -------------------------------------------------------------------------
    // Progress — read
    // -------------------------------------------------------------------------

    /// Get a student's progress for a specific course.
    pub fn get_progress(env: Env, student: Address, course_id: Symbol) -> Option<ProgressRecord> {
        let key = DataKey::Progress(student, course_id);
        let record = env.storage().persistent().get(&key)?;
        env.storage()
            .persistent()
            .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
        Some(record)
    }

    /// Get all progress records for a student via the secondary index.
    pub fn get_all_progress(env: Env, student: Address) -> Vec<ProgressRecord> {
        let index_key = DataKey::StudentCourses(student.clone());
        let courses: Vec<Symbol> = match env.storage().persistent().get(&index_key) {
            Some(c) => {
                env.storage()
                    .persistent()
                    .extend_ttl(&index_key, TTL_THRESHOLD, TTL_EXTEND_TO);
                c
            }
            None => return vec![&env],
        };

        let mut results = vec![&env];
        for course_id in courses.iter() {
            let key = DataKey::Progress(student.clone(), course_id.clone());
            if let Some(record) = env.storage().persistent().get::<DataKey, ProgressRecord>(&key) {
                env.storage()
                    .persistent()
                    .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
                results.push_back(record);
            }
        }
        results
    }
}

// =============================================================================
// Tests
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::{Address as _, Events, Ledger, LedgerInfo};
    use soroban_sdk::{symbol_short, Env, FromVal, Symbol};

    fn setup() -> (Env, AnalyticsContractClient<'static>, Address, Address) {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register_contract(None, AnalyticsContract);
        let client = AnalyticsContractClient::new(&env, &id);
        let admin = Address::generate(&env);
        let student = Address::generate(&env);
        client.initialize(&admin);
        (env, client, admin, student)
    }

    fn set_ledger(env: &Env, sequence: u32) {
        env.ledger().set(LedgerInfo {
            sequence_number: sequence,
            timestamp: sequence as u64 * 5,
            protocol_version: 21,
            network_id: Default::default(),
            base_reserve: 10,
            min_temp_entry_ttl: 1000,
            min_persistent_entry_ttl: 1000,
            max_entry_ttl: 100_000,
        });
    }

    fn has_event(env: &Env, topic1: &str, topic2: &str) -> bool {
        let t1 = Symbol::new(env, topic1);
        let t2 = Symbol::new(env, topic2);
        env.events().all().iter().any(|e| {
            let topics = e.1;
            if topics.len() < 2 {
                return false;
            }
            let s0 = Symbol::from_val(env, &topics.get(0).unwrap());
            let s1 = Symbol::from_val(env, &topics.get(1).unwrap());
            s0 == t1 && s1 == t2
        })
    }

    // ---- initialize / admin -------------------------------------------------

    #[test]
    fn test_initialize_sets_admin() {
        let (_, client, admin, _) = setup();
        assert_eq!(client.get_admin(), admin);
    }

    #[test]
    #[should_panic(expected = "Already initialized")]
    fn test_double_initialize_panics() {
        let (_, client, admin, _) = setup();
        client.initialize(&admin);
    }

    #[test]
    fn test_set_admin() {
        let (env, client, old_admin, _) = setup();
        let new_admin = Address::generate(&env);
        client.set_admin(&new_admin);
        assert_eq!(client.get_admin(), new_admin);
        assert_ne!(client.get_admin(), old_admin);
    }

    // ---- record_progress ----------------------------------------------------

    #[test]
    fn test_student_can_record_own_progress() {
        let (_, client, _, student) = setup();
        let course = symbol_short!("RUST101");
        client.record_progress(&student, &student, &course, &75);
        let rec = client.get_progress(&student, &course).unwrap();
        assert_eq!(rec.progress_pct, 75);
        assert!(!rec.completed);
    }

    #[test]
    fn test_admin_can_record_student_progress() {
        let (_, client, admin, student) = setup();
        let course = symbol_short!("RUST101");
        client.record_progress(&admin, &student, &course, &100);
        let rec = client.get_progress(&student, &course).unwrap();
        assert_eq!(rec.progress_pct, 100);
        assert!(rec.completed);
    }

    #[test]
    #[should_panic(expected = "Unauthorized: must be student or admin")]
    fn test_third_party_cannot_record_progress() {
        let (env, client, _, student) = setup();
        let rando = Address::generate(&env);
        let course = symbol_short!("RUST101");
        client.record_progress(&rando, &student, &course, &50);
    }

    #[test]
    #[should_panic(expected = "Progress must be 0-100")]
    fn test_progress_over_100_panics() {
        let (_, client, _, student) = setup();
        let course = symbol_short!("RUST101");
        client.record_progress(&student, &student, &course, &101);
    }

    // ---- persistent storage / TTL -------------------------------------------

    #[test]
    fn test_record_survives_ledger_advance() {
        let (env, client, _, student) = setup();
        let course = symbol_short!("RUST101");
        set_ledger(&env, 1);
        client.record_progress(&student, &student, &course, &60);
        // Advance well within TTL_EXTEND_TO (500 ledgers)
        set_ledger(&env, 400);
        let rec = client.get_progress(&student, &course).unwrap();
        assert_eq!(rec.progress_pct, 60);
    }

    // ---- get_all_progress / secondary index ---------------------------------

    #[test]
    fn test_get_all_progress_empty() {
        let (_, client, _, student) = setup();
        let all = client.get_all_progress(&student);
        assert_eq!(all.len(), 0);
    }

    #[test]
    fn test_get_all_progress_single_course() {
        let (_, client, _, student) = setup();
        let course = symbol_short!("RUST101");
        client.record_progress(&student, &student, &course, &80);
        let all = client.get_all_progress(&student);
        assert_eq!(all.len(), 1);
        assert_eq!(all.get(0).unwrap().progress_pct, 80);
    }

    #[test]
    fn test_get_all_progress_multiple_courses() {
        let (_, client, _, student) = setup();
        let c1 = symbol_short!("RUST101");
        let c2 = symbol_short!("SOL201");
        let c3 = symbol_short!("WEB301");
        client.record_progress(&student, &student, &c1, &100);
        client.record_progress(&student, &student, &c2, &50);
        client.record_progress(&student, &student, &c3, &25);
        let all = client.get_all_progress(&student);
        assert_eq!(all.len(), 3);
    }

    #[test]
    fn test_get_all_progress_no_duplicates_on_update() {
        let (_, client, _, student) = setup();
        let course = symbol_short!("RUST101");
        // Record twice — secondary index should not duplicate
        client.record_progress(&student, &student, &course, &50);
        client.record_progress(&student, &student, &course, &75);
        let all = client.get_all_progress(&student);
        assert_eq!(all.len(), 1);
        assert_eq!(all.get(0).unwrap().progress_pct, 75);
    }

    #[test]
    fn test_get_all_progress_isolated_per_student() {
        let (env, client, _, student) = setup();
        let other = Address::generate(&env);
        let course = symbol_short!("RUST101");
        client.record_progress(&student, &student, &course, &100);
        // other student has no records
        let all = client.get_all_progress(&other);
        assert_eq!(all.len(), 0);
    }

    // ---- reset_progress -----------------------------------------------------

    #[test]
    fn test_admin_can_reset_progress() {
        let (_, client, admin, student) = setup();
        let course = symbol_short!("RUST101");
        client.record_progress(&student, &student, &course, &80);
        client.reset_progress(&admin, &student, &course);
        assert!(client.get_progress(&student, &course).is_none());
    }

    #[test]
    fn test_reset_removes_from_secondary_index() {
        let (_, client, admin, student) = setup();
        let c1 = symbol_short!("RUST101");
        let c2 = symbol_short!("SOL201");
        client.record_progress(&student, &student, &c1, &100);
        client.record_progress(&student, &student, &c2, &50);
        client.reset_progress(&admin, &student, &c1);
        let all = client.get_all_progress(&student);
        assert_eq!(all.len(), 1);
        assert_eq!(all.get(0).unwrap().course_id, c2);
    }

    #[test]
    #[should_panic(expected = "Only admin can reset progress")]
    fn test_non_admin_cannot_reset_progress() {
        let (env, client, _, student) = setup();
        let rando = Address::generate(&env);
        let course = symbol_short!("RUST101");
        client.record_progress(&student, &student, &course, &80);
        client.reset_progress(&rando, &student, &course);
    }

    // ---- events -------------------------------------------------------------

    #[test]
    fn test_progress_updated_event_emitted() {
        let (env, client, _, student) = setup();
        let course = symbol_short!("RUST101");
        client.record_progress(&student, &student, &course, &50);
        assert!(has_event(&env, "analytics", "prog_upd"));
    }

    #[test]
    fn test_completed_event_emitted_at_100() {
        let (env, client, _, student) = setup();
        let course = symbol_short!("RUST101");
        client.record_progress(&student, &student, &course, &100);
        assert!(has_event(&env, "analytics", "completed"));
    }

    #[test]
    fn test_completed_event_not_emitted_below_100() {
        let (env, client, _, student) = setup();
        let course = symbol_short!("RUST101");
        client.record_progress(&student, &student, &course, &99);
        assert!(!has_event(&env, "analytics", "completed"));
    }
}

// =============================================================================
// Tests
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::{Address as _, Events};
    use soroban_sdk::{symbol_short, Env, FromVal, Symbol};

    fn setup() -> (Env, AnalyticsContractClient<'static>, Address, Address) {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register_contract(None, AnalyticsContract);
        let client = AnalyticsContractClient::new(&env, &id);
        let admin = Address::generate(&env);
        let student = Address::generate(&env);
        client.initialize(&admin);
        (env, client, admin, student)
    }

    // ---- initialize ---------------------------------------------------------

    #[test]
    fn test_initialize_sets_admin() {
        let (_, client, admin, _) = setup();
        assert_eq!(client.get_admin(), admin);
    }

    #[test]
    #[should_panic(expected = "Already initialized")]
    fn test_double_initialize_panics() {
        let (_, client, admin, _) = setup();
        client.initialize(&admin);
    }

    // ---- set_admin ----------------------------------------------------------

    #[test]
    fn test_set_admin() {
        let (env, client, old_admin, _) = setup();
        let new_admin = Address::generate(&env);
        client.set_admin(&new_admin);
        assert_eq!(client.get_admin(), new_admin);
        assert_ne!(client.get_admin(), old_admin);
    }

    #[test]
    #[should_panic(expected = "Unauthorized: must be student or admin")]
    fn test_set_admin_by_non_admin_panics() {
        // Verify the logic guard: a rando who is neither student nor admin
        // cannot record progress on behalf of a student.
        let (env, client, _, student) = setup();
        let rando = Address::generate(&env);
        let course = symbol_short!("X");
        client.record_progress(&rando, &student, &course, &10);
    }

    #[test]
    #[should_panic(expected = "Unauthorized: must be student or admin")]
    fn test_set_admin_caller_must_be_current_admin() {
        // After transferring admin to new_admin, the old admin can no longer
        // record progress on behalf of a third-party student.
        let (env, client, old_admin, student) = setup();
        let new_admin = Address::generate(&env);
        client.set_admin(&new_admin); // old_admin → new_admin
        let course = symbol_short!("X");
        // old_admin is now just a rando — not admin, not student
        client.record_progress(&old_admin, &student, &course, &10);
    }

    // ---- record_progress: student auth --------------------------------------

    #[test]
    fn test_student_can_record_own_progress() {
        let (_, client, _, student) = setup();
        let course = symbol_short!("RUST101");
        client.record_progress(&student, &student, &course, &75);
        let rec = client.get_progress(&student, &course).unwrap();
        assert_eq!(rec.progress_pct, 75);
        assert!(!rec.completed);
    }

    #[test]
    fn test_admin_can_record_student_progress() {
        let (_, client, admin, student) = setup();
        let course = symbol_short!("RUST101");
        client.record_progress(&admin, &student, &course, &100);
        let rec = client.get_progress(&student, &course).unwrap();
        assert_eq!(rec.progress_pct, 100);
        assert!(rec.completed);
    }

    #[test]
    #[should_panic(expected = "Unauthorized: must be student or admin")]
    fn test_third_party_cannot_record_progress() {
        let (env, client, _, student) = setup();
        let rando = Address::generate(&env);
        let course = symbol_short!("RUST101");
        // rando is neither student nor admin
        client.record_progress(&rando, &student, &course, &50);
    }

    // ---- progress validation ------------------------------------------------

    #[test]
    #[should_panic(expected = "Progress must be 0-100")]
    fn test_progress_over_100_panics() {
        let (_, client, _, student) = setup();
        let course = symbol_short!("RUST101");
        client.record_progress(&student, &student, &course, &101);
    }

    #[test]
    fn test_completion_flag_set_at_100() {
        let (_, client, _, student) = setup();
        let course = symbol_short!("RUST101");
        client.record_progress(&student, &student, &course, &100);
        let rec = client.get_progress(&student, &course).unwrap();
        assert!(rec.completed);
    }

    #[test]
    fn test_get_progress_returns_none_for_unknown() {
        let (_, client, _, student) = setup();
        let course = symbol_short!("UNKNOWN");
        assert!(client.get_progress(&student, &course).is_none());
    }

    // ---- events -------------------------------------------------------------

    fn has_event(env: &Env, topic1: &str, topic2: &str) -> bool {
        let t1 = Symbol::new(env, topic1);
        let t2 = Symbol::new(env, topic2);
        env.events().all().iter().any(|e| {
            let topics = e.1;
            if topics.len() < 2 {
                return false;
            }
            let s0 = Symbol::from_val(env, &topics.get(0).unwrap());
            let s1 = Symbol::from_val(env, &topics.get(1).unwrap());
            s0 == t1 && s1 == t2
        })
    }

    #[test]
    fn test_progress_updated_event_emitted() {
        let (env, client, _, student) = setup();
        let course = symbol_short!("RUST101");
        client.record_progress(&student, &student, &course, &50);
        assert!(has_event(&env, "analytics", "prog_upd"), "progress_updated event not found");
    }

    #[test]
    fn test_completed_event_emitted_at_100() {
        let (env, client, _, student) = setup();
        let course = symbol_short!("RUST101");
        client.record_progress(&student, &student, &course, &100);
        assert!(has_event(&env, "analytics", "completed"), "completed event not found");
    }

    #[test]
    fn test_completed_event_not_emitted_below_100() {
        let (env, client, _, student) = setup();
        let course = symbol_short!("RUST101");
        client.record_progress(&student, &student, &course, &99);
        assert!(!has_event(&env, "analytics", "completed"), "completed event should not fire below 100");
    }

    #[test]
    fn test_both_events_emitted_at_100() {
        let (env, client, _, student) = setup();
        let course = symbol_short!("RUST101");
        client.record_progress(&student, &student, &course, &100);
        assert!(has_event(&env, "analytics", "prog_upd"), "progress_updated event missing");
        assert!(has_event(&env, "analytics", "completed"), "completed event missing");
    }
}
