Title: OM-tasks creation and revisions
Add “Create Task” button + add Task Visibility (admin/public)
Goal
On /devel-tools/om-tasks (OMAI Task Assignment page), add a new button next to “Generate Link” named “Create Task”. Also add a new required field to tasks called `visibility` with values:
- admin: only admins + superadmin can view
- public: anyone can view (and the public-facing listing/detail should live under front-end/src/features/pages/frontend-pages/)
UI requirements
1) On the OM Tasks page header toolbar, add a button:
   - Label: “Create Task”
   - Position: immediately to the right of “Generate Link”
   - Style: same sizing/variant as Generate Link (consistent with existing button group)
2) Clicking “Create Task” opens a modal/dialog:
   Required fields:
   - Title (text)
   - Category (dropdown: Ingestion & Digitization, Data Structuring & Accuracy, Workflow & User Experience, Platform & Infrastructure, Analytics & Intelligence)
   - Importance (dropdown from existing B12-15 list)
   - Details (multiline)
   - Tags (chips or comma-separated, require at least one)
   - Attachments (list of links to .md or other docs; optional)
   - Status (dropdown existing 1–6)
   - Date created auto-filled MM-DD-YYYY:HH-MM (locked)
   New required field:
   - Visibility: dropdown { admin, public } default admin
   Optional:
   - Assigned To, Assigned By, Notes, Remind me

3) When Status becomes “task completed”, store Date Completed and display it.

Backend requirements
4) Add column/field `visibility` to tasks storage (DB table or JSON store used by OM Tasks).
   - Enum/constraint: ('admin','public')
   - Default: 'admin'
   - Ensure API returns visibility.

5) Enforce visibility on API endpoints:
   - Admin app endpoints return all tasks to authorized admins/superadmin.
   - Public endpoints ONLY return visibility='public' tasks and must not leak admin tasks.

Routing / Pages
6) Add public-facing pages under:
   front-end/src/features/pages/frontend-pages/
   - PublicTasksListPage.tsx (lists public tasks)
   - PublicTaskDetailPage.tsx (task details by id/slug)
   These should call a public API endpoint (e.g. GET /api/public/tasks, GET /api/public/tasks/:id).

7) Add routes for these public pages in the public-facing router (whatever you currently use for frontend-pages).
   They should be accessible without auth.

Important integration rules
8) Add/update Router.tsx and MenuItems.ts:
   - Add the “OM Tasks” page under **Devel Tools** section (keep existing location if already there).
   - Do not expose admin task creation link in public menu.

Security/Permissions
9) Visibility='admin' tasks:
   - Only visible in authenticated admin UI (admins + superadmin)
   - Not returned by public endpoints
10) Visibility='public' tasks:
   - Visible in admin UI and also on public pages

Acceptance criteria
- “Create Task” button exists next to Generate Link.
- Creating a task persists it and appears in the admin list immediately.
- Public tasks appear on the public tasks list + detail pages.
- Admin tasks never appear on public pages and never come back from public APIs.

____________________________________________________________________________________

Title: OM-tasks rev1
Add a required `type` field to OM Tasks.

Purpose
The `type` field classifies WHAT the task/document actually is, independent of category and visibility. This is required for filtering, future docs views, and public frontend rendering.

Type values (enum, required):
- documentation
- configuration
- reference
- guide

Definitions (important – follow exactly):
- documentation: descriptive overview of a feature/system (what it is, how it works at a high level)
- configuration: setup, env vars, flags, settings, install/runtime configuration
- reference: authoritative, technical, exhaustive details (APIs, schemas, fields, rules, edge cases)
- guide: step-by-step, task-oriented instructions (how to do X)

UI changes
1) In the “Create Task” modal/dialog:
   - Add a required dropdown field: Type
   - Options exactly as listed above
   - No default selected ? user must choose
   - Validation error if missing

2) Display the Type badge in:
   - OM Tasks admin list (column or badge)
   - Task detail view
   - Public task pages (if visibility=public)

Backend / data model
3) Add `type` field to task storage:
   - Enum constraint: ('documentation','configuration','reference','guide')
   - Required, no NULL
   - API must reject create/update without it

4) Include `type` in all task API responses (admin + public).

Public frontend behavior
5) Public tasks pages (frontend-pages):
   - Allow filtering by `type`
   - Optionally group or badge tasks by type (visual distinction between guide vs reference matters)

