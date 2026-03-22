# Orthodox Metrics Design System Guide
## Complete Light/Dark Mode Implementation

---

## 🎨 Design Philosophy

The Orthodox Metrics design system respects Orthodox tradition while embracing modern usability. Both light and dark modes are **first-class citizens**, designed intentionally for:

- **Hierarchy**: Clear visual hierarchy using color, typography, and spacing
- **Readability**: WCAG AA compliant contrast ratios in both themes
- **Consistency**: Reusable components with predictable behavior
- **Tradition**: Colors and aesthetics honor Orthodox heritage

---

## 🌈 Color System

### Brand Colors (Theme-Independent)
```css
--om-purple-deep: #2d1b4e    /* Primary brand purple */
--om-purple-mid: #3a2461     /* Mid-tone purple */
--om-purple-light: #4a2f74   /* Light purple */
--om-gold: #d4af37           /* Orthodox gold */
--om-gold-dark: #c29d2f      /* Darker gold for hovers */
```

### Semantic Colors

#### Light Mode
```css
--om-bg-base: #ffffff        /* Page backgrounds */
--om-bg-elevated: #f9fafb    /* Alternate sections */
--om-bg-subtle: #f3f4f6      /* Subtle backgrounds */
--om-bg-input: #ffffff       /* Form inputs */

--om-text-primary: #2d1b4e   /* Headings, primary text */
--om-text-secondary: #4a5565 /* Body text, secondary */
--om-text-tertiary: #6b7280  /* Captions, metadata */
--om-text-inverse: #ffffff   /* Text on dark backgrounds */

--om-border-default: #e5e7eb /* Default borders */
--om-border-subtle: #f3f4f6  /* Subtle dividers */
--om-border-accent: rgba(45, 27, 78, 0.1) /* Purple tinted */
```

#### Dark Mode
```css
--om-bg-base: #111827        /* Page backgrounds (gray-900) */
--om-bg-elevated: #1f2937    /* Alternate sections (gray-800) */
--om-bg-subtle: #374151      /* Subtle backgrounds (gray-700) */
--om-bg-input: #1f2937       /* Form inputs */

--om-text-primary: #ffffff   /* Headings, primary text */
--om-text-secondary: #9ca3af /* Body text (gray-400) */
--om-text-tertiary: #6b7280  /* Captions (gray-500) */
--om-text-inverse: #2d1b4e   /* Text on gold backgrounds */

--om-border-default: #374151 /* Default borders (gray-700) */
--om-border-subtle: #1f2937  /* Subtle dividers (gray-800) */
--om-border-accent: rgba(212, 175, 55, 0.2) /* Gold tinted */
```

### Color Usage Patterns

**Purple** → Primary brand color, headings, CTAs in light mode  
**Gold** → Accent color, highlights, CTAs in dark mode  
**White/Gray-900** → Base backgrounds  
**Gray-50/Gray-800** → Elevated surfaces (cards, alternate sections)

---

## 📐 Layout Components

### 1. Page Container
**Usage**: Wraps all page content
```jsx
<div className="om-page-container">
  {/* min-h-screen, automatic light/dark background */}
</div>
```

**Rendered**:
- Light: `bg-white`
- Dark: `bg-gray-900`

---

### 2. Hero Sections

#### Gradient Hero (Default)
```jsx
<section className="om-hero-gradient py-20">
  <div className="max-w-7xl mx-auto px-6">
    {/* Hero content */}
  </div>
</section>
```

**Rendered**:
- Light: Purple gradient (`#2d1b4e` → `#3a2461` → `#4a2f74`)
- Dark: Dark gradient (`gray-950` → `gray-900` → `gray-800`)

#### Hero Badge
```jsx
<div className="om-hero-badge mb-6">
  <span className="om-hero-badge-text">Badge Text</span>
</div>
```

**Rendered**:
- Light: Purple-tinted transparent background
- Dark: Gold-tinted transparent background

---

### 3. Section Backgrounds

```jsx
{/* Base section - page background color */}
<section className="om-section-base py-20">

{/* Elevated section - card/elevated color */}
<section className="om-section-elevated py-20">

{/* Subtle section - lighter than elevated */}
<section className="om-section-subtle py-20">
```

**Pattern**: Alternate sections for visual rhythm
```jsx
<section className="om-section-base py-20">...</section>
<section className="om-section-elevated py-20">...</section>
<section className="om-section-base py-20">...</section>
```

---

## 🎴 Card Components

