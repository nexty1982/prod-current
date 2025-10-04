/**
 * Orthodox Metrics - Advanced Search Component
 * Powerful search with filters, sorting, and saved searches
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  FormGroup,
  Grid,
  Paper,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Tooltip,
  Divider,
  Chip,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Badge,
  Menu,
  MenuList,
  ListItemIcon,
  Autocomplete,
  DatePicker,
  TimePicker,
  DateTimePicker,
  LocalizationProvider,
  AdapterDateFns,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  Save as SaveIcon,
  Bookmark as BookmarkIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  History as HistoryIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
} from '@mui/icons-material';

// Import unified hooks
import {
  useUnifiedRecords,
  useSearchableFields,
  useSortableFields,
  getCurrentTemplate,
} from '../../../core';

// Import types
import { RecordData, RecordFilters, SearchQuery, SavedSearch, SearchFilter } from '../../../core/types/RecordsTypes';

interface AdvancedSearchProps {
  churchId: number;
  tableName: string;
  onSearchResults: (results: RecordData[], total: number) => void;
  onSearchChange: (filters: RecordFilters) => void;
  initialFilters?: RecordFilters;
  className?: string;
  style?: React.CSSProperties;
}

export function AdvancedSearch({
  churchId,
  tableName,
  onSearchResults,
  onSearchChange,
  initialFilters = {},
  className,
  style,
}: AdvancedSearchProps) {
  const [searchQuery, setSearchQuery] = useState<SearchQuery>({
    searchTerm: '',
    filters: initialFilters,
    sort: { field: 'id', direction: 'desc' },
    pagination: { page: 1, limit: 50 },
  });
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Get current template
  const currentTemplate = getCurrentTemplate();

  // Get searchable fields
  const {
    fields: searchableFields,
    loading: searchableFieldsLoading,
  } = useSearchableFields(churchId, tableName);

  // Get sortable fields
  const {
    fields: sortableFields,
    loading: sortableFieldsLoading,
  } = useSortableFields(churchId, tableName);

  // Get search results
  const {
    records,
    pagination,
    loading: searchLoading,
    error: searchError,
    refetch: refetchSearch,
  } = useUnifiedRecords({
    churchId,
    tableName,
    filters: searchQuery.filters,
    sort: searchQuery.sort,
    pagination: searchQuery.pagination,
    enabled: true,
  });

  // Update search results when data changes
  useEffect(() => {
    if (records) {
      onSearchResults(records, pagination?.total || 0);
    }
  }, [records, pagination, onSearchResults]);

  // Update search filters when query changes
  useEffect(() => {
    onSearchChange(searchQuery.filters);
  }, [searchQuery.filters, onSearchChange]);

  // Event handlers
  const handleSearchTermChange = useCallback((value: string) => {
    setSearchQuery(prev => ({
      ...prev,
      searchTerm: value,
      filters: {
        ...prev.filters,
        search: value,
      },
    }));
  }, []);

  const handleFilterChange = useCallback((field: string, value: any) => {
    setSearchQuery(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        [field]: value,
      },
    }));
  }, []);

  const handleSortChange = useCallback((field: string, direction: 'asc' | 'desc') => {
    setSearchQuery(prev => ({
      ...prev,
      sort: { field, direction },
    }));
  }, []);

  const handlePaginationChange = useCallback((page: number, limit: number) => {
    setSearchQuery(prev => ({
      ...prev,
      pagination: { page, limit },
    }));
  }, []);

  const handleSearch = useCallback(async () => {
    setIsSearching(true);
    try {
      await refetchSearch();
    } finally {
      setIsSearching(false);
    }
  }, [refetchSearch]);

  const handleClearFilters = useCallback(() => {
    setSearchQuery({
      searchTerm: '',
      filters: {},
      sort: { field: 'id', direction: 'desc' },
      pagination: { page: 1, limit: 50 },
    });
  }, []);

  const handleSaveSearch = useCallback(() => {
    if (!saveSearchName.trim()) return;

    const newSavedSearch: SavedSearch = {
      id: Date.now().toString(),
      name: saveSearchName,
      query: searchQuery,
      createdAt: new Date(),
      isStarred: false,
      isShared: false,
    };

    setSavedSearches(prev => [...prev, newSavedSearch]);
    setSaveSearchName('');
    setShowSaveDialog(false);
  }, [saveSearchName, searchQuery]);

  const handleLoadSavedSearch = useCallback((savedSearch: SavedSearch) => {
    setSearchQuery(savedSearch.query);
  }, []);

  const handleDeleteSavedSearch = useCallback((searchId: string) => {
    setSavedSearches(prev => prev.filter(s => s.id !== searchId));
  }, []);

  const handleToggleStar = useCallback((searchId: string) => {
    setSavedSearches(prev => prev.map(s => 
      s.id === searchId ? { ...s, isStarred: !s.isStarred } : s
    ));
  }, []);

  // Render search filters
  const renderSearchFilters = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Search Filters
      </Typography>
      
      <Grid container spacing={2}>
        {/* Search Term */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Search Term"
            value={searchQuery.searchTerm}
            onChange={(e) => handleSearchTermChange(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon />,
              endAdornment: searchQuery.searchTerm && (
                <IconButton
                  size="small"
                  onClick={() => handleSearchTermChange('')}
                >
                  <ClearIcon />
                </IconButton>
              ),
            }}
            placeholder="Search in all fields..."
          />
        </Grid>

        {/* Field-specific filters */}
        {searchableFields.map((field) => (
          <Grid item xs={12} sm={6} md={4} key={field.column_name}>
            {field.field_type === 'text' && (
              <TextField
                fullWidth
                label={field.display_name}
                value={searchQuery.filters[field.column_name] || ''}
                onChange={(e) => handleFilterChange(field.column_name, e.target.value)}
                placeholder={`Search in ${field.display_name}`}
              />
            )}

            {field.field_type === 'select' && (
              <FormControl fullWidth>
                <InputLabel>{field.display_name}</InputLabel>
                <Select
                  value={searchQuery.filters[field.column_name] || ''}
                  onChange={(e) => handleFilterChange(field.column_name, e.target.value)}
                  label={field.display_name}
                >
                  <MenuItem value="">All</MenuItem>
                  {field.options?.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {field.field_type === 'date' && (
              <DatePicker
                label={field.display_name}
                value={searchQuery.filters[field.column_name] ? new Date(searchQuery.filters[field.column_name]) : null}
                onChange={(date) => handleFilterChange(field.column_name, date?.toISOString())}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    label: field.display_name,
                  },
                }}
              />
            )}

            {field.field_type === 'number' && (
              <TextField
                fullWidth
                type="number"
                label={field.display_name}
                value={searchQuery.filters[field.column_name] || ''}
                onChange={(e) => handleFilterChange(field.column_name, e.target.value)}
                placeholder={`Filter by ${field.display_name}`}
              />
            )}

            {field.field_type === 'boolean' && (
              <FormControl fullWidth>
                <InputLabel>{field.display_name}</InputLabel>
                <Select
                  value={searchQuery.filters[field.column_name] || ''}
                  onChange={(e) => handleFilterChange(field.column_name, e.target.value)}
                  label={field.display_name}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="true">Yes</MenuItem>
                  <MenuItem value="false">No</MenuItem>
                </Select>
              </FormControl>
            )}
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  // Render sorting options
  const renderSortingOptions = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Sorting Options
      </Typography>
      
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={searchQuery.sort.field}
              onChange={(e) => handleSortChange(e.target.value, searchQuery.sort.direction)}
              label="Sort By"
            >
              {sortableFields.map((field) => (
                <MenuItem key={field.column_name} value={field.column_name}>
                  {field.display_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Direction</InputLabel>
            <Select
              value={searchQuery.sort.direction}
              onChange={(e) => handleSortChange(searchQuery.sort.field, e.target.value as 'asc' | 'desc')}
              label="Direction"
            >
              <MenuItem value="asc">Ascending</MenuItem>
              <MenuItem value="desc">Descending</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>
    </Box>
  );

  // Render saved searches
  const renderSavedSearches = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Saved Searches</Typography>
        <Button
          size="small"
          startIcon={<SaveIcon />}
          onClick={() => setShowSaveDialog(true)}
        >
          Save Current
        </Button>
      </Box>

      {savedSearches.length === 0 ? (
        <Alert severity="info">
          No saved searches yet. Save your current search to access it later.
        </Alert>
      ) : (
        <List>
          {savedSearches.map((savedSearch) => (
            <ListItem key={savedSearch.id}>
              <ListItemText
                primary={savedSearch.name}
                secondary={`Created ${savedSearch.createdAt.toLocaleDateString()}`}
              />
              <ListItemSecondaryAction>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <IconButton
                    size="small"
                    onClick={() => handleLoadSavedSearch(savedSearch)}
                  >
                    <SearchIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleToggleStar(savedSearch.id)}
                  >
                    {savedSearch.isStarred ? <StarIcon /> : <StarBorderIcon />}
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteSavedSearch(savedSearch.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );

  // Render search results summary
  const renderSearchResultsSummary = () => (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          Search Results
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip
            label={`${pagination?.total || 0} records found`}
            color="primary"
            size="small"
          />
          <Chip
            label={`Page ${searchQuery.pagination.page} of ${Math.ceil((pagination?.total || 0) / searchQuery.pagination.limit)}`}
            color="secondary"
            size="small"
          />
        </Box>
      </Box>
      
      {searchQuery.searchTerm && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Searching for: "{searchQuery.searchTerm}"
        </Typography>
      )}
    </Box>
  );

  // Render search actions
  const renderSearchActions = () => (
    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
      <Button
        variant="contained"
        startIcon={isSearching ? <CircularProgress size={16} /> : <SearchIcon />}
        onClick={handleSearch}
        disabled={isSearching}
      >
        {isSearching ? 'Searching...' : 'Search'}
      </Button>
      
      <Button
        variant="outlined"
        startIcon={<ClearIcon />}
        onClick={handleClearFilters}
      >
        Clear Filters
      </Button>
      
      <Button
        variant="outlined"
        startIcon={<FilterIcon />}
        onClick={() => setShowFilters(!showFilters)}
      >
        {showFilters ? 'Hide' : 'Show'} Filters
      </Button>
      
      <Button
        variant="outlined"
        startIcon={<SaveIcon />}
        onClick={() => setShowSaveDialog(true)}
      >
        Save Search
      </Button>
    </Box>
  );

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box className={className} style={style}>
        {/* Search Actions */}
        {renderSearchActions()}

        {/* Search Results Summary */}
        {renderSearchResultsSummary()}

        {/* Main Content */}
        <Grid container spacing={2}>
          {/* Search Filters */}
          <Grid item xs={12} md={showFilters ? 8 : 12}>
            {showFilters && (
              <Paper sx={{ p: 2, mb: 2 }}>
                <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)}>
                  <Tab label="Filters" />
                  <Tab label="Sorting" />
                  <Tab label="Saved Searches" />
                </Tabs>

                <Box sx={{ mt: 2 }}>
                  {activeTab === 0 && renderSearchFilters()}
                  {activeTab === 1 && renderSortingOptions()}
                  {activeTab === 2 && renderSavedSearches()}
                </Box>
              </Paper>
            )}

            {/* Search Results */}
            {searchLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : searchError ? (
              <Alert severity="error">
                Search error: {searchError}
              </Alert>
            ) : records && records.length > 0 ? (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {records.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{record.id}</TableCell>
                        <TableCell>
                          {record.name || record.title || record.first_name || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {record.created_at ? new Date(record.created_at).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <IconButton size="small">
                            <EditIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="info">
                No records found. Try adjusting your search criteria.
              </Alert>
            )}
          </Grid>

          {/* Quick Filters Sidebar */}
          {showFilters && (
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Quick Filters
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText primary="Recent Records" />
                    <Checkbox />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Today" />
                    <Checkbox />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="This Week" />
                    <Checkbox />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="This Month" />
                    <Checkbox />
                  </ListItem>
                </List>
              </Paper>
            </Grid>
          )}
        </Grid>

        {/* Save Search Dialog */}
        <Dialog open={showSaveDialog} onClose={() => setShowSaveDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Save Search</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Search Name"
              value={saveSearchName}
              onChange={(e) => setSaveSearchName(e.target.value)}
              placeholder="Enter a name for this search"
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowSaveDialog(false)}>Cancel</Button>
            <Button
              onClick={handleSaveSearch}
              variant="contained"
              disabled={!saveSearchName.trim()}
            >
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
}

export default AdvancedSearch;
