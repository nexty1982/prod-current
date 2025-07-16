const { promisePool } = require('./config/db');

async function createDefaultKanbanBoards() {
  console.log('🚀 Creating default Kanban boards...');
  
  try {
    // Default boards as specified in todo.md
    const defaultBoards = [
      {
        name: 'Development',
        description: 'Software development tasks and features',
        board_color: '#1976d2',
        created_by: 1 // Assuming admin user ID is 1
      },
      {
        name: 'Marketing',
        description: 'Marketing campaigns and promotional activities',
        board_color: '#388e3c',
        created_by: 1
      },
      {
        name: 'Invoicing',
        description: 'Client billing and financial tracking',
        board_color: '#f57c00',
        created_by: 1
      },
      {
        name: 'Client Onboarding',
        description: 'New client setup and integration process',
        board_color: '#7b1fa2',
        created_by: 1
      },
      {
        name: 'Documentation',
        description: 'Technical documentation and user guides',
        board_color: '#5d4037',
        created_by: 1
      }
    ];

    for (const board of defaultBoards) {
      // Check if board already exists
      const [existing] = await promisePool.execute(
        'SELECT id FROM kanban_boards WHERE name = ? AND is_archived = 0',
        [board.name]
      );

      if (existing.length > 0) {
        console.log(`⚠️  Board "${board.name}" already exists, skipping...`);
        continue;
      }

      // Create board
      const [result] = await promisePool.execute(`
        INSERT INTO kanban_boards (name, description, created_by, board_color)
        VALUES (?, ?, ?, ?)
      `, [board.name, board.description, board.created_by, board.board_color]);

      const boardId = result.insertId;
      console.log(`✅ Created board: ${board.name} (ID: ${boardId})`);

      // Create default columns for each board
      const defaultColumns = [
        { name: 'To Do', position: 0, color: '#e3f2fd', wip_limit: null },
        { name: 'In Progress', position: 1, color: '#fff3e0', wip_limit: 3 },
        { name: 'Review', position: 2, color: '#f3e5f5', wip_limit: 2 },
        { name: 'Done', position: 3, color: '#e8f5e8', wip_limit: null }
      ];

      for (const column of defaultColumns) {
        await promisePool.execute(`
          INSERT INTO kanban_columns (board_id, name, position, color, wip_limit)
          VALUES (?, ?, ?, ?, ?)
        `, [boardId, column.name, column.position, column.color, column.wip_limit]);
      }

      // Add creator as board owner
      await promisePool.execute(`
        INSERT INTO kanban_board_members (board_id, user_id, role)
        VALUES (?, ?, 'owner')
      `, [boardId, board.created_by]);

      // Create some default labels for each board
      const defaultLabels = [
        { name: 'High Priority', color: '#f44336' },
        { name: 'Bug', color: '#ff5722' },
        { name: 'Feature', color: '#2196f3' },
        { name: 'Enhancement', color: '#4caf50' },
        { name: 'Documentation', color: '#9c27b0' }
      ];

      for (const label of defaultLabels) {
        await promisePool.execute(`
          INSERT INTO kanban_labels (board_id, name, color)
          VALUES (?, ?, ?)
        `, [boardId, label.name, label.color]);
      }

      console.log(`  📋 Created ${defaultColumns.length} columns and ${defaultLabels.length} labels`);
    }

    console.log('🎉 Default Kanban boards setup completed!');
    console.log('📌 Available boards:');
    console.log('   • Development - Software development tasks');
    console.log('   • Marketing - Marketing campaigns and activities');
    console.log('   • Invoicing - Client billing and financial tracking');
    console.log('   • Client Onboarding - New client setup process');
    console.log('   • Documentation - Technical docs and guides');

  } catch (error) {
    console.error('❌ Error creating default boards:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  createDefaultKanbanBoards()
    .then(() => {
      console.log('✅ Setup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { createDefaultKanbanBoards };
