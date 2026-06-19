import { alpha, createTheme, darken, lighten } from '@mui/material/styles';

const DEFAULT_PRIMARY = '#2D5F3F';
const DEFAULT_SECONDARY = '#D4A574';

export interface LocationThemeColors {
  primary?: string;
  secondary?: string;
}

const normalizeHexColor = (value: string | undefined, fallback: string): string => {
  if (!value) {
    return fallback;
  }
  const trimmed = value.trim();
  const hex = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.toUpperCase() : fallback;
};

export const createAppTheme = (colors?: LocationThemeColors) => {
  const primaryMain = normalizeHexColor(colors?.primary, DEFAULT_PRIMARY);
  const secondaryMain = normalizeHexColor(colors?.secondary, DEFAULT_SECONDARY);
  const primaryLight = lighten(primaryMain, 0.2);
  const primaryDark = darken(primaryMain, 0.25);
  const secondaryLight = lighten(secondaryMain, 0.2);
  const secondaryDark = darken(secondaryMain, 0.25);
  const backgroundBase = lighten(primaryMain, 0.94);
  const backgroundPaper = lighten(secondaryMain, 0.985);
  const backgroundGradientTop = lighten(primaryMain, 0.92);
  const backgroundGradientBottom = lighten(secondaryMain, 0.9);
  const backgroundGlowPrimary = alpha(primaryMain, 0.15);
  const backgroundGlowSecondary = alpha(secondaryMain, 0.14);

  return createTheme({
    palette: {
      primary: {
        main: primaryMain,
        light: primaryLight,
        dark: primaryDark,
        contrastText: '#ffffff',
      },
      secondary: {
        main: secondaryMain,
        light: secondaryLight,
        dark: secondaryDark,
        contrastText: primaryDark,
      },
      success: {
        main: '#4CAF50',
        light: '#81C784',
        dark: '#388E3C',
      },
      error: {
        main: '#E53935',
        light: '#EF5350',
        dark: '#C62828',
      },
      warning: {
        main: '#FB8C00',
        light: '#FFB74D',
        dark: '#E65100',
      },
      info: {
        main: '#1E88E5',
        light: '#42A5F5',
        dark: '#1565C0',
      },
      background: {
        default: backgroundBase,
        paper: backgroundPaper,
      },
      text: {
        primary: '#1A1A1A',
        secondary: '#5A6C7D',
      },
      divider: '#E5E9ED',
    },
    typography: {
      fontFamily: [
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
      ].join(','),
      h1: {
        fontSize: '2.75rem',
        fontWeight: 700,
        letterSpacing: '-0.02em',
        lineHeight: 1.2,
      },
      h2: {
        fontSize: '2.25rem',
        fontWeight: 700,
        letterSpacing: '-0.01em',
        lineHeight: 1.3,
      },
      h3: {
        fontSize: '1.875rem',
        fontWeight: 600,
        letterSpacing: '-0.01em',
        lineHeight: 1.3,
      },
      h4: {
        fontSize: '1.5rem',
        fontWeight: 600,
        letterSpacing: '-0.005em',
        lineHeight: 1.4,
      },
      h5: {
        fontSize: '1.25rem',
        fontWeight: 600,
        letterSpacing: '0em',
        lineHeight: 1.4,
      },
      h6: {
        fontSize: '1.125rem',
        fontWeight: 600,
        letterSpacing: '0em',
        lineHeight: 1.5,
      },
      body1: {
        fontSize: '1rem',
        lineHeight: 1.6,
        letterSpacing: '0.01em',
      },
      body2: {
        fontSize: '0.875rem',
        lineHeight: 1.6,
        letterSpacing: '0.01em',
      },
      button: {
        fontWeight: 600,
        letterSpacing: '0.02em',
      },
    },
    shape: {
      borderRadius: 12,
    },
    shadows: [
      'none',
      '0px 2px 4px rgba(0, 0, 0, 0.04)',
      '0px 4px 8px rgba(0, 0, 0, 0.06)',
      '0px 6px 12px rgba(0, 0, 0, 0.08)',
      '0px 8px 16px rgba(0, 0, 0, 0.1)',
      '0px 10px 20px rgba(0, 0, 0, 0.12)',
      '0px 12px 24px rgba(0, 0, 0, 0.14)',
      '0px 14px 28px rgba(0, 0, 0, 0.16)',
      '0px 16px 32px rgba(0, 0, 0, 0.18)',
      '0px 18px 36px rgba(0, 0, 0, 0.2)',
      '0px 20px 40px rgba(0, 0, 0, 0.22)',
      '0px 22px 44px rgba(0, 0, 0, 0.24)',
      '0px 24px 48px rgba(0, 0, 0, 0.26)',
      '0px 26px 52px rgba(0, 0, 0, 0.28)',
      '0px 28px 56px rgba(0, 0, 0, 0.3)',
      '0px 30px 60px rgba(0, 0, 0, 0.32)',
      '0px 32px 64px rgba(0, 0, 0, 0.34)',
      '0px 34px 68px rgba(0, 0, 0, 0.36)',
      '0px 36px 72px rgba(0, 0, 0, 0.38)',
      '0px 38px 76px rgba(0, 0, 0, 0.4)',
      '0px 40px 80px rgba(0, 0, 0, 0.42)',
      '0px 42px 84px rgba(0, 0, 0, 0.44)',
      '0px 44px 88px rgba(0, 0, 0, 0.46)',
      '0px 46px 92px rgba(0, 0, 0, 0.48)',
      '0px 48px 96px rgba(0, 0, 0, 0.5)',
    ],
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: {
            minHeight: '100%',
          },
          body: {
            minHeight: '100vh',
            backgroundColor: backgroundBase,
            backgroundImage: `
              radial-gradient(circle at 10% 12%, ${backgroundGlowPrimary} 0%, transparent 36%),
              radial-gradient(circle at 88% 4%, ${backgroundGlowSecondary} 0%, transparent 34%),
              linear-gradient(180deg, ${backgroundGradientTop} 0%, ${backgroundGradientBottom} 100%)
            `,
            backgroundAttachment: 'fixed',
          },
          '#root': {
            minHeight: '100vh',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 10,
            padding: '10px 24px',
            fontSize: '0.9375rem',
            fontWeight: 600,
            boxShadow: 'none',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              boxShadow: `0px 4px 12px ${alpha(primaryMain, 0.2)}`,
              transform: 'translateY(-1px)',
            },
            '&:active': {
              transform: 'translateY(0px)',
            },
          },
          contained: {
            '&:hover': {
              boxShadow: `0px 6px 16px ${alpha(primaryMain, 0.25)}`,
            },
          },
          outlined: {
            borderWidth: '1.5px',
            '&:hover': {
              borderWidth: '1.5px',
            },
          },
          sizeLarge: {
            padding: '12px 32px',
            fontSize: '1rem',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.06)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            border: '1px solid rgba(0, 0, 0, 0.04)',
            overflow: 'hidden',
            '&:hover': {
              boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.1)',
              transform: 'translateY(-2px)',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
          rounded: {
            borderRadius: 16,
          },
          elevation1: {
            boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.04)',
          },
          elevation2: {
            boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.06)',
          },
          elevation3: {
            boxShadow: '0px 6px 16px rgba(0, 0, 0, 0.08)',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 10,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: primaryMain,
                },
              },
              '&.Mui-focused': {
                '& .MuiOutlinedInput-notchedOutline': {
                  borderWidth: '2px',
                },
              },
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontWeight: 500,
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          },
          outlined: {
            borderWidth: '1.5px',
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            padding: '12px 16px',
          },
          standardError: {
            backgroundColor: '#FFEBEE',
            color: '#C62828',
          },
          standardWarning: {
            backgroundColor: '#FFF3E0',
            color: '#E65100',
          },
          standardSuccess: {
            backgroundColor: '#E8F5E9',
            color: '#2E7D32',
          },
          standardInfo: {
            backgroundColor: '#E3F2FD',
            color: '#1565C0',
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'scale(1.08)',
            },
          },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: '#E5E9ED',
          },
        },
      },
    },
  });
};

const theme = createAppTheme();

export default theme;
