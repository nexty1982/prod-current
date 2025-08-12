/**
 * Orthodox Metrics - Themed Table Component
 * Interactive table with real-time theming and element selection
 */

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Chip,
  Box,
  useTheme
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { TableTheme } from '../store/useTableStyleStore';

interface ThemedTableProps {
  data: Array<{
    id: string;
    childName: string;
    parentNames: string;
    baptismDate: string;
    priest: string;
    godparents: string;
    parish: string;
  }>;
  theme: TableTheme;
  selectedElement: string;
  onElementSelect: (element: string) => void;
}

// Styled components for the table
const StyledTableContainer = styled(TableContainer)<{ tableTheme: TableTheme }>(
  ({ tableTheme }) => ({
    borderRadius: tableTheme.borderRadius,
    boxShadow: tableTheme.shadowStyle,
    border: `${tableTheme.borderWidth}px solid ${tableTheme.borderColor}`,
    overflow: 'hidden'
  })
);

const StyledTable = styled(Table)<{ tableTheme: TableTheme }>(
  ({ tableTheme }) => ({
    fontFamily: tableTheme.fontFamily,
    fontSize: tableTheme.fontSize
  })
);

const StyledTableHead = styled(TableHead)<{ 
  tableTheme: TableTheme; 
  selected: boolean 
}>(({ tableTheme, selected }) => ({
  backgroundColor: tableTheme.headerColor,
  position: 'relative',
  '&::after': selected ? {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    border: '3px solid #ff9800',
    borderRadius: tableTheme.borderRadius,
    pointerEvents: 'none',
    zIndex: 1
  } : {}
}));

const StyledHeaderCell = styled(TableCell)<{ 
  tableTheme: TableTheme; 
  selected: boolean 
}>(({ tableTheme, selected }) => ({
  color: tableTheme.headerTextColor,
  fontWeight: 600,
  fontSize: tableTheme.fontSize,
  cursor: 'pointer',
  position: 'relative',
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.1)'
  },
  '&::after': selected ? {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    border: '2px solid #ff9800',
    pointerEvents: 'none',
    zIndex: 1
  } : {}
}));

const StyledTableRow = styled(TableRow)<{ 
  tableTheme: TableTheme; 
  selected: boolean;
  isEven: boolean;
}>(({ tableTheme, selected, isEven }) => ({
  backgroundColor: isEven ? tableTheme.rowAlternateColor : tableTheme.rowColor,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  position: 'relative',
  '&:hover': {
    backgroundColor: tableTheme.hoverColor
  },
  '&::after': selected ? {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    border: '2px solid #ff9800',
    pointerEvents: 'none',
    zIndex: 1
  } : {}
}));

const StyledTableCell = styled(TableCell)<{ 
  tableTheme: TableTheme; 
  selected: boolean 
}>(({ tableTheme, selected }) => ({
  color: tableTheme.cellTextColor,
  fontSize: tableTheme.fontSize,
  cursor: 'pointer',
  position: 'relative',
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: 'rgba(255, 193, 7, 0.1)'
  },
  '&::after': selected ? {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    border: '2px solid #ff9800',
    pointerEvents: 'none',
    zIndex: 1
  } : {}
}));

export const ThemedTable: React.FC<ThemedTableProps> = ({
  data,
  theme: tableTheme,
  selectedElement,
  onElementSelect
}) => {
  const muiTheme = useTheme();

  const handleHeaderClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    onElementSelect('header');
  };

  const handleRowClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    onElementSelect('row');
  };

  const handleCellClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    onElementSelect('cell');
  };

  return (
    <Box>
      {/* Selection Indicator */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Click elements to select:
        </Typography>
        <Chip
          label="Header"
          size="small"
          color={selectedElement === 'header' ? 'warning' : 'default'}
          variant={selectedElement === 'header' ? 'filled' : 'outlined'}
        />
        <Chip
          label="Row"
          size="small"
          color={selectedElement === 'row' ? 'warning' : 'default'}
          variant={selectedElement === 'row' ? 'filled' : 'outlined'}
        />
        <Chip
          label="Cell"
          size="small"
          color={selectedElement === 'cell' ? 'warning' : 'default'}
          variant={selectedElement === 'cell' ? 'filled' : 'outlined'}
        />
      </Box>

      <StyledTableContainer component={Paper} tableTheme={tableTheme}>
        <StyledTable tableTheme={tableTheme}>
          <StyledTableHead 
            tableTheme={tableTheme} 
            selected={selectedElement === 'header'}
            onClick={handleHeaderClick}
          >
            <TableRow>
              <StyledHeaderCell 
                tableTheme={tableTheme} 
                selected={selectedElement === 'header'}
              >
                Child Name
              </StyledHeaderCell>
              <StyledHeaderCell 
                tableTheme={tableTheme} 
                selected={selectedElement === 'header'}
              >
                Parents
              </StyledHeaderCell>
              <StyledHeaderCell 
                tableTheme={tableTheme} 
                selected={selectedElement === 'header'}
              >
                Baptism Date
              </StyledHeaderCell>
              <StyledHeaderCell 
                tableTheme={tableTheme} 
                selected={selectedElement === 'header'}
              >
                Priest
              </StyledHeaderCell>
              <StyledHeaderCell 
                tableTheme={tableTheme} 
                selected={selectedElement === 'header'}
              >
                Godparents
              </StyledHeaderCell>
              <StyledHeaderCell 
                tableTheme={tableTheme} 
                selected={selectedElement === 'header'}
              >
                Parish
              </StyledHeaderCell>
            </TableRow>
          </StyledTableHead>
          <TableBody>
            {data.map((record, index) => (
              <StyledTableRow
                key={record.id}
                tableTheme={tableTheme}
                selected={selectedElement === 'row'}
                isEven={index % 2 === 0}
                onClick={handleRowClick}
              >
                <StyledTableCell
                  tableTheme={tableTheme}
                  selected={selectedElement === 'cell'}
                  onClick={handleCellClick}
                >
                  <Typography variant="body2" fontWeight={500}>
                    {record.childName}
                  </Typography>
                </StyledTableCell>
                <StyledTableCell
                  tableTheme={tableTheme}
                  selected={selectedElement === 'cell'}
                  onClick={handleCellClick}
                >
                  {record.parentNames}
                </StyledTableCell>
                <StyledTableCell
                  tableTheme={tableTheme}
                  selected={selectedElement === 'cell'}
                  onClick={handleCellClick}
                >
                  {new Date(record.baptismDate).toLocaleDateString()}
                </StyledTableCell>
                <StyledTableCell
                  tableTheme={tableTheme}
                  selected={selectedElement === 'cell'}
                  onClick={handleCellClick}
                >
                  {record.priest}
                </StyledTableCell>
                <StyledTableCell
                  tableTheme={tableTheme}
                  selected={selectedElement === 'cell'}
                  onClick={handleCellClick}
                >
                  {record.godparents}
                </StyledTableCell>
                <StyledTableCell
                  tableTheme={tableTheme}
                  selected={selectedElement === 'cell'}
                  onClick={handleCellClick}
                >
                  {record.parish}
                </StyledTableCell>
              </StyledTableRow>
            ))}
          </TableBody>
        </StyledTable>
      </StyledTableContainer>

      {/* Theme Preview Info */}
      <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Current Theme: Header ({tableTheme.headerColor}), 
          Cell ({tableTheme.cellColor}), 
          Border ({tableTheme.borderColor}, {tableTheme.borderWidth}px, {tableTheme.borderRadius}px radius)
        </Typography>
      </Box>
    </Box>
  );
};
