todo 7-22

Cursor Prompt: Orthodox Headlines UI + API Integration
bash
Copy
Edit
# OrthodoxMetrics: Orthodox Headlines Feature Implementation (Phase 1)

## 🎯 Objective:
Implement a secure, user-only Orthodox News Aggregator at:
`https://orthodoxmetrics.com/orthodox-headlines`

This page will present curated Orthodox news from global sources, displayed in a visually striking and interactive format, categorized by jurisdiction or region.

---

## ✅ Assumptions

- Table `orthodox_headlines` already exists in `orthodoxmetrics_db`
- User authentication and session middleware already in place
- This page is restricted to logged-in users only

---

## 🔧 Step 1: API Route

### File: `server/routes/headlines.js`

Create a new Express route:

```js
GET /api/headlines
Supports optional query params:

?source=GOARCH

?lang=en

?limit=20

Returns JSON:

json
Copy
Edit
[
  {
    "id": 1,
    "source_name": "GOARCH",
    "title": "Feast of St. George Celebrated",
    "summary": "The faithful gathered to celebrate...",
    "image_url": "https://...",
    "article_url": "https://...",
    "language": "en",
    "pub_date": "2025-07-21T14:30:00Z"
  }
]
Ensure response is sorted by pub_date DESC.

🎨 Step 2: React Page
File: front-end/src/pages/OrthodoxHeadlines.tsx
Build a new authenticated route /orthodox-headlines:

💡 Design Goals:
Visually elegant (Orthodox-themed)

Responsive and mobile-ready

Toggle/filter by:

Source (e.g., dropdown or tabs)

Language (optional)

Auto-refresh content every X minutes

Animations on scroll or load (optional)

🧩 Components
FilterBar: dropdowns for source + language

NewsCard: title, summary, image (if available), pub_date, “Read More” button

Animated Empty State: “No headlines available yet.”

SourceBadge: shows source (e.g. GOARCH, OCA, etc.)

Optional: "New!" badge if pub_date < 24h ago

Use:

Tailwind CSS or MUI for layout

axios or existing fetch abstraction for API call

dayjs for date formatting (e.g., “2 hours ago”)

🛡️ Step 3: Protect Route
Ensure this page is not accessible without login:

Use same middleware / frontend route protection logic as /dashboard

🔁 Optional Enhancements
Allow users to bookmark favorite sources

Add a “Last updated at X” timestamp

Highlight articles from their own jurisdiction

Add top-level nav link under: Explore > Orthodox Headlines

🏁 Expected Result:
A beautiful, interactive news feed at /orthodox-headlines, tightly scoped to authenticated users, that centralizes Orthodox news from across jurisdictions with easy filtering, clear attribution, and dynamic frontend display.