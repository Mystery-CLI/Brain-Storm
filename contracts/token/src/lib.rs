#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, String, Symbol,
};

// =============================================================================
// Storage keys
// =============================================================================

#[contracttype]
pub enum DataKey {
    Admin,
    Balance(Address),
    Allowance(Address, Address), // (owner, spender)
    TotalSupply,
    Vesting(Address),
}

// =============================================================================
// Structs
// =============================================================================

#[contracttype]
#[derive(Clone)]
pub struct VestingSchedule {
    pub beneficiary: Address,
    pub total_amount: i128,
    pub start_ledger: u32,
    pub cliff_ledger: u32,
    pub end_ledger: u32,
    pub claimed: i128,
}

// =============================================================================
// Events
// =============================================================================

const TRANSFER: Symbol = symbol_short!("transfer");
const APPROVE: Symbol = symbol_short!("approve");
const MINT: Symbol = symbol_short!("mint");
const BURN: Symbol = symbol_short!("burn");

// =============================================================================
// Contract
// =============================================================================

#[contract]
pub struct TokenContract;

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

// ── Internal helpers ─────────────────────────────────────────────────────────

fn get_balance(env: &Env, addr: &Address) -> i128 {
    env.storage()
        .instance()
        .get(&DataKey::Balance(addr.clone()))
        .unwrap_or(0)
}

fn set_balance(env: &Env, addr: &Address, amount: i128) {
    env.storage()
        .instance()
        .set(&DataKey::Balance(addr.clone()), &amount);
}

fn get_total_supply(env: &Env) -> i128 {
    env.storage()
        .instance()
        .get(&DataKey::TotalSupply)
        .unwrap_or(0)
}

fn set_total_supply(env: &Env, amount: i128) {
    env.storage()
        .instance()
        .set(&DataKey::TotalSupply, &amount);
}

fn get_allowance(env: &Env, owner: &Address, spender: &Address) -> i128 {
    env.storage()
        .instance()
        .get(&DataKey::Allowance(owner.clone(), spender.clone()))
        .unwrap_or(0)
}

fn set_allowance(env: &Env, owner: &Address, spender: &Address, amount: i128) {
    env.storage()
        .instance()
        .set(&DataKey::Allowance(owner.clone(), spender.clone()), &amount);
}

// ── Contract ─────────────────────────────────────────────────────────────────

#[contractimpl]
impl TokenContract {
    // -------------------------------------------------------------------------
    // SEP-0041: Metadata
    // -------------------------------------------------------------------------

    pub fn name(_env: Env) -> String {
        String::from_str(&_env, "Brain-Storm Token")
    }

    pub fn symbol(_env: Env) -> String {
        String::from_str(&_env, "BST")
    }

    pub fn decimals(_env: Env) -> u32 {
        7
    }

    // -------------------------------------------------------------------------
    // SEP-0041: initialize
    // -------------------------------------------------------------------------

