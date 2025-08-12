# OMAI Memory Management System
*Comprehensive User-Controlled Knowledge Storage and Priority System*

**Version:** 1.0  
**Created:** January 2025  
**Purpose:** Enable users to store, organize, and prioritize OMAI's memories  
**Integration:** Part of OMAI Training and Learning Framework  

---

## 🧠 System Overview

The OMAI Memory Management System allows users to explicitly store knowledge, set priorities, and manage OMAI's memory bank. This creates a user-controlled knowledge base that OMAI can reference and learn from, ensuring important information is preserved and prioritized.

---

## 🗄️ Database Schema

### **Primary Tables**

```sql
-- Enhanced OMAI Memories with User Management
CREATE TABLE omai_user_memories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category ENUM('instruction', 'preference', 'context', 'rule', 'fact', 'procedure', 'note') NOT NULL,
  priority ENUM('critical', 'high', 'medium', 'low') NOT NULL DEFAULT 'medium',
  tags JSON, -- Array of tags for flexible categorization
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_global BOOLEAN NOT NULL DEFAULT FALSE, -- Can be shared across all users (admin only)
  access_level ENUM('private', 'team', 'admin', 'global') NOT NULL DEFAULT 'private',
  source VARCHAR(100) DEFAULT 'user_input', -- How this memory was created
  context_data JSON, -- Additional context information
  usage_count INT DEFAULT 0, -- How often this memory has been referenced
  last_accessed_at DATETIME,
  expires_at DATETIME, -- Optional expiration for temporary memories
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_category (category),
  INDEX idx_priority (priority),
  INDEX idx_is_active (is_active),
  INDEX idx_access_level (access_level),
  INDEX idx_created_at (created_at),
  FULLTEXT idx_search (title, content)
);

-- Memory Relationships (for linking related memories)
CREATE TABLE omai_memory_relationships (
  id INT PRIMARY KEY AUTO_INCREMENT,
  parent_memory_id INT NOT NULL,
  child_memory_id INT NOT NULL,
  relationship_type ENUM('related', 'depends_on', 'contradicts', 'updates', 'references') NOT NULL,
  strength DECIMAL(3,2) DEFAULT 1.0, -- Relationship strength (0.0 to 1.0)
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (parent_memory_id) REFERENCES omai_user_memories(id) ON DELETE CASCADE,
  FOREIGN KEY (child_memory_id) REFERENCES omai_user_memories(id) ON DELETE CASCADE,
  UNIQUE KEY unique_relationship (parent_memory_id, child_memory_id, relationship_type),
  INDEX idx_parent (parent_memory_id),
  INDEX idx_child (child_memory_id),
  INDEX idx_type (relationship_type)
);

-- Memory Access Log (track usage for analytics)
CREATE TABLE omai_memory_access_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  memory_id INT NOT NULL,
  user_id INT,
  access_type ENUM('view', 'reference', 'update', 'delete') NOT NULL,
  context_info JSON, -- What triggered this access
  accessed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (memory_id) REFERENCES omai_user_memories(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_memory_id (memory_id),
  INDEX idx_user_id (user_id),
  INDEX idx_accessed_at (accessed_at)
);

-- Memory Collections (organize memories into groups)
CREATE TABLE omai_memory_collections (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#3498db', -- Hex color for UI
  icon VARCHAR(50) DEFAULT 'folder',
  is_default BOOLEAN DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id)
);

-- Memory Collection Mappings
CREATE TABLE omai_memory_collection_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  collection_id INT NOT NULL,
  memory_id INT NOT NULL,
  position INT DEFAULT 0, -- Order within collection
  added_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (collection_id) REFERENCES omai_memory_collections(id) ON DELETE CASCADE,
  FOREIGN KEY (memory_id) REFERENCES omai_user_memories(id) ON DELETE CASCADE,
  UNIQUE KEY unique_collection_memory (collection_id, memory_id),
  INDEX idx_collection_id (collection_id),
  INDEX idx_memory_id (memory_id)
);
```

---

## 🔌 API Endpoints

### **Memory Management API**

