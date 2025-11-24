import { AxiosInstance } from 'axios';
export interface InvitationInfo {
    email: string;
    fullName: string;
    role: string;
}
export interface AcceptInvitationPageProps {
    api: AxiosInstance;
    loginPath?: string;
    verifyInvitationPath?: string;
    acceptInvitationPath?: string;
    redirectDelayMs?: number;
    disableSuccessRedirect?: boolean;
    verifyingTitle?: string;
    verifyingSubtitle?: string;
    welcomeTitle?: string;
    welcomeSubtitle?: string;
    successTitle?: string;
    successMessage?: string;
    successRedirectMessage?: string;
    errorTitle?: string;
    errorSubtitle?: string;
    passwordRequirementsTitle?: string;
    passwordRequirements?: string[];
    roleLabels?: Record<string, string>;
    ctaLabel?: string;
    goToLoginButtonLabel?: string;
    validatePassword?: (password: string) => string | null;
    onAcceptSuccess?: () => void;
    getLoginPathForRole?: (role?: string | null) => string;
}
declare const AcceptInvitationPage: ({ api, loginPath, verifyInvitationPath, acceptInvitationPath, redirectDelayMs, disableSuccessRedirect, verifyingTitle, verifyingSubtitle, welcomeTitle, welcomeSubtitle, successTitle, successMessage, successRedirectMessage, errorTitle, errorSubtitle, passwordRequirementsTitle, passwordRequirements, roleLabels, ctaLabel, goToLoginButtonLabel, validatePassword, onAcceptSuccess, getLoginPathForRole, }: AcceptInvitationPageProps) => import("react/jsx-runtime").JSX.Element;
export default AcceptInvitationPage;
//# sourceMappingURL=AcceptInvitationPage.d.ts.map