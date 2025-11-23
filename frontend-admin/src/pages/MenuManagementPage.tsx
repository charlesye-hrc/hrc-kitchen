import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import MenuManagement from '../components/admin/MenuManagement';
import AdminPageLayout from '../components/AdminPageLayout';

const MenuManagementPage = () => {
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
      title="Menu Management"
      subtitle="Manage daily menu items, categories, variations, and location assignments."
    >
      <MenuManagement />
    </AdminPageLayout>
  );
};

export default MenuManagementPage;
