import { useState } from 'react';

// material-ui
import { useTheme } from '@mui/material/styles';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';

import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DesktopDatePicker } from '@mui/x-date-pickers/DesktopDatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

// project imports
import { ThemeMode } from 'config';

// assets
import CloseIcon from '@mui/icons-material/Close';
import ReplayIcon from '@mui/icons-material/Replay';
import SearchIcon from '@mui/icons-material/Search';

interface FilterProps {
  handleToggleDrawer: () => void;
}

// ==============================|| LEAD - FILTER LIST ||============================== //

export default function FilterLeadList({ handleToggleDrawer }: FilterProps) {
  const theme = useTheme();

  const [value, setValue] = useState<Date | null>(new Date());
  const [value2, setValue2] = useState<Date | null>(new Date());

  return (
    <Box sx={{ bgcolor: theme.palette.mode === ThemeMode.DARK ? 'dark.main' : 'grey.50' }}>
      <Card sx={{ borderRadius: 0 }}>
        <CardContent sx={{ borderRadius: 0, py: 1.25, px: 2.5 }}>
          <TextField
            fullWidth
            placeholder="Search Lead"
            size="small"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                )
              }
            }}
          />
        </CardContent>
        <Divider />
        <CardContent sx={{ borderRadius: 0, py: 1.25, px: 2.5 }}>
          <FormControl fullWidth>
            <InputLabel id="demo-simple-select-label">Source</InputLabel>
            <Select
              labelId="demo-simple-select-label"
              id="demo-simple-select"
              value={1}
              label="Source"
              slotProps={{ input: { placeholder: 'Source' } }}
            >
              <MenuItem value={1}>Facebook</MenuItem>
              <MenuItem value={2}>Linkedin</MenuItem>
              <MenuItem value={3}>Contact</MenuItem>
            </Select>
          </FormControl>
        </CardContent>
        <Divider />
        <CardContent sx={{ borderRadius: 0, py: 1.25, px: 2.5 }}>
          <FormControl fullWidth>
            <InputLabel id="demo-simple-select-label">Status</InputLabel>
            <Select
              labelId="demo-simple-select-label"
              id="demo-simple-select"
              value={1}
              label="Status"
              slotProps={{ input: { placeholder: 'Status' } }}
            >
              <MenuItem value={1}>Lost</MenuItem>
              <MenuItem value={2}>Contacted</MenuItem>
              <MenuItem value={3}>Qualified</MenuItem>
            </Select>
          </FormControl>
        </CardContent>
        <Divider />

        <CardContent sx={{ borderRadius: 0, py: 1.25, px: 2.5 }}>
          <TextField placeholder="Name" fullWidth />
        </CardContent>
        <Divider />
        <CardContent sx={{ borderRadius: 0, py: 1.25, px: 2.5 }}>
          <Stack spacing={4}>
            <Stack spacing={2}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DesktopDatePicker label="From" value={value} onChange={(newValue) => setValue(newValue)} />
              </LocalizationProvider>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DesktopDatePicker label="To" value={value2} onChange={(newValue) => setValue2(newValue)} />
              </LocalizationProvider>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ justifyContent: 'center' }}>
              <Button variant="contained" sx={{ borderRadius: 2.5 }} color="primary" startIcon={<ReplayIcon />}>
                Reset
              </Button>
              <Button variant="outlined" sx={{ borderRadius: 2.5 }} onClick={handleToggleDrawer} color="error" startIcon={<CloseIcon />}>
                Cancel
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
