/**
 * Database Migration: Add Indexes for Power Search (schema-aware, MariaDB-safe)
 *
 * Purpose: Optimize search performance for baptism_records across om_church_{id} DBs
 *
 * Behavior:
 * - Detects column variants per tenant DB
 * - Creates only valid indexes for the current schema
 * - Safe to re-run (checks information_schema.statistics)
 */

SELECT DATABASE() AS current_database;

SELECT
  COUNT(*) AS has_baptism_records
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'baptism_records';

SET @col_church_id := (
  SELECT COLUMN_NAME
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'baptism_records'
    AND COLUMN_NAME = 'church_id'
  LIMIT 1
);

SET @col_last := (
  SELECT COLUMN_NAME
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'baptism_records'
    AND COLUMN_NAME IN ('person_last','last_name','surname','family_name','child_last_name','person_last_name')
  ORDER BY FIELD(COLUMN_NAME,'person_last','last_name','surname','family_name','child_last_name','person_last_name')
  LIMIT 1
);

SET @col_first := (
  SELECT COLUMN_NAME
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'baptism_records'
    AND COLUMN_NAME IN ('person_first','first_name','given_name','child_first_name','person_first_name')
  ORDER BY FIELD(COLUMN_NAME,'person_first','first_name','given_name','child_first_name','person_first_name')
  LIMIT 1
);

SET @col_full := (
  SELECT COLUMN_NAME
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'baptism_records'
    AND COLUMN_NAME IN ('person_full','full_name','person_name','child_full_name')
  ORDER BY FIELD(COLUMN_NAME,'person_full','full_name','person_name','child_full_name')
  LIMIT 1
);

SET @col_birth_date := (
  SELECT COLUMN_NAME
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'baptism_records'
    AND COLUMN_NAME IN ('birth_date','date_of_birth','dob')
  ORDER BY FIELD(COLUMN_NAME,'birth_date','date_of_birth','dob')
  LIMIT 1
);

SET @col_baptism_date := (
  SELECT COLUMN_NAME
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'baptism_records'
    AND COLUMN_NAME IN ('baptism_date','date_of_baptism')
  ORDER BY FIELD(COLUMN_NAME,'baptism_date','date_of_baptism')
  LIMIT 1
);

SET @col_reception_date := (
  SELECT COLUMN_NAME
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'baptism_records'
    AND COLUMN_NAME IN ('reception_date','chrismation_date','received_date')
  ORDER BY FIELD(COLUMN_NAME,'reception_date','chrismation_date','received_date')
  LIMIT 1
);

SET @col_officiant := (
  SELECT COLUMN_NAME
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'baptism_records'
    AND COLUMN_NAME IN ('officiant_name','clergy_name','priest_name','officiant')
  ORDER BY FIELD(COLUMN_NAME,'officiant_name','clergy_name','priest_name','officiant')
  LIMIT 1
);

SET @col_place := (
  SELECT COLUMN_NAME
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'baptism_records'
    AND COLUMN_NAME IN ('place_name','place','location','baptism_place')
  ORDER BY FIELD(COLUMN_NAME,'place_name','place','location','baptism_place')
  LIMIT 1
);

SET @col_certificate := (
  SELECT COLUMN_NAME
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'baptism_records'
    AND COLUMN_NAME IN ('certificate_no','certificate_number','cert_no')
  ORDER BY FIELD(COLUMN_NAME,'certificate_no','certificate_number','cert_no')
  LIMIT 1
);

SET @col_entry := (
  SELECT COLUMN_NAME
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'baptism_records'
    AND COLUMN_NAME IN ('entry_no','entry_number','record_no','record_number')
  ORDER BY FIELD(COLUMN_NAME,'entry_no','entry_number','record_no','record_number')
  LIMIT 1
);

SELECT
  @col_church_id AS church_id_col,
  @col_last AS last_col,
  @col_first AS first_col,
  @col_full AS full_col,
  @col_birth_date AS birth_date_col,
  @col_baptism_date AS baptism_date_col,
  @col_reception_date AS reception_date_col,
  @col_officiant AS officiant_col,
  @col_place AS place_col,
  @col_certificate AS certificate_col,
  @col_entry AS entry_col;

DELIMITER //

