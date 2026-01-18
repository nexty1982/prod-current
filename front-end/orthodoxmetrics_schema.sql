/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19  Distrib 10.6.22-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: orthodoxmetrics_db
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
-- Table structure for table `_users_legacy`
--

DROP TABLE IF EXISTS `_users_legacy`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_users_legacy` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `preferred_language` char(2) DEFAULT 'en',
  `timezone` varchar(50) DEFAULT 'UTC',
  `role` enum('superadmin','church_admin','editor','viewer') NOT NULL,
  `landing_page` varchar(255) DEFAULT '/pages/welcome',
  `church_id` int(11) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `email_verified` tinyint(1) DEFAULT 0,
  `last_login` timestamp NULL DEFAULT NULL,
  `password_reset_token` varchar(255) DEFAULT NULL,
  `password_reset_expires` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `full_name` varchar(255) DEFAULT NULL,
  `introduction` text DEFAULT NULL,
  `institute_name` varchar(255) DEFAULT NULL,
  `website_url` varchar(255) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `is_locked` tinyint(1) DEFAULT 0,
  `locked_at` timestamp NULL DEFAULT NULL,
  `locked_by` varchar(255) DEFAULT NULL,
  `lockout_reason` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `preferred_language` (`preferred_language`),
  KEY `idx_users_email` (`email`),
  KEY `idx_users_church` (`church_id`),
  KEY `idx_users_role` (`role`),
  KEY `idx_users_phone` (`phone`),
  CONSTRAINT `_users_legacy_ibfk_1` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON DELETE SET NULL,
  CONSTRAINT `_users_legacy_ibfk_2` FOREIGN KEY (`preferred_language`) REFERENCES `languages` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Legacy users table - replaced by orthodoxmetrics_auth_db.users';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `activity_feed`
--

DROP TABLE IF EXISTS `activity_feed`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `activity_feed` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `church_id` int(11) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `actor_id` int(11) NOT NULL,
  `activity_type` enum('blog_post','blog_comment','friend_added','profile_updated','achievement','check_in') NOT NULL,
  `target_type` enum('blog_post','user','comment','media') DEFAULT NULL,
  `target_id` int(11) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `visibility` enum('public','friends','private') DEFAULT 'friends',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_actor_id` (`actor_id`),
  KEY `idx_activity_type` (`activity_type`),
  KEY `idx_visibility` (`visibility`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_activity_feed_user_visibility` (`user_id`,`visibility`,`created_at`),
  KEY `idx_activity_feed_church` (`church_id`),
  CONSTRAINT `fk_activity_feed_church` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `activity_log`
--

DROP TABLE IF EXISTS `activity_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `activity_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `church_id` int(11) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `entity_type` varchar(100) DEFAULT NULL,
  `entity_id` int(11) DEFAULT NULL,
  `changes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`changes`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_activity_user` (`user_id`),
  KEY `idx_activity_church` (`church_id`),
  KEY `idx_activity_entity` (`entity_type`,`entity_id`),
  KEY `idx_activity_date` (`created_at`),
  KEY `idx_log_church_id` (`church_id`),
  CONSTRAINT `activity_log_ibfk_2` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_log_church` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=85 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `activity_logs`
--

DROP TABLE IF EXISTS `activity_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `activity_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `church_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `user_name` varchar(255) DEFAULT NULL,
  `user_role` varchar(50) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `record_type` varchar(50) DEFAULT NULL,
  `record_id` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `changes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`changes`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_church` (`church_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_action` (`action`),
  KEY `idx_created` (`created_at`),
  CONSTRAINT `activity_logs_ibfk_1` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `admin_settings`
--

DROP TABLE IF EXISTS `admin_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `church_id` int(11) DEFAULT NULL,
  `setting_name` varchar(100) NOT NULL,
  `setting_value` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`setting_value`)),
  `description` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `setting_name` (`setting_name`),
  KEY `idx_setting_name` (`setting_name`),
  KEY `created_by` (`created_by`),
  KEY `updated_by` (`updated_by`),
  KEY `idx_admin_settings_church` (`church_id`),
  CONSTRAINT `fk_admin_settings_church` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
-- Temporary table structure for view `agent_performance_view`
--

DROP TABLE IF EXISTS `agent_performance_view`;
/*!50001 DROP VIEW IF EXISTS `agent_performance_view`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `agent_performance_view` AS SELECT
 1 AS `agent`,
  1 AS `total_tasks`,
  1 AS `completed_tasks`,
  1 AS `avg_estimated_hours`,
  1 AS `avg_actual_hours`,
  1 AS `avg_days_to_complete` */;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `ai_agents`
--

DROP TABLE IF EXISTS `ai_agents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ai_agents` (
  `id` varchar(100) NOT NULL,
  `name` varchar(100) NOT NULL,
  `status` enum('online','offline','busy','error') DEFAULT 'offline',
  `current_task_id` varchar(100) DEFAULT NULL,
  `queue_length` int(11) DEFAULT 0,
  `performance` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`performance`)),
  `last_activity` timestamp NOT NULL DEFAULT current_timestamp(),
  `capabilities` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`capabilities`)),
  `settings` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`settings`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `idx_name` (`name`),
  KEY `idx_status` (`status`),
  KEY `idx_current_task` (`current_task_id`),
  CONSTRAINT `ai_agents_ibfk_1` FOREIGN KEY (`current_task_id`) REFERENCES `ai_tasks` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ai_tasks`
--

DROP TABLE IF EXISTS `ai_tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ai_tasks` (
  `id` varchar(100) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `assigned_to` varchar(100) DEFAULT NULL,
  `status` enum('pending','in_progress','completed','blocked') DEFAULT 'pending',
  `due_date` date NOT NULL,
  `start_date` date DEFAULT NULL,
  `tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tags`)),
  `linked_kanban_id` varchar(100) DEFAULT NULL,
  `agent` enum('Ninja','Claude','Cursor','OM-AI','Junie','GitHub Copilot') NOT NULL,
  `priority` enum('low','medium','high','critical') DEFAULT 'medium',
  `estimated_hours` decimal(5,2) DEFAULT NULL,
  `actual_hours` decimal(5,2) DEFAULT NULL,
  `logs` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`logs`)),
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_agent` (`agent`),
  KEY `idx_priority` (`priority`),
  KEY `idx_due_date` (`due_date`),
  KEY `idx_assigned_to` (`assigned_to`),
  KEY `idx_linked_kanban` (`linked_kanban_id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER after_task_insert
AFTER INSERT ON ai_tasks
FOR EACH ROW
BEGIN
    INSERT INTO task_activity_log (id, task_id, user_id, action, details)
    VALUES (
        CONCAT('log-', UNIX_TIMESTAMP(), '-', FLOOR(RAND() * 1000000)),
        NEW.id,
        COALESCE(NEW.assigned_to, 'system'),
        'task_created',
        JSON_OBJECT('title', NEW.title, 'agent', NEW.agent, 'priority', NEW.priority)
    );
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER after_task_status_update
AFTER UPDATE ON ai_tasks
FOR EACH ROW
BEGIN
    IF NEW.status != OLD.status THEN
        
        UPDATE ai_agents 
        SET queue_length = (
            SELECT COUNT(*) 
            FROM ai_tasks 
            WHERE agent = NEW.agent AND status = 'pending'
        )
        WHERE name = NEW.agent;
        
        
        INSERT INTO task_notifications (id, task_id, type, message, priority)
        VALUES (
            CONCAT('notif-', UNIX_TIMESTAMP(), '-', FLOOR(RAND() * 1000000)),
            NEW.id,
            'status_change',
            CONCAT('Task "', NEW.title, '" status changed from ', OLD.status, ' to ', NEW.status),
            NEW.priority
        );
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `church_id` int(11) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `table_name` varchar(50) DEFAULT NULL,
  `record_id` int(11) DEFAULT NULL,
  `old_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`old_values`)),
  `new_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`new_values`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `table_name` (`table_name`),
  KEY `created_at` (`created_at`),
  KEY `idx_audit_logs_church` (`church_id`),
  CONSTRAINT `fk_audit_logs_church` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `auth_attempts`
--

DROP TABLE IF EXISTS `auth_attempts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_attempts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ip_address` varchar(45) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `success` tinyint(1) NOT NULL DEFAULT 0,
  `failure_reason` varchar(100) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_auth_attempts_ip` (`ip_address`),
  KEY `idx_auth_attempts_email` (`email`),
  KEY `idx_auth_attempts_created` (`created_at`),
  KEY `idx_auth_attempts_success` (`success`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `autocephalous_churches`
--

DROP TABLE IF EXISTS `autocephalous_churches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `autocephalous_churches` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` char(2) NOT NULL,
  `name` varchar(255) NOT NULL,
  `short_name` varchar(100) DEFAULT NULL,
  `patriarch_name` varchar(255) DEFAULT NULL,
  `headquarters_location` varchar(255) DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `backup_artifacts`
--

DROP TABLE IF EXISTS `backup_artifacts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `backup_artifacts` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `job_id` bigint(20) NOT NULL,
  `artifact_type` enum('files','db') NOT NULL,
  `path` varchar(1024) NOT NULL,
  `size_bytes` bigint(20) NOT NULL,
  `manifest_path` varchar(1024) NOT NULL,
  `manifest_text_path` varchar(1024) NOT NULL,
  `sha256` varchar(128) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_backup_artifacts_job` (`job_id`),
  KEY `idx_backup_artifacts_type_created` (`artifact_type`,`created_at`),
  KEY `idx_backup_artifacts_sha256` (`sha256`),
  CONSTRAINT `fk_ba_job_20251005_152910` FOREIGN KEY (`job_id`) REFERENCES `backup_jobs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_backup_artifacts_size_positive` CHECK (`size_bytes` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `backup_filters`
--

DROP TABLE IF EXISTS `backup_filters`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `backup_filters` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `scope` enum('files','db') NOT NULL,
  `label` varchar(128) NOT NULL,
  `include_regex` longtext DEFAULT NULL,
  `exclude_regex` longtext DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_backup_filters_label_scope` (`label`,`scope`),
  KEY `idx_backup_filters_scope_active` (`scope`,`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `backup_jobs`
--

DROP TABLE IF EXISTS `backup_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `backup_jobs` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `kind` enum('files','db','both') NOT NULL,
  `status` enum('queued','running','success','failed') NOT NULL DEFAULT 'queued',
  `requested_by` int(11) NOT NULL,
  `started_at` datetime DEFAULT NULL,
  `finished_at` datetime DEFAULT NULL,
  `duration_ms` bigint(20) DEFAULT NULL,
  `error` longtext DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_backup_jobs_status_started` (`status`,`started_at`),
  KEY `idx_backup_jobs_created` (`created_at`),
  KEY `idx_backup_jobs_requester` (`requested_by`),
  CONSTRAINT `fk_backup_jobs_requested_by_users` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `chk_backup_jobs_duration_nonneg` CHECK (`duration_ms` is null or `duration_ms` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `backup_settings`
--

DROP TABLE IF EXISTS `backup_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `backup_settings` (
  `id` int(11) NOT NULL DEFAULT 1,
  `settings` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`settings`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary table structure for view `backup_statistics`
--

DROP TABLE IF EXISTS `backup_statistics`;

-- failed on view `backup_statistics`: CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `backup_statistics` AS select count(0) AS `total_backups`,count(case when `orthodoxmetrics_db`.`backup_files`.`status` = 'completed' then 1 end) AS `completed_backups`,count(case when `orthodoxmetrics_db`.`backup_files`.`status` = 'failed' then 1 end) AS `failed_backups`,count(case when `orthodoxmetrics_db`.`backup_files`.`type` = 'full' then 1 end) AS `full_backups`,count(case when `orthodoxmetrics_db`.`backup_files`.`type` = 'database' then 1 end) AS `database_backups`,count(case when `orthodoxmetrics_db`.`backup_files`.`type` = 'files' then 1 end) AS `files_backups`,sum(case when `orthodoxmetrics_db`.`backup_files`.`status` = 'completed' then `orthodoxmetrics_db`.`backup_files`.`size` else 0 end) AS `total_backup_size`,avg(case when `orthodoxmetrics_db`.`backup_files`.`status` = 'completed' then `orthodoxmetrics_db`.`backup_files`.`size` else NULL end) AS `average_backup_size`,max(`orthodoxmetrics_db`.`backup_files`.`created_at`) AS `latest_backup`,min(`orthodoxmetrics_db`.`backup_files`.`created_at`) AS `oldest_backup` from `backup_files`


--
-- Table structure for table `banner_assignments`
--

DROP TABLE IF EXISTS `banner_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `banner_assignments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `church_id` int(11) DEFAULT NULL,
  `scope` enum('global','route','page') NOT NULL DEFAULT 'route',
  `match_value` varchar(255) NOT NULL,
  `component_name` varchar(100) NOT NULL,
  `props_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT json_object() CHECK (json_valid(`props_json`)),
  `priority` int(11) NOT NULL DEFAULT 100,
  `enabled` tinyint(1) NOT NULL DEFAULT 1,
  `effective_from` datetime DEFAULT NULL,
  `effective_to` datetime DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_lookup` (`church_id`,`scope`,`match_value`,`enabled`,`priority`),
  KEY `idx_effective` (`effective_from`,`effective_to`),
  KEY `fk_component_name` (`component_name`),
  CONSTRAINT `fk_component_name` FOREIGN KEY (`component_name`) REFERENCES `banner_registry` (`component_name`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `banner_registry`
--

DROP TABLE IF EXISTS `banner_registry`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `banner_registry` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `component_name` varchar(100) NOT NULL,
  `label` varchar(120) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `props_schema` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`props_schema`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `component_name` (`component_name`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `bb_actions`
--

DROP TABLE IF EXISTS `bb_actions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `bb_actions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `actor_user_id` varchar(64) DEFAULT NULL COMMENT 'User who performed the action',
  `action` enum('auto_tag','auto_cluster','approve','reject','retitle','merge_preview','manual_tag','auto_process','worker_scan','worker_error','override','notify_ready','pack_created','topology_updated') NOT NULL COMMENT 'Type of action performed',
  `payload_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Action details and context' CHECK (json_valid(`payload_json`)),
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_actor_user_id` (`actor_user_id`),
  KEY `idx_action` (`action`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=127 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `bb_cluster_items`
--

DROP TABLE IF EXISTS `bb_cluster_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `bb_cluster_items` (
  `cluster_id` int(11) NOT NULL,
  `file_id` int(11) NOT NULL,
  `role` enum('primary','secondary') DEFAULT 'secondary' COMMENT 'Role of file in cluster',
  PRIMARY KEY (`cluster_id`,`file_id`),
  KEY `idx_file_id` (`file_id`),
  CONSTRAINT `bb_cluster_items_ibfk_1` FOREIGN KEY (`cluster_id`) REFERENCES `bb_clusters` (`id`) ON DELETE CASCADE,
  CONSTRAINT `bb_cluster_items_ibfk_2` FOREIGN KEY (`file_id`) REFERENCES `bigbook_files` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `bb_clusters`
--

DROP TABLE IF EXISTS `bb_clusters`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `bb_clusters` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL COMMENT 'Suggested title for consolidated document',
  `reason` text NOT NULL COMMENT 'Explanation of why files should be consolidated',
  `confidence` decimal(5,4) NOT NULL COMMENT 'Confidence score for the cluster suggestion',
  `status` enum('suggested','pending','approved','rejected') DEFAULT 'suggested' COMMENT 'Cluster review status',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_confidence` (`confidence`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `bible_book`
--

DROP TABLE IF EXISTS `bible_book`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `bible_book` (
  `id` smallint(6) NOT NULL,
  `tradition` enum('LXX','MT','NT') NOT NULL,
  `osb_order` smallint(6) NOT NULL,
  `code` varchar(12) NOT NULL,
  `name` varchar(64) NOT NULL,
  `chapters` smallint(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `bible_crossref`
--

DROP TABLE IF EXISTS `bible_crossref`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `bible_crossref` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `from_verse` bigint(20) NOT NULL,
  `to_verse` bigint(20) NOT NULL,
  `kind` enum('scripture','liturgical','thematic') NOT NULL,
  `note` varchar(512) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_crossref_from` (`from_verse`,`kind`),
  KEY `ix_crossref_to` (`to_verse`,`kind`),
  CONSTRAINT `fk_x_from` FOREIGN KEY (`from_verse`) REFERENCES `bible_verse` (`id`),
  CONSTRAINT `fk_x_to` FOREIGN KEY (`to_verse`) REFERENCES `bible_verse` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `bible_note`
--

DROP TABLE IF EXISTS `bible_note`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `bible_note` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `verse_id` bigint(20) NOT NULL,
  `scope` enum('editor','patristic','lexicon','user') NOT NULL,
  `title` varchar(128) DEFAULT NULL,
  `body_html` mediumtext DEFAULT NULL,
  `body_plain` mediumtext DEFAULT NULL,
  `source_cite` varchar(256) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_bn_verse` (`verse_id`),
  FULLTEXT KEY `ft_bible_note` (`title`,`body_plain`,`source_cite`),
  CONSTRAINT `fk_bn_verse` FOREIGN KEY (`verse_id`) REFERENCES `bible_verse` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `bible_reading`
--

DROP TABLE IF EXISTS `bible_reading`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `bible_reading` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `calendar_date` date NOT NULL,
  `title` varchar(128) NOT NULL,
  `start_verse` bigint(20) NOT NULL,
  `end_verse` bigint(20) NOT NULL,
  `cycle` varchar(32) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_br_start` (`start_verse`),
  KEY `fk_br_end` (`end_verse`),
  KEY `ix_reading_date_title` (`calendar_date`,`title`),
  KEY `ix_reading_date` (`calendar_date`),
  CONSTRAINT `fk_br_end` FOREIGN KEY (`end_verse`) REFERENCES `bible_verse` (`id`),
  CONSTRAINT `fk_br_start` FOREIGN KEY (`start_verse`) REFERENCES `bible_verse` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `bible_source`
--

DROP TABLE IF EXISTS `bible_source`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `bible_source` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(16) NOT NULL,
  `name` varchar(64) NOT NULL,
  `license` varchar(128) NOT NULL,
  `notes` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `bible_text`
--

DROP TABLE IF EXISTS `bible_text`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `bible_text` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `verse_id` bigint(20) NOT NULL,
  `source_id` int(11) NOT NULL,
  `content_html` mediumtext DEFAULT NULL,
  `content_plain` mediumtext DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_text` (`verse_id`,`source_id`),
  KEY `fk_bt_source` (`source_id`),
  FULLTEXT KEY `ft_text` (`content_plain`),
  CONSTRAINT `fk_bt_source` FOREIGN KEY (`source_id`) REFERENCES `bible_source` (`id`),
  CONSTRAINT `fk_bt_verse` FOREIGN KEY (`verse_id`) REFERENCES `bible_verse` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `bible_user_state`
--

DROP TABLE IF EXISTS `bible_user_state`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `bible_user_state` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) NOT NULL,
  `verse_id` bigint(20) NOT NULL,
  `highlight` varchar(16) DEFAULT NULL,
  `bookmark` tinyint(1) DEFAULT 0,
  `note` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_verse` (`user_id`,`verse_id`),
  KEY `fk_bus_verse` (`verse_id`),
  KEY `ix_bus_user` (`user_id`),
  KEY `ix_bus_user_bookmark` (`user_id`,`bookmark`),
  KEY `ix_bus_user_highlight` (`user_id`,`highlight`),
  CONSTRAINT `fk_bus_verse` FOREIGN KEY (`verse_id`) REFERENCES `bible_verse` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `bible_verse`
--

DROP TABLE IF EXISTS `bible_verse`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `bible_verse` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `book_id` smallint(6) NOT NULL,
  `chapter` smallint(6) NOT NULL,
  `verse` smallint(6) NOT NULL,
  `versification` enum('LXX','MT','NT') NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ref` (`book_id`,`chapter`,`verse`,`versification`),
  CONSTRAINT `fk_bv_book` FOREIGN KEY (`book_id`) REFERENCES `bible_book` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `bigbook_config`
--

DROP TABLE IF EXISTS `bigbook_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `bigbook_config` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `config_key` varchar(100) NOT NULL,
  `config_value` text DEFAULT NULL,
  `config_type` enum('string','number','boolean','json','array') DEFAULT 'string',
  `description` text DEFAULT NULL,
  `is_system` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `config_key` (`config_key`),
  KEY `idx_config_key` (`config_key`),
  KEY `idx_is_system` (`is_system`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `bigbook_file_tags`
--

DROP TABLE IF EXISTS `bigbook_file_tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `bigbook_file_tags` (
  `file_id` int(11) NOT NULL,
  `tag_id` int(11) NOT NULL,
  `added_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`file_id`,`tag_id`),
  KEY `tag_id` (`tag_id`),
  CONSTRAINT `bigbook_file_tags_ibfk_1` FOREIGN KEY (`file_id`) REFERENCES `bigbook_files` (`id`) ON DELETE CASCADE,
  CONSTRAINT `bigbook_file_tags_ibfk_2` FOREIGN KEY (`tag_id`) REFERENCES `bigbook_tags` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `bigbook_files`
--

DROP TABLE IF EXISTS `bigbook_files`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `bigbook_files` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `filename` varchar(255) NOT NULL,
  `file_path` text NOT NULL,
  `file_type` enum('markdown','html','pdf','doc','txt','image','video','audio') DEFAULT 'markdown',
  `title` varchar(500) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `content` longtext DEFAULT NULL,
  `file_size` bigint(20) DEFAULT 0,
  `mime_type` varchar(100) DEFAULT NULL,
  `checksum` varchar(64) DEFAULT NULL,
  `language` varchar(10) DEFAULT 'en',
  `reading_level` varchar(50) DEFAULT NULL,
  `topic_category` varchar(100) DEFAULT NULL,
  `source` varchar(255) DEFAULT NULL,
  `author` varchar(255) DEFAULT NULL,
  `upload_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `last_modified` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `access_count` int(11) DEFAULT 0,
  `is_indexed` tinyint(1) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `tags_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Auto-detected and manual tags' CHECK (json_valid(`tags_json`)),
  `intel_summary` text DEFAULT NULL COMMENT 'AI-generated summary of the file',
  `intel_confidence` decimal(5,4) DEFAULT NULL COMMENT 'Confidence score for auto-tagging/clustering',
  `intel_status` enum('none','suggested','pending','approved','rejected') DEFAULT 'none' COMMENT 'Intelligence processing status',
  `node_type` varchar(32) DEFAULT NULL COMMENT 'Node classification: Frontend|API|Database|Shared|Liturgical',
  `node_confidence` decimal(5,4) DEFAULT NULL COMMENT 'Confidence score 0-1 for node classification',
  `zone` varchar(32) DEFAULT NULL COMMENT 'Zone classification: Frontend|API|DB|Shared|Liturgical',
  `connection_types_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Array of connection types: imports,api call,db read,db write,liturgical flow' CHECK (json_valid(`connection_types_json`)),
  PRIMARY KEY (`id`),
  KEY `idx_filename` (`filename`),
  KEY `idx_file_type` (`file_type`),
  KEY `idx_topic` (`topic_category`),
  KEY `idx_language` (`language`),
  KEY `idx_indexed` (`is_indexed`),
  KEY `idx_active` (`is_active`),
  KEY `idx_intel_status` (`intel_status`),
  KEY `idx_intel_confidence` (`intel_confidence`),
  KEY `idx_bigbook_files_intel_status` (`intel_status`),
  KEY `idx_bigbook_files_node_type` (`node_type`),
  KEY `idx_bigbook_files_zone` (`zone`),
  FULLTEXT KEY `idx_content_search` (`title`,`description`,`content`)
) ENGINE=InnoDB AUTO_INCREMENT=392 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `bigbook_index`
--

DROP TABLE IF EXISTS `bigbook_index`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `bigbook_index` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `file_id` int(11) NOT NULL,
  `term` varchar(255) NOT NULL,
  `frequency` int(11) DEFAULT 1,
  `relevance_score` decimal(5,4) DEFAULT 0.0000,
  `context_snippet` text DEFAULT NULL,
  `position_info` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`position_info`)),
  `indexed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_file` (`file_id`),
  KEY `idx_term` (`term`),
  KEY `idx_relevance` (`relevance_score`),
  FULLTEXT KEY `idx_term_search` (`term`,`context_snippet`),
  CONSTRAINT `bigbook_index_ibfk_1` FOREIGN KEY (`file_id`) REFERENCES `bigbook_files` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `bigbook_notes`
--

DROP TABLE IF EXISTS `bigbook_notes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `bigbook_notes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `church_id` int(11) DEFAULT NULL,
  `file_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `note_content` text NOT NULL,
  `note_type` enum('annotation','summary','question','highlight','bookmark') DEFAULT 'annotation',
  `page_reference` varchar(100) DEFAULT NULL,
  `position_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`position_data`)),
  `is_private` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_file` (`file_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_type` (`note_type`),
  KEY `idx_private` (`is_private`),
  KEY `idx_bigbook_notes_church` (`church_id`),
  CONSTRAINT `bigbook_notes_ibfk_1` FOREIGN KEY (`file_id`) REFERENCES `bigbook_files` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bigbook_notes_church` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `bigbook_tags`
--

DROP TABLE IF EXISTS `bigbook_tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `bigbook_tags` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tag_name` varchar(100) NOT NULL,
  `tag_description` text DEFAULT NULL,
  `tag_color` varchar(7) DEFAULT '#007bff',
  `usage_count` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `tag_name` (`tag_name`),
  KEY `idx_usage` (`usage_count`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `billing_plans`
--

DROP TABLE IF EXISTS `billing_plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `billing_plans` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `plan_code` varchar(50) NOT NULL,
  `name_multilang` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`name_multilang`)),
  `description_multilang` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`description_multilang`)),
  `features_multilang` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`features_multilang`)),
  `price_monthly` decimal(10,2) NOT NULL,
  `price_quarterly` decimal(10,2) NOT NULL,
  `price_yearly` decimal(10,2) NOT NULL,
  `currency` char(3) DEFAULT 'USD',
  `max_users` int(11) DEFAULT NULL,
  `max_records` int(11) DEFAULT NULL,
  `max_storage_gb` int(11) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `sort_order` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `plan_code` (`plan_code`),
  KEY `idx_billing_plans_active` (`is_active`),
  KEY `idx_billing_plans_code` (`plan_code`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary table structure for view `billing_plans_view`
--

DROP TABLE IF EXISTS `billing_plans_view`;
/*!50001 DROP VIEW IF EXISTS `billing_plans_view`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `billing_plans_view` AS SELECT
 1 AS `id`,
  1 AS `plan_code`,
  1 AS `name_multilang`,
  1 AS `description_multilang`,
  1 AS `features_multilang`,
  1 AS `price_monthly`,
  1 AS `price_quarterly`,
  1 AS `price_yearly`,
  1 AS `currency`,
  1 AS `max_users`,
  1 AS `max_records`,
  1 AS `is_active` */;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `blog_access_requests`
--

DROP TABLE IF EXISTS `blog_access_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `blog_access_requests` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `blog_owner_id` int(11) NOT NULL,
  `requester_id` int(11) NOT NULL,
  `status` enum('pending','approved','denied') DEFAULT 'pending',
  `message` text DEFAULT NULL,
  `requested_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `responded_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_access_request` (`blog_owner_id`,`requester_id`),
  KEY `idx_blog_owner_id` (`blog_owner_id`),
  KEY `idx_requester_id` (`requester_id`),
  KEY `idx_status` (`status`),
  KEY `idx_requested_at` (`requested_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `blog_categories`
--

DROP TABLE IF EXISTS `blog_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `blog_categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `church_id` int(11) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `color` varchar(7) DEFAULT '#007bff',
  `icon` varchar(50) DEFAULT NULL,
  `post_count` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_category` (`user_id`,`name`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_blog_categories_church` (`church_id`),
  CONSTRAINT `fk_blog_categories_church` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `blog_comments`
--

DROP TABLE IF EXISTS `blog_comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `blog_comments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `church_id` int(11) DEFAULT NULL,
  `post_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `parent_id` int(11) DEFAULT NULL,
  `content` text NOT NULL,
  `is_approved` tinyint(1) DEFAULT 1,
  `like_count` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_post_id` (`post_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_blog_comments_church` (`church_id`),
  CONSTRAINT `blog_comments_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `blog_posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `blog_comments_ibfk_3` FOREIGN KEY (`parent_id`) REFERENCES `blog_comments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_blog_comments_church` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `blog_post_categories`
--

DROP TABLE IF EXISTS `blog_post_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `blog_post_categories` (
  `post_id` int(11) NOT NULL,
  `category_id` int(11) NOT NULL,
  PRIMARY KEY (`post_id`,`category_id`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `blog_post_categories_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `blog_posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `blog_post_categories_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `blog_categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `blog_posts`
--

DROP TABLE IF EXISTS `blog_posts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `blog_posts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `church_id` int(11) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `content` longtext NOT NULL,
  `excerpt` text DEFAULT NULL,
  `featured_image_url` varchar(500) DEFAULT NULL,
  `status` enum('draft','published','private','scheduled') DEFAULT 'draft',
  `visibility` enum('public','private','friends_only') DEFAULT 'public',
  `is_pinned` tinyint(1) DEFAULT 0,
  `is_featured` tinyint(1) DEFAULT 0,
  `tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tags`)),
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `view_count` int(11) DEFAULT 0,
  `like_count` int(11) DEFAULT 0,
  `comment_count` int(11) DEFAULT 0,
  `scheduled_at` timestamp NULL DEFAULT NULL,
  `published_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_slug` (`user_id`,`slug`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_visibility` (`visibility`),
  KEY `idx_published_at` (`published_at`),
  KEY `idx_is_pinned` (`is_pinned`),
  KEY `idx_tags` (`tags`(768)),
  KEY `idx_blog_posts_user_status_published` (`user_id`,`status`,`published_at`),
  KEY `idx_blog_posts_visibility_published` (`visibility`,`published_at`),
  KEY `idx_blog_posts_church` (`church_id`),
  FULLTEXT KEY `ft_title_content` (`title`,`content`),
  CONSTRAINT `fk_blog_posts_church` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary table structure for view `blog_posts_with_author`
--

DROP TABLE IF EXISTS `blog_posts_with_author`;
/*!50001 DROP VIEW IF EXISTS `blog_posts_with_author`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `blog_posts_with_author` AS SELECT
 1 AS `id`,
  1 AS `user_id`,
  1 AS `title`,
  1 AS `slug`,
  1 AS `content`,
  1 AS `excerpt`,
  1 AS `featured_image_url`,
  1 AS `status`,
  1 AS `visibility`,
  1 AS `is_pinned`,
  1 AS `is_featured`,
  1 AS `tags`,
  1 AS `metadata`,
  1 AS `view_count`,
  1 AS `like_count`,
  1 AS `comment_count`,
  1 AS `scheduled_at`,
  1 AS `published_at`,
  1 AS `created_at`,
  1 AS `updated_at`,
  1 AS `author_first_name`,
  1 AS `author_last_name`,
  1 AS `author_display_name`,
  1 AS `author_profile_image` */;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `build_configs`
--

DROP TABLE IF EXISTS `build_configs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `build_configs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `config_name` varchar(100) NOT NULL DEFAULT 'default',
  `mode` enum('full','incremental') DEFAULT 'full',
  `memory_mb` int(11) DEFAULT 4096,
  `install_package` varchar(255) DEFAULT '',
  `legacy_peer_deps` tinyint(1) DEFAULT 1,
  `skip_install` tinyint(1) DEFAULT 0,
  `dry_run` tinyint(1) DEFAULT 0,
  `additional_flags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`additional_flags`)),
  `environment` varchar(50) DEFAULT 'production',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_active` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_config_env` (`config_name`,`environment`),
  KEY `idx_environment` (`environment`),
  KEY `idx_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `build_paths`
--

DROP TABLE IF EXISTS `build_paths`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `build_paths` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `environment` enum('development','staging','production','docker') DEFAULT 'production',
  `project_root` text NOT NULL,
  `frontend_path` text NOT NULL,
  `log_path` text DEFAULT NULL,
  `upload_path` text DEFAULT NULL,
  `backup_path` text DEFAULT NULL,
  `custom_paths` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`custom_paths`)),
  `is_default` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_active` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_environment` (`environment`),
  KEY `idx_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `calendar_cache`
--

DROP TABLE IF EXISTS `calendar_cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `calendar_cache` (
  `date_key` date NOT NULL,
  `payload_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`payload_json`)),
  `fetched_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`date_key`),
  KEY `idx_fetched_at` (`fetched_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `calendar_settings`
