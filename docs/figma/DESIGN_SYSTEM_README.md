# Orthodox Metrics Design System

> **A complete, production-ready design system for the Orthodox Metrics platform**

---

## 📚 What's Included

This design system provides everything you need to build consistent, beautiful interfaces:

### 🎨 **Design Tokens**
- Complete color palette (purple & gold theme)
- Typography scale (Inter + Georgia)
- Spacing system (4px to 140px)
- Border radius values
- Shadow definitions
- Layout containers and grids

### 💻 **Implementation Files**
- **JSON tokens** for Figma plugins
- **CSS variables** for web development
- **Utility classes** for rapid development
- **React components** for visual documentation

### 📖 **Documentation**
- Visual design system page (interactive)
- Complete specifications document
- Implementation guide
- Quick reference card

---

## 🗂️ File Overview

| File | Purpose | Audience |
|------|---------|----------|
| `/src/design-tokens.json` | Figma-compatible tokens (Tokens Studio) | **Designers** |
| `/src/styles/design-system.css` | CSS variables & utility classes | **Developers** |
| `/src/app/pages/DesignSystem.tsx` | Interactive visual documentation | **Everyone** |
| `/design-specifications.md` | Complete extracted specifications | **Design → Dev handoff** |
| `/DESIGN_SYSTEM_GUIDE.md` | Detailed implementation guide | **Developers** |
| `/DESIGN_TOKENS_QUICK_REFERENCE.md` | Cheat sheet for common tokens | **Developers** |

---

## 🚀 Quick Start

### For Developers

**1. View the design system:**
```bash
# The app is currently showing the Design System page
npm run dev
# Visit http://localhost:5173
```

**2. Use tokens in your code:**
```tsx
// Option A: CSS Variables (inline styles)
<div style={{ 
  backgroundColor: 'var(--color-primary-purple)',
  padding: 'var(--spacing-8)',
  borderRadius: 'var(--radius-xl)'
}}>
  Content
</div>

// Option B: Utility Classes
<div className="card-elevated">
  <h3 className="text-h3">Title</h3>
  <p className="text-body">Description</p>
  <button className="btn-primary">Action</button>
</div>
```

**3. Reference the quick guide:**
- See `/DESIGN_TOKENS_QUICK_REFERENCE.md` for common patterns
- All available variables are in `/src/styles/design-system.css`

### For Designers

**1. Import tokens into Figma:**
- Install "Tokens Studio for Figma" plugin
- Load `/src/design-tokens.json`
- Apply tokens to your designs

**2. Reference specifications:**
- See `/design-specifications.md` for pixel-perfect details
- All measurements extracted from original Figma design

**3. Maintain consistency:**
- Use imported tokens instead of creating new colors/styles
- Follow the spacing scale (4, 8, 16, 24, 32, 48, 64px)
- Use the defined typography styles

---

## 🎨 Design Principles

