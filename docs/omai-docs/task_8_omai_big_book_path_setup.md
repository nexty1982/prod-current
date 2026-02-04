# Task #8 – Big Book Path Initialization for OMAI

## 📁 Objective

Enable OMAI to traverse and analyze the full project directory for **orthodoxmetrics.com** and begin managing relevant files inside the Big Book. This includes identifying and registering:

- `.md` files for documentation
- `.js` files for scripts related to build, deployment, debugging, or enhancement
- Any supporting data files or logs that inform system behavior

---

## 📍 Root Directory to Traverse

```bash
/var/www/orthodox-church-mgmt/orthodoxmetrics/prod
```

---

## 🧠 OMAI Responsibilities

- Detect and classify all `.md` and `.js` files within the project root and subfolders
- Automatically categorize them based on content:
  - **Documentation** → Big Book > Documentation
  - **Build Scripts** → Big Book > DevOps > Build
  - **Testing Scripts** → Big Book > DevOps > Test
  - **Troubleshooting Utilities** → Big Book > Diagnostic Tools
- Create a unified index (`bigbook-index.json`) to allow traversal and search via the Big Book interface
- Generate a `metadata.md` per file that logs:
  - Last modified date
  - File size
  - Auto-assigned classification
  - Dependencies (if JS)

---

## 🔧 Cursor Implementation Prompt

```ts
// Task 8: Big Book Path Setup for OMAI Ingestion
// Goal: Give OMAI access and indexing ability over the OrthodoxMetrics production directory

1. Recursively scan the directory `/var/www/orthodox-church-mgmt/orthodoxmetrics/prod`
2. For each `.md` or `.js` file:
   - Read file contents
   - Determine classification type
   - Generate metadata (mtime, size, hash, category)
   - Move a reference into Big Book's structured directory
3. Store file references using absolute paths (read-only)
4. Populate the `bigbook-index.json` in Big Book root for fast querying by OMAI
5. Create viewer links for each file under Big Book Console UI
6. Secure files using the encrypted filesystem interface (no raw FS exposure)
7. Schedule daily OMAI sync tasks to detect new/modified/deleted entries
```

---

## 🗂️ File Location in Big Book

Saved under: `Big Book > Tasks > 2025-07-26 > Task8_OMAI_BigBookPathSetup.md`

---

## 📝 Status

**Queued for development** – Awaiting Cursor to begin implementation and wire into OMAI ingestion engine.

---

## 🔐 Security Note

All access to `/var/www/orthodox-church-mgmt/orthodoxmetrics/prod` must be performed by a user with sufficient read permissions, and metadata ingestion must not include sensitive environment variables or secrets embedded in JS files. These must be redacted automatically by OMAI.

