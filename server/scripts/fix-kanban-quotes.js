const fs = require('fs');
const path = require('path');

// Fix escaped quotes in all Kanban components
const componentsDir = path.join(__dirname, 'front-end/src/components');
const pagesDir = path.join(__dirname, 'front-end/src/pages/kanban');

const filesToFix = [
  path.join(componentsDir, 'KanbanColumn.tsx'),
  path.join(componentsDir, 'KanbanTaskCard.tsx'),
  path.join(componentsDir, 'KanbanBoard.tsx'),
  path.join(componentsDir, 'KanbanTaskModal.tsx'),
  path.join(componentsDir, 'MarkdownUpload.tsx'),
  path.join(pagesDir, 'index.tsx')
];

function fixEscapedQuotes(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      console.log(`🔧 Fixing escaped quotes in ${path.basename(filePath)}...`);
      
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Replace all escaped quotes with regular quotes
      content = content.replace(/\\"/g, '"');
      
      fs.writeFileSync(filePath, content);
      
      console.log(`✅ Successfully fixed ${path.basename(filePath)}`);
    } else {
      console.log(`⚠️  File not found: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
  }
}

console.log('🚀 Starting to fix escaped quotes in Kanban components...');

filesToFix.forEach(fixEscapedQuotes);

console.log('✅ Finished fixing escaped quotes in all Kanban components!');
