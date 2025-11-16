import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Edit as EditIcon, AdminPanelSettings as AdminIcon } from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  userLocations: Array<{
    locationId: string;
    location: {
      id: string;
      name: string;
    };
  }>;
}

interface Location {
  id: string;
  name: string;
  isActive: boolean;
}

const UserLocationAssignmentPage: React.FC = () => {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, locationsRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/admin/users`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${import.meta.env.VITE_API_URL}/admin/locations`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (usersRes.data.success) {
        // Filter out ADMIN and STAFF users - they don't need location assignments
        const filteredUsers = usersRes.data.data.filter(
          (user: User) => user.role !== 'ADMIN' && user.role !== 'STAFF'
        );
        setUsers(filteredUsers);
      }
      if (locationsRes.data.success) {
        setLocations(locationsRes.data.data.filter((loc: Location) => loc.isActive));
      }
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (user: User) => {
    setSelectedUser(user);
    const currentLocationIds = user.userLocations.map((ul) => ul.locationId);
    setSelectedLocationIds(currentLocationIds);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedUser(null);
    setSelectedLocationIds([]);
  };

  const handleLocationToggle = (locationId: string) => {
    setSelectedLocationIds((prev) =>
      prev.includes(locationId)
        ? prev.filter((id) => id !== locationId)
        : [...prev, locationId]
    );
  };

  const handleSave = async () => {
    if (!selectedUser) return;

    try {
      setSubmitting(true);
      await axios.put(
        `${import.meta.env.VITE_API_URL}/admin/users/${selectedUser.id}/locations`,
        { locationIds: selectedLocationIds },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await loadData();
      handleCloseDialog();
    } catch (err: any) {
      console.error('Error saving location assignments:', err);
      setError(err.response?.data?.message || 'Failed to save location assignments');
    } finally {
      setSubmitting(false);
    }
  };

  const getUserLocationNames = (user: User): string => {
    if (user.role === 'ADMIN') {
      return 'All Locations (Admin)';
    }
    if (user.userLocations.length === 0) {
      return 'No locations assigned';
    }
    return user.userLocations.map((ul) => ul.location.name).join(', ');
  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
          User Location Assignments
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage which locations KITCHEN and FINANCE users can access. ADMIN and STAFF users automatically have access to all locations.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Assigned Locations</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">No users found.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{user.fullName}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Chip
                      label={user.role}
                      color={user.role === 'ADMIN' ? 'error' : user.role === 'KITCHEN' ? 'primary' : user.role === 'FINANCE' ? 'success' : 'default'}
                      size="small"
                      icon={user.role === 'ADMIN' ? <AdminIcon fontSize="small" /> : undefined}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color={user.userLocations.length === 0 && user.role !== 'ADMIN' ? 'error' : 'text.primary'}>
                      {getUserLocationNames(user)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title={user.role === 'ADMIN' ? 'Admins have access to all locations' : 'Edit location assignments'}>
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(user)}
                          disabled={user.role === 'ADMIN'}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Assignment Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Assign Locations to {selectedUser?.fullName}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Select which locations this user can access. Users can only view and manage data for their assigned locations.
            </Typography>

            {locations.length === 0 ? (
              <Alert severity="info">
                No active locations available. Please create locations first.
              </Alert>
            ) : (
              <FormGroup>
                {locations.map((location) => (
                  <FormControlLabel
                    key={location.id}
                    control={
                      <Checkbox
                        checked={selectedLocationIds.includes(location.id)}
                        onChange={() => handleLocationToggle(location.id)}
                      />
                    }
                    label={location.name}
                  />
                ))}
              </FormGroup>
            )}

            {selectedLocationIds.length === 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                User will not have access to any locations. They will not be able to view orders, manage kitchen operations, or generate reports.
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseDialog} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={submitting}
          >
            {submitting ? <CircularProgress size={24} /> : 'Save Assignments'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default UserLocationAssignmentPage;
