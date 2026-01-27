You are working in `/var/www/orthodoxmetrics/prod`.

## **Phase 1 — Audit (Read-Only)**
1. Recursively scan the codebase (front-end, back-end, configs).
2. Identify and map:
   - **Front-end routes** (`src/routes`, `src/pages`, etc.).
   - **Back-end routes** (Express routers, controllers).
   - **UI → API → DB paths** and mismatches:
     - FE calls to APIs with no BE handler.
     - BE handlers unused by FE.
     - DB queries referencing missing or deprecated tables (esp. `orthodoxmetrics_auth_db`).
   - **Environment keys**:
     - Keys defined but unused.
     - Keys referenced but missing.
   - **Dead code** (components, services, assets, utils not imported anywhere).
   - **Dependency issues** (unused packages, missing packages).
   - **Config drift** between `.env`, `.env.prod`, `.env.production.local`.
   - **Build/compile errors**: run `pnpm tsc --noEmit` and `pnpm build`.
   - Large files (>50MB), duplicate files, broken symlinks.
3. Output:
   - **Ranked Problem List**:
     - Format: `[#] [Impact: High/Med/Low] [Effort: High/Med/Low] [Risk: High/Med/Low] — Summary`
     - Include exact file paths and short context.
     - Group related issues under categories (Routing, API/DB, Env, Dead Code, etc.).

Stop here and wait for me to confirm the list before Phase 2.