--

DROP TABLE IF EXISTS `calendar_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `calendar_settings` (
  `id` varchar(100) NOT NULL,
  `church_id` int(11) DEFAULT NULL,
  `user_id` varchar(100) NOT NULL,
  `default_view` enum('month','week','day') DEFAULT 'month',
  `working_hours` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`working_hours`)),
  `weekends` tinyint(1) DEFAULT 1,
  `holidays` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`holidays`)),
  `color_scheme` enum('agent','priority','status') DEFAULT 'agent',
  `show_task_details` tinyint(1) DEFAULT 1,
  `auto_refresh` tinyint(1) DEFAULT 1,
  `refresh_interval` int(11) DEFAULT 30000,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_settings` (`user_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_calendar_settings_church` (`church_id`),
  CONSTRAINT `fk_calendar_settings_church` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `chat_conversations`
--

DROP TABLE IF EXISTS `chat_conversations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_conversations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `church_id` int(11) DEFAULT NULL,
  `type` enum('direct','group') DEFAULT 'direct',
  `name` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `avatar_url` varchar(500) DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `last_message_id` int(11) DEFAULT NULL,
  `last_activity` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_active` tinyint(1) DEFAULT 1,
  `settings` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`settings`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  KEY `idx_type` (`type`),
  KEY `idx_last_activity` (`last_activity`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_chat_conversations_church` (`church_id`),
  CONSTRAINT `fk_chat_conversations_church` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `chat_messages`
--

DROP TABLE IF EXISTS `chat_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_messages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `conversation_id` int(11) NOT NULL,
  `sender_id` int(11) NOT NULL,
  `message_type` enum('text','image','file','emoji','system') DEFAULT 'text',
  `content` text NOT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `reply_to_id` int(11) DEFAULT NULL,
  `is_edited` tinyint(1) DEFAULT 0,
  `is_deleted` tinyint(1) DEFAULT 0,
  `delivered_at` timestamp NULL DEFAULT NULL,
  `read_by` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`read_by`)),
  `reactions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`reactions`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `reply_to_id` (`reply_to_id`),
  KEY `idx_conversation_id` (`conversation_id`),
  KEY `idx_sender_id` (`sender_id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_message_type` (`message_type`),
  KEY `idx_chat_messages_conversation_created` (`conversation_id`,`created_at`),
  CONSTRAINT `chat_messages_ibfk_1` FOREIGN KEY (`conversation_id`) REFERENCES `chat_conversations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chat_messages_ibfk_3` FOREIGN KEY (`reply_to_id`) REFERENCES `chat_messages` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `chat_participants`
--

DROP TABLE IF EXISTS `chat_participants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_participants` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `church_id` int(11) DEFAULT NULL,
  `conversation_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `role` enum('member','admin','moderator') DEFAULT 'member',
  `joined_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `last_read_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_muted` tinyint(1) DEFAULT 0,
  `notification_settings` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`notification_settings`)),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_participant` (`conversation_id`,`user_id`),
  KEY `idx_conversation_id` (`conversation_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_last_read_at` (`last_read_at`),
  KEY `idx_chat_participants_church` (`church_id`),
  CONSTRAINT `chat_participants_ibfk_1` FOREIGN KEY (`conversation_id`) REFERENCES `chat_conversations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_chat_participants_church` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `chatgpt_messages`
--

DROP TABLE IF EXISTS `chatgpt_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `chatgpt_messages` (
  `id` varchar(100) NOT NULL,
  `session_id` varchar(100) NOT NULL,
  `role` enum('user','assistant','system') NOT NULL,
  `content` text NOT NULL,
  `timestamp` timestamp NOT NULL DEFAULT current_timestamp(),
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  PRIMARY KEY (`id`),
  KEY `idx_session_id` (`session_id`),
  KEY `idx_role` (`role`),
  KEY `idx_timestamp` (`timestamp`),
  CONSTRAINT `chatgpt_messages_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `chatgpt_sessions` (`session_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `chatgpt_sessions`
--

DROP TABLE IF EXISTS `chatgpt_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `chatgpt_sessions` (
  `id` varchar(100) NOT NULL,
  `task_id` varchar(100) NOT NULL,
  `session_id` varchar(100) NOT NULL,
  `status` enum('active','inactive','expired') DEFAULT 'active',
  `last_activity` timestamp NOT NULL DEFAULT current_timestamp(),
  `message_count` int(11) DEFAULT 0,
  `context` text DEFAULT NULL,
  `settings` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`settings`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `session_id` (`session_id`),
  KEY `idx_task_id` (`task_id`),
  KEY `idx_session_id` (`session_id`),
  KEY `idx_status` (`status`),
  KEY `idx_last_activity` (`last_activity`),
  CONSTRAINT `chatgpt_sessions_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `ai_tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `church_admin_panel`
--

DROP TABLE IF EXISTS `church_admin_panel`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `church_admin_panel` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `church_id` int(11) NOT NULL,
  `role` enum('owner','manager','viewer') DEFAULT 'manager',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_church_user` (`user_id`,`church_id`),
  KEY `church_id` (`church_id`),
  CONSTRAINT `church_admin_panel_ibfk_2` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `church_contacts`
--

DROP TABLE IF EXISTS `church_contacts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `church_contacts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `church_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `title_multilang` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`title_multilang`)),
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `role` enum('priest','deacon','administrator','treasurer','secretary','other') DEFAULT 'other',
  `is_primary` tinyint(1) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_church_contacts_church` (`church_id`),
  KEY `idx_church_contacts_role` (`role`),
  CONSTRAINT `church_contacts_ibfk_1` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `church_field_mappings`
--

DROP TABLE IF EXISTS `church_field_mappings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `church_field_mappings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `church_id` int(11) NOT NULL,
  `table_name` varchar(191) NOT NULL,
  `mapping_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`mapping_json`)),
  `field_settings` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Advanced field settings (visibility, sorting, etc.)' CHECK (json_valid(`field_settings`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `field_settings_json` longtext DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_church_table` (`church_id`,`table_name`),
  KEY `idx_church_id` (`church_id`),
  KEY `idx_table_name` (`table_name`),
  KEY `idx_cfm_updated_at` (`updated_at`),
  CONSTRAINT `church_field_mappings_ibfk_1` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Stores custom field name mappings for church database tables';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `church_provision`
--

