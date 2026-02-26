-- Rename email_records_enabled feature flag to om_assistant_enabled
-- Affects: churches.settings JSON column in orthodoxmetrics_db

UPDATE churches
SET settings = REPLACE(settings, '"email_records_enabled"', '"om_assistant_enabled"')
WHERE settings LIKE '%email_records_enabled%';

-- Also update global settings table if any rows reference this feature
UPDATE settings
SET key_name = 'features.om_assistant_enabled'
WHERE key_name = 'features.email_records_enabled';