```javascript
// server/routes/omai/memories.js
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../middleware/auth');

// Apply authentication to all routes
router.use(authMiddleware);

// GET /api/omai/memories - Retrieve user's memories
router.get('/', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const {
      category,
      priority,
      tags,
      collection_id,
      search,
      is_active = true,
      page = 1,
      limit = 50,
      sort_by = 'updated_at',
      sort_order = 'DESC'
    } = req.query;

    let query = `
      SELECT 
        um.*,
        GROUP_CONCAT(DISTINCT mc.name) as collections,
        COUNT(DISTINCT mal.id) as access_count
      FROM omai_user_memories um
      LEFT JOIN omai_memory_collection_items mci ON um.id = mci.memory_id
      LEFT JOIN omai_memory_collections mc ON mci.collection_id = mc.id
      LEFT JOIN omai_memory_access_log mal ON um.id = mal.memory_id
      WHERE (um.user_id = ? OR um.access_level IN ('global', 'team'))
        AND um.is_active = ?
    `;
    
    const queryParams = [userId, is_active];

    // Add filters
    if (category) {
      query += ` AND um.category = ?`;
      queryParams.push(category);
    }
    
    if (priority) {
      query += ` AND um.priority = ?`;
      queryParams.push(priority);
    }
    
    if (search) {
      query += ` AND (MATCH(um.title, um.content) AGAINST(? IN NATURAL LANGUAGE MODE) 
                    OR um.title LIKE ? OR um.content LIKE ?)`;
      queryParams.push(search, `%${search}%`, `%${search}%`);
    }
    
    if (collection_id) {
      query += ` AND mci.collection_id = ?`;
      queryParams.push(collection_id);
    }

    query += ` GROUP BY um.id ORDER BY um.${sort_by} ${sort_order}`;
    query += ` LIMIT ? OFFSET ?`;
    queryParams.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const [memories] = await promisePool.execute(query, queryParams);
    
    // Get total count for pagination
    const [countResult] = await promisePool.execute(
      `SELECT COUNT(DISTINCT um.id) as total 
       FROM omai_user_memories um 
       WHERE (um.user_id = ? OR um.access_level IN ('global', 'team')) 
         AND um.is_active = ?`,
      [userId, is_active]
    );

    res.json({
      success: true,
      data: {
        memories: memories.map(memory => ({
          ...memory,
          tags: JSON.parse(memory.tags || '[]'),
          context_data: JSON.parse(memory.context_data || '{}'),
          collections: memory.collections ? memory.collections.split(',') : []
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult[0].total,
          pages: Math.ceil(countResult[0].total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching memories:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch memories' });
  }
});

// POST /api/omai/memories - Create new memory
router.post('/', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const {
      title,
      content,
      category = 'note',
      priority = 'medium',
      tags = [],
      access_level = 'private',
      context_data = {},
      expires_at,
      collection_ids = []
    } = req.body;

    // Validation
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        error: 'Title and content are required'
      });
    }

    // Insert memory
    const [result] = await promisePool.execute(`
      INSERT INTO omai_user_memories 
      (user_id, title, content, category, priority, tags, access_level, context_data, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userId, title, content, category, priority, 
      JSON.stringify(tags), access_level, JSON.stringify(context_data), expires_at
    ]);

    const memoryId = result.insertId;

    // Add to collections if specified
    if (collection_ids.length > 0) {
      const collectionInserts = collection_ids.map(collectionId => [collectionId, memoryId]);
      await promisePool.execute(`
        INSERT INTO omai_memory_collection_items (collection_id, memory_id) 
        VALUES ${collection_ids.map(() => '(?, ?)').join(', ')}
      `, collectionInserts.flat());
    }

    // Log the creation
    await promisePool.execute(`
      INSERT INTO omai_memory_access_log (memory_id, user_id, access_type, context_info)
      VALUES (?, ?, 'view', ?)
    `, [memoryId, userId, JSON.stringify({ action: 'created' })]);

    res.status(201).json({
      success: true,
      data: { id: memoryId, message: 'Memory created successfully' }
    });
  } catch (error) {
    console.error('Error creating memory:', error);
    res.status(500).json({ success: false, error: 'Failed to create memory' });
  }
});

