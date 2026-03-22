-- Email verification tokens for self-service email verification flow.
-- Token is sent to user's email; submitting it back sets users.email_verified = 1.

CREATE TABLE IF NOT EXISTS `orthodoxmetrics_db`.`email_verification_tokens` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    INT NOT NULL,
  `token_hash` VARCHAR(128) NOT NULL COMMENT 'SHA-256 hash of the token (raw token is only in the email)',
  `expires_at` DATETIME NOT NULL,
  `used_at`    DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_token_hash` (`token_hash`),
  INDEX `idx_expires_at` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
