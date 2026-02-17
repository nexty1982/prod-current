// material-ui
import { useTheme } from '@mui/material/styles';

// ==============================|| DATA GRID STYLE - HOOKS ||============================== //

export default function useDataGrid() {
  const theme = useTheme();

  const dataGridStyles = {
    '& .MuiDataGrid-root .MuiDataGrid-columnSeparator': { color: 'grey.300' },
    '.MuiDataGrid-root .MuiDataGrid-container--top [role=row],': { backgroundColor: theme.palette.background.paper }
  };

  return dataGridStyles;
}
