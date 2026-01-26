/**
 * Tree Inspector Component
 * Development tool for inspecting tree item IDs and paths to diagnose conflicts
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Collapse,
  TextField,
  Alert,
  Divider,
} from '@mui/material';
import {
  IconTree,
  IconRefresh,
  IconChevronDown,
  IconChevronRight,
  IconSearch,
  IconAlertTriangle,
  IconCopy,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { routerMenuStudioAPI } from '../router-menu-studio/api';
import { normalizeTreeItems, validateTreeItems } from '../router-menu-studio/normalizeTreeItems';
import { toast } from 'react-toastify';

interface TreeItem {
  id: string | number;
  label?: string;
  key_name?: string;
  path?: string;
  computedId?: string;
  computedPath?: string;
  level: number;
  children?: TreeItem[];
  originalId?: string | number;
  hasConflict?: boolean;
}

const TreeInspector: React.FC = () => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  
  // Fetch menu tree data
  const { data: menuTree = [], isLoading, error, refetch } = useQuery({
    queryKey: ['menu-tree-inspector'],
    queryFn: () => routerMenuStudioAPI.getMenuTree(),
  });

  // Process tree items to extract inspection data
  const inspectionData = useMemo(() => {
    if (!menuTree?.length) return { items: [], conflicts: [], stats: {} };

    // First, normalize the tree to get computed IDs
    const normalizedTree = normalizeTreeItems(menuTree);
    
    // Flatten tree into inspection items
    const flattenTree = (items: any[], level = 0, parentPath = ''): TreeItem[] => {
      const result: TreeItem[] = [];
      
      items.forEach((item, index) => {
        const computedPath = parentPath ? `${parentPath}[${index}]` : `root[${index}]`;
        const inspectionItem: TreeItem = {
          id: item.id,
          originalId: menuTree.find(orig => orig.id === item.id)?.id,
          label: item.label,
          key_name: item.key_name,
          path: item.path,
          computedId: String(item.id),
          computedPath,
          level,
          children: item.children ? flattenTree(item.children, level + 1, computedPath) : undefined,
        };
        
        result.push(inspectionItem);
        
        if (item.children?.length) {
          result.push(...flattenTree(item.children, level + 1, computedPath));
        }
      });
      
      return result;
    };

    const allItems = flattenTree(normalizedTree);
    
    // Find conflicts (duplicate computed IDs)
    const idCounts = new Map<string, number>();
    allItems.forEach(item => {
      const count = idCounts.get(item.computedId!) || 0;
      idCounts.set(item.computedId!, count + 1);
    });
    
    const conflicts = Array.from(idCounts.entries())
      .filter(([, count]) => count > 1)
      .map(([id]) => id);
    
    // Mark conflicted items
    allItems.forEach(item => {
      item.hasConflict = conflicts.includes(item.computedId!);
    });
    
    // Calculate stats
    const stats = {
      totalItems: allItems.length,
      conflicts: conflicts.length,
      maxDepth: Math.max(...allItems.map(item => item.level), 0),
      itemsWithPaths: allItems.filter(item => item.path).length,
      itemsWithKeys: allItems.filter(item => item.key_name).length,
    };

    return { items: allItems, conflicts, stats };
  }, [menuTree]);

  // Filter items based on search term
  const filteredItems = useMemo(() => {
    if (!searchTerm) return inspectionData.items;
    
    const term = searchTerm.toLowerCase();
    return inspectionData.items.filter(item =>
      item.label?.toLowerCase().includes(term) ||
      item.key_name?.toLowerCase().includes(term) ||
      item.path?.toLowerCase().includes(term) ||
      item.computedId?.toLowerCase().includes(term) ||
      item.computedPath?.toLowerCase().includes(term)
    );
  }, [inspectionData.items, searchTerm]);

  const toggleRowExpansion = (itemId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedRows(newExpanded);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Copied to clipboard');
    });
  };

  const renderItemRow = (item: TreeItem) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedRows.has(item.computedId!);
    const indentLevel = item.level * 20;

    return (
      <React.Fragment key={item.computedId}>
        <TableRow 
          sx={{ 
            backgroundColor: item.hasConflict ? 'error.light' : 'transparent',
            '&:hover': { backgroundColor: 'action.hover' }
          }}
        >
          <TableCell sx={{ pl: `${12 + indentLevel}px` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {hasChildren ? (
                <IconButton
                  size="small"
                  onClick={() => toggleRowExpansion(item.computedId!)}
                >
                  {isExpanded ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                </IconButton>
              ) : (
                <Box sx={{ width: 32 }} />
              )}
              
              <Typography variant="body2" fontWeight="medium">
                {item.label || '(no label)'}
              </Typography>
              
              {item.hasConflict && (
                <Chip 
                  label="CONFLICT" 
                  size="small" 
                  color="error" 
                  variant="outlined"
                  icon={<IconAlertTriangle size={12} />}
                />
              )}
            </Box>
          </TableCell>
          
          <TableCell>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" fontFamily="monospace">
                {item.computedId}
              </Typography>
              <IconButton 
                size="small" 
                onClick={() => copyToClipboard(item.computedId!)}
              >
                <IconCopy size={12} />
              </IconButton>
            </Box>
          </TableCell>
          
          <TableCell>
            <Typography variant="caption" color="text.secondary">
              {item.computedPath}
            </Typography>
          </TableCell>
          
          <TableCell>
            <Typography variant="caption" fontFamily="monospace">
              {item.key_name || '-'}
            </Typography>
          </TableCell>
          
          <TableCell>
            <Typography variant="caption" fontFamily="monospace">
              {item.path || '-'}
            </Typography>
          </TableCell>
          
          <TableCell>
            <Typography variant="caption">
              {item.originalId}
            </Typography>
          </TableCell>
        </TableRow>
        
        {hasChildren && isExpanded && (
          <TableRow>
            <TableCell colSpan={6} sx={{ p: 0, border: 'none' }}>
              <Collapse in={isExpanded}>
                <Box sx={{ p: 1 }}>
                  {/* Child items will be rendered by the main loop */}
                </Box>
              </Collapse>
            </TableCell>
          </TableRow>
        )}
      </React.Fragment>
    );
  };

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load menu tree data: {(error as Error).message}
        </Alert>
        <Button onClick={() => refetch()} startIcon={<IconRefresh size={16} />}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <IconTree size={24} />
        <Typography variant="h5">Tree Inspector</Typography>
        <Button
          startIcon={<IconRefresh size={16} />}
          onClick={() => refetch()}
          variant="outlined"
          size="small"
        >
          Refresh
        </Button>
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Development tool for inspecting tree item IDs and paths to diagnose conflicts.
        This panel shows the computed IDs that will be used by the TreeView component.
      </Typography>

      {/* Stats Panel */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Statistics
        </Typography>
        <Stack direction="row" spacing={3}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Total Items
            </Typography>
            <Typography variant="h6">
              {inspectionData.stats.totalItems}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              ID Conflicts
            </Typography>
            <Typography variant="h6" color={inspectionData.stats.conflicts > 0 ? 'error.main' : 'success.main'}>
              {inspectionData.stats.conflicts}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Max Depth
            </Typography>
            <Typography variant="h6">
              {inspectionData.stats.maxDepth}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Items with Paths
            </Typography>
            <Typography variant="h6">
              {inspectionData.stats.itemsWithPaths}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Items with Keys
            </Typography>
            <Typography variant="h6">
              {inspectionData.stats.itemsWithKeys}
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* Conflicts Alert */}
      {inspectionData.conflicts.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            ID Conflicts Detected
          </Typography>
          <Typography variant="body2">
            The following computed IDs appear multiple times: {inspectionData.conflicts.join(', ')}
          </Typography>
        </Alert>
      )}

      {/* Search */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search by label, key, path, or computed ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <IconSearch size={16} style={{ marginRight: 8, color: '#666' }} />,
          }}
        />
      </Box>

      {/* Tree Table */}
      <TableContainer component={Paper} variant="outlined">
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Label</TableCell>
              <TableCell>Computed ID</TableCell>
              <TableCell>Path</TableCell>
              <TableCell>Key Name</TableCell>
              <TableCell>Target Path</TableCell>
              <TableCell>Original ID</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography>Loading tree data...</Typography>
                </TableCell>
              </TableRow>
            ) : filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    {searchTerm ? 'No items match your search' : 'No tree items found'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map(renderItemRow)
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default TreeInspector;
