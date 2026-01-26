const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const logger = require('../utils/logger');

class TaskDiscoveryService {
  constructor() {
    this.projectRoot = '/var/www/orthodox-church-mgmt/orthodoxmetrics/prod';
    this.bigBookPath = '/mnt/bigbook_secure';
    this.taskPattern = /^task_.*\.md$/i;
    this.kanbanMetadata = {
      board: 'dev',
      columns: ['To Do', 'In Progress', 'Review', 'Done'],
      defaultColumn: 'To Do'
    };
  }

  /**
   * Discover all task markdown files in the project
   */
  async discoverTasks() {
    try {
      logger.info('Starting task discovery process');
      const tasks = [];
      
      // Search in both project root and Big Book
      const searchPaths = [
        this.projectRoot,
        this.bigBookPath
      ];

      for (const searchPath of searchPaths) {
        const foundTasks = await this.searchDirectory(searchPath);
        tasks.push(...foundTasks);
      }

      // Remove duplicates based on filename
      const uniqueTasks = this.deduplicateTasks(tasks);
      
      logger.info(`Discovered ${uniqueTasks.length} unique task files`);
      return uniqueTasks;
    } catch (error) {
      logger.error('Failed to discover tasks:', error);
      throw error;
    }
  }

  /**
   * Recursively search directory for task files
   */
  async searchDirectory(dirPath) {
    const tasks = [];
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          // Skip node_modules and other irrelevant directories
          if (this.shouldSkipDirectory(entry.name)) {
            continue;
          }
          
          const subTasks = await this.searchDirectory(fullPath);
          tasks.push(...subTasks);
        } else if (entry.isFile() && this.taskPattern.test(entry.name)) {
          const taskData = await this.extractTaskMetadata(fullPath);
          if (taskData) {
            tasks.push(taskData);
          }
        }
      }
    } catch (error) {
      if (error.code !== 'ENOENT' && error.code !== 'EACCES') {
        logger.warn(`Error reading directory ${dirPath}:`, error.message);
      }
    }
    
    return tasks;
  }

  /**
   * Check if directory should be skipped
   */
  shouldSkipDirectory(dirName) {
    const skipDirs = [
      'node_modules',
      '.git',
      '.next',
      'dist',
      'build',
      '.vscode',
      '.idea',
      'vendor',
      'logs',
      'tmp',
      'temp'
    ];
    
    return skipDirs.includes(dirName) || dirName.startsWith('.');
  }

  /**
   * Extract metadata from a task markdown file
   */
  async extractTaskMetadata(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const stats = await fs.stat(filePath);
      
      const metadata = {
        id: this.generateTaskId(filePath),
        filename: path.basename(filePath),
        filepath: filePath,
        relativePath: path.relative(this.projectRoot, filePath),
        title: '',
        description: '',
        status: 'To Do',
        priority: 'medium',
        tags: [],
        createdAt: stats.birthtime || stats.mtime,
        modifiedAt: stats.mtime,
        size: stats.size,
        kanban: {
          synced: false,
          cardId: null,
          boardId: 'dev',
          column: 'To Do',
          lastSync: null,
          syncErrors: []
        },
        frontmatter: {},
        content: content
      };

      // Parse frontmatter and content
      this.parseFrontmatter(content, metadata);
      this.parseContent(content, metadata);
      this.extractKanbanMetadata(metadata);

      return metadata;
    } catch (error) {
      logger.error(`Failed to extract metadata from ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Parse YAML frontmatter from markdown
   */
  parseFrontmatter(content, metadata) {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
    const match = content.match(frontmatterRegex);
    
    if (match) {
      try {
        const frontmatter = yaml.load(match[1]);
        metadata.frontmatter = frontmatter || {};
        
        // Extract common fields
        if (frontmatter.title) metadata.title = frontmatter.title;
        if (frontmatter.status) metadata.status = frontmatter.status;
        if (frontmatter.priority) metadata.priority = frontmatter.priority;
        if (frontmatter.tags) metadata.tags = Array.isArray(frontmatter.tags) ? frontmatter.tags : [frontmatter.tags];
        if (frontmatter.description) metadata.description = frontmatter.description;
        
      } catch (error) {
        logger.warn(`Failed to parse frontmatter in ${metadata.filename}:`, error.message);
      }
    }
  }

  /**
   * Parse markdown content for title and description
   */
  parseContent(content, metadata) {
    // Remove frontmatter from content
    const contentWithoutFrontmatter = content.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');
    
    // Extract title from first heading if not in frontmatter
    if (!metadata.title) {
      const titleMatch = contentWithoutFrontmatter.match(/^#\s+(.+)$/m);
      if (titleMatch) {
        metadata.title = titleMatch[1].trim();
      } else {
        // Use filename as fallback
        metadata.title = path.basename(metadata.filename, '.md')
          .replace(/^task_/i, '')
          .replace(/_/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase());
      }
    }

    // Extract description from content
    if (!metadata.description) {
      // Look for objective section
      const objectiveMatch = contentWithoutFrontmatter.match(/##?\s*(?:Objective|Description|Summary)\s*\n\n(.*?)(?=\n#|$)/s);
      if (objectiveMatch) {
        metadata.description = objectiveMatch[1].trim().substring(0, 500);
      } else {
        // Take first paragraph
        const paragraphs = contentWithoutFrontmatter.split('\n\n');
        const firstParagraph = paragraphs.find(p => p.trim() && !p.startsWith('#'));
        if (firstParagraph) {
          metadata.description = firstParagraph.trim().substring(0, 500);
        }
      }
    }

    // Extract status from content patterns
    if (metadata.status === 'To Do') {
      const statusPatterns = {
        'Done': /✅|completed?|finished?|done/i,
        'In Progress': /🔄|in progress|working|started/i,
        'Review': /👀|review|pending review|needs review/i
      };

      for (const [status, pattern] of Object.entries(statusPatterns)) {
        if (pattern.test(contentWithoutFrontmatter)) {
          metadata.status = status;
          break;
        }
      }
    }

    // Extract tags from content
    const tagMatches = contentWithoutFrontmatter.match(/#[\w-]+/g);
    if (tagMatches) {
      const contentTags = tagMatches.map(tag => tag.substring(1));
      metadata.tags = [...new Set([...metadata.tags, ...contentTags])];
    }
  }

  /**
   * Extract Kanban-specific metadata
   */
  extractKanbanMetadata(metadata) {
    const frontmatter = metadata.frontmatter;
    
    // Check for existing Kanban metadata
    if (frontmatter.kanban) {
      metadata.kanban = { ...metadata.kanban, ...frontmatter.kanban };
    }

    // Check individual Kanban fields
    if (frontmatter.kanbanStatus) metadata.kanban.column = frontmatter.kanbanStatus;
    if (frontmatter.kanbanBoard) metadata.kanban.boardId = frontmatter.kanbanBoard;
    if (frontmatter.kanbanCardId) metadata.kanban.cardId = frontmatter.kanbanCardId;
    if (frontmatter.kanbanCreated) metadata.kanban.created = new Date(frontmatter.kanbanCreated);
    if (frontmatter.kanbanCompleted) metadata.kanban.completed = new Date(frontmatter.kanbanCompleted);
    if (frontmatter.kanbanLastSync) metadata.kanban.lastSync = new Date(frontmatter.kanbanLastSync);

    // Set synced flag if we have a card ID
    metadata.kanban.synced = !!metadata.kanban.cardId;

    // Map status to Kanban column
    if (!metadata.kanban.cardId) {
      metadata.kanban.column = this.mapStatusToColumn(metadata.status);
    }
  }

  /**
   * Map task status to Kanban column
   */
  mapStatusToColumn(status) {
    const statusMap = {
      'To Do': 'To Do',
      'In Progress': 'In Progress',
      'Review': 'Review',
      'Done': 'Done',
      'Completed': 'Done',
      'Finished': 'Done'
    };

    return statusMap[status] || 'To Do';
  }

  /**
   * Generate unique task ID from file path
   */
  generateTaskId(filePath) {
    const relativePath = path.relative(this.projectRoot, filePath);
    return Buffer.from(relativePath).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
  }

  /**
   * Remove duplicate tasks based on filename
   */
  deduplicateTasks(tasks) {
    const seen = new Map();
    const unique = [];

    for (const task of tasks) {
      const key = task.filename.toLowerCase();
      
      if (!seen.has(key)) {
        seen.set(key, task);
        unique.push(task);
      } else {
        // Prefer files in Big Book over project root
        const existing = seen.get(key);
        if (task.filepath.includes('/mnt/bigbook_secure') && !existing.filepath.includes('/mnt/bigbook_secure')) {
          seen.set(key, task);
          const index = unique.findIndex(t => t.filename.toLowerCase() === key);
          if (index !== -1) {
            unique[index] = task;
          }
        }
      }
    }

    return unique;
  }

  /**
   * Update task metadata with Kanban information
   */
  async updateTaskMetadata(taskId, kanbanData) {
    try {
      const tasks = await this.discoverTasks();
      const task = tasks.find(t => t.id === taskId);
      
      if (!task) {
        throw new Error(`Task with ID ${taskId} not found`);
      }

      // Update metadata
      task.kanban = { ...task.kanban, ...kanbanData };
      task.kanban.lastSync = new Date();
      task.kanban.synced = true;

      // Update frontmatter in file
      await this.updateTaskFile(task);

      logger.info(`Updated task metadata for ${task.filename}`);
      return task;
    } catch (error) {
      logger.error(`Failed to update task metadata for ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Update task file with new metadata
   */
  async updateTaskFile(task) {
    try {
      let content = task.content;
      const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
      
      // Create updated frontmatter
      const updatedFrontmatter = {
        ...task.frontmatter,
        title: task.title,
        status: task.status,
        priority: task.priority,
        tags: task.tags,
        kanbanStatus: task.kanban.column,
        kanbanBoard: task.kanban.boardId,
        kanbanCardId: task.kanban.cardId,
        kanbanLastSync: task.kanban.lastSync ? task.kanban.lastSync.toISOString() : null,
        kanbanCreated: task.kanban.created ? task.kanban.created.toISOString() : new Date().toISOString(),
        kanbanCompleted: task.kanban.completed ? task.kanban.completed.toISOString() : null
      };

      const frontmatterYaml = yaml.dump(updatedFrontmatter, { 
        indent: 2,
        lineWidth: -1,
        noRefs: true 
      });

      if (frontmatterRegex.test(content)) {
        // Replace existing frontmatter
        content = content.replace(frontmatterRegex, `---\n${frontmatterYaml}---\n\n`);
      } else {
        // Add frontmatter to beginning
        content = `---\n${frontmatterYaml}---\n\n${content}`;
      }

      // Write updated content
      await fs.writeFile(task.filepath, content, 'utf8');
      
      // Update task object
      task.content = content;
      task.frontmatter = updatedFrontmatter;
      task.modifiedAt = new Date();

      logger.debug(`Updated task file: ${task.filepath}`);
    } catch (error) {
      logger.error(`Failed to update task file ${task.filepath}:`, error);
      throw error;
    }
  }

  /**
   * Create a new task file
   */
  async createTaskFile(taskData) {
    try {
      const { title, description, status = 'To Do', priority = 'medium', tags = [] } = taskData;
      
      // Generate filename
      const sanitizedTitle = title.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '_');
      const filename = `task_${sanitizedTitle}.md`;
      const filepath = path.join(this.bigBookPath, 'Tasks', filename);

      // Ensure directory exists
      await fs.mkdir(path.dirname(filepath), { recursive: true });

      // Create frontmatter
      const frontmatter = {
        title,
        description,
        status,
        priority,
        tags,
        created: new Date().toISOString(),
        kanbanStatus: this.mapStatusToColumn(status),
        kanbanBoard: 'dev',
        kanbanCreated: new Date().toISOString()
      };

      // Create content
      const content = `---
${yaml.dump(frontmatter, { indent: 2, lineWidth: -1, noRefs: true })}---

# ${title}

## Objective

${description}

## Status

Current status: **${status}**

## Tasks

- [ ] Task item 1
- [ ] Task item 2
- [ ] Task item 3

## Notes

Add implementation notes here...

---
*Created: ${new Date().toLocaleString()}*
`;

      await fs.writeFile(filepath, content, 'utf8');
      
      logger.info(`Created new task file: ${filename}`);
      
      // Return task metadata
      return await this.extractTaskMetadata(filepath);
    } catch (error) {
      logger.error('Failed to create task file:', error);
      throw error;
    }
  }

  /**
   * Get task statistics
   */
  async getTaskStatistics() {
    try {
      const tasks = await this.discoverTasks();
      
      const stats = {
        total: tasks.length,
        byStatus: {},
        byPriority: {},
        syncStatus: {
          synced: 0,
          unsynced: 0,
          errors: 0
        },
        locations: {
          bigBook: 0,
          projectRoot: 0
        }
      };

      tasks.forEach(task => {
        // By status
        stats.byStatus[task.status] = (stats.byStatus[task.status] || 0) + 1;
        
        // By priority
        stats.byPriority[task.priority] = (stats.byPriority[task.priority] || 0) + 1;
        
        // Sync status
        if (task.kanban.synced) {
          stats.syncStatus.synced++;
        } else {
          stats.syncStatus.unsynced++;
        }
        
        if (task.kanban.syncErrors.length > 0) {
          stats.syncStatus.errors++;
        }
        
        // Locations
        if (task.filepath.includes('/mnt/bigbook_secure')) {
          stats.locations.bigBook++;
        } else {
          stats.locations.projectRoot++;
        }
      });

      return stats;
    } catch (error) {
      logger.error('Failed to get task statistics:', error);
      throw error;
    }
  }

  /**
   * Search tasks by criteria
   */
  async searchTasks(criteria = {}) {
    try {
      const tasks = await this.discoverTasks();
      let filtered = tasks;

      // Filter by status
      if (criteria.status) {
        filtered = filtered.filter(task => task.status === criteria.status);
      }

      // Filter by priority
      if (criteria.priority) {
        filtered = filtered.filter(task => task.priority === criteria.priority);
      }

      // Filter by tags
      if (criteria.tags && criteria.tags.length > 0) {
        filtered = filtered.filter(task => 
          criteria.tags.some(tag => task.tags.includes(tag))
        );
      }

      // Filter by sync status
      if (criteria.synced !== undefined) {
        filtered = filtered.filter(task => task.kanban.synced === criteria.synced);
      }

      // Text search
      if (criteria.search) {
        const searchTerm = criteria.search.toLowerCase();
        filtered = filtered.filter(task => 
          task.title.toLowerCase().includes(searchTerm) ||
          task.description.toLowerCase().includes(searchTerm) ||
          task.filename.toLowerCase().includes(searchTerm)
        );
      }

      // Sort results
      if (criteria.sortBy) {
        filtered.sort((a, b) => {
          const aVal = this.getNestedValue(a, criteria.sortBy);
          const bVal = this.getNestedValue(b, criteria.sortBy);
          
          if (criteria.sortOrder === 'desc') {
            return bVal > aVal ? 1 : -1;
          }
          return aVal > bVal ? 1 : -1;
        });
      }

      // Limit results
      if (criteria.limit) {
        filtered = filtered.slice(0, criteria.limit);
      }

      return filtered;
    } catch (error) {
      logger.error('Failed to search tasks:', error);
      throw error;
    }
  }

  /**
   * Get nested object value by path
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current && current[key], obj);
  }

  /**
   * Validate task data
   */
  validateTaskData(taskData) {
    const errors = [];

    if (!taskData.title || taskData.title.trim().length === 0) {
      errors.push('Title is required');
    }

    if (taskData.status && !this.kanbanMetadata.columns.includes(taskData.status)) {
      errors.push(`Invalid status: ${taskData.status}. Must be one of: ${this.kanbanMetadata.columns.join(', ')}`);
    }

    if (taskData.priority && !['low', 'medium', 'high', 'critical'].includes(taskData.priority)) {
      errors.push('Invalid priority. Must be one of: low, medium, high, critical');
    }

    return errors;
  }
}

module.exports = TaskDiscoveryService; 