import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import { AdminDashboard } from './index';

// Create a theme for the admin dashboard
const adminTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#667eea',
      light: '#9fa8f7',
      dark: '#3854d1',
    },
    secondary: {
      main: '#764ba2',
      light: '#a377d1',
      dark: '#4a2874',
    },
    error: {
      main: '#f56565',
    },
    warning: {
      main: '#ed8936',
    },
    success: {
      main: '#48bb78',
    },
    info: {
      main: '#4299e1',
    },
    background: {
      default: '#f7fafc',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h4: {
      fontWeight: 700,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  shadows: [
    'none',
    '0px 2px 4px rgba(0, 0, 0, 0.05)',
    '0px 4px 8px rgba(0, 0, 0, 0.08)',
    '0px 8px 16px rgba(0, 0, 0, 0.1)',
    '0px 12px 24px rgba(0, 0, 0, 0.12)',
    '0px 16px 32px rgba(0, 0, 0, 0.15)',
    '0px 20px 40px rgba(0, 0, 0, 0.18)',
    '0px 24px 48px rgba(0, 0, 0, 0.2)',
    '0px 32px 64px rgba(0, 0, 0, 0.22)',
    '0px 40px 80px rgba(0, 0, 0, 0.25)',
    '0px 48px 96px rgba(0, 0, 0, 0.28)',
    '0px 56px 112px rgba(0, 0, 0, 0.3)',
    '0px 64px 128px rgba(0, 0, 0, 0.32)',
    '0px 72px 144px rgba(0, 0, 0, 0.35)',
    '0px 80px 160px rgba(0, 0, 0, 0.38)',
    '0px 88px 176px rgba(0, 0, 0, 0.4)',
    '0px 96px 192px rgba(0, 0, 0, 0.42)',
    '0px 104px 208px rgba(0, 0, 0, 0.45)',
    '0px 112px 224px rgba(0, 0, 0, 0.48)',
    '0px 120px 240px rgba(0, 0, 0, 0.5)',
    '0px 128px 256px rgba(0, 0, 0, 0.52)',
    '0px 136px 272px rgba(0, 0, 0, 0.55)',
    '0px 144px 288px rgba(0, 0, 0, 0.58)',
    '0px 152px 304px rgba(0, 0, 0, 0.6)',
    '0px 160px 320px rgba(0, 0, 0, 0.62)',
  ],
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(0, 0, 0, 0.05)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
  },
});

/**
 * Demo wrapper for the Admin Dashboard
 * This component demonstrates how to integrate the admin dashboard
 * with proper theming and layout
 */
export const AdminDemo: React.FC = () => {
  return (
    <ThemeProvider theme={adminTheme}>
      <CssBaseline />
      <Box sx={{ 
        minHeight: '100vh',
        backgroundColor: 'background.default',
      }}>
        <AdminDashboard />
      </Box>
    </ThemeProvider>
  );
};

export default AdminDemo;