import React, { useState } from 'react';
import { alpha, useTheme } from '@mui/material/styles';
import { format } from 'date-fns';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Toolbar,
  IconButton,
  Tooltip,
  FormControlLabel,
  Typography,
  Avatar,
  TextField,
  InputAdornment,
  Paper,
  Chip,
  Menu,
  MenuItem,
  Button,
  Divider,
  ListItemIcon
} from '@mui/material';
import { visuallyHidden } from '@mui/utils';
import CustomCheckbox from '../../../forms/theme-elements/CustomCheckbox';
import CustomSwitch from '../../../forms/theme-elements/CustomSwitch';
import {
  IconDotsVertical,
  IconFilter,
  IconSearch,
  IconTrash,
  IconEye,
  IconEdit,
  IconDownload,
  IconCertificate,
  IconFileExport,
  IconRefresh
} from '@tabler/icons-react';
import { 
  Church as ChurchIcon,
  Person as PersonIcon,
  Event as EventIcon,
  Assignment as RecordIcon
} from '@mui/icons-material';
import { useChurchRecords, ChurchRecord } from '../../../../context/ChurchRecordsContext';

function descendingComparator<T>(a: T, b: T, orderBy: keyof T) {
  if (b[orderBy] < a[orderBy]) {
    return -1;
  }
  if (b[orderBy] > a[orderBy]) {
    return 1;
  }
  return 0;
}

type Order = 'asc' | 'desc';

function getComparator<Key extends keyof any>(
  order: Order,
  orderBy: Key,
): (a: { [key in Key]: number | string }, b: { [key in Key]: number | string }) => number {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

function stableSort<T>(array: T[], comparator: (a: T, b: T) => number) {
  const stabilizedThis = array.map((el, index) => [el, index] as [T, number]);
  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) {
      return order;
    }
    return a[1] - b[1];
  });
  return stabilizedThis.map((el) => el[0]);
}

interface HeadCell {
  disablePadding: boolean;
  id: keyof ChurchRecord;
  label: string;
  numeric: boolean;
}

const headCells: readonly HeadCell[] = [
  {
    id: 'fullName',
    numeric: false,
    disablePadding: false,
    label: 'Record Details',
  },
  {
    id: 'type',
    numeric: false,
    disablePadding: false,
    label: 'Type',
  },
  {
    id: 'date',
    numeric: false,
    disablePadding: false,
    label: 'Date',
  },
  {
    id: 'parish',
    numeric: false,
    disablePadding: false,
    label: 'Parish',
  },
  {
    id: 'clergy',
    numeric: false,
    disablePadding: false,
    label: 'Clergy',
  },
  {
    id: 'status',
    numeric: false,
    disablePadding: false,
    label: 'Status',
  },
];

interface EnhancedTableProps {
  numSelected: number;
  onRequestSort: (event: React.MouseEvent<unknown>, property: keyof ChurchRecord) => void;
  onSelectAllClick: (event: React.ChangeEvent<HTMLInputElement>) => void;
  order: Order;
  orderBy: string;
  rowCount: number;
}

