import { VerifyEmailPage as SharedVerifyEmailPage } from '@hrc-kitchen/common';
import api from '../services/api';

const VerifyEmailPage = () => {
  return (
    <SharedVerifyEmailPage
      api={api}
      loginPath="/login"
      successTitle="Email Verified for Admin Access"
      loadingTitle="Verifying Your Admin Email"
    />
  );
};

export default VerifyEmailPage;

