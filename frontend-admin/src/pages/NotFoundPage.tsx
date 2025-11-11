import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Typography, Box, Button } from '@mui/material';
import { Home as HomeIcon } from '@mui/icons-material';

const NotFoundPage = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <Container maxWidth="sm" sx={{ py: 10, textAlign: 'center' }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
        }}
      >
        <Box
          sx={{
            position: 'relative',
            mb: 2,
          }}
        >
          <Typography
            variant="h1"
            gutterBottom
            sx={{
              fontSize: { xs: '5rem', sm: '7rem' },
              fontWeight: 800,
              background: 'linear-gradient(135deg, #2D5F3F 0%, #4A8862 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              lineHeight: 1,
              mb: 0,
              letterSpacing: '-0.03em',
            }}
          >
            404
          </Typography>
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 120,
              height: 120,
              borderRadius: '50%',
              bgcolor: 'primary.lighter',
              opacity: 0.15,
              zIndex: -1,
            }}
          />
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography
            variant="h4"
            gutterBottom
            sx={{
              fontWeight: 700,
              mb: 1.5,
              fontSize: { xs: '1.75rem', sm: '2.125rem' },
            }}
          >
            Page Not Found
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph sx={{ fontSize: '1.0625rem', mb: 1 }}>
            The page you're looking for doesn't exist or has been moved.
          </Typography>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              py: 1.5,
              px: 2.5,
              bgcolor: 'info.lighter',
              borderRadius: 2,
              mb: 3,
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: 'info.main',
                animation: 'pulse 2s infinite',
                '@keyframes pulse': {
                  '0%, 100%': {
                    opacity: 1,
                  },
                  '50%': {
                    opacity: 0.5,
                  },
                },
              }}
            />
            <Typography variant="body2" color="info.dark" sx={{ fontWeight: 600 }}>
              Redirecting to home in {countdown} seconds...
            </Typography>
          </Box>
        </Box>

        <Button
          variant="contained"
          size="large"
          startIcon={<HomeIcon />}
          onClick={() => navigate('/')}
          sx={{
            mt: 1,
            py: 1.5,
            px: 4,
            fontSize: '1rem',
          }}
        >
          Go to Home Now
        </Button>
      </Box>
    </Container>
  );
};

export default NotFoundPage;
