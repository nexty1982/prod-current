-- Certificate Template System
-- Jurisdiction-based template library with church-specific overrides
-- Supports: OCA, GOARCH, Antiochian, Serbian, Russian, Romanian, etc.

-- ═══════════════════════════════════════════════════════════
-- 1. Template Groups — One per jurisdiction + template type
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS certificate_template_groups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  jurisdiction_id INT NULL,
  jurisdiction_code VARCHAR(20) NOT NULL DEFAULT 'SYSTEM',
  template_type ENUM('baptism_adult','baptism_child','marriage','reception','funeral') NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  is_system_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_jurisdiction (jurisdiction_code),
  INDEX idx_type (template_type),
  INDEX idx_jurisdiction_type (jurisdiction_code, template_type),
  UNIQUE KEY uq_jurisdiction_type (jurisdiction_code, template_type),
  CONSTRAINT fk_ctg_jurisdiction FOREIGN KEY (jurisdiction_id)
    REFERENCES jurisdictions(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ═══════════════════════════════════════════════════════════
-- 2. Templates — Versioned template instances (system or church override)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS certificate_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  template_group_id INT NOT NULL,
  church_id INT NULL COMMENT 'NULL = jurisdiction default; non-null = church override',
  version_label VARCHAR(100) NOT NULL DEFAULT '1.0',
  background_asset_path VARCHAR(512) NULL,
  page_width DECIMAL(8,2) NOT NULL DEFAULT 612.00 COMMENT 'PDF points',
  page_height DECIMAL(8,2) NOT NULL DEFAULT 792.00 COMMENT 'PDF points',
  render_mode ENUM('pdf_overlay','html_to_pdf','image_canvas') NOT NULL DEFAULT 'pdf_overlay',
  field_schema_json JSON NULL COMMENT 'Structured field definitions for this template',
  styling_json JSON NULL COMMENT 'Global styling: fonts, colors, margins',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_group (template_group_id),
  INDEX idx_church (church_id),
  INDEX idx_group_church (template_group_id, church_id),
  CONSTRAINT fk_ct_group FOREIGN KEY (template_group_id)
    REFERENCES certificate_template_groups(id) ON DELETE CASCADE,
  CONSTRAINT fk_ct_church FOREIGN KEY (church_id)
    REFERENCES churches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ═══════════════════════════════════════════════════════════
-- 3. Template Fields — Per-field placement and mapping
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS certificate_template_fields (
  id INT AUTO_INCREMENT PRIMARY KEY,
  template_id INT NOT NULL,
  field_key VARCHAR(100) NOT NULL COMMENT 'e.g. person_full_name, clergy_name',
  label VARCHAR(255) NOT NULL COMMENT 'Human-readable label',
  source_type ENUM('record','church','computed','static','user_input') NOT NULL DEFAULT 'record',
  source_path VARCHAR(255) NULL COMMENT 'Dot-path to source data e.g. first_name, church.rector_name',
  x DECIMAL(8,2) NOT NULL DEFAULT 0 COMMENT 'X position in PDF points from left',
  y DECIMAL(8,2) NOT NULL DEFAULT 0 COMMENT 'Y position in PDF points from bottom',
  width DECIMAL(8,2) NULL COMMENT 'Max width for text wrapping',
  height DECIMAL(8,2) NULL,
  font_family VARCHAR(100) NOT NULL DEFAULT 'TimesRoman',
  font_size DECIMAL(5,1) NOT NULL DEFAULT 14.0,
  font_weight ENUM('normal','bold','italic','bold_italic') NOT NULL DEFAULT 'normal',
  text_align ENUM('left','center','right') NOT NULL DEFAULT 'center',
  color VARCHAR(20) NOT NULL DEFAULT '#000000',
  text_transform ENUM('none','uppercase','lowercase','capitalize') NOT NULL DEFAULT 'none',
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  is_multiline BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_template (template_id),
  UNIQUE KEY uq_template_field (template_id, field_key),
  CONSTRAINT fk_ctf_template FOREIGN KEY (template_id)
    REFERENCES certificate_templates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ═══════════════════════════════════════════════════════════
-- 4. Generated Certificates — Audit trail for every certificate produced
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS generated_certificates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  church_id INT NOT NULL,
  record_type ENUM('baptism','marriage','funeral','reception') NOT NULL,
  record_id INT NOT NULL,
  template_id INT NOT NULL,
  file_path VARCHAR(512) NULL,
  file_size INT NULL,
  generated_by INT NULL,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('generated','downloaded','voided') NOT NULL DEFAULT 'generated',
  metadata_json JSON NULL COMMENT 'Snapshot of record data used for generation',
  INDEX idx_church (church_id),
  INDEX idx_record (record_type, record_id),
  INDEX idx_template (template_id),
  INDEX idx_church_record (church_id, record_type, record_id),
  CONSTRAINT fk_gc_church FOREIGN KEY (church_id)
    REFERENCES churches(id) ON DELETE CASCADE,
  CONSTRAINT fk_gc_template FOREIGN KEY (template_id)
    REFERENCES certificate_templates(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ═══════════════════════════════════════════════════════════
-- 5. Church certificate metadata — rector, seal, signature
-- ═══════════════════════════════════════════════════════════

ALTER TABLE churches
  ADD COLUMN IF NOT EXISTS rector_name VARCHAR(255) NULL AFTER jurisdiction_id,
  ADD COLUMN IF NOT EXISTS seal_image_path VARCHAR(512) NULL AFTER rector_name,
  ADD COLUMN IF NOT EXISTS signature_image_path VARCHAR(512) NULL AFTER seal_image_path;
