import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  Link,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  OpenInNew as OpenInNewIcon,
  PictureAsPdf as PictureAsPdfIcon,
} from '@mui/icons-material';
import AdminPageLayout from '../components/AdminPageLayout';
import api from '../services/api';

interface LocationOption {
  id: string;
  name: string;
}

interface LocationMenuPdf {
  id: string;
  locationId: string;
  title: string;
  fileUrl: string;
  createdAt: string;
  updatedAt: string;
}

const PdfMenuManagementPage: React.FC = () => {
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [locationPdfs, setLocationPdfs] = useState<LocationMenuPdf[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [loadingPdfs, setLoadingPdfs] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedLocation = useMemo(
    () => locations.find((location) => location.id === selectedLocationId) || null,
    [locations, selectedLocationId]
  );

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    if (selectedLocationId) {
      fetchLocationPdfs(selectedLocationId);
    } else {
      setLocationPdfs([]);
    }
  }, [selectedLocationId]);

  const fetchLocations = async () => {
    try {
      setLoadingLocations(true);
      const response = await api.get('/locations/user/accessible');
      if (response.data.success) {
        const scopedLocations = response.data.data as LocationOption[];
        setLocations(scopedLocations);

        if (scopedLocations.length > 0) {
          setSelectedLocationId(scopedLocations[0].id);
        }
      }
    } catch (err: any) {
      console.error('Error fetching locations:', err);
      setError(err.response?.data?.message || 'Failed to load locations');
    } finally {
      setLoadingLocations(false);
    }
  };

  const fetchLocationPdfs = async (locationId: string) => {
    try {
      setLoadingPdfs(true);
      const response = await api.get(`/admin/locations/${locationId}/menu-pdfs`);
      if (response.data.success) {
        setLocationPdfs(response.data.data || []);
      } else {
        setLocationPdfs([]);
      }
    } catch (err: any) {
      console.error('Error fetching location PDFs:', err);
      setError(err.response?.data?.message || 'Failed to load PDF files');
      setLocationPdfs([]);
    } finally {
      setLoadingPdfs(false);
    }
  };

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';

    if (!selectedLocationId || files.length === 0) {
      return;
    }

    const invalidType = files.find((file) => file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf'));
    if (invalidType) {
      setError(`"${invalidType.name}" is not a PDF file`);
      return;
    }

    const maxSizeMb = 6;
    const oversized = files.find((file) => file.size > maxSizeMb * 1024 * 1024);
    if (oversized) {
      setError(`"${oversized.name}" is larger than ${maxSizeMb}MB`);
      return;
    }

    try {
      setUploading(true);
      setError(null);

      for (const file of files) {
        const base64 = await readFileAsDataUrl(file);
        await api.post(`/admin/locations/${selectedLocationId}/menu-pdfs`, {
          title: file.name.replace(/\.pdf$/i, ''),
          fileData: base64,
        });
      }

      await fetchLocationPdfs(selectedLocationId);
    } catch (err: any) {
      console.error('Error uploading PDFs:', err);
      setError(err.response?.data?.message || 'Failed to upload one or more PDF files');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (pdfId: string) => {
    if (!selectedLocationId) return;

    try {
      setError(null);
      await api.delete(`/admin/locations/${selectedLocationId}/menu-pdfs/${pdfId}`);
      await fetchLocationPdfs(selectedLocationId);
    } catch (err: any) {
      console.error('Error deleting PDF:', err);
      setError(err.response?.data?.message || 'Failed to delete PDF file');
    }
  };

  return (
    <AdminPageLayout
      title="PDF Menu Management"
      subtitle="Upload and manage weekly PDF menus by location."
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loadingLocations ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : locations.length === 0 ? (
        <Alert severity="warning">No active locations available. Create or activate a location first.</Alert>
      ) : (
        <Stack spacing={2.5}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
              <FormControl sx={{ minWidth: 280 }}>
                <InputLabel id="pdf-location-label">Location</InputLabel>
                <Select
                  labelId="pdf-location-label"
                  value={selectedLocationId}
                  label="Location"
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                >
                  {locations.map((location) => (
                    <MenuItem key={location.id} value={location.id}>
                      {location.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Button
                variant="contained"
                component="label"
                startIcon={<CloudUploadIcon />}
                disabled={!selectedLocationId || uploading}
              >
                {uploading ? 'Uploading...' : 'Upload PDF Files'}
                <input type="file" hidden accept="application/pdf" multiple onChange={handleUpload} />
              </Button>

              <Typography variant="body2" color="text.secondary">
                Multiple files allowed. Max 6MB each.
              </Typography>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
              <PictureAsPdfIcon color="primary" fontSize="small" />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {selectedLocation ? `${selectedLocation.name} PDF Menus` : 'PDF Menus'}
              </Typography>
            </Stack>

            {loadingPdfs ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                <CircularProgress />
              </Box>
            ) : locationPdfs.length === 0 ? (
              <Alert severity="info">No PDF menu files uploaded for this location yet.</Alert>
            ) : (
              <Stack spacing={1.5}>
                {locationPdfs.map((pdf) => (
                  <Paper key={pdf.id} variant="outlined" sx={{ p: 1.5 }}>
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      alignItems={{ xs: 'flex-start', sm: 'center' }}
                      justifyContent="space-between"
                      spacing={1}
                    >
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {pdf.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Uploaded {new Date(pdf.createdAt).toLocaleString()}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          variant="outlined"
                          component={Link}
                          href={pdf.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          startIcon={<OpenInNewIcon fontSize="small" />}
                        >
                          Open
                        </Button>
                        <Button size="small" color="error" variant="outlined" onClick={() => handleDelete(pdf.id)}>
                          Remove
                        </Button>
                      </Stack>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}
          </Paper>
        </Stack>
      )}
    </AdminPageLayout>
  );
};

export default PdfMenuManagementPage;
