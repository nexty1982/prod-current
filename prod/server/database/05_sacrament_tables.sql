-- 05_sacrament_tables.sql
-- Canonical sacrament tables in orthodoxmetrics_db (idempotent, MySQL 8+)

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Baptism Records
CREATE TABLE IF NOT EXISTS orthodoxmetrics_db.baptism_records (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  church_id       BIGINT UNSIGNED NOT NULL,
  person_first    VARCHAR(120) NULL,
  person_middle   VARCHAR(120) NULL,
  person_last     VARCHAR(120) NULL,
  person_full     VARCHAR(360) GENERATED ALWAYS AS (TRIM(CONCAT_WS(' ', person_first, person_middle, person_last))) STORED,
  birth_date      DATE NULL,
  baptism_date    DATE NULL,
  certificate_no  VARCHAR(64) NULL,
  book_no         VARCHAR(32) NULL,
  page_no         VARCHAR(32) NULL,
  entry_no        VARCHAR(32) NULL,
  father_name     VARCHAR(360) NULL,
  mother_name     VARCHAR(360) NULL,
  godparents      JSON NULL,
  officiant_name  VARCHAR(360) NULL,
  place_name      VARCHAR(190) NULL,
  notes           TEXT NULL,
  source_system   VARCHAR(64) NULL,
  source_row_id   VARCHAR(64) NULL,
  source_hash     CHAR(40) NOT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_baptism_src (church_id, source_hash),
  UNIQUE KEY uq_baptism_cert (church_id, certificate_no),
  KEY idx_baptism_date (church_id, baptism_date),
  KEY idx_baptism_name (church_id, person_last),
  CONSTRAINT fk_baptism_church FOREIGN KEY (church_id) REFERENCES orthodoxmetrics_db.churches(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Marriage Records
CREATE TABLE IF NOT EXISTS orthodoxmetrics_db.marriage_records (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  church_id       BIGINT UNSIGNED NOT NULL,
  groom_first     VARCHAR(120) NULL,
  groom_middle    VARCHAR(120) NULL,
  groom_last      VARCHAR(120) NULL,
  groom_full      VARCHAR(360) GENERATED ALWAYS AS (TRIM(CONCAT_WS(' ', groom_first, groom_middle, groom_last))) STORED,
  bride_first     VARCHAR(120) NULL,
  bride_middle    VARCHAR(120) NULL,
  bride_last      VARCHAR(120) NULL,
  bride_full      VARCHAR(360) GENERATED ALWAYS AS (TRIM(CONCAT_WS(' ', bride_first, bride_middle, bride_last))) STORED,
  marriage_date   DATE NULL,
  certificate_no  VARCHAR(64) NULL,
  book_no         VARCHAR(32) NULL,
  page_no         VARCHAR(32) NULL,
  entry_no        VARCHAR(32) NULL,
  witnesses       JSON NULL,
  officiant_name  VARCHAR(360) NULL,
  place_name      VARCHAR(190) NULL,
  notes           TEXT NULL,
  source_system   VARCHAR(64) NULL,
  source_row_id   VARCHAR(64) NULL,
  source_hash     CHAR(40) NOT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_marriage_src (church_id, source_hash),
  UNIQUE KEY uq_marriage_cert (church_id, certificate_no),
  KEY idx_marriage_date (church_id, marriage_date),
  KEY idx_marriage_groom (church_id, groom_last),
  KEY idx_marriage_bride (church_id, bride_last),
  CONSTRAINT fk_marriage_church FOREIGN KEY (church_id) REFERENCES orthodoxmetrics_db.churches(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Funeral Records
CREATE TABLE IF NOT EXISTS orthodoxmetrics_db.funeral_records (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  church_id       BIGINT UNSIGNED NOT NULL,
  deceased_first  VARCHAR(120) NULL,
  deceased_middle VARCHAR(120) NULL,
  deceased_last   VARCHAR(120) NULL,
  deceased_full   VARCHAR(360) GENERATED ALWAYS AS (TRIM(CONCAT_WS(' ', deceased_first, deceased_middle, deceased_last))) STORED,
  birth_date      DATE NULL,
  death_date      DATE NULL,
  funeral_date    DATE NULL,
  certificate_no  VARCHAR(64) NULL,
  book_no         VARCHAR(32) NULL,
  page_no         VARCHAR(32) NULL,
  entry_no        VARCHAR(32) NULL,
  burial_place    VARCHAR(190) NULL,
  cause_of_death  VARCHAR(190) NULL,
  officiant_name  VARCHAR(360) NULL,
  place_name      VARCHAR(190) NULL,
  notes           TEXT NULL,
  source_system   VARCHAR(64) NULL,
  source_row_id   VARCHAR(64) NULL,
  source_hash     CHAR(40) NOT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_funeral_src (church_id, source_hash),
  UNIQUE KEY uq_funeral_cert (church_id, certificate_no),
  KEY idx_funeral_date (church_id, funeral_date),
  KEY idx_funeral_name (church_id, deceased_last),
  CONSTRAINT fk_funeral_church FOREIGN KEY (church_id) REFERENCES orthodoxmetrics_db.churches(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;