// PUT /api/omai/memories/:id - Update memory
router.put('/:id', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const memoryId = req.params.id;
    const {
      title,
      content,
      category,
      priority,
      tags,
      access_level,
      context_data,
      expires_at,
      is_active
    } = req.body;

    // Check ownership
    const [existing] = await promisePool.execute(
      'SELECT user_id, access_level FROM omai_user_memories WHERE id = ?',
      [memoryId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: 'Memory not found' });
    }

    if (existing[0].user_id !== userId && existing[0].access_level !== 'global') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // Build update query
    const updates = [];
    const values = [];

    if (title !== undefined) { updates.push('title = ?'); values.push(title); }
    if (content !== undefined) { updates.push('content = ?'); values.push(content); }
    if (category !== undefined) { updates.push('category = ?'); values.push(category); }
    if (priority !== undefined) { updates.push('priority = ?'); values.push(priority); }
    if (tags !== undefined) { updates.push('tags = ?'); values.push(JSON.stringify(tags)); }
    if (access_level !== undefined) { updates.push('access_level = ?'); values.push(access_level); }
    if (context_data !== undefined) { updates.push('context_data = ?'); values.push(JSON.stringify(context_data)); }
    if (expires_at !== undefined) { updates.push('expires_at = ?'); values.push(expires_at); }
    if (is_active !== undefined) { updates.push('is_active = ?'); values.push(is_active); }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No updates provided' });
    }

    values.push(memoryId);

    await promisePool.execute(`
      UPDATE omai_user_memories 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, values);

    // Log the update
    await promisePool.execute(`
      INSERT INTO omai_memory_access_log (memory_id, user_id, access_type, context_info)
      VALUES (?, ?, 'update', ?)
    `, [memoryId, userId, JSON.stringify({ action: 'updated', fields: updates })]);

    res.json({ success: true, message: 'Memory updated successfully' });
  } catch (error) {
    console.error('Error updating memory:', error);
    res.status(500).json({ success: false, error: 'Failed to update memory' });
  }
});

// DELETE /api/omai/memories/:id - Delete memory
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const memoryId = req.params.id;

    // Check ownership
    const [existing] = await promisePool.execute(
      'SELECT user_id, access_level FROM omai_user_memories WHERE id = ?',
      [memoryId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: 'Memory not found' });
    }

    if (existing[0].user_id !== userId && existing[0].access_level !== 'global') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // Soft delete by default, hard delete if requested
    const { hard_delete = false } = req.query;

    if (hard_delete) {
      await promisePool.execute('DELETE FROM omai_user_memories WHERE id = ?', [memoryId]);
    } else {
      await promisePool.execute(
        'UPDATE omai_user_memories SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [memoryId]
      );
    }

    // Log the deletion
    await promisePool.execute(`
      INSERT INTO omai_memory_access_log (memory_id, user_id, access_type, context_info)
      VALUES (?, ?, 'delete', ?)
    `, [memoryId, userId, JSON.stringify({ action: hard_delete ? 'hard_delete' : 'soft_delete' })]);

    res.json({ success: true, message: 'Memory deleted successfully' });
  } catch (error) {
    console.error('Error deleting memory:', error);
    res.status(500).json({ success: false, error: 'Failed to delete memory' });
  }
});

// GET /api/omai/memories/:id - Get specific memory
router.get('/:id', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const memoryId = req.params.id;

    const [memories] = await promisePool.execute(`
      SELECT um.*, 
        GROUP_CONCAT(DISTINCT mc.name) as collections,
        GROUP_CONCAT(DISTINCT CONCAT(mr.relationship_type, ':', mr2.title)) as related_memories
      FROM omai_user_memories um
      LEFT JOIN omai_memory_collection_items mci ON um.id = mci.memory_id
      LEFT JOIN omai_memory_collections mc ON mci.collection_id = mc.id
      LEFT JOIN omai_memory_relationships mr ON um.id = mr.parent_memory_id
      LEFT JOIN omai_user_memories mr2 ON mr.child_memory_id = mr2.id
      WHERE um.id = ? AND (um.user_id = ? OR um.access_level IN ('global', 'team'))
      GROUP BY um.id
    `, [memoryId, userId]);

    if (memories.length === 0) {
      return res.status(404).json({ success: false, error: 'Memory not found' });
    }

    const memory = {
      ...memories[0],
      tags: JSON.parse(memories[0].tags || '[]'),
      context_data: JSON.parse(memories[0].context_data || '{}'),
      collections: memories[0].collections ? memories[0].collections.split(',') : [],
      related_memories: memories[0].related_memories ? memories[0].related_memories.split(',') : []
    };

    // Update access count and timestamp
    await promisePool.execute(`
      UPDATE omai_user_memories 
      SET usage_count = usage_count + 1, last_accessed_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [memoryId]);

    // Log the access
    await promisePool.execute(`
      INSERT INTO omai_memory_access_log (memory_id, user_id, access_type, context_info)
      VALUES (?, ?, 'reference', ?)
    `, [memoryId, userId, JSON.stringify({ action: 'accessed' })]);

    res.json({ success: true, data: memory });
  } catch (error) {
    console.error('Error fetching memory:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch memory' });
  }
});

module.exports = router;
```

---

## 💻 Frontend Interface

### **Memory Management Component**

```typescript
// front-end/src/components/admin/MemoryManager.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
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
  Autocomplete,
  IconButton,
  Tooltip,
  Alert,
  LinearProgress,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Memory as MemoryIcon,
  Label as TagIcon,
  Folder as CollectionIcon,
  Visibility as ViewIcon,
  FilterList as FilterIcon,
  Sort as SortIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { memoriesAPI } from '../../api/memories.api';

