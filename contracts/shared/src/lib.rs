#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, BytesN, Env};

#[contracttype]
#[derive(Clone, PartialEq)]
pub enum Role {
    Admin,
    Instructor,
    Student,
}

#[contracttype]
#[derive(Clone, PartialEq)]
pub enum Permission {
    CreateCourse,
    EnrollStudent,
    IssueCredential,
    MintToken,
    ManageUsers,
}

#[contracttype]
pub enum DataKey {
    Role(Address),
    Admin,
}

#[contract]
pub struct SharedContract;

/// Returns true if `role` grants `permission`.
fn role_has_permission(role: &Role, permission: &Permission) -> bool {
    match role {
        Role::Admin => true, // Admin has all permissions
        Role::Instructor => matches!(
            permission,
            Permission::CreateCourse | Permission::EnrollStudent
        ),
        Role::Student => false,
    }
}

#[contractimpl]
impl SharedContract {
    /// Initialize the contract with an admin address
    pub fn initialize(env: Env, admin: Address) {
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::Role(admin.clone()), &Role::Admin);
    }

    /// Assign a role to an address (admin only). Emits ("rbac", "role_assigned").
    pub fn assign_role(env: Env, caller: Address, target: Address, role: Role) {
        caller.require_auth();
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(caller == admin, "Only admin can assign roles");
        env.storage()
            .instance()
            .set(&DataKey::Role(target.clone()), &role);

        env.events().publish(
            (symbol_short!("rbac"), symbol_short!("role_asgn")),
            (target, role),
        );
    }

    /// Check if an address has a specific role
    pub fn has_role(env: Env, addr: Address, role: Role) -> bool {
        let stored: Option<Role> = env.storage().instance().get(&DataKey::Role(addr));
        match (stored, role) {
            (Some(Role::Admin), Role::Admin) => true,
            (Some(Role::Instructor), Role::Instructor) => true,
            (Some(Role::Student), Role::Student) => true,
            _ => false,
        }
    }

    /// Check if an address has a specific permission based on its assigned role
    pub fn has_permission(env: Env, addr: Address, permission: Permission) -> bool {
        let stored: Option<Role> = env.storage().instance().get(&DataKey::Role(addr));
        match stored {
            Some(role) => role_has_permission(&role, &permission),
            None => false,
        }
    }

    /// Upgrade the contract wasm (admin only). Emits ("shared", "upgraded").
    pub fn upgrade(env: Env, admin: Address, new_wasm_hash: BytesN<32>) {
        admin.require_auth();
        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(admin == stored_admin, "Only admin can upgrade");

        env.events().publish(
            (symbol_short!("shared"), symbol_short!("upgraded")),
            new_wasm_hash.clone(),
        );

        env.deployer()
            .update_current_contract_wasm(new_wasm_hash);
    }
}

mod tests;
