import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Chip,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  CircularProgress,
  Stack,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Edit as EditIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface User {
  id: string;
  email: string;
  fullName: string;
  department: string | null;
  location: string | null;
  role: 'STAFF' | 'KITCHEN' | 'FINANCE' | 'ADMIN';
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
}

const UserManagement = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalUsers, setTotalUsers] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [restrictedDomain, setRestrictedDomain] = useState<string>('@huonregionalcare.org.au');

  // Dialogs
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<string>('');

  useEffect(() => {
    fetchConfig();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [page, rowsPerPage, searchTerm, roleFilter, statusFilter]);

  const fetchConfig = async () => {
    try {
      const response = await api.get('/admin/config');
      if (response.data.success) {
        const domain = response.data.data.restricted_role_domain || '@huonregionalcare.org.au';
        setRestrictedDomain(domain);
      }
    } catch (err) {
      // Use default if config fetch fails
      console.error('Failed to fetch config:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: page + 1,
        limit: rowsPerPage,
      };

      if (searchTerm) params.search = searchTerm;
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.isActive = statusFilter === 'active';

      const response = await api.get('/admin/users', { params });

      if (response.data.success) {
        setUsers(response.data.data);
        setTotalUsers(response.data.pagination.total);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRoleDialog = (user: User) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setRoleDialogOpen(true);
  };

  const handleUpdateRole = async () => {
    if (!selectedUser || !newRole) return;

    try {
      await api.patch(`/admin/users/${selectedUser.id}/role`, { role: newRole });
      setRoleDialogOpen(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update user role');
    }
  };

  const handleOpenStatusDialog = (user: User) => {
    setSelectedUser(user);
    setStatusDialogOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedUser) return;

    try {
      await api.patch(`/admin/users/${selectedUser.id}/status`, {
        isActive: !selectedUser.isActive,
      });
      setStatusDialogOpen(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update user status');
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'error';
      case 'KITCHEN':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (loading && users.length === 0) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{
      p: { xs: 0, md: 3 },
      width: '100%',
      maxWidth: '100%',
      overflowX: 'hidden',
    }}>
      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 3, mx: { xs: 2, md: 0 } }}>
          {error}
        </Alert>
      )}

      <Typography variant="h6" gutterBottom sx={{ px: { xs: 2, md: 0 } }}>
        User Management
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={3} sx={{ px: { xs: 2, md: 0 } }}>
        <TextField
          label={isMobile ? "Search..." : "Search by name or email"}
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(0);
          }}
          sx={{ flexGrow: 1 }}
        />
        <Stack direction="row" spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
          <FormControl size="small" sx={{ minWidth: { xs: 0, sm: 100 }, flex: { xs: 1, sm: 'initial' } }}>
            <InputLabel>Role</InputLabel>
            <Select
              value={roleFilter}
              label="Role"
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="STAFF">Staff</MenuItem>
              <MenuItem value="KITCHEN">Kitchen</MenuItem>
              <MenuItem value="FINANCE">Finance</MenuItem>
              <MenuItem value="ADMIN">Admin</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: { xs: 0, sm: 100 }, flex: { xs: 1, sm: 'initial' } }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Stack>

      <TableContainer component={Paper} sx={{ width: '100%', overflowX: 'hidden' }}>
        <Table sx={{ width: '100%', tableLayout: 'auto' }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, px: { xs: 1, sm: 2 }, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 600, px: { xs: 1, sm: 2 }, fontSize: { xs: '0.75rem', sm: '0.875rem' }, display: { xs: 'none', md: 'table-cell' } }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 600, px: { xs: 1, sm: 2 }, fontSize: { xs: '0.75rem', sm: '0.875rem' }, display: { xs: 'none', lg: 'table-cell' } }}>Department</TableCell>
              <TableCell sx={{ fontWeight: 600, px: { xs: 1, sm: 2 }, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Role</TableCell>
              <TableCell sx={{ fontWeight: 600, px: { xs: 1, sm: 2 }, fontSize: { xs: '0.75rem', sm: '0.875rem' }, display: { xs: 'none', sm: 'table-cell' } }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600, px: { xs: 1, sm: 2 }, fontSize: { xs: '0.75rem', sm: '0.875rem' }, display: { xs: 'none', lg: 'table-cell' } }}>Created</TableCell>
              <TableCell sx={{ fontWeight: 600, px: { xs: 1, sm: 2 }, fontSize: { xs: '0.75rem', sm: '0.875rem' } }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell sx={{ px: { xs: 1, sm: 2 }, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{user.fullName}</TableCell>
                <TableCell sx={{ px: { xs: 1, sm: 2 }, fontSize: { xs: '0.75rem', sm: '0.875rem' }, display: { xs: 'none', md: 'table-cell' } }}>{user.email}</TableCell>
                <TableCell sx={{ px: { xs: 1, sm: 2 }, fontSize: { xs: '0.75rem', sm: '0.875rem' }, display: { xs: 'none', lg: 'table-cell' } }}>{user.department || '-'}</TableCell>
                <TableCell sx={{ px: { xs: 1, sm: 2 } }}>
                  <Chip
                    label={user.role}
                    size="small"
                    color={getRoleColor(user.role)}
                  />
                </TableCell>
                <TableCell sx={{ px: { xs: 1, sm: 2 }, display: { xs: 'none', sm: 'table-cell' } }}>
                  <Chip
                    label={user.isActive ? 'Active' : 'Inactive'}
                    size="small"
                    color={user.isActive ? 'success' : 'default'}
                  />
                </TableCell>
                <TableCell sx={{ px: { xs: 1, sm: 2 }, fontSize: { xs: '0.75rem', sm: '0.875rem' }, display: { xs: 'none', lg: 'table-cell' } }}>
                  {new Date(user.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell align="right" sx={{ px: { xs: 1, sm: 2 } }}>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenRoleDialog(user)}
                    disabled={user.id === currentUser?.id}
                    color="primary"
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenStatusDialog(user)}
                    disabled={user.id === currentUser?.id}
                    color={user.isActive ? 'error' : 'success'}
                  >
                    {user.isActive ? (
                      <BlockIcon fontSize="small" />
                    ) : (
                      <CheckCircleIcon fontSize="small" />
                    )}
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={totalUsers}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        sx={{
          '& .MuiTablePagination-toolbar': {
            flexWrap: 'wrap',
            justifyContent: { xs: 'center', sm: 'flex-end' },
          },
          '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
            fontSize: { xs: '0.75rem', sm: '0.875rem' },
          },
        }}
      />

      {/* Role Change Dialog */}
      <Dialog open={roleDialogOpen} onClose={() => setRoleDialogOpen(false)}>
        <DialogTitle>Update User Role</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Update role for: <strong>{selectedUser?.fullName}</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Email: {selectedUser?.email}
          </Typography>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Role</InputLabel>
            <Select
              value={newRole}
              label="Role"
              onChange={(e) => setNewRole(e.target.value)}
            >
              <MenuItem value="STAFF">Staff</MenuItem>
              <MenuItem
                value="KITCHEN"
                disabled={!selectedUser?.email.toLowerCase().endsWith(restrictedDomain.toLowerCase())}
              >
                Kitchen
              </MenuItem>
              <MenuItem
                value="FINANCE"
                disabled={!selectedUser?.email.toLowerCase().endsWith(restrictedDomain.toLowerCase())}
              >
                Finance
              </MenuItem>
              <MenuItem
                value="ADMIN"
                disabled={!selectedUser?.email.toLowerCase().endsWith(restrictedDomain.toLowerCase())}
              >
                Admin
              </MenuItem>
            </Select>
          </FormControl>
          {!selectedUser?.email.toLowerCase().endsWith(restrictedDomain.toLowerCase()) && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Kitchen, Finance, and Admin roles require a {restrictedDomain} email address.
            </Alert>
          )}
          {newRole === 'ADMIN' && selectedUser?.email.toLowerCase().endsWith(restrictedDomain.toLowerCase()) && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              This user will have full administrative access to the system.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoleDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleUpdateRole} variant="contained">
            Update Role
          </Button>
        </DialogActions>
      </Dialog>

      {/* Status Change Dialog */}
      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)}>
        <DialogTitle>
          {selectedUser?.isActive ? 'Deactivate' : 'Activate'} User
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to {selectedUser?.isActive ? 'deactivate' : 'activate'}{' '}
            <strong>{selectedUser?.fullName}</strong>?
          </Typography>
          {selectedUser?.isActive && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              This user will no longer be able to login to the system.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleUpdateStatus}
            variant="contained"
            color={selectedUser?.isActive ? 'error' : 'success'}
          >
            {selectedUser?.isActive ? 'Deactivate' : 'Activate'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;