Rules
6) Category ? Type:
   - Category = domain (Ingestion, Workflow, Platform, etc.)
   - Type = content nature (doc vs guide vs reference)
   - Never infer one from the other automatically

Acceptance criteria
- Cannot create a task without selecting Type.
- Type persists and displays correctly.
- Public tasks show type clearly.
- Admin-only tasks still hidden regardless of type.

____________________________________________________________________________________
Title: OM-tasks rev2
Fix Create Task modal to NEVER lose user input + add drag/drop .md into Details.

Problem
Currently if the user changes focus / clicks away / modal re-renders, the Create Task form resets and the user loses typed content. That is unacceptable.

Part A — Make Create Task form state persistent (no data loss)
1) Ensure the CreateTaskDialog uses controlled state that is NOT reset on re-render.
   - Do not initialize form state from props inside render.
   - Do not key the dialog with something that changes (avoid `key={open}` patterns).
   - Keep form state in a stable store:
     Option 1: local component state + `useRef` snapshot
     Option 2 (preferred): a small “draft form” store (Context or Zustand) keyed by `draftId = 'create-task'`

2) Persist draft to localStorage so accidental refresh/navigation doesn’t wipe it:
   - Key: `om_tasks:create_task_draft:v1`
   - Save on every change (debounced 250–500ms)
   - Restore on open
   - Clear ONLY on successful Create Task OR explicit “Cancel ? Discard” confirmation

3) Handle blur/focus explicitly:
   - No auto-clear on blur
   - If modal closes via ESC / backdrop click, prompt:
     “Discard draft?” with buttons: Keep Editing / Discard
   - Also disable backdrop click close by default to prevent accidental loss.

Acceptance:
- Type into Title + Details, click elsewhere, switch tabs, reopen modal -> data remains.
- Hard refresh -> data restores (unless task was created).

Part B — Details field UX: large, resizable, supports drop .md
4) Make Details a large editor area:
   - Set minHeight ~ 300–400px, allow vertical resize (resize: vertical).
   - Keep it performant for long text (no heavy re-renders).

5) Add drag-and-drop support for .md into Details:
   UX:
   - Dropzone only on Details area (or full dialog, but inserts into Details).
   - On dragover show overlay “Drop .md to import”.
   - Accept only `.md` and `text/markdown` (and optionally `.txt`).
   Behavior on drop:
   - Read file via FileReader as text.
   - Then EITHER:
     A) “Import into Details” (append or replace)  OR
     B) “Attach file + keep Details unchanged”
   Implement as a small choice dialog after drop:
     - Replace Details
     - Append to Details
     - Attach as file only
   Default action: Append (safer).

6) If user chooses “Attach”:
   - Add the file to Attachments list as a “local pending attachment”
   - Persist it in the draft store:
     - If backend supports file upload: upload on Create Task and store resulting URL in attachments
     - If backend only stores links: base64 is not acceptable long-term; instead:
       - store filename + content in task record as `detailsMarkdown` OR
       - add new backend endpoint to upload and return a URL
   Prefer: store markdown content directly into Details (Replace/Append) so it works even without an upload service.

7) Guardrails
- Max file size: 1–2 MB with clear error toast if larger.
- Preserve line breaks exactly.
- If Details already has text and user chooses Replace, confirm.

Deliverables
- CreateTaskDialog: persistent draft state + localStorage restore + discard confirmation
- Details: big resizable editor + drag/drop .md import + optional attach workflow
- Tests/manual checks: no losing input on focus changes, close/reopen, refresh

____________________________________________________________________________________




Title: OM-tasks rev3
Add: Email notification on OM Task creation
Goal
Every time a task is created, send an email to info@orthodoxmetrics.com containing the task details.

Requirements
1) Server-side only
- Implement in the backend task-create route (where the task is persisted).
- Do NOT rely on the frontend to send emails.

2) When to send
- Trigger only on successful create (after DB insert succeeds).
- If email fails, the task creation should still succeed, but log the error at high priority.

3) Email content (plain text + optional HTML)
Subject:
[OM-TASKS] New Task Created: <Title> (<Category> / <Type> / <Visibility>)

Body must include:
- Title
- Date created
- Category
- Type
- Visibility (admin/public)
- Importance
- Status
- Tags
- Details (truncate safely at e.g. 5,000 chars; include “(truncated)” if needed)
- Attachments list (URLs)
- Assigned To / Assigned By (if present)
- Created By (user id/email if available)
- Task ID and link to admin page (deep link to /devel-tools/om-tasks?taskId=XYZ or similar)

