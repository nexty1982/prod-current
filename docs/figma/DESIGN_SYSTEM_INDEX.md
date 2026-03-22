# Orthodox Metrics Design System - Documentation Index

> **Navigate the complete design system documentation suite**

---

## 🎯 Start Here

Not sure where to begin? Follow this path:

```
1. Read: DESIGN_SYSTEM_SUMMARY.md (this gives you the overview)
   ↓
2. Explore: Visit / in the app (see all tokens visually)
   ↓
3. Reference: DESIGN_TOKENS_QUICK_REFERENCE.md (while coding/designing)
   ↓
4. Deep Dive: DESIGN_SYSTEM_GUIDE.md (when you need details)
```

---

## 📚 All Documentation Files

### 🌟 **Essential Reading** (Start Here)

| File | Size | Read Time | Purpose | Best For |
|------|------|-----------|---------|----------|
| **[DESIGN_SYSTEM_SUMMARY.md](./DESIGN_SYSTEM_SUMMARY.md)** | 15 pages | 10 min | Complete overview, what's included, how to use | **Everyone - Read First** |
| **[DESIGN_TOKENS_QUICK_REFERENCE.md](./DESIGN_TOKENS_QUICK_REFERENCE.md)** | 6 pages | 5 min | Cheat sheet with common tokens and patterns | **Developers & Designers** |
| **[DESIGN_SYSTEM_README.md](./DESIGN_SYSTEM_README.md)** | 12 pages | 10 min | Getting started guide, architecture, benefits | **New Team Members** |

### 📖 **Detailed Guides** (When You Need Details)

| File | Size | Read Time | Purpose | Best For |
|------|------|-----------|---------|----------|
| **[DESIGN_SYSTEM_GUIDE.md](./DESIGN_SYSTEM_GUIDE.md)** | 18 pages | 20 min | Complete implementation guide, workflows, best practices | **Developers** |
| **[design-specifications.md](./design-specifications.md)** | 30 pages | Reference | Extracted Figma specifications, all measurements | **Design Handoff** |

### 📋 **Reference Materials** (Keep Nearby)

| File | Size | Purpose | When to Use |
|------|------|---------|-------------|
| **[DESIGN_SYSTEM_CHANGELOG.md](./DESIGN_SYSTEM_CHANGELOG.md)** | 5 pages | Version history, updates, deprecations | **Tracking Changes** |
| **[DESIGN_SYSTEM_INDEX.md](./DESIGN_SYSTEM_INDEX.md)** | 4 pages | This file - navigation guide | **Finding Docs** |

---

## 💻 Code Files

### 🎨 **Design Token Sources**

| File | Format | Purpose | For |
|------|--------|---------|-----|
| `/src/design-tokens.json` | JSON | Figma-compatible tokens (Tokens Studio) | **Designers** |
| `/src/styles/design-system.css` | CSS | CSS custom properties & utility classes | **Developers** |

### 📱 **Visual Documentation**

