-- phase_a_drop_legacy_user_fks_2025-08-09_1926.sql
-- Purpose: Safely drop ANY foreign keys in orthodoxmetrics_db that still reference _users_legacy.
-- This avoids update failures during orphan repair.
DELIMITER //

CREATE PROCEDURE drop_legacy_user_fks()
BEGIN
  DECLARE done INT DEFAULT FALSE;
  DECLARE v_tbl VARCHAR(128);
  DECLARE v_col VARCHAR(128);
  DECLARE v_fk  VARCHAR(128);
  DECLARE cur CURSOR FOR
    SELECT kcu.TABLE_NAME, kcu.COLUMN_NAME, kcu.CONSTRAINT_NAME
    FROM information_schema.KEY_COLUMN_USAGE kcu
    WHERE kcu.TABLE_SCHEMA='orthodoxmetrics_db'
      AND kcu.REFERENCED_TABLE_SCHEMA='orthodoxmetrics_db'
      AND kcu.REFERENCED_TABLE_NAME='_users_legacy';
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

  OPEN cur;
  read_loop: LOOP
    FETCH cur INTO v_tbl, v_col, v_fk;
    IF done THEN
      LEAVE read_loop;
    END IF;
    SET @sql = CONCAT('ALTER TABLE orthodoxmetrics_db.`', v_tbl, '` DROP FOREIGN KEY `', v_fk, '`');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END LOOP;
  CLOSE cur;
END //

DELIMITER ;

CALL drop_legacy_user_fks();
DROP PROCEDURE IF EXISTS drop_legacy_user_fks;
