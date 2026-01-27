You are Cursor working inside the OrthodoxMetrics monorepo.



Your job is to IMPLEMENT, STEP BY STEP, everything described in:

docs/orthodoxmetrics\_analytics\_spec.md

(the “OrthodoxMetrics Analytics Specification” that defines the parish-level and admin-level analytics suite).



==================================================

GLOBAL CONTEXT \& CONSTRAINTS

==================================================



• Stack assumptions (adjust to actual repo if different):

&nbsp; - Backend: Node/Express (or Nest), TypeScript, MariaDB/MySQL.

&nbsp; - Frontend: React + TS, MUI, AG-Grid, Chart library (Chart.js / Recharts).

&nbsp; - Databases: separate auth DB and app DB. DO NOT mix auth tables with analytics tables.

• Do not break existing APIs or UIs.

• Any NEW pages / routes MUST be wired into:

&nbsp; - Router.tsx

&nbsp; - MenuItems.ts (under the \*\*Devel Tools\*\* section)

&nbsp; (If these files live in different paths, locate them and apply the same rules.)

• Keep changes incremental and well-structured. Prefer new modules over massive refactors.



==================================================

OVERALL GOAL

==================================================



Implement the analytics engine and UI for:



Parish-level reports:

1\. Church Establishment \& Clergy Tenure

2\. Spousal Survival (Marriage + Funeral correlation)

3\. Parish Census: Growth \& Decline

4\. Baptism Gender Ratio

5\. Remarriage (Divorce vs Mortality)

6\. Sacrament Trend Report (Baptism, Marriage, Funeral activity)

7\. Orthodox vs Mixed-Faith Marriage Analysis



Admin-level (diocese/county/state/jurisdiction) reports:

A1–A9 as described in docs/orthodoxmetrics\_analytics\_spec.md (Diocese Health, Heatmaps, Jurisdiction Comparisons, etc.)



You must follow a phased plan and NOT try to do everything in one giant diff. At each phase:

1\. Discover current structure.

2\. Propose a short plan.

3\. Implement code/migrations.

4\. Run relevant checks (build/tests) where available.



==================================================

PHASE 0 – READ THE SPEC

==================================================



0.1 Open and read:

&nbsp;   docs/orthodoxmetrics\_analytics\_spec.md



0.2 Summarize (in the editor output) the key entities and metrics you’ll need:

&nbsp;   - Core entities: church/parish, clergy, baptism, marriage, funeral, membership, jurisdiction, diocese, county/state, etc.

&nbsp;   - Metric categories: tenure, survival gap, population estimate, gender ratios, remarriage, sacrament trends, mixed-faith distribution, admin-level aggregations.



Keep this summary near the top of a new dev-doc:

&nbsp;   docs/analytics/IMPLEMENTATION\_NOTES.md



==================================================

PHASE 1 – DATA MODEL \& MIGRATIONS

==================================================



Goal: ensure DB schema supports all analytics \*\*without\*\* breaking existing tables.



1.1 Discover existing schema:

&nbsp;   - Locate DB migration folder(s), e.g. backend/db/migrations, prisma schema, or TypeORM entities.

&nbsp;   - Identify existing tables related to:

&nbsp;     • churches / parishes

&nbsp;     • clergy

&nbsp;     • baptisms

&nbsp;     • marriages

&nbsp;     • funerals

&nbsp;     • membership / transfers

&nbsp;     • jurisdiction/diocese metadata



1.2 In docs/analytics/IMPLEMENTATION\_NOTES.md:

&nbsp;   - List which of the spec’s required fields already exist.

&nbsp;   - List which ones are missing and must be added (e.g. bishop\_blessing\_required, spouse IDs, religion fields, census-year snapshots, etc.).



1.3 Design schema changes (additive, not destructive):

&nbsp;   - Create new tables or columns as needed, for example (names are suggestions, adjust to repo conventions):

&nbsp;     • clergy\_assignments (if not already present):

&nbsp;         - id, clergy\_id, parish\_id, start\_date, end\_date (nullable)

&nbsp;     • sacrament\_baptisms (if separate from generic records):

&nbsp;         - id, parish\_id, person\_id, gender, baptism\_date, etc.

&nbsp;     • sacrament\_marriages:

