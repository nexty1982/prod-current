import * as React from 'react';

// material-ui
import Fab from '@mui/material/Fab';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';

// project imports
import AddLeadDialog from './AddLeadDialog';

// assets
import AddIcon from '@mui/icons-material/AddTwoTone';
import FilterListIcon from '@mui/icons-material/FilterListTwoTone';
import FileCopyIcon from '@mui/icons-material/FileCopyTwoTone';
import PrintIcon from '@mui/icons-material/PrintTwoTone';
import SearchIcon from '@mui/icons-material/Search';

// types
import { KeyedObject } from 'types';
import { Order } from 'types/customer';

interface LeadFilterProps {
  handleToggleDrawer: () => void;
  rows: Order[];
  setRows: (rows: Order[]) => void;
}

// ==============================|| LEAD - SEARCH FILTER ||============================== //

export default function Filter({ handleToggleDrawer, rows, setRows }: LeadFilterProps) {
  const [openAddDialog, setOpenAddDialog] = React.useState(false);
  const [search, setSearch] = React.useState<string>('');

  const handleToggleAddDialog = () => {
    setOpenAddDialog(!openAddDialog);
  };

  const handleSearch = (event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement> | undefined) => {
    const newString = event?.target.value;
    setSearch(newString || '');

    if (newString) {
      const newRows = rows?.filter((row: KeyedObject) => {
        let matches = true;
        const properties = ['id', 'name'];
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

  return (
    <>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, p: 3 }}
      >
        <TextField
          placeholder="Search Lead"
          size="small"
          value={search}
          onChange={handleSearch}
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
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', justifyContent: { xs: 'center' } }}>
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
            <IconButton size="large" onClick={handleToggleDrawer}>
              <FilterListIcon />
            </IconButton>
          </Tooltip>

          {/* lead add & dialog */}
          <Tooltip title="Add New Lead">
            <Fab
              color="primary"
              size="small"
              onClick={handleToggleAddDialog}
              sx={{ boxShadow: 'none', ml: 1, width: 32, height: 32, minHeight: 32 }}
            >
              <AddIcon fontSize="small" />
            </Fab>
          </Tooltip>
        </Stack>
      </Stack>
      <AddLeadDialog {...{ open: openAddDialog, handleToggleAddDialog }} />
    </>
  );
}