### Color Philosophy
- **Purple (#2d1b4e)**: Represents Orthodox tradition and spiritual depth
- **Gold (#d4af37)**: Symbolizes sacred elements and important actions
- **Neutral grays**: Ensure readability and professional appearance

### Typography Hierarchy
- **Georgia**: For display text and headings (traditional feel)
- **Inter**: For UI and body text (modern readability)
- Clear hierarchy from H1 (48px) to Small (14px)

### Spacing System
- **4px base unit**: All spacing is a multiple of 4
- **Consistent rhythm**: 4, 8, 12, 16, 24, 32, 48, 64, 80, 120, 140px
- **Predictable layouts**: Same gaps = visual harmony

### Component Design
- **Cards**: White background, subtle shadows, rounded corners
- **Buttons**: High contrast, clear hover states, adequate touch targets
- **Icons**: Contained in colored circles, consistent sizing

---

## 📊 Token Categories

### Colors (17 tokens)
- Primary colors (purple, gold)
- Text colors (5 variants)
- Background colors (3 levels)
- Border colors (4 variants)
- Gradients (2 types)

### Typography (8 text styles)
- H1, H2, H3, H4 (headings)
- Body Large, Body, Body Small (content)
- Small (labels, captions)

### Spacing (11 values)
- 4px to 140px
- Covers all common spacing needs
- Follows 4px base unit

### Shadows (5 levels)
- Small → 2XL
- Different use cases for each level

### Border Radius (6 values)
- 6px (subtle) → Full rounded (pills)

### Components (Pre-built patterns)
- Buttons (2 variants)
- Cards (4 variants)
- Badges (2 variants)
- Icon containers (2 variants)

---

## 🏗️ Architecture

### Token Flow

```
Design Specifications (Figma)
    ↓
design-tokens.json (Source of truth)
    ↓
    ├─→ Figma (via Tokens Studio plugin)
    └─→ design-system.css (CSS variables)
        ↓
        ├─→ React Components (inline styles)
        ├─→ CSS Files (variable references)
        └─→ Tailwind Classes (with var())
```

### Single Source of Truth

All tokens originate from `/src/design-tokens.json`:
- **Designers**: Import into Figma for design consistency
- **Developers**: Auto-converted to CSS variables
- **Documentation**: Powers the visual Design System page

### Future-Proof

This structure supports:
- ✅ Design system versioning
- ✅ Token automation (design-to-code)
- ✅ Theme variations (e.g., dark mode)
- ✅ Platform-specific exports (iOS, Android)
- ✅ Brand updates without code changes

---

## 🎯 Use Cases

### Building a New Page

1. **Start with layout containers**:
   ```tsx
   <div className="container-2xl py-16">
     {/* Content */}
   </div>
   ```

2. **Add section headers**:
   ```tsx
   <div className="text-center mb-16">
     <span className="badge mb-4">Section Badge</span>
     <h2 className="text-h2 mb-4">Section Title</h2>
     <p className="text-body-large">Description</p>
   </div>
   ```

3. **Build with component patterns**:
   ```tsx
   <div className="grid grid-cols-3 gap-8">
     <div className="card-elevated">
       <div className="icon-container-purple mb-6">
         <Icon />
       </div>
       <h3 className="text-h3 mb-3">Feature</h3>
       <p className="text-body-small">Description</p>
       <button className="btn-primary mt-6">Action</button>
     </div>
   </div>
   ```

### Updating Brand Colors

To change colors across the entire platform:

1. Update tokens in `/src/design-tokens.json`
2. Update CSS variables in `/src/styles/design-system.css`
3. Re-import JSON into Figma
4. All components update automatically ✨

---

## ✅ Validation Checklist

Before submitting code, ensure:

- [ ] No hardcoded colors (use `var(--color-*)`)
- [ ] No arbitrary spacing (use `var(--spacing-*)`)
- [ ] Typography uses defined classes (`.text-h1`, etc.)
- [ ] Components use standard shadows (`var(--shadow-*)`)
- [ ] Border radius from token values (`var(--radius-*)`)
- [ ] Consistent with spacing scale (4px multiples)
- [ ] Could use existing component class (`.card`, `.btn-primary`)

---

## 🔧 Extending the System

### Adding a New Color

1. **Update JSON**:
   ```json
   "colors": {
     "accent": {
       "blue": {
         "$type": "color",
         "$value": "#3b82f6",
         "$description": "New accent color"
       }
     }
   }
   ```

2. **Update CSS**:
   ```css
   :root {
     --color-accent-blue: #3b82f6;
   }
   ```

3. **Document usage**:
   - Add swatch to Design System page
   - Update quick reference

### Adding a New Component Pattern

1. **Create utility class** in `design-system.css`:
   ```css
   .card-feature {
     background: var(--gradient-card-subtle);
     border: 1px solid var(--color-border-light);
     border-radius: var(--radius-xl);
     padding: var(--spacing-8);
     box-shadow: var(--shadow-md);
   }
   ```

2. **Add to documentation**:
   - Show example in Design System page
   - Add to quick reference

3. **Document in component tokens** (JSON):
   ```json
   "components": {
     "card": {
       "feature": {
         "backgroundColor": "{colors.gradient.card-subtle}",
         "borderRadius": "{borderRadius.xl}",
         ...
       }
     }
   }
   ```

---

## 📐 Grid System

### 12-Column Grid

```tsx
{/* 3-column layout (each column spans 4) */}
<div className="grid grid-cols-12 gap-8">
  <div className="col-span-4">Column 1</div>
  <div className="col-span-4">Column 2</div>
  <div className="col-span-4">Column 3</div>
</div>

{/* Sidebar + Main (3 + 9) */}
<div className="grid grid-cols-12 gap-8">
  <aside className="col-span-3">Sidebar</aside>
  <main className="col-span-9">Main content</main>
</div>
```

### Responsive Grids

```tsx
{/* 1 col mobile, 2 col tablet, 4 col desktop */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
  <Card />
  <Card />
  <Card />
  <Card />
</div>
```

---

## 🆘 Troubleshooting

### Design System page not showing

**Issue**: Page shows old Figma import instead

**Solution**: 
```tsx
// In /src/app/App.tsx
import DesignSystem from './pages/DesignSystem';

export default function App() {
  return <DesignSystem />;
}
```

### CSS variables not working

**Issue**: Variables undefined or not applying

**Solution**: Verify import chain in `/src/styles/index.css`:
```css
@import './fonts.css';
@import './tailwind.css';
@import './theme.css';
@import './design-system.css'; /* Must be imported */
```

### Tokens not syncing to Figma

**Issue**: Changes to JSON not appearing in Figma

**Solution**:
1. Verify JSON is valid (use a JSON validator)
2. Re-import the file in Tokens Studio plugin
3. Check token names match exactly (case-sensitive)
4. Ensure plugin is up to date

---

## 🌟 Benefits

### For Developers
✅ **Faster development** - Pre-built components and patterns  
✅ **Consistent code** - Single source of truth  
✅ **Easy maintenance** - Update tokens, not hundreds of files  
✅ **Type safety** - CSS variables prevent typos  
✅ **Documentation** - Visual reference always available  

### For Designers
✅ **Figma integration** - Design with actual tokens  
✅ **Design-dev sync** - Designers and developers use same values  
✅ **Brand consistency** - All designs use approved colors/styles  
✅ **Faster iteration** - Update tokens, not individual elements  

### For the Project
✅ **Scalability** - Easy to add new pages and features  
✅ **Maintainability** - Changes propagate automatically  
✅ **Quality** - Professional, consistent appearance  
✅ **Flexibility** - Easy to rebrand or theme  

---

## 📚 Learning Resources

### Essential Reading
1. **Start here**: `/DESIGN_TOKENS_QUICK_REFERENCE.md` (5 min read)
2. **Deep dive**: `/DESIGN_SYSTEM_GUIDE.md` (20 min read)
3. **Specifications**: `/design-specifications.md` (reference)

### Interactive Learning
- Explore the Design System page (`/`)
- Inspect components with browser DevTools
- Try modifying token values and see live updates

### External Resources
- [Tokens Studio Documentation](https://docs.tokens.studio/)
- [CSS Custom Properties (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
- [Design Tokens Community Group](https://www.w3.org/community/design-tokens/)

---

## 🤝 Contributing

### Proposing Changes

1. **Discuss first** - New tokens should be discussed with the team
2. **Update all sources** - JSON, CSS, and documentation
3. **Show examples** - Add to Design System page
4. **Document rationale** - Why is this token needed?

### Maintaining Quality

- Don't add one-off values (use nearest existing token)
- Keep naming consistent (follow existing patterns)
- Maintain semantic meaning (use descriptive names)
- Update all documentation when adding tokens

---

## 📈 Roadmap

### Version 1.0 (Current)
✅ Complete color system  
✅ Typography scale  
✅ Spacing system  
✅ Component patterns  
✅ Figma integration  
✅ Documentation  

### Version 1.1 (Planned)
🔲 Dark mode tokens  
🔲 Animation tokens (duration, easing)  
🔲 Responsive breakpoint tokens  
🔲 Component composition patterns  
🔲 Icon library integration  

### Version 2.0 (Future)
🔲 Multi-brand theming  
🔲 Internationalization (i18n) support  
🔲 Accessibility tokens (focus states, contrast)  
🔲 Platform-specific exports (iOS, Android)  

---

## 📞 Support

### Questions?
- Check the `/DESIGN_SYSTEM_GUIDE.md` for detailed usage
- Review the `/DESIGN_TOKENS_QUICK_REFERENCE.md` for common patterns
- Explore the Design System page for visual examples

### Found an Issue?
- Check if token exists before creating new values
- Verify CSS import chain is correct
- Ensure JSON is valid before importing to Figma

---

## 📄 License

This design system is part of the Orthodox Metrics project.

---

## 🎉 Final Notes

This design system represents a **complete foundation** for building the Orthodox Metrics platform. By using these tokens consistently, you ensure:

- **Visual consistency** across all pages
- **Faster development** with pre-built patterns
- **Easier maintenance** with centralized values
- **Professional quality** with carefully chosen tokens

**Remember**: The design system is your friend! Use it, extend it, and keep it as the single source of truth. 🎨✨

---

**Version**: 1.0.0  
**Last Updated**: March 14, 2026  
**Status**: Production Ready  
**Maintained By**: Orthodox Metrics Team
