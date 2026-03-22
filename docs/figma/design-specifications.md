# Orthodox Metrics About Page - Complete Design Specifications

## 1. Typography System

### Font Families
- **Primary Font**: Inter (sans-serif)
  - Regular (400): Body text, descriptions, labels
  - Medium (500): Headings level 3, button text
- **Secondary Font**: Georgia (serif)
  - Regular: H1 and H2 headings, large display numbers

### Typography Scale

#### H1 (Main Page Headings)
- **Font**: Georgia Regular
- **Size**: 48px
- **Line Height**: 48px
- **Letter Spacing**: -1.2px (for longer headings)
- **Color**: #2d1b4e (primary purple)
- **Usage**: Section titles, major headings

#### H2 (Section Headings)
- **Font**: Georgia Regular  
- **Size**: 48px
- **Line Height**: 48px
- **Color**: #2d1b4e
- **Usage**: "Built with Your Parish in Mind", "Orthodox Metrics at a Glance"

#### H3 (Card/Component Headings)
- **Font**: Inter Medium (500)
- **Size**: 20px
- **Line Height**: 28px
- **Color**: #2d1b4e (or white for dark cards)
- **Usage**: Feature card titles, pricing card titles, component headings

#### Body Large
- **Font**: Inter Regular
- **Size**: 20px
- **Line Height**: 28px
- **Color**: #4a5565 (gray)
- **Usage**: Section introductions, lead paragraphs

#### Body Standard
- **Font**: Inter Regular
- **Size**: 18px
- **Line Height**: 29.25px
- **Color**: #4a5565
- **Usage**: Purpose section paragraphs

#### Body Small
- **Font**: Inter Regular
- **Size**: 16px
- **Line Height**: 24px / 26px (varies by context)
- **Color**: #4a5565
- **Usage**: Feature descriptions, card body text

#### Small Text
- **Font**: Inter Regular
- **Size**: 14px
- **Line Height**: 20px / 22.75px
- **Color**: #6a7282 (labels), #4a5565 (descriptions), #2d1b4e (badges)
- **Usage**: Labels, badges, small descriptions, pricing details

#### Button Text
- **Font**: Inter Medium (500)
- **Size**: 16px
- **Line Height**: 24px
- **Color**: #2d1b4e (on gold buttons), white (on purple buttons)
- **Usage**: All button labels

#### Large Display Numbers
- **Font**: Georgia Regular
- **Size**: 48px
- **Line Height**: 48px
- **Color**: #2d1b4e
- **Usage**: Metrics statistics (2025, 1+, etc.)

---

## 2. Color System

### Primary Colors
- **Primary Purple**: `#2d1b4e`
  - Main brand color
  - Headings, primary text
  - Icon containers
  - Borders (with opacity variations)

### Secondary Purple Tones (Gradient Variations)
- `rgb(45, 27, 78)` - Base
- `rgb(48, 29, 82)`
- `rgb(51, 31, 85)`
- `rgb(54, 34, 89)`
- `rgb(58, 36, 92)`
- `rgb(61, 38, 96)`
- `rgb(64, 40, 100)`
- `rgb(67, 42, 104)`
- `rgb(71, 45, 107)`
- `rgb(74, 47, 111)` - Darkest

### Gold Accent
- **Gold**: `#d4af37`
  - CTA buttons
  - Icon accents
  - Highlighted elements
  - Icon containers
  - Popular badges

### Text Colors
- **Heading Text**: `#2d1b4e` (primary purple)
- **Body Text**: `#4a5565` (dark gray)
- **Secondary Text**: `#6a7282` (medium gray)
- **On Dark Backgrounds**: `white` or `rgba(255, 255, 255, 0.8)`
- **On Gold Backgrounds**: `#2d1b4e` or `rgba(45, 27, 78, 0.8)`

### Background Colors
- **Page Background**: `white` / `#ffffff`
- **Section Alternates**: `#f9fafb` (very light gray)
- **Card Backgrounds**: `white`
- **Dark Cards**: `#2d1b4e`
- **Gold Cards**: `#d4af37`
- **Gradient Backgrounds**: 
  - Hero gradient: `linear-gradient(160.048deg, rgb(45, 27, 78) 0% ... rgb(74, 47, 111) 100%)`
  - Card gradient: `linear-gradient(136.599deg, rgb(249, 250, 251) 0%, rgb(255, 255, 255) 100%)`

