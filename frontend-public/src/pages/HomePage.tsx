import { useState, useEffect } from 'react';
import {
  Typography,
  Paper,
  Box,
  Button,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Badge,
  Container
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LocalDiningIcon from '@mui/icons-material/LocalDining';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { menuApi, MenuItem } from '../services/api';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import CartDrawer from '../components/CartDrawer';
import axios from 'axios';

const HomePage = () => {
  const navigate = useNavigate();
  const { addItem, getCartItemCount } = useCart();
  const { isAuthenticated, token } = useAuth();
  const [displayItems, setDisplayItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderingWindow, setOrderingWindow] = useState<any>(null);
  const [sectionTitle, setSectionTitle] = useState('Today\'s Menu');
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    fetchDisplayItems();
  }, [isAuthenticated]);

  const fetchDisplayItems = async () => {
    try {
      if (isAuthenticated && token) {
        // Fetch user's recent orders to get menu item IDs
        const ordersResponse = await axios.get(
          `${import.meta.env.VITE_API_URL}/orders?limit=10`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        // Extract unique menu item IDs from recent orders, ranked by recency
        const recentItemIds: string[] = [];

        for (const order of ordersResponse.data.data) {
          for (const orderItem of order.orderItems) {
            if (!recentItemIds.includes(orderItem.menuItem.id) && recentItemIds.length < 4) {
              recentItemIds.push(orderItem.menuItem.id);
            }
          }
        }

        if (recentItemIds.length > 0) {
          // Fetch current menu item data for each ID to get up-to-date pricing
          const recentMenuItems: MenuItem[] = [];

          for (const itemId of recentItemIds) {
            try {
              const itemResponse = await menuApi.getMenuItem(itemId);
              if (itemResponse.success && itemResponse.data) {
                recentMenuItems.push(itemResponse.data);
              }
            } catch (error) {
              console.error(`Failed to fetch menu item ${itemId}:`, error);
            }
          }

          if (recentMenuItems.length > 0) {
            setDisplayItems(recentMenuItems);
            setSectionTitle('Your Recent Orders');
          } else {
            // Recent items not found in current menu, fall back to today's menu
            await fetchTodaysMenu();
          }
        } else {
          // No recent orders, fall back to today's menu
          await fetchTodaysMenu();
        }
      } else {
        // Guest user - show today's menu
        await fetchTodaysMenu();
      }

      // Fetch ordering window status
      const menuResponse = await menuApi.getTodaysMenu();
      setOrderingWindow(menuResponse.data.orderingWindow);
    } catch (error) {
      console.error('Failed to fetch display items:', error);
      // Fall back to today's menu on error
      await fetchTodaysMenu();
    } finally {
      setLoading(false);
    }
  };

  const fetchTodaysMenu = async () => {
    try {
      const response = await menuApi.getTodaysMenu();
      setDisplayItems(response.data.items);
      setSectionTitle('Today\'s Menu');
    } catch (error) {
      console.error('Failed to fetch today\'s menu:', error);
    }
  };

  const handleQuickAdd = (item: MenuItem) => {
    addItem(item, 1, [], '', []);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header with Cart */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            HRC Kitchen
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" sx={{ visibility: 'hidden' }}>
            Placeholder
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton color="primary" size="large" onClick={() => setCartOpen(true)}>
            <Badge badgeContent={getCartItemCount()} color="error">
              <ShoppingCartIcon />
            </Badge>
          </IconButton>
        </Box>
      </Box>

      {/* Hero Section */}
      <Paper sx={{ p: 4, mb: 3, textAlign: 'center', background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)', color: 'white' }}>
        <Typography variant="h3" gutterBottom fontWeight="bold">
          Welcome to HRC Kitchen
        </Typography>
        <Typography variant="h6" paragraph sx={{ mb: 3, opacity: 0.95 }}>
          Fresh, delicious lunches for Huon Regional Care Staff
        </Typography>
        <Button
          variant="contained"
          size="large"
          startIcon={<RestaurantMenuIcon />}
          onClick={() => navigate('/menu')}
          sx={{
            px: 4,
            py: 1.5,
            fontSize: '1.1rem',
            backgroundColor: 'white',
            color: '#1976d2',
            '&:hover': {
              backgroundColor: '#f5f5f5'
            }
          }}
        >
          Browse Full Menu & Order Now
        </Button>
      </Paper>

      {/* Ordering Window Status */}
      {orderingWindow && (
        <Alert
          severity={orderingWindow.active ? "success" : "warning"}
          icon={<AccessTimeIcon />}
          sx={{ mb: 3 }}
        >
          {orderingWindow.active
            ? `Ordering is OPEN! Place your order before ${orderingWindow.endTime}`
            : orderingWindow.message
          }
        </Alert>
      )}

      {/* Display Items Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold" sx={{ mb: 2 }}>
          {sectionTitle}
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : !displayItems || displayItems.length === 0 ? (
          <Alert severity="info">No items available. Check back later!</Alert>
        ) : (
          <Grid container spacing={3}>
            {displayItems.map((item) => (
              <Grid item xs={12} sm={6} md={3} key={item.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  {item.imageUrl && (
                    <CardMedia
                      component="img"
                      height="180"
                      image={item.imageUrl}
                      alt={item.name}
                      sx={{ objectFit: 'cover' }}
                    />
                  )}
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" gutterBottom>
                      {item.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph sx={{ mb: 1 }}>
                      {item.description}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                      {item.dietaryTags.map((tag) => (
                        <Chip key={tag} label={tag} size="small" variant="outlined" />
                      ))}
                    </Box>
                    <Typography variant="h6" color="primary" fontWeight="bold">
                      ${Number(item.price).toFixed(2)}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      variant="outlined"
                      fullWidth
                      onClick={() => handleQuickAdd(item)}
                    >
                      Quick Add to Cart
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Button
            variant="outlined"
            size="large"
            onClick={() => navigate('/menu')}
          >
            See Full Menu
          </Button>
        </Box>
      </Box>

      {/* How it Works - Condensed */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom fontWeight="bold" sx={{ mb: 3 }}>
          How It Works
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'center' }}>
              <RestaurantMenuIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
              <Typography variant="h6" gutterBottom>
                1. Browse & Order
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Choose from today's menu (no account required!)
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'center' }}>
              <LocalDiningIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
              <Typography variant="h6" gutterBottom>
                2. Checkout & Pay
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Secure payment via Stripe (guest or sign in)
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'center' }}>
              <CheckCircleIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
              <Typography variant="h6" gutterBottom>
                3. Pick Up & Enjoy
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Get confirmation via email, pick up when ready!
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Cart Drawer */}
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </Container>
  );
};

export default HomePage;
