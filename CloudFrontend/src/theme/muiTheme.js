import { createTheme } from '@mui/material/styles';

const sharedTypography = {
  fontFamily: '"Work Sans", ui-sans-serif, system-ui, sans-serif',
  h1: { fontWeight: 700 },
  h2: { fontWeight: 600 },
  h3: { fontWeight: 600 },
  h4: { fontWeight: 600 },
  h5: { fontWeight: 600 },
  h6: { fontWeight: 600 },
  button: { textTransform: 'none', fontWeight: 500 },
};

const sharedShape = { borderRadius: 4 };

const sharedComponents = {
  MuiButtonBase: {
    defaultProps: {
      onDoubleClick: (event) => {
        event.preventDefault()
        event.stopPropagation()
      },
    },
  },
  MuiButton: {
    styleOverrides: {
      root: { borderRadius: 4, fontWeight: 500 },
      containedPrimary: {
        backgroundColor: '#fe6b00',
        '&:hover': { backgroundColor: '#a04100' },
      },
    },
  },
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: 4,
          '&.Mui-focused fieldset': { borderWidth: 2 },
        },
      },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: 8,
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
      },
    },
  },
  MuiCircularProgress: {
    styleOverrides: {
      root: { color: '#003180' },
    },
  },
};

export const createMuiTheme = (mode = 'light') => {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode: isDark ? 'dark' : 'light',
      primary: {
        main: isDark ? '#b2c5ff' : '#003180',
        light: isDark ? '#dae2ff' : '#0046af',
        dark: isDark ? '#0040a1' : '#001848',
        contrastText: isDark ? '#001848' : '#ffffff',
      },
      secondary: {
        main: '#fe6b00',
        light: '#ffb693',
        dark: '#a04100',
        contrastText: '#ffffff',
      },
      error: {
        main: '#ba1a1a',
        light: '#ffdad6',
        dark: '#93000a',
        contrastText: '#ffffff',
      },
      background: {
        default: isDark ? '#0f1115' : '#f8fafc',
        paper: isDark ? '#1a1d24' : '#ffffff',
      },
      text: {
        primary: isDark ? '#f0f0f3' : '#1a1c1e',
        secondary: isDark ? '#a8adbd' : '#434653',
      },
      divider: isDark ? '#3a3f4b' : '#c3c6d5',
    },
    typography: sharedTypography,
    shape: sharedShape,
    components: {
      ...sharedComponents,
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: isDark ? '#0f1115' : '#f8fafc',
            color: isDark ? '#f0f0f3' : '#1a1c1e',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 4,
              '& fieldset': { borderColor: isDark ? '#4a5060' : '#c3c6d5' },
              '&:hover fieldset': { borderColor: isDark ? '#8b90a0' : '#737784' },
              '&.Mui-focused fieldset': {
                borderColor: isDark ? '#b2c5ff' : '#003180',
                borderWidth: 2,
              },
            },
          },
        },
      },
      MuiDataGrid: {
        styleOverrides: {
          root: {
            border: `1px solid ${isDark ? '#3a3f4b' : '#e2e8f0'}`,
            borderRadius: 8,
            fontFamily: '"Work Sans", sans-serif',
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: isDark ? '#22262f' : '#f1f5f9',
              fontWeight: 600,
              fontSize: '0.875rem',
            },
            '& .MuiDataGrid-row:hover': {
              backgroundColor: isDark ? 'rgba(178, 197, 255, 0.08)' : 'rgba(0, 49, 128, 0.04)',
            },
            '& .MuiDataGrid-cell': {
              borderBottom: `1px solid ${isDark ? '#3a3f4b' : '#e2e8f0'}`,
            },
          },
        },
      },
      MuiCircularProgress: {
        styleOverrides: {
          root: { color: isDark ? '#b2c5ff' : '#003180' },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? 'rgba(178, 197, 255, 0.15)' : 'rgba(0, 49, 128, 0.1)',
            borderRadius: 3,
          },
          bar: {
            backgroundColor: isDark ? '#b2c5ff' : '#003180',
            borderRadius: 3,
          },
        },
      },
    },
  });
};