### Border Colors
- **Light Border**: `#f3f4f6`
- **Accent Border**: `#d4af37`
- **Purple Border (10% opacity)**: `rgba(45, 27, 78, 0.1)`
- **White Border (20% opacity)**: `rgba(255, 255, 255, 0.2)`

### Badge/Pill Backgrounds
- **Light Purple Badge**: `rgba(45, 27, 78, 0.05)`
- **Gold Badge**: `#d4af37`

---

## 3. Layout Grid

### Page Structure
- **Container Type**: Fixed-width centered containers with absolute positioning for Figma import
- **Max Width Sections**:
  - Features section: 1280px
  - Content sections: Varying widths (584px, 768px, 1232px)

### Grid Systems Used

#### Feature Cards Grid (2-column)
- **Columns**: 2
- **Rows**: 2 (184px first row, remaining space for second row)
- **Gap**: 32px (both horizontal and vertical)
- **Grid Template**: `grid-cols-[repeat(2,minmax(0,1fr))]`

#### Purpose Cards Grid (1-column vertical stack)
- **Columns**: 1
- **Rows**: 3 (212px, 216px, flexible)
- **Gap**: 24px (vertical)
- **Grid Template**: `grid-cols-[repeat(1,minmax(0,1fr))]`

#### Pricing Cards Grid
- **Layout**: Horizontal flex layout with gaps
- **Card spacing**: 32px between cards

### Spacing Values
- **Page Side Margins**: 24px (on some sections)
- **Section Width**: Full width (3423px for Figma canvas)
- **Content Max Width**: 1280px (Features section)

---

## 4. Spacing System

### Spacing Scale
The design uses the following spacing values:

- **4px**: Minor adjustments
- **8px**: Icon padding, small gaps
- **12px**: Text spacing within components
- **16px**: 
  - Badge padding (horizontal)
  - Icon container padding
  - Text gaps
- **24px**: 
  - Card gaps (Purpose section)
  - Page side padding
  - Component spacing
- **32px**: 
  - Card padding (internal)
  - Feature card gaps
  - Icon containers
  - Large component spacing
- **33px**: Specific card padding
- **48px**: Icon sizes (large)
- **52px**: Heading top margins
- **60px**: Heading top spacing
- **64px**: 
  - Section gaps
  - Large icon containers
  - Component spacing
- **96px**: Section top positioning
- **116px**: Paragraph positioning
- **140px**: Large vertical spacing

### Spacing Usage

#### Section Spacing
- **Between sections**: 64px - 96px
- **Section internal padding**: 24px horizontal

#### Card Padding
- **Feature cards**: 33px all sides
- **Pricing cards**: 32px all sides
- **Metric cards**: 33px all sides

#### Grid Gaps
- **Feature grid**: 32px × 32px
- **Purpose cards**: 24px vertical
- **Text groups**: 12px - 16px

#### Button Padding
- **Height**: 50px - 58px
- **Horizontal padding**: Calculated to center text
- **Internal spacing**: 10px - 16px vertical

---

## 5. Component Specifications

### Buttons

#### Primary Button (Gold)
- **Background**: `#d4af37`
- **Height**: 50.4px - 58px
- **Border Radius**: 10px
- **Padding**: Centered text with ~10-16px vertical
- **Text**: 
  - Font: Inter Medium
  - Size: 16px
  - Line Height: 24px
  - Color: #2d1b4e
- **Shadow**: `0px 10px 15px 0px rgba(0,0,0,0.1), 0px 4px 6px 0px rgba(0,0,0,0.1)` or `0px 20px 25px 0px rgba(0,0,0,0.1), 0px 8px 10px 0px rgba(0,0,0,0.1)`
- **Width**: 233px - 243.5px

#### Secondary Button
- **Similar styling but may have different background colors**

### Feature Cards (Purpose Section - Vertical Stack)

#### Standard White Card
- **Width**: 584px
- **Height**: 216px
- **Padding**: 32px
- **Border Radius**: 16px
- **Background**: White
- **Border**: 2px solid `rgba(45, 27, 78, 0.1)`
- **Shadow**: `0px 10px 15px 0px rgba(0,0,0,0.1), 0px 4px 6px 0px rgba(0,0,0,0.1)`
- **Icon Container**: 
  - Size: 48px × 48px
  - Background: `#d4af37` or `#2d1b4e`
  - Border Radius: Variable
- **Heading**: H3 style (20px Inter Medium)
- **Description**: 16px Inter Regular

