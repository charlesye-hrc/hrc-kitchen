import { ForgotPasswordPage } from '@hrc-kitchen/common';
import api from '../services/api';

const ForgotPasswordPageWrapper = () => {
  return <ForgotPasswordPage api={api} appContext="admin" loginPath="/login" />;
};

export default ForgotPasswordPageWrapper;
