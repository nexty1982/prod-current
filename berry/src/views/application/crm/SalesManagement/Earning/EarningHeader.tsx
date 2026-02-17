import React from 'react';

// material-ui
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import visuallyHidden from '@mui/utils/visuallyHidden';
import Box from '@mui/material/Box';

// types
import { ArrangementOrder, HeadCell } from 'types';

// table header options
const headCells: HeadCell[] = [
  {
    id: 'date',
    numeric: false,
    label: ' Date'
  },
  {
    id: 'name',
    numeric: false,
    label: 'Receiver'
  },
  {
    id: 'phone no',
    numeric: false,
    label: 'Phone no'
  },
  {
    id: 'detail',
    numeric: false,
    label: 'Detail'
  },
  {
    id: 'price',
    numeric: true,
    label: 'Price',
    align: 'right'
  },
  {
    id: 'amount',
    numeric: true,
    label: 'Total Amount',
    align: 'right'
  }
];

interface RefundTableHeaderProps {
  order: ArrangementOrder;
  orderBy: string;
  onRequestSort: (event: React.SyntheticEvent<Element, Event>, property: string) => void;
}

// ==============================|| EARNING TABLE - HEADER ||============================== //

export default function EarningTableHeader({ order, orderBy, onRequestSort }: RefundTableHeaderProps) {
  const createSortHandler = (property: string) => (event: React.SyntheticEvent<Element, Event>) => {
    onRequestSort(event, property);
  };

  return (
    <TableHead>
      <TableRow>
        {headCells.map((headCell, index) => (
          <TableCell
            sx={{ '&:last-of-type': { pr: 3 }, '&:first-of-type': { pl: 3 } }}
            key={index}
            align={headCell.align}
            padding={headCell.disablePadding ? 'none' : 'normal'}
            sortDirection={orderBy === headCell.id ? order : undefined}
          >
            <TableSortLabel
              active={orderBy === headCell.id}
              direction={orderBy === headCell.id ? order : undefined}
              onClick={createSortHandler(headCell.id)}
            >
              {headCell.label}
              {orderBy === headCell.id ? (
                <Box component="span" sx={visuallyHidden}>
                  {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                </Box>
              ) : null}
            </TableSortLabel>
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
}
