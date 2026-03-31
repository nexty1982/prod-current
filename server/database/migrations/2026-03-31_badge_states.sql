-- Badge States — metadata-driven menu/component state badges
-- Supports NEW, Recently Updated, and acknowledged states with lifecycle defaults

CREATE TABLE IF NOT EXISTS badge_states (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  item_key      VARCHAR(100) NOT NULL UNIQUE COMMENT 'Unique identifier matching featureId or menu item key',
  badge_state   ENUM('new', 'recently_updated', 'none') NOT NULL DEFAULT 'none',
  badge_started_at  DATETIME     NULL COMMENT 'When the badge became active',
  badge_expires_at  DATETIME     NULL COMMENT 'Explicit expiry (computed from started_at + duration if NULL)',
  badge_duration_days INT        NULL COMMENT 'Override default duration (NEW=14, recently_updated=7)',
  badge_mode    ENUM('auto', 'manual', 'acknowledged') NOT NULL DEFAULT 'auto',
  badge_acknowledged_at DATETIME NULL COMMENT 'When badge was manually dismissed',
  badge_acknowledged_by VARCHAR(100) NULL COMMENT 'Who dismissed it',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_badge_state (badge_state),
  INDEX idx_badge_mode (badge_mode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
