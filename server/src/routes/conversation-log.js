const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// All directories to scan for conversation files
const CONVERSATION_SOURCES = [
  { dir: '/var/www/orthodoxmetrics/prod/c0', label: 'c0' },
  { dir: '/var/www/orthodoxmetrics/prod/c1', label: 'c1' },
  { dir: '/var/www/orthodoxmetrics/prod/c2', label: 'c2' },
  { dir: '/var/www/orthodoxmetrics/prod/c3', label: 'c3' },
  { dir: '/var/www/orthodoxmetrics/prod/ws', label: 'ws' },
];

function getAvailableSources() {
  return CONVERSATION_SOURCES.filter(s => fs.existsSync(s.dir));
}

// Collect all .md files across all source directories
function getAllConversationFiles() {
  const sources = getAvailableSources();
  const allFiles = [];
  for (const source of sources) {
    const files = fs.readdirSync(source.dir).filter(f => f.endsWith('.md'));
    for (const file of files) {
      allFiles.push({ filename: file, dir: source.dir, source: source.label });
    }
  }
  return allFiles;
}

// Find a file across all source directories
function findConversationFile(filename) {
  for (const source of getAvailableSources()) {
    const filePath = path.join(source.dir, filename);
    if (fs.existsSync(filePath)) {
      return { filePath, source: source.label };
    }
  }
  return null;
}

// Detect format: 'standard' (c1/c2 emoji headers) or 'cascade' (ws ### headers)
function detectFormat(content) {
  if (content.includes('## 👤 User') || content.includes('## 🤖 Claude')) return 'standard';
  if (content.includes('### User Input') || content.includes('### Planner Response')) return 'cascade';
  return 'unknown';
}

function parseConversationFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const format = detectFormat(content);

  if (format === 'cascade') {
    return parseCascadeFormat(content);
  }
  return parseStandardFormat(content);
}

// Parse c1/c2 format: ## 👤 User / ## 🤖 Claude
function parseStandardFormat(content) {
  const lines = content.split('\n');
  let sessionId = '';
  let date = '';
  const messages = [];
  let currentRole = null;
  let currentContent = [];

  for (const line of lines) {
    const sessionMatch = line.match(/^Session ID:\s*(.+)$/);
    if (sessionMatch) { sessionId = sessionMatch[1].trim(); continue; }
    const dateMatch = line.match(/^Date:\s*(.+)$/);
    if (dateMatch) { date = dateMatch[1].trim(); continue; }

    if (line.startsWith('## 👤 User')) {
      if (currentRole !== null && currentContent.length > 0) {
        const text = currentContent.join('\n').trim();
        if (text && text !== '(no content)') messages.push({ role: currentRole, content: text });
      }
      currentRole = 'user';
      currentContent = [];
      continue;
    }
    if (line.startsWith('## 🤖 Claude')) {
      if (currentRole !== null && currentContent.length > 0) {
        const text = currentContent.join('\n').trim();
        if (text && text !== '(no content)') messages.push({ role: currentRole, content: text });
      }
      currentRole = 'assistant';
      currentContent = [];
      continue;
    }
    if (line === '---' || line.startsWith('# Claude Conversation Log')) continue;
    if (currentRole !== null) currentContent.push(line);
  }

  if (currentRole !== null && currentContent.length > 0) {
    const text = currentContent.join('\n').trim();
    if (text && text !== '(no content)') messages.push({ role: currentRole, content: text });
  }

  return { sessionId, date, messages, format: 'standard' };
}

