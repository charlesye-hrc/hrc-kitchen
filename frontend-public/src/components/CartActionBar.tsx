import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Paper, Slide, Typography, useMediaQuery, useTheme } from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { useCart } from '../contexts/CartContext';

interface CartActionBarProps {
  onOpenCart: () => void;
  isCartOpen?: boolean;
  forceHidden?: boolean;
}

const CartActionBar: React.FC<CartActionBarProps> = ({ onOpenCart, isCartOpen = false, forceHidden = false }) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
  const { getCartItemCount, getCartTotal } = useCart();
  const cartItemCount = getCartItemCount();
  const cartTotal = getCartTotal();
  const [animatePulse, setAnimatePulse] = useState(false);
  const previousCountRef = useRef(cartItemCount);
  const showActionBar = isSmallScreen && cartItemCount > 0 && !isCartOpen && !forceHidden;

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    if (cartItemCount > previousCountRef.current) {
      setAnimatePulse(true);
      timeout = setTimeout(() => setAnimatePulse(false), 450);
    }
    previousCountRef.current = cartItemCount;
    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [cartItemCount]);

  const handleOpenCart = () => {
    onOpenCart();
  };

  return (
    <>
      <Slide direction="up" in={showActionBar} mountOnEnter unmountOnExit>
        <Paper
          elevation={12}
          sx={{
            position: 'fixed',
            bottom: 16,
            left: 16,
            right: 16,
            borderRadius: 3,
            px: 2.5,
            py: 1.5,
            backdropFilter: 'blur(8px)',
            background: 'linear-gradient(135deg, rgba(45,95,63,0.92), rgba(74,136,98,0.95))',
            color: 'common.white',
            zIndex: (t) => t.zIndex.snackbar + 1,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 1, opacity: 0.8 }}>
                Ready to checkout?
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'baseline', gap: 1 }}>
                ${cartTotal.toFixed(2)}
                <Typography component="span" variant="body2" sx={{ opacity: 0.85 }}>
                  | {cartItemCount} item{cartItemCount === 1 ? '' : 's'}
                </Typography>
              </Typography>
            </Box>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<ShoppingCartIcon />}
              onClick={handleOpenCart}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: 2,
                px: 2.5,
                py: 1,
                minWidth: 150,
                animation: animatePulse ? 'cartPulse 0.45s ease' : 'none',
                '@keyframes cartPulse': {
                  '0%': { transform: 'scale(1)' },
                  '40%': { transform: 'scale(1.08)' },
                  '100%': { transform: 'scale(1)' },
                },
              }}
            >
              View Cart
            </Button>
          </Box>
        </Paper>
      </Slide>
    </>
  );
};

export default CartActionBar;
