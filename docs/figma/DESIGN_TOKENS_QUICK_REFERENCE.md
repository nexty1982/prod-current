# Design Tokens - Quick Reference Card

> **TL;DR**: Use CSS variables like `var(--color-primary-purple)` or utility classes like `.btn-primary` instead of hardcoded values.

---

## 🎨 Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary-purple` | `#2d1b4e` | Headings, primary text, brand |
| `--color-accent-gold` | `#d4af37` | CTAs, highlights, accents |
| `--color-text-body` | `#4a5565` | Body text, descriptions |
| `--color-text-secondary` | `#6a7282` | Labels, muted text |
| `--color-bg-white` | `#ffffff` | Page background |
| `--color-bg-gray-50` | `#f9fafb` | Alternating sections |
| `--color-border-light` | `#f3f4f6` | Card borders |

---

## 📝 Typography Classes

| Class | Style | Usage |
|-------|-------|-------|
| `.text-h1` | 48px Georgia | Main page headings |
| `.text-h2` | 48px Georgia | Section headings |
| `.text-h3` | 20px Inter Medium | Component titles |
| `.text-h4` | 18px Inter Medium | Small headings |
| `.text-body-large` | 20px Inter | Lead paragraphs |
| `.text-body` | 18px Inter | Standard body text |
| `.text-body-small` | 16px Inter | Small descriptions |
| `.text-small` | 14px Inter | Labels, captions |

---

## 📏 Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--spacing-1` | 4px | Extra tight |
| `--spacing-2` | 8px | Tight |
| `--spacing-3` | 12px | Small |
| `--spacing-4` | 16px | Medium |
| `--spacing-6` | 24px | Medium-large |
| `--spacing-8` | 32px | Large |
| `--spacing-12` | 48px | Extra large |
| `--spacing-16` | 64px | Section spacing |

**Tailwind Equivalents**:
- `space-y-3` = 12px gap
- `space-y-6` = 24px gap
- `space-y-8` = 32px gap
- `gap-6` = 24px grid gap
- `gap-8` = 32px grid gap

---

## 🔘 Button Classes

```tsx
<button className="btn-primary">Primary Action</button>
<button className="btn-secondary">Secondary Action</button>
```

**Style**:
- Primary: Gold background, purple text
- Secondary: Purple background, white text
- Height: 50px
- Padding: 24px horizontal
- Border radius: 10px

---

## 🃏 Card Classes

```tsx
<div className="card">Default card</div>
<div className="card-elevated">Medium shadow</div>
<div className="card-large">Large shadow, 24px radius</div>
<div className="card-highlighted">Gold border</div>
```

**Specs**:
- Padding: 32px
- Border radius: 16px (24px for large)
- Border: 1px light gray (2px gold for highlighted)

---

## 🏷️ Badge Classes

```tsx
<span className="badge">Light purple badge</span>
<span className="badge-accent">Gold badge</span>
```

---

## 📦 Layout Containers

```tsx
<div className="container">1200px max width</div>
<div className="container-2xl">1280px max width</div>
```

---

## 🌓 Shadows

| Variable | Usage |
|----------|-------|
| `--shadow-sm` | Subtle cards |
| `--shadow-md` | Standard cards (most common) |
| `--shadow-lg` | Prominent cards |
| `--shadow-xl` | Hero elements |
| `--shadow-2xl` | Major CTAs |

---

## 📐 Border Radius

| Variable | Value |
|----------|-------|
| `--radius-sm` | 6px |
| `--radius-md` | 10px (buttons) |
| `--radius-lg` | 14px (icon containers) |
| `--radius-xl` | 16px (cards) |
| `--radius-2xl` | 24px (large cards) |
| `--radius-full` | 9999px (pills, badges) |

---

## 🎯 Common Patterns

### Feature Card
```tsx
<div className="card-elevated">
  <div className="icon-container-purple mb-6">
    <Icon />
  </div>
  <h3 className="text-h3 mb-3">Title</h3>
  <p className="text-body-small">Description</p>
</div>
```

### Section Header
```tsx
<div className="text-center mb-16">
  <span className="badge mb-4">Badge Text</span>
  <h2 className="text-h2 mb-4">Section Title</h2>
  <p className="text-body-large">Subtitle text</p>
</div>
```

### Button Group
```tsx
<div className="flex gap-4">
  <button className="btn-primary">Primary</button>
  <button className="btn-secondary">Secondary</button>
</div>
```

### Grid Layout
```tsx
{/* 3-column grid with 32px gaps */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
  <Card />
  <Card />
  <Card />
</div>
```

---

## 🚀 Quick Start Examples

### Using CSS Variables (Inline Styles)
```tsx
<div style={{
  backgroundColor: 'var(--color-accent-gold)',
  padding: 'var(--spacing-8)',
  borderRadius: 'var(--radius-xl)',
  boxShadow: 'var(--shadow-md)'
}}>
  Custom component
</div>
```

### Using Utility Classes
```tsx
<div className="card-elevated">
  <h3 className="text-h3">Title</h3>
  <p className="text-body">Content</p>
  <button className="btn-primary">Action</button>
</div>
```

### Mixing Approaches
```tsx
<div className="card" style={{ background: 'var(--gradient-hero-purple)' }}>
  <h3 className="text-h3" style={{ color: 'var(--color-text-on-dark)' }}>
    White text on purple gradient
  </h3>
</div>
```

---

## 📋 Checklist for New Components

Before creating a new component, ask:

- [ ] Am I using design system colors? (`var(--color-*)`)
- [ ] Am I using design system spacing? (`var(--spacing-*)`)
- [ ] Am I using typography classes? (`.text-h1`, `.text-body`, etc.)
- [ ] Am I using standard shadows? (`var(--shadow-*)`)
- [ ] Am I using standard border radius? (`var(--radius-*)`)
- [ ] Could I use an existing component class? (`.card`, `.btn-primary`)
- [ ] Is my spacing consistent with the scale? (4, 8, 16, 24, 32, 48, 64px)

---

## 🔍 Where to Find More Info

| Resource | Location | Purpose |
|----------|----------|---------|
| Visual Documentation | `/` (Design System page) | See all tokens in action |
| Complete Specs | `/design-specifications.md` | Extracted Figma specs |
| Implementation Guide | `/DESIGN_SYSTEM_GUIDE.md` | Detailed usage guide |
| Token JSON | `/src/design-tokens.json` | Figma-compatible tokens |
| CSS Variables | `/src/styles/design-system.css` | All CSS custom properties |

---

## ⚡ Pro Tips

1. **Use the Design System page** (`/`) as a reference while coding
2. **Search the CSS file** for available variables before creating new values
3. **Keep spacing consistent** - stick to the spacing scale (4, 8, 16, 24, 32, 48, 64)
4. **Prefer utility classes** for common patterns (buttons, cards, typography)
5. **Use CSS variables** for custom components
6. **Don't hardcode** colors, spacing, or shadows - always use tokens

---

**Remember**: The design system is your friend! Use it to build faster and maintain consistency. 🎨✨