#### Purple Gradient Card
- **Width**: 584px
- **Height**: 212px
- **Padding**: 32px
- **Border Radius**: 16px
- **Background**: Linear gradient (purple tones)
- **Shadow**: `0px 10px 15px 0px rgba(0,0,0,0.1), 0px 4px 6px 0px rgba(0,0,0,0.1)`
- **Text Color**: White / `rgba(255,255,255,0.8)`

#### Gold Card
- **Width**: 584px
- **Height**: Flexible
- **Padding**: 32px
- **Border Radius**: 16px
- **Background**: `#d4af37`
- **Shadow**: `0px 10px 15px 0px rgba(0,0,0,0.1), 0px 4px 6px 0px rgba(0,0,0,0.1)`
- **Text Color**: `#2d1b4e` / `rgba(45,27,78,0.8)`

### Feature Cards (Horizontal Grid)

#### White Card with Border
- **Grid Position**: 2-column grid
- **Padding**: 33px
- **Border Radius**: 16px
- **Background**: White
- **Border**: 1px solid `#f3f4f6`
- **Shadow**: `0px 1px 3px 0px rgba(0,0,0,0.1), 0px 1px 2px 0px rgba(0,0,0,0.1)`
- **Icon Container**: 
  - Size: 64px × 64px
  - Background: `#2d1b4e` or `#d4af37`
  - Border Radius: 14px
  - Shadow: `0px 10px 15px 0px rgba(0,0,0,0.1), 0px 4px 6px 0px rgba(0,0,0,0.1)`
- **Icon Size**: 32px within 64px container
- **Spacing**: 24px gap between icon and text
- **Heading**: 20px Inter Medium, #2d1b4e
- **Text Gap**: 12px between heading and description

### Pricing Cards

#### Standard Pricing Card
- **Width**: ~290px - 305px
- **Height**: 700px - 735px
- **Padding**: 32px
- **Border Radius**: 16px
- **Background**: White
- **Border**: 1px solid `#f3f4f6`
- **Shadow**: `0px 10px 15px 0px rgba(0,0,0,0.1), 0px 4px 6px 0px rgba(0,0,0,0.1)`
- **Icon Container**: 48px × 48px, `#2d1b4e`, border-radius: 14px
- **Spacing Between Cards**: 32px

#### Highlighted Pricing Card (Popular)
- **Same dimensions as standard**
- **Border**: 2px solid `#d4af37`
- **Badge**: 
  - Background: `#d4af37`
  - Border Radius: Fully rounded (pill shape)
  - Height: ~28px
  - Padding: 16.8px horizontal
  - Text: 14px Inter Regular, #2d1b4e
  - Shadow: `0px 10px 15px 0px rgba(0,0,0,0.1), 0px 4px 6px 0px rgba(0,0,0,0.1)`
- **Position**: Centered above card (negative top margin: -12px to -17.5px)

### Testimonial Card
- **Width**: Full width in grid
- **Height**: ~435px
- **Padding**: Variable
- **Border Radius**: 24px
- **Background**: White
- **Shadow**: `0px 25px 50px -12px rgba(0,0,0,0.25)`
- **Quote Icon/Stars**: Star ratings displayed
- **Avatar**: Circular with border

### Team Profile Card
- **Width**: Flexible
- **Height**: ~250px - 300px
- **Padding**: Variable
- **Border Radius**: 24px
- **Background**: White
- **Border**: 1px solid `#f3f4f6`
- **Shadow**: `0px 20px 25px 0px rgba(0,0,0,0.1), 0px 8px 10px 0px rgba(0,0,0,0.1)`
- **Avatar**: 
  - Size: Circular
  - Border: 4px solid white
  - Shadow: `0px 25px 50px -12px rgba(0,0,0,0.25)`
- **Typography**: Hierarchical (name, title, description)

### Metric Cards
- **Width**: ~290px
- **Height**: ~250px
- **Padding**: 33px
- **Border Radius**: 16px
- **Background**: Gradient `linear-gradient(136.599deg, rgb(249, 250, 251) 0%, rgb(255, 255, 255) 100%)`
- **Border**: 1px solid `#f3f4f6`
- **Icon Container**: 
  - Size: 36px × 36px
  - Background: `#2d1b4e`
  - Border Radius: 10px
  - Contains 20px icon
- **Background Icon**: 
  - Size: 64px × 64px
  - Opacity: 10%
  - Position: Top right area
- **Label**: 14px Inter Regular, #6a7282
- **Value**: 48px Georgia Regular, #2d1b4e
- **Description**: 14px Inter Regular, #4a5565

