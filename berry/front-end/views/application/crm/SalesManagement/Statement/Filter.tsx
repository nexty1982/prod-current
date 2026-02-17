import { useState } from 'react';

// mui
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';

// assets
import FileCopyIcon from '@mui/icons-material/FileCopyTwoTone';
import FilterListIcon from '@mui/icons-material/FilterListTwoTone';
import PrintIcon from '@mui/icons-material/PrintTwoTone';
import SearchIcon from '@mui/icons-material/Search';

// types
import { KeyedObject } from 'types';
import { Order } from 'types/customer';

interface Props {
  rows: Order[];
  setRows: (rows: Order[]) => void;
}

// ==============================|| STATEMENT - FILTER ||============================== //

export default function Filter({ rows, setRows }: Props) {
  const [selectValue, setSelectValue] = useState<string>('1');
  const [search, setSearch] = useState<string>('');

  const handleSearch = (event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement> | undefined) => {
    const newString = event?.target.value;
    setSearch(newString || '');

    if (newString) {
      const newRows = rows?.filter((row: KeyedObject) => {
        let matches = true;
        const properties = ['id', 'name', 'date', 'qty'];
        let containsQuery = false;

        properties.forEach((property) => {
          if (row[property].toString().toLowerCase().includes(newString.toString().toLowerCase())) {
            containsQuery = true;
          }
        });
        if (!containsQuery) {
          matches = false;
        }
        return matches;
      });
      setRows(newRows);
    } else {
      setRows(rows);
    }
  };

  const handleChangeMonth = (e: SelectChangeEvent) => {
    setSelectValue(e.target.value);
  };

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center', p: 3 }}>
      <TextField
        onChange={handleSearch}
        value={search}
        placeholder="Search Transaction"
        size="small"
        sx={{ width: { xs: 1, sm: 'auto' } }}
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
      <Stack
        direction="row"
        spacing={1.25}
        sx={{ alignItems: 'center', justifyContent: 'space-between', width: { xs: '100%', sm: 'auto' } }}
      >
        <Stack direction="row" spacing={{ xs: 0.5, sm: 1 }} sx={{ alignItems: 'center' }}>
          <Tooltip title="Copy">
            <IconButton size="large">
              <FileCopyIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Print">
            <IconButton size="large">
              <PrintIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Filter">
            <IconButton size="large">
              <FilterListIcon />
            </IconButton>
          </Tooltip>
        </Stack>
        <FormControl fullWidth size="small" sx={{ width: 147 }}>
          <InputLabel id="demo-simple-select-label">Select Month</InputLabel>
          <Select
            labelId="demo-simple-select-label"
            id="demo-simple-select"
            onChange={handleChangeMonth}
            value={selectValue}
            label="Select Month"
          >
            <MenuItem value={1}>Last Month</MenuItem>
            <MenuItem value={2}>This Month</MenuItem>
          </Select>
        </FormControl>
      </Stack>
    </Stack>
  );
}