    pub fn initialize(env: Env, admin: Address) {
        assert!(
            !env.storage().instance().has(&DataKey::Admin),
            "Already initialized"
        );
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::TotalSupply, &0_i128);
    }

    // -------------------------------------------------------------------------
    // SEP-0041: balance / total_supply
    // -------------------------------------------------------------------------

    pub fn balance(env: Env, addr: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Balance(addr))
            .unwrap_or(0)
    }

    pub fn total_supply(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::TotalSupply)
            .unwrap_or(0)
    }

    // -------------------------------------------------------------------------
    // SEP-0041: mint (admin only)
    // -------------------------------------------------------------------------

    pub fn mint(env: Env, to: Address, amount: i128) {
        assert!(amount > 0, "Amount must be positive");
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        Self::add_balance(&env, &to, amount);
        Self::add_supply(&env, amount);

        env.events()
            .publish((MINT, symbol_short!("to"), to), amount);
    }

    // -------------------------------------------------------------------------
    // SEP-0041: burn
    // -------------------------------------------------------------------------

    pub fn burn(env: Env, from: Address, amount: i128) {
        assert!(amount > 0, "Amount must be positive");
        from.require_auth();

        let bal = Self::balance(env.clone(), from.clone());
        assert!(bal >= amount, "Insufficient balance");

        Self::sub_balance(&env, &from, amount);
        Self::sub_supply(&env, amount);

        env.events()
            .publish((BURN, symbol_short!("from"), from), amount);
    }

    // -------------------------------------------------------------------------
    // SEP-0041: transfer
    // -------------------------------------------------------------------------

    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        assert!(amount > 0, "Amount must be positive");
        from.require_auth();

        let bal = Self::balance(env.clone(), from.clone());
        assert!(bal >= amount, "Insufficient balance");

        Self::sub_balance(&env, &from, amount);
        Self::add_balance(&env, &to, amount);

        env.events()
            .publish((TRANSFER, symbol_short!("from"), from.clone()), (to, amount));
    }

    // -------------------------------------------------------------------------
    // SEP-0041: approve / allowance / transfer_from
    // -------------------------------------------------------------------------

    pub fn approve(env: Env, owner: Address, spender: Address, amount: i128) {
        assert!(amount >= 0, "Allowance must be non-negative");
        owner.require_auth();

        env.storage()
            .persistent()
            .set(&DataKey::Allowance(owner.clone(), spender.clone()), &amount);

        env.events().publish(
            (APPROVE, symbol_short!("owner"), owner),
            (spender, amount),
        );
    }

    pub fn allowance(env: Env, owner: Address, spender: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Allowance(owner, spender))
            .unwrap_or(0)
    }

    pub fn transfer_from(env: Env, spender: Address, from: Address, to: Address, amount: i128) {
        assert!(amount > 0, "Amount must be positive");
        spender.require_auth();

        let allowed = Self::allowance(env.clone(), from.clone(), spender.clone());
        assert!(allowed >= amount, "Allowance exceeded");

        let bal = Self::balance(env.clone(), from.clone());
        assert!(bal >= amount, "Insufficient balance");

        // Deduct allowance
        env.storage().persistent().set(
            &DataKey::Allowance(from.clone(), spender.clone()),
            &(allowed - amount),
        );

        Self::sub_balance(&env, &from, amount);
        Self::add_balance(&env, &to, amount);

        env.events()
            .publish((TRANSFER, symbol_short!("from"), from), (to, amount));
    }

    // -------------------------------------------------------------------------
    // Vesting (instructor rewards)
    // -------------------------------------------------------------------------

    /// Create a linear vesting schedule for an instructor (admin only).
    pub fn create_vesting(
        env: Env,
        admin: Address,
        beneficiary: Address,
        total_amount: i128,
        cliff_ledger: u32,
        end_ledger: u32,
    ) {
        admin.require_auth();
        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(admin == stored_admin, "Only admin can create vesting");
        assert!(total_amount > 0, "Amount must be positive");

        let start_ledger = env.ledger().sequence();
        assert!(cliff_ledger >= start_ledger, "Cliff must be >= start");
        assert!(end_ledger > cliff_ledger, "End must be after cliff");

        env.storage().persistent().set(
            &DataKey::Vesting(beneficiary.clone()),
            &VestingSchedule {
                beneficiary,
                total_amount,
                start_ledger,
                cliff_ledger,
                end_ledger,
                claimed: 0,
            },
        );
    }

    /// Claim vested tokens — mints the claimable amount to the beneficiary.
    pub fn claim_vesting(env: Env, beneficiary: Address) {
        beneficiary.require_auth();

        let key = DataKey::Vesting(beneficiary.clone());
        let mut schedule: VestingSchedule =
            env.storage().persistent().get(&key).expect("No vesting schedule found");

        let claimable =
            Self::vested_amount(&schedule, env.ledger().sequence()) - schedule.claimed;
        assert!(claimable > 0, "Nothing to claim yet");

        schedule.claimed += claimable;
        env.storage().persistent().set(&key, &schedule);

        Self::add_balance(&env, &beneficiary, claimable);
        Self::add_supply(&env, claimable);

        env.events()
            .publish((MINT, symbol_short!("to"), beneficiary), claimable);
    }

    pub fn get_vesting(env: Env, beneficiary: Address) -> Option<VestingSchedule> {
        env.storage()
            .persistent()
            .get(&DataKey::Vesting(beneficiary))
    }

    // -------------------------------------------------------------------------
    // Legacy mint_reward (kept for backward compat)
    // -------------------------------------------------------------------------

    pub fn mint_reward(env: Env, caller: Address, recipient: Address, amount: i128) {
        acquire_lock(&env);

        caller.require_auth();
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(caller == admin, "Only admin can mint");
        assert!(amount > 0, "Amount must be positive");

        Self::add_balance(&env, &recipient, amount);
        Self::add_supply(&env, amount);

        env.events()
            .publish((MINT, symbol_short!("to"), recipient), amount);
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    fn add_balance(env: &Env, addr: &Address, amount: i128) {
        let current: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::Balance(addr.clone()))
            .unwrap_or(0);
        env.storage()
            .persistent()
            .set(&DataKey::Balance(addr.clone()), &(current + amount));
    }

    fn sub_balance(env: &Env, addr: &Address, amount: i128) {
        let current: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::Balance(addr.clone()))
            .unwrap_or(0);
        env.storage()
            .persistent()
            .set(&DataKey::Balance(addr.clone()), &(current - amount));
    }

    fn add_supply(env: &Env, amount: i128) {
        let current: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalSupply)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::TotalSupply, &(current + amount));
    }

    fn sub_supply(env: &Env, amount: i128) {
        let current: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalSupply)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::TotalSupply, &(current - amount));
    }

    fn vested_amount(schedule: &VestingSchedule, current_ledger: u32) -> i128 {
        if current_ledger < schedule.cliff_ledger {
            return 0;
        }
        if current_ledger >= schedule.end_ledger {
            return schedule.total_amount;
        }
        let elapsed = (current_ledger - schedule.start_ledger) as i128;
        let duration = (schedule.end_ledger - schedule.start_ledger) as i128;
        schedule.total_amount * elapsed / duration
    }
}

