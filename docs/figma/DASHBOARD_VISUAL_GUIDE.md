# Dashboard Visual Layout Guide
## Screen-by-Screen Comparison

---

## 🖼️ Layout Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│ NAVIGATION BAR                                    [Theme Toggle]    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  DASHBOARD HEADER - Church Identity & KPIs                          │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ [Church Icon] SS Peter & Paul Orthodox Church                  │ │
│  │               Oakland, CA • OCA        Test User • Admin       │ │
│  ├────────────────────────────────────────────────────────────────┤ │
│  │                                                                 │ │
│  │  Welcome back, Test                         [Add New Record]   │ │
│  │  Saturday, March 14, 2026                                      │ │
│  │                                                                 │ │
│  │  [Total Records] [Baptisms YTD] [Pending] [OCR Processing]    │ │
│  │     2,847           47             8          15               │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
├───────────────────────────────┬───────────────────────────────────────┤
│                               │                                       │
│  LEFT COLUMN (8/12)           │  RIGHT SIDEBAR (4/12)                │
│                               │                                       │
│  ┌─────────────────────────┐ │  ┌─────────────────────────────────┐ │
│  │ ATTENTION REQUIRED      │ │  │ QUICK ACTIONS                   │ │
│  │                         │ │  │                                 │ │
│  │ 🔴 OCR Review: 3 ready  │ │  │ [+] Add Baptism                │ │
│  │ 🟡 Incomplete Marriage  │ │  │ [+] Add Marriage               │ │
│  │ 🔵 5 scans uploaded     │ │  │ [+] Add Funeral                │ │
│  └─────────────────────────┘ │  │ [⬆] Upload Records             │ │
│                               │  │ [✓] Continue OCR               │ │
│  ┌─────────────────────────┐ │  │ [🔍] Search Records            │ │
│  │ PARISH RECORDS          │ │  └─────────────────────────────────┘ │
│  │                         │ │                                       │
│  │ ┌─────┐ ┌─────┐ ┌─────┐│ │  ┌─────────────────────────────────┐ │
│  │ │ BAP │ │ MAR │ │ FUN ││ │  │ RECORD PROCESSING               │ │
│  │ │1,842│ │ 456 │ │ 549 ││ │  │                                 │ │
│  │ │ +12 │ │  +3 │ │  +2 ││ │  │ Upload Records                  │ │
│  │ │     │ │     │ │     ││ │  │ OCR Pipeline                    │ │
│  │ │ •••  │ │ •••  │ │ ••• ││ │  │ Bulk Edit                       │ │
│  │ │[View]│ │[View]│ │[View]│ │  └─────────────────────────────────┘ │
│  │ │[Add] │ │[Add] │ │[Add]││ │                                       │
│  │ └─────┘ └─────┘ └─────┘│ │  ┌─────────────────────────────────┐ │
│  └─────────────────────────┘ │  │ ANALYTICS & REPORTS             │ │
│                               │  │                                 │ │
│  ┌─────────────────────────┐ │  │ Parish Analytics                │ │
│  │ RECENT ACTIVITY         │ │  │ Custom Reports                  │ │
│  │                         │ │  │ Sacramental Calendar            │ │
│  │ [All][Bap][Mar][Fun]    │ │  └─────────────────────────────────┘ │
│  │                         │ │                                       │
│  │ 👤 Baptism added        │ │  ┌─────────────────────────────────┐ │
│  │    Sophia Petrov        │ │  │ CERTIFICATES                    │ │
│  │    2 hours ago          │ │  │                                 │ │
│  │                         │ │  │ Generate Certificate            │ │
│  │ 💍 Marriage updated     │ │  │ Certificate Templates           │ │
│  │    Constantine & A...   │ │  └─────────────────────────────────┘ │
│  │    5 hours ago          │ │                                       │
│  │                         │ │  ┌─────────────────────────────────┐ │
│  │ ⬆ Records uploaded      │ │  │ ACCOUNT & SUPPORT               │ │
│  │    15 certificates      │ │  │                                 │ │
│  │    Yesterday            │ │  │ Parish Settings                 │ │
│  │                         │ │  │ User Management                 │ │
│  │ [View All Activity →]   │ │  │ Help & Support                  │ │
│  └─────────────────────────┘ │  └─────────────────────────────────┘ │
│                               │                                       │
└───────────────────────────────┴───────────────────────────────────────┘
│ FOOTER - Links, Copyright, Social                                    │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 🎨 Color Palette

