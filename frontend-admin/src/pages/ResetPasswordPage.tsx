import { ResetPasswordPage as SharedResetPasswordPage } from '@hrc-kitchen/common';
import api from '../services/api';

const ResetPasswordPage = () => {
  return (
    <SharedResetPasswordPage
      api={api}
      loginPath="/login"
      forgotPasswordPath="/forgot-password"
      postResetRedirectPath="/login"
      title="Reset Your Admin Password"
      subtitle="Enter a new password to regain access"
    />
  );
};

export default ResetPasswordPage;