| File | Type | Purpose | Access |
|------|------|---------|--------|
| `/src/app/pages/DesignSystem.tsx` | React | Interactive design system page | **Visit /** |

---

## 🎓 Learning Paths

### Path 1: "I'm a Developer - Get Me Started Fast"

**Total Time: 20 minutes**

1. **Read**: DESIGN_TOKENS_QUICK_REFERENCE.md (5 min)
   - Get the token names you'll use most
   - See common patterns and examples

2. **Explore**: Visit `/` in the app (10 min)
   - See all tokens visually
   - Try out the interactive examples
   - Inspect with DevTools to see the CSS

3. **Code**: Build your first component (5 min)
   ```tsx
   <div className="card-elevated">
     <h3 className="text-h3">My Component</h3>
     <p className="text-body">Using the design system!</p>
     <button className="btn-primary">Action</button>
   </div>
   ```

4. **Reference**: Keep DESIGN_TOKENS_QUICK_REFERENCE.md open while coding

---

### Path 2: "I'm a Designer - How Do I Use This in Figma?"

**Total Time: 15 minutes**

1. **Read**: DESIGN_SYSTEM_SUMMARY.md → "For Designers" section (5 min)
   - Understand the token system
   - Learn about Figma integration

2. **Setup**: Import tokens to Figma (5 min)
   ```
   - Install "Tokens Studio for Figma" plugin
   - Open the plugin
   - Import /src/design-tokens.json
   - Tokens are now available!
   ```

3. **Reference**: Use design-specifications.md (ongoing)
   - All exact measurements from the original design
   - Color hex codes, spacing values, shadows

4. **Design**: Start using tokens instead of creating new styles

---

### Path 3: "I'm New to the Project - Give Me the Big Picture"

**Total Time: 30 minutes**

1. **Read**: DESIGN_SYSTEM_SUMMARY.md (10 min)
   - What's included in the design system
   - How to use it (developers and designers)
   - Quick start examples

2. **Read**: DESIGN_SYSTEM_README.md (10 min)
   - Architecture and philosophy
   - Benefits and use cases
   - File structure

3. **Explore**: Visit the Design System page (10 min)
   - See all colors, typography, spacing
   - Interact with components
   - Get familiar with the visual language

4. **Next**: Follow your role-specific path (Developer or Designer)

---

### Path 4: "I Need to Understand Everything"

**Total Time: 60 minutes**

1. DESIGN_SYSTEM_SUMMARY.md (10 min)
2. DESIGN_SYSTEM_README.md (10 min)
3. DESIGN_SYSTEM_GUIDE.md (20 min)
4. Design System page exploration (10 min)
5. design-specifications.md (10 min - skim for reference)
6. DESIGN_SYSTEM_CHANGELOG.md (5 min)

---

## 🔍 Find Information By Topic

### Colors
- **Quick reference**: DESIGN_TOKENS_QUICK_REFERENCE.md → Colors section
- **Visual examples**: Design System page → Colors section
- **All values**: /src/design-tokens.json → colors
- **CSS variables**: /src/styles/design-system.css → Colors section
- **Specifications**: design-specifications.md → Color System

### Typography
- **Quick reference**: DESIGN_TOKENS_QUICK_REFERENCE.md → Typography section
- **Visual examples**: Design System page → Typography section
- **Text styles**: DESIGN_SYSTEM_GUIDE.md → Typography classes
- **All values**: /src/design-tokens.json → typography
- **Specifications**: design-specifications.md → Typography System

### Spacing
- **Quick reference**: DESIGN_TOKENS_QUICK_REFERENCE.md → Spacing section
- **Visual scale**: Design System page → Spacing section
- **Usage patterns**: DESIGN_SYSTEM_GUIDE.md → Layout Guidelines
- **All values**: /src/design-tokens.json → spacing
- **Specifications**: design-specifications.md → Spacing System

### Components
- **Quick patterns**: DESIGN_TOKENS_QUICK_REFERENCE.md → Common Patterns
- **Visual examples**: Design System page → Buttons, Cards, Badges sections
- **Detailed specs**: DESIGN_SYSTEM_GUIDE.md → Component Patterns
- **CSS classes**: /src/styles/design-system.css → Component Utilities
- **Specifications**: design-specifications.md → Component Specifications

### Shadows & Effects
- **Quick reference**: DESIGN_TOKENS_QUICK_REFERENCE.md → Shadows
- **Visual comparison**: Design System page → Shadows section
- **All values**: /src/design-tokens.json → shadows
- **Usage guide**: DESIGN_SYSTEM_GUIDE.md → Shadows section
- **Specifications**: design-specifications.md → Shadows and Effects

### Layout & Grid
- **Grid examples**: Design System page → Layout & Grid section
- **Container usage**: DESIGN_SYSTEM_GUIDE.md → Layout Guidelines
- **All values**: /src/design-tokens.json → layout
- **Specifications**: design-specifications.md → Layout Grid

---

## 📌 Quick Links by Role

### For Developers

**Daily Reference**:
- DESIGN_TOKENS_QUICK_REFERENCE.md
- /src/styles/design-system.css
- Design System page at `/`

**Detailed Help**:
- DESIGN_SYSTEM_GUIDE.md
- design-specifications.md

**When Adding Features**:
- DESIGN_SYSTEM_GUIDE.md → Component Patterns
- DESIGN_TOKENS_QUICK_REFERENCE.md → Common Patterns

**When Something's Unclear**:
- DESIGN_SYSTEM_README.md → Troubleshooting
- DESIGN_SYSTEM_GUIDE.md → Best Practices

---

### For Designers

**Daily Reference**:
- design-specifications.md
- Design System page at `/`
- /src/design-tokens.json (in Figma)

**Getting Started**:
- DESIGN_SYSTEM_SUMMARY.md → For Designers
- DESIGN_SYSTEM_GUIDE.md → Using Design Tokens in Figma

**Design Handoff**:
- design-specifications.md (give to developers)
- DESIGN_SYSTEM_GUIDE.md → Component Patterns

**When Creating New Designs**:
- Use tokens in Figma (imported from JSON)
- Reference Design System page for components
- Check design-specifications.md for existing patterns

---

### For Project Managers

**Understanding the System**:
- DESIGN_SYSTEM_SUMMARY.md → Overview and benefits
- DESIGN_SYSTEM_README.md → Architecture and value

**Tracking Progress**:
- DESIGN_SYSTEM_CHANGELOG.md → Version history

**Team Onboarding**:
- DESIGN_SYSTEM_INDEX.md → Learning paths
- DESIGN_SYSTEM_README.md → Getting started

---

## 🎯 Common Questions

### "Where do I find the color values?"
→ DESIGN_TOKENS_QUICK_REFERENCE.md (quick) or Design System page (visual)

### "How do I use this in my React component?"
→ DESIGN_TOKENS_QUICK_REFERENCE.md → Common Patterns

### "What's the spacing between sections?"
→ design-specifications.md → Spacing System or DESIGN_SYSTEM_GUIDE.md → Layout

### "How do I import tokens to Figma?"
→ DESIGN_SYSTEM_GUIDE.md → Using Design Tokens in Figma

### "What button styles are available?"
→ Design System page → Buttons section (visual) or DESIGN_TOKENS_QUICK_REFERENCE.md

### "How do I add a new token?"
→ DESIGN_SYSTEM_GUIDE.md → Extending the System

### "What's changed in the latest version?"
→ DESIGN_SYSTEM_CHANGELOG.md

### "Where's the interactive documentation?"
→ Run the app and visit `/`

---

## 📖 Documentation Stats

**Total Pages**: 90+ pages of comprehensive documentation

**Total Words**: 45,000+ words

**Total Read Time**: ~2 hours to read everything (but you don't need to!)

**Files**:
- 6 markdown documentation files
- 2 design token files (JSON + CSS)
- 1 React documentation page
- Complete coverage of the entire design system

---

## 🎨 File Relationships

```
design-tokens.json (SOURCE OF TRUTH)
    ↓
    ├─→ Figma (via Tokens Studio)
    │   └─→ Designs by team
    │
    └─→ design-system.css (auto-generated variables)
        ↓
        ├─→ React components (via className or style)
        ├─→ Custom CSS files (via var())
        └─→ DesignSystem.tsx (visual documentation)

Documentation Flow:
    design-specifications.md (extracted from Figma)
        ↓
    design-tokens.json (structured tokens)
        ↓
    DESIGN_SYSTEM_GUIDE.md (how to use)
        ↓
    DESIGN_TOKENS_QUICK_REFERENCE.md (cheat sheet)
```

---

## ✅ Recommended Reading Order

### First Time Setup (30 min)
1. DESIGN_SYSTEM_SUMMARY.md
2. Your role-specific section (Developer or Designer)
3. Design System page exploration
4. DESIGN_TOKENS_QUICK_REFERENCE.md

### Daily Development (ongoing)
- Keep DESIGN_TOKENS_QUICK_REFERENCE.md open
- Reference Design System page visually
- Check DESIGN_SYSTEM_GUIDE.md when stuck

### Deep Understanding (1 hour)
1. DESIGN_SYSTEM_SUMMARY.md
2. DESIGN_SYSTEM_README.md
3. DESIGN_SYSTEM_GUIDE.md
4. Skim design-specifications.md

---

## 🚀 Ready to Get Started?

**Choose your path**:

1. **🏃 Fast Track** (20 min)
   - DESIGN_TOKENS_QUICK_REFERENCE.md
   - Design System page
   - Start building!

2. **📚 Complete Understanding** (1 hour)
   - DESIGN_SYSTEM_SUMMARY.md
   - DESIGN_SYSTEM_README.md
   - DESIGN_SYSTEM_GUIDE.md
   - Design System page

3. **🎨 Designer Path** (15 min)
   - DESIGN_SYSTEM_SUMMARY.md → Designers
   - Import tokens to Figma
   - Reference design-specifications.md

**Pro Tip**: You don't need to read everything! Start with the Quick Reference and explore as needed.

---

## 🆘 Still Lost?

**Can't find what you need?**
1. Check this index for the right file
2. Use browser search (Cmd/Ctrl + F) in the relevant doc
3. Visit the Design System page for visual reference
4. Read DESIGN_SYSTEM_README.md for architecture overview

**Need a specific example?**
→ DESIGN_SYSTEM_GUIDE.md → Component Patterns

**Want to see it in action?**
→ Visit `/` in the app

**Need exact measurements?**
→ design-specifications.md

---

## 📊 At a Glance

| Document | Best For | When to Use |
|----------|----------|-------------|
| SUMMARY | Overview | First time, onboarding |
| QUICK_REFERENCE | Daily coding | Always open while working |
| README | Understanding | Learning the system |
| GUIDE | Implementation | Building components |
| SPECIFICATIONS | Exact values | Design handoff, precision |
| CHANGELOG | History | Tracking changes |
| INDEX | Navigation | Finding the right doc |

---

**Last Updated**: March 14, 2026  
**Version**: 1.0.0  
**Status**: ✅ Complete

---

**Navigate wisely, build beautifully! 🎨✨**