### Standard Card (Recommended)
```jsx
<div className="om-card p-8">
  {/* Auto-adapts shadows, borders, backgrounds */}
</div>
```

**Features**:
- White/gray-800 background
- Subtle border
- Hover shadow effect
- Rounded corners (2xl)

### Card Variants

```jsx
{/* Compact card - less rounded */}
<div className="om-card-compact p-6">

{/* Subtle card - matches elevated sections */}
<div className="om-card-subtle p-6">

{/* Elevated card - gradient background */}
<div className="om-card-elevated p-8">
```

---

## 🔤 Typography System

### Headings

```jsx
{/* Large page title */}
<h1 className="om-heading-primary mb-6">
  Large Page Title
</h1>
{/* Georgia, 4xl/5xl, purple/white */}

{/* Section heading */}
<h2 className="om-heading-secondary mb-4">
  Section Heading
</h2>
{/* Georgia, 3xl/4xl, purple/white */}

{/* Subsection heading */}
<h3 className="om-heading-tertiary mb-3">
  Subsection Title
</h3>
{/* Inter, 2xl, medium weight, purple/white */}
```

### Body Text

```jsx
{/* Primary text */}
<p className="om-text-primary">

{/* Secondary text */}
<p className="om-text-secondary">

{/* Tertiary/metadata text */}
<p className="om-text-tertiary">

{/* Body paragraph */}
<p className="om-text-body">
{/* Larger, relaxed line-height */}
```

**Font Stack**:
- Headings: `Georgia` (serif, Orthodox tradition)
- Body: `Inter` (sans-serif, modern readability)

---

## 🔘 Button Components

### Primary CTA
```jsx
<button className="om-btn-primary">
  Primary Action
</button>
```
**Light**: Purple bg, white text  
**Dark**: Gold bg, purple text

### Secondary CTA
```jsx
<button className="om-btn-secondary">
  Secondary Action
</button>
```
**Both**: Glass effect, white borders, transparent background

### Accent CTA
```jsx
<button className="om-btn-accent">
  Accent Action
</button>
```
**Both**: Gold bg, purple text (same in both themes)

### Outline Button
```jsx
<button className="om-btn-outline">
  Outline Action
</button>
```
**Light**: Purple border/text → fills purple on hover  
**Dark**: Gold border/text → fills gold on hover

---

## 🏷️ Badge & Pill Components

### Primary Badge
```jsx
<div className="om-badge-primary">
  <span className="om-text-primary text-[14px]">Badge</span>
</div>
```

### Secondary Badge
```jsx
<div className="om-badge-secondary">
  <span className="om-text-primary text-[14px]">Badge</span>
</div>
```

### Accent Badge (Status)
```jsx
<span className="om-badge-accent">
  Status
</span>
```

---

## 🎯 Icon Components

### Icon Containers

```jsx
{/* Primary gradient container */}
<div className="om-icon-container-primary mb-6">
  <Icon className="om-feature-icon" size={32} />
</div>

{/* Gold accent container */}
<div className="om-icon-container-accent mb-6">
  <Icon className="om-feature-icon-inverse" size={32} />
</div>

{/* Small container */}
<div className="om-icon-container-small mb-4">
  <Icon className="om-feature-icon" size={28} />
</div>
```

### Icon Colors
```jsx
{/* Gold icons (default for features) */}
<Icon className="om-feature-icon" />

{/* Purple icons (inverse on gold backgrounds) */}
<Icon className="om-feature-icon-inverse" />
```

---

## 📝 Form Components

### Input Fields
```jsx
<input
  type="text"
  placeholder="Enter text..."
  className="om-input"
/>
```

**Features**:
- Auto-adapts border, background, text colors
- Focus ring changes (purple/gold)
- Proper contrast in both themes

### Textarea
```jsx
<textarea
  placeholder="Enter message..."
  className="om-textarea"
  rows={4}
/>
```

### Select Dropdown
```jsx
<select className="om-select">
  <option>Option 1</option>
  <option>Option 2</option>
</select>
```

### Form Pattern
```jsx
<div className="mb-6">
  <label className="block font-['Inter'] font-medium text-[14px] om-text-primary mb-2">
    Field Label
  </label>
  <input type="text" className="om-input" />
</div>
```

---

## 📊 Table Components

