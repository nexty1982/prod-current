import React from 'react';
import {
  Box,
  Typography,
  FormControl,
  FormControlLabel,
  RadioGroup,
  Radio,
  Divider,
  Select,
  MenuItem,
  InputLabel,
  Button,
  Chip,
  Stack,
  TextField,
  Paper
} from '@mui/material';
import {
  Clear as ClearIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useRecords } from '../../../../context/RecordsContext';

const RecordFilter: React.FC = () => {
  const { filters, updateFilters, clearFilters, selectedChurch, availableChurches } = useRecords();

  const handleCategoryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateFilters({ category: event.target.value });
  };

  const handleSortChange = (field: 'sortBy' | 'sortOrder', value: string) => {
    updateFilters({ [field]: value });
  };

  const handleDateChange = (field: 'start' | 'end', date: Date | null) => {
    updateFilters({
      dateRange: {
        ...filters.dateRange,
        [field]: date ? date.toISOString() : null
      }
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Filter Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6" display="flex" alignItems="center">
          <FilterIcon sx={{ mr: 1 }} />
          Filters
        </Typography>
        <Button
          size="small"
          startIcon={<ClearIcon />}
          onClick={clearFilters}
          color="secondary"
        >
          Clear
        </Button>
      </Box>

      {/* Church Selection (for super admins) */}
      {availableChurches.length > 1 && (
        <>
          <Typography variant="subtitle2" gutterBottom>
            Church
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
            <Typography variant="body2" color="text.secondary">
              {selectedChurch?.name || 'No church selected'}
            </Typography>
            {selectedChurch && (
              <Chip
                label={`ID: ${selectedChurch.church_id}`}
                size="small"
                sx={{ mt: 1 }}
              />
            )}
          </Paper>
        </>
      )}

      {/* Category Filter */}
      <Typography variant="subtitle2" gutterBottom>
        Record Category
      </Typography>
      <FormControl component="fieldset" sx={{ mb: 3 }}>
        <RadioGroup
          value={filters.category}
          onChange={handleCategoryChange}
        >
          <FormControlLabel
            value="all"
            control={<Radio size="small" />}
            label="All Categories"
          />
          <FormControlLabel
            value="sacramental"
            control={<Radio size="small" />}
            label="Sacramental"
          />
          <FormControlLabel
            value="administrative"
            control={<Radio size="small" />}
            label="Administrative"
          />
          <FormControlLabel
            value="membership"
            control={<Radio size="small" />}
            label="Membership"
          />
        </RadioGroup>
      </FormControl>

      <Divider sx={{ my: 3 }} />

      {/* Date Range Filter */}
      <Typography variant="subtitle2" gutterBottom>
        Last Updated
      </Typography>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Stack spacing={2} sx={{ mb: 3 }}>
          <DatePicker
            label="From Date"
            value={filters.dateRange.start ? new Date(filters.dateRange.start) : null}
            onChange={(date) => handleDateChange('start', date)}
            slotProps={{
              textField: {
                size: 'small',
                fullWidth: true
              }
            }}
          />
          <DatePicker
            label="To Date"
            value={filters.dateRange.end ? new Date(filters.dateRange.end) : null}
            onChange={(date) => handleDateChange('end', date)}
            slotProps={{
              textField: {
                size: 'small',
                fullWidth: true
              }
            }}
          />
        </Stack>
      </LocalizationProvider>

      <Divider sx={{ my: 3 }} />

      {/* Sort Options */}
      <Typography variant="subtitle2" gutterBottom>
        Sort By
      </Typography>
      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
        <InputLabel>Sort Field</InputLabel>
        <Select
          value={filters.sortBy}
          label="Sort Field"
          onChange={(e) => handleSortChange('sortBy', e.target.value)}
        >
          <MenuItem value="name">Name</MenuItem>
          <MenuItem value="count">Record Count</MenuItem>
          <MenuItem value="lastUpdated">Last Updated</MenuItem>
        </Select>
      </FormControl>

      <FormControl fullWidth size="small" sx={{ mb: 3 }}>
        <InputLabel>Sort Order</InputLabel>
        <Select
          value={filters.sortOrder}
          label="Sort Order"
          onChange={(e) => handleSortChange('sortOrder', e.target.value)}
        >
          <MenuItem value="asc">Ascending</MenuItem>
          <MenuItem value="desc">Descending</MenuItem>
        </Select>
      </FormControl>

      <Divider sx={{ my: 3 }} />

      {/* Quick Filters */}
      <Typography variant="subtitle2" gutterBottom>
        Quick Filters
      </Typography>
      <Stack spacing={1}>
        <Button
          variant="outlined"
          size="small"
          onClick={() => updateFilters({ category: 'sacramental', sortBy: 'count', sortOrder: 'desc' })}
        >
          Most Active Sacramental
        </Button>
        <Button
          variant="outlined"
          size="small"
          onClick={() => updateFilters({ sortBy: 'lastUpdated', sortOrder: 'desc' })}
        >
          Recently Updated
        </Button>
        <Button
          variant="outlined"
          size="small"
          onClick={() => updateFilters({ sortBy: 'count', sortOrder: 'desc' })}
        >
          Highest Count
        </Button>
      </Stack>

      {/* Filter Summary */}
      {(filters.category !== 'all' || filters.searchTerm || filters.dateRange.start || filters.dateRange.end) && (
        <>
          <Divider sx={{ my: 3 }} />
          <Typography variant="subtitle2" gutterBottom>
            Active Filters
          </Typography>
          <Stack spacing={1}>
            {filters.category !== 'all' && (
              <Chip
                label={`Category: ${filters.category}`}
                onDelete={() => updateFilters({ category: 'all' })}
                size="small"
                color="primary"
              />
            )}
            {filters.searchTerm && (
              <Chip
                label={`Search: ${filters.searchTerm}`}
                onDelete={() => updateFilters({ searchTerm: '' })}
                size="small"
                color="primary"
              />
            )}
            {(filters.dateRange.start || filters.dateRange.end) && (
              <Chip
                label="Date Range"
                onDelete={() => updateFilters({ dateRange: { start: null, end: null } })}
                size="small"
                color="primary"
              />
            )}
          </Stack>
        </>
      )}
    </Box>
  );
};

export default RecordFilter; 