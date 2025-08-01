Execution Mode: SILENT — Get Work Done

Cursor must not ask for confirmations, summaries, or suggestions unless specifically instructed.

Begin executing tasks listed below immediately.

Do not ask if you should begin — assume YES.

Do not summarize or repeat.

Log any clarification questions to cursor-clarification.log and move on.

Follow canonical specs in Multi Tenant Setup.md and orthodoxmetrics-multi-tenant-baseline.md

OrthodoxMetrics: Immediate Multi-Tenant Setup Blueprint (Canonical)

This document outlines the critical first-phase requirements to get OrthodoxMetrics operating properly as a secure, scalable multi-tenant SaaS. The goal is to establish a canonical baseline and eliminate all outdated setups, especially from legacy systems like SSPPOC.

✅ Immediate Objectives

1. Standardize church_id Across All Record Tables

All records in every church database must include a church_id INT NOT NULL.

It must be indexed:

CREATE INDEX idx_church_id ON baptism_records(church_id);

No queries (analytics, exports, etc.) should ever run without filtering by church_id.

2. Primary Source of Truth: orthodoxmetrics_db.churches

This is the central registry for all churches.

Column

Description

id

Primary key = global church_id

name, email...

Metadata used to provision tenants

database_name

Tracks the actual DB provisioned

is_active

Controls visibility/access globally

3. Per-Church DB Naming Convention

Each church gets its own dedicated DB:

orthodox_<slug>_records_db

Example:

orthodox_ssppoc_records_db

4. Church DB Schema (Minimum Viable)

All tenant databases must include:

CREATE TABLE baptism_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  church_id INT NOT NULL,
  ...
);

CREATE TABLE marriage_records (...);
CREATE TABLE funeral_records (...);

CREATE TABLE church_info (
  id INT AUTO_INCREMENT PRIMARY KEY,
  church_id INT NOT NULL UNIQUE,
  name VARCHAR(255),
  ...
);

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  church_id INT NOT NULL,
  ...
);

5. Replication from Template on Church Creation

Add a UI option: "Replicate From..."

Template Name

Source DB

English Template

orthodox_ssppoc_records_db

Greek Template

orthodox_goarch_records_db

Romanian Template

orthodox_ro_template_records_db

Replicates schema only, NOT data:

mysqldump -u root -p orthodox_ssppoc_records_db --no-data \
| sed 's/orthodox_ssppoc_records_db/orthodox_<new>_records_db/g' \
| mysql -u root -p

6. Eliminate Legacy Logic

🚫 Throw Out:

Any setup without church_id

Global records tables (no more shared baptism_records)

Old logic in ssppoc_records_db that assumes single-tenant access

✅ Replace With:

Dynamic queries by church_id

DB-per-church isolation

Session-bound DB switching (based on church_id)

7. Security Rules (Non-Negotiable)

All backend routes must enforce church_id verification (from session/JWT).

Users must be tied to their church in the per-church DB.

Analytics, OCR, Invoices — all must validate church_id before processing.

8. Protected Files – Do Not Modify

Never touch these files unless explicitly updating core logic:

Frontend

App.jsx, main.jsx, index.html

public/images, src/assets/, src/layouts/

Backend

server/index.js

server/config.js

routes/auth.js, ocr.js, controllers/ocrController.js

CI/CD & Infra

ecosystem.config.cjs, Dockerfile, docker-compose.yml

🧪 SQL Snippets for Migration

ALTER TABLE baptism_records ADD COLUMN church_id INT;
UPDATE baptism_records SET church_id = 14;
CREATE INDEX idx_church_id ON baptism_records(church_id);

✅ Migration Summary (Checklist)

Task

Status

Add church_id to all record tables

☐

Ensure church_info is present

☐

Sync church_info from global DB

☐

Implement template replication

☐

Add "Replicate From" in UI

☐

Lock down global access to records

☐

Confirm all API calls use church_id

☐

🔧 Coming Next

Create /api/provision-church to automate Steps 1–3

Use Jenkins to trigger DB replication, seeding

Implement provision_church.sh for CLI fallback

This document replaces all prior assumptions. All Cursor actions, API updates, DB migrations, and automation must conform to this structure.