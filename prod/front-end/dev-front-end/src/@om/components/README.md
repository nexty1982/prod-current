# @om/components - Orthodox Metrics Component Library

A unified component library combining the best components from OrthodoxMetrics and Raydar templates.

## Directory Structure

### `/ui` - Basic UI Components
- **Forms**: Input fields, buttons, selectors, form controls
- **Feedback**: Alerts, notifications, loading states, error boundaries
- **Navigation**: Breadcrumbs, pagination, tabs
- **Data Display**: Cards, lists, tables, typography

### `/layout` - Structural Components
- **Containers**: Page containers, content wrappers
- **Headers**: Topbars, navigation headers
- **Sidebars**: Navigation sidebars, collapsible menus
- **Footers**: Page footers, sticky footers

### `/features` - Domain-Specific Components
- **Auth**: Login forms, user management, permissions
- **Calendar**: Liturgical calendar, date pickers, event displays
- **Church**: Church-specific widgets, records management
- **Admin**: Administrative tools, settings panels

### `/charts` - Data Visualization
- **MUI Charts**: Material-UI chart integrations
- **AG Grid**: Data grid configurations and themes
- **Custom**: Specialized chart components

### `/data` - Data Management
- **Schemas**: Form schemas, validation rules
- **Providers**: Data providers, context wrappers
- **Hooks**: Custom data fetching and state management hooks

### `/legacy` - Deprecated Components
- Components that are deprecated but still required for backward compatibility

## Usage

```typescript
// Import individual components
import { TextFormInput } from '@om/components/ui/forms';
import { ThemeCustomizer } from '@om/components/ui/theme';
import { UserFormModal } from '@om/components/features/auth';

// Import category bundles
import * as UIComponents from '@om/components/ui';
import * as LayoutComponents from '@om/components/layout';
```

## Component Guidelines

### TypeScript
- All components must be fully typed with TypeScript
- Use proper interface definitions for props
- Include JSDoc comments for auto-completion support

### Documentation
- Each component should have JSDoc comments
- Include usage examples in comments
- Document all props and their types

### Naming Convention
- Use PascalCase for component names
- Use descriptive names that indicate purpose
- Prefix with domain when applicable (e.g., `ChurchRecordForm`)

### Export Strategy
- Named exports for individual components
- Default exports for main component in each file
- Barrel exports in index.ts files

## Migration from Existing Components

Components have been extracted and unified from:
- OrthodoxMetrics frontend (`/src/components/`)
- Raydar template (`/src/components/`)

See `MIGRATION_LOG.md` for detailed changes and component mappings.

## Development

### Adding New Components
1. Create component in appropriate category folder
2. Add TypeScript interfaces
3. Include JSDoc documentation
4. Export in category index.ts
5. Update main index.ts

### Testing
Components should be tested in the sandbox environment at `/sandbox/component-preview`.