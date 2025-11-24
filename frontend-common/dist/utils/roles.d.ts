import { UserRole } from '../types';
export type ManagementRole = Extract<UserRole, 'KITCHEN' | 'FINANCE' | 'ADMIN'>;
export declare const isManagementRole: (role?: UserRole | string | null) => role is ManagementRole;
export declare const getManagementRoles: () => ManagementRole[];
//# sourceMappingURL=roles.d.ts.map