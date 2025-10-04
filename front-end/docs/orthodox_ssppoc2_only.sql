-- DATABASE: orthodox_ssppoc2
-- ====================================
DROP DATABASE IF EXISTS `orthodox_ssppoc2`;
CREATE DATABASE `orthodox_ssppoc2`;
USE `orthodox_ssppoc2`;

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: baptism_records
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `baptism_records` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `birth_date` date DEFAULT NULL,
  `reception_date` date NOT NULL,
  `birthplace` varchar(150) DEFAULT NULL,
  `entry_type` varchar(50) DEFAULT NULL,
  `sponsors` text DEFAULT NULL,
  `parents` text NOT NULL,
  `clergy` varchar(150) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 3 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: church_info
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `church_info` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL DEFAULT 'ssppoc2',
  `address` text DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `email` varchar(255) DEFAULT 'frjames@ssppoc.org',
  `website` varchar(255) DEFAULT NULL,
  `primary_color` varchar(7) DEFAULT '#1976d2',
  `secondary_color` varchar(7) DEFAULT '#dc004e',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 2 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: funeral_records
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `funeral_records` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `birth_date` date DEFAULT NULL,
  `death_date` date NOT NULL,
  `funeral_date` date DEFAULT NULL,
  `burial_place` varchar(150) DEFAULT NULL,
  `clergy` varchar(150) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: marriage_records
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `marriage_records` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `groom_first_name` varchar(100) NOT NULL,
  `groom_last_name` varchar(100) NOT NULL,
  `bride_first_name` varchar(100) NOT NULL,
  `bride_last_name` varchar(100) NOT NULL,
  `marriage_date` date NOT NULL,
  `marriage_place` varchar(150) DEFAULT NULL,
  `witnesses` text DEFAULT NULL,
  `clergy` varchar(150) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: users
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `role` enum('admin', 'priest', 'deacon', 'secretary', 'viewer') DEFAULT 'viewer',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: baptism_records
# ------------------------------------------------------------

INSERT INTO
  `baptism_records` (
    `id`,
    `first_name`,
    `last_name`,
    `birth_date`,
    `reception_date`,
    `birthplace`,
    `entry_type`,
    `sponsors`,
    `parents`,
    `clergy`,
    `created_at`
  )
VALUES
  (
    1,
    'John',
    'Smith',
    NULL,
    '2024-01-15',
    NULL,
    NULL,
    NULL,
    'Michael and Sarah Smith',
    'Fr. Peter',
    '2025-07-09 09:02:31'
  );
INSERT INTO
  `baptism_records` (
    `id`,
    `first_name`,
    `last_name`,
    `birth_date`,
    `reception_date`,
    `birthplace`,
    `entry_type`,
    `sponsors`,
    `parents`,
    `clergy`,
    `created_at`
  )
VALUES
  (
    2,
    'Mary',
    'Johnson',
    NULL,
    '2024-02-20',
    NULL,
    NULL,
    NULL,
    'David and Anna Johnson',
    'Fr. Paul',
    '2025-07-09 09:02:31'
  );

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: church_info
# ------------------------------------------------------------

INSERT INTO
  `church_info` (
    `id`,
    `name`,
    `address`,
    `phone`,
    `email`,
    `website`,
    `primary_color`,
    `secondary_color`,
    `created_at`
  )
VALUES
  (
    1,
    'ssppoc2',
    NULL,
    NULL,
    'frjames@ssppoc.org',
    NULL,
    '#1976d2',
    '#dc004e',
    '2025-07-09 09:02:30'
  );

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: funeral_records
# ------------------------------------------------------------


# ------------------------------------------------------------
# DATA DUMP FOR TABLE: marriage_records
# ------------------------------------------------------------


# ------------------------------------------------------------
# DATA DUMP FOR TABLE: users
# ------------------------------------------------------------


/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;


-- End of orthodox_ssppoc2
