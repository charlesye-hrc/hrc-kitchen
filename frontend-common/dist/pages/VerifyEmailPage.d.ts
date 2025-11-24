import { AxiosInstance } from 'axios';
export interface VerifyEmailPageProps {
    api: AxiosInstance;
    loginPath?: string;
    verifyEmailPath?: string;
    redirectDelayMs?: number;
    disableSuccessRedirect?: boolean;
    loadingTitle?: string;
    loadingSubtitle?: string;
    successTitle?: string;
    successMessage?: string;
    errorTitle?: string;
    errorFallbackMessage?: string;
    buttonLabel?: string;
    onVerifySuccess?: () => void;
}
declare const VerifyEmailPage: ({ api, loginPath, verifyEmailPath, redirectDelayMs, disableSuccessRedirect, loadingTitle, loadingSubtitle, successTitle, successMessage, errorTitle, errorFallbackMessage, buttonLabel, onVerifySuccess, }: VerifyEmailPageProps) => import("react/jsx-runtime").JSX.Element;
export default VerifyEmailPage;
//# sourceMappingURL=VerifyEmailPage.d.ts.map