DROP PROCEDURE IF EXISTS om_try_create_index//
CREATE PROCEDURE om_try_create_index(IN p_table VARCHAR(64), IN p_index VARCHAR(64), IN p_cols TEXT)
BEGIN
  DECLARE v_exists INT DEFAULT 0;

  SELECT COUNT(*)
  INTO v_exists
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = p_table
    AND INDEX_NAME = p_index;

  IF v_exists = 0 THEN
    SET @sql = CONCAT('CREATE INDEX ', p_index, ' ON ', p_table, ' (', p_cols, ')');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END//

DROP PROCEDURE IF EXISTS om_apply_power_search_indexes//
CREATE PROCEDURE om_apply_power_search_indexes()
BEGIN
  DECLARE ok INT DEFAULT 0;
  DECLARE cols TEXT DEFAULT NULL;

  SET ok = IF(@col_church_id IS NULL, 0, 1);

  SET cols = IF(ok=1 AND @col_last IS NOT NULL, CONCAT('church_id, ', @col_last), NULL);
  IF cols IS NOT NULL THEN CALL om_try_create_index('baptism_records','idx_church_lastname',cols); END IF;

  SET cols = IF(ok=1 AND @col_first IS NOT NULL, CONCAT('church_id, ', @col_first), NULL);
  IF cols IS NOT NULL THEN CALL om_try_create_index('baptism_records','idx_church_firstname',cols); END IF;

  SET cols = IF(ok=1 AND @col_full IS NOT NULL, CONCAT('church_id, ', @col_full), NULL);
  IF cols IS NOT NULL THEN CALL om_try_create_index('baptism_records','idx_church_fullname',cols); END IF;

  SET cols = IF(ok=1 AND @col_birth_date IS NOT NULL, CONCAT('church_id, ', @col_birth_date), NULL);
  IF cols IS NOT NULL THEN CALL om_try_create_index('baptism_records','idx_church_birthdate',cols); END IF;

  SET cols = IF(ok=1 AND @col_baptism_date IS NOT NULL, CONCAT('church_id, ', @col_baptism_date), NULL);
  IF cols IS NOT NULL THEN CALL om_try_create_index('baptism_records','idx_church_baptismdate',cols); END IF;

  SET cols = IF(ok=1 AND @col_reception_date IS NOT NULL, CONCAT('church_id, ', @col_reception_date), NULL);
  IF cols IS NOT NULL THEN CALL om_try_create_index('baptism_records','idx_church_receptiondate',cols); END IF;

  SET cols = IF(ok=1 AND @col_officiant IS NOT NULL, CONCAT('church_id, ', @col_officiant), NULL);
  IF cols IS NOT NULL THEN CALL om_try_create_index('baptism_records','idx_church_officiant',cols); END IF;

  SET cols = IF(ok=1 AND @col_place IS NOT NULL, CONCAT('church_id, ', @col_place), NULL);
  IF cols IS NOT NULL THEN CALL om_try_create_index('baptism_records','idx_church_place',cols); END IF;

  SET cols = IF(
    ok=1 AND @col_baptism_date IS NOT NULL AND @col_last IS NOT NULL AND @col_first IS NOT NULL,
    CONCAT('church_id, ', @col_baptism_date, ', ', @col_last, ', ', @col_first),
    NULL
  );
  IF cols IS NOT NULL THEN CALL om_try_create_index('baptism_records','idx_church_date_name',cols); END IF;

  SET cols = IF(ok=1 AND @col_certificate IS NOT NULL, CONCAT('church_id, ', @col_certificate), NULL);
  IF cols IS NOT NULL THEN CALL om_try_create_index('baptism_records','idx_church_certificate',cols); END IF;

  SET cols = IF(ok=1 AND @col_entry IS NOT NULL, CONCAT('church_id, ', @col_entry), NULL);
  IF cols IS NOT NULL THEN CALL om_try_create_index('baptism_records','idx_church_entry',cols); END IF;
END//

DELIMITER ;

CALL om_apply_power_search_indexes();

DROP PROCEDURE IF EXISTS om_apply_power_search_indexes;
DROP PROCEDURE IF EXISTS om_try_create_index;

SHOW INDEXES FROM baptism_records;
ANALYZE TABLE baptism_records;

SELECT 'Power Search indexes created (schema-aware, MariaDB-safe)!' AS status;