&nbsp;         - id, parish\_id, groom\_id, bride\_id, marriage\_date,

&nbsp;           groom\_religion, bride\_religion,

&nbsp;           groom\_church\_affiliation, bride\_church\_affiliation,

&nbsp;           bishop\_blessing\_required (bool)

&nbsp;     • sacrament\_funerals:

&nbsp;         - id, parish\_id, person\_id, death\_date, burial\_date, age\_at\_death, etc.

&nbsp;     • membership\_changes (optional for population/migration modelling):

&nbsp;         - id, parish\_id, person\_id, change\_date, type (IN/OUT/TRANSFER\_IN/TRANSFER\_OUT)

&nbsp;     • parish\_census\_yearly:

&nbsp;         - id, parish\_id, year, reported\_population



&nbsp;   - You can add analytics helper tables/views later (e.g. materialized views for aggregation).



1.4 Implement DB migrations:

&nbsp;   - Create new migration files with descriptive names (e.g. 2025xxxx\_add\_analytics\_tables.sql or TS migration files).

&nbsp;   - Make sure migrations are idempotent and safe to run in dev/stage.

&nbsp;   - Add reasonable indexes:

&nbsp;     • On (parish\_id, year), (parish\_id, date), (person\_id), (groom\_id, bride\_id).

&nbsp;   - If the project uses an ORM, update entity models accordingly.



1.5 Run existing migration commands (e.g. npm scripts) and make sure the DB schema builds cleanly.



==================================================

PHASE 2 – ANALYTICS SERVICE LAYER (BACKEND)

==================================================



Goal: centralize computations for all analytics in a backend “analytics service” rather than scattering raw SQL everywhere.



2.1 Create a backend module, e.g.:

&nbsp;   backend/src/analytics/

&nbsp;     - parishAnalyticsService.ts

&nbsp;     - adminAnalyticsService.ts

&nbsp;     - types.ts (for DTOs)



2.2 For each parish-level report, implement service functions (signatures can be similar to):



&nbsp;   - getParishClergyTenure(parishId, options?)

&nbsp;   - getParishSpousalSurvivalStats(parishId, options?)

&nbsp;   - getParishCensusTrends(parishId, fromYear, toYear)

&nbsp;   - getParishBaptismGenderRatios(parishId, fromYear, toYear)

&nbsp;   - getParishRemarriageStats(parishId, fromYear, toYear)

&nbsp;   - getParishSacramentTrends(parishId, fromYear, toYear, granularity = "year" | "month")

&nbsp;   - getParishMarriageFaithBreakdown(parishId, fromYear, toYear)



&nbsp;   Each function should:

&nbsp;     - Accept a time range (yearFrom, yearTo or dateFrom/dateTo).

&nbsp;     - Return a typed DTO ready for the frontend (labels + data series).

&nbsp;     - Implement the equations from the spec using SQL/ORM queries:

&nbsp;       • TenureYears

&nbsp;       • SurvivalAfterSpouse

&nbsp;       • EstimatedPopulation \& GrowthRate

&nbsp;       • GenderRatio

&nbsp;       • RemarriageRate

&nbsp;       • Seasonal/rolling averages

&nbsp;       • Pct\_OO / Pct\_OC / Pct\_ON



2.3 For admin-level reports, add functions like:



&nbsp;   - getDioceseHealthSummary(dioceseId, fromYear, toYear)

&nbsp;   - getRegionHeatmap(params: { level: "county" | "state"; jurisdictionId?; yearRange })

&nbsp;   - getJurisdictionComparison(params)

&nbsp;   - getClergyCoverageMap(params)

&nbsp;   - getMigrationFlowSummary(params)

&nbsp;   - getInterfaithMarriageStatsAggregated(params)



2.4 Document each function briefly in comments + in docs/analytics/IMPLEMENTATION\_NOTES.md:

&nbsp;   - Inputs, outputs, and which section of the spec it satisfies.



==================================================

PHASE 3 – API ROUTES / CONTROLLERS

==================================================



Goal: expose the analytics as REST/GraphQL endpoints for the UI.



3.1 Find the existing API router (e.g. backend/src/routes or backend/src/controllers).



3.2 Create analytics routes:

&nbsp;   Example (REST-style, adjust naming to project patterns):



&nbsp;   - GET /api/analytics/parish/:parishId/tenure

