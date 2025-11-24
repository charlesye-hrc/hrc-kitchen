import { AcceptInvitationPage as SharedAcceptInvitationPage, isManagementRole } from '@hrc-kitchen/common';
import api from '../services/api';

const AcceptInvitationPage = () => {
  const adminAppUrl = (import.meta.env.VITE_ADMIN_APP_URL || 'http://localhost:5174').replace(/\/+$/, '');
  const adminLoginUrl = `${adminAppUrl}/login`;

  return (
    <SharedAcceptInvitationPage
      api={api}
      loginPath="/login"
      adminLoginPath={adminLoginUrl}
      verifyInvitationPath="/invitations/verify"
      acceptInvitationPath="/invitations/accept"
      welcomeTitle="Welcome to HRC Kitchen!"
      successRedirectMessage="Redirecting you to the right login page..."
      goToLoginButtonLabel="Open Login Page"
      getLoginPathForRole={(role) => (isManagementRole(role) ? adminLoginUrl : '/login')}
    />
  );
};

export default AcceptInvitationPage;
