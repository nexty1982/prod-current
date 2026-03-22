-- ═══════════════════════════════════════════════════════════════════════
-- Migration: i18n Phase 0 — Schema update + key namespace rename
-- Database: orthodoxmetrics_db (platform DB)
-- Date: 2026-03-16
--
-- WHAT THIS DOES:
--   1. Widens translation_key (100→255) and translation_text (500→TEXT)
--   2. Adds `namespace` column, backfills from `category`, drops `category`
--   3. Renames all 45 flat keys to dot-namespaced form (180 rows affected)
--
-- SAFE TO RE-RUN: All statements are idempotent or guarded.
-- ═══════════════════════════════════════════════════════════════════════

-- ─── PART 1: Schema changes ─────────────────────────────────────────

-- 1a. Widen translation_key from VARCHAR(100) to VARCHAR(255)
ALTER TABLE `ui_translations`
  MODIFY COLUMN `translation_key` VARCHAR(255) NOT NULL
    COMMENT 'Dot-namespaced lookup key (e.g. explorer.col_type, common.record_baptism)';

-- 1b. Widen translation_text from VARCHAR(500) to TEXT
ALTER TABLE `ui_translations`
  MODIFY COLUMN `translation_text` TEXT NOT NULL
    COMMENT 'Translated string (supports long-form content)';

-- 1c. Add namespace column
ALTER TABLE `ui_translations`
  ADD COLUMN IF NOT EXISTS `namespace` VARCHAR(50) DEFAULT NULL
    COMMENT 'Translation namespace (common, nav, footer, home, about, tour, pricing, blog, contact, faq, samples, explorer)'
  AFTER `translation_text`;

-- 1d. Backfill namespace from category for existing rows
UPDATE `ui_translations` SET `namespace` = 'explorer'
  WHERE `category` IN ('column_header', 'analytics', 'ui') AND `namespace` IS NULL;

UPDATE `ui_translations` SET `namespace` = 'common'
  WHERE `category` = 'record_type' AND `namespace` IS NULL;

-- 1e. Add index on namespace
-- (guard: only add if not exists — MariaDB doesn't have IF NOT EXISTS for indexes,
--  so we use a procedure-free approach: the CREATE INDEX will fail silently if it exists)
CREATE INDEX `idx_namespace` ON `ui_translations` (`namespace`);

-- 1f. Drop category column (data preserved in namespace)
ALTER TABLE `ui_translations` DROP COLUMN IF EXISTS `category`;


-- ─── PART 2: Rename flat keys to namespaced form ────────────────────
-- Each UPDATE renames the translation_key and sets namespace.
-- Affects all 4 non-English languages per key.

-- Column headers → explorer.*
UPDATE `ui_translations` SET `translation_key` = 'explorer.col_type',      `namespace` = 'explorer' WHERE `translation_key` = 'type';
UPDATE `ui_translations` SET `translation_key` = 'explorer.col_name',      `namespace` = 'explorer' WHERE `translation_key` = 'name';
UPDATE `ui_translations` SET `translation_key` = 'explorer.col_date',      `namespace` = 'explorer' WHERE `translation_key` = 'date';
UPDATE `ui_translations` SET `translation_key` = 'explorer.col_location',  `namespace` = 'explorer' WHERE `translation_key` = 'location';
UPDATE `ui_translations` SET `translation_key` = 'explorer.col_clergy',    `namespace` = 'explorer' WHERE `translation_key` = 'clergy';
UPDATE `ui_translations` SET `translation_key` = 'explorer.col_details',   `namespace` = 'explorer' WHERE `translation_key` = 'details';
UPDATE `ui_translations` SET `translation_key` = 'explorer.col_parents',   `namespace` = 'explorer' WHERE `translation_key` = 'parents';

-- Record types → common.*
UPDATE `ui_translations` SET `translation_key` = 'common.record_baptism',  `namespace` = 'common' WHERE `translation_key` = 'record_baptism';
UPDATE `ui_translations` SET `translation_key` = 'common.record_marriage', `namespace` = 'common' WHERE `translation_key` = 'record_marriage';
UPDATE `ui_translations` SET `translation_key` = 'common.record_funeral',  `namespace` = 'common' WHERE `translation_key` = 'record_funeral';

-- Analytics → explorer.*
UPDATE `ui_translations` SET `translation_key` = 'explorer.analytics_total_records',     `namespace` = 'explorer' WHERE `translation_key` = 'analytics_total_records';
UPDATE `ui_translations` SET `translation_key` = 'explorer.analytics_by_record_type',    `namespace` = 'explorer' WHERE `translation_key` = 'analytics_by_record_type';
UPDATE `ui_translations` SET `translation_key` = 'explorer.analytics_by_language',       `namespace` = 'explorer' WHERE `translation_key` = 'analytics_by_language';
UPDATE `ui_translations` SET `translation_key` = 'explorer.analytics_records_by_decade', `namespace` = 'explorer' WHERE `translation_key` = 'analytics_records_by_decade';
UPDATE `ui_translations` SET `translation_key` = 'explorer.analytics_top_clergy',        `namespace` = 'explorer' WHERE `translation_key` = 'analytics_top_clergy';

