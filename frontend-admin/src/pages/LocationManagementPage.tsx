import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ToggleOff as DeactivateIcon,
  ToggleOn as ActivateIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import AdminPageLayout from '../components/AdminPageLayout';

interface Location {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const LocationManagementPage: React.FC = () => {
  const { token } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [deletingLocation, setDeletingLocation] = useState<Location | null>(null);
  const [deactivatingLocation, setDeactivatingLocation] = useState<Location | null>(null);
  const [removalPreview, setRemovalPreview] = useState<{
    action: 'CAN_DELETE' | 'CAN_CASCADE' | 'BLOCKED';
    dependencies: {
      menuItems: number;
      users: number;
      orders: number;
    };
    reasons: string[];
  } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    isActive: true,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/locations`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setLocations(response.data.data);
      }
    } catch (err: any) {
      console.error('Error fetching locations:', err);
      setError(err.response?.data?.message || 'Failed to load locations');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (location?: Location) => {
    if (location) {
      setEditingLocation(location);
      setFormData({
        name: location.name,
        address: location.address || '',
        phone: location.phone || '',
        isActive: location.isActive,
      });
    } else {
      setEditingLocation(null);
      setFormData({
        name: '',
        address: '',
        phone: '',
        isActive: true,
      });
    }
    setFormError(null);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingLocation(null);
    setFormData({
      name: '',
      address: '',
      phone: '',
      isActive: true,
    });
    setFormError(null);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setFormError('Location name is required');
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);

      const dataToSubmit = {
        name: formData.name.trim(),
        address: formData.address.trim() || null,
        phone: formData.phone.trim() || null,
        isActive: formData.isActive,
      };

      if (editingLocation) {
        // Update existing location
        await axios.put(
          `${import.meta.env.VITE_API_URL}/admin/locations/${editingLocation.id}`,
          dataToSubmit,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        // Create new location
        await axios.post(
          `${import.meta.env.VITE_API_URL}/admin/locations`,
          dataToSubmit,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      await fetchLocations();
      handleCloseDialog();
    } catch (err: any) {
      console.error('Error saving location:', err);
      setFormError(err.response?.data?.message || 'Failed to save location');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDeleteDialog = async (location: Location) => {
    setDeletingLocation(location);
    setSubmitting(true);

    try {
      // Fetch removal preview
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/admin/locations/${location.id}/removal-preview`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setRemovalPreview(response.data.data);
        setDeleteDialogOpen(true);
      }
    } catch (err: any) {
      console.error('Error fetching removal preview:', err);
      setError(err.response?.data?.message || 'Failed to load deletion preview');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setDeletingLocation(null);
    setRemovalPreview(null);
  };

  const handleDelete = async (forceUnassign = false) => {
    if (!deletingLocation) return;

    try {
      setSubmitting(true);
      const url = forceUnassign
        ? `${import.meta.env.VITE_API_URL}/admin/locations/${deletingLocation.id}?forceUnassign=true`
        : `${import.meta.env.VITE_API_URL}/admin/locations/${deletingLocation.id}`;

      await axios.delete(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      await fetchLocations();
      handleCloseDeleteDialog();
      setError(null);
    } catch (err: any) {
      console.error('Error deleting location:', err);
      // Keep the dialog open to show the error
      setError(err.response?.data?.message || 'Failed to delete location');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivateInstead = async () => {
    if (!deletingLocation) return;

    try {
      setSubmitting(true);
      await axios.patch(
        `${import.meta.env.VITE_API_URL}/admin/locations/${deletingLocation.id}/deactivate`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await fetchLocations();
      handleCloseDeleteDialog();
      setError(null);
    } catch (err: any) {
      console.error('Error deactivating location:', err);
      setError(err.response?.data?.message || 'Failed to deactivate location');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDeactivateDialog = (location: Location) => {
    setDeactivatingLocation(location);
    setDeactivateDialogOpen(true);
  };

  const handleCloseDeactivateDialog = () => {
    setDeactivateDialogOpen(false);
    setDeactivatingLocation(null);
  };

  const handleToggleActive = async () => {
    if (!deactivatingLocation) return;

    try {
      setSubmitting(true);
      const endpoint = deactivatingLocation.isActive ? 'deactivate' : 'activate';
      await axios.patch(
        `${import.meta.env.VITE_API_URL}/admin/locations/${deactivatingLocation.id}/${endpoint}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await fetchLocations();
      handleCloseDeactivateDialog();
      setError(null);
    } catch (err: any) {
      console.error('Error toggling location status:', err);
      setError(err.response?.data?.message || 'Failed to update location status');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const headerActions = (
    <Button
      variant="contained"
      startIcon={<AddIcon />}
      onClick={() => handleOpenDialog()}
      sx={{ px: 3 }}
    >
      Add Location
    </Button>
  );

  return (
    <AdminPageLayout
      title="Location Management"
      subtitle="Manage physical locations, contact information, and activation status."
      actions={headerActions}
    >

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper} sx={{ width: '100%', overflowX: 'hidden' }}>
        <Table sx={{ width: '100%', tableLayout: 'auto' }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, px: { xs: 1, sm: 2 }, width: 'auto' }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 600, px: { xs: 1, sm: 2 }, display: { xs: 'none', sm: 'table-cell' }, width: 'auto' }}>Address</TableCell>
              <TableCell sx={{ fontWeight: 600, px: { xs: 1, sm: 2 }, display: { xs: 'none', md: 'table-cell' }, width: 'auto' }}>Phone</TableCell>
              <TableCell sx={{ fontWeight: 600, px: { xs: 1, sm: 2 }, width: 'auto' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600, px: { xs: 1, sm: 2 }, width: 'auto' }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {locations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    No locations found. Click "Add Location" to create one.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              locations.map((location) => (
                <TableRow key={location.id} hover>
                  <TableCell sx={{ fontWeight: 500, px: { xs: 1, sm: 2 } }}>{location.name}</TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, px: { xs: 1, sm: 2 } }}>{location.address || '-'}</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, px: { xs: 1, sm: 2 } }}>{location.phone || '-'}</TableCell>
                  <TableCell sx={{ px: { xs: 1, sm: 2 } }}>
                    <Chip
                      label={location.isActive ? 'Active' : 'Inactive'}
                      color={location.isActive ? 'success' : 'default'}
                      size="small"
                      sx={{
                        fontWeight: 600,
                        ...(location.isActive && {
                          bgcolor: 'success.main',
                          color: 'common.white',
                        }),
                      }}
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ px: { xs: 1, sm: 2 } }}>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(location)}
                      sx={{ mr: 1 }}
                      title="Edit location"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDeactivateDialog(location)}
                      color={location.isActive ? 'warning' : 'success'}
                      sx={{ mr: 1 }}
                      title={location.isActive ? 'Deactivate location' : 'Activate location'}
                    >
                      {location.isActive ? (
                        <DeactivateIcon fontSize="small" />
                      ) : (
                        <ActivateIcon fontSize="small" />
                      )}
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDeleteDialog(location)}
                      color="error"
                      title="Delete location"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingLocation ? 'Edit Location' : 'Add New Location'}
        </DialogTitle>
        <DialogContent>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}

          <TextField
            autoFocus
            margin="dense"
            label="Location Name"
            fullWidth
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            sx={{ mb: 2 }}
          />

          <TextField
            margin="dense"
            label="Address"
            fullWidth
            multiline
            rows={2}
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            sx={{ mb: 2 }}
          />

          <TextField
            margin="dense"
            label="Phone"
            fullWidth
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            sx={{ mb: 2 }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              />
            }
            label="Active"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseDialog} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={submitting}
          >
            {submitting ? <CircularProgress size={24} /> : editingLocation ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Smart Delete Dialog - Dynamic based on preview */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog} maxWidth="sm" fullWidth>
        {removalPreview?.action === 'CAN_DELETE' && (
          <>
            <DialogTitle>Delete Location</DialogTitle>
            <DialogContent>
              <Typography gutterBottom>
                Are you sure you want to permanently delete <strong>{deletingLocation?.name}</strong>?
              </Typography>
              <Alert severity="success" sx={{ mt: 2 }}>
                ✓ No dependencies found. This location can be safely deleted.
              </Alert>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={handleCloseDeleteDialog} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={() => handleDelete()} variant="contained" color="error" disabled={submitting}>
                {submitting ? <CircularProgress size={24} /> : 'Delete'}
              </Button>
            </DialogActions>
          </>
        )}

        {removalPreview?.action === 'CAN_CASCADE' && (
          <>
            <DialogTitle>Delete Location</DialogTitle>
            <DialogContent>
              <Typography gutterBottom>
                Are you sure you want to permanently delete <strong>{deletingLocation?.name}</strong>?
              </Typography>
              <Alert severity="info" sx={{ mt: 2 }}>
                {removalPreview.dependencies.menuItems > 0 && (
                  <>⚠ {removalPreview.dependencies.menuItems} menu item assignment(s) will be removed.<br /></>
                )}
                {removalPreview.dependencies.orders > 0 && (
                  <>✓ {removalPreview.dependencies.orders} historical order(s) are preserved via snapshots.<br /></>
                )}
                ✓ No user assignments found.
              </Alert>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Historical orders will continue to show this location's name, even after deletion.
                {removalPreview.dependencies.menuItems > 0 && ' Menu items themselves are not deleted, only their assignment to this location.'}
              </Typography>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={handleCloseDeleteDialog} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={() => handleDelete()} variant="contained" color="error" disabled={submitting}>
                {submitting ? <CircularProgress size={24} /> : 'Delete Location'}
              </Button>
            </DialogActions>
          </>
        )}

        {removalPreview?.action === 'BLOCKED' && (
          <>
            <DialogTitle>Cannot Delete Location</DialogTitle>
            <DialogContent>
              <Typography gutterBottom>
                Cannot delete <strong>{deletingLocation?.name}</strong> due to active assignments
              </Typography>
              <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
                ❌ {removalPreview.dependencies.users} user(s) assigned to this location (KITCHEN/FINANCE staff)
                {removalPreview.dependencies.menuItems > 0 && (
                  <>
                    <br />⚠ {removalPreview.dependencies.menuItems} menu item(s) assigned to this location
                  </>
                )}
              </Alert>
              <Alert severity="info" sx={{ mb: 2 }}>
                <strong>Options:</strong>
                <ul style={{ marginTop: '8px', marginBottom: 0 }}>
                  <li>Manually unassign users in User Location Assignment page</li>
                  <li>Or: Use "Unassign All & Delete" to automatically remove all assignments</li>
                </ul>
              </Alert>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={handleCloseDeleteDialog} disabled={submitting}>
                Cancel
              </Button>
              <Button
                onClick={() => handleDelete(true)}
                variant="contained"
                color="error"
                disabled={submitting}
              >
                {submitting ? <CircularProgress size={24} /> : 'Unassign All & Delete'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Deactivate/Activate Confirmation Dialog */}
      <Dialog open={deactivateDialogOpen} onClose={handleCloseDeactivateDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {deactivatingLocation?.isActive ? 'Deactivate' : 'Activate'} Location
        </DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Are you sure you want to {deactivatingLocation?.isActive ? 'deactivate' : 'activate'} the location{' '}
            <strong>{deactivatingLocation?.name}</strong>?
          </Typography>
          {deactivatingLocation?.isActive ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              Deactivating this location will:
              <ul style={{ marginTop: '8px', marginBottom: 0 }}>
                <li>Hide it from active location lists</li>
                <li>Preserve all historical orders and data</li>
                <li>Keep menu item and user assignments intact</li>
                <li>Allow reactivation at any time</li>
              </ul>
            </Alert>
          ) : (
            <Alert severity="success" sx={{ mt: 2 }}>
              Activating this location will make it available for selection and ordering again.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseDeactivateDialog} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleToggleActive}
            variant="contained"
            color={deactivatingLocation?.isActive ? 'warning' : 'success'}
            disabled={submitting}
          >
            {submitting ? (
              <CircularProgress size={24} />
            ) : deactivatingLocation?.isActive ? (
              'Deactivate'
            ) : (
              'Activate'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </AdminPageLayout>
  );
};

export default LocationManagementPage;