### Light Mode
```
Background:        #ffffff (white)
Elevated:          #f9fafb (gray-50)
Hero Gradient:     #2d1b4e → #3a2461 → #4a2f74 (purple)
Primary Text:      #2d1b4e (deep purple)
Secondary Text:    #4a5565 (gray-700)
Accent:            #d4af37 (gold)
Borders:           #e5e7eb (gray-200)

Priority Alerts:
  High:    #fef2f2 background, #dc2626 border (red)
  Medium:  #fffbeb background, #f59e0b border (amber)
  Low:     #eff6ff background, #3b82f6 border (blue)

Record Cards:
  Baptism:   #3b82f6 → #2563eb (blue gradient)
  Marriage:  #f43f5e → #e11d48 (rose gradient)
  Funeral:   #a855f7 → #9333ea (purple gradient)
```

### Dark Mode
```
Background:        #111827 (gray-900)
Elevated:          #1f2937 (gray-800)
Hero Gradient:     #030712 → #111827 → #1f2937 (dark grays)
Primary Text:      #ffffff (white)
Secondary Text:    #9ca3af (gray-400)
Accent:            #d4af37 (gold - becomes primary)
Borders:           #374151 (gray-700)

Priority Alerts:
  High:    rgba(220, 38, 38, 0.1) background, #dc2626 border
  Medium:  rgba(245, 158, 11, 0.1) background, #f59e0b border
  Low:     rgba(59, 130, 246, 0.1) background, #3b82f6 border

Record Cards:
  Baptism:   #2563eb → #1d4ed8 (darker blue)
  Marriage:  #e11d48 → #be123c (darker rose)
  Funeral:   #9333ea → #7e22ce (darker purple)
```

---

## 📏 Spacing System

```
Component Padding:
  Compact:    16px (1rem)    - Tool links, small cards
  Standard:   24px (1.5rem)  - Most cards, sections
  Generous:   32px (2rem)    - Priority items, headers

Section Gaps:
  Small:      24px (1.5rem)  - Between related items
  Medium:     32px (2rem)    - Between sections
  Large:      48px (3rem)    - Major layout breaks

Grid Gaps:
  Card Grid:  24px (1.5rem)  - Between record cards
  Column Gap: 32px (2rem)    - Left column ↔ Right sidebar
```

---

## 🔤 Typography Scale

```
Hero Title:
  font-family: Georgia
  font-size: 48px (3xl)
  font-weight: 400 (normal)
  color: white (on gradient)

Section Heading:
  font-family: Georgia
  font-size: 32px (2xl)
  font-weight: 400
  color: #2d1b4e / #ffffff (light/dark)

Card Title:
  font-family: Inter
  font-size: 20px (xl)
  font-weight: 500 (medium)
  color: #2d1b4e / #ffffff

Body Text:
  font-family: Inter
  font-size: 15px
  font-weight: 400
  color: #4a5565 / #9ca3af

Small Text:
  font-family: Inter
  font-size: 13px
  font-weight: 400
  color: #6b7280 / #6b7280

Micro Text:
  font-family: Inter
  font-size: 12px
  font-weight: 400
  color: #9ca3af / #6b7280
```

---

## 🎯 Component Specifications

