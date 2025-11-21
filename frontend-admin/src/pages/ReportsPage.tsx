import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  TextField,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Download as DownloadIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { LocationSelector, Location } from '@hrc-kitchen/common';
import axios from 'axios';

interface RevenueByUser {
  user: {
    id: string;
    fullName: string;
    email: string;
    department: string | null;
  };
  totalRevenue: number;
  orderCount: number;
}

interface PopularItem {
  menuItem: {
    id: string;
    name: string;
    category: string;
    price: number;
  };
  totalQuantity: number;
  orderCount: number;
  totalRevenue: number;
}

interface SummaryStats {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  ordersByStatus: {
    PLACED: number;
    PARTIALLY_FULFILLED: number;
    FULFILLED: number;
  };
  ordersByPayment: {
    PENDING: number;
    COMPLETED: number;
    FAILED: number;
    REFUNDED: number;
  };
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

const ReportsPage = () => {
  const { token } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [tabValue, setTabValue] = useState(0);
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    return firstDay.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [revenueData, setRevenueData] = useState<RevenueByUser[]>([]);
  const [popularItems, setPopularItems] = useState<PopularItem[]>([]);
  const [summaryStats, setSummaryStats] = useState<SummaryStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch user-accessible locations for report filtering
  // Only ADMIN users can see all locations; others see only assigned locations
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setLocationsLoading(true);
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/locations/user/accessible`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.data.success) {
          // Show only user-accessible active locations
          const activeLocations = response.data.data.filter((loc: Location) => loc.isActive);
          setLocations(activeLocations);
        }
      } catch (err) {
        console.error('Error fetching locations:', err);
      } finally {
        setLocationsLoading(false);
      }
    };

    fetchLocations();
  }, [token]);

  const loadRevenueByUser = async () => {
    try {
      setLoading(true);
      setError('');
      const params: any = { startDate, endDate };
      if (locationFilter !== 'all') {
        params.locationId = locationFilter;
      }
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/admin/reports/revenue-by-user`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params
        }
      );
      setRevenueData(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load revenue report');
    } finally {
      setLoading(false);
    }
  };

  const loadPopularItems = async () => {
    try {
      setLoading(true);
      setError('');
      const params: any = { startDate, endDate };
      if (locationFilter !== 'all') {
        params.locationId = locationFilter;
      }
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/admin/reports/popular-items`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params
        }
      );
      setPopularItems(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load popular items');
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      setLoading(true);
      setError('');
      const params: any = { startDate, endDate };
      if (locationFilter !== 'all') {
        params.locationId = locationFilter;
      }
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/admin/reports/summary`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params
        }
      );
      setSummaryStats(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load summary');
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = async (reportType: string) => {
    try {
      const params: any = {
        startDate,
        endDate,
        format: 'csv'
      };
      if (locationFilter !== 'all') {
        params.locationId = locationFilter;
      }
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/admin/reports/${reportType}`,
        {
          params,
          headers: {
            Authorization: `Bearer ${token}`
          },
          responseType: 'blob'
        }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportType}-${startDate}-${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('CSV download error:', err);
      setError('Failed to download CSV. Please try again.');
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setError('');
  };

  const handleGenerate = () => {
    switch (tabValue) {
      case 0:
        loadRevenueByUser();
        break;
      case 1:
        loadPopularItems();
        break;
      case 2:
        loadSummary();
        break;
    }
  };

  return (
    <Container maxWidth="lg" sx={{
      py: { xs: 2, sm: 4 },
      px: { xs: 1, sm: 2 },
      width: '100%',
      maxWidth: '100%',
      overflowX: 'hidden',
    }}>
      <Typography variant="h4" gutterBottom sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>
        Reports & Analytics
      </Typography>

      {/* Date Range Filter */}
      <Paper sx={{
        p: { xs: 1.5, sm: 2 },
        mb: 3,
        width: '100%',
        maxWidth: '100%',
        overflowX: 'hidden',
      }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={2.5}>
            <LocationSelector
              locations={locations}
              selectedLocationId={locationFilter}
              onLocationChange={setLocationFilter}
              isLoading={locationsLoading}
              size="small"
              fullWidth
              includeAll={true}
              allLabel="All Locations"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2.5}>
            <TextField
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2.5}>
            <TextField
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2.5}>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={handleGenerate}
              disabled={loading}
              startIcon={<RefreshIcon />}
              sx={{ height: '40px', fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
            >
              Generate
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<DownloadIcon />}
              onClick={() => {
                const reportTypes = ['revenue-by-user', 'popular-items'];
                downloadCSV(reportTypes[Math.min(tabValue, 1)]);
              }}
              disabled={loading || (tabValue === 0 && revenueData.length === 0) || (tabValue === 1 && popularItems.length === 0)}
              sx={{ height: '40px', fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
            >
              Export CSV
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{
        width: '100%',
        maxWidth: '100%',
        overflowX: 'hidden',
      }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            '& .MuiTab-root': {
              fontSize: { xs: '0.7rem', sm: '0.875rem' },
              minWidth: { xs: 70, sm: 120 },
              px: { xs: 0.5, sm: 2 },
              py: { xs: 1, sm: 1.5 },
            }
          }}
        >
          <Tab label="Revenue" />
          <Tab label="Popular" />
          <Tab label="Summary" />
        </Tabs>

        <Box sx={{
          p: { xs: 1.5, sm: 2, md: 3 },
          width: '100%',
          maxWidth: '100%',
          overflowX: 'hidden',
        }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {/* Revenue by User Tab */}
              {tabValue === 0 && (
                <TableContainer sx={{ overflowX: 'auto', width: '100%' }}>
                  <Table sx={{ minWidth: { xs: 300, sm: 'auto' } }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 } }}>User Name</TableCell>
                        <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 } }}>Email</TableCell>
                        <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 } }}>Department</TableCell>
                        <TableCell align="right" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 } }}>Revenue</TableCell>
                        <TableCell align="right" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 } }}>Orders</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {revenueData.map((row) => (
                        <TableRow key={row.user.id}>
                          <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 } }}>{row.user.fullName}</TableCell>
                          <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 } }}>{row.user.email}</TableCell>
                          <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 } }}>{row.user.department || 'N/A'}</TableCell>
                          <TableCell align="right" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 } }}>${row.totalRevenue.toFixed(2)}</TableCell>
                          <TableCell align="right" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 } }}>{row.orderCount}</TableCell>
                        </TableRow>
                      ))}
                      {revenueData.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} align="center">
                            No data available. Click "Generate Report" to load data.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {/* Popular Items Tab */}
              {tabValue === 1 && (
                <TableContainer sx={{ overflowX: 'auto', width: '100%' }}>
                  <Table sx={{ minWidth: { xs: 300, sm: 'auto' } }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 } }}>Menu Item</TableCell>
                        <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 } }}>Category</TableCell>
                        <TableCell align="right" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 } }}>Qty</TableCell>
                        <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' }, fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 } }}>Orders</TableCell>
                        <TableCell align="right" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 } }}>Revenue</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {popularItems.map((row) => (
                        <TableRow key={row.menuItem.id}>
                          <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 } }}>{row.menuItem.name}</TableCell>
                          <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 } }}>{row.menuItem.category}</TableCell>
                          <TableCell align="right" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 } }}>{row.totalQuantity}</TableCell>
                          <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' }, fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 } }}>{row.orderCount}</TableCell>
                          <TableCell align="right" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 } }}>${row.totalRevenue.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                      {popularItems.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} align="center">
                            No data available. Click "Generate Report" to load data.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {/* Summary Statistics Tab */}
              {tabValue === 2 && (
                <Grid container spacing={3}>
                  {summaryStats ? (
                    <>
                      <Grid item xs={12} md={4}>
                        <Card>
                          <CardContent>
                            <Typography color="text.secondary" variant="body2">
                              Total Orders
                            </Typography>
                            <Typography variant="h4">{summaryStats.totalOrders}</Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Card>
                          <CardContent>
                            <Typography color="text.secondary" variant="body2">
                              Total Revenue
                            </Typography>
                            <Typography variant="h4">${summaryStats.totalRevenue.toFixed(2)}</Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Card>
                          <CardContent>
                            <Typography color="text.secondary" variant="body2">
                              Average Order Value
                            </Typography>
                            <Typography variant="h4">${summaryStats.averageOrderValue.toFixed(2)}</Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              Orders by Fulfillment Status
                            </Typography>
                            <Box>
                              <Typography>Placed: {summaryStats.ordersByStatus.PLACED}</Typography>
                              <Typography>Partially Fulfilled: {summaryStats.ordersByStatus.PARTIALLY_FULFILLED}</Typography>
                              <Typography>Fulfilled: {summaryStats.ordersByStatus.FULFILLED}</Typography>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              Orders by Payment Status
                            </Typography>
                            <Box>
                              <Typography>Pending: {summaryStats.ordersByPayment.PENDING}</Typography>
                              <Typography>Completed: {summaryStats.ordersByPayment.COMPLETED}</Typography>
                              <Typography>Failed: {summaryStats.ordersByPayment.FAILED}</Typography>
                              <Typography>Refunded: {summaryStats.ordersByPayment.REFUNDED}</Typography>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    </>
                  ) : (
                    <Grid item xs={12}>
                      <Typography align="center" color="text.secondary">
                        No data available. Click "Generate Report" to load data.
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              )}
            </>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default ReportsPage;
