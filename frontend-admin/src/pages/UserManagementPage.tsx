import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import UserManagement from '../components/admin/UserManagement';
import AdminPageLayout from '../components/AdminPageLayout';

const UserManagementPage = () => {
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
      title="User Management"
      subtitle="Manage user accounts, roles, and permissions."
    >
      <UserManagement />
    </AdminPageLayout>
  );
};

export default UserManagementPage;
