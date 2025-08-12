# OMAI: Markdown Ingestion and AI-Grep System Plan

This plan defines the phases required to implement an intelligent `.md` file ingestion, indexing, and AI-powered search system for OrthodoxMetrics' OMAI.

---

## 📘 Phase 1: File Ingestion

### ✅ Goals:
- Accept Markdown files (`.md`) via drag-and-drop, upload, or file path.
- Store contents in a structured JSON or database format.
- Track metadata:
  - Filename
  - Upload timestamp
  - Tags (optional/manual)
  - Source agent (e.g., user, OMAI, Claude)

### 🔧 Tasks:
- [ ] Create backend API endpoint: `POST /api/omai/md-ingest`
- [ ] Store uploaded files to `/dev/bigbook/docs`
- [ ] Generate ingestion ID and log entry
- [ ] Display confirmation to user in UI

---

## 📂 Phase 2: Cataloging and Tagging

### ✅ Goals:
- Automatically extract and tag:
  - Titles
  - Headings (H1–H6)
  - Checklists
  - Code blocks
  - Tables
  - Agent references (e.g., "Ninja", "Claude", "Cursor")
- Maintain a searchable catalog of all `.md` entries

### 🔧 Tasks:
- [ ] Parse Markdown using unified/remark or similar parser
- [ ] Auto-generate tags and concepts from content
- [ ] Store parsed structure in `omai_docs_catalog`
- [ ] Enable manual tag editing via OMAI dashboard

---

## 🔍 Phase 3: AI-Grep Search Engine

### ✅ Goals:
- Enable natural language + keyword searches
- Match markdown content using:
  - Headings
  - Checklists
  - Definitions
  - Summaries
- Return excerpts with match highlighting

### 🔧 Tasks:
- [ ] Implement search engine using vector embeddings (e.g., OpenAI, Weaviate, or SQLite FTS5)
- [ ] Create `/api/omai/search?q=` endpoint
- [ ] Allow contextual drill-down in UI (open match in preview modal)

---

## 🧠 Phase 4: OMAI Integration

### ✅ Goals:
- Let OMAI answer questions using `.md` knowledge
- Allow agents to "grep" across doc catalog
- Enable citations from MD source in responses

### 🔧 Tasks:
- [ ] Enable `@omai grep "query"` in any input field
- [ ] Return results in markdown preview panel
- [ ] Log search interactions for learning

---

## 🎯 Future Enhancements

- [ ] Document linking/relationship mapping
- [ ] Knowledge graphs between markdowns
- [ ] Markdown similarity clustering
- [ ] OCR-to-Markdown pre-ingestion
- [ ] PDF and script ingestion using the same pipeline

---

**Owner:** Cursor  
**Target Integration:** OrthodoxMetrics OMAI  
**Filename:** `omai_md_grep_plan.md`