DROP TABLE IF EXISTS `church_provision`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `church_provision` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `basic_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`basic_json`)),
  `modules_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`modules_json`)),
  `accounts_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`accounts_json`)),
  `status` enum('pending','approved','rejected','failed') NOT NULL DEFAULT 'pending',
  `db_name` varchar(128) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_church_provision_status` (`status`),
  KEY `idx_church_provision_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `church_user_roles`
--

DROP TABLE IF EXISTS `church_user_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `church_user_roles` (
  `church_id` int(11) NOT NULL,
  `auth_user_id` int(11) NOT NULL,
  `role` enum('admin','editor','viewer') NOT NULL DEFAULT 'admin',
  PRIMARY KEY (`church_id`,`auth_user_id`),
  KEY `auth_user_id` (`auth_user_id`),
  CONSTRAINT `fk_cur_church` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `churches`
--

DROP TABLE IF EXISTS `churches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `churches` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL DEFAULT '',
  `phone` varchar(50) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state_province` varchar(100) DEFAULT NULL,
  `postal_code` varchar(20) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `jurisdiction` varchar(64) DEFAULT NULL,
  `population_bracket` enum('LT25','LT75','LT125','GT125') DEFAULT NULL,
  `referral` varchar(128) DEFAULT NULL,
  `db_name` varchar(128) DEFAULT NULL,
  `preferred_language` char(2) DEFAULT 'en',
  `timezone` varchar(50) NOT NULL DEFAULT 'UTC',
  `currency` varchar(10) NOT NULL DEFAULT 'USD',
  `tax_id` varchar(50) DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `description_multilang` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`description_multilang`)),
  `settings` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`settings`)),
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `has_baptism_records` tinyint(1) DEFAULT 1,
  `has_marriage_records` tinyint(1) DEFAULT 1,
  `has_funeral_records` tinyint(1) DEFAULT 1,
  `setup_complete` tinyint(1) NOT NULL DEFAULT 0,
  `instance_port` int(11) DEFAULT NULL,
  `last_login_at` datetime DEFAULT NULL,
  `record_count_cache` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `database_name` varchar(100) DEFAULT NULL,
  `admin_email` varchar(255) DEFAULT NULL,
  `language_preference` varchar(10) DEFAULT NULL,
  `sub_plan_code` varchar(50) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `church_name` varchar(255) NOT NULL,
  `db_user` varchar(100) DEFAULT NULL,
  `db_password` varchar(100) DEFAULT NULL,
  `sub_billing_cycle` enum('monthly','quarterly','yearly') DEFAULT NULL,
  `sub_start_date` date DEFAULT NULL,
  `sub_end_date` date DEFAULT NULL,
  `sub_renewal_date` date DEFAULT NULL,
  `sub_status` enum('active','suspended','cancelled','trial','expired') DEFAULT NULL,
  `sub_amount` decimal(10,2) DEFAULT NULL,
  `sub_currency` char(3) DEFAULT NULL,
  `sub_discount_percent` decimal(5,2) DEFAULT NULL,
  `sub_discount_amount` decimal(10,2) DEFAULT NULL,
  `sub_payment_method` varchar(50) DEFAULT NULL,
  `sub_notes` text DEFAULT NULL,
  `plan_name_multilang` longtext DEFAULT NULL,
  `plan_description_multilang` longtext DEFAULT NULL,
  `plan_features_multilang` longtext DEFAULT NULL,
  `plan_price_monthly` decimal(10,2) DEFAULT NULL,
  `plan_price_quarterly` decimal(10,2) DEFAULT NULL,
  `plan_price_yearly` decimal(10,2) DEFAULT NULL,
  `plan_currency` char(3) DEFAULT NULL,
  `plan_max_users` int(11) DEFAULT NULL,
  `plan_max_records` int(11) DEFAULT NULL,
  `plan_max_storage_gb` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_churches_country` (`country`),
  KEY `idx_churches_language` (`preferred_language`),
  KEY `idx_churches_active` (`is_active`),
  KEY `idx_churches_email` (`email`),
  KEY `idx_churches_setup` (`setup_complete`),
  KEY `idx_churches_created` (`created_at`),
  KEY `idx_churches_admin_email` (`admin_email`),
  KEY `idx_churches_sub_status` (`sub_status`),
  KEY `idx_churches_sub_renewal_date` (`sub_renewal_date`),
  CONSTRAINT `churches_ibfk_1` FOREIGN KEY (`preferred_language`) REFERENCES `languages` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=47 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `clients`
--

DROP TABLE IF EXISTS `clients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `clients` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `database_name` varchar(100) NOT NULL,
  `status` enum('active','suspended','trial') DEFAULT 'trial',
  `contact_email` varchar(255) NOT NULL,
  `branding_config` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`branding_config`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  UNIQUE KEY `database_name` (`database_name`),
  KEY `idx_clients_slug` (`slug`),
  KEY `idx_clients_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `component_action_summary`
--

DROP TABLE IF EXISTS `component_action_summary`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `component_action_summary` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `component_id` varchar(100) NOT NULL,
  `action` varchar(50) NOT NULL,
  `count` int(11) DEFAULT 0,
  `last_updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_component_action` (`component_id`,`action`),
  KEY `idx_component_id` (`component_id`),
  KEY `idx_action` (`action`)
) ENGINE=InnoDB AUTO_INCREMENT=1153 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `component_registry`
--

DROP TABLE IF EXISTS `component_registry`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `component_registry` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `file_path` text NOT NULL,
  `relative_path` text NOT NULL,
  `directory` varchar(500) DEFAULT NULL,
  `extension` varchar(10) DEFAULT NULL,
  `category` varchar(50) DEFAULT NULL,
  `props` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`props`)),
  `imports` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`imports`)),
  `exports` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`exports`)),
  `is_default` tinyint(1) DEFAULT 0,
  `has_jsx` tinyint(1) DEFAULT 0,
  `has_hooks` tinyint(1) DEFAULT 0,
  `dependencies` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`dependencies`)),
  `file_size` int(11) DEFAULT 0,
  `lines_of_code` int(11) DEFAULT 0,
  `complexity_score` int(11) DEFAULT 0,
  `last_modified` timestamp NULL DEFAULT NULL,
  `discovery_version` varchar(20) DEFAULT '1.0.0',
  `discovered_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_active` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_name` (`name`),
  KEY `idx_category` (`category`),
  KEY `idx_directory` (`directory`(255)),
  KEY `idx_active` (`is_active`),
  FULLTEXT KEY `idx_search` (`name`,`relative_path`,`directory`)
) ENGINE=InnoDB AUTO_INCREMENT=364 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `component_usage`
--

DROP TABLE IF EXISTS `component_usage`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `component_usage` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `church_id` int(11) DEFAULT NULL,
  `component_id` varchar(100) NOT NULL,
  `user_id` varchar(100) NOT NULL,
  `action` varchar(50) NOT NULL DEFAULT 'access',
  `timestamp` timestamp NOT NULL DEFAULT current_timestamp(),
  `session_id` varchar(255) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_component_id` (`component_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_timestamp` (`timestamp`),
  KEY `idx_component_user` (`component_id`,`user_id`),
  KEY `idx_component_action` (`component_id`,`action`),
  KEY `idx_component_usage_church` (`church_id`),
  CONSTRAINT `fk_component_usage_church` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1652 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `component_usage_summary`
--

DROP TABLE IF EXISTS `component_usage_summary`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `component_usage_summary` (
  `component_id` varchar(100) NOT NULL,
  `first_used` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `last_used` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `total_accesses` int(11) DEFAULT 0,
  `unique_users` int(11) DEFAULT 0,
  `last_updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`component_id`),
  KEY `idx_last_used` (`last_used`),
  KEY `idx_total_accesses` (`total_accesses`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `db_migrations`
--

DROP TABLE IF EXISTS `db_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `db_migrations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `migration_name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `applied_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `migration_name` (`migration_name`),
  KEY `idx_migration_name` (`migration_name`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `email_settings`
--

DROP TABLE IF EXISTS `email_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `email_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `provider` varchar(50) NOT NULL DEFAULT 'Custom',
  `smtp_host` varchar(255) NOT NULL,
  `smtp_port` int(11) NOT NULL DEFAULT 587,
  `smtp_secure` tinyint(1) NOT NULL DEFAULT 0,
  `smtp_user` varchar(255) NOT NULL,
  `smtp_pass_encrypted` varchar(500) DEFAULT NULL COMMENT 'Encrypted SMTP password using AES-256-CBC',
  `sender_name` varchar(255) NOT NULL DEFAULT 'OMAI Task System',
  `sender_email` varchar(255) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_provider` (`provider`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='SMTP configuration for email notifications';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `endpoint_map`
--

DROP TABLE IF EXISTS `endpoint_map`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `endpoint_map` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `endpoint_url` varchar(1000) NOT NULL,
  `endpoint_type` enum('api','page','asset','redirect','external') DEFAULT 'page',
  `method` enum('GET','POST','PUT','DELETE','PATCH','HEAD','OPTIONS') DEFAULT 'GET',
  `description` text DEFAULT NULL,
  `authentication_required` tinyint(1) DEFAULT 0,
  `parameters` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`parameters`)),
  `response_format` enum('html','json','xml','text','binary') DEFAULT 'html',
  `expected_status_code` int(11) DEFAULT 200,
  `last_tested` timestamp NULL DEFAULT NULL,
  `last_response_code` int(11) DEFAULT NULL,
  `last_response_time` int(11) DEFAULT NULL,
  `uptime_percentage` decimal(5,2) DEFAULT 100.00,
  `is_monitored` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `endpoint_url` (`endpoint_url`) USING HASH,
  KEY `idx_endpoint_type` (`endpoint_type`),
  KEY `idx_method` (`method`),
  KEY `idx_monitored` (`is_monitored`),
  KEY `idx_last_tested` (`last_tested`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `error_events`
--

DROP TABLE IF EXISTS `error_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `error_events` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `hash` varchar(32) NOT NULL COMMENT 'MD5 hash for deduplication',
  `message` text NOT NULL COMMENT 'Log message content',
  `details` text DEFAULT NULL COMMENT 'Additional details, stack trace, or context',
  `log_level` enum('INFO','WARN','ERROR','DEBUG','SUCCESS') DEFAULT 'ERROR' COMMENT 'Log severity level',
  `origin` varchar(64) DEFAULT NULL COMMENT 'Source origin: server, browser, devtools, etc.',
  `source_component` varchar(128) DEFAULT NULL COMMENT 'Component that generated the log',
  `source` varchar(64) DEFAULT 'unknown' COMMENT 'General source category: frontend, backend, etc.',
  `first_seen` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'When this error was first encountered',
  `last_seen` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'When this error was last encountered',
  `occurrences` int(11) DEFAULT 1 COMMENT 'Number of times this error has occurred',
  `severity` enum('low','medium','high') DEFAULT 'medium' COMMENT 'Legacy severity field',
  `resolved` tinyint(1) DEFAULT 0 COMMENT 'Whether this error has been resolved',
  `meta` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Additional metadata in JSON format' CHECK (json_valid(`meta`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `hash` (`hash`),
  KEY `idx_error_events_hash` (`hash`),
  KEY `idx_error_events_log_level` (`log_level`),
  KEY `idx_error_events_origin` (`origin`),
  KEY `idx_error_events_source_component` (`source_component`),
  KEY `idx_error_events_source` (`source`),
  KEY `idx_error_events_last_seen` (`last_seen`),
  KEY `idx_error_events_first_seen` (`first_seen`),
  KEY `idx_error_events_occurrences` (`occurrences`),
  KEY `idx_error_events_severity` (`severity`),
  KEY `idx_error_events_resolved` (`resolved`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `error_logs`
--

DROP TABLE IF EXISTS `error_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `error_logs` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `church_id` int(11) DEFAULT NULL,
  `error_id` varchar(100) DEFAULT NULL,
  `error_type` varchar(100) NOT NULL,
  `error_message` text NOT NULL,
  `stack_trace` text DEFAULT NULL,
  `context` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`context`)),
  `frequency` int(11) DEFAULT 1,
  `first_occurrence` timestamp(3) NOT NULL DEFAULT current_timestamp(3),
  `last_occurrence` timestamp(3) NOT NULL DEFAULT current_timestamp(3),
  `service_name` varchar(100) DEFAULT NULL,
  `component` varchar(100) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `session_id` varchar(255) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `is_resolved` tinyint(1) DEFAULT 0,
  `resolved_at` timestamp NULL DEFAULT NULL,
  `resolution_notes` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `error_id` (`error_id`),
  KEY `idx_error_type` (`error_type`),
  KEY `idx_service` (`service_name`),
  KEY `idx_frequency` (`frequency`),
  KEY `idx_first_occurrence` (`first_occurrence`),
  KEY `idx_resolved` (`is_resolved`),
  KEY `idx_error_logs_cleanup` (`first_occurrence`,`is_resolved`),
  KEY `idx_error_logs_church` (`church_id`),
  CONSTRAINT `fk_error_logs_church` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `error_report_activity`
--

DROP TABLE IF EXISTS `error_report_activity`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `error_report_activity` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `report_id` int(11) NOT NULL,
  `actor_user_id` int(11) DEFAULT NULL,
  `action` enum('create','comment','status','priority','assign') NOT NULL,
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`details`)),
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `report_id` (`report_id`),
  CONSTRAINT `error_report_activity_ibfk_1` FOREIGN KEY (`report_id`) REFERENCES `error_reports` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `error_reports`
--

DROP TABLE IF EXISTS `error_reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `error_reports` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `status` enum('open','triaged','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
  `priority` tinyint(4) NOT NULL DEFAULT 3,
  `title` varchar(160) NOT NULL,
  `description` text NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `reporter_name` varchar(120) DEFAULT NULL,
  `reporter_email` varchar(160) DEFAULT NULL,
  `is_superuser` tinyint(1) NOT NULL DEFAULT 0,
  `source` enum('ui','api','server') NOT NULL DEFAULT 'ui',
  `context_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`context_json`)),
  `tags` varchar(255) DEFAULT NULL,
  `attachments_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attachments_json`)),
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_priority` (`priority`),
  KEY `idx_created` (`created_at`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fasting_rules`
--

DROP TABLE IF EXISTS `fasting_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `fasting_rules` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `code` enum('strict','wine_oil','fish','dairy','fast_free') NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_fasting_rules_code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `feasts`
--

DROP TABLE IF EXISTS `feasts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `feasts` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `slug` varchar(120) NOT NULL,
  `name` varchar(255) NOT NULL,
  `feast_type` enum('major','minor','local') NOT NULL DEFAULT 'minor',
  `rank` tinyint(3) unsigned NOT NULL DEFAULT 1,
  `fixed_date` date DEFAULT NULL,
  `offset_from_pascha` smallint(6) DEFAULT NULL,
  `liturgical_color` enum('gold','white','red','green','purple','blue','black','silver') DEFAULT 'green',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_feasts_slug` (`slug`),
  KEY `idx_feasts_type` (`feast_type`),
  KEY `idx_feasts_fixed_date` (`fixed_date`),
  KEY `idx_feasts_offset_pascha` (`offset_from_pascha`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `friendships`
--

DROP TABLE IF EXISTS `friendships`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `friendships` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `requester_id` int(11) NOT NULL,
  `addressee_id` int(11) NOT NULL,
  `status` enum('pending','accepted','declined','blocked') DEFAULT 'pending',
  `requested_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `responded_at` timestamp NULL DEFAULT NULL,
  `notes` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_friendship` (`requester_id`,`addressee_id`),
  KEY `idx_requester_id` (`requester_id`),
  KEY `idx_addressee_id` (`addressee_id`),
  KEY `idx_status` (`status`),
  KEY `idx_requested_at` (`requested_at`),
  KEY `idx_friendships_users_status` (`requester_id`,`addressee_id`,`status`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `global_image_batches`
--

DROP TABLE IF EXISTS `global_image_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `global_image_batches` (
  `id` varchar(255) NOT NULL,
  `type` enum('profile','banner') NOT NULL,
  `original_image_path` text DEFAULT NULL,
  `original_filename` varchar(255) DEFAULT NULL,
  `original_width` int(11) DEFAULT NULL,
  `original_height` int(11) DEFAULT NULL,
  `tile_width` int(11) NOT NULL,
  `tile_height` int(11) NOT NULL,
  `grid_rows` int(11) NOT NULL,
  `grid_cols` int(11) NOT NULL,
  `mode` enum('auto','grid') DEFAULT 'auto',
  `total_tiles` int(11) DEFAULT 0,
  `saved_tiles` int(11) DEFAULT 0,
  `skipped_tiles` int(11) DEFAULT 0,
  `margin` int(11) DEFAULT 0,
  `padding` int(11) DEFAULT 0,
  `created_by` varchar(100) DEFAULT NULL,
  `status` enum('processing','completed','failed') DEFAULT 'processing',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_type` (`type`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `global_image_processing_logs`
--

DROP TABLE IF EXISTS `global_image_processing_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `global_image_processing_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `batch_id` varchar(255) DEFAULT NULL,
  `operation` varchar(100) NOT NULL,
  `level` enum('info','warning','error') DEFAULT 'info',
  `message` text DEFAULT NULL,
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`details`)),
  `timestamp` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_batch` (`batch_id`),
  KEY `idx_level` (`level`),
  KEY `idx_timestamp` (`timestamp`),
  CONSTRAINT `global_image_processing_logs_ibfk_1` FOREIGN KEY (`batch_id`) REFERENCES `global_image_batches` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `global_images`
--

DROP TABLE IF EXISTS `global_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `global_images` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `type` enum('profile','banner') NOT NULL,
  `file_path` text NOT NULL,
  `width` int(11) DEFAULT NULL,
  `height` int(11) DEFAULT NULL,
  `file_size` int(11) DEFAULT NULL,
  `source_batch_id` varchar(255) DEFAULT NULL,
  `original_filename` varchar(255) DEFAULT NULL,
  `created_by` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_type` (`type`),
  KEY `idx_batch` (`source_batch_id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_created_by` (`created_by`),
  CONSTRAINT `global_images_ibfk_1` FOREIGN KEY (`source_batch_id`) REFERENCES `global_image_batches` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `global_templates`
--

DROP TABLE IF EXISTS `global_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `global_templates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `type` varchar(50) NOT NULL,
  `content` longtext DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `images`
--

DROP TABLE IF EXISTS `images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `images` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `filename` varchar(255) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `size` int(11) NOT NULL,
  `mime_type` varchar(100) NOT NULL,
  `url` varchar(500) NOT NULL,
  `upload_date` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_filename` (`filename`),
  KEY `idx_upload_date` (`upload_date`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `import_field_mappings`
--

DROP TABLE IF EXISTS `import_field_mappings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `import_field_mappings` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `church_id` int(11) NOT NULL,
  `type` enum('baptisms','marriages','funerals') NOT NULL,
  `format` enum('csv','json','sql','xml') NOT NULL,
  `name` varchar(100) NOT NULL,
  `mapping` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`mapping`)),
  `is_default` tinyint(1) DEFAULT 0,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_import_mapping_name` (`church_id`,`type`,`format`,`name`),
  KEY `idx_import_mapping_church` (`church_id`),
  KEY `fk_import_mapping_user` (`created_by`),
  CONSTRAINT `fk_import_mapping_church` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`),
  CONSTRAINT `fk_import_mapping_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `import_files`
--

DROP TABLE IF EXISTS `import_files`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `import_files` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `job_id` bigint(20) unsigned NOT NULL,
  `storage_path` varchar(500) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `sha1_hash` char(40) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_import_files_sha1` (`sha1_hash`),
  KEY `idx_import_files_job` (`job_id`),
  CONSTRAINT `fk_import_files_job` FOREIGN KEY (`job_id`) REFERENCES `import_jobs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `import_jobs`
--

DROP TABLE IF EXISTS `import_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `import_jobs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `church_id` int(11) NOT NULL,
  `type` enum('baptisms','marriages','funerals') NOT NULL,
  `format` enum('csv','json','sql','xml') NOT NULL,
  `filename` varchar(255) NOT NULL,
  `size` bigint(20) unsigned NOT NULL DEFAULT 0,
  `status` enum('pending','running','done','error') NOT NULL DEFAULT 'pending',
  `total_rows` int(10) unsigned DEFAULT 0,
  `processed_rows` int(10) unsigned DEFAULT 0,
  `inserted_rows` int(10) unsigned DEFAULT 0,
  `updated_rows` int(10) unsigned DEFAULT 0,
  `skipped_rows` int(10) unsigned DEFAULT 0,
  `error_rows` int(10) unsigned DEFAULT 0,
  `started_at` datetime DEFAULT NULL,
  `finished_at` datetime DEFAULT NULL,
  `error_text` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_import_jobs_church` (`church_id`),
  KEY `idx_import_jobs_status` (`status`),
  KEY `idx_import_jobs_created` (`created_at`),
  KEY `fk_import_jobs_user` (`created_by`),
  CONSTRAINT `fk_import_jobs_church` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`),
  CONSTRAINT `fk_import_jobs_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `invoice_items`
--

DROP TABLE IF EXISTS `invoice_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoice_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `invoice_id` int(11) NOT NULL,
  `item_code` varchar(50) DEFAULT NULL,
  `name_multilang` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`name_multilang`)),
  `description_multilang` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`description_multilang`)),
  `category` enum('service','product','subscription','addon','discount','tax','fee') DEFAULT 'service',
  `quantity` decimal(10,3) DEFAULT 1.000,
  `unit_type` enum('each','hour','month','year','record','page','gb') DEFAULT 'each',
  `unit_price` decimal(10,2) NOT NULL,
  `discount_percent` decimal(5,2) DEFAULT 0.00,
  `discount_amount` decimal(10,2) DEFAULT 0.00,
  `line_total` decimal(10,2) NOT NULL,
  `tax_rate` decimal(5,2) DEFAULT 0.00,
  `tax_amount` decimal(10,2) DEFAULT 0.00,
  `sort_order` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_invoice_items_invoice` (`invoice_id`),
  KEY `idx_invoice_items_category` (`category`),
  CONSTRAINT `invoice_items_ibfk_1` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `invoices`
--

DROP TABLE IF EXISTS `invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoices` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `invoice_number` varchar(50) NOT NULL,
  `church_id` int(11) NOT NULL,
  `issue_date` date NOT NULL,
  `due_date` date DEFAULT NULL,
  `language` char(2) DEFAULT 'en',
  `currency` char(3) DEFAULT 'USD',
  `exchange_rate` decimal(10,6) DEFAULT 1.000000,
  `subtotal` decimal(10,2) DEFAULT 0.00,
  `tax_rate` decimal(5,2) DEFAULT 0.00,
  `tax_amount` decimal(10,2) DEFAULT 0.00,
  `discount_percent` decimal(5,2) DEFAULT 0.00,
  `discount_amount` decimal(10,2) DEFAULT 0.00,
  `total_amount` decimal(10,2) NOT NULL,
  `status` enum('draft','pending','sent','paid','overdue','cancelled') DEFAULT 'draft',
  `payment_terms_multilang` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payment_terms_multilang`)),
  `notes_multilang` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`notes_multilang`)),
  `internal_notes` text DEFAULT NULL,
  `pdf_path` varchar(500) DEFAULT NULL,
  `sent_at` timestamp NULL DEFAULT NULL,
  `paid_at` timestamp NULL DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `invoice_number` (`invoice_number`),
  KEY `language` (`language`),
  KEY `idx_invoices_church` (`church_id`),
  KEY `idx_invoices_status` (`status`),
  KEY `idx_invoices_date` (`issue_date`),
  KEY `idx_invoices_number` (`invoice_number`),
  KEY `idx_invoices_church_status` (`church_id`,`status`),
  KEY `idx_invoices_church_date` (`church_id`,`issue_date`),
  CONSTRAINT `invoices_ibfk_1` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `invoices_ibfk_2` FOREIGN KEY (`language`) REFERENCES `languages` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `kanban_board_members`
--

DROP TABLE IF EXISTS `kanban_board_members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `kanban_board_members` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `church_id` int(11) DEFAULT NULL,
  `board_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `role` enum('owner','admin','member','viewer') DEFAULT 'member',
  `joined_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `invited_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_board_member` (`board_id`,`user_id`),
  KEY `invited_by` (`invited_by`),
  KEY `idx_board_id` (`board_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_kanban_board_members_church` (`church_id`),
  CONSTRAINT `fk_kanban_board_members_church` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `kanban_board_members_ibfk_1` FOREIGN KEY (`board_id`) REFERENCES `kanban_boards` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `kanban_boards`
--

DROP TABLE IF EXISTS `kanban_boards`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `kanban_boards` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `church_id` int(11) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_archived` tinyint(1) DEFAULT 0,
  `board_color` varchar(7) DEFAULT '#1976d2',
  PRIMARY KEY (`id`),
  KEY `idx_created_by` (`created_by`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_kanban_boards_church` (`church_id`),
  CONSTRAINT `fk_kanban_boards_church` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `kanban_columns`
--

DROP TABLE IF EXISTS `kanban_columns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `kanban_columns` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `board_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `position` int(11) NOT NULL DEFAULT 0,
  `color` varchar(7) DEFAULT '#1976d2',
  `wip_limit` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_board_column_position` (`board_id`,`position`),
  KEY `idx_board_id` (`board_id`),
  KEY `idx_position` (`position`),
  CONSTRAINT `kanban_columns_ibfk_1` FOREIGN KEY (`board_id`) REFERENCES `kanban_boards` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=81 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `kanban_labels`
--

DROP TABLE IF EXISTS `kanban_labels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `kanban_labels` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `board_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `color` varchar(7) NOT NULL DEFAULT '#1976d2',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_board_label` (`board_id`,`name`),
  KEY `idx_board_id` (`board_id`),
  CONSTRAINT `kanban_labels_ibfk_1` FOREIGN KEY (`board_id`) REFERENCES `kanban_boards` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary table structure for view `kanban_sync_view`
--

DROP TABLE IF EXISTS `kanban_sync_view`;
/*!50001 DROP VIEW IF EXISTS `kanban_sync_view`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `kanban_sync_view` AS SELECT
 1 AS `total_tasks`,
  1 AS `synced_tasks`,
  1 AS `unsynced_tasks` */;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `kanban_task_activity`
--

DROP TABLE IF EXISTS `kanban_task_activity`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `kanban_task_activity` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `church_id` int(11) DEFAULT NULL,
  `task_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `action_type` enum('created','updated','moved','assigned','commented','completed','archived','deleted') NOT NULL,
  `description` text DEFAULT NULL,
  `old_value` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`old_value`)),
  `new_value` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`new_value`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_task_id` (`task_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_action_type` (`action_type`),
  KEY `idx_kanban_task_activity_church` (`church_id`),
  CONSTRAINT `fk_kanban_task_activity_church` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `kanban_task_activity_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `kanban_tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `kanban_task_attachments`
--

DROP TABLE IF EXISTS `kanban_task_attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `kanban_task_attachments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `task_id` int(11) NOT NULL,
  `filename` varchar(255) NOT NULL,
  `original_filename` varchar(255) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_size` int(11) NOT NULL,
  `mime_type` varchar(100) NOT NULL,
  `uploaded_by` int(11) NOT NULL,
  `uploaded_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_task_id` (`task_id`),
  KEY `idx_uploaded_by` (`uploaded_by`),
  CONSTRAINT `kanban_task_attachments_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `kanban_tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `kanban_task_comments`
--

DROP TABLE IF EXISTS `kanban_task_comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `kanban_task_comments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `church_id` int(11) DEFAULT NULL,
  `task_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `comment` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_task_id` (`task_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_kanban_task_comments_church` (`church_id`),
  CONSTRAINT `fk_kanban_task_comments_church` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `kanban_task_comments_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `kanban_tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `kanban_task_labels`
--

DROP TABLE IF EXISTS `kanban_task_labels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `kanban_task_labels` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `task_id` int(11) NOT NULL,
  `label_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_task_label` (`task_id`,`label_id`),
  KEY `label_id` (`label_id`),
  CONSTRAINT `kanban_task_labels_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `kanban_tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `kanban_task_labels_ibfk_2` FOREIGN KEY (`label_id`) REFERENCES `kanban_labels` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `kanban_tasks`
--

DROP TABLE IF EXISTS `kanban_tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `kanban_tasks` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `church_id` int(11) DEFAULT NULL,
  `board_id` int(11) NOT NULL,
  `column_id` int(11) NOT NULL,
  `title` varchar(500) NOT NULL,
  `description` text DEFAULT NULL,
  `markdown_content` text DEFAULT NULL,
  `markdown_filename` varchar(255) DEFAULT NULL,
  `position` int(11) NOT NULL DEFAULT 0,
  `priority` enum('low','medium','high','urgent') DEFAULT 'medium',
  `due_date` date DEFAULT NULL,
  `assigned_to` int(11) DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `completed_at` timestamp NULL DEFAULT NULL,
  `estimated_hours` decimal(5,2) DEFAULT NULL,
  `actual_hours` decimal(5,2) DEFAULT NULL,
  `task_color` varchar(7) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_column_task_position` (`column_id`,`position`),
  KEY `idx_board_id` (`board_id`),
  KEY `idx_column_id` (`column_id`),
  KEY `idx_position` (`position`),
  KEY `idx_assigned_to` (`assigned_to`),
  KEY `idx_created_by` (`created_by`),
  KEY `idx_due_date` (`due_date`),
  KEY `idx_kanban_tasks_church` (`church_id`),
  CONSTRAINT `fk_kanban_tasks_church` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `kanban_tasks_ibfk_1` FOREIGN KEY (`board_id`) REFERENCES `kanban_boards` (`id`) ON DELETE CASCADE,
  CONSTRAINT `kanban_tasks_ibfk_2` FOREIGN KEY (`column_id`) REFERENCES `kanban_columns` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `languages`
--

DROP TABLE IF EXISTS `languages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `languages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` char(2) NOT NULL,
  `name_native` varchar(100) NOT NULL,
  `name_english` varchar(100) NOT NULL,
  `rtl` tinyint(1) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `liturgical_days`
--

DROP TABLE IF EXISTS `liturgical_days`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `liturgical_days` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `calendar_system` enum('gregorian','julian','revised_julian') NOT NULL DEFAULT 'gregorian',
  `tone` tinyint(3) unsigned DEFAULT NULL,
  `liturgical_color` varchar(50) DEFAULT NULL,
  `fasting_rule_id` int(10) unsigned DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_liturgical_days_date_cal` (`date`,`calendar_system`),
  KEY `idx_liturgical_days_date` (`date`),
  KEY `fk_days_fasting_rule` (`fasting_rule_id`),
  CONSTRAINT `fk_days_fasting_rule` FOREIGN KEY (`fasting_rule_id`) REFERENCES `fasting_rules` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `liturgical_saints`
--

DROP TABLE IF EXISTS `liturgical_saints`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `liturgical_saints` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `day` date NOT NULL,
  `source` varchar(50) NOT NULL DEFAULT 'oca',
  `names_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`names_json`)),
  `url` varchar(255) NOT NULL,
  `fetched_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_day_source` (`day`,`source`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `locations`
--

DROP TABLE IF EXISTS `locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `locations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `address` text DEFAULT NULL,
  `city` varchar(50) DEFAULT NULL,
  `state` varchar(50) DEFAULT NULL,
  `country` varchar(50) DEFAULT 'USA',
  `zip_code` varchar(20) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `log_buffer`
--

DROP TABLE IF EXISTS `log_buffer`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `log_buffer` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `created_at` datetime DEFAULT current_timestamp(),
  `log_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`log_data`)),
  `processed` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_processed` (`processed`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `log_retention_policies`
--

DROP TABLE IF EXISTS `log_retention_policies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `log_retention_policies` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `table_name` varchar(100) NOT NULL,
  `retention_days` int(11) NOT NULL,
  `cleanup_frequency` enum('daily','weekly','monthly') DEFAULT 'weekly',
  `last_cleanup` timestamp NULL DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `table_name` (`table_name`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `menu_items`
--

DROP TABLE IF EXISTS `menu_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `menu_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `menu_key` varchar(100) NOT NULL,
  `title` varchar(255) NOT NULL,
  `path` varchar(255) DEFAULT NULL,
  `icon` varchar(100) DEFAULT NULL,
  `parent_id` int(11) DEFAULT NULL,
  `display_order` int(11) DEFAULT 0,
  `is_system_required` tinyint(1) DEFAULT 0,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `menu_key` (`menu_key`),
  KEY `idx_menu_parent` (`parent_id`),
  KEY `idx_menu_order` (`display_order`),
  CONSTRAINT `menu_items_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `menu_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=98 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `menus`
--

DROP TABLE IF EXISTS `menus`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `menus` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `parent_id` int(11) DEFAULT NULL,
  `key_name` varchar(255) NOT NULL,
  `label` varchar(255) NOT NULL,
  `icon` varchar(128) DEFAULT NULL,
  `path` varchar(255) DEFAULT NULL,
  `roles` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`roles`)),
  `role` enum('super_admin','default') NOT NULL DEFAULT 'default',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `order_index` int(11) NOT NULL DEFAULT 0,
  `meta` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`meta`)),
  `version` int(11) NOT NULL DEFAULT 1,
  `created_by` varchar(128) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `updated_by` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_role` (`role`),
  KEY `idx_active` (`is_active`),
  KEY `idx_menus_key` (`key_name`(191)),
  KEY `idx_menus_parent_active_order` (`parent_id`,`is_active`,`order_index`),
  KEY `idx_menus_path` (`path`(191)),
  KEY `idx_menus_updated_at` (`updated_at`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `migration_status`
--

DROP TABLE IF EXISTS `migration_status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `migration_status` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `migration_name` varchar(255) NOT NULL,
  `source_file` varchar(500) DEFAULT NULL,
  `target_tables` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`target_tables`)),
  `status` enum('pending','in_progress','completed','failed') DEFAULT 'pending',
  `records_migrated` int(11) DEFAULT 0,
  `total_records` int(11) DEFAULT 0,
  `error_message` text DEFAULT NULL,
  `started_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `migration_name` (`migration_name`),
  KEY `idx_status` (`status`),
  KEY `idx_migration_name` (`migration_name`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `news_headlines`
--

DROP TABLE IF EXISTS `news_headlines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `news_headlines` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` text DEFAULT NULL,
  `url` text DEFAULT NULL,
  `language` varchar(5) DEFAULT NULL,
  `source` varchar(255) DEFAULT NULL,
  `summary` text DEFAULT NULL,
  `image_url` text DEFAULT NULL,
  `published_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_language` (`language`),
  KEY `idx_source` (`source`),
  KEY `idx_published_at` (`published_at`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_url_unique` (`url`(500))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `note_categories`