### Metric Card (KPI)
```
Dimensions:    Auto width, 100px height
Background:    Glass effect (white/10 alpha)
Border:        1px solid white/20 alpha
Radius:        12px
Padding:       20px

Icon Container:
  Size:        40px × 40px
  Background:  white/10 alpha
  Radius:      8px
  Icon Color:  #d4af37 (gold)

Value:
  Font:        Georgia
  Size:        48px (3xl)
  Color:       White

Label:
  Font:        Inter
  Size:        13px
  Color:       White/70 alpha
```

### Priority Item
```
Dimensions:    Full width, auto height
Background:    Semantic color (red-50, amber-50, blue-50)
Border-Left:   4px solid (red-500, amber-500, blue-500)
Radius:        8px
Padding:       16px

Icon Container:
  Size:        40px × 40px
  Background:  White (light) / gray-800 (dark)
  Radius:      8px
  Icon Color:  #d4af37 (gold)

Title:
  Font:        Inter
  Size:        15px
  Weight:      500 (medium)
  Color:       Primary text

Action Button:
  Padding:     8px 16px
  Background:  White (light) / gray-800 (dark)
  Border:      1px solid
  Radius:      8px
  Hover:       Purple (light) / gold (dark) background
```

### Record Type Card
```
Dimensions:    Auto width, ~400px height
Background:    White (light) / gray-800 (dark)
Border:        1px solid gray-200 / gray-700
Radius:        16px
Shadow:        sm (light) / md (dark)

Header:
  Background:  Gradient (blue/rose/purple)
  Padding:     20px
  Color:       White
  
  Icon:        28px
  Count:       Georgia, 48px (3xl)
  Trend:       Inter, 13px, white/80

Recent List:
  Padding:     16px
  Item Gap:    8px
  Font:        Inter, 13px
  Divider:     Bottom border

Actions:
  Grid:        2 columns
  Gap:         8px
  Padding:     16px
  Button:      Full width, 32px height
```

### Activity Item
```
Dimensions:    Full width, auto height
Padding:       16px bottom
Border-Bottom: 1px divider (except last)

Icon Container:
  Size:        40px × 40px
  Background:  Semantic color (blue-100, rose-100, etc.)
  Radius:      8px
  Icon Color:  Semantic (blue-600, rose-600, etc.)

Title:
  Font:        Inter
  Size:        14px
  Weight:      500 (medium)
  Color:       Primary text

Description:
  Font:        Inter
  Size:        13px
  Color:       Secondary text

Metadata:
  Font:        Inter
  Size:        12px
  Color:       Tertiary text
  Separator:   • (bullet)
```

### Quick Action Button
```
Dimensions:    Full width, auto height
Padding:       16px
Radius:        12px

Primary Variant:
  Background:  #2d1b4e (light) / #d4af37 (dark)
  Text Color:  White (light) / #2d1b4e (dark)
  Hover:       Darker shade

Secondary Variant:
  Background:  White (light) / gray-800 (dark)
  Border:      1px solid
  Hover:       Gold border

Icon Container:
  Size:        44px × 44px
  Background:  white/10 (primary) / brand color (secondary)
  Radius:      8px
  Icon:        20px

Label:
  Font:        Inter
  Size:        15px
  Weight:      500 (medium)

Description:
  Font:        Inter
  Size:        12px
  Weight:      400
  Opacity:     70% (primary) / 100% (secondary)
```

### Tool Link
```
Dimensions:    Full width, auto height
Padding:       16px
Hover:         Background change
Border-Bottom: 1px divider (within card)

Icon Container:
  Size:        36px × 36px
  Background:  gray-100 (light) / gray-700 (dark)
  Radius:      8px
  Icon:        16px, gold

Label:
  Font:        Inter
  Size:        14px
  Weight:      500 (medium)
  Color:       Primary text

Description:
  Font:        Inter
  Size:        12px
  Color:       Tertiary text

Chevron:
  Size:        16px
  Color:       Tertiary text
  Position:    Right-aligned
```

---

## 🌓 Light/Dark Mode Transitions

