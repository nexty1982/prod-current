import * as React from 'react';

// material-ui
import { Theme } from '@mui/material/styles';
import Checkbox from '@mui/material/Checkbox';
import TableHead from '@mui/material/TableHead';
import TableCell from '@mui/material/TableCell';
import TableSortLabel from '@mui/material/TableSortLabel';
import Toolbar from '@mui/material/Toolbar';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

import { visuallyHidden } from '@mui/utils';

// types
import { ArrangementOrder, HeadCell, EnhancedTableToolbarProps } from 'types';

// table header options
const headCells: HeadCell[] = [
  {
    id: 'id',
    numeric: true,
    label: 'Item ID'
  },
  {
    id: 'name',
    numeric: false,
    label: 'Item Info'
  },
  {
    id: 'unit',
    numeric: true,
    label: 'Unit',
    align: 'right'
  },
  {
    id: 'quantity',
    numeric: true,
    label: 'Quantity',
    align: 'right'
  },
  {
    id: 'qty',
    numeric: true,
    label: 'Price',
    align: 'right'
  },
  {
    id: 'status',
    numeric: false,
    label: 'Status'
  },
  {
    id: 'action',
    numeric: false,
    label: 'Actions',
    align: 'center'
  }
];

// ==============================|| ITEM TABLE - HEADER TOOLBAR ||============================== //

function EnhancedTableToolbar({ numSelected }: EnhancedTableToolbarProps) {
  return (
    <Toolbar
      sx={{
        p: 0,
        pl: 1,
        pr: 1,
        ...(numSelected > 0 && {
          color: (theme) => theme.palette.secondary.main
        })
      }}
    >
      {numSelected > 0 ? (
        <Typography color="inherit" variant="h4">
          {numSelected} Selected
        </Typography>
      ) : (
        <Typography variant="h6" id="tableTitle">
          Nutrition
        </Typography>
      )}
      <Box sx={{ flexGrow: 1 }} />
    </Toolbar>
  );
}

// ==============================|| ITEM TABLE - HEADER ||============================== //

interface ItemTableHeaderProps {
  open: boolean;
  theme: Theme;
  selected: string[];
  onSelectAllClick: (event: React.ChangeEvent<HTMLInputElement>) => void;
  order: ArrangementOrder;
  orderBy: string;
  numSelected: number;
  rowCount: number;
  onRequestSort: (event: React.SyntheticEvent<Element, Event>, property: string) => void;
}

export default function ItemTableHeader({
  open,
  onSelectAllClick,
  order,
  orderBy,
  numSelected,
  rowCount,
  onRequestSort,
  selected
}: ItemTableHeaderProps) {
  const createSortHandler = (property: string) => (event: React.SyntheticEvent<Element, Event>) => {
    onRequestSort(event, property);
  };
  return (
    <TableHead>
      <TableRow>
        <TableCell padding="checkbox" sx={{ pl: 3, ...(open && { display: 'none' }) }}>
          <Checkbox
            color="primary"
            indeterminate={numSelected > 0 && numSelected < rowCount}
            checked={rowCount > 0 && numSelected === rowCount}
            onChange={onSelectAllClick}
            slotProps={{ input: { 'aria-label': 'select all desserts' } }}
          />
        </TableCell>
        {numSelected > 0 && (
          <TableCell padding="none" colSpan={12}>
            <EnhancedTableToolbar numSelected={selected.length} />
          </TableCell>
        )}
        {numSelected <= 0 &&
          headCells.map((headCell) => {
            const isActive = orderBy === headCell.id;
            return (
              <TableCell
                key={headCell.id}
                align={headCell.align}
                padding={headCell.disablePadding ? 'none' : 'normal'}
                sortDirection={isActive ? order : undefined}
                {...(open && { sx: { display: 'none' } })}
              >
                <TableSortLabel active={isActive} direction={isActive ? order : undefined} onClick={createSortHandler(headCell.id)}>
                  {headCell.label}
                  {isActive && (
                    <Box component="span" sx={visuallyHidden}>
                      {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                    </Box>
                  )}
                </TableSortLabel>
              </TableCell>
            );
          })}
      </TableRow>
    </TableHead>
  );
}
