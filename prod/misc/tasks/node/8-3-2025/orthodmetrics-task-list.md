# OrthodoxMetrics.com Task List

### ✅ Phase Priorities
# OrthodMetrics.com Custom Task List

### 🔧 Targeted Fixes & Enhancements

1. **🧩 Identify Orphaned Components in Router**
   - Scan `RouterConfig.tsx` or relevant route files
   - List all components present in the router but *not shown* in the UI menu
   - Add these under a new **MISC** heading in the sidebar navigation

2. **🧹 Remove Unused Menu Sections**
   - Remove menu sections labeled:
     - ORTHODOX METRICS ADMIN
     - EXPLORE
     - SOCIAL EXPERIENCE

3. **🏠 Set Default Homepage**
   - Ensure default route on visiting https://orthodmetrics.com redirects to:
     `/frontend-pages/homepage`
   - Verify that logged-out users are shown the public version if applicable

4. **🛠️ Fix Build Console Error**
   - Diagnose and repair build issues preventing frontend rebuild
   - Likely related to Vite, Tailwind, or misconfigured imports
   - Confirm console functionality is restored post-fix

5. **📁 Migrate Horizontal Menu Items to Sidebar (Modernize Sections)**
   - Move any horizontally placed nav items into the sidebar menu
   - Place them under the **Modernize** header using existing groupings:
     - `Apps`
     - `Pages -> Widgets`
     - `Pages -> UI`
     - `Pages -> Charts`
     - `Pages -> Auth`
     - `Forms`
     - `Tables`
     - `Mui Charts`
     - `SimpleTreeView`

6. **📅 Repair Liturgical Calendar (BigCalendar-based)**
   - Ensure the Liturgical Calendar renders using the `BigCalendar` implementation
   - Base the updated version off `LiturgicalCalendar.tsx` from the Modernize stack
   - Validate feast/fast data display, navigation, and multi-language support



8. **📚 Big Book Markdown Viewer & Editor**
   - Support drag-and-drop install of `.tsx`, `.sh`, `.md` files
   - Auto-detect and categorize documentation

10. **🧠 OMAI Learning & Task Assignment Panel**
    - Build UI for OMAI task input, learning mode, and document ingestion
    - Display real-time learning progress and debugging insights
