# Phase 1: OMAI Markdown Ingestion and AI-Grep Engine

## Task Overview
Enable OMAI to intelligently ingest, parse, catalog, and search `.md` files as its foundational learning and referencing mechanism.

---

## Phase 1 Breakdown

### ✅ Task 140: Markdown Ingestion Engine
**Goal:** Teach OMAI to detect and process `.md` files on upload.
- Accept `.md` via upload or directory scan
- Use frontmatter or headings to extract metadata (e.g., title, tags, roles, phase)
- Break content into structured blocks by heading depth
- Store parsed result as JSON with key-value sections

### ✅ Task 141: Cataloging & Indexing Layer
**Goal:** Persist and tag content in a query-optimized structure.
- Maintain a local database (or JSON file) with cataloged `.md` files
- Tag by:
  - `role`, `type`, `phase`, `tags`, `file-name`
  - derived summaries
  - `last_ingested`, `last_referenced`
- Auto-scan `Documents/cgpt/Markdown/` or other target folders

### ✅ Task 142: AI-Grep Query Engine
**Goal:** Enable AI-based search and match.
- Search support for:
  - Keywords
  - Fuzzy matching
  - Natural-language questions ("How do I restart PM2 on dev?")
- Return:
  - Matched section(s)
  - Summary of match
  - Other files that match related topics

### ✅ Task 143: AI-Guided Output
**Goal:** Enable OMAI to respond with relevant markdown excerpts and explain them.
- Use Markdown renderer to quote matching content
- Provide interpretation with role-based tailoring (e.g., dev, admin)
- Allow: "Summarize this file" / "Where is debug mode described?"

### ✅ Task 144: OM Web UI Integration (Frontend)
**Goal:** Hook the ingestion and search UI into the OrthodoxMetrics frontend.
- Add UI panel under `super_admin` view:
  - Upload `.md` file
  - Trigger `Learn This`
  - Run AI grep-style query box
- Display results like an AI terminal / log viewer

### ✅ Task 145: Learning Feedback Loop
**Goal:** Record which files are most referenced and adjust weights accordingly.
- Track queries and usage frequency
- Show `Most Queried`, `Least Accessed`, `Recently Updated`
- Allow manual flagging: `Needs Rewrite`, `Deprecated`, etc.

---

## Supporting Utilities (Phase 2+)
- Markdown → JSON parser module
- `learnMdFile(path)` utility function
- `searchMdCorpus(query, tags?, role?)`
- `getAiSummary(fileId)`

---

## Sample Use Cases
- **Nick types:** “How does certificate offset positioning work?” → OMAI returns exact section from `baptism_cert_offsets.md`
- **OMAI auto-learns:** `devserver_setup.md` → files stored and cross-linked to PM2 commands
- **Claude asks:** “What is the debug pipeline structure?” → OMAI provides canonical flow with references

---

## Final Notes
This is the gateway to every other OMAI capability. Markdown is our shared protocol. OMAI must not just read it—it must *understand*, *organize*, and *weaponize* it.

