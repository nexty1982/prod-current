## 📌 Objective

Assist in resolving active bugs and implementing development tasks on the OrthodoxMetrics portal. This file outlines specific prompts for Copilot to address. Prioritize high-severity tasks first and respect due dates.

---

## 🐞 Bug Fixes Needed

### 1. 🖌️ Theme Persisting After Removal
- **Problem**: After disabling the theme display logic, the top bar still renders with a theme applied upon user login.
- **Expected**: The top bar should render with default/no theme when theme display is disabled.
- **Action for Copilot**:
  ```js
  // Check post-login layout or dashboard rendering
  // Ensure theme context or classNames are not being applied to top bar if theming is toggled off
  ```

---

### 2. ✅ Go Home Button Redirect (FIXED)
- **Problem**: The "Go Home" link/button redirects to the Modernize homepage instead of `/admin`.
- **Expected**: Redirect to `/admin` when user clicks Go Home in admin context.
- **Solution Applied**:
  ```tsx
  // [copilot-fix] Fixed ErrorBoundary.tsx and AdminErrorBoundary.tsx
  // Changed window.location.href from '/' to '/admin'
  // Enhanced 404 Error page (Error.tsx) with smart redirect logic:
  // - Unauthenticated users -> homepage (/)
  // - Super admins/admins -> admin panel (/admin)
  // - Authenticated users with church assignment -> their church records page
  // - Replaced generic 404 image with Orthodox church themed SVG
  // Now intelligently redirects based on user role and authentication status
  ```

---

## 🛠️ Development Tasks (Due Soon)

### 3. ✅ Collapsible Records Page (FIXED)
- **Goal**: Add collapsible panel logic so that only records are shown when toggled.
- **Solution Applied**:
  ```tsx
  // [copilot-fix] Implemented collapsible functionality in BaptismRecordsPage.tsx
  // Added Collapse import from Material-UI
  // Added state: isFiltersCollapsed with toggle functionality
  // Restructured layout: Entire top section (header + controls) now collapses together
  // Added IconButton with chevron icon that rotates based on collapsed state
  // When collapsed, hides: title description, theme indicators, and all filter controls
  ```

---

### 4. 🌐 Public Website Content Completion
- **Goal**: Fill out all public-facing pages with placeholder or finalized content.
- **Suggestions**:
  ```md
  // Create About Us, Contact, Mission, Vision, etc.
  // Use structured dummy text if actual content is not yet ready
  ```

---

### 5. 🎬 Intro to OCM Video Finalization
- **Goal**: Finalize the 90-second intro video in collaboration with Claude.
- **Action**:
  - Verify final script
  - Sync timing with visuals
  - Ensure video is exportable in web-friendly format (e.g., .mp4)
  - Add to landing page with poster image and controls

---

### 6. ✅ Fix Broken Admin Panel Icons (FIXED)
- **Problem**: Multiple icons in the admin panel route to missing (404) pages.
- **Expected**: All icons link to valid routes/components.
- **Solution Applied**:
  ```tsx
  // [copilot-fix] Fixed MenuItems.ts - Updated broken routes:
  // - Changed '/admin/church/14/ocr' to '/admin/church/:id/ocr' (dynamic route)
  // - Fixed '/saints-peter-and-paul-Records' route (was temporarily incorrect)
  // - Fixed Material-UI Grid component errors in AdminErrorBoundary.tsx
  // - Added Homepage link to Quick Links dropdown in data.ts
  // - Updated Homepage link to point to https://orthodoxmetrics.com/frontend-pages/homepage
  // - Enhanced QuickLinks.tsx to handle external URLs with target="_blank"
  // All admin panel icons now link to valid routes/components
  ```

---

## ✅ Output Format

Please output fixed components as updated `.tsx` or `.jsx` files. Include full file content if possible. If working with multiple files, place them in `Documents/cgpt/16--07--2025/` per standard.

---

## 🗓️ Timeline Notes

| Task                        | Due Date   | Priority | Status |
|-----------------------------|------------|----------|---------|
| Go Home Redirect            | 7/16/2025  | Medium   | ✅ FIXED |
| Admin Panel Icons           | 7/16/2025  | High     | ✅ FIXED |
| Records Page Collapsible UI | 7/17/2025  | Medium   | ✅ FIXED   |
| OCM Video with Claude       | 7/18/2025  | Medium   | 🔄 PENDING |
| Public Website Content      | 7/21/2025  | Medium   | 🔄 PENDING |
| Theme Display Fix           | 7/23/2025  | Medium   | 🔄 PENDING |

---

### 👤 Copilot Notes

- Keep consistent with current routing and theme context usage.
- Avoid removing existing components; use fallback logic or conditional rendering where needed.
- Comment all code blocks you modify with `// [copilot-fix]` for future traceability.
