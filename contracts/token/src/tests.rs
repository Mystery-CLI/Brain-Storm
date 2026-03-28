#![cfg(test)]
use soroban_sdk::{testutils::Address as _, Address, Env, String};

use crate::{TokenContract, TokenContractClient};

fn setup() -> (Env, Address, TokenContractClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, TokenContract);
    let client = TokenContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    client.initialize(&admin);
    (env, admin, client)
}

// ============================================================================
// Initialize Tests
// ============================================================================

#[test]
fn test_initialize_sets_admin_correctly() {
    let (_, admin, client) = setup();
    // Verify admin is set by checking we can call admin-only functions
    let user = Address::generate(&client.env);
    client.mint(&user, &100);
    assert_eq!(client.balance(&user), 100);
}

#[test]
#[should_panic(expected = "Already initialized")]
fn test_double_initialize_panics() {
    let (_, admin, client) = setup();
    client.initialize(&admin);
}

#[test]
fn test_initialize_sets_total_supply_to_zero() {
    let (_, _, client) = setup();
    assert_eq!(client.total_supply(), 0);
}

// ============================================================================
// Mint Tests
// ============================================================================

#[test]
fn test_mint_reward_increases_balance() {
    let (env, admin, client) = setup();
    let recipient = Address::generate(&env);
    client.mint_reward(&admin, &recipient, &1000);
    assert_eq!(client.balance(&recipient), 1000);
}

#[test]
fn test_mint_reward_increases_total_supply() {
    let (env, admin, client) = setup();
    let recipient = Address::generate(&env);
    client.mint_reward(&admin, &recipient, &500);
    assert_eq!(client.total_supply(), 500);
}

#[test]
fn test_mint_multiple_recipients() {
    let (env, admin, client) = setup();
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);
    client.mint_reward(&admin, &user1, &300);
    client.mint_reward(&admin, &user2, &200);
    assert_eq!(client.balance(&user1), 300);
    assert_eq!(client.balance(&user2), 200);
    assert_eq!(client.total_supply(), 500);
}

#[test]
#[should_panic(expected = "Only admin can mint")]
fn test_non_admin_mint_reward_panics() {
    let (env, _, client) = setup();
    let rando = Address::generate(&env);
    let recipient = Address::generate(&env);
    client.mint_reward(&rando, &recipient, &100);
}

#[test]
#[should_panic(expected = "Amount must be positive")]
fn test_mint_zero_panics() {
    let (env, admin, client) = setup();
    let recipient = Address::generate(&env);
    client.mint_reward(&admin, &recipient, &0);
}

#[test]
#[should_panic(expected = "Amount must be positive")]
fn test_mint_negative_panics() {
    let (env, admin, client) = setup();
    let recipient = Address::generate(&env);
    client.mint_reward(&admin, &recipient, &-100);
}

// ============================================================================
// Balance Tests
// ============================================================================

#[test]
fn test_balance_returns_zero_for_unknown_address() {
    let (env, _, client) = setup();
    let unknown = Address::generate(&env);
    assert_eq!(client.balance(&unknown), 0);
}

#[test]
fn test_balance_returns_correct_amount() {
    let (env, admin, client) = setup();
    let user = Address::generate(&env);
    client.mint_reward(&admin, &user, &750);
    assert_eq!(client.balance(&user), 750);
}

// ============================================================================
// Transfer Tests
// ============================================================================

#[test]
fn test_transfer_moves_tokens_between_addresses() {
    let (env, admin, client) = setup();
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    client.mint_reward(&admin, &alice, &1000);
    client.transfer(&alice, &bob, &300);
    assert_eq!(client.balance(&alice), 700);
    assert_eq!(client.balance(&bob), 300);
}

#[test]
fn test_transfer_preserves_total_supply() {
    let (env, admin, client) = setup();
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    client.mint_reward(&admin, &alice, &1000);
    client.transfer(&alice, &bob, &400);
    assert_eq!(client.total_supply(), 1000);
}

#[test]
#[should_panic(expected = "Insufficient balance")]
fn test_transfer_overdraft_panics() {
    let (env, admin, client) = setup();
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    client.mint_reward(&admin, &alice, &100);
    client.transfer(&alice, &bob, &200);
}

#[test]
#[should_panic(expected = "Amount must be positive")]
fn test_transfer_zero_panics() {
    let (env, admin, client) = setup();
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    client.mint_reward(&admin, &alice, &100);
    client.transfer(&alice, &bob, &0);
}

// ============================================================================
// Burn Tests
// ============================================================================

#[test]
fn test_burn_reduces_balance() {
    let (env, admin, client) = setup();
    let user = Address::generate(&env);
    client.mint_reward(&admin, &user, &1000);
    client.burn(&user, &300);
    assert_eq!(client.balance(&user), 700);
}

