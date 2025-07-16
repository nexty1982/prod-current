const mysql = require('mysql2/promise');

class KanbanBoard {
  constructor() {
    this.connection = null;
  }

  async getConnection() {
    if (!this.connection) {
      this.connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'orthodoxmetrics'
      });
    }
    return this.connection;
  }

  async closeConnection() {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
    }
  }

  // Get all boards for a user
  async getUserBoards(userId, includeArchived = false) {
    const connection = await this.getConnection();
    
    const archivedCondition = includeArchived ? '' : 'AND b.is_archived = FALSE';
    
    const [boards] = await connection.execute(`
      SELECT 
        b.id,
        b.name,
        b.description,
        b.created_by,
        b.created_at,
        b.updated_at,
        b.is_archived,
        b.board_color,
        bm.role as user_role,
        COUNT(DISTINCT t.id) as total_tasks,
        COUNT(DISTINCT CASE WHEN t.completed_at IS NULL THEN t.id END) as active_tasks,
        u.username as created_by_name
      FROM kanban_boards b
      LEFT JOIN kanban_board_members bm ON b.id = bm.board_id AND bm.user_id = ?
      LEFT JOIN kanban_tasks t ON b.id = t.board_id
      LEFT JOIN users u ON b.created_by = u.id
      WHERE (bm.user_id = ? OR b.created_by = ?) ${archivedCondition}
      GROUP BY b.id, b.name, b.description, b.created_by, b.created_at, b.updated_at, 
               b.is_archived, b.board_color, bm.role, u.username
      ORDER BY b.updated_at DESC
    `, [userId, userId, userId]);

    return boards;
  }

  // Get board by ID with full details
  async getBoardById(boardId, userId) {
    const connection = await this.getConnection();
    
    // First check access
    const [boardAccess] = await connection.execute(`
      SELECT 
        b.id,
        b.name,
        b.description,
        b.created_by,
        b.created_at,
        b.updated_at,
        b.board_color,
        bm.role as user_role
      FROM kanban_boards b
      LEFT JOIN kanban_board_members bm ON b.id = bm.board_id AND bm.user_id = ?
      WHERE b.id = ? AND (bm.user_id = ? OR b.created_by = ?)
        AND b.is_archived = FALSE
    `, [userId, boardId, userId, userId]);

    if (boardAccess.length === 0) {
      throw new Error('Board not found or access denied');
    }

    const board = boardAccess[0];

    // Get columns
    const [columns] = await connection.execute(`
      SELECT id, name, position, color, wip_limit
      FROM kanban_columns
      WHERE board_id = ?
      ORDER BY position ASC
    `, [boardId]);

    // Get tasks with user information
    const [tasks] = await connection.execute(`
      SELECT 
        t.id,
        t.column_id,
        t.title,
        t.description,
        t.position,
        t.priority,
        t.due_date,
        t.assigned_to,
        t.created_by,
        t.created_at,
        t.updated_at,
        t.completed_at,
        t.estimated_hours,
        t.actual_hours,
        t.task_color,
        u_assigned.username as assigned_to_name,
        u_assigned.email as assigned_to_email,
        u_created.username as created_by_name
      FROM kanban_tasks t
      LEFT JOIN users u_assigned ON t.assigned_to = u_assigned.id
      LEFT JOIN users u_created ON t.created_by = u_created.id
      WHERE t.board_id = ?
      ORDER BY t.position ASC
    `, [boardId]);

    // Get board members
    const [members] = await connection.execute(`
      SELECT 
        bm.user_id,
        bm.role,
        bm.joined_at,
        u.username,
        u.email
      FROM kanban_board_members bm
      JOIN users u ON bm.user_id = u.id
      WHERE bm.board_id = ?
      ORDER BY bm.joined_at ASC
    `, [boardId]);

    // Get board labels
    const [labels] = await connection.execute(`
      SELECT id, name, color
      FROM kanban_labels
      WHERE board_id = ?
      ORDER BY name ASC
    `, [boardId]);

    return {
      ...board,
      columns,
      tasks,
      members,
      labels
    };
  }

  // Create new board
  async createBoard(boardData, creatorId) {
    const connection = await this.getConnection();
    
    try {
      await connection.beginTransaction();

      const { name, description = '', board_color = '#1976d2', columns = [] } = boardData;

      // Create the board
      const [boardResult] = await connection.execute(`
        INSERT INTO kanban_boards (name, description, created_by, board_color)
        VALUES (?, ?, ?, ?)
      `, [name, description, creatorId, board_color]);

      const boardId = boardResult.insertId;

      // Add creator as board owner
      await connection.execute(`
        INSERT INTO kanban_board_members (board_id, user_id, role)
        VALUES (?, ?, 'owner')
      `, [boardId, creatorId]);

      // Create default columns if none provided
      const defaultColumns = columns.length > 0 ? columns : [
        { name: 'Backlog', color: '#6c757d' },
        { name: 'In Progress', color: '#ffc107' },
        { name: 'Review', color: '#fd7e14' },
        { name: 'Done', color: '#28a745' }
      ];

      for (let i = 0; i < defaultColumns.length; i++) {
        await connection.execute(`
          INSERT INTO kanban_columns (board_id, name, position, color)
          VALUES (?, ?, ?, ?)
        `, [boardId, defaultColumns[i].name, i, defaultColumns[i].color || '#1976d2']);
      }

      // Create default labels
      const defaultLabels = [
        { name: 'High Priority', color: '#dc3545' },
        { name: 'Bug', color: '#fd7e14' },
        { name: 'Feature', color: '#28a745' },
        { name: 'Enhancement', color: '#17a2b8' }
      ];

      for (const label of defaultLabels) {
        await connection.execute(`
          INSERT INTO kanban_labels (board_id, name, color)
          VALUES (?, ?, ?)
        `, [boardId, label.name, label.color]);
      }

      await connection.commit();

      return {
        id: boardId,
        name,
        description,
        board_color,
        created_by: creatorId
      };

    } catch (error) {
      await connection.rollback();
      throw error;
    }
  }

  // Update board
  async updateBoard(boardId, updates, userId) {
    const connection = await this.getConnection();
    
    // Check permissions
    const [permissions] = await connection.execute(`
      SELECT bm.role, b.created_by
      FROM kanban_boards b
      LEFT JOIN kanban_board_members bm ON b.id = bm.board_id AND bm.user_id = ?
      WHERE b.id = ?
    `, [userId, boardId]);

    if (permissions.length === 0 || 
        (permissions[0].role !== 'owner' && permissions[0].role !== 'admin' && permissions[0].created_by !== userId)) {
      throw new Error('Insufficient permissions to update this board');
    }

    const { name, description, board_color } = updates;

    await connection.execute(`
      UPDATE kanban_boards 
      SET name = ?, description = ?, board_color = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [name, description, board_color, boardId]);

    return { success: true };
  }

  // Archive board
  async archiveBoard(boardId, userId) {
    const connection = await this.getConnection();
    
    // Check if user is board owner
    const [permissions] = await connection.execute(`
      SELECT bm.role, b.created_by
      FROM kanban_boards b
      LEFT JOIN kanban_board_members bm ON b.id = bm.board_id AND bm.user_id = ?
      WHERE b.id = ?
    `, [userId, boardId]);

    if (permissions.length === 0 || 
        (permissions[0].role !== 'owner' && permissions[0].created_by !== userId)) {
      throw new Error('Only board owners can archive boards');
    }

    await connection.execute(`
      UPDATE kanban_boards 
      SET is_archived = TRUE, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [boardId]);

    return { success: true };
  }

  // Add member to board
  async addMember(boardId, userId, role = 'member', invitedBy) {
    const connection = await this.getConnection();
    
    try {
      await connection.execute(`
        INSERT INTO kanban_board_members (board_id, user_id, role, invited_by)
        VALUES (?, ?, ?, ?)
      `, [boardId, userId, role, invitedBy]);

      return { success: true };
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('User is already a member of this board');
      }
      throw error;
    }
  }

  // Remove member from board
  async removeMember(boardId, userId, removedBy) {
    const connection = await this.getConnection();
    
    // Check permissions of the person removing
    const [permissions] = await connection.execute(`
      SELECT role FROM kanban_board_members
      WHERE board_id = ? AND user_id = ?
    `, [boardId, removedBy]);

    if (permissions.length === 0 || (permissions[0].role !== 'owner' && permissions[0].role !== 'admin')) {
      throw new Error('Insufficient permissions to remove members');
    }

    await connection.execute(`
      DELETE FROM kanban_board_members
      WHERE board_id = ? AND user_id = ?
    `, [boardId, userId]);

    return { success: true };
  }

  // Get board statistics
  async getBoardStats(boardId, userId) {
    const connection = await this.getConnection();
    
    // Check access
    const [access] = await connection.execute(`
      SELECT 1 FROM kanban_boards b
      LEFT JOIN kanban_board_members bm ON b.id = bm.board_id AND bm.user_id = ?
      WHERE b.id = ? AND (bm.user_id = ? OR b.created_by = ?)
    `, [userId, boardId, userId, userId]);

    if (access.length === 0) {
      throw new Error('Access denied to this board');
    }

    // Get task statistics
    const [stats] = await connection.execute(`
      SELECT 
        COUNT(*) as total_tasks,
        COUNT(CASE WHEN completed_at IS NULL THEN 1 END) as active_tasks,
        COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN priority = 'high' OR priority = 'urgent' THEN 1 END) as high_priority_tasks,
        COUNT(CASE WHEN due_date < CURDATE() AND completed_at IS NULL THEN 1 END) as overdue_tasks,
        COUNT(CASE WHEN assigned_to IS NOT NULL THEN 1 END) as assigned_tasks,
        AVG(CASE WHEN completed_at IS NOT NULL THEN actual_hours END) as avg_completion_hours
      FROM kanban_tasks
      WHERE board_id = ?
    `, [boardId]);

    // Get column statistics
    const [columnStats] = await connection.execute(`
      SELECT 
        c.id,
        c.name,
        COUNT(t.id) as task_count
      FROM kanban_columns c
      LEFT JOIN kanban_tasks t ON c.id = t.column_id
      WHERE c.board_id = ?
      GROUP BY c.id, c.name
      ORDER BY c.position ASC
    `, [boardId]);

    return {
      ...stats[0],
      columns: columnStats
    };
  }
}

module.exports = KanbanBoard;
