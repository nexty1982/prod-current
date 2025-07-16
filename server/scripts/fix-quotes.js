const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'front-end', 'src', 'components', 'KanbanColumn.tsx');

try {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace all escaped quotes with normal quotes
  content = content.replace(/\\"/g, '"');
  
  fs.writeFileSync(filePath, content);
  console.log('✅ Fixed escaped quotes in KanbanColumn.tsx');
} catch (error) {
  console.error('❌ Error fixing file:', error.message);
}
