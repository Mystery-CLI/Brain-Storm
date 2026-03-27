#![cfg(test)]
use soroban_sdk::{symbol_short, testutils::Address as _, Address, Env};

use crate::{AnalyticsContract, AnalyticsContractClient, DataKey};

fn setup() -> (Env, AnalyticsContractClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, AnalyticsContract);
    let client = AnalyticsContractClient::new(&env, &contract_id);
    (env, client)
}

#[test]
fn test_record_and_get_progress() {
    let (env, client) = setup();
    let student = Address::generate(&env);
    let course = symbol_short!("RUST101");
    client.record_progress(&student, &course, &75);
    let rec = client.get_progress(&student, &course).unwrap();
    assert_eq!(rec.progress_pct, 75);
    assert!(!rec.completed);
}

#[test]
fn test_completed_flag_at_100() {
    let (env, client) = setup();
    let student = Address::generate(&env);
    let course = symbol_short!("RUST101");
    client.record_progress(&student, &course, &100);
    let rec = client.get_progress(&student, &course).unwrap();
    assert!(rec.completed);
}

#[test]
#[should_panic(expected = "Progress must be 0-100")]
fn test_invalid_progress_panics() {
    let (env, client) = setup();
    let student = Address::generate(&env);
    client.record_progress(&student, &symbol_short!("X"), &101);
}

#[test]
#[should_panic(expected = "reentrant call")]
fn test_reentrancy_guard_on_record_progress() {
    let (env, client) = setup();
    // Simulate a reentrant call by pre-setting the lock
    env.as_contract(&client.address, || {
        env.storage().instance().set(&DataKey::Locked, &true);
    });
    let student = Address::generate(&env);
    client.record_progress(&student, &symbol_short!("X"), &50);
}
