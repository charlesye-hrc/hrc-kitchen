import { ReactNode } from 'react';
export interface RegisterFormValues {
    email: string;
    password: string;
    fullName: string;
    department?: string;
    location?: string;
    phone?: string;
}
export interface RegisterPageProps {
    register: (data: RegisterFormValues) => Promise<void>;
    isAuthenticated: boolean;
    authenticatedRedirectPath?: string;
    loginPath?: string;
    postRegisterRedirectPath?: string;
    successRedirectDelayMs?: number;
    disableSuccessRedirect?: boolean;
    brandIcon?: ReactNode;
    brandIconAriaLabel?: string;
    title?: string;
    subtitle?: string;
    successMessage?: string;
    ctaLabel?: string;
    loginLinkLabel?: string;
    showDepartmentField?: boolean;
    showLocationField?: boolean;
    showPhoneField?: boolean;
    onRegistrationSuccess?: () => void;
}
declare const RegisterPage: ({ register, isAuthenticated, authenticatedRedirectPath, loginPath, postRegisterRedirectPath, successRedirectDelayMs, disableSuccessRedirect, brandIcon, brandIconAriaLabel, title, subtitle, successMessage, ctaLabel, loginLinkLabel, showDepartmentField, showLocationField, showPhoneField, onRegistrationSuccess, }: RegisterPageProps) => import("react/jsx-runtime").JSX.Element;
export default RegisterPage;
//# sourceMappingURL=RegisterPage.d.ts.map