&nbsp;   - GET /api/analytics/parish/:parishId/spousal-survival

&nbsp;   - GET /api/analytics/parish/:parishId/census

&nbsp;   - GET /api/analytics/parish/:parishId/baptism-gender

&nbsp;   - GET /api/analytics/parish/:parishId/remarriage

&nbsp;   - GET /api/analytics/parish/:parishId/sacrament-trends

&nbsp;   - GET /api/analytics/parish/:parishId/marriage-faith-breakdown



&nbsp;   - GET /api/analytics/diocese/:dioceseId/health

&nbsp;   - GET /api/analytics/admin/heatmap

&nbsp;   - GET /api/analytics/admin/jurisdiction-comparison

&nbsp;   - GET /api/analytics/admin/clergy-coverage

&nbsp;   - GET /api/analytics/admin/migration

&nbsp;   - GET /api/analytics/admin/interfaith-marriage



3.3 Add query parameters for:

&nbsp;   - fromYear, toYear, granularity (year/month), Lenten vs non-Lenten filters, etc.

&nbsp;   - Region filters: dioceseId, jurisdictionId, county/state codes.



3.4 Wire routes to analytics service functions and return clean JSON DTOs.



3.5 Add minimal error handling and validation (invalid parishId, missing params, etc.).



==================================================

PHASE 4 – TESTING (UNIT + INTEGRATION)

==================================================



Goal: basic coverage for critical analytics logic so we don’t regress later.



4.1 Locate the test framework in the repo (Jest, Vitest, etc.).



4.2 Add tests for:

&nbsp;   - Tenure calculations (open-ended end\_date, multiple assignments).

&nbsp;   - SurvivalAfterSpouse logic.

&nbsp;   - EstimatedPopulation and GrowthRate.

&nbsp;   - GenderRatio.

&nbsp;   - Remarriage classification (mortality vs divorce).

&nbsp;   - Marriage faith breakdown percentages.



4.3 Create a small set of seed-style fixtures or a test DB setup that covers realistic edge cases (multiple clergy, missing funeral records, etc.).



==================================================

PHASE 5 – FRONTEND: PARISH ANALYTICS DASHBOARD

==================================================



Goal: build a parish-level analytics page that uses the API and renders interactive graphs similar to the HTML demo we created earlier.



5.1 Locate the front-end app root (e.g. front-end/src).



5.2 Create a feature folder, something like:

&nbsp;   front-end/src/features/analytics/parish/

&nbsp;     - ParishAnalyticsPage.tsx

&nbsp;     - hooks/useParishAnalytics.ts

&nbsp;     - components/ParishPopulationChart.tsx

&nbsp;     - components/BaptismGenderChart.tsx

&nbsp;     - components/MarriageTypeChart.tsx

&nbsp;     - components/SacramentTrendChart.tsx

&nbsp;     - components/LentenVsNonLentenChart.tsx



5.3 Implement a data hook (using SWR/React Query or existing pattern) to fetch from:

&nbsp;   /api/analytics/parish/:parishId/...



5.4 Port the existing HTML demo logic into React components:

&nbsp;   - Use the same kinds of charts (Chart.js, Recharts, or the project’s standard chart library).

&nbsp;   - Add controls:

&nbsp;     • Parish selector (if multi-parish context)

&nbsp;     • Time range: last 5/10/20 years, YTD, custom

&nbsp;     • Toggle Lenten vs non-Lenten



5.5 Ensure the layout fits OrthodoxMetrics style (MUI/Modernize theme):

&nbsp;   - Card layout, responsive grid, consistent typography.



5.6 Add navigation:

&nbsp;   - Update Router.tsx to include the new route, e.g.:

&nbsp;     /analytics/parish or /parish/:parishId/analytics

&nbsp;   - Update MenuItems.ts to add a menu entry under \*\*Devel Tools\*\* for this page.



==================================================

PHASE 6 – FRONTEND: ADMIN ANALYTICS DASHBOARD

==================================================



Goal: build an admin view for diocesan/jurisdiction-level analytics.



6.1 Create:

&nbsp;   front-end/src/features/analytics/admin/

&nbsp;     - AdminAnalyticsPage.tsx

&nbsp;     - components/DioceseHealthSummaryCard.tsx

