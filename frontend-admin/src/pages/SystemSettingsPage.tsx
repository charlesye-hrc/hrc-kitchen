import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import SystemConfig from '../components/admin/SystemConfig';
import AdminPageLayout from '../components/AdminPageLayout';

const SystemSettingsPage = () => {
  const { user, isLoading } = useAuth();

  // Wait for auth to load before checking permissions
  if (isLoading) {
    return null;
  }

  // Check if user is admin
  if (!user || user.role !== 'ADMIN') {
    return <Navigate to="/kitchen" replace />;
  }

  return (
    <AdminPageLayout
      title="System Settings"
    >
      <SystemConfig />
    </AdminPageLayout>
  );
};

export default SystemSettingsPage;
