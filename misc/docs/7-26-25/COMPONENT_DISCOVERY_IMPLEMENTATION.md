# OrthodoxMetrics Component Discovery System

## 🎯 Overview

The Component Discovery System automatically scans the OrthodoxMetrics frontend codebase to identify all React components and populate the OMB (OrthodoxMetrics Builder) palette. This system provides comprehensive component analysis, categorization, and integration with the OMB visual editor.

## 📊 Discovery Results

The system performs the following analysis:

### Component Detection
- **Scans all relevant files**: `.tsx`, `.jsx`, `.ts`, `.js`, `.vue`
- **Identifies React components**: Function components, class components, hooks-based components, forwardRef components
- **Extracts component metadata**: Props, dependencies, usage patterns, technical details

### Categorization
Components are automatically categorized into:
- **Navigation**: Routers, menus, sidebars, headers, footers, breadcrumbs, tabs
- **Data**: Tables, lists, grids, forms, inputs, selects, pickers, uploads
- **Display**: Cards, modals, dialogs, tooltips, badges, avatars, images, charts
- **Action**: Buttons, links, dropdowns, toggles, switches, sliders, progress bars

### Cross-Reference Analysis
- **Menu System Integration**: Identifies which components are used in navigation menus
- **Route Integration**: Maps components to application routes
- **Usage Context**: Tracks where and how components are implemented

## 🏗️ Architecture

### Backend Components

#### 1. ComponentDiscovery Service (`server/utils/componentDiscovery.js`)
- **Core discovery engine** that scans the frontend codebase
- **Pattern matching** for different component definition styles
- **Metadata extraction** including props, dependencies, and technical details
- **Cross-referencing** with menu and route systems
- **Categorization logic** based on naming patterns and content analysis

**Key Features:**
- Recursive directory scanning with intelligent filtering
- Support for multiple React component patterns
- Props interface extraction from TypeScript definitions
- Security analysis and dependency tracking
- Flexible categorization system

#### 2. API Routes (`server/routes/componentDiscovery.js`)
Provides comprehensive REST API for component discovery:

- `POST /api/components/discover` - Trigger new component discovery
- `GET /api/components/list` - Get discovered components (cached or fresh)
- `GET /api/components/summary` - Get discovery summary statistics
- `GET /api/components/category/:category` - Filter components by category
- `GET /api/components/search` - Search components with filters
- `GET /api/components/component/:name` - Get detailed component information
- `POST /api/components/refresh` - Refresh discovery and update OMB palette
- `GET /api/components/stats` - Get comprehensive statistics

### Frontend Components

#### 3. Component Discovery Panel (`front-end/src/components/admin/ComponentDiscoveryPanel.tsx`)
**Rich admin interface** for managing component discovery:

**Features:**
- **Discovery Management**: Trigger, refresh, and download discovery results
- **Interactive Component Browser**: Search, filter, and explore discovered components
- **Detailed Component View**: Props analysis, technical details, usage information
- **Category Overview**: Visual breakdown of component categories
- **Statistics Dashboard**: Comprehensive metrics and coverage analysis
- **OMB Integration**: Automatic palette updates for visual editor

**User Interface:**
- Material-UI based responsive design
- Tabbed interface (Components, Categories, Statistics)
- Search and filtering capabilities
- Component detail modals with technical specifications
- Visual indicators for menu/route usage

## 📁 File Structure

### Generated Files

#### 1. `auto-discovered-components.json`
**Complete discovery results** with detailed component information:

```json
{
  "version": "1.0.0",
  "generatedAt": "2025-01-26T12:00:00.000Z",
  "generatedBy": "OrthodoxMetrics Component Discovery System",
  "description": "Auto-discovered React components from the OrthodoxMetrics frontend codebase",
  "components": [
    {
      "name": "ComponentName",
      "displayName": "Component Name",
      "filePath": "/full/path/to/component.tsx",
      "relativePath": "components/path/component.tsx",
      "directory": "components/path",
      "category": "display",
      "icon": "Layout",
      "description": "Component Name component (display) with React hooks - 3 props",
      "tags": ["display", "hooks", "jsx", "configurable"],
      "props": [
        {
          "name": "title",
          "optional": false,
          "type": "string",
          "description": "Component title"
        }
      ],
      "usage": {
        "inMenu": true,
        "inRoutes": true,
        "menuContext": "src/routes/Router.tsx",
        "routeContext": "Router.tsx"
      },
      "hasHooks": true,
      "hasJSX": true,
      "isDefault": true,
      "dependencies": ["@mui/material", "react-router"],
      "size": 2048,
      "lines": 156
    }
  ],
  "summary": {
    "totalComponents": 150,
    "categories": {
      "navigation": 25,
      "data": 40,
      "display": 60,
      "action": 25
    },
    "directories": {
      "components": 80,
      "pages": 35,
      "modules": 25,
      "views": 10
    },
    "inMenu": 45,
    "inRoutes": 78,
    "withProps": 120,
    "withHooks": 95,
    "extensions": {
      ".tsx": 140,
      ".jsx": 8,
      ".ts": 2
    }
  },
  "timestamp": "2025-01-26T12:00:00.000Z"
}
```

#### 2. `front-end/src/config/omb-discovered-components.json`
**OMB palette configuration** optimized for visual editor:

```json
{
  "version": "1.0.0",
  "updatedAt": "2025-01-26T12:00:00.000Z",
  "totalComponents": 150,
  "categories": ["navigation", "data", "display", "action"],
  "components": [
    {
      "id": "ComponentName",
      "name": "Component Name",
      "icon": "Layout",
      "category": "display",
      "description": "Component Name component (display) with React hooks - 3 props",
      "tags": ["display", "hooks", "jsx", "configurable"],
      "props": [...],
      "configurable": true,
      "path": "components/path/component.tsx",
      "usage": {...},
      "metadata": {...}
    }
  ]
}
```

## 🚀 Usage

### 1. Run Discovery via CLI

```bash
# Make script executable
chmod +x run-component-discovery.sh

# Run component discovery
./run-component-discovery.sh
```

**Output:**
- Scans entire frontend codebase
- Generates `auto-discovered-components.json`
- Creates OMB palette configuration
- Provides detailed statistics and analysis

### 2. Use via API

```bash
# Trigger discovery
curl -X POST http://localhost:3000/api/components/discover

# Get components list
curl http://localhost:3000/api/components/list

# Search components
curl "http://localhost:3000/api/components/search?q=button&category=action"

# Get component details
curl http://localhost:3000/api/components/component/MyButton
```

### 3. Access via Admin Interface

1. Navigate to `/admin/bigbook`
2. Click "Component Discovery" tab
3. Use the interactive interface to:
   - Run or refresh discovery
   - Browse and search components
   - View detailed component information
   - Download discovery results
   - Monitor statistics and coverage

## 🎨 OMB Integration

### Automatic Palette Population

The discovery system automatically populates the OMB palette with:

1. **Component Icons**: Auto-generated based on category and naming patterns
2. **Category Organization**: Components grouped by functionality
3. **Configurable Components**: Components with props marked as configurable
4. **Usage Indicators**: Visual indicators for menu/route usage
5. **Metadata Access**: Technical details available for advanced users

### Visual Editor Benefits

- **Complete Component Library**: Access to all existing components
- **Smart Categorization**: Intuitive organization by functionality
- **Props Configuration**: Automatic form generation for component props
- **Usage Context**: Understanding of where components are currently used
- **Technical Insights**: File size, complexity, and dependency information

## 📈 Analytics and Insights

### Coverage Metrics
- **Menu Coverage**: Percentage of components used in navigation
- **Route Coverage**: Percentage of components used in routing
- **Props Coverage**: Percentage of components with configurable props
- **Hooks Coverage**: Percentage using modern React patterns

### Directory Analysis
- **Component Distribution**: Breakdown by source directory
- **File Types**: Usage of `.tsx` vs `.jsx` vs `.js`
- **Component Complexity**: File size and line count analysis
- **Dependency Tracking**: External library usage patterns

### Usage Patterns
- **Orphaned Components**: Components not used in menu or routes
- **High-Value Components**: Components with extensive configuration options
- **Modern Components**: Usage of React hooks and modern patterns
- **Legacy Analysis**: Identification of older component patterns