function EnhancedTableHead(props: EnhancedTableProps) {
  const { onSelectAllClick, order, orderBy, numSelected, rowCount, onRequestSort } = props;
  const createSortHandler = (property: keyof ChurchRecord) => (event: React.MouseEvent<unknown>) => {
    onRequestSort(event, property);
  };

  return (
    <TableHead>
      <TableRow>
        <TableCell padding="checkbox">
          <CustomCheckbox
            color="primary"
            checked={rowCount > 0 && numSelected === rowCount}
            onChange={onSelectAllClick}
            inputProps={{
              'aria-label': 'select all records',
            }}
          />
        </TableCell>
        {headCells.map((headCell) => (
          <TableCell
            key={headCell.id}
            align={headCell.numeric ? 'right' : 'left'}
            padding={headCell.disablePadding ? 'none' : 'normal'}
            sortDirection={orderBy === headCell.id ? order : false}
          >
            <TableSortLabel
              active={orderBy === headCell.id}
              direction={orderBy === headCell.id ? order : 'asc'}
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
        <TableCell>Actions</TableCell>
      </TableRow>
    </TableHead>
  );
}

interface EnhancedTableToolbarProps {
  numSelected: number;
  handleSearch: (event: React.ChangeEvent<HTMLInputElement>) => void;
  search: string;
  onRefresh: () => void;
  onExport: (format: 'pdf' | 'excel' | 'csv') => void;
  selectedRecords: string[];
}

const EnhancedTableToolbar = (props: EnhancedTableToolbarProps) => {
  const { numSelected, handleSearch, search, onRefresh, onExport, selectedRecords } = props;
  const [exportMenuAnchor, setExportMenuAnchor] = React.useState<null | HTMLElement>(null);

  const handleExportClick = (event: React.MouseEvent<HTMLElement>) => {
    setExportMenuAnchor(event.currentTarget);
  };

  const handleExportClose = () => {
    setExportMenuAnchor(null);
  };

  const handleExportFormat = (format: 'pdf' | 'excel' | 'csv') => {
    onExport(format);
    handleExportClose();
  };

  return (
    <Toolbar
      sx={{
        pl: { sm: 2 },
        pr: { xs: 1, sm: 1 },
        ...(numSelected > 0 && {
          bgcolor: (theme) =>
            alpha(theme.palette.primary.main, theme.palette.action.activatedOpacity),
        }),
      }}
    >
      {numSelected > 0 ? (
        <Typography sx={{ flex: '1 1 100%' }} color="inherit" variant="subtitle2" component="div">
          {numSelected} selected
        </Typography>
      ) : (
        <Box sx={{ flex: '1 1 100%' }}>
          <TextField
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <IconSearch size="1.1rem" />
                </InputAdornment>
              ),
            }}
            placeholder="Search records by name, number, parish..."
            size="small"
            onChange={handleSearch}
            value={search}
            sx={{ minWidth: 300 }}
          />
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 1 }}>
        {numSelected > 0 ? (
          <>
            <Tooltip title="Export Selected">
              <IconButton onClick={handleExportClick}>
                <IconFileExport size="1.2rem" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete Selected">
              <IconButton>
                <IconTrash size="1.2rem" />
              </IconButton>
            </Tooltip>
          </>
        ) : (
          <>
            <Tooltip title="Refresh Records">
              <IconButton onClick={onRefresh}>
                <IconRefresh size="1.2rem" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Filter Records">
              <IconButton>
                <IconFilter size="1.2rem" />
              </IconButton>
            </Tooltip>
          </>
        )}
      </Box>

      {/* Export Menu */}
      <Menu
        anchorEl={exportMenuAnchor}
        open={Boolean(exportMenuAnchor)}
        onClose={handleExportClose}
      >
        <MenuItem onClick={() => handleExportFormat('pdf')}>
          <ListItemIcon>
            <IconDownload size="1rem" />
          </ListItemIcon>
          Export as PDF
        </MenuItem>
        <MenuItem onClick={() => handleExportFormat('excel')}>
          <ListItemIcon>
            <IconDownload size="1rem" />
          </ListItemIcon>
          Export as Excel
        </MenuItem>
        <MenuItem onClick={() => handleExportFormat('csv')}>
          <ListItemIcon>
            <IconDownload size="1rem" />
          </ListItemIcon>
          Export as CSV
        </MenuItem>
      </Menu>
    </Toolbar>
  );
};

