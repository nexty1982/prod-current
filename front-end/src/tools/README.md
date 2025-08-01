# Site Structure Visualizer

## Overview

The Site Structure Visualizer is a powerful developer utility component built for OrthodoxMetrics that provides an interactive graph visualization of your entire frontend project structure. It helps developers understand code relationships, dependencies, and architectural patterns through an intuitive visual interface.

## Features

### 🔍 Project Scanning
- **Recursive File Analysis**: Scans all source files in `/src` (`.tsx`, `.jsx`, `.ts`, `.js`)
- **Smart Classification**: Automatically identifies pages, components, layouts, routes, APIs, and hooks
- **Dependency Mapping**: Tracks imports, exports, and component relationships
- **API Endpoint Detection**: Finds and maps all API calls throughout the codebase

### 🎨 Interactive Visualization
- **Cytoscape.js Integration**: Professional-grade graph visualization library
- **Multiple Layout Algorithms**: 
  - Dagre (Hierarchical)
  - Circle Layout
  - Grid Layout
  - Force-directed (Cose)
- **Color-coded Nodes**: Each file type has distinct colors and shapes
- **Zoom & Pan**: Navigate large codebases with ease
- **Node Selection**: Click nodes to view detailed information

### 🧩 Node Types & Styling

| Type | Color | Shape | Icon | Description |
|------|-------|-------|------|-------------|
| **Pages** | Blue (#2196F3) | Round Rectangle | 📊 | Main application pages/views |
| **Components** | Orange (#FF9800) | Ellipse | 🧩 | Reusable React components |
| **Layouts** | Purple (#9C27B0) | Diamond | 🏗️ | Layout wrapper components |
| **Routes** | Green (#4CAF50) | Triangle | 🛤️ | Route definitions and configs |
| **APIs** | Gray (#607D8B) | Rectangle | 🔌 | API endpoints and services |
| **Hooks** | Teal (#00BCD4) | Hexagon | ⚡ | Custom React hooks |

### 🔗 Relationship Types

- **Imports** (Blue): Component imports another module
- **API Calls** (Red): Component makes API requests
- **Routes** (Green): Router connects to components
- **Layout Usage** (Purple): Components use specific layouts

### 🎛️ Control Panel Features

#### Filters Tab
- **Search Functionality**: Find nodes by name or file path
- **Multi-type Selection**: Filter by multiple node types simultaneously
- **Layout Switching**: Change graph layout in real-time
- **Display Options**: Toggle labels, grouping, and visual settings

#### Stats Tab
- **Project Metrics**: Real-time count of each file type
- **Visual Breakdown**: Color-coded statistics cards
- **Progress Tracking**: Monitor codebase growth over time

#### Export Tab
- **PNG Export**: High-quality image export with transparent background
- **JPG Export**: Compressed image format for sharing
- **JSON Export**: Complete graph data for external analysis

### 📊 Node Details Dialog

When clicking on any node, view detailed information:
- **File Path**: Complete relative path from project root
- **Type Classification**: Identified file type with color coding
- **Imports List**: All imported dependencies (expandable)
- **API Calls**: REST endpoints called by this file
- **Route Definitions**: For router files, shows all defined routes

## Usage Guide

### Accessing the Tool

1. **Via Navigation**: Go to Developer Tools → Site Structure Visualizer
2. **Direct URL**: Visit `/tools/site-structure`
3. **Permission**: Requires admin-level access

### Basic Workflow

1. **Initial Scan**: Click "Scan Project" to analyze your codebase
2. **Explore Structure**: Use zoom, pan, and drag to navigate the graph
3. **Filter Results**: Use the control panel to focus on specific file types
4. **Investigate Nodes**: Click on nodes to see detailed information
5. **Export Results**: Save visualizations or data for documentation

### Advanced Features

#### Search & Filter
```typescript
// Search supports:
- File names (e.g., "Dashboard", "Login")
- File paths (e.g., "views/apps", "components/shared")
- Multiple node types simultaneously
```

#### Layout Algorithms
- **Dagre**: Best for hierarchical relationships (default)
- **Circle**: Good for showing equal relationships
- **Grid**: Organized view for large datasets
- **Cose**: Physics-based layout for natural clustering

#### Export Options
- **PNG**: Perfect for documentation and presentations
- **JSON**: Complete graph data including metadata and relationships

## Technical Implementation

### Architecture

```
SiteStructureVisualizer.tsx
├── File Scanning System
│   ├── simulateFileScan() - Demo file discovery
│   ├── parseFile() - Content analysis
│   └── determineFileType() - Smart classification
├── Graph Generation
│   ├── Node Creation - File entities
│   ├── Edge Creation - Relationships
│   └── Cytoscape Integration
└── UI Components
    ├── Control Panel (Filters/Stats/Export)
    ├── Graph Renderer
    └── Details Dialog
```

### Data Structures

```typescript
interface FileNode {
    id: string;
    type: 'page' | 'component' | 'layout' | 'route' | 'api' | 'hook';
    label: string;
    path: string;
    imports: string[];
    exports: string[];
    apiCalls: string[];
    routeDefinitions: RouteDefinition[];
}

interface GraphEdge {
    id: string;
    source: string;
    target: string;
    type: 'imports' | 'renders' | 'calls' | 'routes' | 'layout';
}
```

### File Parser Utilities

The `FileParser` class (`/tools/utils/FileParser.ts`) provides:
- **AST-like Parsing**: Regex-based parsing (upgradeable to full AST)
- **Dependency Detection**: Import/export relationship mapping
- **Circular Dependency Detection**: Identifies problematic code patterns
- **Complexity Metrics**: Lines of code, import count, component analysis

## Development Notes

### Current Implementation Status
- ✅ **Simulation Mode**: Uses mock data representing OrthodoxMetrics structure
- ✅ **Full UI**: Complete interface with all planned features
- ✅ **Export Functionality**: PNG, JPG, JSON export working
- ⚠️ **File Scanning**: Currently simulated (ready for real implementation)

### Future Enhancements

#### Real File Scanning
```typescript
// In production, replace simulation with:
const files = await window.electronAPI?.scanFiles('/src');
// Or use Webpack context:
const context = require.context('../../../src', true, /\.(tsx?|jsx?)$/);
```

#### AST Integration
```typescript
// Replace regex parsing with proper AST:
import * as ts from 'typescript';
import * as parser from '@babel/parser';
```

#### Performance Optimizations
- **Incremental Scanning**: Only scan changed files
- **Web Workers**: Move heavy parsing to background threads
- **Caching**: Store parsed results for faster subsequent loads

### Configuration

The tool can be customized via the Cytoscape configuration:

```typescript
const cytoscapeConfig = {
    style: [...], // Node and edge styling
    layout: {
        name: 'dagre',
        rankDir: 'TB',
        spacingFactor: 1.5
    },
    minZoom: 0.1,
    maxZoom: 3.0,
    wheelSensitivity: 0.2
};
```

## Use Cases

### 📋 Code Reviews
- **Architecture Validation**: Ensure proper separation of concerns
- **Dependency Analysis**: Identify tight coupling and circular dependencies
- **Code Organization**: Verify files are in appropriate directories

### 🏗️ Refactoring
- **Impact Analysis**: See which components will be affected by changes
- **Dead Code Detection**: Find unused components and utilities
- **Dependency Optimization**: Reduce unnecessary imports

### 📚 Documentation
- **Architecture Diagrams**: Generate visual documentation automatically
- **Onboarding**: Help new developers understand codebase structure
- **Technical Debt**: Identify complex areas that need attention

### 🔍 Debugging
- **Data Flow**: Trace how data moves through the application
- **Component Hierarchy**: Understand parent-child relationships
- **API Integration**: See which components use which endpoints

## Troubleshooting

### Common Issues

#### Graph Not Displaying
- Check browser console for JavaScript errors
- Ensure Cytoscape.js dependencies are loaded
- Verify the container element has proper dimensions

#### Performance Issues
- Reduce visible node types using filters
- Use simpler layouts (Grid instead of Dagre)
- Clear browser cache and restart application

#### Missing Dependencies
```bash
npm install cytoscape cytoscape-dagre cytoscape-popper
```

### Support

For issues or feature requests related to the Site Structure Visualizer:
1. Check the browser console for errors
2. Verify you have admin permissions
3. Try refreshing the application
4. Contact the development team with specific error messages

## Contributing

To contribute to the Site Structure Visualizer:

1. **File Location**: `/src/tools/SiteStructureVisualizer.tsx`
2. **Dependencies**: `/src/tools/utils/FileParser.ts`
3. **Menu Integration**: `/src/layouts/full/vertical/sidebar/MenuItems.ts`
4. **Route Config**: `/src/routes/Router.tsx`

### Adding New Features

1. **Node Types**: Add new file classifications in `determineFileType()`
2. **Layouts**: Integrate additional Cytoscape layout algorithms
3. **Export Formats**: Add SVG or PDF export capabilities
4. **Analysis**: Enhance the `FileParser` utility class

---

*This tool is part of the OrthodoxMetrics development toolkit and requires appropriate permissions to access.*