--

DROP TABLE IF EXISTS `note_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `note_categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `color` varchar(20) DEFAULT '#e3f2fd',
  `icon` varchar(50) DEFAULT 'IconNote',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `note_shares`
--

DROP TABLE IF EXISTS `note_shares`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `note_shares` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `note_id` int(11) NOT NULL,
  `shared_with_user_id` int(11) NOT NULL,
  `permission` enum('read','write') DEFAULT 'read',
  `shared_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_note_share` (`note_id`,`shared_with_user_id`),
  KEY `shared_by` (`shared_by`),
  KEY `idx_note_shares_note_id` (`note_id`),
  KEY `idx_note_shares_user_id` (`shared_with_user_id`),
  CONSTRAINT `note_shares_ibfk_1` FOREIGN KEY (`note_id`) REFERENCES `notes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `notes`
--

DROP TABLE IF EXISTS `notes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `notes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `church_id` int(11) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `category` varchar(100) DEFAULT 'General',
  `tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tags`)),
  `color` varchar(20) DEFAULT '#ffffff',
  `is_pinned` tinyint(1) DEFAULT 0,
  `is_archived` tinyint(1) DEFAULT 0,
  `is_shared` tinyint(1) DEFAULT 0,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_notes_created_by` (`created_by`),
  KEY `idx_notes_category` (`category`),
  KEY `idx_notes_created_at` (`created_at`),
  KEY `idx_notes_is_pinned` (`is_pinned`),
  KEY `idx_notes_is_archived` (`is_archived`),
  KEY `idx_notes_church` (`church_id`),
  CONSTRAINT `fk_notes_church` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `notification_history`
--

DROP TABLE IF EXISTS `notification_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `church_id` int(11) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `notification_type_id` int(11) NOT NULL,
  `template_id` int(11) DEFAULT NULL,
  `delivery_method` enum('email','sms','push','in_app') NOT NULL,
  `recipient` varchar(255) DEFAULT NULL,
  `subject` varchar(255) DEFAULT NULL,
  `message` text DEFAULT NULL,
  `status` enum('sent','delivered','failed','bounced','opened','clicked') DEFAULT 'sent',
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `sent_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `delivered_at` timestamp NULL DEFAULT NULL,
  `opened_at` timestamp NULL DEFAULT NULL,
  `clicked_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `template_id` (`template_id`),
  KEY `idx_user_sent` (`user_id`,`sent_at`),
  KEY `idx_type_sent` (`notification_type_id`,`sent_at`),
  KEY `idx_delivery_method` (`delivery_method`),
  KEY `idx_status` (`status`),
  KEY `idx_history_user_type` (`user_id`,`notification_type_id`,`sent_at`),
  KEY `idx_notification_history_church` (`church_id`),
  CONSTRAINT `fk_notification_history_church` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `notification_history_ibfk_2` FOREIGN KEY (`notification_type_id`) REFERENCES `notification_types` (`id`) ON DELETE CASCADE,
  CONSTRAINT `notification_history_ibfk_3` FOREIGN KEY (`template_id`) REFERENCES `notification_templates` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `notification_queue`
--

DROP TABLE IF EXISTS `notification_queue`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification_queue` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `church_id` int(11) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `notification_type_id` int(11) NOT NULL,
  `template_id` int(11) DEFAULT NULL,
  `recipient_email` varchar(255) DEFAULT NULL,
  `recipient_phone` varchar(20) DEFAULT NULL,
  `subject` varchar(255) DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `message` text DEFAULT NULL,
  `html_message` text DEFAULT NULL,
  `data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`data`)),
  `priority` enum('low','normal','high','urgent') DEFAULT 'normal',
  `delivery_method` enum('email','sms','push','in_app') NOT NULL,
  `status` enum('pending','processing','sent','failed','cancelled') DEFAULT 'pending',
  `scheduled_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `sent_at` timestamp NULL DEFAULT NULL,
  `failed_at` timestamp NULL DEFAULT NULL,
  `attempts` int(11) DEFAULT 0,
  `max_attempts` int(11) DEFAULT 3,
  `error_message` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `notification_type_id` (`notification_type_id`),
  KEY `template_id` (`template_id`),
  KEY `idx_status_scheduled` (`status`,`scheduled_at`),
  KEY `idx_user_status` (`user_id`,`status`),
  KEY `idx_delivery_method` (`delivery_method`),
  KEY `idx_queue_priority_scheduled` (`priority`,`scheduled_at`),
  KEY `idx_notification_queue_church` (`church_id`),
  CONSTRAINT `fk_notification_queue_church` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `notification_queue_ibfk_2` FOREIGN KEY (`notification_type_id`) REFERENCES `notification_types` (`id`) ON DELETE CASCADE,
  CONSTRAINT `notification_queue_ibfk_3` FOREIGN KEY (`template_id`) REFERENCES `notification_templates` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `notification_subscriptions`
--

DROP TABLE IF EXISTS `notification_subscriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification_subscriptions` (
  `id` varchar(100) NOT NULL,
  `church_id` int(11) DEFAULT NULL,
  `user_id` varchar(100) NOT NULL,
  `task_id` varchar(100) DEFAULT NULL,
  `type` varchar(50) NOT NULL,
  `channels` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`channels`)),
  `filters` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`filters`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_task_id` (`task_id`),
  KEY `idx_type` (`type`),
  KEY `idx_notification_subscriptions_church` (`church_id`),
  CONSTRAINT `fk_notification_subscriptions_church` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `notification_subscriptions_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `ai_tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `notification_templates`
--

DROP TABLE IF EXISTS `notification_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification_templates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `notification_type_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `subject` varchar(255) DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `body_text` text DEFAULT NULL,
  `body_html` text DEFAULT NULL,
  `template_variables` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`template_variables`)),
  `language` varchar(10) DEFAULT 'en',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_type_language` (`notification_type_id`,`language`),
  CONSTRAINT `notification_templates_ibfk_1` FOREIGN KEY (`notification_type_id`) REFERENCES `notification_types` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `notification_types`
--

DROP TABLE IF EXISTS `notification_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification_types` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `category` enum('system','user','admin','billing','backup','security','certificates','reminders') DEFAULT 'system',
  `is_active` tinyint(1) DEFAULT 1,
  `default_enabled` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=92 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `church_id` int(11) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `notification_type_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`data`)),
  `priority` enum('low','normal','high','urgent') DEFAULT 'normal',
  `is_read` tinyint(1) DEFAULT 0,
  `is_dismissed` tinyint(1) DEFAULT 0,
  `read_at` timestamp NULL DEFAULT NULL,
  `dismissed_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `action_url` varchar(500) DEFAULT NULL,
  `action_text` varchar(100) DEFAULT NULL,
  `icon` varchar(100) DEFAULT NULL,
  `image_url` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `sender_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_user_read` (`user_id`,`is_read`),
  KEY `idx_user_created` (`user_id`,`created_at`),
  KEY `idx_expires` (`expires_at`),
  KEY `idx_priority` (`priority`),
  KEY `idx_notifications_user_priority` (`user_id`,`priority`,`created_at`),
  KEY `idx_notifications_type_created` (`notification_type_id`,`created_at`),
  KEY `idx_notifications_user_unread` (`user_id`,`is_read`,`created_at`),
  KEY `idx_sender_id` (`sender_id`),
  KEY `idx_notifications_church` (`church_id`),
  CONSTRAINT `fk_notifications_church` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `notifications_ibfk_2` FOREIGN KEY (`notification_type_id`) REFERENCES `notification_types` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ocr_jobs`
--

DROP TABLE IF EXISTS `ocr_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ocr_jobs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `church_id` int(11) NOT NULL,
  `filename` varchar(255) DEFAULT NULL,
  `status` enum('pending','processing','complete','error') DEFAULT NULL,
  `record_type` enum('baptism','marriage','funeral','custom') DEFAULT NULL,
  `language` char(2) DEFAULT NULL,
  `confidence_score` decimal(5,2) DEFAULT NULL,
  `error_regions` text DEFAULT NULL,
  `ocr_result` longtext DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `omai_command_contexts`
--

DROP TABLE IF EXISTS `omai_command_contexts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `omai_command_contexts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `page_path` varchar(255) NOT NULL,
  `suggested_commands` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`suggested_commands`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_page_path` (`page_path`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `omai_commands`
--

DROP TABLE IF EXISTS `omai_commands`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `omai_commands` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `command_key` varchar(100) NOT NULL,
  `category` varchar(50) NOT NULL,
  `patterns` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`patterns`)),
  `description` text DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `safety` enum('safe','moderate','dangerous') DEFAULT 'safe',
  `context_aware` tinyint(1) DEFAULT 0,
  `requires_hands_on` tinyint(1) DEFAULT 0,
  `requires_confirmation` tinyint(1) DEFAULT 0,
  `requires_parameters` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`requires_parameters`)),
  `allowed_roles` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`allowed_roles`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_active` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `command_key` (`command_key`),
  KEY `idx_category` (`category`),
  KEY `idx_safety` (`safety`),
  KEY `idx_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `omai_ethical_foundations`
--

DROP TABLE IF EXISTS `omai_ethical_foundations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `omai_ethical_foundations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `foundation_data` text DEFAULT NULL,
  `weight` decimal(5,2) DEFAULT 1.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `omai_learning_sessions`
--

DROP TABLE IF EXISTS `omai_learning_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `omai_learning_sessions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `session_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`session_data`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `omai_logs`
--

