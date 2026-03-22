-- Translation status tracking: flags non-English text as needing review
-- when the English source content changes.
--
-- One row per content_key per language. Lightweight — no history, no blobs.

CREATE TABLE IF NOT EXISTS `translation_status` (
  `id`                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `content_key`         VARCHAR(200) NOT NULL COMMENT 'Dot-namespaced key, e.g. about.hero_title',
  `lang_code`           VARCHAR(10)  NOT NULL COMMENT 'el, ru, ro, ka',
  `source_version`      INT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'Incremented each time English text changes',
  `translation_version` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Set to source_version when translation is updated',
  `needs_update`        TINYINT(1)   NOT NULL DEFAULT 1 COMMENT '1 = translation is stale',
  `flagged_at`          TIMESTAMP    NULL DEFAULT NULL COMMENT 'When the key was last flagged as needing update',
  `resolved_at`         TIMESTAMP    NULL DEFAULT NULL COMMENT 'When the translation was last updated to match',
  `updated_at`          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_key_lang` (`content_key`, `lang_code`),
  KEY `idx_needs_update` (`needs_update`, `lang_code`),
  KEY `idx_content_key` (`content_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
