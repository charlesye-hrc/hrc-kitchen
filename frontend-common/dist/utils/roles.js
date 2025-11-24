const MANAGEMENT_ROLES = ['KITCHEN', 'FINANCE', 'ADMIN'];
const MANAGEMENT_ROLE_SET = new Set(MANAGEMENT_ROLES);
export const isManagementRole = (role) => {
    if (!role) {
        return false;
    }
    return MANAGEMENT_ROLE_SET.has(role);
};
export const getManagementRoles = () => [...MANAGEMENT_ROLES];
