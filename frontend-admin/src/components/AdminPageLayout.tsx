import { ReactNode } from 'react';
import { Container, Box, Typography } from '@mui/material';

interface AdminPageLayoutProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

const AdminPageLayout = ({ title, subtitle, actions, children }: AdminPageLayoutProps) => {
  return (
    <Container
      maxWidth="lg"
      sx={{
        py: { xs: 2, sm: 3 },
        px: { xs: 1, sm: 3 },
        width: '100%',
        maxWidth: '100%',
        overflowX: 'hidden',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: { xs: 1, sm: 2 },
          mb: subtitle ? 2 : 1.5,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' }, fontWeight: 700 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>

        {actions && (
          <Box sx={{ width: { xs: '100%', sm: 'auto' } }}>
            {actions}
          </Box>
        )}
      </Box>

      {children}
    </Container>
  );
};

export default AdminPageLayout;