const ChurchRecordTableList: React.FC = () => {
  const {
    filteredRecords,
    filters,
    updateFilters,
    pagination,
    setPagination,
    loading,
    error,
    refreshRecords,
    exportRecords,
    generateCertificate
  } = useChurchRecords();

  const [order, setOrder] = React.useState<Order>('desc');
  const [orderBy, setOrderBy] = React.useState<keyof ChurchRecord>('date');
  const [selected, setSelected] = React.useState<readonly string[]>([]);
  const [dense, setDense] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [actionMenuAnchor, setActionMenuAnchor] = React.useState<{ [key: string]: HTMLElement | null }>({});

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const searchValue = event.target.value;
    setSearch(searchValue);
    updateFilters({ searchTerm: searchValue });
  };

  const handleRequestSort = (event: React.MouseEvent<unknown>, property: keyof ChurchRecord) => {
    const isAsc = orderBy === property && order === 'asc';
    const newOrder = isAsc ? 'desc' : 'asc';
    const newOrderBy = property;
    
    setOrder(newOrder);
    setOrderBy(newOrderBy);
    updateFilters({ 
      sortBy: newOrderBy as any,
      sortOrder: newOrder 
    });
  };

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelecteds = filteredRecords.map((record) => record.id);
      setSelected(newSelecteds);
      return;
    }
    setSelected([]);
  };

  const handleClick = (event: React.MouseEvent<unknown>, id: string) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected: readonly string[] = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1),
      );
    }

    setSelected(newSelected);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPagination({ page: newPage });
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPagination({
      rowsPerPage: parseInt(event.target.value, 10),
      page: 0
    });
  };

  const handleChangeDense = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDense(event.target.checked);
  };

  const handleActionMenuClick = (event: React.MouseEvent<HTMLElement>, recordId: string) => {
    setActionMenuAnchor(prev => ({ ...prev, [recordId]: event.currentTarget }));
  };

  const handleActionMenuClose = (recordId: string) => {
    setActionMenuAnchor(prev => ({ ...prev, [recordId]: null }));
  };

  const handleExport = (format: 'pdf' | 'excel' | 'csv') => {
    exportRecords(Array.from(selected), format);
  };

  const getRecordTypeIcon = (type: string) => {
    switch (type) {
      case 'baptism':
        return '👶';
      case 'marriage':
        return '💒';
      case 'funeral':
        return '⚱️';
      case 'membership':
        return '👥';
      case 'clergy':
        return '⛪';
      case 'donation':
        return '💰';
      default:
        return '📋';
    }
  };

  const getRecordTypeColor = (type: string) => {
    switch (type) {
      case 'baptism':
        return 'primary';
      case 'marriage':
        return 'secondary';
      case 'funeral':
        return 'default';
      case 'membership':
        return 'success';
      case 'clergy':
        return 'warning';
      case 'donation':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete':
        return 'success';
      case 'needs_review':
        return 'warning';
      case 'pending':
        return 'info';
      case 'archived':
        return 'default';
      default:
        return 'default';
    }
  };

  const isSelected = (id: string) => selected.indexOf(id) !== -1;
  const emptyRows = pagination.page > 0 ? Math.max(0, (1 + pagination.page) * pagination.rowsPerPage - filteredRecords.length) : 0;

  const theme = useTheme();
  const borderColor = theme.palette.divider;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography variant="h6">Loading church records...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Typography variant="h6" color="error" gutterBottom>
          Error loading records
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          {error}
        </Typography>
        <Button variant="contained" onClick={refreshRecords}>
          Try Again
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <EnhancedTableToolbar
        numSelected={selected.length}
        search={search}
        handleSearch={handleSearch}
        onRefresh={refreshRecords}
        onExport={handleExport}
        selectedRecords={Array.from(selected)}
      />
      <Paper variant="outlined" sx={{ mx: 2, mt: 1, border: `1px solid ${borderColor}` }}>
        <TableContainer>
          <Table
            sx={{ minWidth: 750 }}
            aria-labelledby="tableTitle"
            size={dense ? 'small' : 'medium'}
          >
            <EnhancedTableHead
              numSelected={selected.length}
              order={order}
              orderBy={orderBy}
              onSelectAllClick={handleSelectAllClick}
              onRequestSort={handleRequestSort}
              rowCount={filteredRecords.length}
            />
            <TableBody>
              {stableSort(filteredRecords, getComparator(order, orderBy))
                .slice(pagination.page * pagination.rowsPerPage, pagination.page * pagination.rowsPerPage + pagination.rowsPerPage)
                .map((record, index) => {
                  const isItemSelected = isSelected(record.id);
                  const labelId = `enhanced-table-checkbox-${index}`;

                  return (
                    <TableRow
                      hover
                      onClick={(event) => handleClick(event, record.id)}
                      role="checkbox"
                      aria-checked={isItemSelected}
                      tabIndex={-1}
                      key={record.id}
                      selected={isItemSelected}
                    >
                      <TableCell padding="checkbox">
                        <CustomCheckbox
                          color="primary"
                          checked={isItemSelected}
                          inputProps={{
                            'aria-labelledby': labelId,
                          }}
                        />
                      </TableCell>

                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <Avatar
                            sx={{ 
                              width: 48, 
                              height: 48, 
                              bgcolor: 'primary.light',
                              fontSize: '1.5rem'
                            }}
                          >
                            {getRecordTypeIcon(record.type)}
                          </Avatar>
                          <Box sx={{ ml: 2 }}>
                            <Typography variant="h6" fontWeight="600">
                              {record.fullName}
                            </Typography>
                            <Typography color="textSecondary" variant="subtitle2">
                              #{record.recordNumber}
                            </Typography>
                            {record.language && (
                              <Chip
                                label={record.language.toUpperCase()}
                                size="small"
                                sx={{ mt: 0.5, fontSize: '0.7rem', height: 18 }}
                              />
                            )}
                          </Box>
                        </Box>
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={record.type.charAt(0).toUpperCase() + record.type.slice(1)}
                          color={getRecordTypeColor(record.type) as any}
                          size="small"
                          icon={<RecordIcon sx={{ fontSize: '0.8rem' }} />}
                        />
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2">
                          {format(new Date(record.date), 'MMM dd, yyyy')}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {format(new Date(record.date), 'EEEE')}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <ChurchIcon sx={{ fontSize: '1rem', mr: 0.5, color: 'text.secondary' }} />
                          <Typography variant="body2">{record.parish}</Typography>
                        </Box>
                      </TableCell>

                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <PersonIcon sx={{ fontSize: '1rem', mr: 0.5, color: 'text.secondary' }} />
                          <Typography variant="body2">{record.clergy}</Typography>
                        </Box>
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={record.status.replace('_', ' ').toUpperCase()}
                          color={getStatusColor(record.status) as any}
                          size="small"
                          variant="outlined"
                        />
                        {record.metadata?.certificate?.issued && (
                          <Chip
                            label="CERTIFIED"
                            size="small"
                            sx={{ ml: 0.5, fontSize: '0.6rem', height: 18 }}
                            color="success"
                          />
                        )}
                      </TableCell>

                      <TableCell>
                        <Tooltip title="Actions">
                          <IconButton 
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleActionMenuClick(e, record.id);
                            }}
                          >
                            <IconDotsVertical size="1.1rem" />
                          </IconButton>
                        </Tooltip>
                        
                        {/* Action Menu */}
                        <Menu
                          anchorEl={actionMenuAnchor[record.id]}
                          open={Boolean(actionMenuAnchor[record.id])}
                          onClose={() => handleActionMenuClose(record.id)}
                        >
                          <MenuItem onClick={() => handleActionMenuClose(record.id)}>
                            <ListItemIcon>
                              <IconEye size="1rem" />
                            </ListItemIcon>
                            View Details
                          </MenuItem>
                          <MenuItem onClick={() => handleActionMenuClose(record.id)}>
                            <ListItemIcon>
                              <IconEdit size="1rem" />
                            </ListItemIcon>
                            Edit Record
                          </MenuItem>
                          <Divider />
                          <MenuItem 
                            onClick={() => {
                              generateCertificate(record.id);
                              handleActionMenuClose(record.id);
                            }}
                          >
                            <ListItemIcon>
                              <IconCertificate size="1rem" />
                            </ListItemIcon>
                            Generate Certificate
                          </MenuItem>
                          <MenuItem 
                            onClick={() => {
                              exportRecords([record.id], 'pdf');
                              handleActionMenuClose(record.id);
                            }}
                          >
                            <ListItemIcon>
                              <IconDownload size="1rem" />
                            </ListItemIcon>
                            Export Record
                          </MenuItem>
                        </Menu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              {emptyRows > 0 && (
                <TableRow style={{ height: (dense ? 33 : 53) * emptyRows }}>
                  <TableCell colSpan={8} />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={pagination.totalCount}
          rowsPerPage={pagination.rowsPerPage}
          page={pagination.page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
      <Box ml={2} mt={1}>
        <FormControlLabel
          control={<CustomSwitch checked={dense} onChange={handleChangeDense} />}
          label="Dense padding"
        />
      </Box>
    </Box>
  );
};

export default ChurchRecordTableList; 