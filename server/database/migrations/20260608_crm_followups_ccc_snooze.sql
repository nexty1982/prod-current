-- Church Command Center: temporary dismiss (snooze) for CRM follow-ups
ALTER TABLE omai_crm_followups
  ADD COLUMN IF NOT EXISTS ccc_snooze_until DATETIME NULL COMMENT 'Hidden from Church Command Center until this time' AFTER completed_at;