// Parse ws format: ### User Input / ### Planner Response
function parseCascadeFormat(content) {
  const lines = content.split('\n');
  const messages = [];
  let currentRole = null;
  let currentContent = [];

  // Try to extract title from first heading
  const titleMatch = content.match(/^# (.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : '';

  for (const line of lines) {
    if (line.startsWith('### User Input')) {
      if (currentRole !== null && currentContent.length > 0) {
        const text = currentContent.join('\n').trim();
        if (text && text !== '(no content)') messages.push({ role: currentRole, content: text });
      }
      currentRole = 'user';
      currentContent = [];
      continue;
    }
    if (line.startsWith('### Planner Response')) {
      if (currentRole !== null && currentContent.length > 0) {
        const text = currentContent.join('\n').trim();
        if (text && text !== '(no content)') messages.push({ role: currentRole, content: text });
      }
      currentRole = 'assistant';
      currentContent = [];
      continue;
    }
    if (line.startsWith('# Cascade Chat Conversation')) continue;
    if (line.trim().startsWith('Note: _This is purely')) continue;
    if (currentRole !== null) currentContent.push(line);
  }

  if (currentRole !== null && currentContent.length > 0) {
    const text = currentContent.join('\n').trim();
    if (text && text !== '(no content)') messages.push({ role: currentRole, content: text });
  }

  return { sessionId: '', date: '', title, messages, format: 'cascade' };
}

// Count messages for both formats
function countMessages(content) {
  const format = detectFormat(content);
  let userCount = 0;
  let assistantCount = 0;
  if (format === 'cascade') {
    userCount = (content.match(/### User Input/g) || []).length;
    assistantCount = (content.match(/### Planner Response/g) || []).length;
  } else {
    userCount = (content.match(/## 👤 User/g) || []).length;
    assistantCount = (content.match(/## 🤖 Claude/g) || []).length;
  }
  return { userCount, assistantCount, format };
}

// Extract preview from content (first user message)
function extractPreview(content, format) {
  let preview = '';
  if (format === 'cascade') {
    const match = content.match(/### User Input\n\n([\s\S]*?)(?=\n### Planner Response|$)/);
    if (match) preview = match[1].trim().replace(/<[^>]+>/g, '').substring(0, 200);
  } else {
    const match = content.match(/## 👤 User\n\n([\s\S]*?)(?=\n---|\n## 🤖)/);
    if (match) preview = match[1].trim().replace(/<[^>]+>/g, '').substring(0, 200);
  }
  return preview;
}

// GET /api/conversation-log/list — list all conversations with metadata
router.get('/list', (req, res) => {
  try {
    const sources = getAvailableSources();
    if (sources.length === 0) {
      return res.status(404).json({ success: false, error: 'No conversation directories found' });
    }

    const allFiles = getAllConversationFiles();
    const conversations = [];

    for (const entry of allFiles) {
      const filePath = path.join(entry.dir, entry.filename);
      const stat = fs.statSync(filePath);

      // Extract date from filename: claude-conversation-YYYY-MM-DD-*.md
      const dateMatch = entry.filename.match(/claude-conversation-(\d{4}-\d{2}-\d{2})/);
      let fileDate = dateMatch ? dateMatch[1] : '';

      // For ws files without date in filename, use file mtime
      if (!fileDate && entry.source === 'ws') {
        const d = stat.mtime;
        fileDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }

      const isAgent = entry.filename.includes('-agent-');

      const content = fs.readFileSync(filePath, 'utf-8');
      const sessionMatch = content.match(/Session ID:\s*(.+)/);
      const dateLineMatch = content.match(/Date:\s*(.+)/);
      const { userCount, assistantCount, format } = countMessages(content);
      const preview = extractPreview(content, format);

      // For cascade (ws) files, extract title from first heading
      let title = '';
      if (format === 'cascade') {
        const titleMatch = content.match(/^# (.+)$/m);
        title = titleMatch ? titleMatch[1].trim() : '';
      }

      conversations.push({
        filename: entry.filename,
        fileDate,
        sessionId: sessionMatch ? sessionMatch[1].trim() : '',
        date: dateLineMatch ? dateLineMatch[1].trim() : '',
        size: stat.size,
        isAgent,
        preview,
        messageCount: userCount + assistantCount,
        userMessages: userCount,
        assistantMessages: assistantCount,
        source: entry.source,
        format,
        title,
      });
    }

    // Group by date
    const byDate = {};
    for (const conv of conversations) {
      const d = conv.fileDate || 'unknown';
      if (!byDate[d]) byDate[d] = [];
      byDate[d].push(conv);
    }

    res.json({
      success: true,
      total: conversations.length,
      sourceDirs: sources.map(s => s.dir),
      conversations,
      byDate,
    });
  } catch (error) {
    console.error('[ConversationLog] Error listing conversations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/conversation-log/detail/:filename — get full parsed conversation
router.get('/detail/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    // Security: prevent path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ success: false, error: 'Invalid filename' });
    }

    const found = findConversationFile(filename);
    if (!found) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    const parsed = parseConversationFile(found.filePath);
    const stat = fs.statSync(found.filePath);

    res.json({
      success: true,
      filename,
      size: stat.size,
      source: found.source,
      ...parsed,
    });
  } catch (error) {
    console.error('[ConversationLog] Error reading conversation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/conversation-log/search?q=... — search across all conversations
router.get('/search', (req, res) => {
  try {
    const sources = getAvailableSources();
    if (sources.length === 0) {
      return res.status(404).json({ success: false, error: 'No conversation directories found' });
    }

    const query = (req.query.q || '').toLowerCase().trim();
    if (!query) {
      return res.status(400).json({ success: false, error: 'Search query required (?q=...)' });
    }

    const allFiles = getAllConversationFiles();
    const results = [];

    for (const entry of allFiles) {
      const filePath = path.join(entry.dir, entry.filename);
      const content = fs.readFileSync(filePath, 'utf-8');

      if (!content.toLowerCase().includes(query)) continue;

      const parsed = parseConversationFile(filePath);

      // Find matching messages
      const matchingMessages = [];
      for (let i = 0; i < parsed.messages.length; i++) {
        const msg = parsed.messages[i];
        if (msg.content.toLowerCase().includes(query)) {
          const idx = msg.content.toLowerCase().indexOf(query);
          const start = Math.max(0, idx - 100);
          const end = Math.min(msg.content.length, idx + query.length + 100);
          const snippet = (start > 0 ? '...' : '') + msg.content.substring(start, end) + (end < msg.content.length ? '...' : '');

          matchingMessages.push({
            index: i,
            role: msg.role,
            snippet,
          });
        }
      }

      if (matchingMessages.length > 0) {
        results.push({
          filename: entry.filename,
          sessionId: parsed.sessionId,
          date: parsed.date,
          source: entry.source,
          matchCount: matchingMessages.length,
          matches: matchingMessages,
        });
      }
    }

    res.json({
      success: true,
      query,
      resultCount: results.length,
      results,
    });
  } catch (error) {
    console.error('[ConversationLog] Error searching:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/conversation-log/stats — aggregate stats
router.get('/stats', (req, res) => {
  try {
    const sources = getAvailableSources();
    if (sources.length === 0) {
      return res.status(404).json({ success: false, error: 'No conversation directories found' });
    }

    const allFiles = getAllConversationFiles();
    let totalSize = 0;
    let totalMessages = 0;
    let totalUserMessages = 0;
    let totalAssistantMessages = 0;
    const dates = new Set();
    let agentCount = 0;
    let directCount = 0;
    let cascadeCount = 0;
    let standardCount = 0;
    const sourceCounts = {};

    for (const entry of allFiles) {
      const filePath = path.join(entry.dir, entry.filename);
      const stat = fs.statSync(filePath);
      totalSize += stat.size;

      const content = fs.readFileSync(filePath, 'utf-8');
      const { userCount, assistantCount, format } = countMessages(content);
      totalMessages += userCount + assistantCount;
      totalUserMessages += userCount;
      totalAssistantMessages += assistantCount;

      if (format === 'cascade') cascadeCount++;
      else standardCount++;

      sourceCounts[entry.source] = (sourceCounts[entry.source] || 0) + 1;

      const dateMatch = entry.filename.match(/claude-conversation-(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) dates.add(dateMatch[1]);

      if (entry.filename.includes('-agent-')) agentCount++;
      else directCount++;
    }

    res.json({
      success: true,
      totalConversations: allFiles.length,
      totalMessages,
      totalUserMessages,
      totalAssistantMessages,
      totalSizeBytes: totalSize,
      totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
      uniqueDates: dates.size,
      dateRange: {
        first: [...dates].sort()[0] || null,
        last: [...dates].sort().pop() || null,
      },
      agentConversations: agentCount,
      directConversations: directCount,
      cascadeConversations: cascadeCount,
      standardConversations: standardCount,
      sourceCounts,
    });
  } catch (error) {
    console.error('[ConversationLog] Error getting stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== TASK CHECKLIST =====
const TASKS_FILE = path.join('/var/www/orthodoxmetrics/prod', 'conversation-tasks.json');

function loadTasks() {
  try {
    if (fs.existsSync(TASKS_FILE)) {
      return JSON.parse(fs.readFileSync(TASKS_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('[ConversationLog] Error loading tasks:', err);
  }
  return [];
}

function saveTasks(tasks) {
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2), 'utf-8');
}

// GET /api/conversation-log/tasks — list all tasks
router.get('/tasks', (req, res) => {
  try {
    const tasks = loadTasks();
    res.json({ success: true, tasks });
  } catch (error) {
    console.error('[ConversationLog] Error loading tasks:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/conversation-log/tasks/:id — update a task (toggle completed, edit text, etc.)
router.put('/tasks/:id', (req, res) => {
  try {
    const tasks = loadTasks();
    const task = tasks.find(t => t.id === req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    if (req.body.completed !== undefined) task.completed = req.body.completed;
    if (req.body.text !== undefined) task.text = req.body.text;
    if (req.body.notes !== undefined) task.notes = req.body.notes;
    task.updatedAt = new Date().toISOString();
    saveTasks(tasks);
    res.json({ success: true, task });
  } catch (error) {
    console.error('[ConversationLog] Error updating task:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/conversation-log/tasks — add a new task
router.post('/tasks', (req, res) => {
  try {
    const tasks = loadTasks();
    const { text, source, category, notes } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, error: 'Task text required' });
    }
    const task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      text,
      source: source || 'manual',
      category: category || 'general',
      completed: false,
      notes: notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    tasks.push(task);
    saveTasks(tasks);
    res.json({ success: true, task });
  } catch (error) {
    console.error('[ConversationLog] Error adding task:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/conversation-log/tasks/:id — delete a task
router.delete('/tasks/:id', (req, res) => {
  try {
    let tasks = loadTasks();
    const idx = tasks.findIndex(t => t.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    tasks.splice(idx, 1);
    saveTasks(tasks);
    res.json({ success: true });
  } catch (error) {
    console.error('[ConversationLog] Error deleting task:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/conversation-log/combine-export — combine all conversations for a date into a single .md and return it
router.post('/combine-export', (req, res) => {
  try {
    const { date, filenames } = req.body;
    if (!date && (!filenames || !filenames.length)) {
      return res.status(400).json({ success: false, error: 'date or filenames required' });
    }

    let targetFiles = [];
    if (filenames && filenames.length) {
      // Specific files requested
      for (const fn of filenames) {
        if (fn.includes('..') || fn.includes('/') || fn.includes('\\')) continue;
        const found = findConversationFile(fn);
        if (found) targetFiles.push({ filename: fn, ...found });
      }
    } else {
      // All files for a date
      const allFiles = getAllConversationFiles();
      for (const entry of allFiles) {
        const dateMatch = entry.filename.match(/claude-conversation-(\d{4}-\d{2}-\d{2})/);
        let fileDate = dateMatch ? dateMatch[1] : '';
        if (!fileDate && entry.source === 'ws') {
          const stat = fs.statSync(path.join(entry.dir, entry.filename));
          const d = stat.mtime;
          fileDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }
        if (fileDate === date) {
          targetFiles.push({ filename: entry.filename, filePath: path.join(entry.dir, entry.filename), source: entry.source });
        }
      }
    }

    if (targetFiles.length === 0) {
      return res.status(404).json({ success: false, error: 'No conversations found for the specified criteria' });
    }

    // Sort by filename (chronological for dated files)
    targetFiles.sort((a, b) => a.filename.localeCompare(b.filename));

    // Build combined markdown
    const parts = [];
    const targetDate = date || 'combined';
    parts.push(`# Conversation Log — ${targetDate}`);
    parts.push('');
    parts.push(`> ${targetFiles.length} conversation(s) combined`);
    parts.push('');
    parts.push('---');
    parts.push('');

    for (let i = 0; i < targetFiles.length; i++) {
      const tf = targetFiles[i];
      const parsed = parseConversationFile(tf.filePath);
      const stat = fs.statSync(tf.filePath);
      const sizeKB = (stat.size / 1024).toFixed(1);

      parts.push(`## Conversation ${i + 1}: ${parsed.title || tf.filename}`);
      parts.push('');
      parts.push(`- **Source:** ${tf.source}`);
      parts.push(`- **File:** ${tf.filename}`);
      parts.push(`- **Size:** ${sizeKB} KB`);
      parts.push(`- **Messages:** ${parsed.messages.length}`);
      if (parsed.sessionId) parts.push(`- **Session:** ${parsed.sessionId}`);
      parts.push('');

      for (const msg of parsed.messages) {
        if (msg.role === 'user') {
          parts.push('### 👤 User');
        } else {
          parts.push('### 🤖 Assistant');
        }
        parts.push('');
        parts.push(msg.content);
        parts.push('');
      }

      if (i < targetFiles.length - 1) {
        parts.push('---');
        parts.push('');
      }
    }

    const markdown = parts.join('\n');
    const exportFilename = `conversations-${targetDate}.md`;

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${exportFilename}"`);
    res.send(markdown);
  } catch (error) {
    console.error('[ConversationLog] Error combining/exporting:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/conversation-log/export/:filename — export a single conversation as .md
router.get('/export/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ success: false, error: 'Invalid filename' });
    }
    const found = findConversationFile(filename);
    if (!found) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }
    const content = fs.readFileSync(found.filePath, 'utf-8');
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);
  } catch (error) {
    console.error('[ConversationLog] Error exporting:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== BULK EXPORT COMPLETED TASKS → OM DAILY PIPELINE =====

// Map conversation task categories to OM Daily categories and branch types
const CATEGORY_TO_BRANCH_TYPE = {
  'OCR': 'existing_feature',
  'OCR Studio': 'existing_feature',
  'Records': 'existing_feature',
  'UI/UX': 'existing_feature',
  'Admin': 'existing_feature',
  'Church Management': 'existing_feature',
  'Developer Tools': 'new_feature',
  'Auth / UI': 'existing_feature',
  'Auth / Security': 'existing_feature',
  'Auth / Routing': 'existing_feature',
  'Backend API': 'existing_feature',
  'Backend': 'existing_feature',
  'Icons / Build': 'patch',
  'Build': 'patch',
  'DevOps': 'patch',
  'Cleanup': 'patch',
  'Refactoring': 'patch',
  'Recovery': 'bugfix',
  'Testing': 'patch',
};

const CATEGORY_TO_OM_CATEGORY = {
  'OCR': 'ocr',
  'OCR Studio': 'ocr',
  'Records': 'records',
  'UI/UX': 'frontend',
  'Admin': 'admin',
  'Church Management': 'churches',
  'Developer Tools': 'devtools',
  'Auth / UI': 'auth',
  'Auth / Security': 'auth',
  'Auth / Routing': 'auth',
  'Backend API': 'backend',
  'Backend': 'backend',
  'Icons / Build': 'build',
  'Build': 'build',
  'DevOps': 'devops',
  'Cleanup': 'maintenance',
  'Refactoring': 'maintenance',
  'Recovery': 'maintenance',
  'Testing': 'testing',
};

// Detect if task text indicates a bug fix
function isBugFix(text) {
  return /\b(fix|bug|crash|broken|error|fail|regression|404|500|missing|undefined)\b/i.test(text);
}

/**
 * POST /api/conversation-log/tasks/export-completed-to-pipeline
 * Bulk-export completed conversation tasks to OM Daily pipeline items.
 * Skips tasks that already exist in om_daily_items (by matching title).
 * Options:
 *   - agent_tool: default agent tool for all items
 *   - horizon: default horizon (default '7')
 *   - auto_branch: if true, also sets branch_type based on category
 *   - dry_run: if true, returns what would be created without actually creating
 */
router.post('/tasks/export-completed-to-pipeline', async (req, res) => {
  try {
    const { agent_tool, horizon = '7', auto_branch = true, dry_run = false } = req.body;
    const { promisePool } = require('../config/db');

    // Load completed tasks
    const allTasks = loadTasks();
    const completedTasks = allTasks.filter(t => t.completed);

    if (completedTasks.length === 0) {
      return res.json({ success: true, message: 'No completed tasks to export', created: [], skipped: 0 });
    }

    // Get existing OM Daily titles to avoid duplicates
    const [existingRows] = await promisePool.query(
      'SELECT title FROM om_daily_items WHERE source = ? OR conversation_ref IS NOT NULL',
      ['conversation']
    );
    const existingTitles = new Set(existingRows.map(r => r.title.toLowerCase().trim()));

    const toCreate = [];
    let skipped = 0;

    for (const task of completedTasks) {
      const title = task.text.trim();
      if (existingTitles.has(title.toLowerCase())) {
        skipped++;
        continue;
      }

      const category = task.category || 'general';
      const omCategory = CATEGORY_TO_OM_CATEGORY[category] || category.toLowerCase().replace(/[^a-z0-9]/g, '_');
      let branchType = null;

      if (auto_branch) {
        // Bug fix detection overrides category mapping
        if (isBugFix(title)) {
          branchType = 'bugfix';
        } else {
          branchType = CATEGORY_TO_BRANCH_TYPE[category] || 'existing_feature';
        }
      }

      toCreate.push({
        title,
        task_type: 'task',
        description: task.notes || null,
        horizon,
        status: 'done',
        priority: 'medium',
        category: omCategory,
        source: 'conversation',
        agent_tool: agent_tool || null,
        branch_type: branchType,
        conversation_ref: task.source || null,
        metadata: JSON.stringify({
          original_task_id: task.id,
          original_category: category,
          imported_from: 'conversation-tasks',
          imported_at: new Date().toISOString(),
        }),
      });
    }

    if (dry_run) {
      return res.json({
        success: true,
        dry_run: true,
        would_create: toCreate.length,
        skipped,
        items: toCreate.map(i => ({ title: i.title, category: i.category, branch_type: i.branch_type, conversation_ref: i.conversation_ref })),
      });
    }

    // Actually create the items
    const created = [];
    for (const item of toCreate) {
      const [result] = await promisePool.query(
        `INSERT INTO om_daily_items (title, task_type, description, horizon, status, priority, category, source, agent_tool, branch_type, conversation_ref, metadata, created_by, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          item.title,
          item.task_type,
          item.description,
          item.horizon,
          item.status,
          item.priority,
          item.category,
          item.source,
          item.agent_tool,
          item.branch_type,
          item.conversation_ref,
          item.metadata,
          req.session?.user?.id || null,
        ]
      );
      created.push({ id: result.insertId, title: item.title, category: item.category, branch_type: item.branch_type });
    }

    console.log(`[ConversationLog] Exported ${created.length} completed tasks to OM Daily pipeline (${skipped} skipped as duplicates)`);
    res.json({ success: true, created, count: created.length, skipped });
  } catch (error) {
    console.error('[ConversationLog] Error exporting completed tasks to pipeline:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== CONVERSATION REVIEW & INSIGHTS =====

/**
 * Intelligently extract key insights from a conversation.
 * Identifies: decisions made, tasks/TODOs, files changed, features built,
 * bugs fixed, architectural decisions, and actionable follow-ups.
 */
function extractInsights(messages) {
  const insights = {
    decisions: [],
    tasks: [],
    filesChanged: [],
    featuresBuilt: [],
    bugsFixed: [],
    architecturalNotes: [],
    followUps: [],
    keyExchanges: [],
    summary: '',
  };

  const filePatterns = /(?:(?:created?|modified?|updated?|edited?|changed?|added?|deleted?|removed?)\s+(?:file\s+)?)?(?:`([^`]+\.[a-zA-Z]{1,10})`|(\S+\.[tj]sx?|\S+\.js|\S+\.ts|\S+\.css|\S+\.json|\S+\.sql|\S+\.py))/gi;
  const todoPatterns = /(?:TODO|FIXME|HACK|NOTE|IMPORTANT|NEXT|FOLLOW[- ]?UP)[\s:]+(.+)/gi;
  const decisionPatterns = /(?:(?:we(?:'ll| will| should)|let(?:'s| us)|I(?:'ll| will)|decided? to|going to|plan to|approach(?:ing)?|strategy|solution)\s+)(.{20,200})/gi;
  const bugPatterns = /(?:fix(?:ed|ing)?|bug|issue|error|broken|crash|fail(?:ed|ing)?|resolv(?:ed|ing))\s+(.{10,200})/gi;
  const featurePatterns = /(?:add(?:ed|ing)?|implement(?:ed|ing)?|built?|creat(?:ed|ing)?|introduc(?:ed|ing)?|new\s+(?:feature|component|endpoint|page|tab|dialog|modal))\s+(.{10,200})/gi;

  const seenFiles = new Set();
  const seenDecisions = new Set();
  const seenTasks = new Set();

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const content = msg.content || '';
    const isAssistant = msg.role === 'assistant';

    // Extract file references
    let fileMatch;
    while ((fileMatch = filePatterns.exec(content)) !== null) {
      const file = (fileMatch[1] || fileMatch[2] || '').trim();
      if (file && !seenFiles.has(file) && file.length < 200 && !file.startsWith('http')) {
        seenFiles.add(file);
        insights.filesChanged.push(file);
      }
    }

    // Extract TODOs/follow-ups
    let todoMatch;
    while ((todoMatch = todoPatterns.exec(content)) !== null) {
      const task = todoMatch[1].trim().substring(0, 200);
      if (task && !seenTasks.has(task.toLowerCase())) {
        seenTasks.add(task.toLowerCase());
        insights.tasks.push({ text: task, source: msg.role, messageIndex: i });
      }
    }

    // Extract decisions (from assistant messages primarily)
    if (isAssistant) {
      let decMatch;
      while ((decMatch = decisionPatterns.exec(content)) !== null) {
        const dec = decMatch[1].trim().replace(/[.!,;]+$/, '').substring(0, 200);
        if (dec && !seenDecisions.has(dec.toLowerCase().substring(0, 50))) {
          seenDecisions.add(dec.toLowerCase().substring(0, 50));
          insights.decisions.push(dec);
        }
      }

      // Extract bug fixes
      let bugMatch;
      while ((bugMatch = bugPatterns.exec(content)) !== null) {
        const bug = bugMatch[1].trim().replace(/[.!,;]+$/, '').substring(0, 200);
        if (bug.length > 15) {
          insights.bugsFixed.push(bug);
        }
      }

      // Extract features
      let featMatch;
      while ((featMatch = featurePatterns.exec(content)) !== null) {
        const feat = featMatch[1].trim().replace(/[.!,;]+$/, '').substring(0, 200);
        if (feat.length > 15) {
          insights.featuresBuilt.push(feat);
        }
      }
    }

    // Identify key exchanges (user asks something substantial, assistant gives substantial answer)
    if (!isAssistant && content.length > 50 && i + 1 < messages.length && messages[i + 1].role === 'assistant') {
      const userSnippet = content.substring(0, 300).replace(/\n/g, ' ').trim();
      const assistantContent = messages[i + 1].content || '';
      const assistantSnippet = assistantContent.substring(0, 300).replace(/\n/g, ' ').trim();

      // Only include exchanges where both sides are substantial
      if (assistantContent.length > 100) {
        insights.keyExchanges.push({
          userMessage: userSnippet,
          assistantMessage: assistantSnippet,
          messageIndex: i,
        });
      }
    }
  }

  // Deduplicate and limit
  insights.filesChanged = [...new Set(insights.filesChanged)].slice(0, 50);
  insights.decisions = insights.decisions.slice(0, 15);
  insights.tasks = insights.tasks.slice(0, 20);
  insights.bugsFixed = [...new Set(insights.bugsFixed)].slice(0, 10);
  insights.featuresBuilt = [...new Set(insights.featuresBuilt)].slice(0, 10);
  insights.keyExchanges = insights.keyExchanges.slice(0, 10);

  // Build auto-summary
  const parts = [];
  if (insights.featuresBuilt.length > 0) parts.push(`${insights.featuresBuilt.length} feature(s) built`);
  if (insights.bugsFixed.length > 0) parts.push(`${insights.bugsFixed.length} bug(s) fixed`);
  if (insights.filesChanged.length > 0) parts.push(`${insights.filesChanged.length} file(s) touched`);
  if (insights.tasks.length > 0) parts.push(`${insights.tasks.length} follow-up task(s)`);
  if (insights.decisions.length > 0) parts.push(`${insights.decisions.length} decision(s) made`);
  insights.summary = parts.join(', ') || 'No significant insights detected';

  return insights;
}

// GET /api/conversation-log/review/:filename — extract insights from a conversation
router.get('/review/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ success: false, error: 'Invalid filename' });
    }

    const found = findConversationFile(filename);
    if (!found) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    const parsed = parseConversationFile(found.filePath);
    const stat = fs.statSync(found.filePath);
    const insights = extractInsights(parsed.messages);

    res.json({
      success: true,
      filename,
      title: parsed.title || '',
      date: parsed.date || '',
      sessionId: parsed.sessionId || '',
      source: found.source,
      format: parsed.format,
      size: stat.size,
      messageCount: parsed.messages.length,
      insights,
    });
  } catch (error) {
    console.error('[ConversationLog] Error reviewing conversation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/conversation-log/review/batch — review multiple conversations at once
router.post('/review/batch', (req, res) => {
  try {
    const { filenames } = req.body;
    if (!filenames || !Array.isArray(filenames) || filenames.length === 0) {
      return res.status(400).json({ success: false, error: 'filenames array required' });
    }

    const results = [];
    for (const filename of filenames.slice(0, 20)) {
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) continue;

      const found = findConversationFile(filename);
      if (!found) continue;

      const parsed = parseConversationFile(found.filePath);
      const stat = fs.statSync(found.filePath);
      const insights = extractInsights(parsed.messages);

      results.push({
        filename,
        title: parsed.title || '',
        date: parsed.date || '',
        source: found.source,
        format: parsed.format,
        size: stat.size,
        messageCount: parsed.messages.length,
        insights,
      });
    }

    res.json({ success: true, results });
  } catch (error) {
    console.error('[ConversationLog] Error batch reviewing:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/conversation-log/export-to-pipeline — create OM Daily items from conversation insights
router.post('/export-to-pipeline', async (req, res) => {
  try {
    const { items, conversation_ref, agent_tool } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'items array required' });
    }

    const { promisePool } = require('../config/db');
    const created = [];

    for (const item of items.slice(0, 50)) {
      const [result] = await promisePool.query(
        `INSERT INTO om_daily_items (title, task_type, description, horizon, status, priority, category, source, agent_tool, conversation_ref, metadata, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.title || 'Untitled',
          item.task_type || 'task',
          item.description || null,
          item.horizon || '7',
          item.status || 'todo',
          item.priority || 'medium',
          item.category || null,
          'conversation',
          agent_tool || null,
          conversation_ref || null,
          item.metadata ? JSON.stringify(item.metadata) : null,
          req.session?.user?.id || null,
        ]
      );
      const [row] = await promisePool.query('SELECT * FROM om_daily_items WHERE id = ?', [result.insertId]);
      if (row.length) created.push(row[0]);
    }

    res.json({ success: true, created, count: created.length });
  } catch (error) {
    console.error('[ConversationLog] Error exporting to pipeline:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/conversation-log/review/date-range — consolidated review of conversations in a date range
router.get('/review/date-range', (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) {
      return res.status(400).json({ success: false, error: 'start and end query params required (YYYY-MM-DD)' });
    }

    const startDate = new Date(start + 'T00:00:00');
    const endDate = new Date(end + 'T23:59:59');
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    const allFiles = getAllConversationFiles();
    const matched = [];

    for (const entry of allFiles) {
      // Extract date from filename
      const dateMatch = entry.filename.match(/claude-conversation-(\d{4}-\d{2}-\d{2})/);
      let fileDate = null;
      if (dateMatch) {
        fileDate = new Date(dateMatch[1] + 'T00:00:00');
      } else {
        // Fallback to file mtime
        const filePath = path.join(entry.dir, entry.filename);
        const stat = fs.statSync(filePath);
        fileDate = stat.mtime;
      }

      if (fileDate >= startDate && fileDate <= endDate) {
        matched.push({ ...entry, fileDate });
      }
    }

    // Sort by date
    matched.sort((a, b) => a.fileDate - b.fileDate);

    // Process each conversation
    const conversations = [];
    const aggregated = {
      totalConversations: matched.length,
      totalMessages: 0,
      totalSize: 0,
      allFilesChanged: {},
      allFeaturesBuilt: [],
      allBugsFixed: [],
      allDecisions: [],
      allTasks: [],
      allFollowUps: [],
      bySource: {},
      byDate: {},
    };

    for (const entry of matched) {
      const filePath = path.join(entry.dir, entry.filename);
      const stat = fs.statSync(filePath);
      const content = fs.readFileSync(filePath, 'utf-8');
      const format = detectFormat(content);
      const { userCount, assistantCount } = countMessages(content);
      const preview = extractPreview(content, format);
      const parsed = parseConversationFile(filePath);
      const insights = extractInsights(parsed.messages);

      const dateStr = entry.fileDate.toISOString().split('T')[0];
      const msgCount = userCount + assistantCount;

      conversations.push({
        filename: entry.filename,
        source: entry.source,
        date: dateStr,
        size: stat.size,
        messageCount: msgCount,
        preview,
        format,
        insights: {
          summary: insights.summary,
          featuresBuilt: insights.featuresBuilt.length,
          bugsFixed: insights.bugsFixed.length,
          filesChanged: insights.filesChanged.length,
          decisions: insights.decisions.length,
          tasks: insights.tasks.length,
        },
      });

      // Aggregate
      aggregated.totalMessages += msgCount;
      aggregated.totalSize += stat.size;
      aggregated.bySource[entry.source] = (aggregated.bySource[entry.source] || 0) + 1;
      aggregated.byDate[dateStr] = (aggregated.byDate[dateStr] || 0) + 1;

      for (const f of insights.filesChanged) {
        aggregated.allFilesChanged[f] = (aggregated.allFilesChanged[f] || 0) + 1;
      }
      aggregated.allFeaturesBuilt.push(...insights.featuresBuilt);
      aggregated.allBugsFixed.push(...insights.bugsFixed);
      aggregated.allDecisions.push(...insights.decisions);
      aggregated.allTasks.push(...insights.tasks.map(t => t.text));
    }

    // Sort files by frequency
    const topFiles = Object.entries(aggregated.allFilesChanged)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([file, count]) => ({ file, count }));

    // Deduplicate
    aggregated.allFeaturesBuilt = [...new Set(aggregated.allFeaturesBuilt)].slice(0, 50);
    aggregated.allBugsFixed = [...new Set(aggregated.allBugsFixed)].slice(0, 30);
    aggregated.allDecisions = [...new Set(aggregated.allDecisions)].slice(0, 30);
    aggregated.allTasks = [...new Set(aggregated.allTasks)].slice(0, 30);

    res.json({
      success: true,
      dateRange: { start, end },
      summary: {
        totalConversations: aggregated.totalConversations,
        totalMessages: aggregated.totalMessages,
        totalSizeMB: (aggregated.totalSize / (1024 * 1024)).toFixed(1),
        bySource: aggregated.bySource,
        byDate: aggregated.byDate,
        featuresBuilt: aggregated.allFeaturesBuilt.length,
        bugsFixed: aggregated.allBugsFixed.length,
        decisionsRecorded: aggregated.allDecisions.length,
        pendingTasks: aggregated.allTasks.length,
      },
      topFiles,
      features: aggregated.allFeaturesBuilt,
      bugFixes: aggregated.allBugsFixed,
      decisions: aggregated.allDecisions,
      pendingTasks: aggregated.allTasks,
      conversations,
    });
  } catch (error) {
    console.error('[ConversationLog] Error in date-range review:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
