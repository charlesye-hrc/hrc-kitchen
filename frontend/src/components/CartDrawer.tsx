import React from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Button,
  Divider,
  TextField,
  Chip,
  Stack,
  Alert,
} from '@mui/material';
import {
  Close as CloseIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  ShoppingCart as CartIcon,
} from '@mui/icons-material';
import { useCart } from '../contexts/CartContext';
import { useNavigate } from 'react-router-dom';

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  orderingWindow?: any;
}

const CartDrawer: React.FC<CartDrawerProps> = ({ open, onClose, orderingWindow }) => {
  const { items, removeItem, updateQuantity, clearCart, getCartTotal, getCartItemCount, calculateItemPrice } = useCart();
  const navigate = useNavigate();

  const isOrderingClosed = orderingWindow && !orderingWindow.active;

  const handleCheckout = () => {
    onClose();
    navigate('/checkout');
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.12)',
        }
      }}
    >
      <Box sx={{ width: { xs: '100vw', sm: 420 }, height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
        {/* Header */}
        <Box
          sx={{
            p: { xs: 2, sm: 2.5 },
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            bgcolor: 'background.paper',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                p: 1,
                borderRadius: 2,
                bgcolor: 'primary.main',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <CartIcon sx={{ fontSize: '1.25rem' }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontSize: { xs: '1.125rem', sm: '1.25rem' }, fontWeight: 600, lineHeight: 1.2 }}>
                Your Cart
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                {getCartItemCount()} {getCartItemCount() === 1 ? 'item' : 'items'}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose} sx={{ color: 'text.secondary' }}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Cart Items */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: { xs: 1.5, sm: 2 } }}>
          {items.length === 0 ? (
            <Box
              sx={{
                textAlign: 'center',
                py: 8,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  bgcolor: 'grey.100',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CartIcon sx={{ fontSize: 40, color: 'grey.400' }} />
              </Box>
              <Typography color="text.secondary" variant="body1" fontWeight={500}>
                Your cart is empty
              </Typography>
              <Typography color="text.secondary" variant="body2">
                Add items from the menu to get started
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {items.map((item) => (
                <React.Fragment key={item.menuItem.id}>
                  <ListItem
                    sx={{
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: 1.5,
                      py: 2,
                      px: 2,
                      bgcolor: 'background.paper',
                      borderRadius: 2,
                      mb: 1.5,
                      border: '1px solid',
                      borderColor: 'divider',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.08)',
                      }
                    }}
                  >
                    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Typography variant="subtitle1" fontWeight={600} sx={{ flex: 1, pr: 1 }}>
                        {item.menuItem.name}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => removeItem(item.menuItem.id)}
                        sx={{
                          color: 'error.main',
                          '&:hover': {
                            bgcolor: 'error.lighter',
                          }
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>

                    <Typography variant="body2" color="text.secondary">
                      ${calculateItemPrice(item).toFixed(2)} each
                    </Typography>

                    {/* Selected Variations */}
                    {item.selectedVariations && item.selectedVariations.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        {item.selectedVariations.map((selection) => {
                          const group = item.menuItem.variationGroups?.find(
                            (g) => g.id === selection.groupId
                          );
                          if (!group) return null;

                          const selectedOptions = selection.optionIds
                            .map((optionId) => group.options.find((o) => o.id === optionId))
                            .filter(Boolean);

                          return (
                            <Box key={selection.groupId} sx={{ mb: 0.5 }}>
                              <Typography variant="caption" color="text.secondary" display="block">
                                {group.name}:
                              </Typography>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, ml: 1 }}>
                                {selectedOptions.map((option) => (
                                  <Chip
                                    key={option!.id}
                                    label={`${option!.name}${
                                      option!.priceModifier !== 0
                                        ? ` (+$${Number(option!.priceModifier).toFixed(2)})`
                                        : ''
                                    }`}
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                  />
                                ))}
                              </Box>
                            </Box>
                          );
                        })}
                      </Box>
                    )}

                    {/* Customizations (Legacy) */}
                    {item.customizations && item.customizations.length > 0 && (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                        {item.customizations.map((custom, index) => (
                          <Chip key={index} label={custom} size="small" variant="outlined" />
                        ))}
                      </Box>
                    )}

                    {/* Special Requests */}
                    {item.specialRequests && (
                      <Typography variant="body2" color="text.secondary" fontStyle="italic">
                        Note: {item.specialRequests}
                      </Typography>
                    )}

                    {/* Quantity Controls */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5, width: '100%', justifyContent: 'space-between' }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          bgcolor: 'grey.100',
                          borderRadius: 2,
                          p: 0.5,
                        }}
                      >
                        <IconButton
                          size="small"
                          onClick={() => updateQuantity(item.menuItem.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          sx={{
                            bgcolor: 'white',
                            '&:hover': { bgcolor: 'grey.50' },
                            '&.Mui-disabled': { bgcolor: 'grey.100' },
                          }}
                        >
                          <RemoveIcon fontSize="small" />
                        </IconButton>
                        <Typography sx={{ minWidth: 32, textAlign: 'center', fontWeight: 600, fontSize: '0.9375rem' }}>
                          {item.quantity}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => updateQuantity(item.menuItem.id, item.quantity + 1)}
                          sx={{
                            bgcolor: 'white',
                            '&:hover': { bgcolor: 'grey.50' },
                          }}
                        >
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      <Typography variant="body1" sx={{ fontWeight: 700, color: 'primary.main', fontSize: '1.0625rem' }}>
                        ${(calculateItemPrice(item) * item.quantity).toFixed(2)}
                      </Typography>
                    </Box>
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>

        {/* Footer */}
        {items.length > 0 && (
          <>
            <Box
              sx={{
                p: { xs: 2, sm: 2.5 },
                bgcolor: 'background.paper',
                borderTop: '1px solid',
                borderColor: 'divider',
              }}
            >
              {isOrderingClosed && (
                <Alert
                  severity="error"
                  sx={{
                    mb: 2,
                    borderLeft: '4px solid',
                    borderLeftColor: 'error.main',
                  }}
                >
                  {orderingWindow.message || 'Ordering is currently closed'}
                  {orderingWindow.window?.start && orderingWindow.window?.end && (
                    <Typography variant="body2" sx={{ mt: 1, fontWeight: 500 }}>
                      Ordering window: {orderingWindow.window.start} - {orderingWindow.window.end}
                    </Typography>
                  )}
                </Alert>
              )}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2.5,
                  py: 2,
                  px: 2.5,
                  bgcolor: 'grey.50',
                  borderRadius: 2,
                }}
              >
                <Typography variant="h6" sx={{ fontSize: '1.125rem', fontWeight: 600 }}>
                  Total:
                </Typography>
                <Typography
                  variant="h5"
                  sx={{
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: 'primary.main',
                  }}
                >
                  ${getCartTotal().toFixed(2)}
                </Typography>
              </Box>
              <Stack spacing={1.5}>
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={handleCheckout}
                  disabled={items.length === 0 || isOrderingClosed}
                  sx={{
                    py: 1.5,
                    fontSize: '1rem',
                  }}
                >
                  Proceed to Checkout
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  color="error"
                  onClick={clearCart}
                  sx={{
                    py: 1.25,
                  }}
                >
                  Clear Cart
                </Button>
              </Stack>
            </Box>
          </>
        )}
      </Box>
    </Drawer>
  );
};

export default CartDrawer;
