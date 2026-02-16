-- Settings Registry Expansion — 2026-02-15
-- Adds ~38 new settings across features, ocr, and records.search categories.
-- Safe to re-run: uses INSERT IGNORE to skip existing keys.

-- ── Feature Flags (category: features) ──────────────────────────────────────
INSERT IGNORE INTO settings_registry (`key`, `type`, category, default_value, description)
VALUES
  ('features.interactiveReports', 'bool', 'features', 'true',  'Enable Interactive Reports module'),
  ('features.notifications',     'bool', 'features', 'true',  'Enable notification system'),
  ('features.ocr',               'bool', 'features', 'true',  'Enable OCR pipeline'),
  ('features.invoices',          'bool', 'features', 'true',  'Enable invoice features'),
  ('features.legacyOcrRoutes',   'bool', 'features', 'false', 'Enable legacy /api/ocr/* routes'),
  ('features.recordsLegacy',     'bool', 'features', 'false', 'Enable legacy records UI'),
  ('features.latestEnvironment', 'bool', 'features', 'true',  'Enable latest/stable environment gating'),
  ('features.devBanners',        'bool', 'features', 'true',  'Show development banners for latest features');

-- ── OCR Worker (category: ocr) ──────────────────────────────────────────────
INSERT IGNORE INTO settings_registry (`key`, `type`, category, default_value, description)
VALUES
  ('ocr.worker.pollBatchSize',            'number', 'ocr', '5',                 'Jobs to claim per poll cycle'),
  ('ocr.worker.pollIdleMs',               'number', 'ocr', '5000',              'Polling interval when no jobs (ms)'),
  ('ocr.worker.pollBusyMs',               'number', 'ocr', '1000',              'Polling interval when processing (ms)'),
  ('ocr.worker.heartbeatEvery',           'number', 'ocr', '6',                 'Log heartbeat every N idle cycles'),
  ('ocr.visionApi.timeoutMs',             'number', 'ocr', '60000',             'Google Vision API call timeout (ms)'),
  ('ocr.visionApi.languageHints',         'json',   'ocr', '["el","ru","en"]',  'Language hints for Vision API'),
  ('ocr.scoring.confidenceWeight',        'number', 'ocr', '0.7',              'Weight for OCR confidence in combined score'),
  ('ocr.scoring.qualityWeight',           'number', 'ocr', '0.3',              'Weight for quality score in combined score'),
  ('ocr.scoring.acceptThreshold',         'number', 'ocr', '0.85',             'Combined score threshold for auto-accept'),
  ('ocr.scoring.reviewThreshold',         'number', 'ocr', '0.6',              'Combined score threshold for review (below = reject)'),
  ('ocr.classifier.confidenceThreshold',  'number', 'ocr', '0.3',              'Min confidence for classifier suggestions');

-- ── Search Weights — Baptism (category: records.search) ─────────────────────
INSERT IGNORE INTO settings_registry (`key`, `type`, category, default_value, description)
VALUES
  ('records.search.baptism.last_name',  'number', 'records.search', '12', 'Weight for last name field in baptism search'),
  ('records.search.baptism.first_name', 'number', 'records.search', '9',  'Weight for first name field'),
  ('records.search.baptism.parents',    'number', 'records.search', '7',  'Weight for parents field'),
  ('records.search.baptism.sponsors',   'number', 'records.search', '6',  'Weight for sponsors field'),
  ('records.search.baptism.birthplace', 'number', 'records.search', '4',  'Weight for birthplace field'),
  ('records.search.baptism.entry_type', 'number', 'records.search', '2',  'Weight for entry type field'),
  ('records.search.baptism.clergy',     'number', 'records.search', '1',  'Weight for clergy field');

-- ── Search Weights — Marriage (category: records.search) ────────────────────
INSERT IGNORE INTO settings_registry (`key`, `type`, category, default_value, description)
VALUES
  ('records.search.marriage.lname_groom', 'number', 'records.search', '12', 'Weight for groom last name'),
  ('records.search.marriage.lname_bride', 'number', 'records.search', '12', 'Weight for bride last name'),
  ('records.search.marriage.fname_groom', 'number', 'records.search', '9',  'Weight for groom first name'),
  ('records.search.marriage.fname_bride', 'number', 'records.search', '9',  'Weight for bride first name'),
  ('records.search.marriage.parentsg',    'number', 'records.search', '7',  'Weight for groom parents'),
  ('records.search.marriage.parentsb',    'number', 'records.search', '7',  'Weight for bride parents'),
  ('records.search.marriage.witness',     'number', 'records.search', '6',  'Weight for witness field'),
  ('records.search.marriage.clergy',      'number', 'records.search', '4',  'Weight for clergy field');

-- ── Search Weights — Funeral (category: records.search) ─────────────────────
INSERT IGNORE INTO settings_registry (`key`, `type`, category, default_value, description)
VALUES
  ('records.search.funeral.lastname',        'number', 'records.search', '12', 'Weight for deceased last name'),
  ('records.search.funeral.name',            'number', 'records.search', '9',  'Weight for deceased first name'),
  ('records.search.funeral.clergy',          'number', 'records.search', '6',  'Weight for clergy field'),
  ('records.search.funeral.burial_location', 'number', 'records.search', '4',  'Weight for burial location');
