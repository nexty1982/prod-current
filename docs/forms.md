# Forms System Documentation

## Overview

A modern, professional form system has been implemented for record entry forms, specifically redesigned for the Baptism Record entry UI. The system provides reusable form components with validation, sectioned layouts, and a consistent user experience.

## Location

All form components are located in:
```
src/features/forms/
```

## Components

### Core Form Components

#### 1. `FormTextField`
A text input field with Formik integration and automatic validation display.

**Location:** `src/features/forms/FormTextField.tsx`

**Props:**
- `name: string` - Field name (required, must match Formik field)
- `showError?: boolean` - Whether to show validation errors (default: true)
- All standard MUI `TextField` props

**Example:**
```tsx
<FormTextField
  name="child_first_name"
  label="First Name"
  required
  placeholder="e.g., John"
/>
```

#### 2. `FormDateField`
A date picker field with MM/DD/YYYY format using MUI DatePicker and dayjs.

**Location:** `src/features/forms/FormDateField.tsx`

**Props:**
- `name: string` - Field name (required)
- `showError?: boolean` - Whether to show validation errors (default: true)
- `label?: string` - Field label
- `placeholder?: string` - Placeholder text (default: "MM/DD/YYYY")
- All standard MUI `TextField` props

**Example:**
```tsx
<FormDateField
  name="date_of_birth"
  label="Date of Birth"
  required
  placeholder="MM/DD/YYYY"
/>
```

**Note:** Dates are stored as ISO strings (YYYY-MM-DD) for backend compatibility.

#### 3. `FormSelectSearch`
A searchable dropdown/autocomplete field with typeahead functionality.

**Location:** `src/features/forms/FormSelectSearch.tsx`

**Props:**
- `name: string` - Field name (required)
- `label: string` - Field label (required)
- `options: Array<{ id: number | string; name: string } | string>` - Options array
- `showError?: boolean` - Whether to show validation errors (default: true)
- `required?: boolean` - Whether field is required (default: false)
- `placeholder?: string` - Placeholder text
- `disabled?: boolean` - Whether field is disabled (default: false)
- `helperText?: string` - Helper text
- `defaultValue?: string` - Default value to preselect

**Example:**
```tsx
<FormSelectSearch
  name="church"
  label="Church"
  options={churchOptions}
  required
  placeholder="Search or select a church..."
  defaultValue={currentChurch}
/>
```

#### 4. `FormChipsField`
A chip input field for multi-value inputs (e.g., godparent names). Users can add chips by pressing Enter or comma, and remove them by clicking the X.

**Location:** `src/features/forms/FormChipsField.tsx`

**Props:**
- `name: string` - Field name (required)
- `label: string` - Field label (required)
- `placeholder?: string` - Placeholder text (default: "Type a name and press Enter or comma")
- `showError?: boolean` - Whether to show validation errors (default: true)
- `required?: boolean` - Whether field is required (default: false)
- `disabled?: boolean` - Whether field is disabled (default: false)
- `helperText?: string` - Helper text
- `serializeFormat?: (chips: string[]) => string` - Custom serialization function (default: joins with "; ")

**Example:**
```tsx
<FormChipsField
  name="godparents"
  label="Godparent Names"
  placeholder="Type a name and press Enter or comma"
  serializeFormat={(chips) => chips.join('; ')}
/>
```

**Features:**
- Press Enter or comma to add a chip
- Press Backspace when input is empty to remove the last chip
- Click X on a chip to remove it
- Automatically serializes to string format for backend (default: "; " separated)

#### 5. `RecordSectionCard`
A card component for grouping form fields into logical sections.

**Location:** `src/features/forms/RecordSectionCard.tsx`

**Props:**
- `title: string` - Section title (required)
- `helperText?: string` - Optional helper text below title
- `children: React.ReactNode` - Form fields to display

**Example:**
```tsx
<RecordSectionCard
  title="Person"
  helperText="Enter the personal information of the person being baptized"
>
  <FormTextField name="first_name" label="First Name" required />
  <FormTextField name="last_name" label="Last Name" required />
</RecordSectionCard>
```

**Layout:**
- Desktop (md+): 2-column grid
- Mobile: 1-column grid
- Responsive spacing and styling

## Baptism Record Form Redesign

### Location
- Entry Page: `src/features/records/baptism/BaptismRecordEntryPage.tsx`
- Form Component: `src/features/records/baptism/BaptismRecordForm.tsx`

### Form Structure

The Baptism Record form is organized into 5 sections:

#### 1. Person Section
- **First Name*** (required)
- **Last Name*** (required)
- **Date of Birth*** (required)
- Place of Birth

#### 2. Baptism Event Section
- **Date of Baptism*** (required)
- **Church*** (required, searchable dropdown)
- **Priest*** (required, searchable dropdown)

#### 3. Family Section
- Father's Name
- Mother's Name

#### 4. Sponsors Section
- Godparent Names (chip input - press Enter/comma to add)

#### 5. Registry & Notes Section
- Registry Number
- Notes (textarea, spans full width)

### Features

#### Validation
- Required fields: First Name, Last Name, Date of Birth, Date of Baptism, Church
- Inline validation messages appear after blur or submit attempt
- Uses Formik + Yup for validation