4) Implementation approach
- Use existing mailer infra if present; otherwise add a minimal SMTP mailer:
  - env vars:
    SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
  - From: SMTP_FROM (e.g. no-reply@orthodoxmetrics.com)
  - To: info@orthodoxmetrics.com
- Use nodemailer (preferred) with secure defaults.
- Add rate limiting/guard: prevent duplicate sends on retries by using the created taskId as an idempotency key in logs (at minimum).

5) Logging
- Log success/failure with taskId
- On failure log stack + smtp response in server logs (high severity)

Acceptance
- Creating a task from the UI results in an email at info@orthodoxmetrics.com within seconds.
- Email contains all required fields and links back to the task.
- Email failure does not block task creation.


Title:  OM-tasks rev4
Feature: Upload/Create a Task from a .md file with revision slicing + collapsible revision viewer

Goal
Allow admins to upload a Markdown file to create (or update) an OM Task. The Markdown will contain multiple revisions in-order. Each revision must render as a collapsed/expandable section in the Task detail UI. Revisions are detected by a line containing: `title: rev(N)` where N = 1,2,3...

UX requirements
1) Add “Upload .md” entry point in OM Tasks
- On OM Tasks page, add a button near “Create Task” named “Upload .md”
- Opens modal:
  - File picker (accept .md)
  - Optional: “Create new task” vs “Attach to existing task (select task)”
  - Preview panel showing parsed revisions (collapsed list) before saving
  - Confirm button: “Create Task” or “Add Revisions”

2) Revision UI
- In Task detail view, show a “Revisions” section
- Each revision is a collapsed accordion item:
  - Header: “rev(N) – <optional subtitle>” + timestamp (import time)
  - Body: rendered markdown of that revision
- Default state: collapsed (only the newest rev expanded optionally)

Markdown parsing rules (critical)
3) Revision delimiters
- A revision starts when a line matches exactly (case-insensitive, allow whitespace):
  `title: rev(N)` where N is an integer
- Everything after that line until the next `title: rev(M)` (or EOF) is that revision’s markdown content.
- Preserve order as found in file (do NOT sort by N; keep file order).
- If N is missing or duplicated, still keep order; store the raw header and use incremental index as fallback display.

4) Task-level metadata (optional but supported)
- If the file begins with YAML frontmatter (`---` … `---`), parse these fields if present:
  - title
  - category
  - importance
  - type
  - visibility
  - tags (array or comma string)
  - status
  - attachments (array)
  - assignedTo / assignedBy
- Frontmatter applies to the task record; revisions are still extracted from `title: rev(N)` blocks after frontmatter.
- If no frontmatter, require the user to fill required fields in the modal before creation.

5) Details behavior
- Do NOT shove the entire markdown into Details.
- Store revisions separately and render them in the Revisions accordion.
- Details can be:
  - auto-filled with a short summary: “Imported from <filename> with X revisions”
  - or left as user-entered.

Data model / storage
6) Add revision storage
Choose one:
A) New table `om_tasks_revisions` (preferred)
  - id (pk)
  - task_id (fk)
  - rev_index (int, preserves file order)
  - rev_number (int nullable, parsed N)
  - title (varchar) default `rev(N)` or `revision <index>`
  - markdown (longtext)
  - created_at (datetime)
  - created_by (user id/email)
B) JSON column on tasks `revisions` (array of objects) if you want faster delivery, but table is cleaner long-term.

7) API
- POST /api/om-tasks/import-markdown
  - Accept multipart file upload OR raw text
  - Returns parsed preview: taskMeta + revisions[]
- POST /api/om-tasks (create)
  - Accepts task fields + revisions[]
- POST /api/om-tasks/:id/revisions (append)
  - Adds new revisions to existing task
- GET /api/om-tasks/:id includes revisions (or separate endpoint GET /revisions)

Validation / constraints
8) Security
- Only admins/superadmin can import markdown and create tasks.
- Public visibility tasks are still allowed, but must be explicitly set.

9) Limits
- Max file size 1–2MB
- Max revisions per import e.g. 100
- Preserve markdown exactly (line breaks, code fences, etc.)

Acceptance tests
- Upload a .md containing rev(1)..rev(6) markers ? Task created with 6 revisions, shown in the same order as file.
- Each revision renders in an accordion (collapsed by default).
- Re-importing a .md to an existing task appends revisions (does not overwrite unless user chooses “replace”).
- If no frontmatter, modal requires user to select Category/Type/Visibility/Importance/etc before saving.