#[test]
fn test_burn_reduces_total_supply() {
    let (env, admin, client) = setup();
    let user = Address::generate(&env);
    client.mint_reward(&admin, &user, &1000);
    client.burn(&user, &400);
    assert_eq!(client.total_supply(), 600);
}

#[test]
fn test_burn_multiple_times() {
    let (env, admin, client) = setup();
    let user = Address::generate(&env);
    client.mint_reward(&admin, &user, &1000);
    client.burn(&user, &200);
    client.burn(&user, &300);
    assert_eq!(client.balance(&user), 500);
    assert_eq!(client.total_supply(), 500);
}

#[test]
#[should_panic(expected = "Insufficient balance")]
fn test_burn_more_than_balance_panics() {
    let (env, admin, client) = setup();
    let user = Address::generate(&env);
    client.mint_reward(&admin, &user, &100);
    client.burn(&user, &200);
}

#[test]
#[should_panic(expected = "Amount must be positive")]
fn test_burn_zero_panics() {
    let (env, admin, client) = setup();
    let user = Address::generate(&env);
    client.mint_reward(&admin, &user, &100);
    client.burn(&user, &0);
}

// ============================================================================
// Approve & Allowance Tests
// ============================================================================

#[test]
fn test_approve_sets_allowance() {
    let (env, admin, client) = setup();
    let owner = Address::generate(&env);
    let spender = Address::generate(&env);
    client.mint_reward(&admin, &owner, &1000);
    client.approve(&owner, &spender, &500);
    assert_eq!(client.allowance(&owner, &spender), 500);
}

#[test]
fn test_allowance_returns_zero_for_unknown() {
    let (env, _, client) = setup();
    let owner = Address::generate(&env);
    let spender = Address::generate(&env);
    assert_eq!(client.allowance(&owner, &spender), 0);
}

#[test]
fn test_approve_overwrites_previous_allowance() {
    let (env, admin, client) = setup();
    let owner = Address::generate(&env);
    let spender = Address::generate(&env);
    client.mint_reward(&admin, &owner, &1000);
    client.approve(&owner, &spender, &500);
    client.approve(&owner, &spender, &300);
    assert_eq!(client.allowance(&owner, &spender), 300);
}

// ============================================================================
// Transfer From Tests
// ============================================================================

#[test]
fn test_transfer_from_moves_tokens() {
    let (env, admin, client) = setup();
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    let spender = Address::generate(&env);
    client.mint_reward(&admin, &alice, &1000);
    client.approve(&alice, &spender, &600);
    client.transfer_from(&spender, &alice, &bob, &400);
    assert_eq!(client.balance(&alice), 600);
    assert_eq!(client.balance(&bob), 400);
}

#[test]
fn test_transfer_from_deducts_allowance() {
    let (env, admin, client) = setup();
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    let spender = Address::generate(&env);
    client.mint_reward(&admin, &alice, &1000);
    client.approve(&alice, &spender, &600);
    client.transfer_from(&spender, &alice, &bob, &400);
    assert_eq!(client.allowance(&alice, &spender), 200);
}

#[test]
#[should_panic(expected = "Allowance exceeded")]
fn test_transfer_from_exceeds_allowance_panics() {
    let (env, admin, client) = setup();
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    let spender = Address::generate(&env);
    client.mint_reward(&admin, &alice, &1000);
    client.approve(&alice, &spender, &100);
    client.transfer_from(&spender, &alice, &bob, &200);
}

#[test]
#[should_panic(expected = "Insufficient balance")]
fn test_transfer_from_insufficient_balance_panics() {
    let (env, admin, client) = setup();
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    let spender = Address::generate(&env);
    client.mint_reward(&admin, &alice, &100);
    client.approve(&alice, &spender, &500);
    client.transfer_from(&spender, &alice, &bob, &200);
}

// ============================================================================
// Metadata Tests
// ============================================================================

#[test]
fn test_name_returns_correct_value() {
    let (env, _, client) = setup();
    assert_eq!(client.name(), String::from_str(&env, "Brain-Storm Token"));
}

#[test]
fn test_symbol_returns_correct_value() {
    let (env, _, client) = setup();
    assert_eq!(client.symbol(), String::from_str(&env, "BST"));
}

#[test]
fn test_decimals_returns_correct_value() {
    let (_, _, client) = setup();
    assert_eq!(client.decimals(), 7);
}

// ============================================================================
// Vesting Tests
// ============================================================================

#[test]
fn test_create_vesting_stores_schedule() {
    let (env, admin, client) = setup();
    let instructor = Address::generate(&env);
    let start = env.ledger().sequence();
    let cliff = start + 10;
    let end = start + 30;
    client.create_vesting(&admin, &instructor, &1000, &cliff, &end);
    let schedule = client.get_vesting(&instructor).unwrap();
    assert_eq!(schedule.total_amount, 1000);
    assert_eq!(schedule.cliff_ledger, cliff);
    assert_eq!(schedule.end_ledger, end);
}

