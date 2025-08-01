# Task #10 – OMAI Command Hooks for Big Book Management

## 🧠 Objective

Allow OMAI to recognize and execute custom admin-taught commands such as:

- "stock the big book"
- "end of day tasks"
- "organize things"

Each of these phrases should trigger an automated ingestion of all Markdown (`.md`) files throughout the production site and update the Big Book interface accordingly.

---

## 📦 What This Command Will Do

When invoked, the command will:

1. Recursively search for all `.md` files under:

   ```
   /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/
   ```

2. For each `.md` file found:

   - Parse metadata: `filename`, `path`, `last modified`, `size`
   - Determine which category it belongs to in the Big Book
   - Add entry into the Big Book using encrypted storage interface
   - Append a log to `bigbook-ingest.log` showing when and what was added

3. Generate or update `bigbook-index.json`

   - Store metadata per file
   - Allow future lookups and updates via OMAI

4. Add a `Big Book > System Logs > Librarian Records` entry

   - Notes date/time of ingestion
   - Shows which custom phrase triggered it
   - Can be reviewed later to see nightly upload behavior

---

## 🧭 Custom Commands (Aliases)

```json
{
  "stock the big book": "/omai/scripts/bigbook-ingest.sh",
  "end of day tasks": "/omai/scripts/bigbook-ingest.sh",
  "organize things": "/omai/scripts/bigbook-ingest.sh"
}
```

---

## 🔐 Permissions

- Only super\_admins and OMAI core service can invoke this feature
- Commands can be expanded via a `custom-commands.json` interface
- Shell script should log output and error to Big Book logs

---

## 🗂 File Location in Big Book

Saved under: `Big Book > Tasks > 2025-07-26 > Task10_OMAI_BigBookLibrarian.md`

---

## ✅ Status

**Queued** – Cursor should implement `bigbook-ingest.sh`, register phrases in OMAI command dispatcher, and validate the ingestion logging pathway.

---

## 🛡 Notes

- Sensitive `.md` files with embedded credentials or secrets will be flagged and skipped
- Metadata extraction includes file hash for future diff tracking
- Nightly auto-run version can be toggled from OMAI settings UI

