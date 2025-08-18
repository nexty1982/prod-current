# Component Library Migration Log

This document tracks all components that have been extracted and reorganized into the @om/components library.

## Migration Summary

**Start Date**: Current  
**Status**: In Progress  
**Source Systems**: 
- OrthodoxMetrics Frontend (`/src/components/`)
- Raydar Template (`/misc/tasks/node/raydar/src/components/`)

## Extracted Components

### UI Components (/ui)

#### Forms
- **TextFormInput** (`/ui/forms/TextFormInput.tsx`)
  - **Source**: Raydar template (`/components/form/TextFormInput.tsx`)
  - **Changes**: 
    - Converted from React Bootstrap to Material-UI
    - Enhanced TypeScript interfaces
    - Added JSDoc documentation
    - Improved error handling and validation display

- **SelectFormInput** (`/ui/forms/SelectFormInput.tsx`)
  - **Source**: Raydar template (`/components/form/SelectFormInput.tsx`) + OrthodoxMetrics patterns
  - **Changes**:
    - Unified Material-UI Select implementation
    - Support for both simple string arrays and option objects
    - Enhanced TypeScript generics
    - Added comprehensive prop documentation

- **PasswordFormInput** (`/ui/forms/PasswordFormInput.tsx`)
  - **Source**: Raydar template (`/components/form/PasswordFormInput.tsx`)
  - **Changes**:
    - Converted from React Bootstrap to Material-UI
    - Enhanced password visibility toggle with proper ARIA labels
    - Improved TypeScript interfaces and generics
    - Added configurable toggle button option
    - Better integration with react-hook-form

- **TextAreaFormInput** (`/ui/forms/TextAreaFormInput.tsx`)
  - **Source**: Raydar template (`/components/form/TextAreaFormInput.tsx`)
  - **Changes**:
    - Converted from React Bootstrap to Material-UI
    - Added auto-resize functionality with configurable min/max rows
    - Enhanced TypeScript interfaces
    - Improved validation and error display
    - Better integration with Material-UI multiline TextField

- **DropzoneFormInput** (`/ui/forms/DropzoneFormInput.tsx`)
  - **Source**: Raydar template (`/components/form/DropzoneFormInput.tsx`)
  - **Changes**:
    - Converted from React Bootstrap to Material-UI
    - Enhanced file preview with image thumbnails and file type icons
    - Added upload progress support
    - Improved drag and drop visual feedback
    - Better error handling and file validation
    - Enhanced accessibility with proper ARIA labels
    - Configurable file size and type restrictions

#### Theme
- **ThemeCustomizer** (`/ui/theme/ThemeCustomizer.tsx`)
  - **Source**: Raydar template (`/components/ThemeCustomizer.tsx`)
  - **Changes**:
    - Converted from React Bootstrap Offcanvas to Material-UI Drawer
    - Enhanced TypeScript interfaces with proper theme settings type
    - Improved component structure and props API
    - Added comprehensive JSDoc documentation

### Feature Components (/features)

#### Authentication & User Management
- **UserFormModal** (`/features/auth/UserFormModal.tsx`)
  - **Source**: OrthodoxMetrics (`/components/UserFormModal.tsx`)
  - **Changes**:
    - Enhanced TypeScript interfaces for all props and state
    - Made component more modular with optional SocialPermissionsComponent prop
    - Improved role management with configurable available roles
    - Added comprehensive JSDoc documentation
    - Maintained full backward compatibility
    - Enhanced password generation with better security
    - Improved validation and error handling

## Component Categories

### `/ui` - Basic UI Components
- ✅ Forms: TextFormInput, SelectFormInput, PasswordFormInput, TextAreaFormInput, DropzoneFormInput
- ✅ Theme: ThemeCustomizer
- ⏳ Feedback: Alerts, notifications, loading states (pending)
- ⏳ Navigation: Breadcrumbs, pagination, tabs (pending)
- ⏳ Data Display: Cards, lists, tables (pending)

### `/layout` - Structural Components
- ⏳ Containers: Page containers, content wrappers (pending)
- ⏳ Headers: Topbars, navigation headers (pending)
- ⏳ Sidebars: Navigation sidebars, collapsible menus (pending)
- ⏳ Footers: Page footers, sticky footers (pending)

### `/features` - Domain-Specific Components
- ✅ Auth: UserFormModal
- ⏳ Auth: AuthenticationComponent, ResetPasswordModal (pending)
- ⏳ Calendar: Liturgical calendar, date pickers (pending)
- ⏳ Church: Church-specific widgets, records management (pending)
- ⏳ Admin: Administrative tools, settings panels (pending)

### `/charts` - Data Visualization
- ⏳ MUI Charts: Material-UI chart integrations (pending)
- ⏳ AG Grid: Data grid configurations and themes (pending)
- ⏳ Custom: Specialized chart components (pending)

### `/data` - Data Management
- ⏳ Schemas: Form schemas, validation rules (pending)
- ⏳ Providers: Data providers, context wrappers (pending)
- ⏳ Hooks: Custom data fetching and state management hooks (pending)

### `/legacy` - Deprecated Components
- ⏳ Components that are deprecated but still required (pending)

## Design Decisions

### Component Priority
1. **OrthodoxMetrics components take priority** when there's overlap with Raydar components
2. **Raydar components used for enhancement** when they provide better structure or visual appeal
3. **Material-UI consistency** - all components use Material-UI for consistency

### TypeScript Standards
- All components fully typed with comprehensive interfaces
- Generic types used where appropriate (form inputs)
- JSDoc comments for all public interfaces
- Proper export patterns (named exports + default)

### Breaking Changes
- **None**: All extracted components maintain backward compatibility
- **Import paths**: New components available via `@om/components/*` but original paths still work
- **Props**: Enhanced with additional optional props but no required prop changes

## Naming Conventions

### Component Names
- **PascalCase** for all component names
- **Descriptive names** indicating purpose and domain
- **No prefix conflicts** with existing OrthodoxMetrics components

### File Structure
- **One component per file** with matching filename
- **Index files** for barrel exports in each category
- **Co-located types** in the same file as the component when component-specific

## Next Steps

### Immediate (Phase 2)
1. Extract remaining form components from Raydar (PasswordFormInput, TextAreaFormInput, etc.)
2. Extract layout components (headers, sidebars, containers)
3. Extract authentication components (AuthenticationComponent, ResetPasswordModal)

### Medium-term (Phase 3)
1. Extract church management components
2. Extract calendar and liturgical components
3. Extract administrative tools and settings panels

### Long-term (Phase 4)
1. Extract chart and data visualization components
2. Extract data management utilities and hooks
3. Create component preview/storybook system

## Import Migration Strategy

### Current State
```typescript
// Old imports still work
import UserFormModal from '../components/UserFormModal';

// New imports available
import { UserFormModal } from '@om/components/features/auth';
import { TextFormInput, SelectFormInput } from '@om/components/ui/forms';
```

### Future State (after full migration)
```typescript
// Recommended new imports
import { UserFormModal } from '@om/components/features/auth';
import { ThemeCustomizer } from '@om/components/ui/theme';
import * as UIComponents from '@om/components/ui';
```

## Testing Strategy

### Component Testing
- All extracted components should be tested in isolation
- Props validation and TypeScript checking
- Component preview system for visual testing

### Integration Testing
- Ensure existing pages continue to work with extracted components
- Test both old and new import paths
- Validate no regression in functionality