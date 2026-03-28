-- record_template1 v1.1.0 backup (pre-v2 upgrade)
-- Date: 2026-03-28

DROP TABLE IF EXISTS `activity_log`;
CREATE TABLE `activity_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) DEFAULT NULL,
  `action` text DEFAULT NULL,
  `record_type` enum('baptism','marriage','funeral') DEFAULT NULL,
  `timestamp` datetime DEFAULT current_timestamp(),
  `church_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_act_time` (`timestamp`),
  KEY `idx_act_type` (`record_type`),
  KEY `idx_act_church` (`church_id`),
  KEY `idx_activity_log_church_id` (`church_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `baptism_history`;
CREATE TABLE `baptism_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `type` varchar(50) NOT NULL,
  `description` text NOT NULL,
  `timestamp` datetime NOT NULL,
  `record_id` int(11) DEFAULT NULL,
  `record_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`record_data`)),
  `church_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_bap_hist_rec` (`record_id`),
  KEY `idx_bap_hist_time` (`timestamp`),
  KEY `idx_baptism_history_church_id` (`church_id`),
  CONSTRAINT `fk_bap_hist_rec` FOREIGN KEY (`record_id`) REFERENCES `baptism_records` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `baptism_records`;
CREATE TABLE `baptism_records` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `first_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `birth_date` date DEFAULT NULL,
  `reception_date` date DEFAULT NULL,
  `birthplace` varchar(150) DEFAULT NULL,
  `entry_type` varchar(50) DEFAULT NULL,
  `sponsors` text DEFAULT NULL,
  `parents` text DEFAULT NULL,
  `clergy` varchar(150) DEFAULT NULL,
  `church_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_bap_name` (`last_name`,`first_name`),
  KEY `idx_bap_dates` (`birth_date`,`reception_date`),
  KEY `idx_bap_church` (`church_id`),
  KEY `idx_baptism_records_church_id` (`church_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `change_log`;
CREATE TABLE `change_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `table_name` varchar(64) DEFAULT NULL,
  `record_id` int(11) DEFAULT NULL,
  `column_name` varchar(64) DEFAULT NULL,
  `old_value` text DEFAULT NULL,
  `new_value` text DEFAULT NULL,
  `changed_at` datetime DEFAULT NULL,
  `changed_by` varchar(100) DEFAULT 'anonymous',
  `church_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_change_table` (`table_name`,`record_id`),
  KEY `idx_change_time` (`changed_at`),
  KEY `idx_change_church` (`church_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `church_settings`;
CREATE TABLE `church_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `church_name_display` varchar(255) DEFAULT NULL,
  `logo_url` varchar(255) DEFAULT NULL,
  `header_background_url` varchar(255) DEFAULT NULL,
  `primary_theme_color` varchar(7) DEFAULT '#6200EE',
  `secondary_theme_color` varchar(7) DEFAULT '#03DAC6',
  `contact_email` varchar(255) DEFAULT NULL,
  `contact_phone` varchar(50) DEFAULT NULL,
  `custom_header_html` text DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `funeral_history`;
CREATE TABLE `funeral_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `type` varchar(50) NOT NULL,
  `description` text NOT NULL,
  `timestamp` datetime NOT NULL,
  `record_id` int(11) DEFAULT NULL,
  `record_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`record_data`)),
  `church_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_fun_hist_rec` (`record_id`),
  KEY `idx_fun_hist_time` (`timestamp`),
  KEY `idx_funeral_history_church_id` (`church_id`),
  CONSTRAINT `fk_fun_hist_rec` FOREIGN KEY (`record_id`) REFERENCES `funeral_records` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `funeral_records`;
CREATE TABLE `funeral_records` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `deceased_date` date DEFAULT NULL,
  `burial_date` date DEFAULT NULL,
  `name` varchar(100) DEFAULT NULL,
  `lastname` varchar(100) DEFAULT NULL,
  `age` int(11) DEFAULT NULL,
  `clergy` varchar(150) DEFAULT NULL,
  `burial_location` text DEFAULT NULL,
  `church_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_fun_name` (`lastname`,`name`),
  KEY `idx_fun_dates` (`deceased_date`,`burial_date`),
  KEY `idx_fun_church` (`church_id`),
  KEY `idx_funeral_records_church_id` (`church_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `marriage_history`;
CREATE TABLE `marriage_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `type` varchar(50) NOT NULL,
  `description` text NOT NULL,
  `timestamp` datetime NOT NULL,
  `record_id` int(11) DEFAULT NULL,
  `record_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`record_data`)),
  `church_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_mar_hist_rec` (`record_id`),
  KEY `idx_mar_hist_time` (`timestamp`),
  KEY `idx_marriage_history_church_id` (`church_id`),
  CONSTRAINT `fk_mar_hist_rec` FOREIGN KEY (`record_id`) REFERENCES `marriage_records` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `marriage_records`;
CREATE TABLE `marriage_records` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `mdate` date DEFAULT NULL,
  `fname_groom` varchar(100) DEFAULT NULL,
  `lname_groom` varchar(100) DEFAULT NULL,
  `parentsg` varchar(200) DEFAULT NULL,
  `fname_bride` varchar(100) DEFAULT NULL,
  `lname_bride` varchar(100) DEFAULT NULL,
  `parentsb` varchar(200) DEFAULT NULL,
  `witness` text DEFAULT NULL,
  `mlicense` text DEFAULT NULL,
  `clergy` varchar(150) DEFAULT NULL,
  `church_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_marriage_records_church_id` (`church_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `ocr_jobs`;
CREATE TABLE `ocr_jobs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `church_id` int(11) NOT NULL,
  `filename` varchar(255) NOT NULL,
  `original_filename` varchar(255) DEFAULT NULL,
  `file_path` varchar(1024) DEFAULT NULL,
  `record_type` varchar(50) NOT NULL,
  `language` varchar(10) NOT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `status` enum('pending','processing','done','error') NOT NULL DEFAULT 'pending',
  `result_text` longtext DEFAULT NULL,
  `result_json` longtext DEFAULT NULL,
  `error_message` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_status_created` (`status`,`created_at`),
  KEY `idx_church_status` (`church_id`,`status`),
  KEY `idx_record_type` (`record_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `template_meta`;
CREATE TABLE `template_meta` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(64) NOT NULL,
  `description` text DEFAULT NULL,
  `source` varchar(255) DEFAULT NULL,
  `version` varchar(20) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL,
  `frozen_at` datetime DEFAULT NULL,
  `frozen_by` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `template_meta` (`id`,`name`,`description`,`source`,`version`,`created_at`,`updated_at`,`frozen_at`,`frozen_by`) VALUES (1,'record_template1','Canonical tenant database template. Audited and frozen 2026-03-28. All stale data removed, AUTO_INCREMENT values reset.','dump-orthodoxmetrics_ch_37-202508101846.sql','1.1.0','2025-08-10 22:54:01','2026-03-28 06:10:39','2026-03-28 06:10:39','omsvc (claude_cli audit)');
