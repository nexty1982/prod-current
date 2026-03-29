-- ═══════════════════════════════════════════════════════════════════
-- Translation Management System — Schema Migration
-- Date: 2026-03-28
-- Purpose: Professional source-versioned translation workflow
--
-- Creates:
--   translations_source    — English source of truth with MD5 hash
--   translations_localized — Per-language translations with status tracking
--   translation_change_log — Audit trail for English source edits
--
-- Migrates data from:
--   ui_translations (2,504 rows) → translations_localized
--   ENGLISH_DEFAULTS (631 keys)  → translations_source (seeded by companion JS script)
--
-- Also populates the existing `languages` table with all supported languages.
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. Populate languages table ───────────────────────────────────

INSERT IGNORE INTO languages (code, name_native, name_english, rtl, is_active)
VALUES
  ('en', 'English',   'English',   0, 1),
  ('el', 'Ελληνικά', 'Greek',     0, 1),
  ('ru', 'Русский',   'Russian',   0, 1),
  ('ro', 'Română',    'Romanian',  0, 1),
  ('ka', 'ქართული',  'Georgian',  0, 1);

-- ─── 2. Create translations_source ─────────────────────────────────

CREATE TABLE IF NOT EXISTS translations_source (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  translation_key VARCHAR(255) NOT NULL,
  namespace      VARCHAR(50)  NOT NULL,
  english_text   TEXT         NOT NULL,
  english_hash   CHAR(32)     NOT NULL COMMENT 'MD5 hash of english_text',
  description    VARCHAR(500) DEFAULT NULL COMMENT 'Context hint for translators',
  is_active      TINYINT(1)   NOT NULL DEFAULT 1,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by     INT UNSIGNED DEFAULT NULL,

  UNIQUE KEY uq_translation_key (translation_key),
  KEY idx_namespace (namespace),
  KEY idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 3. Create translations_localized ──────────────────────────────

CREATE TABLE IF NOT EXISTS translations_localized (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  translation_key     VARCHAR(255) NOT NULL,
  language_code       VARCHAR(10)  NOT NULL,
  translated_text     TEXT         NOT NULL,
  translated_from_hash CHAR(32)   DEFAULT NULL COMMENT 'english_hash at time of translation',
  status              ENUM('missing','current','outdated','draft','review')
                        NOT NULL DEFAULT 'review',
  notes               TEXT        DEFAULT NULL COMMENT 'Translator notes',
  created_at          TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by          INT UNSIGNED DEFAULT NULL,

  UNIQUE KEY uq_key_lang (translation_key, language_code),
  KEY idx_language_code (language_code),
  KEY idx_status (status),
  KEY idx_key_status (translation_key, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 4. Create translation_change_log ──────────────────────────────

CREATE TABLE IF NOT EXISTS translation_change_log (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  translation_key VARCHAR(255) NOT NULL,
  old_english_text TEXT        DEFAULT NULL,
  new_english_text TEXT        NOT NULL,
  old_hash        CHAR(32)    DEFAULT NULL,
  new_hash        CHAR(32)    NOT NULL,
  changed_by      INT UNSIGNED DEFAULT NULL,
  changed_at      TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,

  KEY idx_translation_key (translation_key),
  KEY idx_changed_at (changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 5. Note: seeding and data migration handled by companion script ──
-- Run: node server/database/migrations/20260328_seed_translation_tables.js
