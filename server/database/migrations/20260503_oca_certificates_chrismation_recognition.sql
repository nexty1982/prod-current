-- OCA certificates — extend template_type ENUM with chrismation + recognition,
-- seed the two new template_groups and templates, and copy field positions from
-- the existing reception template (id=4) so the new PDFs render with reasonable
-- starter overlay positions. Operators can fine-tune positions later via the
-- existing PUT /api/certificate-templates/:id/fields/:fieldId endpoint.
--
-- This migration is idempotent — safe to re-run.

-- ─── 1. Extend the enum on both tables that reference it ────────────
ALTER TABLE certificate_template_groups
  MODIFY COLUMN template_type
    ENUM('baptism_adult','baptism_child','marriage','reception','funeral','chrismation','recognition')
    NOT NULL;

-- ─── 2. Seed template_groups (idempotent via INSERT IGNORE on the unique key) ─
-- jurisdiction_id 2 = OCA (matches the four existing OCA groups).
INSERT IGNORE INTO certificate_template_groups
  (jurisdiction_id, jurisdiction_code, template_type, name, description, is_system_default, is_active)
VALUES
  (2, 'OCA', 'chrismation', 'OCA Chrismation Certificate',
   'Official OCA certificate for the sacrament of chrismation', 1, 1),
  (2, 'OCA', 'recognition', 'OCA Certificate of Recognition',
   'Official OCA certificate of recognition', 1, 1);

-- ─── 3. Seed the templates pointing at the new PDFs ─────────────────
-- INSERT only when the template_group has no template yet — preserves
-- any operator overrides if the migration is re-run after manual edits.
INSERT INTO certificate_templates
  (template_group_id, church_id, version_label, background_asset_path,
   page_width, page_height, render_mode, is_active)
SELECT g.id, NULL, '2026.1', 'certificates/templates/OCA/certificate-chrismation.pdf',
       612.00, 792.00, 'pdf_overlay', 1
  FROM certificate_template_groups g
 WHERE g.jurisdiction_code = 'OCA' AND g.template_type = 'chrismation'
   AND NOT EXISTS (
     SELECT 1 FROM certificate_templates t WHERE t.template_group_id = g.id
   );

INSERT INTO certificate_templates
  (template_group_id, church_id, version_label, background_asset_path,
   page_width, page_height, render_mode, is_active)
SELECT g.id, NULL, '2026.1', 'certificates/templates/OCA/certificate-recognition.pdf',
       612.00, 792.00, 'pdf_overlay', 1
  FROM certificate_template_groups g
 WHERE g.jurisdiction_code = 'OCA' AND g.template_type = 'recognition'
   AND NOT EXISTS (
     SELECT 1 FROM certificate_templates t WHERE t.template_group_id = g.id
   );

-- ─── 4. Copy field positions from the reception template (template_id 4) ─
-- The reception cert layout is the closest match for chrismation & recognition
-- (same person/date/clergy/church/sponsors structure). Operators can refine
-- positions per template via the existing field-update endpoint.
--
-- The unique key uq_template_field(template_id, field_key) means re-running
-- this is a no-op once the rows are in place.
INSERT IGNORE INTO certificate_template_fields
  (template_id, field_key, label, source_type, source_path,
   x, y, width, height, font_family, font_size, font_weight, text_align,
   color, text_transform, is_required, is_multiline, sort_order)
SELECT new_t.id, f.field_key, f.label, f.source_type, f.source_path,
       f.x, f.y, f.width, f.height, f.font_family, f.font_size, f.font_weight, f.text_align,
       f.color, f.text_transform, f.is_required, f.is_multiline, f.sort_order
  FROM certificate_template_fields f
  JOIN certificate_templates src ON src.id = f.template_id
  JOIN certificate_template_groups src_g ON src_g.id = src.template_group_id
   AND src_g.jurisdiction_code = 'OCA' AND src_g.template_type = 'reception'
  JOIN certificate_template_groups new_g
    ON new_g.jurisdiction_code = 'OCA'
   AND new_g.template_type IN ('chrismation', 'recognition')
  JOIN certificate_templates new_t
    ON new_t.template_group_id = new_g.id
 ;

-- ─── 5. Verification ────────────────────────────────────────────────
-- Quick sanity check — should report 6 OCA groups and 6 OCA templates.
SELECT 'groups' AS what, COUNT(*) AS n
  FROM certificate_template_groups WHERE jurisdiction_code='OCA'
UNION ALL
SELECT 'templates', COUNT(*)
  FROM certificate_templates t
  JOIN certificate_template_groups g ON g.id = t.template_group_id
 WHERE g.jurisdiction_code='OCA'
UNION ALL
SELECT 'chrismation_fields', COUNT(*)
  FROM certificate_template_fields f
  JOIN certificate_templates t ON t.id = f.template_id
  JOIN certificate_template_groups g ON g.id = t.template_group_id
 WHERE g.template_type='chrismation'
UNION ALL
SELECT 'recognition_fields', COUNT(*)
  FROM certificate_template_fields f
  JOIN certificate_templates t ON t.id = f.template_id
  JOIN certificate_template_groups g ON g.id = t.template_group_id
 WHERE g.template_type='recognition';
