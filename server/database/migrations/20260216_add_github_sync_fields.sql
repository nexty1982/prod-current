-- Add GitHub issue sync fields to om_daily_items
ALTER TABLE om_daily_items
  ADD COLUMN github_issue_number INT NULL AFTER metadata,
  ADD COLUMN github_synced_at DATETIME NULL AFTER github_issue_number;