DROP TABLE IF EXISTS `omai_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `omai_logs` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `church_id` int(11) DEFAULT NULL,
  `omai_session_id` varchar(100) NOT NULL,
  `command` varchar(255) DEFAULT NULL,
  `command_type` varchar(100) DEFAULT NULL,
  `execution_status` enum('started','completed','failed','timeout') NOT NULL,
  `input_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`input_data`)),
  `output_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`output_data`)),
  `execution_time_ms` int(11) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `context_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`context_data`)),
  `error_message` text DEFAULT NULL,
  `created_at` timestamp(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `idx_session` (`omai_session_id`),
  KEY `idx_command_type` (`command_type`),
  KEY `idx_status` (`execution_status`),
  KEY `idx_user` (`user_id`),
  KEY `idx_created` (`created_at`),
  KEY `idx_omai_logs_cleanup` (`created_at`,`execution_status`),
  KEY `idx_omai_logs_church` (`church_id`),
  CONSTRAINT `fk_omai_logs_church` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `omai_md_agent_refs`
--

DROP TABLE IF EXISTS `omai_md_agent_refs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `omai_md_agent_refs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `catalog_id` int(11) NOT NULL,
  `agent_name` varchar(100) NOT NULL,
  `reference_context` text DEFAULT NULL,
  `reference_type` enum('mention','instruction','output','attribution') DEFAULT 'mention',
  `position_start` int(11) DEFAULT NULL,
  `position_end` int(11) DEFAULT NULL,
  `confidence_score` decimal(3,2) DEFAULT 1.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_catalog_id` (`catalog_id`),
  KEY `idx_agent_name` (`agent_name`),
  KEY `idx_reference_type` (`reference_type`),
  KEY `idx_confidence_score` (`confidence_score`),
  CONSTRAINT `omai_md_agent_refs_ibfk_1` FOREIGN KEY (`catalog_id`) REFERENCES `omai_md_catalog` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `omai_md_catalog`
--

DROP TABLE IF EXISTS `omai_md_catalog`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `omai_md_catalog` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ingestion_id` varchar(255) NOT NULL,
  `filename` varchar(500) NOT NULL,
  `file_path` varchar(1000) NOT NULL,
  `content` longtext NOT NULL,
  `content_preview` text DEFAULT NULL,
  `file_size` int(11) NOT NULL,
  `source_agent` varchar(100) NOT NULL DEFAULT 'user',
  `tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tags`)),
  `manual_tags` text DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `status` enum('ingested','parsed','indexed','error') DEFAULT 'ingested',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ingestion_id` (`ingestion_id`),
  KEY `idx_ingestion_id` (`ingestion_id`),
  KEY `idx_filename` (`filename`(255)),
  KEY `idx_source_agent` (`source_agent`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_file_size` (`file_size`),
  FULLTEXT KEY `idx_content_search` (`filename`,`content`,`manual_tags`,`content_preview`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `omai_md_search_history`
--

DROP TABLE IF EXISTS `omai_md_search_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `omai_md_search_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `query_text` varchar(1000) NOT NULL,
  `query_type` enum('natural_language','keyword','grep_command') DEFAULT 'natural_language',
  `results_count` int(11) DEFAULT 0,
  `clicked_catalog_id` int(11) DEFAULT NULL,
  `search_duration_ms` int(11) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `session_id` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_query_text` (`query_text`(255)),
  KEY `idx_query_type` (`query_type`),
  KEY `idx_clicked_catalog_id` (`clicked_catalog_id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_session_id` (`session_id`),
  CONSTRAINT `omai_md_search_history_ibfk_1` FOREIGN KEY (`clicked_catalog_id`) REFERENCES `omai_md_catalog` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `omai_md_search_index`
--

DROP TABLE IF EXISTS `omai_md_search_index`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `omai_md_search_index` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `catalog_id` int(11) NOT NULL,
  `search_vectors` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`search_vectors`)),
  `keywords` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`keywords`)),
  `concepts` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`concepts`)),
  `embeddings_hash` varchar(255) DEFAULT NULL,
  `indexed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_catalog_index` (`catalog_id`),
  KEY `idx_embeddings_hash` (`embeddings_hash`),
  KEY `idx_indexed_at` (`indexed_at`),
  CONSTRAINT `omai_md_search_index_ibfk_1` FOREIGN KEY (`catalog_id`) REFERENCES `omai_md_catalog` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `omai_md_structure`
--

DROP TABLE IF EXISTS `omai_md_structure`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `omai_md_structure` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `catalog_id` int(11) NOT NULL,
  `structure_type` enum('title','heading','checklist','code_block','table','link','image','list') NOT NULL,
  `level` int(11) DEFAULT 1,
  `content` text NOT NULL,
  `raw_content` longtext DEFAULT NULL,
  `position_start` int(11) DEFAULT NULL,
  `position_end` int(11) DEFAULT NULL,
  `auto_tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`auto_tags`)),
  `extracted_concepts` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`extracted_concepts`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_catalog_id` (`catalog_id`),
  KEY `idx_structure_type` (`structure_type`),
  KEY `idx_level` (`level`),
  KEY `idx_position` (`position_start`,`position_end`),
  FULLTEXT KEY `idx_structure_content` (`content`),
  CONSTRAINT `omai_md_structure_ibfk_1` FOREIGN KEY (`catalog_id`) REFERENCES `omai_md_catalog` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `omai_policies`
--

DROP TABLE IF EXISTS `omai_policies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `omai_policies` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `policy_name` varchar(100) NOT NULL,
  `policy_type` enum('security','access','command','user') DEFAULT 'security',
  `allowed_users` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`allowed_users`)),
  `blocked_commands` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`blocked_commands`)),
  `require_confirmation` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`require_confirmation`)),
  `allowed_roles` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`allowed_roles`)),
  `max_command_length` int(11) DEFAULT 1000,
  `timeout_seconds` int(11) DEFAULT 300,
  `log_all_commands` tinyint(1) DEFAULT 1,
  `policy_rules` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`policy_rules`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_active` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `policy_name` (`policy_name`),
  KEY `idx_policy_type` (`policy_type`),
  KEY `idx_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `omai_user_memories`
--

DROP TABLE IF EXISTS `omai_user_memories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `omai_user_memories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `memory_data` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `omb_documents`
--

DROP TABLE IF EXISTS `omb_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `omb_documents` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `content` longtext DEFAULT NULL,
  `document_type` enum('page','article','template','note','reference') DEFAULT 'page',
  `status` enum('draft','published','archived','deleted') DEFAULT 'draft',
  `author_id` int(11) DEFAULT NULL,
  `parent_document_id` int(11) DEFAULT NULL,
  `version_number` int(11) DEFAULT 1,
  `slug` varchar(255) DEFAULT NULL,
  `tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tags`)),
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `word_count` int(11) DEFAULT 0,
  `reading_time` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `published_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `idx_status` (`status`),
  KEY `idx_type` (`document_type`),
  KEY `idx_author` (`author_id`),
  KEY `idx_parent` (`parent_document_id`),
  KEY `idx_slug` (`slug`),
  FULLTEXT KEY `idx_content_search` (`title`,`content`),
  CONSTRAINT `omb_documents_ibfk_1` FOREIGN KEY (`parent_document_id`) REFERENCES `omb_documents` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `omb_edits`
--

DROP TABLE IF EXISTS `omb_edits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `omb_edits` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `document_id` int(11) NOT NULL,
  `editor_id` int(11) DEFAULT NULL,
  `edit_type` enum('create','update','delete','restore','version') DEFAULT 'update',
  `content_before` longtext DEFAULT NULL,
  `content_after` longtext DEFAULT NULL,
  `changes_summary` text DEFAULT NULL,
  `edit_metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`edit_metadata`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_document` (`document_id`),
  KEY `idx_editor` (`editor_id`),
  KEY `idx_edit_type` (`edit_type`),
  KEY `idx_created` (`created_at`),
  CONSTRAINT `omb_edits_ibfk_1` FOREIGN KEY (`document_id`) REFERENCES `omb_documents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `omb_templates`
--

DROP TABLE IF EXISTS `omb_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `omb_templates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `church_id` int(11) DEFAULT NULL,
  `template_name` varchar(255) NOT NULL,
  `template_content` longtext NOT NULL,
  `template_type` enum('article','page','form','layout','component') DEFAULT 'page',
  `description` text DEFAULT NULL,
  `variables` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`variables`)),
  `preview_image` varchar(500) DEFAULT NULL,
  `usage_count` int(11) DEFAULT 0,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_active` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `template_name` (`template_name`),
  KEY `idx_type` (`template_type`),
  KEY `idx_active` (`is_active`),
  KEY `idx_usage` (`usage_count`),
  KEY `idx_omb_templates_church` (`church_id`),
  CONSTRAINT `fk_omb_templates_church` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `omlearn_surveys`
--

DROP TABLE IF EXISTS `omlearn_surveys`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `omlearn_surveys` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `survey_id` varchar(100) DEFAULT NULL,
  `grade_group` varchar(50) DEFAULT NULL,
  `status` varchar(20) DEFAULT 'pending',
  `completed_questions` int(11) DEFAULT 0,
  `total_questions` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_survey_grade` (`user_id`,`survey_id`,`grade_group`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `orthodox_headlines`
--

DROP TABLE IF EXISTS `orthodox_headlines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `orthodox_headlines` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `source_name` varchar(100) NOT NULL,
  `title` text NOT NULL,
  `summary` text DEFAULT NULL,
  `image_url` text DEFAULT NULL,
  `article_url` text NOT NULL,
  `language` varchar(10) DEFAULT 'en',
  `pub_date` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_article` (`source_name`,`article_url`) USING HASH
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pages`
--

DROP TABLE IF EXISTS `pages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `pages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `slug` varchar(255) NOT NULL,
  `title` varchar(500) NOT NULL,
  `content` longtext DEFAULT NULL,
  `meta_description` text DEFAULT NULL,
  `status` enum('draft','published','archived') DEFAULT 'draft',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `idx_slug` (`slug`),
  KEY `idx_status` (`status`),
  KEY `idx_updated_at` (`updated_at`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `parish_map_data`
--

DROP TABLE IF EXISTS `parish_map_data`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `parish_map_data` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `parish_name` varchar(255) NOT NULL,
  `location_type` enum('church','monastery','shrine','cemetery','community') DEFAULT 'church',
  `latitude` decimal(10,8) NOT NULL,
  `longitude` decimal(11,8) NOT NULL,
  `address` text DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(50) DEFAULT NULL,
  `country` varchar(100) DEFAULT 'USA',
  `zip_code` varchar(20) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `website` varchar(500) DEFAULT NULL,
  `denomination` varchar(100) DEFAULT NULL,
  `language` varchar(50) DEFAULT 'English',
  `services_schedule` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`services_schedule`)),
  `geojson_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`geojson_data`)),
  `marker_style` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`marker_style`)),
  `popup_content` text DEFAULT NULL,
  `is_verified` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_active` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_location` (`latitude`,`longitude`),
  KEY `idx_city_state` (`city`,`state`),
  KEY `idx_location_type` (`location_type`),
  KEY `idx_denomination` (`denomination`),
  KEY `idx_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `password_reset_tokens`
--

DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_tokens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `token_hash` varchar(64) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `token_hash` (`token_hash`),
  KEY `idx_password_reset_user_id` (`user_id`),
  KEY `idx_password_reset_hash` (`token_hash`),
  KEY `idx_password_reset_expires` (`expires_at`),
  CONSTRAINT `fk_password_reset_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `password_resets`
--

DROP TABLE IF EXISTS `password_resets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_resets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `church_id` int(11) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `token_hash` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `token_hash` (`token_hash`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_expires_at` (`expires_at`),
  KEY `idx_password_resets_church` (`church_id`),
  CONSTRAINT `fk_password_resets_church` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_password_resets_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `permissions`
--

DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `permissions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `category` varchar(50) DEFAULT 'general',
  `module` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `post_media`
--

DROP TABLE IF EXISTS `post_media`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `post_media` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `post_id` bigint(20) unsigned NOT NULL,
  `kind` enum('image','video','file') NOT NULL,
  `url` varchar(512) NOT NULL,
  `thumbnail_url` varchar(512) DEFAULT NULL,
  `mime_type` varchar(128) DEFAULT NULL,
  `byte_size` bigint(20) unsigned DEFAULT NULL,
  `width` int(11) DEFAULT NULL,
  `height` int(11) DEFAULT NULL,
  `duration_seconds` int(11) DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_post` (`post_id`),
  KEY `idx_kind` (`kind`),
  CONSTRAINT `fk_post_media_post` FOREIGN KEY (`post_id`) REFERENCES `user_posts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `push_subscriptions`
--

DROP TABLE IF EXISTS `push_subscriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `push_subscriptions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `church_id` int(11) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `endpoint` varchar(500) NOT NULL,
  `p256dh` varchar(255) DEFAULT NULL,
  `auth` varchar(255) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_endpoint` (`user_id`,`endpoint`),
  KEY `idx_user_active` (`user_id`,`is_active`),
  KEY `idx_push_subscriptions_church` (`church_id`),
  CONSTRAINT `fk_push_subscriptions_church` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `question_answers`
--

DROP TABLE IF EXISTS `question_answers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `question_answers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `response_id` int(11) NOT NULL,
  `question_id` int(11) NOT NULL,
  `answer_text` text DEFAULT NULL,
  `answer_value` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`answer_value`)),
  `numeric_score` decimal(10,2) DEFAULT NULL,
  `answered_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_answer_per_response` (`response_id`,`question_id`),
  KEY `idx_response` (`response_id`),
  KEY `idx_question` (`question_id`),
  CONSTRAINT `question_answers_ibfk_1` FOREIGN KEY (`response_id`) REFERENCES `questionnaire_responses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `question_answers_ibfk_2` FOREIGN KEY (`question_id`) REFERENCES `questions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `questionnaire_responses`
--

DROP TABLE IF EXISTS `questionnaire_responses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `questionnaire_responses` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `church_id` int(11) DEFAULT NULL,
  `questionnaire_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `session_id` varchar(255) DEFAULT NULL,
  `participant_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`participant_data`)),
  `started_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `completed_at` timestamp NULL DEFAULT NULL,
  `is_completed` tinyint(1) DEFAULT 0,
  `total_score` decimal(10,2) DEFAULT NULL,
  `response_metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`response_metadata`)),
  PRIMARY KEY (`id`),
  KEY `idx_questionnaire` (`questionnaire_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_session` (`session_id`),
  KEY `idx_completed` (`is_completed`),
  KEY `idx_questionnaire_responses_church` (`church_id`),
  CONSTRAINT `fk_questionnaire_responses_church` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `questionnaire_responses_ibfk_1` FOREIGN KEY (`questionnaire_id`) REFERENCES `questionnaires` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `questionnaires`
--

DROP TABLE IF EXISTS `questionnaires`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `questionnaires` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `age_group` varchar(50) DEFAULT NULL,
  `version` varchar(20) DEFAULT '1.0',
  `author` varchar(255) DEFAULT NULL,
  `estimated_duration` int(11) DEFAULT 15,
  `questionnaire_type` enum('personality','cognitive','assessment','survey') DEFAULT 'assessment',
  `target_audience` varchar(100) DEFAULT NULL,
  `instructions` text DEFAULT NULL,
  `scoring_method` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_active` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_age_group` (`age_group`),
  KEY `idx_type` (`questionnaire_type`),
  KEY `idx_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `questions`
--

DROP TABLE IF EXISTS `questions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `questions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `questionnaire_id` int(11) NOT NULL,
  `question_id` varchar(100) NOT NULL,
  `question_text` text NOT NULL,
  `question_type` enum('radio','checkbox','slider','textarea','scale','dropdown') NOT NULL,
  `options` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`options`)),
  `min_value` int(11) DEFAULT NULL,
  `max_value` int(11) DEFAULT NULL,
  `labels` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`labels`)),
  `placeholder` text DEFAULT NULL,
  `is_required` tinyint(1) DEFAULT 1,
  `display_order` int(11) DEFAULT 0,
  `category` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_question_per_questionnaire` (`questionnaire_id`,`question_id`),
  KEY `idx_questionnaire` (`questionnaire_id`),
  KEY `idx_order` (`display_order`),
  KEY `idx_category` (`category`),
  CONSTRAINT `questions_ibfk_1` FOREIGN KEY (`questionnaire_id`) REFERENCES `questionnaires` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `readings`
--

DROP TABLE IF EXISTS `readings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `readings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `reading_date` date NOT NULL,
  `reading_type` enum('epistle','gospel','old_testament') NOT NULL,
  `book` varchar(100) DEFAULT NULL,
  `chapter_verse` varchar(100) DEFAULT NULL,
  `text` text DEFAULT NULL,
  `sequence` tinyint(4) DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_date_type_seq` (`reading_date`,`reading_type`,`sequence`),
  KEY `idx_date_type` (`reading_date`,`reading_type`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `record_reviews`
--

DROP TABLE IF EXISTS `record_reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `record_reviews` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `church_id` int(11) NOT NULL,
  `record_type` varchar(50) NOT NULL,
  `record_id` varchar(255) NOT NULL,
  `status` varchar(50) DEFAULT 'pending',
  `reviewer_id` int(11) DEFAULT NULL,
  `review_notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `reviewed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_church_status` (`church_id`,`status`),
  KEY `idx_created` (`created_at`),
  CONSTRAINT `record_reviews_ibfk_1` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON DELETE CASCADE
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `refresh_tokens`
--

DROP TABLE IF EXISTS `refresh_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `refresh_tokens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `church_id` int(11) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `token_hash` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `revoked_at` datetime DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token_hash` (`token_hash`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_expires_at` (`expires_at`),
  KEY `idx_revoked_at` (`revoked_at`),
  KEY `idx_refresh_tokens_church` (`church_id`),
  CONSTRAINT `fk_refresh_tokens_church` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_refresh_tokens_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=548 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `role_menu_permissions`
--

DROP TABLE IF EXISTS `role_menu_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_menu_permissions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `role` enum('super_admin','admin','manager','user','viewer','priest','deacon','church_admin','cantor','member','guest') NOT NULL,
  `menu_item_id` int(11) NOT NULL,
  `is_visible` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_role_menu` (`role`,`menu_item_id`),
  UNIQUE KEY `uniq_role_menu` (`role`,`menu_item_id`),
  KEY `idx_role_permissions` (`role`),
  KEY `idx_menu_permissions` (`menu_item_id`),
  CONSTRAINT `fk_menu_item` FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `role_menu_permissions_ibfk_1` FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=684 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `role_permissions`
--

DROP TABLE IF EXISTS `role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_permissions` (
  `role_id` int(11) NOT NULL,
  `permission_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`role_id`,`permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` text DEFAULT NULL,
  `is_system` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `router_menu_items`
--

DROP TABLE IF EXISTS `router_menu_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `router_menu_items` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `menu_id` bigint(20) NOT NULL,
  `label` varchar(256) NOT NULL,
  `path` varchar(512) DEFAULT NULL,
  `icon` varchar(128) DEFAULT NULL,
  `parent_id` bigint(20) DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `is_devel_tool` tinyint(1) NOT NULL DEFAULT 0,
  `visible_roles` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`visible_roles`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_menu_id` (`menu_id`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_sort_order` (`sort_order`),
  KEY `idx_devel_tool` (`is_devel_tool`),
  CONSTRAINT `router_menu_items_ibfk_1` FOREIGN KEY (`menu_id`) REFERENCES `menus` (`id`) ON DELETE CASCADE,
  CONSTRAINT `router_menu_items_ibfk_2` FOREIGN KEY (`parent_id`) REFERENCES `router_menu_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `router_menu_templates`
--

DROP TABLE IF EXISTS `router_menu_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `router_menu_templates` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `name` varchar(256) NOT NULL,
  `description` text DEFAULT NULL,
  `template_type` enum('menu','routes','combined') NOT NULL DEFAULT 'menu',
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`payload`)),
  `created_by` varchar(128) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_template_type` (`template_type`),
  KEY `idx_created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `router_menu_versions`
--

