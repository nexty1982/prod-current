# 🎨 Orthodox Metrics Design System

> **A complete, production-ready design system for building consistent, beautiful interfaces**

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](./DESIGN_SYSTEM_CHANGELOG.md)
[![Status](https://img.shields.io/badge/status-production%20ready-success.svg)]()
[![Documentation](https://img.shields.io/badge/docs-comprehensive-brightgreen.svg)](./DESIGN_SYSTEM_INDEX.md)

---

## ✨ What's This?

A **world-class design system** that provides everything needed to build the Orthodox Metrics platform:

- 🎨 **Complete design tokens** (colors, typography, spacing, shadows)
- 💻 **Ready-to-use components** (buttons, cards, badges, layouts)
- 📱 **Interactive documentation** (visual design system page)
- 🎯 **Figma integration** (import tokens directly)
- 📚 **Comprehensive guides** (90+ pages of documentation)

---

## 🚀 Quick Start

### For Developers

**View the design system:**
```bash
npm run dev
# Visit http://localhost:5173 to see the interactive Design System page
```

**Use in your code:**
```tsx
// Option 1: Utility classes (fastest)
<button className="btn-primary">Get Started</button>
<div className="card-elevated">
  <h3 className="text-h3">Title</h3>
  <p className="text-body">Content</p>
</div>

// Option 2: CSS variables (flexible)
<div style={{
  backgroundColor: 'var(--color-accent-gold)',
  padding: 'var(--spacing-8)',
  borderRadius: 'var(--radius-xl)'
}}>
  Custom component
</div>
```

**Quick reference:**
→ [Design Tokens Cheat Sheet](./DESIGN_TOKENS_QUICK_REFERENCE.md)

---

### For Designers

**Import tokens to Figma:**
1. Install **"Tokens Studio for Figma"** plugin
2. Import `/src/design-tokens.json`
3. Start designing with tokens! 🎨

**Reference specs:**
→ [Complete Design Specifications](./design-specifications.md)

---

## 📦 What's Included

### Design Tokens

| Category | Count | Examples |
|----------|-------|----------|
| **Colors** | 17 | Purple `#2d1b4e`, Gold `#d4af37`, 5 text colors, 2 gradients |
| **Typography** | 8 styles | H1-H4, Body Large/Regular/Small, Small text |
| **Spacing** | 13 values | 4px, 8px, 16px, 24px, 32px, 48px, 64px... |
| **Shadows** | 5 levels | sm, md, lg, xl, 2xl |
| **Radius** | 6 values | 6px, 10px, 14px, 16px, 24px, full |
| **Components** | 10+ | Buttons, Cards, Badges, Icon containers |

### Files

```
📁 Design Token Files
├── /src/design-tokens.json              # Figma-compatible tokens
└── /src/styles/design-system.css        # CSS variables & utilities

📁 Visual Documentation  
└── /src/app/pages/DesignSystem.tsx      # Interactive design system page

📁 Documentation (90+ pages)
├── DESIGN_SYSTEM_SUMMARY.md             # ⭐ Start here
├── DESIGN_TOKENS_QUICK_REFERENCE.md     # Daily reference
├── DESIGN_SYSTEM_GUIDE.md               # Implementation guide
├── DESIGN_SYSTEM_README.md              # Getting started
├── design-specifications.md             # Extracted specs
├── DESIGN_SYSTEM_CHANGELOG.md           # Version history
└── DESIGN_SYSTEM_INDEX.md               # Navigation guide
```

---

## 📖 Documentation

### ⭐ Start Here

| Document | Time | Purpose |
|----------|------|---------|
| **[Design System Summary](./DESIGN_SYSTEM_SUMMARY.md)** | 10 min | Complete overview - read this first |
| **[Quick Reference](./DESIGN_TOKENS_QUICK_REFERENCE.md)** | 5 min | Cheat sheet - keep open while working |

### Deep Dives

| Document | Time | Purpose |
|----------|------|---------|
| **[Implementation Guide](./DESIGN_SYSTEM_GUIDE.md)** | 20 min | How to use the system |
| **[Design Specifications](./design-specifications.md)** | Reference | All exact measurements |
| **[Documentation Index](./DESIGN_SYSTEM_INDEX.md)** | - | Navigate all docs |

---

## 🎯 Common Use Cases

### Building a Feature Card

```tsx
<div className="card-elevated">
  <div className="icon-container-purple mb-6">
    <BookIcon />
  </div>
  <h3 className="text-h3 mb-3">Preserve History</h3>
  <p className="text-body-small">
    Transform fragile records into secure digital archives.
  </p>
  <button className="btn-primary mt-6">Learn More</button>
</div>
```

### Creating a Section Header

```tsx
<div className="text-center mb-16">
  <span className="badge mb-4">Platform Highlights</span>
  <h2 className="text-h2 mb-4">Built for Orthodox Churches</h2>
  <p className="text-body-large" style={{ color: 'var(--color-text-body)' }}>
    Every feature honors Orthodox tradition.
  </p>
</div>
```

### Responsive Grid Layout

```tsx
<div className="container-2xl py-16">
  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
    <FeatureCard title="Feature 1" />
    <FeatureCard title="Feature 2" />
    <FeatureCard title="Feature 3" />
  </div>
</div>
```

More examples → [Implementation Guide](./DESIGN_SYSTEM_GUIDE.md)

---

## 🎨 Design Philosophy

### Colors
- **Purple** `#2d1b4e` → Orthodox tradition, spiritual depth
- **Gold** `#d4af37` → Sacred elements, important actions
- **Neutrals** → Professional, readable

### Typography
- **Georgia** → Traditional feel (headings)
- **Inter** → Modern readability (UI, body)
- **Clear hierarchy** → 48px to 14px

### Spacing
- **4px base unit** → All spacing is multiples of 4
- **Consistent rhythm** → Predictable, harmonious layouts
- **13 values** → Cover all common needs

---

## 🏗️ Architecture

### Token Flow

```
Figma Design
    ↓
design-tokens.json (Source of Truth)
    ↓
    ├─→ Figma (via Tokens Studio)
    └─→ design-system.css (CSS variables)
        ↓
        └─→ React Components
```

### Single Source of Truth

All tokens live in `/src/design-tokens.json`:
- Update once → changes propagate everywhere
- Designers and developers use same values
- Easy to version and track changes

---

## 🎓 Learning Paths

### 🏃 Fast Track (20 min)
1. Read: [Quick Reference](./DESIGN_TOKENS_QUICK_REFERENCE.md)
2. Explore: Visit `/` in the app
3. Build: Copy an example and start coding

### 📚 Complete (60 min)
1. Read: [Summary](./DESIGN_SYSTEM_SUMMARY.md)
2. Read: [README](./DESIGN_SYSTEM_README.md)
3. Read: [Implementation Guide](./DESIGN_SYSTEM_GUIDE.md)
4. Explore: Design System page

### 🎨 Designers (15 min)
1. Read: [Summary → For Designers](./DESIGN_SYSTEM_SUMMARY.md)
2. Import: Load tokens into Figma
3. Reference: [Design Specifications](./design-specifications.md)

---

## 💡 Key Features

✅ **Production Ready** - Use immediately in real projects  
✅ **Figma Integration** - Import tokens directly  
✅ **Comprehensive** - 90+ pages of documentation  
✅ **Type Safe** - CSS variables prevent errors  
✅ **Scalable** - Easy to extend and update  
✅ **Well Documented** - Examples for everything  
✅ **Visual** - Interactive design system page  
✅ **Modern** - Follows industry best practices  

---

## 🔧 Extending the System

### Adding a New Token

1. Update `/src/design-tokens.json`
2. Add CSS variable to `/src/styles/design-system.css`
3. Document in Design System page
4. Update changelog

See: [Implementation Guide → Extending](./DESIGN_SYSTEM_GUIDE.md#extending-the-system)

---

## ✅ Best Practices

**DO:**
- ✅ Use design system tokens for all styling
- ✅ Follow the spacing scale (4, 8, 16, 24, 32...)
- ✅ Use utility classes when available
- ✅ Reference CSS variables for custom components

**DON'T:**
- ❌ Hardcode colors (`#2d1b4e` → use `var(--color-primary-purple)`)
- ❌ Use arbitrary spacing (`37px` → use nearest token)
- ❌ Create one-off styles (check if token exists first)
- ❌ Mix design systems (use tokens consistently)

---

## 🆘 Troubleshooting

### CSS variables not working?
→ Check `/src/styles/index.css` imports `design-system.css`

### Utility classes not applying?
→ Verify class exists in `/src/styles/design-system.css`

### Figma tokens not syncing?
→ Re-import JSON in Tokens Studio, verify JSON is valid

More help → [Implementation Guide → Troubleshooting](./DESIGN_SYSTEM_GUIDE.md#troubleshooting)

---

## 📊 Stats

- **17** color tokens
- **8** typography styles  
- **13** spacing values
- **5** shadow levels
- **10+** component patterns
- **90+** pages of documentation
- **45,000+** words of guides
- **100%** production ready

---

## 🗺️ Roadmap

### v1.0 (Current) ✅
- Complete color system
- Typography scale
- Spacing system
- Component patterns
- Figma integration
- Comprehensive documentation

### v1.1 (Planned)
- Dark mode tokens
- Animation tokens
- Responsive breakpoints
- Extended icon library

### v2.0 (Future)
- Multi-brand theming
- Platform exports (iOS, Android)
- Advanced accessibility tokens

See: [Changelog](./DESIGN_SYSTEM_CHANGELOG.md)

---

## 📞 Quick Links

| Need | Go To |
|------|-------|
| **Quick token reference** | [Quick Reference](./DESIGN_TOKENS_QUICK_REFERENCE.md) |
| **Visual examples** | Visit `/` in the app |
| **How to implement** | [Implementation Guide](./DESIGN_SYSTEM_GUIDE.md) |
| **Exact measurements** | [Design Specs](./design-specifications.md) |
| **Navigate docs** | [Documentation Index](./DESIGN_SYSTEM_INDEX.md) |
| **What's changed** | [Changelog](./DESIGN_SYSTEM_CHANGELOG.md) |

---

## 🎉 Get Started Now

```bash
# 1. View the design system
npm run dev

# 2. Open your browser to http://localhost:5173

# 3. Explore all the tokens and components

# 4. Start building! 🚀
```

---

## 📄 License

Part of the Orthodox Metrics project.

---

## 🌟 Built With

- **Design Tokens** - W3C Design Tokens spec
- **CSS Variables** - Modern CSS custom properties
- **React** - Interactive documentation
- **Tailwind CSS** - Utility-first framework
- **Tokens Studio** - Figma integration

---

**Version**: 1.0.0  
**Status**: Production Ready  
**Last Updated**: March 14, 2026  

---

<div align="center">

**[Get Started](./DESIGN_SYSTEM_SUMMARY.md)** • 
**[Quick Reference](./DESIGN_TOKENS_QUICK_REFERENCE.md)** • 
**[Documentation](./DESIGN_SYSTEM_INDEX.md)**

Made with 💜 and ✨ by the Orthodox Metrics Team

</div>
