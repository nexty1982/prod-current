/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19  Distrib 10.6.22-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: om_church_46
-- ------------------------------------------------------
-- Server version	10.6.22-MariaDB-0ubuntu0.22.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `activity_log`
--

DROP TABLE IF EXISTS `activity_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `activity_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) DEFAULT NULL,
  `action` text DEFAULT NULL,
  `record_type` enum('baptism','marriage','funeral') DEFAULT NULL,
  `timestamp` datetime DEFAULT current_timestamp(),
  `church_id` int(11) NOT NULL DEFAULT @`CID`,
  PRIMARY KEY (`id`),
  KEY `idx_activity_log_church_id` (`church_id`)
) ENGINE=InnoDB AUTO_INCREMENT=523 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ag_grid_config`
--

DROP TABLE IF EXISTS `ag_grid_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ag_grid_config` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `table_name` varchar(191) NOT NULL,
  `config_name` varchar(255) NOT NULL DEFAULT 'default',
  `is_active` tinyint(1) DEFAULT 1,
  `grid_options` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '{}' CHECK (json_valid(`grid_options`)),
  `column_definitions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '[]' CHECK (json_valid(`column_definitions`)),
  `default_column_state` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '{}' CHECK (json_valid(`default_column_state`)),
  `filter_model` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '{}' CHECK (json_valid(`filter_model`)),
  `sort_model` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '[]' CHECK (json_valid(`sort_model`)),
  `grid_settings` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '{}' CHECK (json_valid(`grid_settings`)),
  `theme_settings` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '{}' CHECK (json_valid(`theme_settings`)),
  `export_settings` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '{}' CHECK (json_valid(`export_settings`)),
  `user_preferences` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '{}' CHECK (json_valid(`user_preferences`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_table_config` (`table_name`,`config_name`),
  KEY `idx_table_name` (`table_name`),
  KEY `idx_config_name` (`config_name`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `baptism_history`
--

DROP TABLE IF EXISTS `baptism_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `baptism_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `type` varchar(50) NOT NULL,
  `description` text NOT NULL,
  `timestamp` datetime NOT NULL DEFAULT current_timestamp(),
  `record_id` int(11) DEFAULT NULL,
  `record_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`record_data`)),
  `diff_data` longtext DEFAULT NULL,
  `church_id` int(11) DEFAULT NULL,
  `actor_user_id` int(11) DEFAULT NULL,
  `source` varchar(20) NOT NULL DEFAULT 'system',
  `request_id` varchar(64) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_bap_hist_rec` (`record_id`),
  KEY `idx_bap_hist_time` (`timestamp`),
  KEY `idx_baptism_history_church_id` (`church_id`),
  KEY `idx_bh_record` (`church_id`,`record_id`,`timestamp`),
  KEY `idx_bh_request` (`church_id`,`request_id`),
  KEY `idx_bh_actor` (`church_id`,`actor_user_id`,`timestamp`),
  CONSTRAINT `fk_bap_hist_rec` FOREIGN KEY (`record_id`) REFERENCES `baptism_records` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `baptism_records`
--

DROP TABLE IF EXISTS `baptism_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `baptism_records` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `source_scan_id` varchar(255) DEFAULT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `birth_date` date DEFAULT NULL,
  `reception_date` date DEFAULT NULL,
  `birthplace` varchar(150) DEFAULT NULL,
  `entry_type` varchar(50) NOT NULL DEFAULT 'Baptism',
  `sponsors` text DEFAULT NULL,
  `parents` text DEFAULT NULL,
  `clergy` varchar(150) DEFAULT NULL,
  `church_id` int(11) NOT NULL DEFAULT @`CID`,
  `ocr_confidence` decimal(5,2) DEFAULT 0.00,
  `verified_by` int(11) DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_baptism_records_church_id` (`church_id`)
) ENGINE=InnoDB AUTO_INCREMENT=719 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `calendar_events`
--

DROP TABLE IF EXISTS `calendar_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `calendar_events` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `date` date NOT NULL,
  `time` varchar(8) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `type` enum('event','supply','announcement') NOT NULL DEFAULT 'event',
  `details` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `change_log`
--

