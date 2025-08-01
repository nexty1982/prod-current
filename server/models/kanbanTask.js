const mysql = require('mysql2/promise');

class KanbanTask {
  constructor() {
    this.connection = null;
  }

  async getConnection() {
    if (!this.connection) {
      this.connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'orthodmetrics_dev'
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

  // Helper function to check board access
  async checkBoardAccess(boardId, userId, requiredRole = 'member') {
    const connection = await this.getConnection();
    
    const [boardAccess] = await connection.execute(`
      SELECT 
        b.id,
        b.created_by,
        bm.role as user_role
      FROM kanban_boards b
      LEFT JOIN kanban_board_members bm ON b.id = bm.board_id AND bm.user_id = ?
      WHERE b.id = ? AND (bm.user_id = ? OR b.created_by = ?)
        AND b.is_archived = FALSE
    `, [userId, boardId, userId, userId]);

    if (boardAccess.length === 0) {
      return { hasAccess: false, role: null };
    }

    const userRole = boardAccess[0].user_role || (boardAccess[0].created_by === userId ? 'owner' : null);
    const roleHierarchy = { 'viewer': 1, 'member': 2, 'admin': 3, 'owner': 4 };
    
    const hasAccess = roleHierarchy[userRole] >= roleHierarchy[requiredRole];
    return { hasAccess, role: userRole };
  }

  // Get all tasks for a board
  async getBoardTasks(boardId, userId, filters = {}) {
    const connection = await this.getConnection();

    // Check access
    const { hasAccess } = await this.checkBoardAccess(boardId, userId, 'viewer');
    if (!hasAccess) {
      throw new Error('Access denied to this board');
    }

    let whereConditions = ['t.board_id = ?'];
    let queryParams = [boardId];

    // Apply filters
    if (filters.assigned_to) {
      whereConditions.push('t.assigned_to = ?');
      queryParams.push(filters.assigned_to);
    }

    if (filters.priority) {
      whereConditions.push('t.priority = ?');
      queryParams.push(filters.priority);
    }

    if (filters.due_this_week) {
      whereConditions.push('t.due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)');
    }

    if (filters.overdue) {
      whereConditions.push('t.due_date < CURDATE() AND t.completed_at IS NULL');
    }

    if (filters.column_id) {
      whereConditions.push('t.column_id = ?');
      queryParams.push(filters.column_id);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get tasks with user information and labels
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
        u_created.username as created_by_name,
        c.name as column_name,
        c.color as column_color
      FROM kanban_tasks t
      LEFT JOIN users u_assigned ON t.assigned_to = u_assigned.id
      LEFT JOIN users u_created ON t.created_by = u_created.id
      LEFT JOIN kanban_columns c ON t.column_id = c.id
      ${whereClause}
      ORDER BY c.position ASC, t.position ASC
    `, queryParams);

    // Get labels for each task
    const [taskLabels] = await connection.execute(`
      SELECT 
        tl.task_id,
        l.id as label_id,
        l.name as label_name,
        l.color as label_color
      FROM kanban_task_labels tl
      JOIN kanban_labels l ON tl.label_id = l.id
      JOIN kanban_tasks t ON tl.task_id = t.id
      WHERE t.board_id = ?
    `, [boardId]);

    // Group labels by task
    const taskLabelsMap = {};
    taskLabels.forEach(label => {
      if (!taskLabelsMap[label.task_id]) {
        taskLabelsMap[label.task_id] = [];
      }
      taskLabelsMap[label.task_id].push({
        id: label.label_id,
        name: label.label_name,
        color: label.label_color
      });
    });

    // Add labels to tasks
    const tasksWithLabels = tasks.map(task => ({
      ...task,
      labels: taskLabelsMap[task.id] || []
    }));

    return tasksWithLabels;
  }

  // Get task by ID with full details
  async getTaskById(taskId, userId) {
    const connection = await this.getConnection();

    // Get task and check board access
    const [taskInfo] = await connection.execute(`
      SELECT 
        t.id,
        t.board_id,
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
        u_created.username as created_by_name,
        c.name as column_name,
        b.name as board_name
      FROM kanban_tasks t
      LEFT JOIN users u_assigned ON t.assigned_to = u_assigned.id
      LEFT JOIN users u_created ON t.created_by = u_created.id
      LEFT JOIN kanban_columns c ON t.column_id = c.id
      LEFT JOIN kanban_boards b ON t.board_id = b.id
      WHERE t.id = ?
    `, [taskId]);

    if (taskInfo.length === 0) {
      throw new Error('Task not found');
    }

    const task = taskInfo[0];

    // Check board access
    const { hasAccess } = await this.checkBoardAccess(task.board_id, userId, 'viewer');
    if (!hasAccess) {
      throw new Error('Access denied to this board');
    }

    // Get task labels
    const [labels] = await connection.execute(`
      SELECT 
        l.id,
        l.name,
        l.color
      FROM kanban_task_labels tl
      JOIN kanban_labels l ON tl.label_id = l.id
      WHERE tl.task_id = ?
    `, [taskId]);

    // Get task comments
    const [comments] = await connection.execute(`
      SELECT 
        c.id,
        c.comment,
        c.created_at,
        c.updated_at,
        u.username,
        u.email
      FROM kanban_task_comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.task_id = ?
      ORDER BY c.created_at ASC
    `, [taskId]);

    // Get task attachments
    const [attachments] = await connection.execute(`
      SELECT 
        a.id,
        a.filename,
        a.original_filename,
        a.file_path,
        a.file_size,
        a.mime_type,
        a.uploaded_at,
        u.username as uploaded_by_name
      FROM kanban_task_attachments a
      JOIN users u ON a.uploaded_by = u.id
      WHERE a.task_id = ?
      ORDER BY a.uploaded_at DESC
    `, [taskId]);

    // Get activity history
    const [activity] = await connection.execute(`
      SELECT 
        a.id,
        a.action_type,
        a.description,
        a.old_value,
        a.new_value,
        a.created_at,
        u.username
      FROM kanban_task_activity a
      JOIN users u ON a.user_id = u.id
      WHERE a.task_id = ?
      ORDER BY a.created_at DESC
      LIMIT 50
    `, [taskId]);

    return {
      ...task,
      labels,
      comments,
      attachments,
      activity
    };
  }

  // Create new task
  async createTask(taskData, creatorId) {
    const connection = await this.getConnection();

    const {
      board_id,
      column_id,
      title,
      description = '',
      priority = 'medium',
      due_date,
      assigned_to,
      estimated_hours,
      task_color,
      labels = []
    } = taskData;

    if (!board_id || !column_id || !title || title.trim().length === 0) {
      throw new Error('Board ID, Column ID, and title are required');
    }

    // Check board access
    const { hasAccess } = await this.checkBoardAccess(board_id, creatorId, 'member');
    if (!hasAccess) {
      throw new Error('Access denied to this board');
    }

    try {
      await connection.beginTransaction();

      // Get next position in the column
      const [positionResult] = await connection.execute(`
        SELECT COALESCE(MAX(position), -1) + 1 as next_position
        FROM kanban_tasks
        WHERE column_id = ?
      `, [column_id]);

      const position = positionResult[0].next_position;

      // Create the task
      const [taskResult] = await connection.execute(`
        INSERT INTO kanban_tasks (
          board_id, column_id, title, description, position, priority,
          due_date, assigned_to, created_by, estimated_hours, task_color
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        board_id, column_id, title.trim(), description, position, priority,
        due_date || null, assigned_to || null, creatorId, 
        estimated_hours || null, task_color || null
      ]);

      const taskId = taskResult.insertId;

      // Add labels if provided
      if (labels.length > 0) {
        for (const labelId of labels) {
          await connection.execute(`
            INSERT INTO kanban_task_labels (task_id, label_id)
            VALUES (?, ?)
          `, [taskId, labelId]);
        }
      }

      // Log activity
      await connection.execute(`
        INSERT INTO kanban_task_activity (task_id, user_id, action_type, description)
        VALUES (?, ?, 'created', ?)
      `, [taskId, creatorId, `Created task "${title.trim()}"`]);

      await connection.commit();

      return {
        id: taskId,
        title: title.trim(),
        position,
        created_by: creatorId
      };

    } catch (error) {
      await connection.rollback();
      throw error;
    }
  }

  // Update task
  async updateTask(taskId, updates, userId) {
    const connection = await this.getConnection();

    // Get task and check board access
    const [taskInfo] = await connection.execute(`
      SELECT board_id, title as old_title, assigned_to as old_assigned_to, 
             priority as old_priority, due_date as old_due_date
      FROM kanban_tasks
      WHERE id = ?
    `, [taskId]);

    if (taskInfo.length === 0) {
      throw new Error('Task not found');
    }

    const { hasAccess } = await this.checkBoardAccess(taskInfo[0].board_id, userId, 'member');
    if (!hasAccess) {
      throw new Error('Access denied to this board');
    }

    const {
      title,
      description,
      priority,
      due_date,
      assigned_to,
      estimated_hours,
      actual_hours,
      task_color,
      labels = []
    } = updates;

    try {
      await connection.beginTransaction();

      // Update the task
      await connection.execute(`
        UPDATE kanban_tasks 
        SET title = ?, description = ?, priority = ?, due_date = ?, 
            assigned_to = ?, estimated_hours = ?, actual_hours = ?, 
            task_color = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        title, description, priority, due_date || null, 
        assigned_to || null, estimated_hours || null, actual_hours || null, 
        task_color || null, taskId
      ]);

      // Update labels
      await connection.execute(`DELETE FROM kanban_task_labels WHERE task_id = ?`, [taskId]);
      
      if (labels.length > 0) {
        for (const labelId of labels) {
          await connection.execute(`
            INSERT INTO kanban_task_labels (task_id, label_id)
            VALUES (?, ?)
          `, [taskId, labelId]);
        }
      }

      // Log significant changes
      const activities = [];
      
      if (title !== taskInfo[0].old_title) {
        activities.push(`Updated task title from "${taskInfo[0].old_title}" to "${title}"`);
      }

      if (assigned_to !== taskInfo[0].old_assigned_to) {
        activities.push('Task assignment changed');
      }

      if (priority !== taskInfo[0].old_priority) {
        activities.push(`Priority changed from ${taskInfo[0].old_priority} to ${priority}`);
      }

      if (due_date !== taskInfo[0].old_due_date) {
        activities.push('Due date updated');
      }

      // Log activities
      for (const activity of activities) {
        await connection.execute(`
          INSERT INTO kanban_task_activity (task_id, user_id, action_type, description)
          VALUES (?, ?, 'updated', ?)
        `, [taskId, userId, activity]);
      }

      await connection.commit();

      return { success: true };

    } catch (error) {
      await connection.rollback();
      throw error;
    }
  }

  // Move task to different column/position
  async moveTask(taskId, newColumnId, newPosition, userId) {
    const connection = await this.getConnection();

    // Get task and check board access
    const [taskInfo] = await connection.execute(`
      SELECT t.board_id, t.column_id as old_column_id, t.position as old_position, t.title,
             c.name as old_column_name
      FROM kanban_tasks t
      LEFT JOIN kanban_columns c ON t.column_id = c.id
      WHERE t.id = ?
    `, [taskId]);

    if (taskInfo.length === 0) {
      throw new Error('Task not found');
    }

    const { hasAccess } = await this.checkBoardAccess(taskInfo[0].board_id, userId, 'member');
    if (!hasAccess) {
      throw new Error('Access denied to this board');
    }

    try {
      await connection.beginTransaction();

      const oldColumnId = taskInfo[0].old_column_id;
      const oldPosition = taskInfo[0].old_position;

      // If moving to a different column
      if (oldColumnId !== newColumnId) {
        // Adjust positions in the old column (move tasks up to fill the gap)
        await connection.execute(`
          UPDATE kanban_tasks 
          SET position = position - 1
          WHERE column_id = ? AND position > ?
        `, [oldColumnId, oldPosition]);

        // Adjust positions in the new column (make space for the moved task)
        await connection.execute(`
          UPDATE kanban_tasks 
          SET position = position + 1
          WHERE column_id = ? AND position >= ?
        `, [newColumnId, newPosition]);

        // Move the task
        await connection.execute(`
          UPDATE kanban_tasks 
          SET column_id = ?, position = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [newColumnId, newPosition, taskId]);

        // Get new column name for activity log
        const [newColumnInfo] = await connection.execute(`
          SELECT name FROM kanban_columns WHERE id = ?
        `, [newColumnId]);

        // Log the move activity
        await connection.execute(`
          INSERT INTO kanban_task_activity (task_id, user_id, action_type, description)
          VALUES (?, ?, 'moved', ?)
        `, [taskId, userId, 
            `Moved task "${taskInfo[0].title}" from "${taskInfo[0].old_column_name}" to "${newColumnInfo[0].name}"`]);
      } else {
        // Moving within the same column
        if (oldPosition !== newPosition) {
          if (newPosition < oldPosition) {
            // Moving up: shift tasks down
            await connection.execute(`
              UPDATE kanban_tasks 
              SET position = position + 1
              WHERE column_id = ? AND position >= ? AND position < ?
            `, [newColumnId, newPosition, oldPosition]);
          } else {
            // Moving down: shift tasks up
            await connection.execute(`
              UPDATE kanban_tasks 
              SET position = position - 1
              WHERE column_id = ? AND position > ? AND position <= ?
            `, [newColumnId, oldPosition, newPosition]);
          }

          // Update the task position
          await connection.execute(`
            UPDATE kanban_tasks 
            SET position = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [newPosition, taskId]);
        }
      }

      await connection.commit();

      return { success: true };

    } catch (error) {
      await connection.rollback();
      throw error;
    }
  }

  // Delete task
  async deleteTask(taskId, userId) {
    const connection = await this.getConnection();

    // Get task and check permissions
    const [taskInfo] = await connection.execute(`
      SELECT board_id, column_id, position, title, created_by
      FROM kanban_tasks
      WHERE id = ?
    `, [taskId]);

    if (taskInfo.length === 0) {
      throw new Error('Task not found');
    }

    const { hasAccess, role } = await this.checkBoardAccess(taskInfo[0].board_id, userId, 'member');
    if (!hasAccess) {
      throw new Error('Access denied to this board');
    }

    // Only task creator, board admin, or board owner can delete tasks
    if (taskInfo[0].created_by !== userId && role !== 'admin' && role !== 'owner') {
      throw new Error('Insufficient permissions to delete this task');
    }

    try {
      await connection.beginTransaction();

      // Log deletion activity before deleting
      await connection.execute(`
        INSERT INTO kanban_task_activity (task_id, user_id, action_type, description)
        VALUES (?, ?, 'deleted', ?)
      `, [taskId, userId, `Deleted task "${taskInfo[0].title}"`]);

      // Delete the task (cascading deletes will handle related records)
      await connection.execute(`DELETE FROM kanban_tasks WHERE id = ?`, [taskId]);

      // Adjust positions in the column (move tasks up to fill the gap)
      await connection.execute(`
        UPDATE kanban_tasks 
        SET position = position - 1
        WHERE column_id = ? AND position > ?
      `, [taskInfo[0].column_id, taskInfo[0].position]);

      await connection.commit();

      return { success: true };

    } catch (error) {
      await connection.rollback();
      throw error;
    }
  }

  // Add comment to task
  async addComment(taskId, comment, userId) {
    const connection = await this.getConnection();

    if (!comment || comment.trim().length === 0) {
      throw new Error('Comment cannot be empty');
    }

    // Check if user has access to the task's board
    const [taskBoard] = await connection.execute(`
      SELECT board_id, title FROM kanban_tasks WHERE id = ?
    `, [taskId]);

    if (taskBoard.length === 0) {
      throw new Error('Task not found');
    }

    const { hasAccess } = await this.checkBoardAccess(taskBoard[0].board_id, userId, 'member');
    if (!hasAccess) {
      throw new Error('Access denied to this board');
    }

    try {
      await connection.beginTransaction();

      // Add the comment
      const [commentResult] = await connection.execute(`
        INSERT INTO kanban_task_comments (task_id, user_id, comment)
        VALUES (?, ?, ?)
      `, [taskId, userId, comment.trim()]);

      // Log the comment activity
      await connection.execute(`
        INSERT INTO kanban_task_activity (task_id, user_id, action_type, description)
        VALUES (?, ?, 'commented', ?)
      `, [taskId, userId, `Added comment to task "${taskBoard[0].title}"`]);

      await connection.commit();

      return {
        id: commentResult.insertId,
        comment: comment.trim(),
        created_at: new Date()
      };

    } catch (error) {
      await connection.rollback();
      throw error;
    }
  }

  // Get task comments
  async getTaskComments(taskId, userId) {
    const connection = await this.getConnection();

    // Check if user has access to the task's board
    const [taskBoard] = await connection.execute(`
      SELECT board_id FROM kanban_tasks WHERE id = ?
    `, [taskId]);

    if (taskBoard.length === 0) {
      throw new Error('Task not found');
    }

    const { hasAccess } = await this.checkBoardAccess(taskBoard[0].board_id, userId, 'viewer');
    if (!hasAccess) {
      throw new Error('Access denied to this board');
    }

    // Get comments
    const [comments] = await connection.execute(`
      SELECT 
        c.id,
        c.comment,
        c.created_at,
        c.updated_at,
        u.username,
        u.email
      FROM kanban_task_comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.task_id = ?
      ORDER BY c.created_at ASC
    `, [taskId]);

    return comments;
  }

  // Complete task
  async completeTask(taskId, userId) {
    const connection = await this.getConnection();

    // Get task and check board access
    const [taskInfo] = await connection.execute(`
      SELECT board_id, title, completed_at FROM kanban_tasks WHERE id = ?
    `, [taskId]);

    if (taskInfo.length === 0) {
      throw new Error('Task not found');
    }

    if (taskInfo[0].completed_at) {
      throw new Error('Task is already completed');
    }

    const { hasAccess } = await this.checkBoardAccess(taskInfo[0].board_id, userId, 'member');
    if (!hasAccess) {
      throw new Error('Access denied to this board');
    }

    try {
      await connection.beginTransaction();

      // Mark task as completed
      await connection.execute(`
        UPDATE kanban_tasks 
        SET completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [taskId]);

      // Log completion activity
      await connection.execute(`
        INSERT INTO kanban_task_activity (task_id, user_id, action_type, description)
        VALUES (?, ?, 'completed', ?)
      `, [taskId, userId, `Completed task "${taskInfo[0].title}"`]);

      await connection.commit();

      return { success: true };

    } catch (error) {
      await connection.rollback();
      throw error;
    }
  }

  // Reopen completed task
  async reopenTask(taskId, userId) {
    const connection = await this.getConnection();

    // Get task and check board access
    const [taskInfo] = await connection.execute(`
      SELECT board_id, title, completed_at FROM kanban_tasks WHERE id = ?
    `, [taskId]);

    if (taskInfo.length === 0) {
      throw new Error('Task not found');
    }

    if (!taskInfo[0].completed_at) {
      throw new Error('Task is not completed');
    }

    const { hasAccess } = await this.checkBoardAccess(taskInfo[0].board_id, userId, 'member');
    if (!hasAccess) {
      throw new Error('Access denied to this board');
    }

    try {
      await connection.beginTransaction();

      // Reopen task
      await connection.execute(`
        UPDATE kanban_tasks 
        SET completed_at = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [taskId]);

      // Log reopen activity
      await connection.execute(`
        INSERT INTO kanban_task_activity (task_id, user_id, action_type, description)
        VALUES (?, ?, 'updated', ?)
      `, [taskId, userId, `Reopened task "${taskInfo[0].title}"`]);

      await connection.commit();

      return { success: true };

    } catch (error) {
      await connection.rollback();
      throw error;
    }
  }
}

module.exports = KanbanTask;
