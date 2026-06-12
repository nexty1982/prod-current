-- Stripe billing integration — customer IDs + webhook idempotency

ALTER TABLE onboarding_requests
  ADD COLUMN stripe_customer_id VARCHAR(100) NULL COMMENT 'Stripe Customer id' AFTER admin_notes,
  ADD COLUMN stripe_checkout_session_id VARCHAR(200) NULL AFTER stripe_customer_id,
  ADD COLUMN stripe_subscription_id VARCHAR(100) NULL AFTER stripe_checkout_session_id;

CREATE INDEX idx_onboarding_stripe_customer ON onboarding_requests (stripe_customer_id);

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id VARCHAR(255) NOT NULL PRIMARY KEY COMMENT 'Stripe event id (evt_*)',
  event_type VARCHAR(100) NOT NULL,
  onboarding_request_id VARCHAR(32) NULL,
  payload_json JSON NULL,
  processed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_stripe_webhook_onb (onboarding_request_id),
  INDEX idx_stripe_webhook_type (event_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