// =============================================================================
// Tests
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::{Address as _, Events, Ledger, LedgerInfo};
    use soroban_sdk::Env;

    fn setup() -> (Env, TokenContractClient<'static>, Address) {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register_contract(None, TokenContract);
        let client = TokenContractClient::new(&env, &id);
        let admin = Address::generate(&env);
        client.initialize(&admin);
        (env, client, admin)
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

    // ---- Metadata -----------------------------------------------------------

    #[test]
    fn test_metadata() {
        let (env, client, _) = setup();
        assert_eq!(client.name(), String::from_str(&env, "Brain-Storm Token"));
        assert_eq!(client.symbol(), String::from_str(&env, "BST"));
        assert_eq!(client.decimals(), 7);
    }

    // ---- Mint ---------------------------------------------------------------

    #[test]
    fn test_mint_increases_balance_and_supply() {
        let (_, client, _) = setup();
        let user = Address::generate(&client.env);
        client.mint(&user, &1_000_0000000_i128);
        assert_eq!(client.balance(&user), 1_000_0000000);
        assert_eq!(client.total_supply(), 1_000_0000000);
    }

    #[test]
    #[should_panic(expected = "Amount must be positive")]
    fn test_mint_zero_panics() {
        let (_, client, _) = setup();
        let user = Address::generate(&client.env);
        client.mint(&user, &0);
    }

    #[test]
    fn test_mint_emits_event() {
        let (env, client, _) = setup();
        let user = Address::generate(&env);
        client.mint(&user, &500);
        let events = env.events().all();
        assert!(!events.is_empty());
    }

    // ---- Burn ---------------------------------------------------------------

    #[test]
    fn test_burn_reduces_balance_and_supply() {
        let (_, client, _) = setup();
        let user = Address::generate(&client.env);
        client.mint(&user, &1000);
        client.burn(&user, &400);
        assert_eq!(client.balance(&user), 600);
        assert_eq!(client.total_supply(), 600);
    }

    #[test]
    #[should_panic(expected = "Insufficient balance")]
    fn test_burn_overdraft_panics() {
        let (_, client, _) = setup();
        let user = Address::generate(&client.env);
        client.mint(&user, &100);
        client.burn(&user, &200);
    }

    // ---- Transfer -----------------------------------------------------------

    #[test]
    fn test_transfer() {
        let (_, client, _) = setup();
        let alice = Address::generate(&client.env);
        let bob = Address::generate(&client.env);
        client.mint(&alice, &1000);
        client.transfer(&alice, &bob, &300);
        assert_eq!(client.balance(&alice), 700);
        assert_eq!(client.balance(&bob), 300);
        assert_eq!(client.total_supply(), 1000); // unchanged
    }

    #[test]
    #[should_panic(expected = "Insufficient balance")]
    fn test_transfer_overdraft_panics() {
        let (_, client, _) = setup();
        let alice = Address::generate(&client.env);
        let bob = Address::generate(&client.env);
        client.mint(&alice, &100);
        client.transfer(&alice, &bob, &200);
    }

    // ---- Approve / Allowance / transfer_from --------------------------------

    #[test]
    fn test_approve_and_allowance() {
        let (_, client, _) = setup();
        let alice = Address::generate(&client.env);
        let spender = Address::generate(&client.env);
        client.mint(&alice, &1000);
        client.approve(&alice, &spender, &500);
        assert_eq!(client.allowance(&alice, &spender), 500);
    }

    #[test]
    fn test_transfer_from_deducts_allowance() {
        let (_, client, _) = setup();
        let alice = Address::generate(&client.env);
        let bob = Address::generate(&client.env);
        let spender = Address::generate(&client.env);
        client.mint(&alice, &1000);
        client.approve(&alice, &spender, &600);
        client.transfer_from(&spender, &alice, &bob, &400);
        assert_eq!(client.balance(&alice), 600);
        assert_eq!(client.balance(&bob), 400);
        assert_eq!(client.allowance(&alice, &spender), 200);
    }

    #[test]
    #[should_panic(expected = "Allowance exceeded")]
    fn test_transfer_from_exceeds_allowance_panics() {
        let (_, client, _) = setup();
        let alice = Address::generate(&client.env);
        let bob = Address::generate(&client.env);
        let spender = Address::generate(&client.env);
        client.mint(&alice, &1000);
        client.approve(&alice, &spender, &100);
        client.transfer_from(&spender, &alice, &bob, &200);
    }

    #[test]
    fn test_approve_emits_event() {
        let (env, client, _) = setup();
        let alice = Address::generate(&env);
        let spender = Address::generate(&env);
        client.mint(&alice, &1000);
        client.approve(&alice, &spender, &500);
        let events = env.events().all();
        assert!(!events.is_empty());
    }

    // ---- Vesting (cliff / partial / full) -----------------------------------

    #[test]
    #[should_panic(expected = "Nothing to claim yet")]
    fn test_cliff_not_reached() {
        let (env, client, admin) = setup();
        let instructor = Address::generate(&env);
        set_ledger(&env, 10);
        client.create_vesting(&admin, &instructor, &1000, &20, &30);
        set_ledger(&env, 15);
        client.claim_vesting(&instructor);
    }

    #[test]
    fn test_partial_vest() {
        let (env, client, admin) = setup();
        let instructor = Address::generate(&env);
        set_ledger(&env, 10);
        client.create_vesting(&admin, &instructor, &1000, &10, &30);
        set_ledger(&env, 20);
        client.claim_vesting(&instructor);
        assert_eq!(client.balance(&instructor), 500);
        assert_eq!(client.get_vesting(&instructor).unwrap().claimed, 500);
    }

    #[test]
    fn test_full_vest() {
        let (env, client, admin) = setup();
        let instructor = Address::generate(&env);
        set_ledger(&env, 10);
        client.create_vesting(&admin, &instructor, &1000, &10, &30);
        set_ledger(&env, 30);
        client.claim_vesting(&instructor);
        assert_eq!(client.balance(&instructor), 1000);
        assert_eq!(client.total_supply(), 1000);
    }

    #[test]
    fn test_incremental_claims() {
        let (env, client, admin) = setup();
        let instructor = Address::generate(&env);
        set_ledger(&env, 0);
        client.create_vesting(&admin, &instructor, &1000, &0, &100);
        set_ledger(&env, 50);
        client.claim_vesting(&instructor);
        assert_eq!(client.balance(&instructor), 500);
        set_ledger(&env, 100);
        client.claim_vesting(&instructor);
        assert_eq!(client.balance(&instructor), 1000);
    }

    #[test]
    #[should_panic(expected = "Only admin can create vesting")]
    fn test_only_admin_can_create_vesting() {
        let (env, client, _) = setup();
        let instructor = Address::generate(&env);
        let rando = Address::generate(&env);
        set_ledger(&env, 10);
        client.create_vesting(&rando, &instructor, &1000, &20, &30);
    }

    // ---- Double-init guard --------------------------------------------------

    #[test]
    #[should_panic(expected = "Already initialized")]
    fn test_double_initialize_panics() {
        let (_, client, admin) = setup();
        client.initialize(&admin);
    }
}

mod tests;