&nbsp;     - components/ParishGrowthTable.tsx (AG-Grid)

&nbsp;     - components/RegionHeatmap.tsx

&nbsp;     - components/InterfaithMarriageSummary.tsx

&nbsp;     - components/ClergyCoverageMap.tsx (if map library exists / placeholder otherwise)



6.2 Fetch from the admin analytics endpoints (A1–A9).



6.3 For now, if mapping is heavy, you can stub a simple choropleth-like placeholder with dummy shapes and focus on data tables + charts.



6.4 Add route + menu:

&nbsp;   - Router.tsx: new route for /analytics/admin

&nbsp;   - MenuItems.ts: add under \*\*Devel Tools\*\*.



==================================================

PHASE 7 – EXPORTS \& DOC LINKS

==================================================



Goal: make it easy to export and explain these analytics.



7.1 If there is a backend “reports/exports” module, add:

&nbsp;   - Endpoints to export selected analytics as CSV/Excel and PDF (even if basic).

&nbsp;   - Example: /api/analytics/export/parish/:parishId?type=csv\&report=tenure



7.2 In the UI, add buttons on the analytics pages for:

&nbsp;   - “Export CSV”

&nbsp;   - “Export PDF” (even if currently a stub or uses a simple server-generated PDF).



7.3 In the front-end, add a help/info link that opens:

&nbsp;   docs/orthodoxmetrics\_analytics\_spec.md (or a rendered version) so admins can read what each chart means.



==================================================

WORKFLOW EXPECTATIONS

==================================================



• For EACH phase:

&nbsp; 1) Show a short plan (2–6 bullet points).

&nbsp; 2) Identify relevant files with quick searches (ripgrep, file tree).

&nbsp; 3) Implement changes in small, clear edits.

&nbsp; 4) Run existing build/test commands (e.g. npm test, npm run build, etc.), and fix issues caused by your changes.

&nbsp; 5) Update docs/analytics/IMPLEMENTATION\_NOTES.md to reflect what is DONE and what is TODO.



Start now with PHASE 0 and PHASE 1. Once the schema and analytics service scaffolding are in place, proceed through the remaining phases in order.

You are Cursor working inside the OrthodoxMetrics monorepo.



Your job is to IMPLEMENT, STEP BY STEP, everything described in:

docs/orthodoxmetrics\_analytics\_spec.md

(the “OrthodoxMetrics Analytics Specification” that defines the parish-level and admin-level analytics suite).



==================================================

GLOBAL CONTEXT \& CONSTRAINTS

==================================================



• Stack assumptions (adjust to actual repo if different):

&nbsp; - Backend: Node/Express (or Nest), TypeScript, MariaDB/MySQL.

&nbsp; - Frontend: React + TS, MUI, AG-Grid, Chart library (Chart.js / Recharts).

&nbsp; - Databases: separate auth DB and app DB. DO NOT mix auth tables with analytics tables.

• Do not break existing APIs or UIs.

• Any NEW pages / routes MUST be wired into:

&nbsp; - Router.tsx

&nbsp; - MenuItems.ts (under the \*\*Devel Tools\*\* section)

&nbsp; (If these files live in different paths, locate them and apply the same rules.)

• Keep changes incremental and well-structured. Prefer new modules over massive refactors.



==================================================

OVERALL GOAL

==================================================



Implement the analytics engine and UI for:



Parish-level reports:

1\. Church Establishment \& Clergy Tenure

2\. Spousal Survival (Marriage + Funeral correlation)

3\. Parish Census: Growth \& Decline

4\. Baptism Gender Ratio

5\. Remarriage (Divorce vs Mortality)

6\. Sacrament Trend Report (Baptism, Marriage, Funeral activity)

7\. Orthodox vs Mixed-Faith Marriage Analysis



Admin-level (diocese/county/state/jurisdiction) reports:

A1–A9 as described in docs/orthodoxmetrics\_analytics\_spec.md (Diocese Health, Heatmaps, Jurisdiction Comparisons, etc.)



You must follow a phased plan and NOT try to do everything in one giant diff. At each phase:

1\. Discover current structure.

2\. Propose a short plan.

3\. Implement code/migrations.

4\. Run relevant checks (build/tests) where available.



==================================================

PHASE 0 – READ THE SPEC

