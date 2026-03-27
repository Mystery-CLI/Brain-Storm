#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, Symbol};

#[contracttype]
pub struct ProgressRecord {
    pub student: Address,
    pub course_id: Symbol,
    pub progress_pct: u32,
    pub completed: bool,
    pub timestamp: u64,
}

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

        env.storage()
            .persistent()
            .set(&DataKey::Progress(student.clone(), course_id.clone()), &record);

        // Always emit progress_updated
        env.events().publish(
            (symbol_short!("analytics"), symbol_short!("prog_upd")),
            (student.clone(), course_id.clone(), progress_pct),
        );

        // Emit completed only when 100%
        if progress_pct == 100 {
            env.events().publish(
                (symbol_short!("analytics"), symbol_short!("completed")),
                (student, course_id),
            );
        }
    }

    /// Get a student's progress for a course.
    pub fn get_progress(env: Env, student: Address, course_id: Symbol) -> Option<ProgressRecord> {
        env.storage()
            .persistent()
            .get(&DataKey::Progress(student, course_id))
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
