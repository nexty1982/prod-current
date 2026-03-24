-- ============================================================================
-- Church Onboarding Pipeline — Extended Tables
-- 2026-03-24 | Adds record requirements, sample templates, email workflow,
-- and activity logging for formal church onboarding pipeline.
-- ============================================================================

-- 1. Sample Record Templates
-- Pre-defined record structures that churches can choose during onboarding
CREATE TABLE IF NOT EXISTS sample_record_templates (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  code          VARCHAR(50)   NOT NULL UNIQUE,
  name          VARCHAR(150)  NOT NULL,
  description   TEXT,
  record_type   ENUM('baptism','marriage','funeral','chrismation','other') NOT NULL,
  is_active     TINYINT(1)    NOT NULL DEFAULT 1,
  sort_order    INT           NOT NULL DEFAULT 0,
  fields_json   JSON          NOT NULL COMMENT 'Array of field definitions [{name, type, required, label}]',
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_record_type (record_type),
  INDEX idx_active_sort (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Onboarding Record Requirements
-- Per-record-type decisions for each onboarding case
CREATE TABLE IF NOT EXISTS onboarding_record_requirements (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  onboarding_id       INT           NOT NULL COMMENT 'us_churches.id (CRM lead)',
  record_type         ENUM('baptism','marriage','funeral','chrismation','other') NOT NULL,
  uses_sample         TINYINT(1)    NOT NULL DEFAULT 0,
  sample_template_id  INT           NULL,
  custom_required     TINYINT(1)    NOT NULL DEFAULT 0,
  custom_notes        TEXT,
  review_required     TINYINT(1)    NOT NULL DEFAULT 0,
  created_at          TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_onboarding (onboarding_id),
  FOREIGN KEY (sample_template_id) REFERENCES sample_record_templates(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Onboarding Emails — formal email workflow
CREATE TABLE IF NOT EXISTS onboarding_emails (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  onboarding_id   INT           NOT NULL COMMENT 'us_churches.id (CRM lead)',
  email_type      ENUM('welcome','info_request','template_confirm','custom_review','provisioned','reminder') NOT NULL,
  subject         VARCHAR(255)  NOT NULL,
  recipients      VARCHAR(500)  NOT NULL,
  cc              VARCHAR(500)  NULL,
  body            MEDIUMTEXT    NOT NULL,
  status          ENUM('draft','sent','replied','awaiting_response','completed') NOT NULL DEFAULT 'draft',
  sent_at         DATETIME      NULL,
  replied_at      DATETIME      NULL,
  notes           TEXT,
  created_by      INT           NULL,
  created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_onboarding (onboarding_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Onboarding Activity Log
CREATE TABLE IF NOT EXISTS onboarding_activity_log (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  onboarding_id   INT           NOT NULL COMMENT 'us_churches.id (CRM lead)',
  activity_type   VARCHAR(50)   NOT NULL,
  actor_user_id   INT           NULL,
  summary         VARCHAR(500)  NOT NULL,
  details_json    JSON          NULL,
  created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_onboarding_time (onboarding_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Extend us_churches with onboarding pipeline fields
ALTER TABLE us_churches
  ADD COLUMN IF NOT EXISTS current_records_situation ENUM('paper','spreadsheets','software','mixed','unknown') NULL AFTER crm_notes,
  ADD COLUMN IF NOT EXISTS estimated_volume          VARCHAR(100) NULL AFTER current_records_situation,
  ADD COLUMN IF NOT EXISTS historical_import_needed  TINYINT(1) DEFAULT 0 AFTER estimated_volume,
  ADD COLUMN IF NOT EXISTS ocr_assistance_needed     TINYINT(1) DEFAULT 0 AFTER historical_import_needed,
  ADD COLUMN IF NOT EXISTS public_records_needed     TINYINT(1) DEFAULT 0 AFTER ocr_assistance_needed,
  ADD COLUMN IF NOT EXISTS desired_launch_timeline   VARCHAR(100) NULL AFTER public_records_needed,
  ADD COLUMN IF NOT EXISTS custom_structure_required  TINYINT(1) DEFAULT 0 AFTER desired_launch_timeline,
  ADD COLUMN IF NOT EXISTS provisioning_ready        TINYINT(1) DEFAULT 0 AFTER custom_structure_required,
  ADD COLUMN IF NOT EXISTS provisioning_completed    TINYINT(1) DEFAULT 0 AFTER provisioning_ready,
  ADD COLUMN IF NOT EXISTS activation_date           DATE NULL AFTER provisioning_completed,
  ADD COLUMN IF NOT EXISTS assigned_to_user_id       INT NULL AFTER activation_date,
  ADD COLUMN IF NOT EXISTS discovery_notes           TEXT NULL AFTER assigned_to_user_id,
  ADD COLUMN IF NOT EXISTS blockers                  TEXT NULL AFTER discovery_notes;

-- 6. Seed sample record templates
INSERT INTO sample_record_templates (code, name, description, record_type, sort_order, fields_json) VALUES
('baptism_standard', 'Standard Baptism Record', 'Standard Orthodox baptism record with essential fields for sacramental documentation.', 'baptism', 1,
 JSON_ARRAY(
   JSON_OBJECT('name','baptism_date','type','date','required',true,'label','Date of Baptism'),
   JSON_OBJECT('name','first_name','type','text','required',true,'label','First Name'),
   JSON_OBJECT('name','last_name','type','text','required',true,'label','Last Name'),
   JSON_OBJECT('name','date_of_birth','type','date','required',true,'label','Date of Birth'),
   JSON_OBJECT('name','place_of_birth','type','text','required',false,'label','Place of Birth'),
   JSON_OBJECT('name','father_name','type','text','required',true,'label','Father''s Name'),
   JSON_OBJECT('name','mother_name','type','text','required',true,'label','Mother''s Name'),
   JSON_OBJECT('name','godparent_name','type','text','required',true,'label','Godparent Name'),
   JSON_OBJECT('name','godparent_relationship','type','text','required',false,'label','Godparent Relationship'),
   JSON_OBJECT('name','officiating_priest','type','text','required',true,'label','Officiating Priest'),
   JSON_OBJECT('name','church_name','type','text','required',false,'label','Church Name'),
   JSON_OBJECT('name','register_number','type','text','required',false,'label','Register/Book Number'),
   JSON_OBJECT('name','page_number','type','text','required',false,'label','Page Number'),
   JSON_OBJECT('name','notes','type','textarea','required',false,'label','Additional Notes')
 )),
('baptism_extended', 'Extended Baptism Record', 'Comprehensive baptism record including chrismation details and extended family information.', 'baptism', 2,
 JSON_ARRAY(
   JSON_OBJECT('name','baptism_date','type','date','required',true,'label','Date of Baptism'),
   JSON_OBJECT('name','chrismation_date','type','date','required',false,'label','Date of Chrismation'),
   JSON_OBJECT('name','first_name','type','text','required',true,'label','First Name'),
   JSON_OBJECT('name','middle_name','type','text','required',false,'label','Middle Name'),
   JSON_OBJECT('name','last_name','type','text','required',true,'label','Last Name'),
   JSON_OBJECT('name','christian_name','type','text','required',false,'label','Christian/Saints Name'),
   JSON_OBJECT('name','date_of_birth','type','date','required',true,'label','Date of Birth'),
   JSON_OBJECT('name','place_of_birth','type','text','required',false,'label','Place of Birth'),
   JSON_OBJECT('name','father_name','type','text','required',true,'label','Father''s Full Name'),
   JSON_OBJECT('name','father_religion','type','text','required',false,'label','Father''s Religion'),
   JSON_OBJECT('name','mother_name','type','text','required',true,'label','Mother''s Full Name'),
   JSON_OBJECT('name','mother_maiden_name','type','text','required',false,'label','Mother''s Maiden Name'),
   JSON_OBJECT('name','mother_religion','type','text','required',false,'label','Mother''s Religion'),
   JSON_OBJECT('name','godparent_name','type','text','required',true,'label','Godparent Name'),
   JSON_OBJECT('name','godparent_address','type','text','required',false,'label','Godparent Address'),
   JSON_OBJECT('name','godparent_phone','type','text','required',false,'label','Godparent Phone'),
   JSON_OBJECT('name','officiating_priest','type','text','required',true,'label','Officiating Priest'),
   JSON_OBJECT('name','assisting_clergy','type','text','required',false,'label','Assisting Clergy'),
   JSON_OBJECT('name','register_number','type','text','required',false,'label','Register Number'),
   JSON_OBJECT('name','page_number','type','text','required',false,'label','Page Number'),
   JSON_OBJECT('name','certificate_number','type','text','required',false,'label','Certificate Number'),
   JSON_OBJECT('name','notes','type','textarea','required',false,'label','Additional Notes')
 )),
('marriage_standard', 'Standard Marriage Record', 'Standard Orthodox marriage/crowning record with essential sacramental fields.', 'marriage', 1,
 JSON_ARRAY(
   JSON_OBJECT('name','marriage_date','type','date','required',true,'label','Date of Marriage'),
   JSON_OBJECT('name','groom_first_name','type','text','required',true,'label','Groom First Name'),
   JSON_OBJECT('name','groom_last_name','type','text','required',true,'label','Groom Last Name'),
   JSON_OBJECT('name','groom_date_of_birth','type','date','required',false,'label','Groom Date of Birth'),
   JSON_OBJECT('name','groom_religion','type','text','required',false,'label','Groom Religion'),
   JSON_OBJECT('name','groom_father_name','type','text','required',false,'label','Groom Father''s Name'),
   JSON_OBJECT('name','groom_mother_name','type','text','required',false,'label','Groom Mother''s Name'),
   JSON_OBJECT('name','bride_first_name','type','text','required',true,'label','Bride First Name'),
   JSON_OBJECT('name','bride_last_name','type','text','required',true,'label','Bride Last Name'),
   JSON_OBJECT('name','bride_date_of_birth','type','date','required',false,'label','Bride Date of Birth'),
   JSON_OBJECT('name','bride_religion','type','text','required',false,'label','Bride Religion'),
   JSON_OBJECT('name','bride_father_name','type','text','required',false,'label','Bride Father''s Name'),
   JSON_OBJECT('name','bride_mother_name','type','text','required',false,'label','Bride Mother''s Name'),
   JSON_OBJECT('name','sponsor_name','type','text','required',true,'label','Koumbaro/Sponsor Name'),
   JSON_OBJECT('name','officiating_priest','type','text','required',true,'label','Officiating Priest'),
   JSON_OBJECT('name','witness_1','type','text','required',false,'label','Witness 1'),
   JSON_OBJECT('name','witness_2','type','text','required',false,'label','Witness 2'),
   JSON_OBJECT('name','register_number','type','text','required',false,'label','Register Number'),
   JSON_OBJECT('name','page_number','type','text','required',false,'label','Page Number'),
   JSON_OBJECT('name','license_number','type','text','required',false,'label','Marriage License Number'),
   JSON_OBJECT('name','notes','type','textarea','required',false,'label','Additional Notes')
 )),
('funeral_standard', 'Standard Funeral Record', 'Standard Orthodox funeral/burial record for memorial documentation.', 'funeral', 1,
 JSON_ARRAY(
   JSON_OBJECT('name','funeral_date','type','date','required',true,'label','Date of Funeral'),
   JSON_OBJECT('name','first_name','type','text','required',true,'label','First Name'),
   JSON_OBJECT('name','last_name','type','text','required',true,'label','Last Name'),
   JSON_OBJECT('name','date_of_birth','type','date','required',false,'label','Date of Birth'),
   JSON_OBJECT('name','date_of_death','type','date','required',true,'label','Date of Death'),
   JSON_OBJECT('name','place_of_death','type','text','required',false,'label','Place of Death'),
   JSON_OBJECT('name','cause_of_death','type','text','required',false,'label','Cause of Death'),
   JSON_OBJECT('name','age_at_death','type','number','required',false,'label','Age at Death'),
   JSON_OBJECT('name','spouse_name','type','text','required',false,'label','Spouse Name'),
   JSON_OBJECT('name','next_of_kin','type','text','required',false,'label','Next of Kin'),
   JSON_OBJECT('name','cemetery_name','type','text','required',false,'label','Cemetery Name'),
   JSON_OBJECT('name','burial_date','type','date','required',false,'label','Date of Burial'),
   JSON_OBJECT('name','officiating_priest','type','text','required',true,'label','Officiating Priest'),
   JSON_OBJECT('name','register_number','type','text','required',false,'label','Register Number'),
   JSON_OBJECT('name','page_number','type','text','required',false,'label','Page Number'),
   JSON_OBJECT('name','notes','type','textarea','required',false,'label','Additional Notes')
 )),
('chrismation_standard', 'Standard Chrismation Record', 'Record for Holy Chrismation / reception into the Orthodox Church.', 'chrismation', 1,
 JSON_ARRAY(
   JSON_OBJECT('name','chrismation_date','type','date','required',true,'label','Date of Chrismation'),
   JSON_OBJECT('name','first_name','type','text','required',true,'label','First Name'),
   JSON_OBJECT('name','last_name','type','text','required',true,'label','Last Name'),
   JSON_OBJECT('name','christian_name','type','text','required',false,'label','Christian/Saints Name'),
   JSON_OBJECT('name','date_of_birth','type','date','required',true,'label','Date of Birth'),
   JSON_OBJECT('name','previous_denomination','type','text','required',false,'label','Previous Denomination'),
   JSON_OBJECT('name','previous_baptism_date','type','date','required',false,'label','Previous Baptism Date'),
   JSON_OBJECT('name','sponsor_name','type','text','required',true,'label','Sponsor Name'),
   JSON_OBJECT('name','officiating_priest','type','text','required',true,'label','Officiating Priest'),
   JSON_OBJECT('name','bishop_blessing','type','text','required',false,'label','Bishop Blessing'),
   JSON_OBJECT('name','register_number','type','text','required',false,'label','Register Number'),
   JSON_OBJECT('name','page_number','type','text','required',false,'label','Page Number'),
   JSON_OBJECT('name','notes','type','textarea','required',false,'label','Additional Notes')
 ));

-- 7. Add extended pipeline stages if they don't exist
INSERT IGNORE INTO crm_pipeline_stages (stage_key, label, color, sort_order, is_terminal) VALUES
  ('awaiting_info', 'Awaiting Info', '#ff9800', 35, 0),
  ('record_review', 'Record Review', '#9c27b0', 45, 0),
  ('ready_provision', 'Ready to Provision', '#00bcd4', 55, 0),
  ('provisioning', 'Provisioning', '#2196f3', 65, 0),
  ('awaiting_response', 'Awaiting Response', '#ff5722', 75, 0),
  ('blocked', 'Blocked', '#f44336', 90, 0),
  ('closed_lost', 'Closed / Lost', '#9e9e9e', 99, 1);
