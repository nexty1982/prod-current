#!/bin/bash

echo "=== OrthodoxMetrics Component Discovery ==="
echo "Date: $(date)"
echo "Scanning frontend codebase for React components..."

# Navigate to production directory
PROD_ROOT="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod"
echo "Working directory: $PROD_ROOT"

cd "$PROD_ROOT" || {
    echo "❌ Error: Could not change to production directory"
    exit 1
}

echo ""
echo "=== Step 1: Verify Frontend Structure ==="
if [ ! -d "front-end/src" ]; then
    echo "❌ Frontend source directory not found!"
    exit 1
fi

echo "✅ Frontend source directory found"
echo "📁 Scanning directories:"
find front-end/src -type d -name "components" -o -name "modules" -o -name "pages" -o -name "views" | head -10

echo ""
echo "=== Step 2: Component File Count ==="
echo "🔍 Component files by type:"
echo "  .tsx files: $(find front-end/src -name "*.tsx" | wc -l)"
echo "  .jsx files: $(find front-end/src -name "*.jsx" | wc -l)"
echo "  .ts files: $(find front-end/src -name "*.ts" | wc -l)"
echo "  .js files: $(find front-end/src -name "*.js" | wc -l)"

TOTAL_FILES=$(find front-end/src -name "*.tsx" -o -name "*.jsx" -o -name "*.ts" -o -name "*.js" | wc -l)
echo "  Total: $TOTAL_FILES files to analyze"

echo ""
echo "=== Step 3: Run Component Discovery ==="
echo "🔄 Starting automated component discovery..."

node -e "
const ComponentDiscovery = require('./server/utils/componentDiscovery');

async function runDiscovery() {
  try {
    console.log('Initializing component discovery system...');
    const discovery = new ComponentDiscovery();
    
    console.log('Starting component scan...');
    const startTime = Date.now();
    
    const result = await discovery.discoverAllComponents();
    
    const endTime = Date.now();
    const discoveryTime = endTime - startTime;
    
    console.log();
    console.log('✅ Discovery completed successfully!');
    console.log();
    console.log('📊 Discovery Results:');
    console.log('  Total Components Found:', result.components.length);
    console.log('  Discovery Time:', discoveryTime + 'ms');
    console.log();
    console.log('📋 Component Categories:');
    Object.entries(result.summary.categories).forEach(([category, count]) => {
      console.log(\`  \${category}: \${count} components\`);
    });
    console.log();
    console.log('📁 Top Directories:');
    Object.entries(result.summary.directories)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .forEach(([dir, count]) => {
        console.log(\`  \${dir}: \${count} components\`);
      });
    console.log();
    console.log('🔗 Usage Analysis:');
    console.log('  Components in menu system:', result.summary.inMenu);
    console.log('  Components in routes:', result.summary.inRoutes);
    console.log('  Components with props:', result.summary.withProps);
    console.log('  Components using hooks:', result.summary.withHooks);
    console.log();
    
    // Save results to auto-discovered-components.json
    const fs = require('fs').promises;
    const outputData = {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      generatedBy: 'OrthodoxMetrics Component Discovery System',
      description: 'Auto-discovered React components from the OrthodoxMetrics frontend codebase',
      discoveryTime: discoveryTime,
      ...result
    };
    
    await fs.writeFile('auto-discovered-components.json', JSON.stringify(outputData, null, 2));
    console.log('💾 Results saved to: auto-discovered-components.json');
    
    // Also save OMB palette configuration
    const ombComponents = result.components.map(component => ({
      id: component.name,
      name: component.displayName,
      icon: component.icon,
      category: component.category,
      description: component.description,
      tags: component.tags,
      props: component.props,
      configurable: component.props.length > 0,
      path: component.relativePath,
      usage: component.usage,
      metadata: {
        hasHooks: component.hasHooks,
        hasJSX: component.hasJSX,
        isDefault: component.isDefault,
        dependencies: component.dependencies,
        size: component.size,
        lines: component.lines
      }
    }));
    
    const ombConfig = {
      version: '1.0.0',
      updatedAt: new Date().toISOString(),
      totalComponents: ombComponents.length,
      categories: ['navigation', 'data', 'display', 'action'],
      components: ombComponents
    };
    
    // Ensure config directory exists
    await fs.mkdir('front-end/src/config', { recursive: true });
    await fs.writeFile('front-end/src/config/omb-discovered-components.json', JSON.stringify(ombConfig, null, 2));
    console.log('🎨 OMB palette configuration saved to: front-end/src/config/omb-discovered-components.json');
    
    console.log();
    console.log('🎉 Component discovery complete!');
    
  } catch (error) {
    console.error('❌ Discovery failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runDiscovery();
" 2>&1

if [ $? -eq 0 ]; then
    echo ""
    echo "=== Step 4: Verify Output Files ==="
    
    if [ -f "auto-discovered-components.json" ]; then
        echo "✅ auto-discovered-components.json created"
        FILE_SIZE=$(wc -c < auto-discovered-components.json)
        echo "   File size: $((FILE_SIZE / 1024))KB"
        
        # Show sample of components found
        echo ""
        echo "📋 Sample discovered components:"
        node -e "
        const fs = require('fs');
        const data = JSON.parse(fs.readFileSync('auto-discovered-components.json', 'utf8'));
        data.components.slice(0, 5).forEach(c => {
          console.log(\`  \${c.name} (\${c.category}) - \${c.relativePath}\`);
        });
        if (data.components.length > 5) {
          console.log(\`  ... and \${data.components.length - 5} more components\`);
        }
        " 2>/dev/null
    else
        echo "❌ auto-discovered-components.json not created"
    fi
    
    if [ -f "front-end/src/config/omb-discovered-components.json" ]; then
        echo "✅ OMB palette configuration created"
    else
        echo "❌ OMB palette configuration not created"
    fi
    
    echo ""
    echo "=== Step 5: Integration Status ==="
    echo "📡 API Integration:"
    echo "  Component discovery routes: server/routes/componentDiscovery.js"
    echo "  Discovery service: server/utils/componentDiscovery.js"
    echo ""
    echo "🎨 Frontend Integration:"
    echo "  Discovery panel: front-end/src/components/admin/ComponentDiscoveryPanel.tsx"
    echo "  OMB palette config: front-end/src/config/omb-discovered-components.json"
    echo ""
    echo "🌐 Access Points:"
    echo "  API: /api/components/list"
    echo "  Admin Panel: /admin/bigbook → Component Discovery tab"
    echo ""
    
    echo "✅ Component discovery completed successfully!"
    echo ""
    echo "🎯 Next Steps:"
    echo "1. Add ComponentDiscoveryPanel to your admin interface"
    echo "2. Update OMB to use the discovered components"
    echo "3. Access the discovery results via the web interface"
    echo "4. Customize component categories and metadata as needed"
    
else
    echo ""
    echo "❌ Component discovery failed!"
    echo "Check the error messages above for troubleshooting."
    exit 1
fi

echo ""
echo "=== Component Discovery Complete ==="
echo "Generated files:"
echo "  📄 auto-discovered-components.json - Complete discovery results"
echo "  🎨 front-end/src/config/omb-discovered-components.json - OMB palette config"
echo ""
echo "🔗 Integration ready for OMB and admin panels!" 