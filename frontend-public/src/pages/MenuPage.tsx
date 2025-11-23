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
import { Add as AddIcon, Replay as ReplayIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { menuApi, MenuItem, VariationSelection, orderApi } from '../services/api';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
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
  const [repeatOrderLoading, setRepeatOrderLoading] = useState(false);
  const [lastOrderData, setLastOrderData] = useState<any>(null);
  const [lastOrderLoading, setLastOrderLoading] = useState(false);

  const { items: cartItems, addItem, getCartItemCount, cartLocationId, setCartLocation, validateCartForLocation, removeItem, clearCart } = useCart();
  const { locations, selectedLocation, selectLocation, isLoading: locationsLoading } = useLocationContext();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    if (selectedLocation) {
      fetchTodaysMenu();
    }
  }, [selectedLocation]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchLastOrder();
    }
  }, [isAuthenticated]);

  const fetchLastOrder = async () => {
    try {
      setLastOrderLoading(true);
      const response = await orderApi.getLastOrder();
      if (response.success && response.data) {
        setLastOrderData(response.data);
      }
    } catch (err) {
      // Silently fail - it's okay if user has no previous orders
      console.log('No previous orders or error fetching:', err);
    } finally {
      setLastOrderLoading(false);
    }
  };

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

  const handleRepeatLastOrder = async () => {
    if (!isAuthenticated) {
      alert('Please sign in to repeat your last order');
      navigate('/login');
      return;
    }

    if (!lastOrderData) {
      alert('No previous orders found');
      return;
    }

    if (!selectedLocation) {
      alert('Please select a location first');
      return;
    }

    setRepeatOrderLoading(true);
    setError(null);

    try {
      const lastOrder = lastOrderData;

      // Fetch today's menu for the CURRENT location to validate availability
      let todaysMenuItems: MenuItem[] = [];
      try {
        const menuResponse = await menuApi.getTodaysMenu(selectedLocation.id);
        if (menuResponse.success) {
          todaysMenuItems = menuResponse.data.items;

          // Check if ordering window is active
          if (menuResponse.data.orderingWindow && !menuResponse.data.orderingWindow.active) {
            alert('Ordering is currently closed. Please try again during ordering hours.');
            setRepeatOrderLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error('Error fetching menu:', err);
        alert('Unable to verify menu availability. Please try again.');
        setRepeatOrderLoading(false);
        return;
      }

      // Validate that items from last order are available at the CURRENT location
      const availableMenuItemIds = new Set(todaysMenuItems.map(item => item.id));
      const unavailableItems = lastOrder.orderItems.filter(
        (orderItem: any) => !availableMenuItemIds.has(orderItem.menuItemId)
      );

      if (unavailableItems.length === lastOrder.orderItems.length) {
        // All items are unavailable at current location
        alert(`None of the items from your last order are available at ${selectedLocation.name}. Please browse the current menu or try a different location.`);
        setRepeatOrderLoading(false);
        return;
      }

      if (unavailableItems.length > 0) {
        // Some items are unavailable, ask user if they want to continue
        const unavailableNames = unavailableItems.map((item: any) =>
          item.menuItem?.name || item.itemName || 'Unknown item'
        ).join('\n');

        const shouldContinue = window.confirm(
          `The following items from your last order are not available at ${selectedLocation.name}:\n\n${unavailableNames}\n\nWould you like to add the available items to your cart?`
        );

        if (!shouldContinue) {
          setRepeatOrderLoading(false);
          return;
        }
      }

      // Clear current cart
      clearCart();

      // Set cart location to the CURRENT selected location (not the last order's location)
      setCartLocation(selectedLocation.id);

      // Add all items from last order to cart (only available ones)
      let successCount = 0;
      let failedItems: string[] = [];

      for (const orderItem of lastOrder.orderItems) {
        try {
          // Skip items that are not available today
          if (!availableMenuItemIds.has(orderItem.menuItemId)) {
            continue;
          }

          // Get the current menu item (with updated pricing, variations, etc.)
          const currentMenuItem = todaysMenuItems.find(item => item.id === orderItem.menuItemId);
          if (!currentMenuItem) {
            continue;
          }

          // Parse variations from the order item
          let variationSelections: VariationSelection[] | undefined = undefined;
          if (orderItem.selectedVariations?.variations) {
            // Group variations by groupId
            const groupMap = new Map<string, string[]>();
            for (const variation of orderItem.selectedVariations.variations) {
              if (!groupMap.has(variation.groupId)) {
                groupMap.set(variation.groupId, []);
              }
              groupMap.get(variation.groupId)!.push(variation.optionId);
            }

            variationSelections = Array.from(groupMap.entries()).map(([groupId, optionIds]) => ({
              groupId,
              optionIds
            }));
          }

          // Parse customizations
          const customizations: string[] = [];
          if (orderItem.customizations?.customizations) {
            customizations.push(orderItem.customizations.customizations);
          }

          const specialReqs = orderItem.customizations?.specialRequests || undefined;

          // Use current menu item (not the stored one from the order)
          const result = await addItem(
            currentMenuItem,
            orderItem.quantity,
            customizations,
            specialReqs,
            variationSelections
          );

          if (result.success) {
            successCount++;
          } else {
            failedItems.push(currentMenuItem.name + (result.message ? ` (${result.message})` : ''));
          }
        } catch (err) {
          console.error('Error adding item to cart:', err);
          const itemName = orderItem.menuItem?.name || orderItem.itemName || 'Unknown item';
          failedItems.push(itemName);
        }
      }

      // Show result and navigate to checkout
      if (failedItems.length > 0) {
        const message = `Added ${successCount} items to cart.\n\nThe following items could not be added:\n${failedItems.join('\n')}`;
        alert(message);
      }

      if (successCount > 0) {
        // Navigate to checkout
        navigate('/checkout');
      } else {
        alert('Could not add any items from your last order to cart. Please check item availability.');
      }
    } catch (err: any) {
      console.error('Error repeating last order:', err);
      setError(err.response?.data?.message || 'Failed to repeat last order');
    } finally {
      setRepeatOrderLoading(false);
    }
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

          {isAuthenticated && lastOrderData && !lastOrderLoading && (
            <Paper
              elevation={0}
              sx={{
                borderRadius: 2,
                p: { xs: 2, md: 2.5 },
                border: '1.5px solid',
                borderColor: 'primary.main',
                backgroundColor: 'rgba(45, 95, 63, 0.04)',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                '&:hover': {
                  backgroundColor: 'rgba(45, 95, 63, 0.08)',
                  borderColor: 'primary.dark',
                  boxShadow: '0 4px 12px rgba(45, 95, 63, 0.15)',
                },
              }}
              onClick={handleRepeatLastOrder}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, flex: 1 }}>
                  <ReplayIcon sx={{ fontSize: 22, color: 'primary.main', flexShrink: 0 }} />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 600,
                        color: 'primary.main',
                        mb: 0.25,
                        fontSize: { xs: '0.875rem', md: '0.9375rem' }
                      }}
                    >
                      Repeat Last Order
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: 'text.secondary',
                        fontSize: { xs: '0.8125rem', md: '0.875rem' },
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {(() => {
                        const items = lastOrderData.orderItems || [];
                        if (items.length === 0) return 'Your previous order';

                        // Find the most expensive item
                        const mostExpensiveItem = items.reduce((max: any, item: any) => {
                          const itemPrice = Number(item.priceAtPurchase) * item.quantity;
                          const maxPrice = Number(max.priceAtPurchase) * max.quantity;
                          return itemPrice > maxPrice ? item : max;
                        }, items[0]);

                        const itemName = mostExpensiveItem.menuItem?.name || mostExpensiveItem.itemName || 'Item';
                        const remainingCount = items.length - 1;

                        return remainingCount > 0
                          ? `${itemName} and ${remainingCount} other${remainingCount > 1 ? 's' : ''}`
                          : itemName;
                      })()}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                  {repeatOrderLoading ? (
                    <CircularProgress size={20} sx={{ color: 'primary.main' }} />
                  ) : (
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 700,
                        color: 'primary.main',
                        fontSize: { xs: '1rem', md: '1.125rem' }
                      }}
                    >
                      ${Number(lastOrderData.totalAmount || 0).toFixed(2)}
                    </Typography>
                  )}
                </Box>
              </Stack>
            </Paper>
          )}

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
