OrthodoxMetrics Multi-Tenant Church Provisioning Architecture

This document outlines the official church provisioning process and database structure for the OrthodoxMetrics platform. It includes the correct schema relationships, creation flow, and the required presence of church_id in all record-level data. This should be followed strictly by all services, developers (including AI agents like Cursor), and automation scripts.

✅ Step-by-Step Provisioning Flow

1. Church Creation in UI (Global Registry)

Admin submits the "Add Church" form via the OrthodoxMetrics admin dashboard.

A new record is inserted into orthodoxmetrics_db.churches.

INSERT INTO orthodoxmetrics_db.churches (name, email, ...)
VALUES ('Saint Peter Church', 'admin@saintpeter.org', ...);

id is auto-incremented and becomes the global ****church_id.

2. Database Provisioning (Per Church DB)

A new dedicated database is provisioned using naming convention:

orthodox_<church_slug>_records_db

Example:

orthodox_ssppoc_records_db

Required base tables must be created with this structure:

CREATE TABLE baptism_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  church_id INT NOT NULL,
  ...
);

CREATE TABLE marriage_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  church_id INT NOT NULL,
  ...
);

CREATE TABLE funeral_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  church_id INT NOT NULL,
  ...
);

church_id must match exactly the value from orthodoxmetrics_db.churches.id

church_id should be indexed:

CREATE INDEX idx_church_id ON baptism_records(church_id);

3. Initialize Church Configuration

The new database must contain a church_info table:

CREATE TABLE church_info (
  id INT AUTO_INCREMENT PRIMARY KEY,
  church_id INT NOT NULL UNIQUE,
  name VARCHAR(255),
  email VARCHAR(255),
  ...
);

This table should be populated with matching fields from orthodoxmetrics_db.churches.

Sync should happen via backend logic:

const church = await globalDb.query('SELECT * FROM churches WHERE id = ?', [churchId]);
await tenantDb.query('INSERT INTO church_info SET ?', church);

🔁 Replicate From Template (New Church Setup Enhancement)

When adding a new church, admins can optionally select a template database to replicate schema from.

UI Field: "Replicate From"

Display values → DB templates:

Display Name

DB Template Name

SSPPOC English Template

orthodox_ssppoc_records_db

GOARCH Greek Template

orthodox_goarch_records_db

Romanian Template

orthodox_ro_template_records_db

Russian Template

orthodox_ru_template_records_db

Schema Replication Process:

mysqldump -u root -p orthodox_ssppoc_records_db --no-data \
  | sed "s/orthodox_ssppoc_records_db/orthodox_<slug>_records_db/g" \
  | mysql -u root -p

church_info and users tables must be emptied if carried over

Seed form templates, dropdowns, or configs as needed

INSERT INTO orthodox_<slug>_records_db.form_templates
SELECT * FROM orthodox_ssppoc_records_db.form_templates;

🔐 Required Security & Consistency Rules

Every record in baptism_records, marriage_records, funeral_records must include church_id.

The backend must **filter all record queries by **church_id from session or token.

church_info.church_id must be 1:1 matched with orthodoxmetrics_db.churches.id

users.church_id in each church DB must reference the correct church.

Global features like analytics and OCR must never process records without verifying church_id match.

⚡ Sample Provisioning Summary

Item

Value

Global Church ID

14

Global DB Entry

orthodoxmetrics_db.churches

Provisioned DB Name

orthodox_ssppoc_records_db

church_info.church_id

14

Record Table IDs

All must include church_id = 14

🛑 Do Not Modify – Protected Files List

The following files must never be edited by Cursor or any automation tool during this process:

🔒 Frontend

App.jsx, App.tsx

main.jsx, main.tsx

index.html

public/, src/assets/, src/layouts/

🔒 Backend

server/index.js

server/config.js

server/routes/auth.js

server/routes/ocr.js

server/controllers/ocrController.js

server/controllers/sessionController.js

🔒 CI/CD

ecosystem.config.cjs, Dockerfile, docker-compose.yml

scripts/deploy-prod.sh

🔒 DB Snapshots

sql/seeds/prod/

sql/dumps/*.sql

🔄 Syncing Commands (SQL)

Add church_id to existing tables:

ALTER TABLE baptism_records ADD COLUMN church_id INT;
UPDATE baptism_records SET church_id = 14;
CREATE INDEX idx_church_id ON baptism_records(church_id);
-- Repeat for marriage_records, funeral_records

Verify linkage:

SELECT * FROM orthodoxmetrics_db.churches c
JOIN orthodox_ssppoc_records_db.church_info i ON c.id = i.church_id
WHERE c.id = 14;

🏠 Future Enhancements

Add foreign key constraints (optional if cross-database support is enabled).

Automate the provisioning process via Jenkins or CLI.

Create a provision_church.sh script that performs steps 1–3 end-to-end.

This document is canonical. All future church DBs must follow this structure. If issues arise, validate church_id first before debugging other layers.

— OrthodoxMetrics DevOps Team