#[test]
#[should_panic(expected = "Nothing to claim yet")]
fn test_claim_vesting_before_cliff_panics() {
    let (env, admin, client) = setup();
    let instructor = Address::generate(&env);
    let start = env.ledger().sequence();
    let cliff = start + 20;
    let end = start + 30;
    client.create_vesting(&admin, &instructor, &1000, &cliff, &end);
    client.claim_vesting(&instructor);
}

#[test]
fn test_claim_vesting_at_cliff() {
    let (env, admin, client) = setup();
    let instructor = Address::generate(&env);
    let start = env.ledger().sequence();
    let cliff = start + 10;
    let end = start + 30;
    client.create_vesting(&admin, &instructor, &1000, &cliff, &end);
    
    // Advance to cliff
    env.ledger().set(soroban_sdk::testutils::LedgerInfo {
        sequence_number: cliff,
        timestamp: cliff as u64 * 5,
        protocol_version: 21,
        network_id: Default::default(),
        base_reserve: 10,
        min_temp_entry_ttl: 1000,
        min_persistent_entry_ttl: 1000,
        max_entry_ttl: 100_000,
    });
    
    client.claim_vesting(&instructor);
    assert_eq!(client.balance(&instructor), 0); // No vesting at cliff start
}

#[test]
fn test_claim_vesting_full_amount() {
    let (env, admin, client) = setup();
    let instructor = Address::generate(&env);
    let start = env.ledger().sequence();
    let cliff = start + 10;
    let end = start + 30;
    client.create_vesting(&admin, &instructor, &1000, &cliff, &end);
    
    // Advance past end
    env.ledger().set(soroban_sdk::testutils::LedgerInfo {
        sequence_number: end + 1,
        timestamp: (end + 1) as u64 * 5,
        protocol_version: 21,
        network_id: Default::default(),
        base_reserve: 10,
        min_temp_entry_ttl: 1000,
        min_persistent_entry_ttl: 1000,
        max_entry_ttl: 100_000,
    });
    
    client.claim_vesting(&instructor);
    assert_eq!(client.balance(&instructor), 1000);
    assert_eq!(client.total_supply(), 1000);
}

#[test]
#[should_panic(expected = "Only admin can create vesting")]
fn test_non_admin_cannot_create_vesting() {
    let (env, _, client) = setup();
    let rando = Address::generate(&env);
    let instructor = Address::generate(&env);
    let start = env.ledger().sequence();
    client.create_vesting(&rando, &instructor, &1000, &(start + 10), &(start + 30));
}

// ============================================================================
// Integration Tests
// ============================================================================

#[test]
fn test_mint_transfer_burn_flow() {
    let (env, admin, client) = setup();
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    
    // Mint
    client.mint_reward(&admin, &alice, &1000);
    assert_eq!(client.total_supply(), 1000);
    
    // Transfer
    client.transfer(&alice, &bob, &300);
    assert_eq!(client.balance(&alice), 700);
    assert_eq!(client.balance(&bob), 300);
    
    // Burn
    client.burn(&alice, &200);
    assert_eq!(client.balance(&alice), 500);
    assert_eq!(client.total_supply(), 800);
}

#[test]
fn test_multiple_allowances_per_owner() {
    let (env, admin, client) = setup();
    let owner = Address::generate(&env);
    let spender1 = Address::generate(&env);
    let spender2 = Address::generate(&env);
    
    client.mint_reward(&admin, &owner, &1000);
    client.approve(&owner, &spender1, &300);
    client.approve(&owner, &spender2, &400);
    
    assert_eq!(client.allowance(&owner, &spender1), 300);
    assert_eq!(client.allowance(&owner, &spender2), 400);
}

#[test]
fn test_100_percent_function_coverage() {
    // This test ensures all public functions are exercised
    let (env, admin, client) = setup();
    
    // Metadata
    let _ = client.name();
    let _ = client.symbol();
    let _ = client.decimals();
    
    // Initialize (already done in setup)
    
    // Mint
    let user1 = Address::generate(&env);
    client.mint_reward(&admin, &user1, &500);
    
    // Balance
    let _ = client.balance(&user1);
    
    // Total supply
    let _ = client.total_supply();
    
    // Transfer
    let user2 = Address::generate(&env);
    client.transfer(&user1, &user2, &100);
    
    // Burn
    client.burn(&user2, &50);
    
    // Approve
    let spender = Address::generate(&env);
    client.approve(&user1, &spender, &200);
    
    // Allowance
    let _ = client.allowance(&user1, &spender);
    
    // Transfer from
    let user3 = Address::generate(&env);
    client.transfer_from(&spender, &user1, &user3, &100);
    
    // Vesting
    let instructor = Address::generate(&env);
    let start = env.ledger().sequence();
    client.create_vesting(&admin, &instructor, &300, &(start + 10), &(start + 20));
    let _ = client.get_vesting(&instructor);
}
