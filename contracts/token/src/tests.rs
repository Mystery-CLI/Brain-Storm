#![cfg(test)]
use soroban_sdk::{testutils::Address as _, Address, Env};

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

#[test]
fn test_mint_and_balance() {
    let (env, admin, client) = setup();
    let user = Address::generate(&env);
    client.mint_reward(&admin, &user, &500);
    assert_eq!(client.balance(&user), 500);
    assert_eq!(client.total_supply(), 500);
}

#[test]
fn test_burn_reduces_balance_and_supply() {
    let (env, admin, client) = setup();
    let user = Address::generate(&env);
    client.mint_reward(&admin, &user, &300);
    client.burn(&user, &100);
    assert_eq!(client.balance(&user), 200);
    assert_eq!(client.total_supply(), 200);
}

#[test]
#[should_panic(expected = "Insufficient balance")]
fn test_burn_more_than_balance_panics() {
    let (env, admin, client) = setup();
    let user = Address::generate(&env);
    client.mint_reward(&admin, &user, &50);
    client.burn(&user, &100);
}

#[test]
fn test_burn_from_with_allowance() {
    let (env, admin, client) = setup();
    let owner = Address::generate(&env);
    let spender = Address::generate(&env);
    client.mint_reward(&admin, &owner, &200);
    client.approve(&owner, &spender, &150);
    client.burn_from(&spender, &owner, &100);
    assert_eq!(client.balance(&owner), 100);
    assert_eq!(client.allowance(&owner, &spender), 50);
    assert_eq!(client.total_supply(), 100);
}

#[test]
#[should_panic(expected = "Insufficient allowance")]
fn test_burn_from_exceeds_allowance_panics() {
    let (env, admin, client) = setup();
    let owner = Address::generate(&env);
    let spender = Address::generate(&env);
    client.mint_reward(&admin, &owner, &200);
    client.approve(&owner, &spender, &50);
    client.burn_from(&spender, &owner, &100);
}

#[test]
#[should_panic(expected = "reentrant call")]
fn test_reentrancy_guard_on_mint() {
    let (env, admin, client) = setup();
    let user = Address::generate(&env);
    // Manually set the lock to simulate a reentrant call
    use soroban_sdk::IntoVal;
    use crate::DataKey;
    env.as_contract(&client.address, || {
        env.storage().instance().set(&DataKey::Locked, &true);
    });
    client.mint_reward(&admin, &user, &100);
}