### Badge/Pill Components
- **Height**: 28px - 36px
- **Border Radius**: Fully rounded (33554400px / max value)
- **Padding**: 8px vertical, 16px horizontal
- **Background**: 
  - `rgba(45, 27, 78, 0.05)` for light purple
  - `#d4af37` for gold
- **Text**: 14px Inter Regular, #2d1b4e

---

## 6. Icon System

### Icon Sizes
- **Small Icons**: 20px
- **Medium Icons**: 32px
- **Large Icons**: 48px
- **Extra Large Icons**: 64px (background decorative)

### Icon Containers

#### Small Container
- **Size**: 36px × 36px
- **Border Radius**: 10px
- **Background**: `#2d1b4e` or `#d4af37`
- **Padding**: 8px
- **Icon Size**: 20px

#### Medium Container
- **Size**: 48px × 48px
- **Border Radius**: 14px
- **Background**: `#2d1b4e` or `#d4af37`
- **Padding**: 12px - 16px
- **Icon Size**: 24px - 32px
- **Shadow**: `0px 10px 15px 0px rgba(0,0,0,0.1), 0px 4px 6px 0px rgba(0,0,0,0.1)`

#### Large Container
- **Size**: 64px × 64px
- **Border Radius**: 14px
- **Background**: `#2d1b4e` or `#d4af37`
- **Padding**: 16px
- **Icon Size**: 32px
- **Shadow**: `0px 10px 15px 0px rgba(0,0,0,0.1), 0px 4px 6px 0px rgba(0,0,0,0.1)`

### Icon Colors
- **Primary**: `#d4af37` (gold stroke)
- **Secondary**: `#2d1b4e` (purple stroke)
- **On Dark**: `#d4af37`
- **Stroke Width**: 
  - 1.4px - 1.67px (small icons)
  - 2px - 2.67px (medium icons)
  - 4px - 5.33px (large icons)

### Spacing Between Icon and Text
- **Card headers**: 24px gap
- **Inline elements**: 12px gap
- **Buttons**: Icons positioned absolutely with calculated offsets

---

## 7. Shadows and Effects

### Shadow Styles

#### Light Card Shadow (sm)
```css
box-shadow: 0px 1px 3px 0px rgba(0,0,0,0.1), 
            0px 1px 2px 0px rgba(0,0,0,0.1);
```
**Usage**: Feature cards, subtle elevation

#### Medium Card Shadow (md)
```css
box-shadow: 0px 10px 15px 0px rgba(0,0,0,0.1), 
            0px 4px 6px 0px rgba(0,0,0,0.1);
```
**Usage**: Purpose cards, icon containers, buttons, pricing cards, badges

#### Large Card Shadow (lg)
```css
box-shadow: 0px 20px 25px 0px rgba(0,0,0,0.1), 
            0px 8px 10px 0px rgba(0,0,0,0.1);
```
**Usage**: Team cards, prominent CTAs, elevated buttons

#### Extra Large Shadow (xl)
```css
box-shadow: 0px 25px 50px -12px rgba(0,0,0,0.25);
```
**Usage**: Testimonial cards, avatar images, hero elements

#### CTA Section Shadow (2xl)
```css
box-shadow: 0px 25px 50px 0px rgba(0,0,0,0.25);
```
**Usage**: Major CTA sections with dark backgrounds

### Hover States
- **Note**: Figma export is static, but implied hover states would include:
  - Slightly darker background colors
  - Increased shadow elevation
  - Color transitions

---

## 8. Section Layout Specifications

### Hero Section
- **Position**: absolute, positioned at top
- **Background**: Purple gradient
- **Height**: Variable (based on content)
- **Layout**: Centered content with image/illustration
- **Text Alignment**: Left or center based on subsection
- **Padding**: Variable by element

### Purpose Section
- **Position**: absolute
- **Background**: White (`#ffffff`)
- **Height**: 880px
- **Width**: 3423px (full canvas)
- **Top Position**: 725.5px from top
- **Layout Type**: Two-column layout
  - Left column: Text content (584px wide)
  - Right column: 3-card vertical stack (584px wide, 24px gaps)
- **Grid Structure**: 1-column grid for cards (212px, 216px, flexible rows)
- **Card Container Position**: 
  - Left text: 1095.5px from left
  - Right cards: 1743.5px from left

