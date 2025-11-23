import React, { useState, useEffect, useMemo } from 'react';
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
  Paper,
  Stack,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { menuApi, MenuItem, VariationSelection } from '../services/api';
import { useCart } from '../contexts/CartContext';
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
  const [orderingWindow, setOrderingWindow] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

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

  const handleConfirmAddToCart = async () => {
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

      const result = await addItem(selectedItem, quantity, selectedCustomizations, specialRequests, selectedVariations);

      if (!result.success) {
        alert(result.message || 'Unable to add item to cart');
        return;
      }

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

  // Group items by category for easier rendering
  const groupedItems = useMemo(() => {
    return menuItems.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {} as { [key: string]: MenuItem[] });
  }, [menuItems]);

  const categories = useMemo(() => {
    return ['MAIN', 'SIDE', 'DRINK', 'DESSERT', 'OTHER'].filter(
      (cat) => groupedItems[cat]?.length > 0
    );
  }, [groupedItems]);

  useEffect(() => {
    if (activeCategory !== 'ALL' && !categories.includes(activeCategory)) {
      setActiveCategory('ALL');
    }
  }, [activeCategory, categories]);

  const visibleCategories =
    activeCategory === 'ALL' ? categories : categories.filter((cat) => cat === activeCategory);

  const formatCategoryLabel = (category: string) =>
    category.charAt(0) + category.slice(1).toLowerCase();

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
    <Box sx={{ position: 'relative' }}>
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
        <Stack spacing={{ xs: 3, md: 4 }}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              p: { xs: 2.5, md: 3 },
              border: '1px solid rgba(45, 95, 63, 0.12)',
              backgroundColor: 'rgba(255,255,255,0.92)',
            }}
          >
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={{ xs: 2, md: 3 }}
              alignItems={{ xs: 'flex-start', md: 'center' }}
            >
              <Box flexGrow={1}>
                <Typography
                  variant="h4"
                  component="h1"
                  sx={{ fontWeight: 700, fontSize: { xs: '1.875rem', md: '2.25rem' } }}
                >
                  Today's Menu
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Choose the dishes you'd like delivered today.
                </Typography>
                {weekday && (
                  <Chip
                    label={weekday}
                    size="small"
                    sx={{
                      mt: 1.5,
                      fontWeight: 600,
                      backgroundColor: 'rgba(45,95,63,0.08)',
                      color: 'primary.main',
                    }}
                  />
                )}
              </Box>

              <Box
                sx={{
                  display: { xs: 'block', md: 'none' },
                  width: '100%',
                }}
              >
                <Box sx={{ mt: 2 }}>
                  <LocationSelector
                    locations={locations}
                    selectedLocationId={selectedLocation?.id || null}
                    onLocationChange={selectLocation}
                    isLoading={locationsLoading}
                    size="small"
                    fullWidth
                  />
                </Box>
              </Box>
            </Stack>
          </Paper>

          {categories.length > 0 && (
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              <Chip
                label="All items"
                onClick={() => setActiveCategory('ALL')}
                color={activeCategory === 'ALL' ? 'primary' : 'default'}
                variant={activeCategory === 'ALL' ? 'filled' : 'outlined'}
                sx={{ textTransform: 'capitalize', fontWeight: 600 }}
              />
              {categories.map((category) => (
                <Chip
                  key={category}
                  label={formatCategoryLabel(category)}
                  onClick={() => setActiveCategory(category)}
                  variant={activeCategory === category ? 'filled' : 'outlined'}
                  color={activeCategory === category ? 'primary' : 'default'}
                  sx={{ textTransform: 'capitalize', fontWeight: 600 }}
                />
              ))}
            </Box>
          )}

          {error && (
            <Alert
              severity="warning"
              sx={{
                borderLeft: '4px solid',
                borderLeftColor: 'warning.main',
                '& .MuiAlert-icon': {
                  fontSize: '1.5rem',
                },
              }}
            >
              {error}
            </Alert>
          )}

          {orderingWindow && !orderingWindow.active && (
            <Alert
              severity="error"
              sx={{
                borderLeft: '4px solid',
                borderLeftColor: 'error.main',
                '& .MuiAlert-icon': {
                  fontSize: '1.5rem',
                },
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
            visibleCategories.map((category) => (
              <Box key={category}>
                <Typography
                  variant="h5"
                  gutterBottom
                  sx={{
                    mb: 3,
                    fontSize: { xs: '1.5rem', md: '1.625rem' },
                    fontWeight: 700,
                    color: 'text.primary',
                    position: 'relative',
                    pb: 1,
                    '&:after': {
                      content: '""',
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      width: 80,
                      height: 3,
                      background: 'linear-gradient(90deg, #2D5F3F 0%, #4A8862 100%)',
                      borderRadius: 2,
                    },
                  }}
                >
                  {formatCategoryLabel(category)}
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
                          borderRadius: 3,
                          border: '1px solid rgba(45, 95, 63, 0.1)',
                          background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, #F8FAF8 100%)',
                          '&:hover': {
                            boxShadow: '0px 25px 45px rgba(0,0,0,0.08)',
                          },
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
                                background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.15) 100%)',
                              }}
                            />
                          </Box>
                        )}
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 16,
                            right: 16,
                            backgroundColor: 'rgba(255,255,255,0.9)',
                            borderRadius: 999,
                            px: 1.5,
                            py: 0.35,
                            boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
                            fontWeight: 700,
                            color: 'primary.main',
                          }}
                        >
                          ${Number(item.price).toFixed(2)}
                        </Box>
                        <CardContent sx={{ flexGrow: 1, p: 2.75, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                          <Chip
                            label={formatCategoryLabel(item.category)}
                            size="small"
                            sx={{
                              alignSelf: 'flex-start',
                              backgroundColor: 'rgba(45,95,63,0.08)',
                              fontWeight: 600,
                            }}
                          />
                          <Typography variant="h6" component="h3" sx={{ fontWeight: 700 }}>
                            {item.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                            {item.description}
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
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
                        </CardContent>
                        <CardActions sx={{ p: 2.75, pt: 0, mt: 'auto' }}>
                          <Button
                            fullWidth
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => handleAddToCart(item)}
                            sx={{
                              py: 1.1,
                              fontSize: '0.95rem',
                              textTransform: 'none',
                              fontWeight: 700,
                              borderRadius: 2,
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
        </Stack>
      </Container>

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

    </Box>
  );
};

export default MenuPage;
