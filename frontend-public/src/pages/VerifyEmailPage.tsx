import { VerifyEmailPage as SharedVerifyEmailPage } from '@hrc-kitchen/common';
import api from '../services/api';

const VerifyEmailPage = () => {
  return <SharedVerifyEmailPage api={api} loginPath="/login" />;
};

export default VerifyEmailPage;