Title: OM-Tasks rev5
Update OM-Tasks markdown importer to support Nick’s actual revision markers.

Input format (as provided)
- Revisions are introduced by lines starting with:
  "Title:" (case-insensitive)
- The revision number is indicated inside the Title line as:
  "rev1", "rev2", "rev3", ... (allow optional separators: "rev 1", "rev-1", "– rev1")
Examples from file:
- "Title: OM-tasks – rev1"
- "Title: OM-tasks rev2"
- "Title:  OM-tasks rev4"

Also there may be an initial "Title: OM-tasks creation and revisions" that is NOT a numbered revision.
Treat that as revision index 0 (or “intro”) unless we decide to drop it.

Parsing rules
1) Read file as text, preserve line breaks.
2) Identify section starts:
   - A section starts at any line matching:
     /^\s*Title:\s*(.+)\s*$/i
3) For each section Title line:
   - Extract rev_number if the title contains /rev\s*[-(]?\s*(\d+)\s*[)]?/i
     - If found ? section.rev_number = int
     - If not found ? section.rev_number = null and section.title = captured title string
4) Section content:
   - Content is everything AFTER the Title line until the next Title line or EOF.
   - Keep content exactly (including blank lines, code fences, separators).
5) Preserve file order:
   - Use rev_index = 0..N in the order encountered.
   - Do NOT sort by rev_number.
6) Handle separators:
   - Lines like "_____" are part of content unless you explicitly strip only runs of underscores between sections. Safer: keep them.

Storage
- Save each parsed section as a revision record:
  { rev_index, rev_number, title, markdown }
- For display label:
  - If rev_number != null: "rev{rev_number}"
  - Else: use section.title (e.g., “OM-tasks creation and revisions”) or label “intro”.

UI
- In the import preview modal:
  - Show parsed revisions in an accordion list, collapsed by default.
  - Each header shows:
    - display label (revN or intro)
    - original Title text
- In Task detail:
  - Revisions accordion exactly mirrors parsed order.

Validation
- If zero Title sections found, show a clear error: “No Title: markers found. Import expects Title: lines.”

Acceptance
- Importing the provided file yields:
  - An intro section (creation and revisions)
  - rev1, rev2, rev3, rev4 sections in order
  - Each appears collapsed/expandable

















Title: OM-Tasks rev6
Core Tag Groups (seed list)
1) OCR & Ingestion
ocr
google-vision
document-ai
handwriting
printed-text
language-filtering
bounding-box
anchors
layout-detection
entry-detection
confidence-threshold
preprocessing
image-quality
dpi

2) Data & Records
baptism
marriage
funeral
clergy
parish
records
schema
field-mapping
normalization
validation
duplicates
historical-data

3) Workflow & UI
fusion
inspection-panel
review-finalize
drafts
overlays
highlights
entry-editor
empty-state
autosave
modal
ux
ui

4) Platform & Backend
api
database
migrations
auth
roles
permissions
logging
error-handling
performance
security
backups
infrastructure

5) Analytics & Intelligence
analytics
reports
trends
dashboards
charts
metrics
omai
bigbook
search
summarization
insights

6) Documentation Meta
docs
reference
guide
configuration
legacy
task-history
public
admin-only

7) Status / Process (optional but useful)
blocked
needs-review
needs-design
needs-backend
needs-frontend
high-risk
breaking-change
cleanup
tech-debt

Cursor implementation instructions
Add pre-defined tag support to OM-Tasks.

1) Seed a predefined tag list using the approved tags below.
   - Tags must be lowercase, kebab-case.
   - Store centrally (constant, config, or DB table if tags are persisted).

2) In Create Task modal:
   - Tags input should support:
     - Autocomplete from predefined tags
     - Multi-select
     - Manual custom tag entry (still kebab-case enforced)
   - Show predefined tags grouped by logical sections (OCR, Data, Workflow, Platform, Analytics, Docs).

3) Validation:
   - Enforce kebab-case automatically (auto-normalize on entry).
   - Prevent duplicates.
   - Require at least one tag.

4) Display:
   - Render tags as chips/badges in task list and task detail.
   - Allow filtering by tag (admin UI and public UI where applicable).

5) Persistence:
   - Store tags as array of strings.
   - Include tags in email notification payload when a task is created.

Predefined tags (seed list):
[insert tag lists exactly as provided above]

