-- ============================================================================
-- OCR Rules Seeding Migration
-- Seeds default global rules into ocr_parish_rules
-- Date: 2026-06-06
-- ============================================================================

-- Rule 1: Baptism Date preceding Birth Date check
INSERT INTO ocr_parish_rules (church_id, scope, name, description, record_type, conditions_json, actions_json, severity, is_active, priority, created_by, created_at, updated_at)
VALUES (
  NULL, 'global',
  'Baptism Date preceding Birth Date check',
  'Ensures the baptism/reception date is not before the birth date.',
  'baptism',
  '{"all":[{"field":"reception_date","operator":"is_before_field","value":"birth_date"}]}',
  '[{"type":"block_record_completion","field":"reception_date","explanation_template":"Baptism/reception date cannot occur before the birth date."}]',
  'blocker', 1, 10, 'system', NOW(), NOW()
);

-- Rule 2: Funeral Date preceding Death Date check
INSERT INTO ocr_parish_rules (church_id, scope, name, description, record_type, conditions_json, actions_json, severity, is_active, priority, created_by, created_at, updated_at)
VALUES (
  NULL, 'global',
  'Funeral Date preceding Death Date check',
  'Ensures the funeral/burial date is not before the death date.',
  'funeral',
  '{"all":[{"field":"burial_date","operator":"is_before_field","value":"deceased_date"}]}',
  '[{"type":"block_record_completion","field":"burial_date","explanation_template":"Funeral or burial date cannot occur before the death date."}]',
  'blocker', 1, 10, 'system', NOW(), NOW()
);

-- Rule 3: Infer Child Surname from Father
INSERT INTO ocr_parish_rules (church_id, scope, name, description, record_type, conditions_json, actions_json, severity, is_active, priority, created_by, created_at, updated_at)
VALUES (
  NULL, 'global',
  'Infer Child Surname from Father',
  'Suggests child surname from the father''s surname listed in the parents field.',
  'baptism',
  '{"all":[{"field":"last_name","operator":"is_empty"},{"field":"parents","operator":"has_father_surname"}]}',
  '[{"type":"suggest_value","field":"last_name","resolver":"father_surname_from_parents","resolver_args":{"source_field":"parents"},"auto_apply":false,"explanation_template":"Suggested child surname from the father''s surname listed in the parents field."}]',
  'suggestion', 1, 20, 'system', NOW(), NOW()
);

-- Rule 4: Infer Child Surname from Shared Parent Surname
INSERT INTO ocr_parish_rules (church_id, scope, name, description, record_type, conditions_json, actions_json, severity, is_active, priority, created_by, created_at, updated_at)
VALUES (
  NULL, 'global',
  'Infer Child Surname from Shared Parent Surname',
  'Suggests child surname because both parents appear to share the same surname.',
  'baptism',
  '{"all":[{"field":"last_name","operator":"is_empty"},{"field":"parents","operator":"has_shared_parent_surname"}]}',
  '[{"type":"suggest_value","field":"last_name","resolver":"shared_parent_surname","resolver_args":{"source_field":"parents"},"auto_apply":false,"explanation_template":"Suggested child surname because both parents appear to share the same surname."}]',
  'suggestion', 1, 25, 'system', NOW(), NOW()
);

-- Rule 5: Suggest Clergy from Tenure and Variants
INSERT INTO ocr_parish_rules (church_id, scope, name, description, record_type, conditions_json, actions_json, severity, is_active, priority, created_by, created_at, updated_at)
VALUES (
  NULL, 'global',
  'Suggest Clergy from Tenure and Variants',
  'Suggests or normalizes canonical clergy name based on event date and configured variants.',
  'all',
  '{"any":[{"field":"clergy","operator":"is_empty"},{"field":"clergy","operator":"matches_entity_variant","value":{"entity_type":"clergy"}}]}',
  '[{"type":"suggest_value","field":"clergy","resolver":"best_matching_clergy_by_tenure_and_variant","auto_apply":false,"explanation_template":"Suggested officiant based on record event date and clergy active service periods."}]',
  'suggestion', 1, 30, 'system', NOW(), NOW()
);

-- Rule 6: Marriage bride and groom names should not be identical
INSERT INTO ocr_parish_rules (church_id, scope, name, description, record_type, conditions_json, actions_json, severity, is_active, priority, created_by, created_at, updated_at)
VALUES (
  NULL, 'global',
  'Identical Bride and Groom Names',
  'Flags marriages where the bride and groom have identical names, which likely indicates a data entry error.',
  'marriage',
  '{"all":[{"field":"groom_name","operator":"equals_field","value":"bride_name"},{"field":"groom_name","operator":"is_not_empty"}]}',
  '[{"type":"flag_for_review","field":"groom_name","explanation_template":"Bride and groom names are identical — please verify this is correct."}]',
  'warning', 1, 15, 'system', NOW(), NOW()
);

-- Rule 7: Single-character names require review
INSERT INTO ocr_parish_rules (church_id, scope, name, description, record_type, conditions_json, actions_json, severity, is_active, priority, created_by, created_at, updated_at)
VALUES (
  NULL, 'global',
  'Single-Character Name Review',
  'Flags records where a name field contains only a single character, which usually indicates incomplete OCR extraction.',
  'all',
  '{"any":[{"field":"first_name","operator":"length_less_than","value":2},{"field":"last_name","operator":"length_less_than","value":2},{"field":"child_first_name","operator":"length_less_than","value":2},{"field":"child_last_name","operator":"length_less_than","value":2}]}',
  '[{"type":"flag_for_review","field":"first_name","explanation_template":"A name field contains only a single character — please verify the extraction is complete."}]',
  'warning', 1, 12, 'system', NOW(), NOW()
);

-- Rule 8: Impossible ages require review (funeral)
INSERT INTO ocr_parish_rules (church_id, scope, name, description, record_type, conditions_json, actions_json, severity, is_active, priority, created_by, created_at, updated_at)
VALUES (
  NULL, 'global',
  'Impossible Age Review',
  'Flags funeral records where age at death exceeds 150 or is negative, indicating a likely OCR error.',
  'funeral',
  '{"any":[{"field":"age_at_death","operator":"greater_than","value":150},{"field":"age_at_death","operator":"less_than","value":0}]}',
  '[{"type":"flag_for_review","field":"age_at_death","explanation_template":"Age at death is outside the possible range (0-150) — please verify."}]',
  'warning', 1, 12, 'system', NOW(), NOW()
);

-- Rule 9: Clergy field should not be empty when required
INSERT INTO ocr_parish_rules (church_id, scope, name, description, record_type, conditions_json, actions_json, severity, is_active, priority, created_by, created_at, updated_at)
VALUES (
  NULL, 'global',
  'Missing Clergy Field',
  'Suggests that the clergy/officiant field should be filled in for complete records.',
  'all',
  '{"all":[{"field":"clergy","operator":"is_empty"}]}',
  '[{"type":"flag_for_review","field":"clergy","explanation_template":"The clergy/officiant field is empty — consider adding the officiating priest."}]',
  'suggestion', 1, 35, 'system', NOW(), NOW()
);
