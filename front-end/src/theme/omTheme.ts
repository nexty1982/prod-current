import { createTheme } from '@mui/material/styles';

export const OM_COLORS = {
  purple: '#5B2EBF',
  gold: '#D4AF37',
  lavender: '#EDE7FF'
};

export const omTheme = createTheme({
  palette: {
    primary: { main: OM_COLORS.purple },
    secondary: { main: OM_COLORS.gold }
  },
  shape: { borderRadius: 14 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          textTransform: 'none',
          fontWeight: 600,
          paddingInline: 20,
          paddingBlock: 10
        }
      }
    },
    MuiRadio: {
      styleOverrides: {
        root: {
          color: OM_COLORS.purple,
          '&.Mui-checked': { color: OM_COLORS.purple }
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          boxShadow: '0 2px 6px rgba(0,0,0,.06), 0 12px 30px rgba(91,46,191,.08)'
        }
      }
    }
  }
});
