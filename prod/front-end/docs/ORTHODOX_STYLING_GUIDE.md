# Orthodox Christian UI Styling System

## Overview

This comprehensive Orthodox Christian styling system provides authentic ecclesiastical typography, traditional color palettes, and culturally-appropriate UI components for Orthodox church management applications.

## 🎨 Features

### ✅ **Traditional Orthodox Fonts**
- **EB Garamond**: Primary serif font for sacred text and body content
- **Forum**: Church-style headers with uppercase and spaced letters
- **Cinzel Decorative**: Liturgical and certificate titles with gold accent
- **Old Standard TT**: Slavic-style records and special content
- **Noto Serif Greek**: Polytonic Greek with proper ligatures
- **Noto Serif Cyrillic**: Cyrillic script for Slavonic content

### ✅ **Orthodox Color Palette**
- **Maroon** (`#8a0303`): Primary Orthodox color for headers and accents
- **Gold** (`#C8A951`): Liturgical gold for certificates and highlights
- **Deep Green** (`#1d442d`): Traditional Orthodox green for confidence indicators
- **Cream** (`#faf7f0`): Warm background color for documents
- **Deep Blue** (`#1a365d`): Secondary color for UI elements

### ✅ **Component Styling Classes**

#### Typography Classes
```css
.record-header          /* Forum font, uppercase, spaced letters */
.certificate-title      /* Cinzel Decorative, gold color, large size */
.ocr-preview-text      /* EB Garamond, line-height 1.6 */
.record-body           /* Old Standard TT, serif fallback */
.record-lang-gr        /* Noto Serif Greek, polytonic support */
.record-lang-ru        /* Noto Serif Cyrillic */
.record-lang-ro        /* Default Garamond for Romanian */
```

#### Size Variants
```css
.large    /* Largest size for titles and headers */
.medium   /* Medium size for subtitles */
.small    /* Small size for labels and captions */
```

#### UI Components
```css
.orthodox-card         /* Orthodox-styled card containers */
.orthodox-btn-primary  /* Primary Orthodox buttons */
.orthodox-btn-secondary /* Secondary Orthodox buttons */
.orthodox-btn-gold     /* Gold accent buttons */
.orthodox-badge        /* Status badges with Orthodox colors */
.orthodox-modal        /* Orthodox-styled modals and dialogs */
```

### ✅ **Global Font Stack Variables**

#### CSS Custom Properties
```css
--font-primary: EB Garamond         /* Main body font */
--font-headings: Forum              /* Heading font */
--font-decorative: Cinzel Decorative /* Decorative titles */
--font-body: EB Garamond            /* Body text */
--font-special: Old Standard TT     /* Special content */
```

#### Easy Application
```css
.font-orthodox-primary     /* Apply primary font */
.font-orthodox-headings    /* Apply heading font */
.font-orthodox-decorative  /* Apply decorative font */
.font-orthodox-greek       /* Apply Greek font */
.font-orthodox-cyrillic    /* Apply Cyrillic font */
```

### ✅ **Dark/Light Theme Support**

The system automatically adapts to light and dark themes:

```css
[data-theme="dark"] {
  --orthodox-bg-light: var(--orthodox-bg-dark);
  --orthodox-card-light: var(--orthodox-card-dark);
  --orthodox-border-light: var(--orthodox-border-dark);
}
```

Fonts are preserved across theme changes, maintaining Orthodox typography integrity.

### ✅ **Theme Toggle Component**

The `OrthodoxThemeToggle` component provides three variants:

1. **Icon Variant**: Simple moon/sun toggle button
2. **Switch Variant**: Toggle switch with optional text
3. **Menu Variant**: Advanced settings with theme colors and font preview

```tsx
import OrthodoxThemeToggle from 'src/components/shared/OrthodoxThemeToggle';

// Simple icon toggle
<OrthodoxThemeToggle variant="icon" />

// Switch with text
<OrthodoxThemeToggle variant="switch" showText />

// Full settings menu
<OrthodoxThemeToggle variant="menu" />
```

## 🚀 Usage Examples

### Basic Application
```tsx
// Apply Orthodox fonts to your app
<div className="orthodox-app" data-theme={activeMode}>
  <h1 className="certificate-title large">☦ Sacred Document ☦</h1>
  <p className="record-body">Orthodox church record content...</p>
</div>
```

### Church Record Components
```tsx
<Card className="orthodox-card">
  <CardContent>
    <Typography className="record-header medium">
      Baptismal Record
    </Typography>
    <Typography className="ocr-preview-text">
      Extracted record information...
    </Typography>
    <button className="orthodox-btn-primary">Save Record</button>
  </CardContent>
</Card>
```

### Multilingual Support
```tsx
<Typography className="record-lang-gr">
  Ἱερὰ Ὀρθόδοξος Ἐκκλησία
</Typography>
<Typography className="record-lang-ru">
  Православная Церковь
</Typography>
```

### Utility Classes
```tsx
<div className="bg-orthodox-cream border-orthodox-gold">
  <h2 className="text-orthodox-maroon font-orthodox-headings">
    Orthodox Header
  </h2>
  <p className="text-orthodox-green orthodox-letter-spacing">
    Sacred content with proper spacing
  </p>
</div>
```

## 🎯 AG Grid Integration

For OCR table components, the system includes AG Grid theming:

```tsx
<div className="ag-theme-orthodox">
  <AgGridReact
    // ... your AG Grid props
    className="orthodox-table-container"
  />
</div>
```

Special confidence score styling:
- `.confidence-high` - Green background for high confidence
- `.confidence-medium` - Gold background for medium confidence  
- `.confidence-low` - Maroon background for low confidence

## 📁 File Structure

```
src/
├── styles/
│   └── orthodox-fonts.css          # Main Orthodox styling
├── components/
│   ├── shared/
│   │   └── OrthodoxThemeToggle.tsx  # Theme toggle component
│   └── demos/
│       └── OrthodoxThemeDemo.tsx    # Demo showcase
└── views/apps/ocr/
    ├── OCRPreviewTableEnhanced.tsx  # OCR table with Orthodox styling
    └── OCRRecordsDemo.tsx           # Usage demo
```

## 🔧 Customization

### Adding Custom Colors
```css
:root {
  --orthodox-custom-color: #your-color;
}
```

### Custom Font Stacks
```css
:root {
  --font-custom: 'Your Font', 'Fallback', serif;
}
```

### Animation Control
```css
.orthodox-sacred {
  animation: orthodox-glow 3s ease-in-out infinite;
}
```

## 🌍 Browser Support

- All modern browsers supporting CSS custom properties
- Graceful degradation to system fonts if Google Fonts fail to load
- Responsive design with mobile-optimized font sizes

## 📝 Integration Checklist

- [x] Import `orthodox-fonts.css` in your main app
- [x] Apply `orthodox-app` class to your app container
- [x] Add `data-theme` attribute for theme support
- [x] Use Orthodox typography classes for components
- [x] Implement `OrthodoxThemeToggle` in your header
- [x] Test multilingual font rendering
- [x] Verify dark/light theme transitions

## 🎨 Demo

Visit `/demos/orthodox-theme` to see the complete Orthodox styling system in action with:
- Live theme switching
- Typography showcase
- Color palette demonstration
- Multilingual examples
- Component gallery

---

*"In the beginning was the Word, and the Word was with God, and the Word was God."* - John 1:1

This Orthodox styling system honors the sacred tradition of beautiful typography in service of the Church.