==================================================



0.1 Open and read:

&nbsp;   docs/orthodoxmetrics\_analytics\_spec.md



0.2 Summarize (in the editor output) the key entities and metrics you’ll need:

&nbsp;   - Core entities: church/parish, clergy, baptism, marriage, funeral, membership, jurisdiction, diocese, county/state, etc.

&nbsp;   - Metric categories: tenure, survival gap, population estimate, gender ratios, remarriage, sacrament trends, mixed-faith distribution, admin-level aggregations.



Keep this summary near the top of a new dev-doc:

&nbsp;   docs/analytics/IMPLEMENTATION\_NOTES.md



==================================================

PHASE 1 – DATA MODEL \& MIGRATIONS

==================================================



Goal: ensure DB schema supports all analytics \*\*without\*\* breaking existing tables.



1.1 Discover existing schema:

&nbsp;   - Locate DB migration folder(s), e.g. backend/db/migrations, prisma schema, or TypeORM entities.

&nbsp;   - Identify existing tables related to:

&nbsp;     • churches / parishes

&nbsp;     • clergy

&nbsp;     • baptisms

&nbsp;     • marriages

&nbsp;     • funerals

&nbsp;     • membership / transfers

&nbsp;     • jurisdiction/diocese metadata



1.2 In docs/analytics/IMPLEMENTATION\_NOTES.md:

&nbsp;   - List which of the spec’s required fields already exist.

&nbsp;   - List which ones are missing and must be added (e.g. bishop\_blessing\_required, spouse IDs, religion fields, census-year snapshots, etc.).



1.3 Design schema changes (additive, not destructive):

&nbsp;   - Create new tables or columns as needed, for example (names are suggestions, adjust to repo conventions):

&nbsp;     • clergy\_assignments (if not already present):

&nbsp;         - id, clergy\_id, parish\_id, start\_date, end\_date (nullable)

&nbsp;     • sacrament\_baptisms (if separate from generic records):

&nbsp;         - id, parish\_id, person\_id, gender, baptism\_date, etc.

&nbsp;     • sacrament\_marriages:

&nbsp;         - id, parish\_id, groom\_id, bride\_id, marriage\_date,

&nbsp;           groom\_religion, bride\_religion,

&nbsp;           groom\_church\_affiliation, bride\_church\_affiliation,

&nbsp;           bishop\_blessing\_required (bool)

&nbsp;     • sacrament\_funerals:

&nbsp;         - id, parish\_id, person\_id, death\_date, burial\_date, age\_at\_death, etc.

&nbsp;     • membership\_changes (optional for population/migration modelling):

&nbsp;         - id, parish\_id, person\_id, change\_date, type (IN/OUT/TRANSFER\_IN/TRANSFER\_OUT)

&nbsp;     • parish\_census\_yearly:

&nbsp;         - id, parish\_id, year, reported\_population



&nbsp;   - You can add analytics helper tables/views later (e.g. materialized views for aggregation).



1.4 Implement DB migrations:

&nbsp;   - Create new migration files with descriptive names (e.g. 2025xxxx\_add\_analytics\_tables.sql or TS migration files).

&nbsp;   - Make sure migrations are idempotent and safe to run in dev/stage.

&nbsp;   - Add reasonable indexes:

&nbsp;     • On (parish\_id, year), (parish\_id, date), (person\_id), (groom\_id, bride\_id).

&nbsp;   - If the project uses an ORM, update entity models accordingly.



1.5 Run existing migration commands (e.g. npm scripts) and make sure the DB schema builds cleanly.



==================================================

PHASE 2 – ANALYTICS SERVICE LAYER (BACKEND)

==================================================



Goal: centralize computations for all analytics in a backend “analytics service” rather than scattering raw SQL everywhere.



2.1 Create a backend module, e.g.:

&nbsp;   backend/src/analytics/

&nbsp;     - parishAnalyticsService.ts

&nbsp;     - adminAnalyticsService.ts

&nbsp;     - types.ts (for DTOs)



2.2 For each parish-level report, implement service functions (signatures can be similar to):



&nbsp;   - getParishClergyTenure(parishId, options?)

&nbsp;   - getParishSpousalSurvivalStats(parishId, options?)

&nbsp;   - getParishCensusTrends(parishId, fromYear, toYear)