DROP TABLE IF EXISTS `router_menu_versions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `router_menu_versions` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `scope` enum('routes','menu') NOT NULL,
  `scope_id` bigint(20) DEFAULT NULL,
  `change_type` enum('create','update','delete','publish','reorder','template') NOT NULL,
  `before_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`before_json`)),
  `after_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`after_json`)),
  `changed_by` varchar(128) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_scope` (`scope`),
  KEY `idx_scope_id` (`scope_id`),
  KEY `idx_change_type` (`change_type`),
  KEY `idx_changed_by` (`changed_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `routes`
--

DROP TABLE IF EXISTS `routes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `routes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `path` varchar(255) NOT NULL,
  `component` varchar(255) NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `layout` varchar(64) DEFAULT NULL,
  `roles` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`roles`)),
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `order_index` int(11) NOT NULL DEFAULT 0,
  `tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tags`)),
  `meta` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`meta`)),
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `updated_by` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_routes_path` (`path`(191)),
  KEY `idx_routes_is_active_order` (`is_active`,`order_index`),
  KEY `idx_routes_layout` (`layout`),
  KEY `idx_routes_updated_at` (`updated_at`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `saints`
--

DROP TABLE IF EXISTS `saints`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `saints` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `epithet` varchar(255) DEFAULT NULL,
  `locale` varchar(32) DEFAULT 'en',
  `wikipedia_url` varchar(512) DEFAULT NULL,
  `troparion` text DEFAULT NULL,
  `kontakion` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_saints_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `scan_results`
--

DROP TABLE IF EXISTS `scan_results`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `scan_results` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `scan_id` varchar(100) NOT NULL,
  `url` varchar(1000) NOT NULL,
  `page_title` varchar(500) DEFAULT NULL,
  `http_status_code` int(11) NOT NULL,
  `response_time` int(11) DEFAULT NULL,
  `page_size` bigint(20) DEFAULT NULL,
  `load_time` int(11) DEFAULT NULL,
  `lighthouse_score` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`lighthouse_score`)),
  `accessibility_score` int(11) DEFAULT NULL,
  `seo_score` int(11) DEFAULT NULL,
  `performance_score` int(11) DEFAULT NULL,
  `meta_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`meta_data`)),
  `links_found` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`links_found`)),
  `images_found` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`images_found`)),
  `scripts_found` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`scripts_found`)),
  `scanned_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_scan_id` (`scan_id`),
  KEY `idx_url` (`url`(255)),
  KEY `idx_status` (`http_status_code`),
  KEY `idx_performance` (`performance_score`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `service_actions`
--

DROP TABLE IF EXISTS `service_actions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `service_actions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `service` varchar(50) NOT NULL,
  `action` varchar(20) NOT NULL,
  `timestamp` datetime NOT NULL,
  `success` tinyint(1) NOT NULL,
  `message` text DEFAULT NULL,
  `user_email` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_timestamp` (`timestamp`),
  KEY `idx_service` (`service`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `service_catalog`
--

DROP TABLE IF EXISTS `service_catalog`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `service_catalog` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `service_code` varchar(50) NOT NULL,
  `category` enum('church_services','record_processing','certificates','software_services','consulting','sacraments','other') DEFAULT 'church_services',
  `name_multilang` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`name_multilang`)),
  `description_multilang` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`description_multilang`)),
  `default_price` decimal(10,2) NOT NULL,
  `currency` char(3) DEFAULT 'USD',
  `unit_type` enum('each','hour','month','year','record','page','gb') DEFAULT 'each',
  `is_taxable` tinyint(1) DEFAULT 1,
  `is_recurring` tinyint(1) DEFAULT 0,
  `recurring_interval` enum('weekly','monthly','quarterly','yearly') DEFAULT NULL,
  `requires_approval` tinyint(1) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `sort_order` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `service_code` (`service_code`),
  KEY `idx_service_catalog_code` (`service_code`),
  KEY `idx_service_catalog_category` (`category`),
  KEY `idx_service_catalog_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary table structure for view `service_catalog_view`
--

DROP TABLE IF EXISTS `service_catalog_view`;
/*!50001 DROP VIEW IF EXISTS `service_catalog_view`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `service_catalog_view` AS SELECT
 1 AS `id`,
  1 AS `service_code`,
  1 AS `category`,
  1 AS `name_multilang`,
  1 AS `description_multilang`,
  1 AS `default_price`,
  1 AS `currency`,
  1 AS `unit_type`,
  1 AS `is_taxable`,
  1 AS `is_active`,
  1 AS `sort_order` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `session_details`
--

DROP TABLE IF EXISTS `session_details`;
/*!50001 DROP VIEW IF EXISTS `session_details`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `session_details` AS SELECT
 1 AS `session_id`,
  1 AS `user_id`,
  1 AS `expires`,
  1 AS `ip_address`,
  1 AS `user_agent`,
  1 AS `login_time`,
  1 AS `last_activity`,
  1 AS `is_active`,
  1 AS `email`,
  1 AS `first_name`,
  1 AS `last_name`,
  1 AS `role`,
  1 AS `church_name`,
  1 AS `is_valid`,
  1 AS `minutes_until_expiry` */;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `sessions`
--

DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `sessions` (
  `session_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `expires` int(11) unsigned NOT NULL,
  `data` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL COMMENT 'IP address of the user',
  `user_agent` text DEFAULT NULL COMMENT 'Browser user agent string',
  `login_time` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'When the session was created',
  `last_activity` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Last activity timestamp',
  `is_active` tinyint(1) DEFAULT 1 COMMENT 'Whether session is active',
  PRIMARY KEY (`session_id`),
  KEY `idx_expires` (`expires`),
  KEY `idx_sessions_user_id` (`user_id`),
  KEY `idx_sessions_expires` (`expires`),
  KEY `idx_sessions_is_active` (`is_active`),
  KEY `idx_sessions_login_time` (`login_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `settings`
--

DROP TABLE IF EXISTS `settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `key_name` varchar(100) NOT NULL,
  `value` text DEFAULT NULL,
  `description` text DEFAULT NULL,
  `type` enum('string','number','boolean','json') DEFAULT 'string',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `key_name` (`key_name`),
  KEY `idx_settings_key` (`key_name`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `site_errors`
--

DROP TABLE IF EXISTS `site_errors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `site_errors` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `scan_id` varchar(100) NOT NULL,
  `error_type` enum('404','500','timeout','redirect','ssl','dns','javascript','accessibility') NOT NULL,
  `url` varchar(1000) NOT NULL,
  `source_url` varchar(1000) DEFAULT NULL,
  `error_message` text DEFAULT NULL,
  `http_status_code` int(11) DEFAULT NULL,
  `response_time` int(11) DEFAULT NULL,
  `error_details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`error_details`)),
  `severity` enum('low','medium','high','critical') DEFAULT 'medium',
  `found_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `resolved_at` timestamp NULL DEFAULT NULL,
  `is_resolved` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_scan_id` (`scan_id`),
  KEY `idx_error_type` (`error_type`),
  KEY `idx_severity` (`severity`),
  KEY `idx_resolved` (`is_resolved`),
  KEY `idx_url` (`url`(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `site_survey_logs`
--

DROP TABLE IF EXISTS `site_survey_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `site_survey_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `scan_id` varchar(100) NOT NULL,
  `scan_type` enum('full','incremental','targeted','api_check','link_check') DEFAULT 'full',
  `start_url` varchar(500) NOT NULL,
  `scan_depth` int(11) DEFAULT 3,
  `total_pages_scanned` int(11) DEFAULT 0,
  `total_links_checked` int(11) DEFAULT 0,
  `total_errors_found` int(11) DEFAULT 0,
  `scan_duration` int(11) DEFAULT 0,
  `status` enum('running','completed','failed','cancelled') DEFAULT 'running',
  `user_agent` varchar(255) DEFAULT NULL,
  `scan_settings` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`scan_settings`)),
  `started_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `completed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_scan_id` (`scan_id`),
  KEY `idx_status` (`status`),
  KEY `idx_started` (`started_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `social_media`
--

DROP TABLE IF EXISTS `social_media`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `social_media` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `church_id` int(11) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `filename` varchar(255) NOT NULL,
  `original_filename` varchar(255) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_url` varchar(500) NOT NULL,
  `file_type` varchar(100) NOT NULL,
  `file_size` int(11) NOT NULL,
  `mime_type` varchar(100) NOT NULL,
  `alt_text` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `usage_type` enum('blog_image','profile_image','cover_image','chat_file','emoji','other') NOT NULL,
  `is_public` tinyint(1) DEFAULT 1,
  `download_count` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_usage_type` (`usage_type`),
  KEY `idx_file_type` (`file_type`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_social_media_church` (`church_id`),
  CONSTRAINT `fk_social_media_church` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `social_reactions`
--

DROP TABLE IF EXISTS `social_reactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `social_reactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `church_id` int(11) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `target_type` enum('blog_post','blog_comment','chat_message') NOT NULL,
  `target_id` int(11) NOT NULL,
  `reaction_type` enum('like','love','laugh','wow','sad','angry','pray','amen') NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_reaction` (`user_id`,`target_type`,`target_id`),
  KEY `idx_target` (`target_type`,`target_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_reaction_type` (`reaction_type`),
  KEY `idx_social_reactions_church` (`church_id`),
  CONSTRAINT `fk_social_reactions_church` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `subscriptions`
--

DROP TABLE IF EXISTS `subscriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `subscriptions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `church_id` int(11) NOT NULL,
  `plan_id` int(11) NOT NULL,
  `billing_cycle` enum('monthly','quarterly','yearly') NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `renewal_date` date NOT NULL,
  `status` enum('active','suspended','cancelled','trial','expired') DEFAULT 'trial',
  `amount` decimal(10,2) NOT NULL,
  `currency` char(3) DEFAULT 'USD',
  `discount_percent` decimal(5,2) DEFAULT 0.00,
  `discount_amount` decimal(10,2) DEFAULT 0.00,
  `payment_method` varchar(50) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `plan_id` (`plan_id`),
  KEY `idx_subscriptions_church` (`church_id`),
  KEY `idx_subscriptions_status` (`status`),
  KEY `idx_subscriptions_renewal` (`renewal_date`),
  KEY `idx_subscriptions_church_status` (`church_id`,`status`),
  CONSTRAINT `subscriptions_ibfk_1` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `subscriptions_ibfk_2` FOREIGN KEY (`plan_id`) REFERENCES `billing_plans` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `system_logs`
--

DROP TABLE IF EXISTS `system_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `system_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `timestamp` datetime DEFAULT current_timestamp(),
  `level` enum('INFO','WARN','ERROR','DEBUG','SUCCESS') NOT NULL,
  `source` varchar(100) NOT NULL,
  `message` text NOT NULL,
  `meta` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`meta`)),
  `user_email` varchar(255) DEFAULT NULL,
  `service` varchar(100) DEFAULT NULL,
  `session_id` varchar(255) DEFAULT NULL,
  `request_id` varchar(100) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_timestamp` (`timestamp`),
  KEY `idx_level` (`level`),
  KEY `idx_source` (`source`),
  KEY `idx_service` (`service`),
  KEY `idx_user_email` (`user_email`),
  KEY `idx_session_id` (`session_id`)
) ENGINE=InnoDB AUTO_INCREMENT=469082 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `system_settings`
--

DROP TABLE IF EXISTS `system_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `system_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `key_name` varchar(255) NOT NULL,
  `value_multilang` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`value_multilang`)),
  `data_type` enum('string','number','boolean','json','multilang_text') DEFAULT 'string',
  `category` varchar(100) DEFAULT NULL,
  `description_multilang` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`description_multilang`)),
  `is_public` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `key_name` (`key_name`),
  KEY `idx_settings_category` (`category`),
  KEY `idx_settings_public` (`is_public`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `task_activity_log`
--

DROP TABLE IF EXISTS `task_activity_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `task_activity_log` (
  `id` varchar(100) NOT NULL,
  `church_id` int(11) DEFAULT NULL,
  `task_id` varchar(100) NOT NULL,
  `user_id` varchar(100) NOT NULL,
  `action` varchar(100) NOT NULL,
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`details`)),
  `timestamp` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_task_id` (`task_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_action` (`action`),
  KEY `idx_timestamp` (`timestamp`),
  KEY `idx_task_activity_log_church` (`church_id`),
  CONSTRAINT `fk_task_activity_log_church` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `task_activity_log_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `ai_tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `task_assignment_logs`
--

DROP TABLE IF EXISTS `task_assignment_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `task_assignment_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `action` varchar(100) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `token` varchar(255) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`data`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `user_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_action` (`action`),
  KEY `idx_email` (`email`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `task_files`
--

DROP TABLE IF EXISTS `task_files`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `task_files` (
  `id` varchar(100) NOT NULL,
  `task_id` varchar(100) NOT NULL,
  `filename` varchar(255) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `type` enum('markdown','json','attachment','report') NOT NULL,
  `size` bigint(20) NOT NULL,
  `url` varchar(500) NOT NULL,
  `uploaded_by` varchar(100) NOT NULL,
  `uploaded_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  PRIMARY KEY (`id`),
  KEY `idx_task_id` (`task_id`),
  KEY `idx_type` (`type`),
  KEY `idx_uploaded_at` (`uploaded_at`),
  CONSTRAINT `task_files_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `ai_tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `task_links`
--

