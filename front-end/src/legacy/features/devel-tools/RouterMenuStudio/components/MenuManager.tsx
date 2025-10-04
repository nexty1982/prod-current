/**
 * Menu Management Component
 * Design and organize navigation menus
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  
  
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Alert,
  Paper,
  Divider
} from '@mui/material';
import { TreeView, TreeItem } from "@mui/lab";
import {
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Menu as MenuIcon,
  Folder as FolderIcon,
  InsertLink as LinkIcon
} from '@mui/icons-material';

interface MenuNode {
  id: number;
  menu_key: string;
  title: string;
  path: string;
  icon: string;
  parent_id: number | null;
  display_order: number;
  description?: string;
  children?: MenuNode[];
  roles: string[];
}

export const MenuManager: React.FC = () => {
  const [menuTree, setMenuTree] = useState<MenuNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingNode, setEditingNode] = useState<MenuNode | null>(null);
  const [expanded, setExpanded] = useState<string[]>(['dashboard', 'records_section']);

  // Mock menu data from DynamicMenuContext
  useEffect(() => {
    const mockMenuData: MenuNode[] = [
      {
        id: 1,
        menu_key: 'dashboard',
        title: 'Dashboard',
        path: '/dashboard',
        icon: 'IconDashboard',
        parent_id: null,
        display_order: 1,
        description: 'Main dashboard overview',
        roles: ['user', 'admin', 'super_admin']
      },
      {
        id: 100,
        menu_key: 'records_section',
        title: 'Records Management',
        path: '',
        icon: 'IconFiles',
        parent_id: null,
        display_order: 100,
        description: 'Church records and data management',
        roles: ['admin', 'super_admin'],
        children: [
          {
            id: 101,
            menu_key: 'baptism_records',
            title: 'Baptism Records',
            path: '/features/records-centralized/shared/ui/legacy/baptism/BaptismRecordsPage',
            icon: 'IconDroplet',
            parent_id: 100,
            display_order: 1,
            roles: ['admin', 'super_admin']
          },
          {
            id: 102,
            menu_key: 'marriage_records',
            title: 'Marriage Records',
            path: '/features/records-centralized/shared/ui/legacy/marriage/MarriageRecords',
            icon: 'IconHeart',
            parent_id: 100,
            display_order: 2,
            roles: ['admin', 'super_admin']
          }
        ]
      },
      {
        id: 200,
        menu_key: 'tables_section',
        title: 'Tables & Data Grids',
        path: '',
        icon: 'IconBorderAll',
        parent_id: null,
        display_order: 200,
        description: 'Data tables and grid components',
        roles: ['admin', 'super_admin'],
        children: [
          {
            id: 201,
            menu_key: 'aggrid_viewonly',
            title: 'AG Grid View Only',
            path: '/features/tables/AGGridViewOnly/AGGridViewOnly',
            icon: 'IconBorderAll',
            parent_id: 200,
            display_order: 1,
            roles: ['admin', 'super_admin']
          }
        ]
      }
    ];

    setTimeout(() => {
      setMenuTree(mockMenuData);
      setLoading(false);
    }, 500);
  }, []);

  const handleAddNode = (parentId: number | null = null) => {
    setEditingNode({
      id: 0,
      menu_key: '',
      title: '',
      path: '',
      icon: 'IconPoint',
      parent_id: parentId,
      display_order: 1,
      roles: ['user']
    });
    setOpenDialog(true);
  };

  const handleEditNode = (node: MenuNode) => {
    setEditingNode(node);
    setOpenDialog(true);
  };

  const renderTreeItem = (node: MenuNode) => (
    <TreeItem
      key={node.menu_key}
      nodeId={node.menu_key}
      label={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
          {node.path ? <LinkIcon fontSize="small" /> : <FolderIcon fontSize="small" />}
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {node.title}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {node.roles?.map(role => (
              <Chip
                key={role}
                label={role}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.6rem', height: 18 }}
              />
            ))}
          </Box>
          <Box sx={{ ml: 'auto', display: 'flex', gap: 0.5 }}>
            <IconButton 
              size="small" 
              onClick={(e) => {
                e.stopPropagation();
                handleEditNode(node);
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton 
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleAddNode(node.id);
              }}
            >
              <AddIcon fontSize="small" />
            </IconButton>
            <IconButton 
              size="small" 
              color="error"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      }
    >
      {node.children?.map(child => renderTreeItem(child))}
    </TreeItem>
  );

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>Loading menu structure...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Menu Tree</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleAddNode()}
          size="small"
        >
          Add Section
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 2 }}>
        🌳 Live menu structure from DynamicMenuContext - Drag to reorder (coming soon)
      </Alert>

      <Paper sx={{ flex: 1, p: 2, overflow: 'auto' }}>
        <TreeView
          defaultCollapseIcon={<ExpandMoreIcon />}
          defaultExpandIcon={<ChevronRightIcon />}
          expanded={expanded}
          onNodeToggle={(event, nodeIds) => setExpanded(nodeIds)}
        >
          {menuTree.map(node => renderTreeItem(node))}
        </TreeView>
      </Paper>

      <Divider sx={{ my: 2 }} />
      
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Chip label={`${menuTree.length} Top Level Sections`} variant="outlined" />
        <Chip 
          label={`${menuTree.reduce((acc, node) => acc + (node.children?.length || 0), 0)} Sub Items`} 
          variant="outlined" 
        />
        <Chip label="Real-time Sync" color="success" variant="outlined" />
      </Box>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingNode?.id === 0 ? 'Add Menu Item' : 'Edit Menu Item'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Menu Key"
              placeholder="unique_menu_key"
              defaultValue={editingNode?.menu_key || ''}
              fullWidth
              size="small"
              helperText="Unique identifier for this menu item"
            />
            <TextField
              label="Title"
              placeholder="Menu Item Title"
              defaultValue={editingNode?.title || ''}
              fullWidth
              size="small"
            />
            <TextField
              label="Path"
              placeholder="/path/to/component or leave empty for section"
              defaultValue={editingNode?.path || ''}
              fullWidth
              size="small"
              helperText="Leave empty for section headers"
            />
            <TextField
              label="Icon"
              placeholder="IconName"
              defaultValue={editingNode?.icon || 'IconPoint'}
              fullWidth
              size="small"
              helperText="Tabler icon name (e.g., IconDashboard)"
            />
            <TextField
              label="Description"
              placeholder="Brief description"
              defaultValue={editingNode?.description || ''}
              fullWidth
              multiline
              rows={2}
              size="small"
            />
            <FormControl size="small">
              <InputLabel>Display Order</InputLabel>
              <Select defaultValue={editingNode?.display_order || 1} label="Display Order">
                {Array.from({length: 20}, (_, i) => (
                  <MenuItem key={i+1} value={i+1}>{i+1}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setOpenDialog(false)}>
            {editingNode?.id === 0 ? 'Create' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MenuManager;
