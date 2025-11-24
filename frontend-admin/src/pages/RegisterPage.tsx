import { RegisterPage as SharedRegisterPage } from '@hrc-kitchen/common';
import { useAuth } from '../contexts/AuthContext';

const RegisterPage = () => {
  const { register, isAuthenticated } = useAuth();

  return (
    <SharedRegisterPage
      register={register}
      isAuthenticated={isAuthenticated}
      authenticatedRedirectPath="/kitchen"
      loginPath="/login"
      postRegisterRedirectPath="/login"
      title="Request Access"
      subtitle="Register for the management portal"
      brandIcon="🏢"
      brandIconAriaLabel="Management portal"
      showDepartmentField={false}
      showLocationField={false}
      showPhoneField={false}
    />
  );
};

export default RegisterPage;