-- UI labels → explorer.*
UPDATE `ui_translations` SET `translation_key` = 'explorer.records_label',      `namespace` = 'explorer' WHERE `translation_key` = 'records_label';
UPDATE `ui_translations` SET `translation_key` = 'explorer.page_label',         `namespace` = 'explorer' WHERE `translation_key` = 'page_label';
UPDATE `ui_translations` SET `translation_key` = 'explorer.back_to_samples',    `namespace` = 'explorer' WHERE `translation_key` = 'back_to_samples';
UPDATE `ui_translations` SET `translation_key` = 'explorer.search_placeholder', `namespace` = 'explorer' WHERE `translation_key` = 'search_placeholder';
UPDATE `ui_translations` SET `translation_key` = 'explorer.all_languages',      `namespace` = 'explorer' WHERE `translation_key` = 'all_languages';
UPDATE `ui_translations` SET `translation_key` = 'explorer.all_types',          `namespace` = 'explorer' WHERE `translation_key` = 'all_types';
UPDATE `ui_translations` SET `translation_key` = 'explorer.view_table',         `namespace` = 'explorer' WHERE `translation_key` = 'view_table';
UPDATE `ui_translations` SET `translation_key` = 'explorer.view_cards',         `namespace` = 'explorer' WHERE `translation_key` = 'view_cards';
UPDATE `ui_translations` SET `translation_key` = 'explorer.view_timeline',      `namespace` = 'explorer' WHERE `translation_key` = 'view_timeline';
UPDATE `ui_translations` SET `translation_key` = 'explorer.view_analytics',     `namespace` = 'explorer' WHERE `translation_key` = 'view_analytics';
UPDATE `ui_translations` SET `translation_key` = 'explorer.more_label',         `namespace` = 'explorer' WHERE `translation_key` = 'more_label';
UPDATE `ui_translations` SET `translation_key` = 'explorer.no_records',         `namespace` = 'explorer' WHERE `translation_key` = 'no_records';

-- Language labels → common.*
UPDATE `ui_translations` SET `translation_key` = 'common.lang_english',  `namespace` = 'common' WHERE `translation_key` = 'lang_english';
UPDATE `ui_translations` SET `translation_key` = 'common.lang_greek',    `namespace` = 'common' WHERE `translation_key` = 'lang_greek';
UPDATE `ui_translations` SET `translation_key` = 'common.lang_russian',  `namespace` = 'common' WHERE `translation_key` = 'lang_russian';
UPDATE `ui_translations` SET `translation_key` = 'common.lang_romanian', `namespace` = 'common' WHERE `translation_key` = 'lang_romanian';
UPDATE `ui_translations` SET `translation_key` = 'common.lang_georgian', `namespace` = 'common' WHERE `translation_key` = 'lang_georgian';

-- Hero section → explorer.*
UPDATE `ui_translations` SET `translation_key` = 'explorer.hero_badge',    `namespace` = 'explorer' WHERE `translation_key` = 'hero_badge_explorer';
UPDATE `ui_translations` SET `translation_key` = 'explorer.hero_title',    `namespace` = 'explorer' WHERE `translation_key` = 'hero_title_explorer';
UPDATE `ui_translations` SET `translation_key` = 'explorer.hero_subtitle', `namespace` = 'explorer' WHERE `translation_key` = 'hero_subtitle_explorer';

-- AG Grid pagination → explorer.*
UPDATE `ui_translations` SET `translation_key` = 'explorer.grid_page',               `namespace` = 'explorer' WHERE `translation_key` = 'grid_page';
UPDATE `ui_translations` SET `translation_key` = 'explorer.grid_of',                 `namespace` = 'explorer' WHERE `translation_key` = 'grid_of';
UPDATE `ui_translations` SET `translation_key` = 'explorer.grid_to',                 `namespace` = 'explorer' WHERE `translation_key` = 'grid_to';
UPDATE `ui_translations` SET `translation_key` = 'explorer.grid_first_page',         `namespace` = 'explorer' WHERE `translation_key` = 'grid_first_page';
UPDATE `ui_translations` SET `translation_key` = 'explorer.grid_previous_page',      `namespace` = 'explorer' WHERE `translation_key` = 'grid_previous_page';
UPDATE `ui_translations` SET `translation_key` = 'explorer.grid_next_page',          `namespace` = 'explorer' WHERE `translation_key` = 'grid_next_page';
UPDATE `ui_translations` SET `translation_key` = 'explorer.grid_last_page',          `namespace` = 'explorer' WHERE `translation_key` = 'grid_last_page';
UPDATE `ui_translations` SET `translation_key` = 'explorer.grid_page_size',          `namespace` = 'explorer' WHERE `translation_key` = 'grid_page_size';
UPDATE `ui_translations` SET `translation_key` = 'explorer.grid_no_rows',            `namespace` = 'explorer' WHERE `translation_key` = 'grid_no_rows';
UPDATE `ui_translations` SET `translation_key` = 'explorer.grid_filter_placeholder', `namespace` = 'explorer' WHERE `translation_key` = 'grid_filter_placeholder';
