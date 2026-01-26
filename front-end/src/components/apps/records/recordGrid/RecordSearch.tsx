import React from 'react';
import { TextField, InputAdornment } from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { useRecords } from '../../../../context/RecordsContext.tsx';

const RecordSearch: React.FC = () => {
  const { filters, updateFilters } = useRecords();

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateFilters({ searchTerm: event.target.value });
  };

  return (
    <TextField
      size="small"
      placeholder="Search record types..."
      value={filters.searchTerm}
      onChange={handleSearchChange}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon />
          </InputAdornment>
        ),
      }}
      sx={{ minWidth: 200 }}
    />
  );
};

export default RecordSearch; 