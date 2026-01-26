/**
 * Analysis Script: Frontend Pages Comparison
 * 
 * Compares old frontend-pages files with newer component versions
 * to identify what needs to be updated.
 */

const fs = require('fs');
const path = require('path');

const oldPagesDir = path.join(__dirname, 'src/features/pages/frontend-pages');
const newComponentsDir = path.join(__dirname, 'src/components/frontend-pages');

function getFiles(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter(dirent => dirent.isFile() && dirent.name.endsWith('.tsx'))
      .map(dirent => dirent.name);
  } catch (e) {
    return [];
  }
}

function getDirectories(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
  } catch (e) {
    return [];
  }
}

function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (e) {
    return 0;
  }
}

function analyzePages() {
  const oldPages = getFiles(oldPagesDir);
  const newComponents = getDirectories(newComponentsDir);
  
  const analysis = {
    oldPages: [],
    newComponents: [],
    recommendations: []
  };

  // Analyze old pages
  oldPages.forEach(file => {
    const filePath = path.join(oldPagesDir, file);
    const size = getFileSize(filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    
    analysis.oldPages.push({
      name: file,
      size: size,
      lines: content.split('\n').length,
      hasPlaceholder: content.includes('TODO') || content.includes('placeholder') || content.includes('mock'),
      imports: (content.match(/^import .+ from/gm) || []).length,
      exports: content.includes('export default') ? 'default' : 'named'
    });
  });

  // Analyze new components structure
  newComponents.forEach(dir => {
    const dirPath = path.join(newComponentsDir, dir);
    const files = getFiles(dirPath);
    const subdirs = getDirectories(dirPath);
    
    analysis.newComponents.push({
      name: dir,
      files: files,
      subdirectories: subdirs,
      hasBanner: files.includes('Banner.tsx') || subdirs.includes('banner')
    });
  });

  // Generate recommendations
  const pageMap = {
    'Homepage.tsx': 'homepage',
    'About.tsx': 'about',
    'Contact.tsx': 'contact',
    'Portfolio.tsx': 'portfolio',
    'Pricing.tsx': 'pricing',
    'Blog.tsx': 'blog'
  };

  analysis.oldPages.forEach(page => {
    const pageName = page.name.replace('.tsx', '');
    const matchingComponent = pageMap[page.name];
    
    if (matchingComponent && analysis.newComponents.find(c => c.name === matchingComponent)) {
      analysis.recommendations.push({
        oldFile: page.name,
        newComponent: matchingComponent,
        action: 'update',
        reason: `Newer component structure exists in components/frontend-pages/${matchingComponent}/`
      });
    } else if (page.hasPlaceholder) {
      analysis.recommendations.push({
        oldFile: page.name,
        action: 'enhance',
        reason: 'Contains placeholder/mock code - needs full implementation'
      });
    }
  });

  return analysis;
}

const result = analyzePages();

console.log('=== Frontend Pages Analysis ===\n');
console.log(`Old Pages Found: ${result.oldPages.length}`);
console.log(`New Component Directories: ${result.newComponents.length}\n`);

console.log('Old Pages Summary:');
result.oldPages.forEach(page => {
  console.log(`  - ${page.name}: ${page.lines} lines, ${page.size} bytes, placeholder: ${page.hasPlaceholder}`);
});

console.log('\nNew Components Available:');
result.newComponents.forEach(comp => {
  console.log(`  - ${comp.name}: ${comp.files.length} files, ${comp.subdirectories.length} subdirs`);
});

console.log('\nRecommendations:');
result.recommendations.forEach(rec => {
  console.log(`  - ${rec.oldFile}: ${rec.action} - ${rec.reason}`);
});

// Write detailed report
const reportPath = path.join(__dirname, 'frontend-pages-analysis-report.json');
fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));
console.log(`\nDetailed report written to: ${reportPath}`);
