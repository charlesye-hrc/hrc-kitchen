import { useState } from 'react';
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

  const loadRevenueByUser = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/admin/reports/revenue-by-user`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { startDate, endDate }
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
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/admin/reports/popular-items`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { startDate, endDate }
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
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/admin/reports/summary`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { startDate, endDate }
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
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/admin/reports/${reportType}`,
        {
          params: {
            startDate,
            endDate,
            format: 'csv'
          },
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
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Reports & Analytics
      </Typography>

      {/* Date Range Filter */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={handleGenerate}
              startIcon={<RefreshIcon />}
              disabled={loading}
              sx={{ height: '56px' }}
            >
              Generate Report
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<DownloadIcon />}
              onClick={() => {
                const reportTypes = ['revenue-by-user', 'popular-items'];
                downloadCSV(reportTypes[Math.min(tabValue, 1)]);
              }}
              disabled={loading || (tabValue === 0 && revenueData.length === 0) || (tabValue === 1 && popularItems.length === 0)}
              sx={{ height: '56px' }}
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

      <Paper>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Revenue by User" />
          <Tab label="Popular Items" />
          <Tab label="Summary Statistics" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {/* Revenue by User Tab */}
              {tabValue === 0 && (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>User Name</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Department</TableCell>
                        <TableCell align="right">Total Revenue</TableCell>
                        <TableCell align="right">Order Count</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {revenueData.map((row) => (
                        <TableRow key={row.user.id}>
                          <TableCell>{row.user.fullName}</TableCell>
                          <TableCell>{row.user.email}</TableCell>
                          <TableCell>{row.user.department || 'N/A'}</TableCell>
                          <TableCell align="right">${row.totalRevenue.toFixed(2)}</TableCell>
                          <TableCell align="right">{row.orderCount}</TableCell>
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
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Menu Item</TableCell>
                        <TableCell>Category</TableCell>
                        <TableCell align="right">Total Quantity</TableCell>
                        <TableCell align="right">Order Count</TableCell>
                        <TableCell align="right">Total Revenue</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {popularItems.map((row) => (
                        <TableRow key={row.menuItem.id}>
                          <TableCell>{row.menuItem.name}</TableCell>
                          <TableCell>{row.menuItem.category}</TableCell>
                          <TableCell align="right">{row.totalQuantity}</TableCell>
                          <TableCell align="right">{row.orderCount}</TableCell>
                          <TableCell align="right">${row.totalRevenue.toFixed(2)}</TableCell>
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
