import { AcceptInvitationPage as SharedAcceptInvitationPage } from '@hrc-kitchen/common';
import api from '../services/api';

const AcceptInvitationPage = () => {
  return (
    <SharedAcceptInvitationPage
      api={api}
      loginPath="/login"
      welcomeTitle="Welcome to the Management Portal"
      welcomeSubtitle="Complete your account setup to access admin tools"
      verifyingTitle="Verifying Your Invitation"
    />
  );
};

export default AcceptInvitationPage;