### Automatic Transitions
All color properties transition smoothly:
```css
transition: background-color 200ms ease,
            color 200ms ease,
            border-color 200ms ease,
            box-shadow 200ms ease;
```

### Theme Toggle Behavior
- Toggle in navigation bar
- Persists to localStorage
- Applies to entire app
- Smooth fade transition
- No flash of unstyled content

---

## 📱 Responsive Breakpoints

### Desktop (1600px+)
- 12-column grid active
- Sidebar visible
- All features expanded
- Optimal spacing

### Large Tablet (1200px - 1599px)
- 12-column grid compressed
- Sidebar narrower
- Metrics 2×2 grid
- Reduced padding

### Tablet (768px - 1199px)
- Stacked layout
- Sidebar becomes full-width sections
- Single column priority items
- Record cards stack 2-wide

### Mobile (< 768px)
- Single column everything
- Metrics stack vertically
- Quick actions expand full-width
- Tool groups collapse
- Reduced padding (16px instead of 32px)

---

## ✨ Interactive States

### Hover States
```
Cards:
  Border: gray-200 → gold
  Shadow: Increase elevation

Buttons:
  Primary: Darker shade + cursor pointer
  Secondary: Border color → gold

Links:
  Color: Add underline
  Cursor: Pointer

Tool Links:
  Background: Slight gray tint
```

### Focus States (Keyboard Navigation)
```
All interactive elements:
  outline: 2px solid focus-ring
  outline-offset: 2px
  
Focus ring color:
  Light: rgba(45, 27, 78, 0.5) - purple
  Dark:  rgba(212, 175, 55, 0.5) - gold
```

### Active States
```
Buttons:
  Transform: scale(0.98)
  Duration: 100ms

Filter Buttons:
  Active:   Purple bg (light) / Gold bg (dark)
  Inactive: White/transparent
```

---

## 🎨 Icon Usage

### Icon Library
Lucide React (consistent, clean, professional)

### Icon Sizes
- Large: 48px (metric cards, headers)
- Medium: 28px (record card headers)
- Standard: 20px (quick actions, priority items)
- Small: 16px (tool links, activity items)
- Micro: 14px (inline icons)

### Icon Colors
- **Gold (#d4af37)**: Primary accent, feature icons
- **Semantic**: Blue/Rose/Purple for record types
- **White**: On colored backgrounds
- **Purple (#2d1b4e)**: Dark mode text on gold

---

## 📊 Data Visualization

### Metrics Display
```
Number → Label → Trend

Example:
  2,847
  Total Records
  +12 this month
```

### Trend Indicators
- **Positive growth**: Green or neutral
- **Attention needed**: Amber/red
- **In progress**: Blue

### Progress Bars
Not currently used, but prepared for:
- OCR processing status
- Upload progress
- Record completion percentage

---

## 🔐 Empty States

### No Priority Items
```
┌─────────────────────────────┐
│ ✓ All Caught Up!            │
│                              │
│ No items require attention.  │
│ Your parish records are      │
│ up to date.                  │
└─────────────────────────────┘
```

### No Recent Activity
```
┌─────────────────────────────┐
│ No recent activity           │
│                              │
│ Activity will appear here    │
│ as you work with records.    │
└─────────────────────────────┘
```

### No Recent Records (in category)
```
┌─────────────────────────────┐
│ No recent baptisms           │
│                              │
│ [Add First Baptism]          │
└─────────────────────────────┘
```

---

## 🎯 Call-to-Action Hierarchy

### Primary CTAs
1. **Add New Record** (header)
2. **Quick Action Buttons** (sidebar)
3. **Add New** (on record cards)

### Secondary CTAs
4. **Review Now** (priority items)
5. **View All** (record cards, activity)
6. **Process / Complete** (priority items)

### Tertiary CTAs
7. **Tool Links** (grouped sections)
8. **Filter Buttons** (activity)
9. **Export / Download**

---

**Version**: 1.0  
**Last Updated**: March 14, 2026  
**Purpose**: Visual specification for implementation consistency
