-- =============================================================================
-- Migration: Seed Default Global Rules
-- Date: 2026-06-06
-- Description: Insert 9 global rules into ocr_parish_rules.
--   Rules 1-5: Match existing defaultRules.ts entries so DB takes precedence
--   Rules 6-9: New validation rules requested for v2
-- =============================================================================

-- Rule 1: Baptism Date preceding Birth Date check (from defaultRules.ts)
INSERT INTO ocr_parish_rules
  (church_id, scope, name, description, record_type, conditions_json, actions_json, severity, is_active, priority, created_by)
VALUES
  (NULL, 'global', 'Baptism Date preceding Birth Date check',
   'Ensures the baptism/reception date is not before the birth date.',
   'baptism',
   '{"all":[{"field":"reception_date","operator":"is_before_field","value":"birth_date"}]}',
   '[{"type":"block_record_completion","field":"reception_date","explanation_template":"Baptism/reception date cannot occur before the birth date."}]',
   'blocker', 1, 10, 'system');

-- Rule 2: Funeral Date preceding Death Date check (from defaultRules.ts)
INSERT INTO ocr_parish_rules
  (church_id, scope, name, description, record_type, conditions_json, actions_json, severity, is_active, priority, created_by)
VALUES
  (NULL, 'global', 'Funeral Date preceding Death Date check',
   'Ensures the funeral/burial date is not before the death date.',
   'funeral',
   '{"all":[{"field":"burial_date","operator":"is_before_field","value":"deceased_date"}]}',
   '[{"type":"block_record_completion","field":"burial_date","explanation_template":"Funeral or burial date cannot occur before the death date."}]',
   'blocker', 1, 10, 'system');

-- Rule 3: Infer Child Surname from Father (from defaultRules.ts)
INSERT INTO ocr_parish_rules
  (church_id, scope, name, description, record_type, conditions_json, actions_json, severity, is_active, priority, created_by)
VALUES
  (NULL, 'global', 'Infer Child Surname from Father',
   'Suggests child surname from the father''s surname listed in the parents field.',
   'baptism',
   '{"all":[{"field":"last_name","operator":"is_empty"},{"field":"parents","operator":"has_father_surname"}]}',
   '[{"type":"suggest_value","field":"last_name","resolver":"father_surname_from_parents","resolver_args":{"source_field":"parents"},"auto_apply":false,"explanation_template":"Suggested child surname from the father''s surname listed in the parents field."}]',
   'suggestion', 1, 20, 'system');

-- Rule 4: Infer Child Surname from Shared Parent Surname (from defaultRules.ts)
INSERT INTO ocr_parish_rules
  (church_id, scope, name, description, record_type, conditions_json, actions_json, severity, is_active, priority, created_by)
VALUES
  (NULL, 'global', 'Infer Child Surname from Shared Parent Surname',
   'Suggests child surname because both parents appear to share the same surname.',
   'baptism',
   '{"all":[{"field":"last_name","operator":"is_empty"},{"field":"parents","operator":"has_shared_parent_surname"}]}',
   '[{"type":"suggest_value","field":"last_name","resolver":"shared_parent_surname","resolver_args":{"source_field":"parents"},"auto_apply":false,"explanation_template":"Suggested child surname because both parents appear to share the same surname."}]',
   'suggestion', 1, 25, 'system');

-- Rule 5: Suggest Clergy from Tenure and Variants (from defaultRules.ts)
INSERT INTO ocr_parish_rules
  (church_id, scope, name, description, record_type, conditions_json, actions_json, severity, is_active, priority, created_by)
VALUES
  (NULL, 'global', 'Suggest Clergy from Tenure and Variants',
   'Suggests or normalizes canonical clergy name based on event date and configured variants.',
   'all',
   '{"any":[{"field":"clergy","operator":"is_empty"},{"field":"clergy","operator":"matches_entity_variant","value":{"entity_type":"clergy"}}]}',
   '[{"type":"suggest_value","field":"clergy","resolver":"best_matching_clergy_by_tenure_and_variant","auto_apply":false,"explanation_template":"Suggested officiant based on record event date and clergy active service periods."}]',
   'suggestion', 1, 30, 'system');

-- Rule 6: Marriage bride and groom names should not be identical (NEW)
INSERT INTO ocr_parish_rules
  (church_id, scope, name, description, record_type, conditions_json, actions_json, severity, is_active, priority, created_by)
VALUES
  (NULL, 'global', 'Identical Bride and Groom Names',
   'Flags when bride and groom first and last names are both identical, which likely indicates a data entry error.',
   'marriage',
   '{"all":[{"field":"fname_groom","operator":"equals_field","value":"fname_bride"},{"field":"lname_groom","operator":"equals_field","value":"lname_bride"}]}',
   '[{"type":"flag_warning","field":"fname_bride","explanation_template":"Bride and groom names appear to be identical. Please verify this is not a data entry error."}]',
   'warning', 1, 40, 'system');

-- Rule 7: Single-character names require review (NEW)
INSERT INTO ocr_parish_rules
  (church_id, scope, name, description, record_type, conditions_json, actions_json, severity, is_active, priority, created_by)
VALUES
  (NULL, 'global', 'Single-Character Name Review',
   'Flags names that are only a single character, which may indicate incomplete OCR extraction.',
   'all',
   '{"any":[{"field":"first_name","operator":"regex_matches","value":"^[A-Za-z]$"},{"field":"last_name","operator":"regex_matches","value":"^[A-Za-z]$"},{"field":"name","operator":"regex_matches","value":"^[A-Za-z]$"},{"field":"lastname","operator":"regex_matches","value":"^[A-Za-z]$"},{"field":"fname_groom","operator":"regex_matches","value":"^[A-Za-z]$"},{"field":"fname_bride","operator":"regex_matches","value":"^[A-Za-z]$"}]}',
   '[{"type":"require_manual_review","field":"first_name","explanation_template":"A name field contains only a single character. This may indicate incomplete OCR extraction and requires human review."}]',
   'warning', 1, 50, 'system');

-- Rule 8: Funeral impossible ages (NEW)
INSERT INTO ocr_parish_rules
  (church_id, scope, name, description, record_type, conditions_json, actions_json, severity, is_active, priority, created_by)
VALUES
  (NULL, 'global', 'Impossible Age at Death',
   'Flags funeral records where the age at death exceeds 150 or is negative.',
   'funeral',
   '{"any":[{"field":"age","operator":"greater_than","value":150},{"field":"age","operator":"less_than","value":0}]}',
   '[{"type":"require_manual_review","field":"age","explanation_template":"The age at death appears impossible (greater than 150 or negative). Please verify the recorded age."}]',
   'warning', 1, 45, 'system');

-- Rule 9: Clergy field should not be empty when required (NEW)
INSERT INTO ocr_parish_rules
  (church_id, scope, name, description, record_type, conditions_json, actions_json, severity, is_active, priority, created_by)
VALUES
  (NULL, 'global', 'Missing Clergy/Officiant',
   'Suggests review when the clergy or officiant field is empty for any record type.',
   'all',
   '{"all":[{"field":"clergy","operator":"is_empty"}]}',
   '[{"type":"attach_explanation","field":"clergy","explanation_template":"The clergy/officiant field is empty. Consider adding the officiating clergy member for a complete record."}]',
   'suggestion', 1, 60, 'system')
