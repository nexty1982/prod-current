-- Fix the data type mismatch for church_id foreign keys
-- The churches table has id as INT(11), not BIGINT UNSIGNED

DELIMITER $$

-- Drop and recreate the procedure with correct data type
DROP PROCEDURE IF EXISTS `orthodoxmetrics_db`.`omx_add_church_fk` $$

CREATE PROCEDURE `orthodoxmetrics_db`.`omx_add_church_fk` (IN p_table VARCHAR(128), IN p_nullable TINYINT)
BEGIN
  DECLARE has_col INT DEFAULT 0;
  SELECT COUNT(*) INTO has_col
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA='orthodoxmetrics_db' AND TABLE_NAME=p_table AND COLUMN_NAME='church_id';

  IF has_col = 0 THEN
    -- Use INT(11) to match the churches.id column type
    SET @sql = CONCAT('ALTER TABLE `orthodoxmetrics_db`.`', p_table, '` ADD COLUMN `church_id` INT(11) ', IF(p_nullable=1,'NULL','NOT NULL'), ' AFTER `id`;');
    PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;

  -- Add index if missing
  SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA='orthodoxmetrics_db' AND TABLE_NAME=p_table AND INDEX_NAME=CONCAT('idx_', p_table, '_church'));
  IF @exists = 0 THEN
    SET @sql = CONCAT('CREATE INDEX `idx_', p_table, '_church` ON `orthodoxmetrics_db`.`', p_table, '` (`church_id`)');
    PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;

  -- Add FK if missing
  SET @fk = CONCAT('fk_', p_table, '_church');
  SET @fk_exists = (SELECT COUNT(*) FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA='orthodoxmetrics_db' AND CONSTRAINT_NAME=@fk);
  IF @fk_exists = 0 THEN
    SET @sql = CONCAT('ALTER TABLE `orthodoxmetrics_db`.`', p_table, '` ADD CONSTRAINT `', @fk, '` FOREIGN KEY (`church_id`) REFERENCES `orthodoxmetrics_db`.`churches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;');
    PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END $$

-- Also fix the users table FK if needed
DROP PROCEDURE IF EXISTS `orthodoxmetrics_db`.`omx_fix_users_church_fk` $$
CREATE PROCEDURE `orthodoxmetrics_db`.`omx_fix_users_church_fk` ()
BEGIN
  -- Check if users.church_id exists and has wrong type
  SET @col_type = (SELECT DATA_TYPE FROM information_schema.COLUMNS 
                   WHERE TABLE_SCHEMA='orthodoxmetrics_db' 
                   AND TABLE_NAME='users' 
                   AND COLUMN_NAME='church_id');
  
  IF @col_type = 'bigint' THEN
    -- Drop the FK first
    SET @fk_exists = (SELECT COUNT(*) FROM information_schema.REFERENTIAL_CONSTRAINTS 
                      WHERE CONSTRAINT_SCHEMA='orthodoxmetrics_db' 
                      AND TABLE_NAME='users' 
                      AND CONSTRAINT_NAME='fk_users_church');
    IF @fk_exists > 0 THEN
      ALTER TABLE `orthodoxmetrics_db`.`users` DROP FOREIGN KEY `fk_users_church`;
    END IF;
    
    -- Change column type
    ALTER TABLE `orthodoxmetrics_db`.`users` MODIFY COLUMN `church_id` INT(11) NULL;
    
    -- Re-add FK
    ALTER TABLE `orthodoxmetrics_db`.`users` 
      ADD CONSTRAINT `fk_users_church` 
      FOREIGN KEY (`church_id`) 
      REFERENCES `orthodoxmetrics_db`.`churches`(`id`) 
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$

DELIMITER ;

-- Fix the users table first
CALL orthodoxmetrics_db.omx_fix_users_church_fk();
