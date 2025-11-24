import { AxiosInstance } from 'axios';
export interface ResetPasswordPageProps {
    api: AxiosInstance;
    loginPath?: string;
    forgotPasswordPath?: string;
    verifyResetTokenPath?: string;
    resetPasswordPath?: string;
    postResetRedirectPath?: string;
    successRedirectDelayMs?: number;
    disableSuccessRedirect?: boolean;
    title?: string;
    successTitle?: string;
    expiredTitle?: string;
    subtitle?: string;
    successMessage?: string;
    requestNewLinkMessage?: string;
    ctaLabel?: string;
    requestNewLinkButtonLabel?: string;
    goToLoginButtonLabel?: string;
    rememberPasswordLabel?: string;
    loginLinkLabel?: string;
    onResetSuccess?: () => void;
}
declare const ResetPasswordPage: ({ api, loginPath, forgotPasswordPath, verifyResetTokenPath, resetPasswordPath, postResetRedirectPath, successRedirectDelayMs, disableSuccessRedirect, title, successTitle, expiredTitle, subtitle, successMessage, requestNewLinkMessage, ctaLabel, requestNewLinkButtonLabel, goToLoginButtonLabel, rememberPasswordLabel, loginLinkLabel, onResetSuccess, }: ResetPasswordPageProps) => import("react/jsx-runtime").JSX.Element;
export default ResetPasswordPage;
//# sourceMappingURL=ResetPasswordPage.d.ts.map