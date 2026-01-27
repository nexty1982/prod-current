/**
 * OM-Library - Advanced Documentation Library System
 * 
 * Refactored from OM-Spec to include:
 * - Advanced search (filename + content)
 * - Relationship mapping
 * - Category organization
 * - Librarian status monitoring
 * - Safe loading when librarian is offline
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Typography,
  IconButton,
  Button,
  Alert,
  Card,
  CardContent,
  useTheme,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Badge,
  Tooltip,
  ToggleButtonGroup,
  ToggleButton,
  LinearProgress,
  Link,
} from '@mui/material';
import {
  IconFile,
  IconSearch,
  IconFilter,
  IconDownload,
  IconLayoutGrid,
  IconTable,
  IconRefresh,
  IconRobot,
  IconFileText,
  IconCode,
  IconFileSpreadsheet,
  IconLink,
} from '@tabler/icons-react';
import { styled } from '@mui/material/styles';

const LibraryContainer = styled(Container)(({ theme }) => ({
  paddingTop: theme.spacing(4),
  paddingBottom: theme.spacing(4),
  minHeight: '100vh',
}));

const FileGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: theme.spacing(2),
  marginTop: theme.spacing(3),
}));

const FileCard = styled(Card)(({ theme }) => ({
  cursor: 'pointer',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  '&:hover': {
    transform: 'scale(1.02)',
    boxShadow: theme.shadows[8],
  },
}));

interface LibraryFile {
  id: string;
  filename: string;
  title: string;
  category: 'technical' | 'ops' | 'recovery';
  size: number;
  created: string;
  modified: string;
  sourceFolder: string;
  relatedFiles: string[];
  keywords: string[];
  firstParagraph: string;
  libraryPath: string;
}

interface LibrarianStatus {
  running: boolean;
  status?: string;
  uptime?: number;
  totalFiles?: number;
  lastIndexUpdate?: string;
}

interface SearchResult extends LibraryFile {
  matchType?: 'filename' | 'content';
  snippet?: string;
  score?: number;
}

const OMLibrary: React.FC = () => {
  const theme = useTheme();
  
  // State
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<LibraryFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'filename' | 'content'>('filename');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  
  // Filters
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'technical' | 'ops' | 'recovery'>('all');
  const [relatedGroupFilter, setRelatedGroupFilter] = useState<string | null>(null);
  
  // View
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  
  // Librarian status
  const [librarianStatus, setLibrarianStatus] = useState<LibrarianStatus>({ running: false });
  const [statusLoading, setStatusLoading] = useState(false);

  /**
   * Load librarian status
   */
  const loadLibrarianStatus = async () => {
    setStatusLoading(true);
    try {
      const response = await fetch('/api/library/status', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setLibrarianStatus(data);
      }
    } catch (err) {
      console.warn('Could not load librarian status:', err);
      setLibrarianStatus({ running: false });
    } finally {
      setStatusLoading(false);
    }
  };

  /**
   * Load library files
   */
  const loadFiles = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') {
        params.append('category', categoryFilter);
      }
      
      const response = await fetch(`/api/library/files?${params.toString()}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to load library files');
      }
      
      const data = await response.json();
      setFiles(data.files || []);
      setFilteredFiles(data.files || []);
    } catch (err: any) {
      console.error('Error loading library:', err);
      setError(err.message || 'Failed to load library');
      // Safe loading - show empty state instead of crashing
      setFiles([]);
      setFilteredFiles([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Search library
   */
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setFilteredFiles(files);
      return;
    }
    
    setSearching(true);
    
    try {
      const params = new URLSearchParams();
      params.append('q', searchQuery);
      params.append('mode', searchMode);
      if (categoryFilter !== 'all') {
        params.append('category', categoryFilter);
      }
      
      const response = await fetch(`/api/library/search?${params.toString()}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Search failed');
      }
      
      const data = await response.json();
      setSearchResults(data.results || []);
      setFilteredFiles(data.results || []);
    } catch (err) {
      console.error('Search error:', err);
      setError('Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  /**
   * Filter by related group
   */
  const filterByRelatedGroup = (file: LibraryFile) => {
    setRelatedGroupFilter(file.id);
    
    // Show only files related to this one
    const related = files.filter(f => 
      f.id === file.id || 
      file.relatedFiles.includes(f.id) ||
      f.relatedFiles.includes(file.id)
    );
    
    setFilteredFiles(related);
  };

  /**
   * Clear related group filter
   */
  const clearRelatedGroupFilter = () => {
    setRelatedGroupFilter(null);
    setFilteredFiles(files);
  };

  /**
   * Download file
   */
  const handleDownload = (file: LibraryFile) => {
    window.open(`/api/library/download/${encodeURIComponent(file.id)}`, '_blank');
  };

  /**
   * Get file icon based on type
   */
  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    
    switch (ext) {
      case 'md':
      case 'txt':
        return <IconFileText size={20} />;
      case 'docx':
        return <IconFileText size={20} />;
      case 'xlsx':
        return <IconFileSpreadsheet size={20} />;
      case 'ts':
      case 'tsx':
      case 'js':
      case 'json':
        return <IconCode size={20} />;
      default:
        return <IconFile size={20} />;
    }
  };

  /**
   * Get category color
   */
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'technical':
        return 'primary';
      case 'ops':
        return 'success';
      case 'recovery':
        return 'warning';
      default:
        return 'default';
    }
  };

  /**
   * Format file size
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  /**
   * Format date
   */
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Load on mount
  useEffect(() => {
    loadLibrarianStatus();
    loadFiles();
    
    // Refresh status every 30 seconds
    const interval = setInterval(loadLibrarianStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Reload when category filter changes
  useEffect(() => {
    if (!searchQuery) {
      loadFiles();
    }
  }, [categoryFilter]);

  return (
    <LibraryContainer maxWidth="xl">
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h3" component="h1" sx={{ flex: 1 }}>
            📚 OM-Library
          </Typography>
          
          {/* Librarian Status Badge */}
          <Tooltip title={librarianStatus.running ? 
            `Librarian Online - ${librarianStatus.totalFiles || 0} files indexed` : 
            'Librarian Offline'
          }>
            <Badge
              badgeContent={librarianStatus.totalFiles || 0}
              color={librarianStatus.running ? 'success' : 'error'}
              max={9999}
            >
              <Chip
                icon={statusLoading ? <CircularProgress size={16} /> : <IconRobot size={18} />}
                label={librarianStatus.running ? 'Librarian Online' : 'Librarian Offline'}
                color={librarianStatus.running ? 'success' : 'default'}
                size="small"
              />
            </Badge>
          </Tooltip>
          
          <IconButton onClick={loadLibrarianStatus} title="Refresh status">
            <IconRefresh size={20} />
          </IconButton>
        </Stack>
        
        <Typography variant="body2" color="text.secondary">
          Searchable, relationship-aware documentation library
        </Typography>
      </Box>

      {/* Search and Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack spacing={2}>
          {/* Search Bar */}
          <Stack direction="row" spacing={2}>
            <ToggleButtonGroup
              value={searchMode}
              exclusive
              onChange={(e, value) => value && setSearchMode(value)}
              size="small"
            >
              <ToggleButton value="filename">
                Filenames
              </ToggleButton>
              <ToggleButton value="content">
                Contents
              </ToggleButton>
            </ToggleButtonGroup>
            
            <TextField
              fullWidth
              placeholder={`Search ${searchMode === 'filename' ? 'filenames' : 'file contents'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              InputProps={{
                startAdornment: <IconSearch size={20} style={{ marginRight: 8 }} />,
              }}
            />
            
            <Button
              variant="contained"
              onClick={handleSearch}
              disabled={searching || !searchQuery.trim()}
            >
              {searching ? <CircularProgress size={20} /> : 'Search'}
            </Button>
            
            {searchQuery && (
              <Button
                variant="outlined"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setFilteredFiles(files);
                }}
              >
                Clear
              </Button>
            )}
          </Stack>
          
          {/* Filters */}
          <Stack direction="row" spacing={2} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Category</InputLabel>
              <Select
                value={categoryFilter}
                label="Category"
                onChange={(e) => setCategoryFilter(e.target.value as any)}
              >
                <MenuItem value="all">All Categories</MenuItem>
                <MenuItem value="technical">Technical</MenuItem>
                <MenuItem value="ops">Operations</MenuItem>
                <MenuItem value="recovery">Recovery</MenuItem>
              </Select>
            </FormControl>
            
            {relatedGroupFilter && (
              <Chip
                icon={<IconLink size={16} />}
                label="Showing Related Group"
                onDelete={clearRelatedGroupFilter}
                color="primary"
              />
            )}
            
            <Box sx={{ flex: 1 }} />
            
            {/* View Mode Toggle */}
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(e, value) => value && setViewMode(value)}
              size="small"
            >
              <ToggleButton value="table">
                <IconTable size={18} />
              </ToggleButton>
              <ToggleButton value="grid">
                <IconLayoutGrid size={18} />
              </ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        </Stack>
      </Paper>

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error State (Safe Loading) */}
      {error && !loading && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {error}
          {!librarianStatus.running && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption">
                The OM-Librarian agent may be offline. Library features will be limited.
              </Typography>
            </Box>
          )}
        </Alert>
      )}

      {/* Empty State */}
      {!loading && !error && filteredFiles.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <IconFile size={64} style={{ opacity: 0.3, marginBottom: 16 }} />
          <Typography variant="h6" color="text.secondary">
            {searchQuery ? 'No files found matching your search' : 'No files in library yet'}
          </Typography>
          {!librarianStatus.running && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Start the OM-Librarian agent to begin indexing documentation files
            </Typography>
          )}
        </Box>
      )}

      {/* Table View */}
      {!loading && viewMode === 'table' && filteredFiles.length > 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Title</strong></TableCell>
                <TableCell><strong>Category</strong></TableCell>
                <TableCell><strong>Source</strong></TableCell>
                <TableCell><strong>Related</strong></TableCell>
                <TableCell><strong>Size</strong></TableCell>
                <TableCell><strong>Modified</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredFiles.map((file) => (
                <TableRow key={file.id} hover>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {getFileIcon(file.filename)}
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {file.title}
                        </Typography>
                        {file.firstParagraph && (
                          <Typography variant="caption" color="text.secondary">
                            {file.firstParagraph.substring(0, 80)}...
                          </Typography>
                        )}
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={file.category}
                      color={getCategoryColor(file.category) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">{file.sourceFolder}</Typography>
                  </TableCell>
                  <TableCell>
                    {file.relatedFiles.length > 0 && (
                      <Chip
                        icon={<IconLink size={14} />}
                        label={`${file.relatedFiles.length} related`}
                        size="small"
                        onClick={() => filterByRelatedGroup(file)}
                        sx={{ cursor: 'pointer' }}
                      />
                    )}
                  </TableCell>
                  <TableCell>{formatFileSize(file.size)}</TableCell>
                  <TableCell>{formatDate(file.modified)}</TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleDownload(file)}
                      color="primary"
                    >
                      <IconDownload size={18} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Grid View */}
      {!loading && viewMode === 'grid' && filteredFiles.length > 0 && (
        <FileGrid>
          {filteredFiles.map((file) => (
            <FileCard key={file.id}>
              <CardContent>
                <Stack spacing={1}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {getFileIcon(file.filename)}
                    <Typography variant="h6" noWrap sx={{ flex: 1 }}>
                      {file.title}
                    </Typography>
                  </Stack>
                  
                  <Chip
                    label={file.category}
                    color={getCategoryColor(file.category) as any}
                    size="small"
                    sx={{ width: 'fit-content' }}
                  />
                  
                  <Typography variant="body2" color="text.secondary" sx={{ minHeight: 40 }}>
                    {file.firstParagraph}
                  </Typography>
                  
                  <Divider />
                  
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="caption" color="text.secondary">
                      {formatFileSize(file.size)}
                    </Typography>
                    <Box sx={{ flex: 1 }} />
                    {file.relatedFiles.length > 0 && (
                      <Chip
                        icon={<IconLink size={12} />}
                        label={file.relatedFiles.length}
                        size="small"
                        onClick={() => filterByRelatedGroup(file)}
                      />
                    )}
                    <IconButton
                      size="small"
                      onClick={() => handleDownload(file)}
                      color="primary"
                    >
                      <IconDownload size={18} />
                    </IconButton>
                  </Stack>
                </Stack>
              </CardContent>
            </FileCard>
          ))}
        </FileGrid>
      )}

      {/* Stats Footer */}
      {!loading && filteredFiles.length > 0 && (
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Showing {filteredFiles.length} of {files.length} files
            {librarianStatus.lastIndexUpdate && (
              <> · Last indexed: {formatDate(librarianStatus.lastIndexUpdate)}</>
            )}
          </Typography>
        </Box>
      )}
    </LibraryContainer>
  );
};

export default OMLibrary;
