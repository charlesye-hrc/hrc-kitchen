import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Button,
  Chip,
  Box,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormGroup,
  FormControlLabel,
  Checkbox,
  IconButton,
  Badge,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Add as AddIcon, ShoppingCart as CartIcon } from '@mui/icons-material';
import { menuApi, MenuItem, VariationSelection } from '../services/api';
import { useCart } from '../contexts/CartContext';
import CartDrawer from '../components/CartDrawer';
import VariationSelector from '../components/VariationSelector';
import { useLocationContext, LocationSelector } from '@hrc-kitchen/common';

const MenuPage: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weekday, setWeekday] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedCustomizations, setSelectedCustomizations] = useState<string[]>([]);
  const [selectedVariations, setSelectedVariations] = useState<VariationSelection[]>([]);
  const [specialRequests, setSpecialRequests] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [orderingWindow, setOrderingWindow] = useState<any>(null);

  const { items: cartItems, addItem, getCartItemCount, cartLocationId, setCartLocation, validateCartForLocation, removeItem } = useCart();
  const { locations, selectedLocation, selectLocation, isLoading: locationsLoading } = useLocationContext();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    if (selectedLocation) {
      fetchTodaysMenu();
    }
  }, [selectedLocation]);

  const validateCartForCurrentLocation = (newMenuItems: MenuItem[]) => {
    if (!selectedLocation) return;

    // Check if this is a location change (cart location differs from selected location)
    if (cartLocationId && selectedLocation.id !== cartLocationId && cartItems.length > 0) {
      // Location has changed, validate cart against NEW location's menu
      const availableMenuItemIds = newMenuItems.map(item => item.id);
      const unavailableItems = validateCartForLocation(selectedLocation.id, availableMenuItemIds);

      const cartLocation = locations.find(loc => loc.id === cartLocationId);
      const cartLocationName = cartLocation?.name || 'previous location';

      if (unavailableItems.length > 0) {
        // Show warning about unavailable items
        const unavailableNames = unavailableItems
          .map(id => cartItems.find(item => item.menuItem.id === id)?.menuItem.name)
          .filter(Boolean);

        const confirmRemove = window.confirm(
          `The following items in your cart are not available at ${selectedLocation.name}:\n\n` +
          unavailableNames.join('\n') +
          '\n\nThese items will be removed from your cart. Continue?'
        );

        if (confirmRemove) {
          // Remove all cart items with unavailable menu items (including all variations)
          unavailableItems.forEach(menuItemId => {
            cartItems.filter(item => item.menuItem.id === menuItemId).forEach(item => {
              removeItem(item.cartItemId || item.menuItem.id);
            });
          });
          setCartLocation(selectedLocation.id);
        } else {
          // User cancelled, revert to cart location
          if (cartLocation) {
            selectLocation(cartLocationId);
          }
        }
      } else {
        // All items ARE available at new location, but ask user to confirm location change
        const confirmLocationChange = window.confirm(
          `You have ${cartItems.length} item(s) in your cart from ${cartLocationName}.\n\n` +
          `Do you want to switch your cart location to ${selectedLocation.name}?`
        );

        if (confirmLocationChange) {
          setCartLocation(selectedLocation.id);
        } else {
          // User wants to keep cart at original location, revert
          if (cartLocation) {
            selectLocation(cartLocationId);
          }
        }
      }
    } else if (!cartLocationId) {
      // First time setting location
      setCartLocation(selectedLocation.id);
    }
  };

  const fetchTodaysMenu = async () => {
    if (!selectedLocation) return;

    try {
      setLoading(true);
      const response = await menuApi.getTodaysMenu(selectedLocation.id);

      if (response.success) {
        const newMenuItems = response.data.items;
        setMenuItems(newMenuItems);
        setWeekday(response.data.weekday);
        setOrderingWindow(response.data.orderingWindow);
        // Clear any previous errors when successfully loading menu
        setError(null);

        // Validate cart AFTER menu is loaded with the NEW menu items
        validateCartForCurrentLocation(newMenuItems);
      } else {
        setError(response.message || 'Failed to load menu');
      }
    } catch (err: any) {
      console.error('Error fetching menu:', err);
      setError(err.response?.data?.message || 'Failed to load menu. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (item: MenuItem) => {
    setSelectedItem(item);
    setQuantity(1);
    setSelectedCustomizations([]);
    setSelectedVariations([]);
    setSpecialRequests('');

    // Set default variations if any exist
    if (item.variationGroups) {
      const defaultSelections: VariationSelection[] = [];
      item.variationGroups.forEach((group) => {
        const defaultOption = group.options.find((opt) => opt.isDefault);
        if (defaultOption && group.type === 'SINGLE_SELECT') {
          defaultSelections.push({ groupId: group.id, optionIds: [defaultOption.id] });
        }
      });
      setSelectedVariations(defaultSelections);
    }
  };

  const handleConfirmAddToCart = () => {
    if (selectedItem) {
      // Validate required variation groups
      if (selectedItem.variationGroups) {
        const requiredGroups = selectedItem.variationGroups.filter((g) => g.required);
        const missingRequired = requiredGroups.some(
          (group) => !selectedVariations.find((s) => s.groupId === group.id)
        );

        if (missingRequired) {
          alert('Please select all required options');
          return;
        }
      }

      // If cart is empty and no location set, set it to current selected location
      if (!cartLocationId && selectedLocation) {
        setCartLocation(selectedLocation.id);
      }

      addItem(selectedItem, quantity, selectedCustomizations, specialRequests, selectedVariations);
      setSelectedItem(null);
      setQuantity(1);
      setSelectedCustomizations([]);
      setSelectedVariations([]);
      setSpecialRequests('');
    }
  };

  const calculateDialogPrice = (): number => {
    if (!selectedItem) return 0;

    let basePrice = Number(selectedItem.price);

    // Calculate variation modifiers
    if (selectedItem.variationGroups && selectedVariations.length > 0) {
      selectedVariations.forEach((selection) => {
        const group = selectedItem.variationGroups!.find((g) => g.id === selection.groupId);
        if (group) {
          selection.optionIds.forEach((optionId) => {
            const option = group.options.find((o) => o.id === optionId);
            if (option) {
              basePrice += Number(option.priceModifier);
            }
          });
        }
      });
    }

    return basePrice * quantity;
  };

  const handleCustomizationChange = (customization: string) => {
    setSelectedCustomizations((prev) =>
      prev.includes(customization)
        ? prev.filter((c) => c !== customization)
        : [...prev, customization]
    );
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: 'primary' | 'secondary' | 'success' | 'warning' | 'info' } = {
      MAIN: 'primary',
      SIDE: 'secondary',
      DRINK: 'info',
      DESSERT: 'warning',
      OTHER: 'success',
    };
    return colors[category] || 'default';
  };

  // Group items by category
  const groupedItems = menuItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as { [key: string]: MenuItem[] });

  const categories = ['MAIN', 'SIDE', 'DRINK', 'DESSERT', 'OTHER'].filter(
    (cat) => groupedItems[cat]?.length > 0
  );

  // Show loading spinner while locations or menu is loading
  if (locationsLoading || (loading && selectedLocation)) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  // Handle case where no location is available
  if (!locationsLoading && !selectedLocation) {
    return (
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        <Alert severity="warning">
          No locations available. Please contact support.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'stretch', sm: 'center' },
        mb: 4,
        gap: { xs: 2, sm: 2 },
        pb: 2
      }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1.5, sm: 3 } }}>
          <Box>
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              sx={{
                fontSize: { xs: '1.875rem', md: '2.25rem' },
                fontWeight: 700,
                mb: 0.5,
                background: 'linear-gradient(135deg, #2D5F3F 0%, #4A8862 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Today's Menu
            </Typography>
            {weekday && (
              <Typography variant="subtitle1" color="text.secondary" sx={{ fontWeight: 500 }}>
                {weekday}
              </Typography>
            )}
          </Box>
          <Box sx={{ minWidth: { xs: '100%', sm: 250 }, mt: { xs: 0, sm: 1 } }}>
            <LocationSelector
              locations={locations}
              selectedLocationId={selectedLocation?.id || null}
              onLocationChange={selectLocation}
              isLoading={locationsLoading}
              size="small"
              fullWidth={isMobile}
            />
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'flex-end', sm: 'center' }, mt: { xs: -1, sm: 0 } }}>
          <IconButton
            color="primary"
            size="large"
            onClick={() => setCartOpen(true)}
            sx={{
              bgcolor: 'primary.main',
              color: 'white',
              '&:hover': {
                bgcolor: 'primary.dark',
                transform: 'scale(1.05)',
              },
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <Badge
              badgeContent={getCartItemCount()}
              color="error"
              sx={{
                '& .MuiBadge-badge': {
                  fontWeight: 600,
                }
              }}
            >
              <CartIcon />
            </Badge>
          </IconButton>
        </Box>
      </Box>

      {error && (
        <Alert
          severity="warning"
          sx={{
            mb: 3,
            borderLeft: '4px solid',
            borderLeftColor: 'warning.main',
            '& .MuiAlert-icon': {
              fontSize: '1.5rem',
            }
          }}
        >
          {error}
        </Alert>
      )}

      {orderingWindow && !orderingWindow.active && (
        <Alert
          severity="error"
          sx={{
            mb: 3,
            borderLeft: '4px solid',
            borderLeftColor: 'error.main',
            '& .MuiAlert-icon': {
              fontSize: '1.5rem',
            }
          }}
        >
          {orderingWindow.message || 'Ordering is currently closed'}
          {orderingWindow.window.start && orderingWindow.window.end && (
            <Typography variant="body2" sx={{ mt: 1, fontWeight: 500 }}>
              Ordering window: {orderingWindow.window.start} - {orderingWindow.window.end}
            </Typography>
          )}
        </Alert>
      )}

      {menuItems.length === 0 ? (
        <Alert
          severity="info"
          sx={{
            borderLeft: '4px solid',
            borderLeftColor: 'info.main',
            textAlign: 'center',
            py: 3,
          }}
        >
          No menu items available for today.
        </Alert>
      ) : (
        categories.map((category) => (
          <Box key={category} sx={{ mb: 5 }}>
            <Typography
              variant="h5"
              gutterBottom
              sx={{
                mb: 3,
                fontSize: { xs: '1.5rem', md: '1.625rem' },
                fontWeight: 600,
                color: 'text.primary',
                position: 'relative',
                pb: 1,
                '&:after': {
                  content: '""',
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  width: 60,
                  height: 3,
                  background: 'linear-gradient(90deg, #2D5F3F 0%, #4A8862 100%)',
                  borderRadius: 2,
                }
              }}
            >
              {category}
            </Typography>
            <Grid container spacing={{ xs: 2, md: 3 }}>
              {groupedItems[category].map((item) => (
                <Grid item xs={12} sm={6} md={4} key={item.id}>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      position: 'relative',
                      overflow: 'hidden',
                      '&:hover': {
                        '& .menu-item-image': {
                          transform: 'scale(1.05)',
                        }
                      }
                    }}
                  >
                    {item.imageUrl && (
                      <Box sx={{ overflow: 'hidden', position: 'relative', height: 200 }}>
                        <CardMedia
                          component="img"
                          height="200"
                          image={item.imageUrl}
                          alt={item.name}
                          className="menu-item-image"
                          sx={{
                            transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                            objectFit: 'cover',
                          }}
                        />
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.1) 100%)',
                          }}
                        />
                      </Box>
                    )}
                    <CardContent sx={{ flexGrow: 1, p: 2.5 }}>
                      <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 600, mb: 1 }}>
                        {item.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" paragraph sx={{ mb: 2, lineHeight: 1.6 }}>
                        {item.description}
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2 }}>
                        {item.dietaryTags.map((tag) => (
                          <Chip
                            key={tag}
                            label={tag}
                            size="small"
                            variant="outlined"
                            sx={{
                              borderColor: 'primary.light',
                              color: 'primary.main',
                              fontWeight: 500,
                              fontSize: '0.75rem',
                            }}
                          />
                        ))}
                      </Box>
                      <Typography
                        variant="h6"
                        color="primary"
                        sx={{
                          fontWeight: 700,
                          fontSize: '1.25rem',
                        }}
                      >
                        ${Number(item.price).toFixed(2)}
                      </Typography>
                    </CardContent>
                    <CardActions sx={{ p: 2.5, pt: 0 }}>
                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => handleAddToCart(item)}
                        sx={{
                          py: 1.25,
                          fontSize: '0.9375rem',
                        }}
                      >
                        Add to Cart
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        ))
      )}

      {/* Add to Cart Dialog */}
      <Dialog
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            borderRadius: { xs: 0, sm: 3 },
          }
        }}
      >
        <DialogTitle sx={{ pb: 1, fontSize: '1.375rem', fontWeight: 600 }}>
          {selectedItem?.name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              label="Quantity"
              type="number"
              fullWidth
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              InputProps={{ inputProps: { min: 1 } }}
              sx={{ mb: 3 }}
            />

            {/* Variation Groups */}
            {selectedItem && selectedItem.variationGroups && selectedItem.variationGroups.length > 0 && (
              <VariationSelector
                variationGroups={selectedItem.variationGroups}
                selectedVariations={selectedVariations}
                onChange={setSelectedVariations}
              />
            )}

            {selectedItem && selectedItem.customizations.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Customizations (Legacy)
                </Typography>
                <FormGroup>
                  {selectedItem.customizations.map((custom) => (
                    <FormControlLabel
                      key={custom.id}
                      control={
                        <Checkbox
                          checked={selectedCustomizations.includes(custom.customizationName)}
                          onChange={() => handleCustomizationChange(custom.customizationName)}
                        />
                      }
                      label={custom.customizationName}
                    />
                  ))}
                </FormGroup>
              </Box>
            )}

            <TextField
              label="Special Requests"
              fullWidth
              multiline
              rows={3}
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              placeholder="Any special requests for this item?"
              sx={{ mb: 2 }}
            />

            {/* Price Display */}
            <Box
              sx={{
                mt: 2,
                p: 2.5,
                background: 'linear-gradient(135deg, #2D5F3F 0%, #4A8862 100%)',
                color: 'white',
                borderRadius: 2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0px 4px 12px rgba(45, 95, 63, 0.2)',
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600 }}>Total:</Typography>
              <Typography variant="h5" fontWeight="bold">
                ${calculateDialogPrice().toFixed(2)}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setSelectedItem(null)} variant="outlined" sx={{ minWidth: 100 }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleConfirmAddToCart} sx={{ minWidth: 140 }}>
            Add to Cart
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cart Drawer */}
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        orderingWindow={orderingWindow}
      />
    </Container>
  );
};

export default MenuPage;