DROP TABLE IF EXISTS `task_links`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `task_links` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `expires_at` datetime DEFAULT (current_timestamp() + interval 30 day),
  `is_used` tinyint(1) DEFAULT 0,
  `used_at` datetime DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `status` enum('active','used','expired','deleted') NOT NULL DEFAULT 'active',
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `idx_token` (`token`),
  KEY `idx_email` (`email`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `task_notifications`
--

DROP TABLE IF EXISTS `task_notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `task_notifications` (
  `id` varchar(100) NOT NULL,
  `task_id` varchar(100) NOT NULL,
  `type` enum('status_change','due_date','assignment','comment','kanban_sync') NOT NULL,
  `message` text NOT NULL,
  `timestamp` timestamp NOT NULL DEFAULT current_timestamp(),
  `read` tinyint(1) DEFAULT 0,
  `priority` enum('low','medium','high','critical') DEFAULT 'medium',
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  PRIMARY KEY (`id`),
  KEY `idx_task_id` (`task_id`),
  KEY `idx_type` (`type`),
  KEY `idx_read` (`read`),
  KEY `idx_timestamp` (`timestamp`),
  CONSTRAINT `task_notifications_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `ai_tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `task_reports`
--

DROP TABLE IF EXISTS `task_reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `task_reports` (
  `id` varchar(100) NOT NULL,
  `task_id` varchar(100) NOT NULL,
  `format` enum('pdf','markdown','json','csv') NOT NULL,
  `filename` varchar(255) NOT NULL,
  `url` varchar(500) NOT NULL,
  `generated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `generated_by` varchar(100) NOT NULL,
  `content` text DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  PRIMARY KEY (`id`),
  KEY `idx_task_id` (`task_id`),
  KEY `idx_format` (`format`),
  KEY `idx_generated_at` (`generated_at`),
  CONSTRAINT `task_reports_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `ai_tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary table structure for view `task_stats_view`
--

DROP TABLE IF EXISTS `task_stats_view`;
/*!50001 DROP VIEW IF EXISTS `task_stats_view`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `task_stats_view` AS SELECT
 1 AS `total_tasks`,
  1 AS `pending_tasks`,
  1 AS `in_progress_tasks`,
  1 AS `completed_tasks`,
  1 AS `blocked_tasks`,
  1 AS `avg_estimated_hours`,
  1 AS `avg_actual_hours` */;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `task_submissions`
--

DROP TABLE IF EXISTS `task_submissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `task_submissions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ip_address` varchar(45) DEFAULT NULL,
  `task_link_id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `tasks_json` text NOT NULL,
  `submitted_at` datetime NOT NULL DEFAULT current_timestamp(),
  `sent_to_nick` tinyint(1) DEFAULT 0,
  `sent_at` datetime DEFAULT NULL,
  `status` enum('pending','processed','completed','failed') NOT NULL DEFAULT 'pending',
  `processed_at` datetime DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `submission_type` enum('public_token','internal_user','api') NOT NULL DEFAULT 'public_token',
  PRIMARY KEY (`id`),
  KEY `idx_task_link_id` (`task_link_id`),
  KEY `idx_submitted_at` (`submitted_at`),
  KEY `idx_task_submissions_composite` (`task_link_id`,`submitted_at`),
  CONSTRAINT `task_submissions_ibfk_1` FOREIGN KEY (`task_link_id`) REFERENCES `task_links` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Stores submitted tasks from users';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `temp_church_audit`
--

DROP TABLE IF EXISTS `temp_church_audit`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `temp_church_audit` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `database_name` varchar(100) DEFAULT NULL,
  `table_name` varchar(100) DEFAULT NULL,
  `has_church_id` tinyint(1) DEFAULT 0,
  `church_id_type` varchar(50) DEFAULT NULL,
  `has_foreign_key` tinyint(1) DEFAULT 0,
  `foreign_key_target` varchar(100) DEFAULT NULL,
  `record_count` int(11) DEFAULT 0,
  `missing_church_id_count` int(11) DEFAULT 0,
  `needs_migration` tinyint(1) DEFAULT 1,
  `audit_timestamp` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `templates`
--

DROP TABLE IF EXISTS `templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `templates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `record_type` enum('baptism','marriage','funeral','custom') NOT NULL,
  `description` text DEFAULT NULL,
  `fields` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`fields`)),
  `grid_type` enum('aggrid','mui','bootstrap') DEFAULT 'aggrid',
  `theme` varchar(50) DEFAULT 'liturgicalBlueGold',
  `layout_type` enum('table','form','dual') DEFAULT 'table',
  `language_support` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`language_support`)),
  `is_editable` tinyint(1) DEFAULT 1,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `church_id` int(11) DEFAULT NULL,
  `is_global` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  UNIQUE KEY `slug` (`slug`),
  KEY `idx_templates_church_id` (`church_id`),
  KEY `idx_templates_global` (`is_global`),
  KEY `idx_templates_church_type` (`church_id`,`record_type`),
  CONSTRAINT `fk_templates_church` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `translation_keys`
--

DROP TABLE IF EXISTS `translation_keys`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `translation_keys` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `key_name` varchar(255) NOT NULL,
  `category` varchar(100) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `key_name` (`key_name`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `translations`
--

DROP TABLE IF EXISTS `translations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `translations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `key_id` int(11) NOT NULL,
  `language_code` char(2) NOT NULL,
  `translation` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_translation` (`key_id`,`language_code`),
  KEY `idx_translations_lang` (`language_code`),
  KEY `idx_translations_key` (`key_id`),
  CONSTRAINT `translations_ibfk_1` FOREIGN KEY (`key_id`) REFERENCES `translation_keys` (`id`) ON DELETE CASCADE,
  CONSTRAINT `translations_ibfk_2` FOREIGN KEY (`language_code`) REFERENCES `languages` (`code`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `upload_logs`
--

DROP TABLE IF EXISTS `upload_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `upload_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `church_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `filename` varchar(255) NOT NULL,
  `file_type` varchar(50) DEFAULT NULL,
  `file_size` bigint(20) DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'pending',
  `error_message` text DEFAULT NULL,
  `processing_time_ms` int(11) DEFAULT NULL,
  `records_extracted` int(11) DEFAULT 0,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_church_status` (`church_id`,`status`),
  KEY `idx_created` (`created_at`),
  KEY `idx_user` (`user_id`),
  CONSTRAINT `upload_logs_ibfk_1` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_activity_logs`
--

DROP TABLE IF EXISTS `user_activity_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_activity_logs` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `church_id` int(11) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `action_type` varchar(100) NOT NULL,
  `resource_type` varchar(100) DEFAULT NULL,
  `resource_id` varchar(100) DEFAULT NULL,
  `action_details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`action_details`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `session_id` varchar(255) DEFAULT NULL,
  `success` tinyint(1) DEFAULT 1,
  `duration_ms` int(11) DEFAULT NULL,
  `created_at` timestamp(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_action` (`action_type`),
  KEY `idx_resource` (`resource_type`,`resource_id`),
  KEY `idx_created` (`created_at`),
  KEY `idx_success` (`success`),
  KEY `idx_user_activity_cleanup` (`created_at`,`user_id`),
  KEY `idx_user_activity_logs_church` (`church_id`),
  CONSTRAINT `fk_user_activity_logs_church` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_component_summary`
--

DROP TABLE IF EXISTS `user_component_summary`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_component_summary` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `church_id` int(11) DEFAULT NULL,
  `user_id` varchar(100) NOT NULL,
  `component_id` varchar(100) NOT NULL,
  `first_access` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `last_access` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `access_count` int(11) DEFAULT 0,
  `last_updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_component` (`user_id`,`component_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_component_id` (`component_id`),
  KEY `idx_last_access` (`last_access`),
  KEY `idx_user_component_summary_church` (`church_id`),
  CONSTRAINT `fk_user_component_summary_church` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1153 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_followers`
--

DROP TABLE IF EXISTS `user_followers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_followers` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) DEFAULT NULL,
  `follower_id` bigint(20) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq` (`user_id`,`follower_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary table structure for view `user_friends_view`
--

DROP TABLE IF EXISTS `user_friends_view`;
/*!50001 DROP VIEW IF EXISTS `user_friends_view`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `user_friends_view` AS SELECT
 1 AS `user_id`,
  1 AS `friend_id`,
  1 AS `first_name`,
  1 AS `last_name`,
  1 AS `display_name`,
  1 AS `profile_image_url`,
  1 AS `is_online`,
  1 AS `last_seen`,
  1 AS `friends_since` */;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `user_gallery`
--

DROP TABLE IF EXISTS `user_gallery`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_gallery` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) DEFAULT NULL,
  `url` varchar(500) DEFAULT NULL,
  `caption` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_images`
--

DROP TABLE IF EXISTS `user_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_images` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `image_type` enum('profile','cover','gallery','post') NOT NULL,
  `original_filename` varchar(255) DEFAULT NULL,
  `stored_filename` varchar(255) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_size` int(11) DEFAULT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `width` int(11) DEFAULT NULL,
  `height` int(11) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `upload_date` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user_images_user_id` (`user_id`),
  KEY `idx_user_images_type` (`image_type`),
  KEY `idx_user_images_active` (`is_active`),
  CONSTRAINT `user_images_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_notification_preferences`
--

DROP TABLE IF EXISTS `user_notification_preferences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_notification_preferences` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `church_id` int(11) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `notification_type_id` int(11) NOT NULL,
  `email_enabled` tinyint(1) DEFAULT 1,
  `push_enabled` tinyint(1) DEFAULT 1,
  `in_app_enabled` tinyint(1) DEFAULT 1,
  `sms_enabled` tinyint(1) DEFAULT 0,
  `frequency` enum('immediate','daily','weekly','monthly','disabled') DEFAULT 'immediate',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_type` (`user_id`,`notification_type_id`),
  KEY `notification_type_id` (`notification_type_id`),
  KEY `idx_user_notification_preferences_church` (`church_id`),
  CONSTRAINT `fk_user_notification_preferences_church` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `user_notification_preferences_ibfk_2` FOREIGN KEY (`notification_type_id`) REFERENCES `notification_types` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary table structure for view `user_notification_summary`
--

DROP TABLE IF EXISTS `user_notification_summary`;
/*!50001 DROP VIEW IF EXISTS `user_notification_summary`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `user_notification_summary` AS SELECT
 1 AS `user_id`,
  1 AS `email_enabled`,
  1 AS `sms_enabled`,
  1 AS `push_enabled`,
  1 AS `in_app_enabled`,
  1 AS `frequency`,
  1 AS `preference_count` */;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `user_posts`
--

DROP TABLE IF EXISTS `user_posts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_posts` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) DEFAULT NULL,
  `content` text DEFAULT NULL,
  `images` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`images`)),
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary table structure for view `user_profile_complete`
--

DROP TABLE IF EXISTS `user_profile_complete`;
/*!50001 DROP VIEW IF EXISTS `user_profile_complete`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `user_profile_complete` AS SELECT
 1 AS `user_id`,
  1 AS `first_name`,
  1 AS `last_name`,
  1 AS `email`,
  1 AS `role`,
  1 AS `is_active`,
  1 AS `profile_id`,
  1 AS `display_name`,
  1 AS `bio`,
  1 AS `location`,
  1 AS `website`,
  1 AS `phone`,
  1 AS `job_title`,
  1 AS `company`,
  1 AS `birthday`,
  1 AS `status_message`,
  1 AS `profile_theme`,
  1 AS `profile_image_url`,
  1 AS `cover_image_url`,
  1 AS `is_online`,
  1 AS `last_seen`,
  1 AS `followers_count`,
  1 AS `following_count`,
  1 AS `posts_count`,
  1 AS `church_affiliation`,
  1 AS `verification_status`,
  1 AS `privacy_settings`,
  1 AS `social_links`,
  1 AS `church_id`,
  1 AS `language`,
  1 AS `timezone`,
  1 AS `theme`,
  1 AS `show_email`,
  1 AS `show_phone`,
  1 AS `show_birthday`,
  1 AS `show_location`,
  1 AS `show_online_status`,
  1 AS `profile_created_at`,
  1 AS `profile_updated_at` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `user_profiles`
--

DROP TABLE IF EXISTS `user_profiles`;
/*!50001 DROP VIEW IF EXISTS `user_profiles`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `user_profiles` AS SELECT
 1 AS `id`,
  1 AS `church_id`,
  1 AS `user_id`,
  1 AS `display_name`,
  1 AS `bio`,
  1 AS `introduction`,
  1 AS `location`,
  1 AS `website`,
  1 AS `phone`,
  1 AS `job_title`,
  1 AS `company`,
  1 AS `followers_count`,
  1 AS `following_count`,
  1 AS `posts_count`,
  1 AS `church_affiliation`,
  1 AS `verification_status`,
  1 AS `profile_visibility`,
  1 AS `birthday`,
  1 AS `status_message`,
  1 AS `profile_theme`,
  1 AS `profile_image_url`,
  1 AS `cover_image_url`,
  1 AS `avatar_url`,
  1 AS `banner_url`,
  1 AS `is_online`,
  1 AS `last_seen`,
  1 AS `privacy_settings`,
  1 AS `social_links`,
  1 AS `is_active`,
  1 AS `created_at`,
  1 AS `updated_at` */;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `user_profiles_backup`
--

DROP TABLE IF EXISTS `user_profiles_backup`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_profiles_backup` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `church_id` int(11) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `display_name` varchar(100) DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `location` varchar(100) DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `job_title` varchar(100) DEFAULT NULL,
  `company` varchar(100) DEFAULT NULL,
  `followers_count` int(11) DEFAULT 0,
  `following_count` int(11) DEFAULT 0,
  `posts_count` int(11) DEFAULT 0,
  `church_affiliation` varchar(200) DEFAULT NULL,
  `verification_status` enum('none','pending','verified') DEFAULT 'none',
  `profile_visibility` enum('public','friends','private') DEFAULT 'public',
  `birthday` date DEFAULT NULL,
  `status_message` text DEFAULT NULL,
  `profile_theme` varchar(50) DEFAULT 'default',
  `profile_image_url` varchar(500) DEFAULT NULL,
  `cover_image_url` varchar(500) DEFAULT NULL,
  `is_online` tinyint(1) DEFAULT 0,
  `last_seen` timestamp NOT NULL DEFAULT current_timestamp(),
  `privacy_settings` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`privacy_settings`)),
  `social_links` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`social_links`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_profile` (`user_id`),
  KEY `idx_display_name` (`display_name`),
  KEY `idx_is_online` (`is_online`),
  KEY `idx_last_seen` (`last_seen`),
  KEY `idx_user_profiles_church` (`church_id`),
  KEY `idx_user_profiles_phone` (`phone`),
  KEY `idx_user_profiles_verification` (`verification_status`),
  KEY `idx_user_profiles_visibility` (`profile_visibility`),
  CONSTRAINT `fk_user_profiles_church` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_roles`
--

DROP TABLE IF EXISTS `user_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_roles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `role_id` int(11) NOT NULL,
  `church_id` int(11) DEFAULT NULL,
  `assigned_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_user_role_scope` (`user_id`,`role_id`,`church_id`),
  KEY `idx_user_roles_user` (`user_id`),
  KEY `idx_user_roles_role` (`role_id`),
  KEY `idx_user_roles_church` (`church_id`),
  CONSTRAINT `fk_user_roles_church` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_roles_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_roles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_security_settings`
--

DROP TABLE IF EXISTS `user_security_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_security_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `two_factor_enabled` tinyint(1) DEFAULT 0,
  `two_factor_method` enum('sms','email','app') DEFAULT 'email',
  `backup_codes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`backup_codes`)),
  `require_email_verification` tinyint(1) DEFAULT 1,
  `login_alerts` tinyint(1) DEFAULT 1,
  `suspicious_activity_alerts` tinyint(1) DEFAULT 1,
  `max_concurrent_sessions` int(11) DEFAULT 5,
  `session_timeout_minutes` int(11) DEFAULT 480,
  `auto_logout_enabled` tinyint(1) DEFAULT 0,
  `password_changed_at` timestamp NULL DEFAULT NULL,
  `password_expires_at` timestamp NULL DEFAULT NULL,
  `force_password_change` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_security` (`user_id`),
  KEY `idx_security_user_id` (`user_id`),
  CONSTRAINT `user_security_settings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_sessions`
--

DROP TABLE IF EXISTS `user_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_sessions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `church_id` int(11) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `session_token` varchar(255) NOT NULL,
  `device_info` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`device_info`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `last_activity` timestamp NOT NULL DEFAULT current_timestamp(),
  `expires_at` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_session_token` (`session_token`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_last_activity` (`last_activity`),
  KEY `idx_expires_at` (`expires_at`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_user_sessions_church` (`church_id`),
  CONSTRAINT `fk_user_sessions_church` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_sessions_social`
--

DROP TABLE IF EXISTS `user_sessions_social`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_sessions_social` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `church_id` int(11) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `session_token` varchar(255) NOT NULL,
  `device_info` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`device_info`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `last_activity` timestamp NOT NULL DEFAULT current_timestamp(),
  `expires_at` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_session_token` (`session_token`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_last_activity` (`last_activity`),
  KEY `idx_expires_at` (`expires_at`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_user_sessions_social_church` (`church_id`),
  CONSTRAINT `fk_user_sessions_social_church` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary table structure for view `user_settings`
--

DROP TABLE IF EXISTS `user_settings`;
/*!50001 DROP VIEW IF EXISTS `user_settings`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `user_settings` AS SELECT
 1 AS `id`,
  1 AS `user_id`,
  1 AS `language`,
  1 AS `timezone`,
  1 AS `date_format`,
  1 AS `time_format`,
  1 AS `currency`,
  1 AS `profile_visibility`,
  1 AS `show_email`,
  1 AS `show_phone`,
  1 AS `show_birthday`,
  1 AS `show_location`,
  1 AS `show_online_status`,
  1 AS `allow_messages`,
  1 AS `allow_friend_requests`,
  1 AS `theme`,
  1 AS `sidebar_collapsed`,
  1 AS `show_tutorial`,
  1 AS `created_at`,
  1 AS `updated_at` */;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `user_settings_backup`
--

DROP TABLE IF EXISTS `user_settings_backup`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_settings_backup` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `language` varchar(10) DEFAULT 'en',
  `timezone` varchar(50) DEFAULT 'UTC',
  `date_format` varchar(20) DEFAULT 'MM/DD/YYYY',
  `time_format` enum('12h','24h') DEFAULT '12h',
  `currency` varchar(10) DEFAULT 'USD',
  `profile_visibility` enum('public','friends','private') DEFAULT 'public',
  `show_email` tinyint(1) DEFAULT 0,
  `show_phone` tinyint(1) DEFAULT 0,
  `show_birthday` tinyint(1) DEFAULT 0,
  `show_location` tinyint(1) DEFAULT 1,
  `show_online_status` tinyint(1) DEFAULT 1,
  `allow_messages` tinyint(1) DEFAULT 1,
  `allow_friend_requests` tinyint(1) DEFAULT 1,
  `theme` varchar(20) DEFAULT 'light',
  `sidebar_collapsed` tinyint(1) DEFAULT 0,
  `show_tutorial` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_settings` (`user_id`),
  KEY `idx_settings_user_id` (`user_id`),
  CONSTRAINT `user_settings_backup_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_social_links`
--

DROP TABLE IF EXISTS `user_social_links`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_social_links` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `platform` varchar(50) NOT NULL,
  `username` varchar(100) DEFAULT NULL,
  `url` varchar(500) DEFAULT NULL,
  `is_verified` tinyint(1) DEFAULT 0,
  `display_order` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_social_links_user_id` (`user_id`),
  KEY `idx_social_links_platform` (`platform`),
  KEY `idx_social_links_active` (`is_active`),
  CONSTRAINT `user_social_links_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_social_settings`
--

DROP TABLE IF EXISTS `user_social_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_social_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `church_id` int(11) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `blog_enabled` tinyint(1) DEFAULT 1,
  `blog_comments_enabled` tinyint(1) DEFAULT 1,
  `blog_auto_approve_comments` tinyint(1) DEFAULT 1,
  `friend_requests_enabled` tinyint(1) DEFAULT 1,
  `chat_enabled` tinyint(1) DEFAULT 1,
  `notifications_enabled` tinyint(1) DEFAULT 1,
  `email_notifications` tinyint(1) DEFAULT 1,
  `push_notifications` tinyint(1) DEFAULT 1,
  `privacy_level` enum('public','friends','private') DEFAULT 'friends',
  `show_online_status` tinyint(1) DEFAULT 1,
  `allow_friend_requests` tinyint(1) DEFAULT 1,
  `allow_blog_access_requests` tinyint(1) DEFAULT 1,
  `custom_settings` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`custom_settings`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_settings` (`user_id`),
  KEY `idx_user_social_settings_church` (`church_id`),
  CONSTRAINT `fk_user_social_settings_church` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `username` varchar(100) DEFAULT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `display_name` varchar(200) DEFAULT NULL,
  `role` enum('super_admin','admin','manager','priest','moderator','user','viewer','guest','readonly_user') DEFAULT 'user',
  `church_id` int(11) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `preferred_language` varchar(10) DEFAULT 'en',
  `avatar_url` varchar(500) DEFAULT NULL COMMENT 'URL path to user avatar image',
  `banner_url` varchar(500) DEFAULT NULL COMMENT 'URL path to user banner image',
  `bio` text DEFAULT NULL COMMENT 'User biography/description',
  `introduction` text DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL COMMENT 'User website URL',
  `location` varchar(255) DEFAULT NULL COMMENT 'User location',
  `job_title` varchar(100) DEFAULT NULL,
  `company` varchar(100) DEFAULT NULL,
  `church_affiliation` varchar(200) DEFAULT NULL,
  `verification_status` enum('none','pending','verified') DEFAULT 'none',
  `profile_visibility` enum('public','friends','private') DEFAULT 'public',
  `birthday` date DEFAULT NULL,
  `status_message` text DEFAULT NULL,
  `ui_theme` varchar(20) DEFAULT 'light',
  `last_seen` timestamp NULL DEFAULT NULL,
  `is_online` tinyint(1) DEFAULT 0,
  `timezone` varchar(50) DEFAULT 'UTC',
  `language` varchar(10) DEFAULT 'en',
  `date_format` varchar(20) DEFAULT 'MM/DD/YYYY',
  `time_format` enum('12h','24h') DEFAULT '12h',
  `currency` varchar(10) DEFAULT 'USD',
  `show_email` tinyint(1) DEFAULT 0,
  `show_phone` tinyint(1) DEFAULT 0,
  `show_birthday` tinyint(1) DEFAULT 0,
  `show_location` tinyint(1) DEFAULT 1,
  `show_online_status` tinyint(1) DEFAULT 1,
  `allow_messages` tinyint(1) DEFAULT 1,
  `allow_friend_requests` tinyint(1) DEFAULT 1,
  `sidebar_collapsed` tinyint(1) DEFAULT 0,
  `show_tutorial` tinyint(1) DEFAULT 1,
  `followers_count` int(11) DEFAULT 0,
  `following_count` int(11) DEFAULT 0,
  `posts_count` int(11) DEFAULT 0,
  `social_links` longtext DEFAULT NULL,
  `privacy_settings` longtext DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `is_locked` tinyint(1) DEFAULT 0,
  `email_verified` tinyint(1) DEFAULT 0,
  `locked_at` datetime DEFAULT NULL,
  `locked_by` int(11) DEFAULT NULL,
  `lockout_reason` text DEFAULT NULL,
  `last_login` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `full_name` varchar(200) GENERATED ALWAYS AS (concat(coalesce(`first_name`,''),' ',coalesce(`last_name`,''))) STORED,
  `role_id` int(11) DEFAULT NULL,
  `billing_status` enum('paid_in_full','payment_plan','overdue','suspended') DEFAULT 'payment_plan',
  `account_balance` decimal(10,2) DEFAULT 0.00,
  `last_payment_date` date DEFAULT NULL,
  `next_payment_due` date DEFAULT NULL,
  `session_version` int(11) NOT NULL DEFAULT 0 COMMENT 'Incremented when password changes to invalidate existing sessions',
  `password_reset_token` varchar(255) DEFAULT NULL,
  `password_reset_expires` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `username` (`username`),
  KEY `idx_church_id` (`church_id`),
  KEY `idx_role` (`role`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_users_display_name` (`display_name`),
  KEY `idx_users_verification_status` (`verification_status`),
  KEY `idx_users_profile_visibility` (`profile_visibility`),
  KEY `idx_users_is_online` (`is_online`),
  KEY `idx_users_last_seen` (`last_seen`),
  KEY `idx_users_language` (`language`),
  KEY `idx_users_timezone` (`timezone`),
  KEY `idx_users_email` (`email`),
  KEY `idx_users_active` (`is_active`),
  KEY `idx_users_locked` (`is_locked`),
  KEY `idx_users_church` (`church_id`),
  KEY `idx_users_role` (`role_id`),
  CONSTRAINT `fk_users_church` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary table structure for view `v_backup_artifacts_recent`
--

DROP TABLE IF EXISTS `v_backup_artifacts_recent`;
/*!50001 DROP VIEW IF EXISTS `v_backup_artifacts_recent`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `v_backup_artifacts_recent` AS SELECT
 1 AS `id`,
  1 AS `job_id`,
  1 AS `artifact_type`,
  1 AS `path`,
  1 AS `size_bytes`,
  1 AS `manifest_path`,
  1 AS `manifest_text_path`,
  1 AS `sha256`,
  1 AS `created_at` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `v_backup_jobs_summary`
--

DROP TABLE IF EXISTS `v_backup_jobs_summary`;
/*!50001 DROP VIEW IF EXISTS `v_backup_jobs_summary`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `v_backup_jobs_summary` AS SELECT
 1 AS `id`,
  1 AS `kind`,
  1 AS `status`,
  1 AS `requested_by`,
  1 AS `started_at`,
  1 AS `finished_at`,
  1 AS `duration_ms`,
  1 AS `created_at`,
  1 AS `artifact_count`,
  1 AS `total_size_bytes` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `v_bb_intel_connections`
--

DROP TABLE IF EXISTS `v_bb_intel_connections`;
/*!50001 DROP VIEW IF EXISTS `v_bb_intel_connections`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `v_bb_intel_connections` AS SELECT
 1 AS `connection_type`,
  1 AS `file_count` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `v_bb_intel_pending`
--

DROP TABLE IF EXISTS `v_bb_intel_pending`;
/*!50001 DROP VIEW IF EXISTS `v_bb_intel_pending`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `v_bb_intel_pending` AS SELECT
 1 AS `id`,
  1 AS `filename`,
  1 AS `file_path`,
  1 AS `tags_json`,
  1 AS `intel_confidence`,
  1 AS `intel_status`,
  1 AS `item_type` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `v_bb_intel_suggestions`
--

DROP TABLE IF EXISTS `v_bb_intel_suggestions`;
/*!50001 DROP VIEW IF EXISTS `v_bb_intel_suggestions`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `v_bb_intel_suggestions` AS SELECT
 1 AS `id`,
  1 AS `filename`,
  1 AS `file_path`,
  1 AS `tags_json`,
  1 AS `intel_confidence`,
  1 AS `intel_status`,
  1 AS `suggestion_type` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `v_bb_intel_topology`
--

DROP TABLE IF EXISTS `v_bb_intel_topology`;
/*!50001 DROP VIEW IF EXISTS `v_bb_intel_topology`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `v_bb_intel_topology` AS SELECT
 1 AS `node_type`,
  1 AS `zone`,
  1 AS `file_count`,
  1 AS `avg_confidence`,
  1 AS `suggested_count`,
  1 AS `pending_count`,
  1 AS `approved_count` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `v_templates_with_church`
--

DROP TABLE IF EXISTS `v_templates_with_church`;

-- failed on view `v_templates_with_church`: CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_templates_with_church` AS select `t`.`id` AS `id`,`t`.`name` AS `name`,`t`.`slug` AS `slug`,`t`.`record_type` AS `record_type`,`t`.`description` AS `description`,`t`.`fields` AS `fields`,`t`.`grid_type` AS `grid_type`,`t`.`theme` AS `theme`,`t`.`layout_type` AS `layout_type`,`t`.`language_support` AS `language_support`,`t`.`is_editable` AS `is_editable`,`t`.`created_by` AS `created_by`,`t`.`created_at` AS `created_at`,`t`.`updated_at` AS `updated_at`,`t`.`church_id` AS `church_id`,`t`.`is_global` AS `is_global`,`c`.`name` AS `church_name`,`c`.`email` AS `church_email`,case when `t`.`is_global` = 1 then 'Global Template' else `c`.`name` end AS `display_scope` from (`templates` `t` left join `churches` `c` on(`t`.`church_id` = `c`.`id`))


--
-- Final view structure for view `agent_performance_view`
--

/*!50001 DROP VIEW IF EXISTS `agent_performance_view`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb3 */;
/*!50001 SET character_set_results     = utf8mb3 */;
/*!50001 SET collation_connection      = utf8mb3_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `agent_performance_view` AS select `ai_tasks`.`agent` AS `agent`,count(0) AS `total_tasks`,sum(case when `ai_tasks`.`status` = 'completed' then 1 else 0 end) AS `completed_tasks`,avg(`ai_tasks`.`estimated_hours`) AS `avg_estimated_hours`,avg(`ai_tasks`.`actual_hours`) AS `avg_actual_hours`,avg(to_days(`ai_tasks`.`due_date`) - to_days(`ai_tasks`.`created_at`)) AS `avg_days_to_complete` from `ai_tasks` group by `ai_tasks`.`agent` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `backup_statistics`
--

/*!50001 DROP VIEW IF EXISTS `backup_statistics`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb3 */;
/*!50001 SET character_set_results     = utf8mb3 */;
/*!50001 SET collation_connection      = utf8mb3_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `backup_statistics` AS select count(0) AS `total_backups`,count(case when `orthodoxmetrics_db`.`backup_files`.`status` = 'completed' then 1 end) AS `completed_backups`,count(case when `orthodoxmetrics_db`.`backup_files`.`status` = 'failed' then 1 end) AS `failed_backups`,count(case when `orthodoxmetrics_db`.`backup_files`.`type` = 'full' then 1 end) AS `full_backups`,count(case when `orthodoxmetrics_db`.`backup_files`.`type` = 'database' then 1 end) AS `database_backups`,count(case when `orthodoxmetrics_db`.`backup_files`.`type` = 'files' then 1 end) AS `files_backups`,sum(case when `orthodoxmetrics_db`.`backup_files`.`status` = 'completed' then `orthodoxmetrics_db`.`backup_files`.`size` else 0 end) AS `total_backup_size`,avg(case when `orthodoxmetrics_db`.`backup_files`.`status` = 'completed' then `orthodoxmetrics_db`.`backup_files`.`size` else NULL end) AS `average_backup_size`,max(`orthodoxmetrics_db`.`backup_files`.`created_at`) AS `latest_backup`,min(`orthodoxmetrics_db`.`backup_files`.`created_at`) AS `oldest_backup` from `backup_files` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `billing_plans_view`
--

/*!50001 DROP VIEW IF EXISTS `billing_plans_view`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb3 */;
/*!50001 SET character_set_results     = utf8mb3 */;
/*!50001 SET collation_connection      = utf8mb3_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `billing_plans_view` AS select `bp`.`id` AS `id`,`bp`.`plan_code` AS `plan_code`,`bp`.`name_multilang` AS `name_multilang`,`bp`.`description_multilang` AS `description_multilang`,`bp`.`features_multilang` AS `features_multilang`,`bp`.`price_monthly` AS `price_monthly`,`bp`.`price_quarterly` AS `price_quarterly`,`bp`.`price_yearly` AS `price_yearly`,`bp`.`currency` AS `currency`,`bp`.`max_users` AS `max_users`,`bp`.`max_records` AS `max_records`,`bp`.`is_active` AS `is_active` from `billing_plans` `bp` where `bp`.`is_active` = 1 order by `bp`.`sort_order`,`bp`.`price_monthly` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `blog_posts_with_author`
--

/*!50001 DROP VIEW IF EXISTS `blog_posts_with_author`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `blog_posts_with_author` AS select `bp`.`id` AS `id`,`bp`.`user_id` AS `user_id`,`bp`.`title` AS `title`,`bp`.`slug` AS `slug`,`bp`.`content` AS `content`,`bp`.`excerpt` AS `excerpt`,`bp`.`featured_image_url` AS `featured_image_url`,`bp`.`status` AS `status`,`bp`.`visibility` AS `visibility`,`bp`.`is_pinned` AS `is_pinned`,`bp`.`is_featured` AS `is_featured`,`bp`.`tags` AS `tags`,`bp`.`metadata` AS `metadata`,`bp`.`view_count` AS `view_count`,`bp`.`like_count` AS `like_count`,`bp`.`comment_count` AS `comment_count`,`bp`.`scheduled_at` AS `scheduled_at`,`bp`.`published_at` AS `published_at`,`bp`.`created_at` AS `created_at`,`bp`.`updated_at` AS `updated_at`,`u`.`first_name` AS `author_first_name`,`u`.`last_name` AS `author_last_name`,`up`.`display_name` AS `author_display_name`,`up`.`profile_image_url` AS `author_profile_image` from ((`blog_posts` `bp` join `users` `u` on(`u`.`id` = `bp`.`user_id`)) left join `user_profiles` `up` on(`up`.`user_id` = `bp`.`user_id`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `kanban_sync_view`
--

/*!50001 DROP VIEW IF EXISTS `kanban_sync_view`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb3 */;
/*!50001 SET character_set_results     = utf8mb3 */;
/*!50001 SET collation_connection      = utf8mb3_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `kanban_sync_view` AS select count(0) AS `total_tasks`,sum(case when `ai_tasks`.`linked_kanban_id` is not null then 1 else 0 end) AS `synced_tasks`,sum(case when `ai_tasks`.`linked_kanban_id` is null then 1 else 0 end) AS `unsynced_tasks` from `ai_tasks` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `service_catalog_view`
--

/*!50001 DROP VIEW IF EXISTS `service_catalog_view`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb3 */;
/*!50001 SET character_set_results     = utf8mb3 */;
/*!50001 SET collation_connection      = utf8mb3_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `service_catalog_view` AS select `sc`.`id` AS `id`,`sc`.`service_code` AS `service_code`,`sc`.`category` AS `category`,`sc`.`name_multilang` AS `name_multilang`,`sc`.`description_multilang` AS `description_multilang`,`sc`.`default_price` AS `default_price`,`sc`.`currency` AS `currency`,`sc`.`unit_type` AS `unit_type`,`sc`.`is_taxable` AS `is_taxable`,`sc`.`is_active` AS `is_active`,`sc`.`sort_order` AS `sort_order` from `service_catalog` `sc` where `sc`.`is_active` = 1 order by `sc`.`sort_order`,`sc`.`service_code` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `session_details`
--

/*!50001 DROP VIEW IF EXISTS `session_details`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb3 */;
/*!50001 SET character_set_results     = utf8mb3 */;
/*!50001 SET collation_connection      = utf8mb3_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `session_details` AS select `s`.`session_id` AS `session_id`,`s`.`user_id` AS `user_id`,`s`.`expires` AS `expires`,`s`.`ip_address` AS `ip_address`,`s`.`user_agent` AS `user_agent`,`s`.`login_time` AS `login_time`,`s`.`last_activity` AS `last_activity`,`s`.`is_active` AS `is_active`,`u`.`email` AS `email`,`u`.`first_name` AS `first_name`,`u`.`last_name` AS `last_name`,`u`.`role` AS `role`,`c`.`church_name` AS `church_name`,case when `s`.`expires` > unix_timestamp() then 1 else 0 end AS `is_valid`,case when `s`.`expires` > unix_timestamp() then floor((`s`.`expires` - unix_timestamp()) / 60) else 0 end AS `minutes_until_expiry` from ((`sessions` `s` left join `users` `u` on(`s`.`user_id` = `u`.`id`)) left join `churches` `c` on(`u`.`church_id` = `c`.`id`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `task_stats_view`
--

/*!50001 DROP VIEW IF EXISTS `task_stats_view`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb3 */;
/*!50001 SET character_set_results     = utf8mb3 */;
/*!50001 SET collation_connection      = utf8mb3_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `task_stats_view` AS select count(0) AS `total_tasks`,sum(case when `ai_tasks`.`status` = 'pending' then 1 else 0 end) AS `pending_tasks`,sum(case when `ai_tasks`.`status` = 'in_progress' then 1 else 0 end) AS `in_progress_tasks`,sum(case when `ai_tasks`.`status` = 'completed' then 1 else 0 end) AS `completed_tasks`,sum(case when `ai_tasks`.`status` = 'blocked' then 1 else 0 end) AS `blocked_tasks`,avg(`ai_tasks`.`estimated_hours`) AS `avg_estimated_hours`,avg(`ai_tasks`.`actual_hours`) AS `avg_actual_hours` from `ai_tasks` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `user_friends_view`
--

/*!50001 DROP VIEW IF EXISTS `user_friends_view`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `user_friends_view` AS select `f`.`requester_id` AS `user_id`,`f`.`addressee_id` AS `friend_id`,`u`.`first_name` AS `first_name`,`u`.`last_name` AS `last_name`,`up`.`display_name` AS `display_name`,`up`.`profile_image_url` AS `profile_image_url`,`up`.`is_online` AS `is_online`,`up`.`last_seen` AS `last_seen`,`f`.`requested_at` AS `friends_since` from ((`friendships` `f` join `users` `u` on(`u`.`id` = `f`.`addressee_id`)) left join `user_profiles` `up` on(`up`.`user_id` = `f`.`addressee_id`)) where `f`.`status` = 'accepted' union select `f`.`addressee_id` AS `user_id`,`f`.`requester_id` AS `friend_id`,`u`.`first_name` AS `first_name`,`u`.`last_name` AS `last_name`,`up`.`display_name` AS `display_name`,`up`.`profile_image_url` AS `profile_image_url`,`up`.`is_online` AS `is_online`,`up`.`last_seen` AS `last_seen`,`f`.`requested_at` AS `friends_since` from ((`friendships` `f` join `users` `u` on(`u`.`id` = `f`.`requester_id`)) left join `user_profiles` `up` on(`up`.`user_id` = `f`.`requester_id`)) where `f`.`status` = 'accepted' */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `user_notification_summary`
--

/*!50001 DROP VIEW IF EXISTS `user_notification_summary`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb3 */;
/*!50001 SET character_set_results     = utf8mb3 */;
/*!50001 SET collation_connection      = utf8mb3_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`orthodoxapps`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `user_notification_summary` AS select `user_notification_preferences`.`user_id` AS `user_id`,`user_notification_preferences`.`email_enabled` AS `email_enabled`,`user_notification_preferences`.`sms_enabled` AS `sms_enabled`,`user_notification_preferences`.`push_enabled` AS `push_enabled`,`user_notification_preferences`.`in_app_enabled` AS `in_app_enabled`,`user_notification_preferences`.`frequency` AS `frequency`,count(0) AS `preference_count` from `user_notification_preferences` group by `user_notification_preferences`.`user_id`,`user_notification_preferences`.`email_enabled`,`user_notification_preferences`.`sms_enabled`,`user_notification_preferences`.`push_enabled`,`user_notification_preferences`.`in_app_enabled`,`user_notification_preferences`.`frequency` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `user_profile_complete`
--

/*!50001 DROP VIEW IF EXISTS `user_profile_complete`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb3 */;
/*!50001 SET character_set_results     = utf8mb3 */;
/*!50001 SET collation_connection      = utf8mb3_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`orthodoxapps`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `user_profile_complete` AS select `u`.`id` AS `user_id`,`u`.`first_name` AS `first_name`,`u`.`last_name` AS `last_name`,`u`.`email` AS `email`,`u`.`role` AS `role`,`u`.`is_active` AS `is_active`,`up`.`id` AS `profile_id`,`up`.`display_name` AS `display_name`,`up`.`bio` AS `bio`,`up`.`location` AS `location`,`up`.`website` AS `website`,`up`.`phone` AS `phone`,`up`.`job_title` AS `job_title`,`up`.`company` AS `company`,`up`.`birthday` AS `birthday`,`up`.`status_message` AS `status_message`,`up`.`profile_theme` AS `profile_theme`,`up`.`profile_image_url` AS `profile_image_url`,`up`.`cover_image_url` AS `cover_image_url`,`up`.`is_online` AS `is_online`,`up`.`last_seen` AS `last_seen`,`up`.`followers_count` AS `followers_count`,`up`.`following_count` AS `following_count`,`up`.`posts_count` AS `posts_count`,`up`.`church_affiliation` AS `church_affiliation`,`up`.`verification_status` AS `verification_status`,`up`.`privacy_settings` AS `privacy_settings`,`up`.`social_links` AS `social_links`,`up`.`church_id` AS `church_id`,`us`.`language` AS `language`,`us`.`timezone` AS `timezone`,`us`.`theme` AS `theme`,`us`.`show_email` AS `show_email`,`us`.`show_phone` AS `show_phone`,`us`.`show_birthday` AS `show_birthday`,`us`.`show_location` AS `show_location`,`us`.`show_online_status` AS `show_online_status`,`up`.`created_at` AS `profile_created_at`,`up`.`updated_at` AS `profile_updated_at` from ((`users` `u` left join `user_profiles` `up` on(`u`.`id` = `up`.`user_id`)) left join `user_settings` `us` on(`u`.`id` = `us`.`user_id`)) where `u`.`is_active` = 1 */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `user_profiles`
--

/*!50001 DROP VIEW IF EXISTS `user_profiles`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb3 */;
/*!50001 SET character_set_results     = utf8mb3 */;
/*!50001 SET collation_connection      = utf8mb3_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `user_profiles` AS select `u`.`id` AS `id`,`u`.`church_id` AS `church_id`,`u`.`id` AS `user_id`,`u`.`display_name` AS `display_name`,`u`.`bio` AS `bio`,`u`.`introduction` AS `introduction`,`u`.`location` AS `location`,`u`.`website` AS `website`,`u`.`phone` AS `phone`,`u`.`job_title` AS `job_title`,`u`.`company` AS `company`,`u`.`followers_count` AS `followers_count`,`u`.`following_count` AS `following_count`,`u`.`posts_count` AS `posts_count`,`u`.`church_affiliation` AS `church_affiliation`,`u`.`verification_status` AS `verification_status`,`u`.`profile_visibility` AS `profile_visibility`,`u`.`birthday` AS `birthday`,`u`.`status_message` AS `status_message`,`u`.`ui_theme` AS `profile_theme`,`u`.`avatar_url` AS `profile_image_url`,`u`.`banner_url` AS `cover_image_url`,`u`.`avatar_url` AS `avatar_url`,`u`.`banner_url` AS `banner_url`,`u`.`is_online` AS `is_online`,`u`.`last_seen` AS `last_seen`,`u`.`privacy_settings` AS `privacy_settings`,`u`.`social_links` AS `social_links`,`u`.`is_active` AS `is_active`,`u`.`created_at` AS `created_at`,`u`.`updated_at` AS `updated_at` from `users` `u` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `user_settings`
--

/*!50001 DROP VIEW IF EXISTS `user_settings`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb3 */;
/*!50001 SET character_set_results     = utf8mb3 */;
/*!50001 SET collation_connection      = utf8mb3_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `user_settings` AS select `u`.`id` AS `id`,`u`.`id` AS `user_id`,`u`.`language` AS `language`,`u`.`timezone` AS `timezone`,`u`.`date_format` AS `date_format`,`u`.`time_format` AS `time_format`,`u`.`currency` AS `currency`,`u`.`profile_visibility` AS `profile_visibility`,`u`.`show_email` AS `show_email`,`u`.`show_phone` AS `show_phone`,`u`.`show_birthday` AS `show_birthday`,`u`.`show_location` AS `show_location`,`u`.`show_online_status` AS `show_online_status`,`u`.`allow_messages` AS `allow_messages`,`u`.`allow_friend_requests` AS `allow_friend_requests`,`u`.`ui_theme` AS `theme`,`u`.`sidebar_collapsed` AS `sidebar_collapsed`,`u`.`show_tutorial` AS `show_tutorial`,`u`.`created_at` AS `created_at`,`u`.`updated_at` AS `updated_at` from `users` `u` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_backup_artifacts_recent`
--

/*!50001 DROP VIEW IF EXISTS `v_backup_artifacts_recent`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_backup_artifacts_recent` AS select `a`.`id` AS `id`,`a`.`job_id` AS `job_id`,`a`.`artifact_type` AS `artifact_type`,`a`.`path` AS `path`,`a`.`size_bytes` AS `size_bytes`,`a`.`manifest_path` AS `manifest_path`,`a`.`manifest_text_path` AS `manifest_text_path`,`a`.`sha256` AS `sha256`,`a`.`created_at` AS `created_at` from `backup_artifacts` `a` order by `a`.`created_at` desc */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_backup_jobs_summary`
--

/*!50001 DROP VIEW IF EXISTS `v_backup_jobs_summary`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_backup_jobs_summary` AS select `j`.`id` AS `id`,`j`.`kind` AS `kind`,`j`.`status` AS `status`,`j`.`requested_by` AS `requested_by`,`j`.`started_at` AS `started_at`,`j`.`finished_at` AS `finished_at`,`j`.`duration_ms` AS `duration_ms`,`j`.`created_at` AS `created_at`,count(`a`.`id`) AS `artifact_count`,coalesce(sum(`a`.`size_bytes`),0) AS `total_size_bytes` from (`backup_jobs` `j` left join `backup_artifacts` `a` on(`a`.`job_id` = `j`.`id`)) group by `j`.`id` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_bb_intel_connections`
--

/*!50001 DROP VIEW IF EXISTS `v_bb_intel_connections`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb3 */;
/*!50001 SET character_set_results     = utf8mb3 */;
/*!50001 SET collation_connection      = utf8mb3_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_bb_intel_connections` AS select json_unquote(json_extract(`bigbook_files`.`connection_types_json`,concat('$[',`numbers`.`n`,']'))) AS `connection_type`,count(0) AS `file_count` from (`bigbook_files` join (select 0 AS `n` union select 1 AS `1` union select 2 AS `2` union select 3 AS `3` union select 4 AS `4`) `numbers`) where `bigbook_files`.`file_type` = 'markdown' and `bigbook_files`.`connection_types_json` is not null and json_unquote(json_extract(`bigbook_files`.`connection_types_json`,concat('$[',`numbers`.`n`,']'))) is not null group by json_unquote(json_extract(`bigbook_files`.`connection_types_json`,concat('$[',`numbers`.`n`,']'))) order by count(0) desc */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_bb_intel_pending`
--

/*!50001 DROP VIEW IF EXISTS `v_bb_intel_pending`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb3 */;
/*!50001 SET character_set_results     = utf8mb3 */;
/*!50001 SET collation_connection      = utf8mb3_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`orthodoxapps`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_bb_intel_pending` AS select `f`.`id` AS `id`,`f`.`filename` AS `filename`,`f`.`file_path` AS `file_path`,`f`.`tags_json` AS `tags_json`,`f`.`intel_confidence` AS `intel_confidence`,`f`.`intel_status` AS `intel_status`,'file' AS `item_type` from `bigbook_files` `f` where `f`.`intel_status` = 'pending' or `f`.`intel_status` = 'suggested' and `f`.`intel_confidence` < 0.90 union all select `c`.`id` AS `id`,`c`.`title` AS `filename`,NULL AS `file_path`,NULL AS `tags_json`,`c`.`confidence` AS `intel_confidence`,`c`.`status` AS `intel_status`,'cluster' AS `item_type` from `bb_clusters` `c` where `c`.`status` = 'pending' or `c`.`status` = 'suggested' and `c`.`confidence` < 0.90 */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_bb_intel_suggestions`
--

/*!50001 DROP VIEW IF EXISTS `v_bb_intel_suggestions`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb3 */;
/*!50001 SET character_set_results     = utf8mb3 */;
/*!50001 SET collation_connection      = utf8mb3_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`orthodoxapps`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_bb_intel_suggestions` AS select `f`.`id` AS `id`,`f`.`filename` AS `filename`,`f`.`file_path` AS `file_path`,`f`.`tags_json` AS `tags_json`,`f`.`intel_confidence` AS `intel_confidence`,`f`.`intel_status` AS `intel_status`,'file' AS `suggestion_type` from `bigbook_files` `f` where `f`.`intel_status` = 'suggested' and `f`.`intel_confidence` >= 0.90 union all select `c`.`id` AS `id`,`c`.`title` AS `filename`,NULL AS `file_path`,NULL AS `tags_json`,`c`.`confidence` AS `intel_confidence`,`c`.`status` AS `intel_status`,'cluster' AS `suggestion_type` from `bb_clusters` `c` where `c`.`status` = 'suggested' and `c`.`confidence` >= 0.90 */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_bb_intel_topology`
--

/*!50001 DROP VIEW IF EXISTS `v_bb_intel_topology`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb3 */;
/*!50001 SET character_set_results     = utf8mb3 */;
/*!50001 SET collation_connection      = utf8mb3_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_bb_intel_topology` AS select `bigbook_files`.`node_type` AS `node_type`,`bigbook_files`.`zone` AS `zone`,count(0) AS `file_count`,avg(`bigbook_files`.`node_confidence`) AS `avg_confidence`,count(case when `bigbook_files`.`intel_status` = 'suggested' then 1 end) AS `suggested_count`,count(case when `bigbook_files`.`intel_status` = 'pending' then 1 end) AS `pending_count`,count(case when `bigbook_files`.`intel_status` = 'approved' then 1 end) AS `approved_count` from `bigbook_files` where `bigbook_files`.`file_type` = 'markdown' and `bigbook_files`.`node_type` is not null group by `bigbook_files`.`node_type`,`bigbook_files`.`zone` order by count(0) desc */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_templates_with_church`
--

/*!50001 DROP VIEW IF EXISTS `v_templates_with_church`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_templates_with_church` AS select `t`.`id` AS `id`,`t`.`name` AS `name`,`t`.`slug` AS `slug`,`t`.`record_type` AS `record_type`,`t`.`description` AS `description`,`t`.`fields` AS `fields`,`t`.`grid_type` AS `grid_type`,`t`.`theme` AS `theme`,`t`.`layout_type` AS `layout_type`,`t`.`language_support` AS `language_support`,`t`.`is_editable` AS `is_editable`,`t`.`created_by` AS `created_by`,`t`.`created_at` AS `created_at`,`t`.`updated_at` AS `updated_at`,`t`.`church_id` AS `church_id`,`t`.`is_global` AS `is_global`,`c`.`name` AS `church_name`,`c`.`email` AS `church_email`,case when `t`.`is_global` = 1 then 'Global Template' else `c`.`name` end AS `display_scope` from (`templates` `t` left join `churches` `c` on(`t`.`church_id` = `c`.`id`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-12-02 13:13:26
