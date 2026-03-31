-- Migration: drop_change_set_items_fk_to_stale_om_daily
-- Date: 2026-03-31
-- Purpose: Remove FK from change_set_items.om_daily_item_id → orthodoxmetrics_db.om_daily_items
--          because canonical om_daily_items now lives in omai_db.
--          Referential integrity will be enforced at the application layer.
--          The column and index are preserved — only the FK constraint is dropped.

-- Step 1: Drop the foreign key
ALTER TABLE `orthodoxmetrics_db`.`change_set_items`
  DROP FOREIGN KEY `change_set_items_ibfk_2`;

-- Step 2: Verify the index still exists (it should survive FK drop, but be explicit)
-- The idx_item index on om_daily_item_id is kept for query performance.
-- If MariaDB dropped it with the FK, re-create it:
-- ALTER TABLE `orthodoxmetrics_db`.`change_set_items`
--   ADD INDEX `idx_item` (`om_daily_item_id`);
