#![cfg(test)]
use soroban_sdk::{testutils::Address as _, Address, Env};

use crate::{Permission, Role, SharedContract, SharedContractClient};

fn setup() -> (Env, Address, SharedContractClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, SharedContract);
    let client = SharedContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    client.initialize(&admin);
    (env, admin, client)
}

// ── has_role ─────────────────────────────────────────────────────────────────

#[test]
fn test_admin_has_admin_role() {
    let (_, admin, client) = setup();
    assert!(client.has_role(&admin, &Role::Admin));
}

#[test]
fn test_assign_instructor_role() {
    let (env, admin, client) = setup();
    let instructor = Address::generate(&env);
    client.assign_role(&admin, &instructor, &Role::Instructor);
    assert!(client.has_role(&instructor, &Role::Instructor));
}

#[test]
fn test_assign_student_role() {
    let (env, admin, client) = setup();
    let student = Address::generate(&env);
    client.assign_role(&admin, &student, &Role::Student);
    assert!(client.has_role(&student, &Role::Student));
}

#[test]
#[should_panic(expected = "Only admin can assign roles")]
fn test_non_admin_cannot_assign_role() {
    let (env, _, client) = setup();
    let rando = Address::generate(&env);
    let target = Address::generate(&env);
    client.assign_role(&rando, &target, &Role::Instructor);
}

// ── has_permission — Admin ────────────────────────────────────────────────────

#[test]
fn test_admin_has_all_permissions() {
    let (_, admin, client) = setup();
    assert!(client.has_permission(&admin, &Permission::CreateCourse));
    assert!(client.has_permission(&admin, &Permission::EnrollStudent));
    assert!(client.has_permission(&admin, &Permission::IssueCredential));
    assert!(client.has_permission(&admin, &Permission::MintToken));
    assert!(client.has_permission(&admin, &Permission::ManageUsers));
}

// ── has_permission — Instructor ───────────────────────────────────────────────

#[test]
fn test_instructor_permissions() {
    let (env, admin, client) = setup();
    let instructor = Address::generate(&env);
    client.assign_role(&admin, &instructor, &Role::Instructor);

    assert!(client.has_permission(&instructor, &Permission::CreateCourse));
    assert!(client.has_permission(&instructor, &Permission::EnrollStudent));
    assert!(!client.has_permission(&instructor, &Permission::IssueCredential));
    assert!(!client.has_permission(&instructor, &Permission::MintToken));
    assert!(!client.has_permission(&instructor, &Permission::ManageUsers));
}

// ── has_permission — Student ──────────────────────────────────────────────────

#[test]
fn test_student_has_no_permissions() {
    let (env, admin, client) = setup();
    let student = Address::generate(&env);
    client.assign_role(&admin, &student, &Role::Student);

    assert!(!client.has_permission(&student, &Permission::CreateCourse));
    assert!(!client.has_permission(&student, &Permission::EnrollStudent));
    assert!(!client.has_permission(&student, &Permission::IssueCredential));
    assert!(!client.has_permission(&student, &Permission::MintToken));
    assert!(!client.has_permission(&student, &Permission::ManageUsers));
}

// ── has_permission — unassigned address ──────────────────────────────────────

#[test]
fn test_unassigned_address_has_no_permissions() {
    let (env, _, client) = setup();
    let stranger = Address::generate(&env);
    assert!(!client.has_permission(&stranger, &Permission::CreateCourse));
}

// ── upgrade (Issue 4) ─────────────────────────────────────────────────────────

#[test]
#[should_panic(expected = "Only admin can upgrade")]
fn test_non_admin_cannot_upgrade() {
    use soroban_sdk::BytesN;
    let (env, _, client) = setup();
    let rando = Address::generate(&env);
    let fake_hash = BytesN::from_array(&env, &[0u8; 32]);
    client.upgrade(&rando, &fake_hash);
}
