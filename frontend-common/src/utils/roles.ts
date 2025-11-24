import { UserRole } from '../types';

export type ManagementRole = Extract<UserRole, 'KITCHEN' | 'FINANCE' | 'ADMIN'>;

const MANAGEMENT_ROLES: ManagementRole[] = ['KITCHEN', 'FINANCE', 'ADMIN'];
const MANAGEMENT_ROLE_SET = new Set<UserRole>(MANAGEMENT_ROLES);

export const isManagementRole = (role?: UserRole | string | null): role is ManagementRole => {
  if (!role) {
    return false;
  }

  return MANAGEMENT_ROLE_SET.has(role as UserRole);
};

export const getManagementRoles = (): ManagementRole[] => [...MANAGEMENT_ROLES];
