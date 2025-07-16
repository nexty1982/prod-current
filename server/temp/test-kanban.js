// Test kanban routes step by step
console.log('Testing kanban route imports...');

try {
  console.log('1. Testing config/db...');
  const db = require('./config/db');
  console.log('✓ Database config loaded');
  
  console.log('2. Testing middleware/auth...');
  const auth = require('./middleware/auth');
  console.log('✓ Auth middleware loaded');
  
  console.log('3. Testing kanban/boards...');
  const boards = require('./routes/kanban/boards');
  console.log('✓ Boards router loaded');
  
  console.log('4. Testing kanban/tasks...');
  const tasks = require('./routes/kanban/tasks');
  console.log('✓ Tasks router loaded');
  
  console.log('5. Testing kanban/index...');
  const kanbanIndex = require('./routes/kanban/index');
  console.log('✓ Kanban index router loaded');
  
  console.log('All kanban components loaded successfully!');
} catch (error) {
  console.error('Error:', error);
}