## 🔧 Customization

### Adding New Categories

Modify the `categories` object in `ComponentDiscovery`:

```javascript
this.categories = {
  navigation: ['router', 'nav', 'menu', 'sidebar'],
  data: ['table', 'list', 'grid', 'form'],
  display: ['card', 'modal', 'dialog'],
  action: ['button', 'link', 'dropdown'],
  // Add new category
  layout: ['container', 'wrapper', 'layout']
};
```

### Custom Icon Mapping

Update the `generateDefaultIcon` method:

```javascript
generateDefaultIcon(category, name) {
  const iconMap = {
    navigation: 'Navigation',
    data: 'Database',
    display: 'Layout',
    action: 'MousePointer',
    layout: 'Grid' // New category icon
  };
  
  // Custom icons for specific components
  if (name.toLowerCase().includes('chart')) return 'BarChart';
  // Add more custom mappings
  
  return iconMap[category] || 'Component';
}
```

### Extending Metadata Extraction

Add new metadata fields in `generateFileMetadata`:

```javascript
const metadata = {
  // Existing fields...
  
  // Custom fields
  complexity: this.calculateComplexity(content),
  testCoverage: this.hasTestFile(filePath),
  documentation: this.hasDocumentation(content),
  accessibility: this.checkAccessibility(content)
};
```

## 🔄 Maintenance

### Regular Discovery Updates

Set up automatic discovery updates:

```bash
# Add to cron for daily updates
0 2 * * * cd /var/www/orthodox-church-mgmt/orthodoxmetrics/prod && ./run-component-discovery.sh
```

### API Integration

Integrate with CI/CD pipeline:

```yaml
# GitHub Actions example
- name: Update Component Discovery
  run: |
    ./run-component-discovery.sh
    git add auto-discovered-components.json front-end/src/config/omb-discovered-components.json
    git commit -m "Update component discovery" || exit 0
```

### Monitoring

Track discovery metrics:

```bash
# Component count over time
curl http://localhost:3000/api/components/stats | jq '.stats.totalComponents'

# Coverage analysis
curl http://localhost:3000/api/components/stats | jq '.stats.coverage'
```

## 🎯 Benefits

### For Developers
- **Complete Component Inventory**: Never lose track of created components
- **Usage Analysis**: Understand component adoption patterns
- **Technical Insights**: Code quality and complexity metrics
- **Dependency Tracking**: Library usage and upgrade planning

### For OMB Users
- **Rich Component Palette**: Access to all available components
- **Smart Organization**: Intuitive categorization system
- **Configuration Options**: Automatic props interface generation
- **Usage Context**: Understanding of component purpose and usage

### For Project Management
- **Code Reusability**: Identify reusable components
- **Technical Debt**: Find unused or legacy components
- **Development Efficiency**: Reduce duplicate component creation
- **Quality Metrics**: Track modern React pattern adoption

## 🔮 Future Enhancements

### Planned Features
1. **Component Dependency Graph**: Visual mapping of component relationships
2. **Performance Metrics**: Bundle size impact analysis
3. **Usage Heat Map**: Visual representation of component usage frequency
4. **Automated Documentation**: Generate component documentation from props
5. **Component Health Score**: Overall quality assessment
6. **Migration Assistant**: Help upgrade legacy components

### Integration Opportunities
1. **Storybook Integration**: Automatic story generation
2. **Testing Integration**: Component test coverage analysis
3. **Design System Sync**: Integration with design tokens
4. **Performance Monitoring**: Real-world usage metrics
5. **A/B Testing Support**: Component variant tracking

---

## 📞 Support

For issues or questions regarding the Component Discovery System:

1. **Check the logs**: Discovery process provides detailed logging
2. **Verify file permissions**: Ensure read access to frontend source
3. **Review API responses**: Use browser dev tools or curl for debugging
4. **Consult the generated files**: Check `auto-discovered-components.json` for raw data

The Component Discovery System provides a comprehensive foundation for understanding and managing the OrthodoxMetrics component ecosystem, enabling efficient development and powerful visual editing capabilities through OMB integration. 