### Features Section
- **Position**: absolute
- **Background**: `#f9fafb` (light gray)
- **Height**: 610px
- **Width**: 1280px
- **Top Position**: 1701.5px from top
- **Left Position**: 1071.5px from left
- **Padding**: 24px horizontal
- **Layout Type**: Centered content with 2-column card grid
- **Section Gap**: 64px (between header and cards)
- **Header Layout**: Centered with badge, H2, and subtitle
- **Grid Structure**: 2×2 grid
  - Columns: 2 equal
  - Rows: 184px (first), flexible (second)
  - Gap: 32px × 32px

### Metrics Section
- **Position**: absolute
- **Background**: White
- **Height**: Variable
- **Layout Type**: Card grid (horizontal)
- **Card Structure**: Multiple metric cards side-by-side
- **Card Spacing**: 32px - 48px gaps
- **Section Header**: Left-aligned with badge and heading
- **Card Width**: ~290px each
- **Grid Structure**: Flexible horizontal layout

### Team Section
- **Position**: absolute
- **Background**: White or `#f9fafb`
- **Height**: Variable
- **Layout Type**: Single large card (centered or offset)
- **Card Width**: Full section width or constrained
- **Padding**: 24px section padding
- **Card Layout**: 
  - Avatar: Large circular with shadow
  - Text: Name, title, bio in hierarchy
  - Border Radius: 24px
  - Border: 1px solid `#f3f4f6`
  - Shadow: Large (lg)

### Testimonials Section
- **Position**: absolute
- **Background**: White
- **Height**: ~435px per card
- **Layout Type**: Horizontal scroll or grid
- **Card Spacing**: 32px gaps
- **Card Width**: Full width in container
- **Border Radius**: 24px
- **Shadow**: Extra large (xl)
- **Internal Layout**: Quote, stars, author details

### Pricing Section
- **Position**: absolute
- **Background**: White or light gray
- **Height**: ~800px (to accommodate tallest card with badge)
- **Layout Type**: Horizontal card grid (4 cards)
- **Card Spacing**: 32px between cards
- **Card Width**: ~290px - 305px
- **Card Height**: 700px - 735px
- **Highlighted Card**: 
  - 2px gold border
  - Negative top margin (-17.5px) to elevate
  - "Popular" badge centered above
- **Grid Structure**: Flex or 4-column grid

### CTA Section
- **Position**: absolute
- **Background**: Purple gradient or solid purple
- **Height**: Variable (based on content)
- **Layout Type**: Centered content box
- **Border**: May have white or transparent border (20% opacity)
- **Border Radius**: 16px
- **Shadow**: 2xl shadow
- **Text Alignment**: Centered
- **Button Placement**: Centered below text
- **Padding**: Generous (48px - 64px)

### Footer Section
- **Position**: absolute (at bottom)
- **Background**: `#2d1b4e` (dark purple)
- **Height**: Variable
- **Layout Type**: Multi-column layout
- **Text Color**: White / light gray
- **Link Color**: White with opacity
- **Padding**: 48px - 64px vertical, 24px horizontal
- **Columns**: 4-5 columns for links/information
- **Bottom Bar**: Copyright/social links

---

## Additional Layout Notes

### Positioning System
The Figma export uses **absolute positioning** extensively with specific pixel values:
- Elements positioned with `left`, `top`, `width`, `height` values
- This creates a fixed-canvas layout at 3423px wide
- For responsive implementation, these would need to be converted to:
  - Flexbox layouts
  - CSS Grid
  - Relative/percentage-based positioning
  - Container queries or media queries

### Responsive Considerations
While the Figma design is fixed-width, a production implementation should:
- Use max-width containers (1280px, 1440px, etc.)
- Convert absolute positioning to flex/grid
- Adjust card grids to stack on mobile (2-col → 1-col)
- Scale typography appropriately
- Maintain spacing ratios with relative units

### Z-Index Layering
Sections are layered in this order (from back to front):
1. Purpose
2. Features
3. Metrics
4. Team
5. Testimonials
6. Pricing
7. Footer
8. Hero
9. CTA

---

## Summary

This design system emphasizes:
- **Professional sophistication** through careful typography hierarchy
- **Orthodox tradition** via purple/gold color scheme
- **Modern UI patterns** with consistent spacing and shadows
- **Clear visual hierarchy** using font families, weights, and sizes
- **Accessibility** through sufficient contrast and readable sizes
- **Component reusability** with well-defined patterns

All measurements are exact values extracted from the Figma export code, ensuring pixel-perfect reconstruction is possible.