```jsx
<div className="om-table-container">
  <table className="w-full">
    <thead>
      <tr className="om-table-header">
        <th className="om-table-cell-header text-left">
          Header
        </th>
      </tr>
    </thead>
    <tbody>
      <tr className="om-table-row">
        <td className="om-table-cell">
          Cell Data
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

---

## 🌐 Multi-Language Support

### Rendering Foreign Scripts

```jsx
{/* Greek */}
<p className="font-['Inter'] text-[15px] om-text-primary">
  Γεώργιος Παπαδόπουλος
</p>

{/* Russian */}
<p className="font-['Inter'] text-[15px] om-text-primary">
  Алексей Иванов
</p>

{/* Arabic (RTL) */}
<p className="font-['Inter'] text-[15px] om-text-primary" dir="rtl">
  يوحنا الخوري
</p>
```

### Language Badge
```jsx
<span className="om-badge-accent">
  Greek (Ελληνικά)
</span>
```

**Key Principles**:
- Use `Inter` font for all languages (excellent Unicode support)
- Add `dir="rtl"` for Arabic/Hebrew
- Use `om-text-*` classes for automatic color adaptation
- Keep font sizes consistent across languages

---

## 🎨 Glass/Backdrop Effects

### Glass Effect (Light Transparency)
```jsx
<div className="om-glass p-6">
  {/* Subtle transparency with backdrop blur */}
</div>
```

### Glass Card
```jsx
<div className="om-glass-card p-6">
  {/* Card with glass effect */}
</div>
```

**Usage**: On hero sections over gradient backgrounds

---

## 📏 Spacing & Layout

### Section Padding
```jsx
{/* Standard section */}
<section className="py-20">

{/* Compact section */}
<section className="py-16">

{/* Large section */}
<section className="py-24">
```

### Container Width
```jsx
{/* Standard content width */}
<div className="max-w-7xl mx-auto px-6">

{/* Narrow content (text-heavy) */}
<div className="max-w-4xl mx-auto px-6">

{/* Extra narrow (forms, single-column) */}
<div className="max-w-3xl mx-auto px-6">
```

---

## 🔢 Numbers & Stats

### Stat Display
```jsx
<div className="om-stat-number">500+</div>
<p className="om-stat-label">Parishes using Orthodox Metrics</p>
```

### Alternate Stat (Changes color in dark)
```jsx
<div className="om-stat-number-alt">1M+</div>
<p className="om-stat-label">Records preserved</p>
```

---

## 🔘 Number Badges (Steps, Counts)

```jsx
{/* Primary - purple → gold */}
<div className="om-number-badge-primary">1</div>

{/* Accent - always gold */}
<div className="om-number-badge-accent">2</div>
```

---

## 📌 Dividers & Borders

```jsx
{/* Horizontal divider */}
<div className="om-divider my-6"></div>

{/* Element with border */}
<div className="om-border-default rounded-lg p-4">
  
{/* Subtle border */}
<div className="om-border-subtle rounded-lg p-4">
```

---

## 🔗 Links

```jsx
{/* Primary link */}
<a href="/" className="om-link">Link Text</a>

{/* Subtle link */}
<a href="/" className="om-link-subtle">Subtle Link</a>
```

---

## ✨ Interactive States

### Hover Effects

**Cards**:
```jsx
<div className="om-card p-6 hover:border-[#d4af37] dark:hover:border-[#d4af37] cursor-pointer">
  {/* Border changes to gold on hover */}
</div>
```

**Buttons**: Built into `om-btn-*` classes

### Focus States
All form inputs automatically get focus rings that adapt:
- Light: Purple ring (`#2d1b4e`)
- Dark: Gold ring (`#d4af37`)

---

## 🎭 Shadow System

Shadows automatically adapt intensity:

```jsx
{/* Light shadow */}
<div className="shadow-sm">

{/* Medium shadow */}
<div className="shadow-md">

{/* Large shadow */}
<div className="shadow-lg">

{/* Extra large shadow */}
<div className="shadow-xl">
```

**Dark mode**: Shadows become darker for depth

---

## 📋 Complete Page Template