#### User Experience
- **Sticky Footer**: Action buttons remain visible at bottom
- **Unsaved Changes Warning**: Confirmation dialog when canceling with unsaved changes
- **Loading States**: Buttons show "Saving..." during submission
- **Toast Notifications**: Success/error messages appear in top-right corner
- **Save & Add Another**: Option to save and immediately start a new entry

#### Responsive Design
- Desktop (md+): 2-column grid layout
- Mobile: 1-column layout
- Consistent spacing and alignment

## How to View/Test

### Accessing the Baptism Record Entry Form

The Baptism Record Entry form can be accessed in the following ways:

1. **Via Route (if configured):**
   Add a route in `Router.tsx`:
   ```tsx
   {
     path: '/apps/records/baptism/new',
     element: (
       <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
         <BaptismRecordEntryPage />
       </ProtectedRoute>
     )
   }
   ```
   Then navigate to: `/apps/records/baptism/new`

2. **Via Button/Link from Records List:**
   The form can be accessed from the baptism records list page (`/apps/records/baptism`) by clicking an "Add New" or "Create Record" button that navigates to the entry page.

3. **Development Server:**
   ```bash
   cd front-end
   npm run dev
   # or
   pnpm dev
   ```
   Default port is typically `5174`, so navigate to: `http://localhost:5174/apps/records/baptism/new` (once route is configured)

### Testing the Form

1. **Required Field Validation:**
   - Try submitting without filling required fields
   - Validation errors should appear below each field
   - Fields marked with * are required

2. **Date Picker:**
   - Click on date fields to open calendar picker
   - Can also type dates in MM/DD/YYYY format
   - Dates are validated and formatted automatically

3. **Searchable Dropdowns:**
   - Type in Church or Priest fields to search
   - Options filter as you type
   - Can select from dropdown or type custom value

4. **Chip Input (Godparents):**
   - Type a name and press Enter or comma to add
   - Click X on a chip to remove
   - Press Backspace when input is empty to remove last chip

5. **Unsaved Changes:**
   - Fill in some fields
   - Click Cancel
   - Confirmation dialog should appear

6. **Form Submission:**
   - Fill all required fields
   - Click "Save Record" or "Save & Add Another"
   - Toast notification should appear
   - On success, redirects to records list (or stays on form for "Add Another")

## Backend Integration

### Payload Transformation

The form data is transformed to match the existing backend contract:

```typescript
{
  first_name: string,           // from child_first_name
  last_name: string,             // from child_last_name
  birth_date: string,            // from date_of_birth (YYYY-MM-DD)
  reception_date: string,       // from date_of_baptism (YYYY-MM-DD)
  birthplace: string,            // from place_of_birth
  entry_type: string,            // defaults to "Baptism"
  sponsors: string,             // from godparents (serialized as "; " separated)
  parents: string,               // combined from father_name and mother_name
  clergy: string,                // from officiating_priest
  church: string,                // from church
  register_number: string,      // from register_number
  notes: string                  // from notes
}
```

### API Endpoint

The form uses the existing API:
- Endpoint: `/api/baptism-records`
- Method: POST
- Function: `createRecord(RECORD_TYPES.BAPTISM, payload)`

## Usage in Other Record Types

These form components are reusable for other record types (Marriage, Funeral, etc.):

```tsx
import {
  FormTextField,
  FormDateField,
  FormSelectSearch,
  FormChipsField,
  RecordSectionCard,
} from '@/features/forms';

// Use in your form component
<RecordSectionCard title="Section Title" helperText="Helper text">
  <FormTextField name="field_name" label="Field Label" required />
  <FormDateField name="date_field" label="Date" />
  {/* ... */}
</RecordSectionCard>
```

## Dependencies

- `@mui/material` - UI components
- `@mui/x-date-pickers` - Date picker
- `formik` - Form state management
- `yup` - Validation schemas
- `dayjs` - Date manipulation

## Quick Reference

### Import Statement
```tsx
import {
  FormTextField,
  FormDateField,
  FormSelectSearch,
  FormChipsField,
  RecordSectionCard,
} from '@/features/forms';
```

### Basic Form Structure
```tsx
import { Formik } from 'formik';
import * as Yup from 'yup';
import { RecordFormShell } from '@/components/records/RecordFormShell';
import { FormTextField, RecordSectionCard } from '@/features/forms';

const validationSchema = Yup.object().shape({
  field_name: Yup.string().required('Field is required'),
});

<Formik
  initialValues={{ field_name: '' }}
  validationSchema={validationSchema}
  onSubmit={handleSubmit}
>
  <RecordFormShell
    title="Form Title"
    footerActions={{
      onCancel: handleCancel,
      onSave: handleSubmit,
      loading: isSubmitting,
    }}
  >
    <RecordSectionCard title="Section" helperText="Helper text">
      <FormTextField name="field_name" label="Field Label" required />
    </RecordSectionCard>
  </RecordFormShell>
</Formik>
```

## Future Enhancements

Potential improvements:
- Add more field types (number, email, phone, etc.)
- Add field grouping/conditional display
- Add form wizard/stepper support
- Add field-level help tooltips
- Add custom validation rules builder
