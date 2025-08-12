# Task 156 – OrthodoxMetrics Liturgical Calendar Redesign

## Objective
Redesign the current OrthodoxMetrics liturgical calendar into a modern and intuitive **month-grid calendar layout**, improving both visual appeal and usability.

## Technologies
- React + TailwindCSS
- Optional: `@fullcalendar/react` or `react-big-calendar`
- Backend-provided liturgical data in JSON format

---

## Phase Breakdown

### Phase 1 – Month Grid Layout
- [ ] Implement a 7-column x 5-row grid using Tailwind CSS
- [ ] Display Sun–Sat headers
- [ ] Populate each cell with:
  - Gregorian date
  - Feast/Saint information
  - Icons for event types (📖 Gospel, 🕊 Holy Spirit, ✝ Feast, 🎂 Saint)

### Phase 2 – Tooltip or Drawer for Detail View
- [ ] Hover/click reveals readings and details via modal or drawer
- [ ] Keyboard-accessible interaction

### Phase 3 – Responsive Design
- [ ] Collapse view to scrollable weeks on mobile
- [ ] Add sticky top bar for current liturgical week info

### Phase 4 – View Mode Toggles
- [ ] Add top-level toggle between:
  - `Month`
  - `Feast Cycle`
  - `Liturgical Season`
- [ ] Update grid coloring & info dynamically per mode

### Phase 5 – Export Features
- [ ] Export to PDF (monthly view)
- [ ] Export to `.ics` calendar format
- [ ] “Copy to Clipboard” liturgical info

---

## Color-Coding Guidelines (Liturgical Seasons)
- Red = Fasting or Martyr Feasts
- White = Paschal Season / Major Feasts
- Violet = Great Lent
- Green = Holy Spirit or Pentecost
- Blue = Theotokos Feasts
- Gray = Regular weekdays

---

## Integration Targets
- OrthodoxMetrics.com public-facing calendar
- Component-based structure for reuse inside admin dashboards and liturgical event viewers

## Dependencies from Existing Code
- Liturgical logic and feast metadata (already implemented backend)
- Reuse of modal, tooltip, drawer, tab, icon components from Modernize/Raydar

---

## Deliverables
- `/calendar-v2/` component folder with grid, cell, modal, and view toggle components
- Tailwind-based styling with utility-first classes
- `.tsx` component file with demo JSON data integration
- Markdown docs describing calendar schema