&nbsp;   - getParishBaptismGenderRatios(parishId, fromYear, toYear)

&nbsp;   - getParishRemarriageStats(parishId, fromYear, toYear)

&nbsp;   - getParishSacramentTrends(parishId, fromYear, toYear, granularity = "year" | "month")

&nbsp;   - getParishMarriageFaithBreakdown(parishId, fromYear, toYear)



&nbsp;   Each function should:

&nbsp;     - Accept a time range (yearFrom, yearTo or dateFrom/dateTo).

&nbsp;     - Return a typed DTO ready for the frontend (labels + data series).

&nbsp;     - Implement the equations from the spec using SQL/ORM queries:

&nbsp;       • TenureYears

&nbsp;       • SurvivalAfterSpouse

&nbsp;       • EstimatedPopulation \& GrowthRate

&nbsp;       • GenderRatio

&nbsp;       • RemarriageRate

&nbsp;       • Seasonal/rolling averages

&nbsp;       • Pct\_OO / Pct\_OC / Pct\_ON



2.3 For admin-level reports, add functions like:



&nbsp;   - getDioceseHealthSummary(dioceseId, fromYear, toYear)

&nbsp;   - getRegionHeatmap(params: { level: "county" | "state"; jurisdictionId?; yearRange })

&nbsp;   - getJurisdictionComparison(params)

&nbsp;   - getClergyCoverageMap(params)

&nbsp;   - getMigrationFlowSummary(params)

&nbsp;   - getInterfaithMarriageStatsAggregated(params)



2.4 Document each function briefly in comments + in docs/analytics/IMPLEMENTATION\_NOTES.md:

&nbsp;   - Inputs, outputs, and which section of the spec it satisfies.



==================================================

PHASE 3 – API ROUTES / CONTROLLERS

==================================================



Goal: expose the analytics as REST/GraphQL endpoints for the UI.



3.1 Find the existing API router (e.g. backend/src/routes or backend/src/controllers).



3.2 Create analytics routes:

&nbsp;   Example (REST-style, adjust naming to project patterns):



&nbsp;   - GET /api/analytics/parish/:parishId/tenure

&nbsp;   - GET /api/analytics/parish/:parishId/spousal-survival

&nbsp;   - GET /api/analytics/parish/:parishId/census

&nbsp;   - GET /api/analytics/parish/:parishId/baptism-gender

&nbsp;   - GET /api/analytics/parish/:parishId/remarriage

&nbsp;   - GET /api/analytics/parish/:parishId/sacrament-trends

&nbsp;   - GET /api/analytics/parish/:parishId/marriage-faith-breakdown



&nbsp;   - GET /api/analytics/diocese/:dioceseId/health

&nbsp;   - GET /api/analytics/admin/heatmap

&nbsp;   - GET /api/analytics/admin/jurisdiction-comparison

&nbsp;   - GET /api/analytics/admin/clergy-coverage

&nbsp;   - GET /api/analytics/admin/migration

&nbsp;   - GET /api/analytics/admin/interfaith-marriage



3.3 Add query parameters for:

&nbsp;   - fromYear, toYear, granularity (year/month), Lenten vs non-Lenten filters, etc.

&nbsp;   - Region filters: dioceseId, jurisdictionId, county/state codes.



3.4 Wire routes to analytics service functions and return clean JSON DTOs.



3.5 Add minimal error handling and validation (invalid parishId, missing params, etc.).



==================================================

PHASE 4 – TESTING (UNIT + INTEGRATION)

==================================================



Goal: basic coverage for critical analytics logic so we don’t regress later.



4.1 Locate the test framework in the repo (Jest, Vitest, etc.).



4.2 Add tests for:

&nbsp;   - Tenure calculations (open-ended end\_date, multiple assignments).

&nbsp;   - SurvivalAfterSpouse logic.

&nbsp;   - EstimatedPopulation and GrowthRate.

&nbsp;   - GenderRatio.

&nbsp;   - Remarriage classification (mortality vs divorce).

&nbsp;   - Marriage faith breakdown percentages.



4.3 Create a small set of seed-style fixtures or a test DB setup that covers realistic edge cases (multiple clergy, missing funeral records, etc.).



==================================================

PHASE 5 – FRONTEND: PARISH ANALYTICS DASHBOARD