```jsx
import Navigation from "../components/Navigation";
import SiteFooter from "../components/SiteFooter";

export default function PageName() {
  return (
    <div className="om-page-container">
      <Navigation />

      {/* Hero */}
      <section className="om-hero-gradient py-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="om-hero-badge mb-6">
            <span className="om-hero-badge-text">Badge</span>
          </div>
          <h1 className="font-['Georgia'] text-5xl md:text-6xl mb-6">
            Page Title
          </h1>
          <p className="font-['Inter'] text-xl text-[rgba(255,255,255,0.9)] max-w-2xl mx-auto">
            Page description
          </p>
        </div>
      </section>

      {/* Section 1 - Base Background */}
      <section className="py-20 om-section-base">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="om-badge-primary mb-6 inline-block">
              <span className="om-text-primary text-[14px]">Section Badge</span>
            </div>
            <h2 className="om-heading-primary mb-4">
              Section Title
            </h2>
            <p className="om-text-body max-w-2xl mx-auto">
              Section description
            </p>
          </div>

          {/* Content */}
          <div className="grid md:grid-cols-2 gap-8">
            <div className="om-card p-8">
              <h3 className="om-heading-tertiary mb-4">Card Title</h3>
              <p className="om-text-secondary">Card content</p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2 - Elevated Background */}
      <section className="py-20 om-section-elevated">
        <div className="max-w-7xl mx-auto px-6">
          {/* Content */}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 om-hero-gradient">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="font-['Georgia'] text-4xl md:text-5xl mb-6">
            Call to Action
          </h2>
          <p className="font-['Inter'] text-xl text-[rgba(255,255,255,0.9)] mb-8">
            CTA description
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/contact" className="om-btn-accent">
              Primary CTA
            </a>
            <a href="/pricing" className="om-btn-secondary">
              Secondary CTA
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
```

---

## 🎯 Implementation Checklist

For each new page, ensure:

- [ ] Uses `om-page-container` as root
- [ ] Hero uses `om-hero-gradient`
- [ ] Sections alternate `om-section-base` and `om-section-elevated`
- [ ] Headings use `om-heading-*` classes
- [ ] Body text uses `om-text-*` classes
- [ ] Cards use `om-card*` variants
- [ ] Buttons use `om-btn-*` classes
- [ ] Forms use `om-input`, `om-textarea`, `om-select`
- [ ] Icons use `om-icon-container-*` and `om-feature-icon*`
- [ ] Badges use `om-badge-*` classes
- [ ] Test in both light AND dark modes
- [ ] Verify contrast ratios (WCAG AA minimum)
- [ ] Check hover/focus states in both themes

---

## 🌍 Remaining Pages to Update

Apply this system to:

### **Tour Page**
- Hero: Platform Tour
- Sections: Step-by-step walkthrough
- Components: Cards with icons, numbered badges
- Features: Mock UI demonstrations

### **Contact Page**
- Hero: Get in Touch
- Form: Full contact form with validation
- Cards: Contact methods (email, phone, address)
- Map: Optional location embed

### **Blog Page**
- Hero: Latest Updates
- Grid: Blog post cards
- Badges: Categories/tags
- Pattern: Card grid → card hover effects

### **About Page**
- Hero: Our Story
- Team: Photo grid with cards
- Timeline: Company milestones
- Values: Icon + text cards

---

## 🎨 Dark Mode Best Practices

1. **Test Both Themes**: Every component should work in light AND dark
2. **Contrast**: Ensure text meets WCAG AA (4.5:1 minimum)
3. **Depth**: Use backgrounds/borders to create hierarchy
4. **Consistency**: Purple/Gold swap roles but maintain brand
5. **Shadows**: Darker in dark mode for depth
6. **Images**: Consider how photos/illustrations look in dark
7. **Icons**: Gold works in both themes as accent
8. **Transitions**: Smooth theme toggle (already handled by context)

---

## 🚀 Quick Reference

| Element | Light Class | Dark Equivalent |
|---------|-------------|-----------------|
| Page BG | `bg-white` | `dark:bg-gray-900` |
| Section BG | `bg-[#f9fafb]` | `dark:bg-gray-800` |
| Card BG | `bg-white` | `dark:bg-gray-800` |
| Heading | `text-[#2d1b4e]` | `dark:text-white` |
| Body Text | `text-[#4a5565]` | `dark:text-gray-400` |
| Border | `border-[#e5e7eb]` | `dark:border-gray-600` |
| Button Primary | `bg-[#2d1b4e]` | `dark:bg-[#d4af37]` |
| Focus Ring | `ring-[#2d1b4e]` | `dark:ring-[#d4af37]` |

**Use the `om-*` utility classes instead of writing dark: variants manually!**

---

## 📞 Support

Questions about the design system? Reference:
- `/src/styles/theme.css` - Color tokens
- `/src/styles/components.css` - Component classes
- `/src/app/pages/Home.tsx` - Full example
- `/src/app/pages/Samples.tsx` - Full example with complex layouts

---

**Version**: 1.0  
**Last Updated**: March 14, 2026  
**Maintained By**: Orthodox Metrics Design Team
