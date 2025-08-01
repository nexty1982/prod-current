# OrthodoxMetrics Base Rules (v1.1)

These rules apply to all AI agents, developers, and contributors working within the OrthodoxMetrics system.

---

## ⚠️ Core Development Rules

1. **DO NOT use `Unstable_Grid2`**  
   Due to known layout and style conflicts, `Unstable_Grid2` is strictly prohibited across all components.

2. **All backend communication uses port `3001`**

3. **The server is a Linux system mounted on Windows**  
   Paths and symlinks may behave inconsistently. All tooling and automation must account for this.

4. **When using `npm install` in `prod/front-end`:**  
   Always include the flag:  
   ```bash
   --legacy-peer-deps
To rebuild the front-end manually:
Must use increased memory limits:

NODE_OPTIONS="--max-old-space-size=4096" npm run build
All PM2-controlled services are named:

orthodox-backend

omai-background

✅ Task & Component Registration Rules
All new components must:

Be added to the correct route file (e.g., router.tsx)

Be registered in the appropriate menu (VerticalMenu or HorizontalMenu)

Include role-based visibility if applicable

Pages created must not be orphaned
Any tsx page component must be accessible via:

A known route (/page, /admin/tool, etc.)

A menu or dashboard entry

OR registered in an audit/scan tool like OMSiteSurvey



**SERVER PORT**: the server you are working on uses port 3001 for all and any backend communication.