==================================================



Goal: build a parish-level analytics page that uses the API and renders interactive graphs similar to the HTML demo we created earlier.



5.1 Locate the front-end app root (e.g. front-end/src).



5.2 Create a feature folder, something like:

&nbsp;   front-end/src/features/analytics/parish/

&nbsp;     - ParishAnalyticsPage.tsx

&nbsp;     - hooks/useParishAnalytics.ts

&nbsp;     - components/ParishPopulationChart.tsx

&nbsp;     - components/BaptismGenderChart.tsx

&nbsp;     - components/MarriageTypeChart.tsx

&nbsp;     - components/SacramentTrendChart.tsx

&nbsp;     - components/LentenVsNonLentenChart.tsx



5.3 Implement a data hook (using SWR/React Query or existing pattern) to fetch from:

&nbsp;   /api/analytics/parish/:parishId/...



5.4 Port the existing HTML demo logic into React components:

&nbsp;   - Use the same kinds of charts (Chart.js, Recharts, or the project’s standard chart library).

&nbsp;   - Add controls:

&nbsp;     • Parish selector (if multi-parish context)

&nbsp;     • Time range: last 5/10/20 years, YTD, custom

&nbsp;     • Toggle Lenten vs non-Lenten



5.5 Ensure the layout fits OrthodoxMetrics style (MUI/Modernize theme):

&nbsp;   - Card layout, responsive grid, consistent typography.



5.6 Add navigation:

&nbsp;   - Update Router.tsx to include the new route, e.g.:

&nbsp;     /analytics/parish or /parish/:parishId/analytics

&nbsp;   - Update MenuItems.ts to add a menu entry under \*\*Devel Tools\*\* for this page.



==================================================

PHASE 6 – FRONTEND: ADMIN ANALYTICS DASHBOARD

==================================================



Goal: build an admin view for diocesan/jurisdiction-level analytics.



6.1 Create:

&nbsp;   front-end/src/features/analytics/admin/

&nbsp;     - AdminAnalyticsPage.tsx

&nbsp;     - components/DioceseHealthSummaryCard.tsx

&nbsp;     - components/ParishGrowthTable.tsx (AG-Grid)

&nbsp;     - components/RegionHeatmap.tsx

&nbsp;     - components/InterfaithMarriageSummary.tsx

&nbsp;     - components/ClergyCoverageMap.tsx (if map library exists / placeholder otherwise)



6.2 Fetch from the admin analytics endpoints (A1–A9).



6.3 For now, if mapping is heavy, you can stub a simple choropleth-like placeholder with dummy shapes and focus on data tables + charts.



6.4 Add route + menu:

&nbsp;   - Router.tsx: new route for /analytics/admin

&nbsp;   - MenuItems.ts: add under \*\*Devel Tools\*\*.



==================================================

PHASE 7 – EXPORTS \& DOC LINKS

==================================================



Goal: make it easy to export and explain these analytics.



7.1 If there is a backend “reports/exports” module, add:

&nbsp;   - Endpoints to export selected analytics as CSV/Excel and PDF (even if basic).

&nbsp;   - Example: /api/analytics/export/parish/:parishId?type=csv\&report=tenure



7.2 In the UI, add buttons on the analytics pages for:

&nbsp;   - “Export CSV”

&nbsp;   - “Export PDF” (even if currently a stub or uses a simple server-generated PDF).



7.3 In the front-end, add a help/info link that opens:

&nbsp;   docs/orthodoxmetrics\_analytics\_spec.md (or a rendered version) so admins can read what each chart means.



==================================================

WORKFLOW EXPECTATIONS

==================================================



• For EACH phase:

&nbsp; 1) Show a short plan (2–6 bullet points).

&nbsp; 2) Identify relevant files with quick searches (ripgrep, file tree).

&nbsp; 3) Implement changes in small, clear edits.

&nbsp; 4) Run existing build/test commands (e.g. npm test, npm run build, etc.), and fix issues caused by your changes.

&nbsp; 5) Update docs/analytics/IMPLEMENTATION\_NOTES.md to reflect what is DONE and what is TODO.



Start now with PHASE 0 and PHASE 1. Once the schema and analytics service scaffolding are in place, proceed through the remaining phases in order.