interface Memory {
  id: number;
  title: string;
  content: string;
  category: 'instruction' | 'preference' | 'context' | 'rule' | 'fact' | 'procedure' | 'note';
  priority: 'critical' | 'high' | 'medium' | 'low';
  tags: string[];
  is_active: boolean;
  access_level: 'private' | 'team' | 'admin' | 'global';
  usage_count: number;
  created_at: string;
  updated_at: string;
  last_accessed_at?: string;
  expires_at?: string;
  collections: string[];
}

const MemoryManager: React.FC = () => {
  const { user, hasRole } = useAuth();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  
  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('updated_at');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [showInactive, setShowInactive] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'note' as Memory['category'],
    priority: 'medium' as Memory['priority'],
    tags: [] as string[],
    access_level: 'private' as Memory['access_level'],
    expires_at: '',
    context_data: {}
  });

  // Fetch memories
  const fetchMemories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await memoriesAPI.getAll({
        search: searchTerm || undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined,
        is_active: !showInactive,
        sort_by: sortBy,
        sort_order: sortOrder,
        limit: 100
      });
      
      setMemories(response.data.memories);
      setError('');
    } catch (err: any) {
      console.error('Error fetching memories:', err);
      setError('Failed to load memories');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, categoryFilter, priorityFilter, showInactive, sortBy, sortOrder]);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  // Create memory
  const handleCreateMemory = async () => {
    try {
      await memoriesAPI.create(formData);
      setSuccess('Memory created successfully');
      setCreateDialogOpen(false);
      resetForm();
      fetchMemories();
    } catch (err: any) {
      setError('Failed to create memory');
    }
  };

  // Update memory
  const handleUpdateMemory = async () => {
    if (!selectedMemory) return;
    
    try {
      await memoriesAPI.update(selectedMemory.id, formData);
      setSuccess('Memory updated successfully');
      setEditDialogOpen(false);
      resetForm();
      fetchMemories();
    } catch (err: any) {
      setError('Failed to update memory');
    }
  };

  // Delete memory
  const handleDeleteMemory = async () => {
    if (!selectedMemory) return;
    
    try {
      await memoriesAPI.delete(selectedMemory.id);
      setSuccess('Memory deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedMemory(null);
      fetchMemories();
    } catch (err: any) {
      setError('Failed to delete memory');
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      category: 'note',
      priority: 'medium',
      tags: [],
      access_level: 'private',
      expires_at: '',
      context_data: {}
    });
    setSelectedMemory(null);
  };

  // Open edit dialog
  const openEditDialog = (memory: Memory) => {
    setSelectedMemory(memory);
    setFormData({
      title: memory.title,
      content: memory.content,
      category: memory.category,
      priority: memory.priority,
      tags: memory.tags,
      access_level: memory.access_level,
      expires_at: memory.expires_at || '',
      context_data: {}
    });
    setEditDialogOpen(true);
  };

  // Open view dialog
  const openViewDialog = (memory: Memory) => {
    setSelectedMemory(memory);
    setViewDialogOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (memory: Memory) => {
    setSelectedMemory(memory);
    setDeleteDialogOpen(true);
  };

  // Get priority color
  const getPriorityColor = (priority: Memory['priority']) => {
    switch (priority) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  // Get category icon
  const getCategoryIcon = (category: Memory['category']) => {
    switch (category) {
      case 'instruction': return '📋';
      case 'preference': return '⚙️';
      case 'context': return '🌍';
      case 'rule': return '📏';
      case 'fact': return '💡';
      case 'procedure': return '🔄';
      case 'note': return '📝';
      default: return '📝';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" gutterBottom>
          <MemoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          OMAI Memory Management
        </Typography>
        
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Add Memory
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Filters and Search */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Search memories"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1 }} />
              }}
            />
          </Grid>
          
          <Grid item xs={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={categoryFilter}
                label="Category"
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <MenuItem value="all">All Categories</MenuItem>
                <MenuItem value="instruction">📋 Instructions</MenuItem>
                <MenuItem value="preference">⚙️ Preferences</MenuItem>
                <MenuItem value="context">🌍 Context</MenuItem>
                <MenuItem value="rule">📏 Rules</MenuItem>
                <MenuItem value="fact">💡 Facts</MenuItem>
                <MenuItem value="procedure">🔄 Procedures</MenuItem>
                <MenuItem value="note">📝 Notes</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={priorityFilter}
                label="Priority"
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <MenuItem value="all">All Priorities</MenuItem>
                <MenuItem value="critical">🔴 Critical</MenuItem>
                <MenuItem value="high">🟠 High</MenuItem>
                <MenuItem value="medium">🟡 Medium</MenuItem>
                <MenuItem value="low">⚪ Low</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortBy}
                label="Sort By"
                onChange={(e) => setSortBy(e.target.value)}
              >
                <MenuItem value="updated_at">Last Updated</MenuItem>
                <MenuItem value="created_at">Created Date</MenuItem>
                <MenuItem value="priority">Priority</MenuItem>
                <MenuItem value="usage_count">Usage Count</MenuItem>
                <MenuItem value="title">Title</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={6} md={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                />
              }
              label="Show Inactive"
            />
          </Grid>
          
          <Grid item xs={12} md={1}>
            <Button
              fullWidth
              variant="outlined"
              onClick={fetchMemories}
              startIcon={<SearchIcon />}
            >
              Search
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Loading */}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Memory Cards */}
      <Grid container spacing={3}>
        {memories.map((memory) => (
          <Grid item xs={12} md={6} lg={4} key={memory.id}>
            <Card 
              sx={{ 
                height: '100%',
                opacity: memory.is_active ? 1 : 0.6,
                border: memory.priority === 'critical' ? 2 : 0,
                borderColor: memory.priority === 'critical' ? 'error.main' : 'transparent'
              }}
            >
              <CardContent>
                <Box display="flex" justifyContent="between" alignItems="start" mb={1}>
                  <Typography variant="h6" noWrap sx={{ flexGrow: 1, mr: 1 }}>
                    {getCategoryIcon(memory.category)} {memory.title}
                  </Typography>
                  
                  <Box>
                    <Tooltip title="View Details">
                      <IconButton size="small" onClick={() => openViewDialog(memory)}>
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => openEditDialog(memory)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => openDeleteDialog(memory)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
                
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ 
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    mb: 2
                  }}
                >
                  {memory.content}
                </Typography>
                
                <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
                  <Chip 
                    label={memory.priority}
                    color={getPriorityColor(memory.priority)}
                    size="small"
                  />
                  <Chip 
                    label={memory.category}
                    variant="outlined"
                    size="small"
                  />
                  {memory.tags.map((tag, index) => (
                    <Chip
                      key={index}
                      label={tag}
                      size="small"
                      icon={<TagIcon />}
                      variant="outlined"
                    />
                  ))}
                </Box>
                
                <Typography variant="caption" color="text.secondary">
                  Created: {new Date(memory.created_at).toLocaleDateString()}
                  {memory.usage_count > 0 && ` • Used ${memory.usage_count} times`}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {memories.length === 0 && !loading && (
        <Box textAlign="center" py={4}>
          <MemoryIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No memories found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create your first memory to get started
          </Typography>
        </Box>
      )}

      {/* Create/Edit Dialog */}
      <Dialog 
        open={createDialogOpen || editDialogOpen} 
        onClose={() => {
          setCreateDialogOpen(false);
          setEditDialogOpen(false);
          resetForm();
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editDialogOpen ? 'Edit Memory' : 'Create New Memory'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                multiline
                rows={4}
                required
              />
            </Grid>
            
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.category}
                  label="Category"
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as Memory['category'] }))}
                >
                  <MenuItem value="instruction">📋 Instruction</MenuItem>
                  <MenuItem value="preference">⚙️ Preference</MenuItem>
                  <MenuItem value="context">🌍 Context</MenuItem>
                  <MenuItem value="rule">📏 Rule</MenuItem>
                  <MenuItem value="fact">💡 Fact</MenuItem>
                  <MenuItem value="procedure">🔄 Procedure</MenuItem>
                  <MenuItem value="note">📝 Note</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={formData.priority}
                  label="Priority"
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as Memory['priority'] }))}
                >
                  <MenuItem value="critical">🔴 Critical</MenuItem>
                  <MenuItem value="high">🟠 High</MenuItem>
                  <MenuItem value="medium">🟡 Medium</MenuItem>
                  <MenuItem value="low">⚪ Low</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <Autocomplete
                multiple
                freeSolo
                options={[]}
                value={formData.tags}
                onChange={(event, newValue) => {
                  setFormData(prev => ({ ...prev, tags: newValue }));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Tags"
                    placeholder="Add tags..."
                  />
                )}
              />
            </Grid>
            
            {hasRole(['admin', 'super_admin']) && (
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Access Level</InputLabel>
                  <Select
                    value={formData.access_level}
                    label="Access Level"
                    onChange={(e) => setFormData(prev => ({ ...prev, access_level: e.target.value as Memory['access_level'] }))}
                  >
                    <MenuItem value="private">🔒 Private</MenuItem>
                    <MenuItem value="team">👥 Team</MenuItem>
                    <MenuItem value="admin">🛡️ Admin</MenuItem>
                    <MenuItem value="global">🌍 Global</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}
            
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Expires At"
                type="datetime-local"
                value={formData.expires_at}
                onChange={(e) => setFormData(prev => ({ ...prev, expires_at: e.target.value }))}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setCreateDialogOpen(false);
            setEditDialogOpen(false);
            resetForm();
          }}>
            Cancel
          </Button>
          <Button 
            onClick={editDialogOpen ? handleUpdateMemory : handleCreateMemory}
            variant="contained"
          >
            {editDialogOpen ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog 
        open={viewDialogOpen} 
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedMemory && (
            <>
              {getCategoryIcon(selectedMemory.category)} {selectedMemory.title}
              <Chip 
                label={selectedMemory.priority}
                color={getPriorityColor(selectedMemory.priority)}
                size="small"
                sx={{ ml: 2 }}
              />
            </>
          )}
        </DialogTitle>
        <DialogContent>
          {selectedMemory && (
            <Box>
              <Typography variant="body1" paragraph>
                {selectedMemory.content}
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="primary">Category</Typography>
                  <Typography variant="body2">{selectedMemory.category}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="primary">Access Level</Typography>
                  <Typography variant="body2">{selectedMemory.access_level}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="primary">Usage Count</Typography>
                  <Typography variant="body2">{selectedMemory.usage_count}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="primary">Created</Typography>
                  <Typography variant="body2">
                    {new Date(selectedMemory.created_at).toLocaleString()}
                  </Typography>
                </Grid>
                {selectedMemory.last_accessed_at && (
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="primary">Last Accessed</Typography>
                    <Typography variant="body2">
                      {new Date(selectedMemory.last_accessed_at).toLocaleString()}
                    </Typography>
                  </Grid>
                )}
                {selectedMemory.expires_at && (
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="primary">Expires</Typography>
                    <Typography variant="body2">
                      {new Date(selectedMemory.expires_at).toLocaleString()}
                    </Typography>
                  </Grid>
                )}
              </Grid>
              
              {selectedMemory.tags.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" color="primary" gutterBottom>Tags</Typography>
                  <Box display="flex" flexWrap="wrap" gap={1}>
                    {selectedMemory.tags.map((tag, index) => (
                      <Chip
                        key={index}
                        label={tag}
                        size="small"
                        icon={<TagIcon />}
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </>
              )}
              
              {selectedMemory.collections.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" color="primary" gutterBottom>Collections</Typography>
                  <Box display="flex" flexWrap="wrap" gap={1}>
                    {selectedMemory.collections.map((collection, index) => (
                      <Chip
                        key={index}
                        label={collection}
                        size="small"
                        icon={<CollectionIcon />}
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          {selectedMemory && (
            <Button onClick={() => {
              setViewDialogOpen(false);
              openEditDialog(selectedMemory);
            }}>
              Edit
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteDialogOpen} 
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the memory "{selectedMemory?.title}"? 
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteMemory} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MemoryManager;
```

---

## 🔌 API Service Layer

```typescript
// front-end/src/api/memories.api.ts
import { apiClient } from './index';

export interface Memory {
  id: number;
  title: string;
  content: string;
  category: 'instruction' | 'preference' | 'context' | 'rule' | 'fact' | 'procedure' | 'note';
  priority: 'critical' | 'high' | 'medium' | 'low';
  tags: string[];
  is_active: boolean;
  access_level: 'private' | 'team' | 'admin' | 'global';
  usage_count: number;
  created_at: string;
  updated_at: string;
  last_accessed_at?: string;
  expires_at?: string;
  collections: string[];
}

export interface MemoryFilters {
  category?: string;
  priority?: string;
  tags?: string[];
  search?: string;
  is_active?: boolean;
  access_level?: string;
  collection_id?: number;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
}

export interface CreateMemoryData {
  title: string;
  content: string;
  category?: Memory['category'];
  priority?: Memory['priority'];
  tags?: string[];
  access_level?: Memory['access_level'];
  context_data?: object;
  expires_at?: string;
  collection_ids?: number[];
}

export interface UpdateMemoryData extends Partial<CreateMemoryData> {
  is_active?: boolean;
}

export interface MemoriesResponse {
  memories: Memory[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

class MemoriesAPI {
  // Get all memories with filters
  getAll = (filters: MemoryFilters = {}): Promise<{ success: boolean; data: MemoriesResponse }> => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(`${key}[]`, v.toString()));
        } else {
          params.append(key, value.toString());
        }
      }
    });

    return apiClient.get(`/omai/memories?${params.toString()}`);
  };

  // Get specific memory by ID
  getById = (id: number): Promise<{ success: boolean; data: Memory }> =>
    apiClient.get(`/omai/memories/${id}`);

  // Create new memory
  create = (data: CreateMemoryData): Promise<{ success: boolean; data: { id: number; message: string } }> =>
    apiClient.post('/omai/memories', data);

  // Update memory
  update = (id: number, data: UpdateMemoryData): Promise<{ success: boolean; message: string }> =>
    apiClient.put(`/omai/memories/${id}`, data);

  // Delete memory (soft delete by default)
  delete = (id: number, hardDelete = false): Promise<{ success: boolean; message: string }> =>
    apiClient.delete(`/omai/memories/${id}?hard_delete=${hardDelete}`);

  // Search memories
  search = (query: string, filters: Omit<MemoryFilters, 'search'> = {}): Promise<{ success: boolean; data: MemoriesResponse }> =>
    this.getAll({ ...filters, search: query });

  // Get memories by category
  getByCategory = (category: Memory['category'], filters: Omit<MemoryFilters, 'category'> = {}): Promise<{ success: boolean; data: MemoriesResponse }> =>
    this.getAll({ ...filters, category });

  // Get memories by priority
  getByPriority = (priority: Memory['priority'], filters: Omit<MemoryFilters, 'priority'> = {}): Promise<{ success: boolean; data: MemoriesResponse }> =>
    this.getAll({ ...filters, priority });

  // Get memories by tags
  getByTags = (tags: string[], filters: Omit<MemoryFilters, 'tags'> = {}): Promise<{ success: boolean; data: MemoriesResponse }> =>
    this.getAll({ ...filters, tags });

  // Bulk operations
  bulkUpdate = (ids: number[], data: UpdateMemoryData): Promise<{ success: boolean; message: string }> =>
    apiClient.put('/omai/memories/bulk', { ids, data });

  bulkDelete = (ids: number[], hardDelete = false): Promise<{ success: boolean; message: string }> =>
    apiClient.delete(`/omai/memories/bulk?hard_delete=${hardDelete}`, { data: { ids } });

  // Memory analytics
  getAnalytics = (): Promise<{ success: boolean; data: any }> =>
    apiClient.get('/omai/memories/analytics');

  // Export memories
  export = (filters: MemoryFilters = {}): Promise<{ success: boolean; data: any }> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });
    return apiClient.get(`/omai/memories/export?${params.toString()}`);
  };
}

export const memoriesAPI = new MemoriesAPI();
export default memoriesAPI;
```

---

## 🎯 Integration with OMAI Training

### **Memory-Enhanced Training Framework**

```javascript
// server/utils/OMAIMemoryIntegration.js
class OMAIMemoryIntegration {
  constructor() {
    this.memoryCache = new Map();
    this.priorityWeights = {
      critical: 1.0,
      high: 0.8,
      medium: 0.6,
      low: 0.4
    };
  }

  // Retrieve relevant memories for OMAI responses
  async getRelevantMemories(context, userId, limit = 10) {
    try {
      const searchTerms = this.extractSearchTerms(context);
      
      const [memories] = await promisePool.execute(`
        SELECT um.*, 
          MATCH(um.title, um.content) AGAINST(? IN NATURAL LANGUAGE MODE) as relevance_score,
          CASE um.priority 
            WHEN 'critical' THEN 1.0
            WHEN 'high' THEN 0.8
            WHEN 'medium' THEN 0.6
            WHEN 'low' THEN 0.4
          END as priority_weight
        FROM omai_user_memories um
        WHERE um.is_active = TRUE
          AND (um.user_id = ? OR um.access_level IN ('global', 'team'))
          AND (um.expires_at IS NULL OR um.expires_at > NOW())
          AND (
            MATCH(um.title, um.content) AGAINST(? IN NATURAL LANGUAGE MODE)
            OR um.tags LIKE ?
          )
        ORDER BY (relevance_score * priority_weight) DESC, um.usage_count DESC
        LIMIT ?
      `, [searchTerms, userId, searchTerms, `%${searchTerms}%`, limit]);

      // Update usage count for accessed memories
      if (memories.length > 0) {
        const memoryIds = memories.map(m => m.id);
        await promisePool.execute(`
          UPDATE omai_user_memories 
          SET usage_count = usage_count + 1, last_accessed_at = NOW()
          WHERE id IN (${memoryIds.map(() => '?').join(',')})
        `, memoryIds);

        // Log memory access
        const accessLogs = memoryIds.map(id => [id, userId, 'reference', JSON.stringify({ context: 'omai_response' })]);
        await promisePool.execute(`
          INSERT INTO omai_memory_access_log (memory_id, user_id, access_type, context_info)
          VALUES ${accessLogs.map(() => '(?, ?, ?, ?)').join(', ')}
        `, accessLogs.flat());
      }

      return memories.map(memory => ({
        ...memory,
        tags: JSON.parse(memory.tags || '[]'),
        context_data: JSON.parse(memory.context_data || '{}')
      }));
    } catch (error) {
      console.error('Error retrieving relevant memories:', error);
      return [];
    }
  }

  // Store new memory from user interaction
  async storeUserMemory(userId, memoryData) {
    try {
      const {
        title,
        content,
        category = 'note',
        priority = 'medium',
        tags = [],
        context_data = {}
      } = memoryData;

      const [result] = await promisePool.execute(`
        INSERT INTO omai_user_memories 
        (user_id, title, content, category, priority, tags, context_data, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'user_instruction')
      `, [
        userId, 
        title, 
        content, 
        category, 
        priority,
        JSON.stringify(tags),
        JSON.stringify(context_data)
      ]);

      return { id: result.insertId, success: true };
    } catch (error) {
      console.error('Error storing user memory:', error);
      return { success: false, error: error.message };
    }
  }

  // Extract search terms from context
  extractSearchTerms(context) {
    // Simple keyword extraction - can be enhanced with NLP
    const keywords = context.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 5)
      .join(' ');
    
    return keywords;
  }

  // Get memory priorities for a user
  async getMemoryPriorities(userId) {
    try {
      const [priorities] = await promisePool.execute(`
        SELECT 
          priority,
          COUNT(*) as count,
          AVG(usage_count) as avg_usage
        FROM omai_user_memories
        WHERE user_id = ? AND is_active = TRUE
        GROUP BY priority
        ORDER BY 
          CASE priority 
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'low' THEN 4
          END
      `, [userId]);

      return priorities;
    } catch (error) {
      console.error('Error getting memory priorities:', error);
      return [];
    }
  }

  // Generate memory insights for OMAI training
  async generateMemoryInsights(userId) {
    try {
      const [insights] = await promisePool.execute(`
        SELECT 
          um.category,
          um.priority,
          COUNT(*) as memory_count,
          AVG(um.usage_count) as avg_usage,
          MAX(um.last_accessed_at) as last_access,
          GROUP_CONCAT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(um.tags, '$[*]'))) as common_tags
        FROM omai_user_memories um
        WHERE um.user_id = ? AND um.is_active = TRUE
        GROUP BY um.category, um.priority
        ORDER BY memory_count DESC, avg_usage DESC
      `, [userId]);

      return {
        user_id: userId,
        memory_patterns: insights,
        total_memories: insights.reduce((sum, insight) => sum + insight.memory_count, 0),
        most_used_category: insights[0]?.category || null,
        priority_distribution: insights.reduce((acc, insight) => {
          acc[insight.priority] = (acc[insight.priority] || 0) + insight.memory_count;
          return acc;
        }, {}),
        generated_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error generating memory insights:', error);
      return null;
    }
  }
}

module.exports = OMAIMemoryIntegration;
```

---

## 🚀 Integration Points

### **1. Add to Admin Settings**
```typescript
// Add memory management tab to AdminSettings.tsx
<Tab label="OMAI Memories" />

// In tab content:
{tabValue === X && <MemoryManager />}
```

### **2. Global OMAI Integration**
```typescript
// Enhance GlobalOMAI.tsx to use memories
const useOMAIMemories = (context) => {
  const [relevantMemories, setRelevantMemories] = useState([]);
  
  useEffect(() => {
    memoriesAPI.search(context).then(response => {
      setRelevantMemories(response.data.memories);
    });
  }, [context]);
  
  return relevantMemories;
};
```

### **3. Quick Memory Creation**
```typescript
// Add quick memory creation from any OMAI interaction
const QuickMemoryButton = ({ content, context }) => {
  const handleSaveMemory = async () => {
    await memoriesAPI.create({
      title: `Memory from ${context}`,
      content,
      category: 'note',
      priority: 'medium'
    });
  };
  
  return (
    <Tooltip title="Save as Memory">
      <IconButton onClick={handleSaveMemory}>
        <MemoryIcon />
      </IconButton>
    </Tooltip>
  );
};
```

---

## 📊 Usage Examples

### **Common Memory Types**

1. **Instructions**: "Always backup database before running migrations"
2. **Preferences**: "Use informal tone when responding to John"
3. **Context**: "This church follows Greek Orthodox traditions"
4. **Rules**: "Never modify user permissions without approval"
5. **Facts**: "Server maintenance window is Sundays 2-4 AM"
6. **Procedures**: "Password reset requires email verification + admin approval"

### **Priority Guidelines**

- **Critical**: System security rules, data protection policies
- **High**: Important user preferences, emergency procedures
- **Medium**: General instructions, workflow preferences
- **Low**: Minor notes, temporary reminders

---

This comprehensive memory management system gives you complete control over OMAI's knowledge base while providing powerful search, organization, and priority features! 🧠✨ 