DROP TABLE IF EXISTS `change_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `change_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `table_name` varchar(64) DEFAULT NULL,
  `record_id` int(11) DEFAULT NULL,
  `column_name` varchar(64) DEFAULT NULL,
  `old_value` text DEFAULT NULL,
  `new_value` text DEFAULT NULL,
  `changed_at` datetime DEFAULT NULL,
  `changed_by` varchar(100) DEFAULT 'anonymous',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `church_settings`
--

DROP TABLE IF EXISTS `church_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `example2_records`
--

DROP TABLE IF EXISTS `example2_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `example2_records` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `category` varchar(100) DEFAULT NULL,
  `priority` enum('low','medium','high') DEFAULT 'medium',
  `description` text DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `completed` tinyint(1) DEFAULT 0,
  `assigned_to` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_title` (`title`),
  KEY `idx_category` (`category`),
  KEY `idx_priority` (`priority`),
  KEY `idx_due_date` (`due_date`),
  KEY `idx_completed` (`completed`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `example3_records`
--

DROP TABLE IF EXISTS `example3_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `example3_records` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `product_name` varchar(255) NOT NULL,
  `sku` varchar(100) DEFAULT NULL,
  `price` decimal(10,2) DEFAULT NULL,
  `quantity` int(11) DEFAULT 0,
  `category` varchar(100) DEFAULT NULL,
  `supplier` varchar(255) DEFAULT NULL,
  `in_stock` tinyint(1) DEFAULT 1,
  `last_restocked` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `sku` (`sku`),
  KEY `idx_product_name` (`product_name`),
  KEY `idx_sku` (`sku`),
  KEY `idx_category` (`category`),
  KEY `idx_supplier` (`supplier`),
  KEY `idx_in_stock` (`in_stock`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `example_records`
--

DROP TABLE IF EXISTS `example_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `example_records` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `birth_date` date DEFAULT NULL,
  `status` enum('active','inactive','pending') DEFAULT 'active',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_name` (`name`),
  KEY `idx_email` (`email`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `funeral_history`
--

DROP TABLE IF EXISTS `funeral_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `funeral_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `type` varchar(50) NOT NULL,
  `description` text NOT NULL,
  `timestamp` datetime NOT NULL DEFAULT current_timestamp(),
  `record_id` int(11) DEFAULT NULL,
  `record_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`record_data`)),
  `diff_data` longtext DEFAULT NULL,
  `church_id` int(11) DEFAULT NULL,
  `actor_user_id` int(11) DEFAULT NULL,
  `source` varchar(20) NOT NULL DEFAULT 'system',
  `request_id` varchar(64) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_fun_hist_rec` (`record_id`),
  KEY `idx_fun_hist_time` (`timestamp`),
  KEY `idx_funeral_history_church_id` (`church_id`),
  KEY `idx_fh_record` (`church_id`,`record_id`,`timestamp`),
  KEY `idx_fh_request` (`church_id`,`request_id`),
  KEY `idx_fh_actor` (`church_id`,`actor_user_id`,`timestamp`),
  CONSTRAINT `fk_fun_hist_rec` FOREIGN KEY (`record_id`) REFERENCES `funeral_records` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `funeral_records`
--

DROP TABLE IF EXISTS `funeral_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `funeral_records` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `deceased_date` date DEFAULT NULL,
  `burial_date` date NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  `lastname` varchar(100) DEFAULT NULL,
  `age` int(11) DEFAULT NULL,
  `clergy` varchar(150) DEFAULT NULL,
  `burial_location` text DEFAULT NULL,
  `church_id` int(11) NOT NULL DEFAULT @`CID`,
  PRIMARY KEY (`id`),
  KEY `idx_funeral_records_church_id` (`church_id`)
) ENGINE=InnoDB AUTO_INCREMENT=456 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `marriage_history`
--

DROP TABLE IF EXISTS `marriage_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `marriage_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `type` varchar(50) NOT NULL,
  `description` text NOT NULL,
  `timestamp` datetime NOT NULL DEFAULT current_timestamp(),
  `record_id` int(11) DEFAULT NULL,
  `record_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`record_data`)),
  `diff_data` longtext DEFAULT NULL,
  `church_id` int(11) DEFAULT NULL,
  `actor_user_id` int(11) DEFAULT NULL,
  `source` varchar(20) NOT NULL DEFAULT 'system',
  `request_id` varchar(64) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_mar_hist_rec` (`record_id`),
  KEY `idx_mar_hist_time` (`timestamp`),
  KEY `idx_marriage_history_church_id` (`church_id`),
  KEY `idx_mh_record` (`church_id`,`record_id`,`timestamp`),
  KEY `idx_mh_request` (`church_id`,`request_id`),
  KEY `idx_mh_actor` (`church_id`,`actor_user_id`,`timestamp`),
  CONSTRAINT `fk_mar_hist_rec` FOREIGN KEY (`record_id`) REFERENCES `marriage_records` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `marriage_records`
--

DROP TABLE IF EXISTS `marriage_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
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
  `church_id` int(11) NOT NULL DEFAULT @`CID`,
  PRIMARY KEY (`id`),
  KEY `idx_marriage_records_church_id` (`church_id`)
) ENGINE=InnoDB AUTO_INCREMENT=261 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ocr_draft_records`
--

DROP TABLE IF EXISTS `ocr_draft_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ocr_draft_records` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ocr_job_id` int(11) NOT NULL,
  `church_id` int(11) NOT NULL,
  `record_type` enum('baptism','marriage','funeral') NOT NULL,
  `record_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`record_data`)),
  `status` enum('draft','approved','rejected','imported') DEFAULT 'draft',
  `created_by` int(11) DEFAULT NULL,
  `approved_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `imported_at` timestamp NULL DEFAULT NULL,
  `imported_record_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_job_draft` (`ocr_job_id`),
  KEY `idx_ocr_job` (`ocr_job_id`),
  KEY `idx_church` (`church_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ocr_finalize_history`
--

DROP TABLE IF EXISTS `ocr_finalize_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ocr_finalize_history` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `ocr_job_id` bigint(20) NOT NULL,
  `entry_index` int(11) NOT NULL DEFAULT 0,
  `record_type` enum('baptism','marriage','funeral') NOT NULL DEFAULT 'baptism',
  `record_number` varchar(16) DEFAULT NULL,
  `payload_json` longtext NOT NULL,
  `created_record_id` bigint(20) DEFAULT NULL COMMENT 'ID in the final record table after commit',
  `finalized_by` varchar(255) NOT NULL DEFAULT 'system',
  `finalized_at` datetime NOT NULL DEFAULT current_timestamp(),
  `committed_at` datetime DEFAULT NULL,
  `source_filename` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_record_type` (`record_type`),
  KEY `idx_finalized_at` (`finalized_at`),
  KEY `idx_ocr_job` (`ocr_job_id`),
  KEY `idx_created_record` (`created_record_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ocr_fused_drafts`
--

DROP TABLE IF EXISTS `ocr_fused_drafts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ocr_fused_drafts` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `ocr_job_id` bigint(20) NOT NULL,
  `entry_index` int(11) NOT NULL DEFAULT 0,
  `record_type` enum('baptism','marriage','funeral') NOT NULL DEFAULT 'baptism',
  `record_number` varchar(16) DEFAULT NULL,
  `payload_json` longtext NOT NULL,
  `bbox_json` longtext DEFAULT NULL COMMENT 'Stores entry bbox and per-field bbox links',
  `status` enum('draft','committed') NOT NULL DEFAULT 'draft',
  `workflow_status` enum('draft','in_review','finalized','committed') NOT NULL DEFAULT 'draft',
  `committed_record_id` bigint(20) DEFAULT NULL COMMENT 'ID of the committed record in the final table',
  `created_by` varchar(255) NOT NULL DEFAULT 'system',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `last_saved_at` datetime DEFAULT NULL,
  `finalized_at` datetime DEFAULT NULL,
  `finalized_by` varchar(255) DEFAULT NULL,
  `commit_error` longtext DEFAULT NULL,
  `church_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_job_entry` (`ocr_job_id`,`entry_index`),
  KEY `idx_status` (`status`),
  KEY `idx_record_type` (`record_type`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_workflow_status` (`workflow_status`),
  KEY `idx_church` (`church_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2715 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ocr_jobs`
--

DROP TABLE IF EXISTS `ocr_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ocr_jobs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `church_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `status` enum('pending','queued','processing','completed','failed') NOT NULL DEFAULT 'queued',
  `record_type` varchar(64) DEFAULT NULL,
  `language` varchar(32) DEFAULT NULL,
  `source_filename` varchar(255) DEFAULT NULL,
  `filename` varchar(255) DEFAULT NULL,
  `original_filename` varchar(255) DEFAULT NULL,
  `storage_path` varchar(1024) DEFAULT NULL,
  `file_path` varchar(1024) DEFAULT NULL,
  `mime_type` varchar(128) DEFAULT NULL,
  `file_size` bigint(20) DEFAULT NULL,
  `result_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`result_json`)),
  `confidence_score` decimal(6,4) DEFAULT NULL,
  `pages` int(11) DEFAULT NULL,
  `error_message` text DEFAULT NULL,
  `error` text DEFAULT NULL,
  `processing_time_ms` int(11) DEFAULT NULL,
  `errors` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `ocr_result` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`ocr_result`)),
  `ocr_text` longtext DEFAULT NULL,
  `ocr_result_json` longtext DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ocr_jobs_church_created` (`church_id`,`created_at`),
  KEY `idx_ocr_jobs_status` (`status`),
  KEY `idx_ocr_jobs_user_created` (`user_id`,`created_at`),
  KEY `idx_ocr_jobs_record_type` (`record_type`),
  KEY `idx_status` (`status`),
  KEY `idx_record_type` (`record_type`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_church` (`church_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1229 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ocr_mappings`
--

DROP TABLE IF EXISTS `ocr_mappings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ocr_mappings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ocr_job_id` int(11) NOT NULL,
  `church_id` int(11) NOT NULL,
  `record_type` enum('baptism','marriage','funeral') NOT NULL,
  `mapping_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`mapping_json`)),
  `bbox_links` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`bbox_links`)),
  `status` enum('draft','reviewed','approved','rejected') DEFAULT 'draft',
  `created_by` varchar(255) DEFAULT NULL,
  `reviewed_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_job_mapping` (`ocr_job_id`),
  KEY `idx_ocr_job` (`ocr_job_id`),
  KEY `idx_church` (`church_id`),
  KEY `idx_status` (`status`),
  KEY `idx_record_type` (`record_type`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ocr_settings`
--

DROP TABLE IF EXISTS `ocr_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ocr_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `church_id` int(11) NOT NULL,
  `engine` varchar(50) DEFAULT 'tesseract',
  `language` varchar(10) DEFAULT 'eng',
  `dpi` int(11) DEFAULT 300,
  `deskew` tinyint(1) DEFAULT 1,
  `remove_noise` tinyint(1) DEFAULT 1,
  `preprocess_images` tinyint(1) DEFAULT 1,
  `output_format` varchar(20) DEFAULT 'json',
  `confidence_threshold` decimal(5,2) DEFAULT 0.75,
  `default_language` varchar(10) DEFAULT 'en',
  `preprocessing_enabled` tinyint(1) DEFAULT 1,
  `auto_contrast` tinyint(1) DEFAULT 1,
  `auto_rotate` tinyint(1) DEFAULT 1,
  `noise_reduction` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_church_settings` (`church_id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ocr_setup_state`
--

DROP TABLE IF EXISTS `ocr_setup_state`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ocr_setup_state` (
  `church_id` int(11) NOT NULL,
  `state_json` longtext DEFAULT NULL,
  `percent_complete` int(11) NOT NULL DEFAULT 0,
  `is_complete` tinyint(1) NOT NULL DEFAULT 0,
  `flow_type` enum('blank_slate','existing_records') DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`church_id`),
  KEY `idx_is_complete` (`is_complete`),
  KEY `idx_updated_at` (`updated_at`),
  KEY `idx_flow_type` (`flow_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `record_table`
--

DROP TABLE IF EXISTS `record_table`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `record_table` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `table_name` varchar(191) NOT NULL,
  `display_name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `table_type` enum('baptism','marriage','funeral','custom') NOT NULL DEFAULT 'custom',
  `is_active` tinyint(1) DEFAULT 1,
  `table_config` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '{}' CHECK (json_valid(`table_config`)),
  `field_definitions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '[]' CHECK (json_valid(`field_definitions`)),
  `display_settings` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '{}' CHECK (json_valid(`display_settings`)),
  `search_config` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '{}' CHECK (json_valid(`search_config`)),
  `validation_rules` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '{}' CHECK (json_valid(`validation_rules`)),
  `import_export_config` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '{}' CHECK (json_valid(`import_export_config`)),
  `certificate_config` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '{}' CHECK (json_valid(`certificate_config`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_table_name` (`table_name`),
  KEY `idx_table_type` (`table_type`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-02-04 19:23:34
