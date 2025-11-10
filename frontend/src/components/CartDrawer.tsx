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
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: { xs: '100vw', sm: 400 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ p: { xs: 1.5, sm: 2 }, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CartIcon color="primary" />
            <Typography variant="h6" sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>Your Cart</Typography>
            <Chip label={getCartItemCount()} size="small" color="primary" />
          </Box>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Divider />

        {/* Cart Items */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: { xs: 1, sm: 2 } }}>
          {items.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">Your cart is empty</Typography>
            </Box>
          ) : (
            <List>
              {items.map((item) => (
                <React.Fragment key={item.menuItem.id}>
                  <ListItem
                    sx={{
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: 1,
                      py: { xs: 1.5, sm: 2 },
                      px: { xs: 1, sm: 2 },
                    }}
                  >
                    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {item.menuItem.name}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => removeItem(item.menuItem.id)}
                        color="error"
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => updateQuantity(item.menuItem.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >
                          <RemoveIcon fontSize="small" />
                        </IconButton>
                        <Typography sx={{ minWidth: 30, textAlign: 'center' }}>
                          {item.quantity}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => updateQuantity(item.menuItem.id, item.quantity + 1)}
                        >
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      <Typography variant="body2" sx={{ ml: 'auto', fontWeight: 'bold' }}>
                        ${(calculateItemPrice(item) * item.quantity).toFixed(2)}
                      </Typography>
                    </Box>
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>

        {/* Footer */}
        {items.length > 0 && (
          <>
            <Divider />
            <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
              {isOrderingClosed && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {orderingWindow.message || 'Ordering is currently closed'}
                  {orderingWindow.window?.start && orderingWindow.window?.end && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Ordering window: {orderingWindow.window.start} - {orderingWindow.window.end}
                    </Typography>
                  )}
                </Alert>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>Total:</Typography>
                <Typography variant="h6" color="primary" sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
                  ${getCartTotal().toFixed(2)}
                </Typography>
              </Box>
              <Stack spacing={1}>
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={handleCheckout}
                  disabled={items.length === 0 || isOrderingClosed}
                >
                  Proceed to Checkout
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  color="error"
                  onClick={clearCart}
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
