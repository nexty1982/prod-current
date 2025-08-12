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
-- Table structure for table `activity_feed`
--

DROP TABLE IF EXISTS `activity_feed`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `activity_feed` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
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
  CONSTRAINT `activity_feed_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `activity_feed_ibfk_2` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `activity_feed`
--

LOCK TABLES `activity_feed` WRITE;
/*!40000 ALTER TABLE `activity_feed` DISABLE KEYS */;
/*!40000 ALTER TABLE `activity_feed` ENABLE KEYS */;
UNLOCK TABLES;

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
  CONSTRAINT `activity_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `activity_log_ibfk_2` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_log_church` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=85 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `activity_log`
--

LOCK TABLES `activity_log` WRITE;
/*!40000 ALTER TABLE `activity_log` DISABLE KEYS */;
INSERT INTO `activity_log` VALUES (84,4,NULL,'cleanup_activity_logs',NULL,NULL,'{\"days_old\":1,\"records_deleted\":83,\"performed_by\":\"superadmin@orthodoxmetrics.com\"}','192.168.1.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0','2025-07-22 09:10:10');
/*!40000 ALTER TABLE `activity_log` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `autocephalous_churches`
--

LOCK TABLES `autocephalous_churches` WRITE;
/*!40000 ALTER TABLE `autocephalous_churches` DISABLE KEYS */;
/*!40000 ALTER TABLE `autocephalous_churches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `backup_files`
--

DROP TABLE IF EXISTS `backup_files`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `backup_files` (
  `id` varchar(255) NOT NULL,
  `filename` varchar(500) NOT NULL,
  `type` enum('full','database','files') NOT NULL DEFAULT 'full',
  `status` enum('in_progress','completed','failed') NOT NULL DEFAULT 'in_progress',
  `size` bigint(20) unsigned DEFAULT 0,
  `error_message` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `completed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_backup_files_type` (`type`),
  KEY `idx_backup_files_status` (`status`),
  KEY `idx_backup_files_created` (`created_at`),
  KEY `idx_backup_files_created_desc` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `backup_files`
--

LOCK TABLES `backup_files` WRITE;
/*!40000 ALTER TABLE `backup_files` DISABLE KEYS */;
INSERT INTO `backup_files` VALUES ('backup_2025-07-06T06-00-00-532Z_full','backup_2025-07-06T06-00-00-532Z_full.tar.gz','full','completed',180945321,NULL,'2025-07-06 06:00:00','2025-07-06 06:00:24'),('backup_2025-07-07T22-44-13-602Z_full','backup_2025-07-07T22-44-13-602Z_full.tar.gz','full','completed',181362805,NULL,'2025-07-07 22:44:13','2025-07-07 22:44:43'),('backup_2025-07-08T06-00-00-053Z_full','backup_2025-07-08T06-00-00-053Z_full.tar.gz','full','completed',181641754,NULL,'2025-07-08 06:00:00','2025-07-08 06:00:24'),('backup_2025-07-13T06-00-00-937Z_full','backup_2025-07-13T06-00-00-937Z_full.tar.gz','full','completed',369678046,NULL,'2025-07-13 06:00:00','2025-07-13 06:03:26'),('backup_2025-07-14T06-00-00-233Z_full','backup_2025-07-14T06-00-00-233Z_full.tar.gz','full','completed',377649666,NULL,'2025-07-14 06:00:00','2025-07-14 06:03:32'),('backup_2025-07-15T06-00-00-735Z_full','backup_2025-07-15T06-00-00-735Z_full.tar.gz','full','completed',434014287,NULL,'2025-07-15 06:00:00','2025-07-15 06:02:18'),('backup_2025-07-17T06-00-00-318Z_full','backup_2025-07-17T06-00-00-318Z_full.tar.gz','full','completed',300085476,NULL,'2025-07-17 06:00:00','2025-07-17 06:02:07'),('backup_2025-07-18T06-00-00-249Z_full','backup_2025-07-18T06-00-00-249Z_full.tar.gz','full','completed',338493698,NULL,'2025-07-18 06:00:00','2025-07-18 06:02:31'),('backup_2025-07-19T06-00-00-106Z_full','backup_2025-07-19T06-00-00-106Z_full.tar.gz','full','completed',344262357,NULL,'2025-07-19 06:00:00','2025-07-19 06:01:54'),('backup_2025-07-21T03-09-45-002Z_database','backup_2025-07-21T03-09-45-002Z_database.tar.gz','database','completed',218581,NULL,'2025-07-21 03:09:45','2025-07-21 03:09:45'),('backup_2025-07-21T03-09-48-701Z_database','backup_2025-07-21T03-09-48-701Z_database.tar.gz','database','completed',218614,NULL,'2025-07-21 03:09:48','2025-07-21 03:09:49'),('backup_2025-07-21T03-09-49-263Z_database','backup_2025-07-21T03-09-49-263Z_database.tar.gz','database','completed',218644,NULL,'2025-07-21 03:09:49','2025-07-21 03:09:49'),('backup_2025-07-21T06-00-00-704Z_full','backup_2025-07-21T06-00-00-704Z_full.tar.gz','full','completed',1108771221,NULL,'2025-07-21 06:00:00','2025-07-21 06:03:02');
/*!40000 ALTER TABLE `backup_files` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER IF NOT EXISTS backup_files_status_update
    BEFORE UPDATE ON backup_files
    FOR EACH ROW
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        SET NEW.completed_at = CURRENT_TIMESTAMP;
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `backup_restores`
--

DROP TABLE IF EXISTS `backup_restores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `backup_restores` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `backup_file_id` varchar(255) NOT NULL,
  `requested_by` int(11) NOT NULL,
  `status` enum('pending','in_progress','completed','failed') NOT NULL DEFAULT 'pending',
  `restore_type` enum('full','database_only','files_only') NOT NULL DEFAULT 'full',
  `error_message` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `started_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `backup_file_id` (`backup_file_id`),
  KEY `idx_backup_restores_status` (`status`),
  KEY `idx_backup_restores_requested_by` (`requested_by`),
  KEY `idx_backup_restores_created` (`created_at`),
  CONSTRAINT `backup_restores_ibfk_1` FOREIGN KEY (`backup_file_id`) REFERENCES `backup_files` (`id`) ON DELETE CASCADE,
  CONSTRAINT `backup_restores_ibfk_2` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `backup_restores`
--

LOCK TABLES `backup_restores` WRITE;
/*!40000 ALTER TABLE `backup_restores` DISABLE KEYS */;
/*!40000 ALTER TABLE `backup_restores` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `backup_schedule_history`
--

DROP TABLE IF EXISTS `backup_schedule_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `backup_schedule_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `backup_file_id` varchar(255) DEFAULT NULL,
  `schedule_type` enum('manual','scheduled') NOT NULL DEFAULT 'manual',
  `triggered_by` int(11) DEFAULT NULL,
  `started_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `completed_at` timestamp NULL DEFAULT NULL,
  `status` enum('running','completed','failed') NOT NULL DEFAULT 'running',
  `duration_seconds` int(11) DEFAULT NULL,
  `backup_size` bigint(20) unsigned DEFAULT 0,
  `error_message` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `backup_file_id` (`backup_file_id`),
  KEY `triggered_by` (`triggered_by`),
  KEY `idx_schedule_history_status` (`status`),
  KEY `idx_schedule_history_type` (`schedule_type`),
  KEY `idx_schedule_history_started` (`started_at`),
  CONSTRAINT `backup_schedule_history_ibfk_1` FOREIGN KEY (`backup_file_id`) REFERENCES `backup_files` (`id`) ON DELETE SET NULL,
  CONSTRAINT `backup_schedule_history_ibfk_2` FOREIGN KEY (`triggered_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `backup_schedule_history`
--

LOCK TABLES `backup_schedule_history` WRITE;
/*!40000 ALTER TABLE `backup_schedule_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `backup_schedule_history` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `backup_settings`
--

LOCK TABLES `backup_settings` WRITE;
/*!40000 ALTER TABLE `backup_settings` DISABLE KEYS */;
INSERT INTO `backup_settings` VALUES (1,'{\"enabled\":true,\"schedule\":\"0 2 * * *\",\"retention_days\":30,\"include_database\":true,\"include_files\":true,\"include_uploads\":true,\"compression\":true,\"email_notifications\":false,\"notification_email\":\"\",\"backup_location\":\"/opt/backups/orthodox-metrics\",\"max_backups\":50}','2025-07-06 03:25:33','2025-07-13 19:36:17');
/*!40000 ALTER TABLE `backup_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary table structure for view `backup_statistics`
--

DROP TABLE IF EXISTS `backup_statistics`;
/*!50001 DROP VIEW IF EXISTS `backup_statistics`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `backup_statistics` AS SELECT
 1 AS `total_backups`,
  1 AS `completed_backups`,
  1 AS `failed_backups`,
  1 AS `full_backups`,
  1 AS `database_backups`,
  1 AS `files_backups`,
  1 AS `total_backup_size`,
  1 AS `average_backup_size`,
  1 AS `latest_backup`,
  1 AS `oldest_backup` */;
SET character_set_client = @saved_cs_client;

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
-- Dumping data for table `billing_plans`
--

LOCK TABLES `billing_plans` WRITE;
/*!40000 ALTER TABLE `billing_plans` DISABLE KEYS */;
INSERT INTO `billing_plans` VALUES (1,'basic','{\"en\": \"Basic Plan\", \"gr\": \"Βασικό Πλάνο\", \"ru\": \"Базовый план\", \"ro\": \"Planul de bază\"}','{\"en\": \"Essential features for small churches\", \"gr\": \"Βασικά χαρακτηριστικά για μικρές εκκλησίες\", \"ru\": \"Основные функции для небольших церквей\", \"ro\": \"Caracteristici esențiale pentru biserici mici\"}','{\"en\": [\"Record Management\", \"Basic Reports\", \"Email Support\"], \"gr\": [\"Διαχείριση Αρχείων\", \"Βασικές Αναφορές\", \"Υποστήριξη Email\"], \"ru\": [\"Управление записями\", \"Базовые отчеты\", \"Email поддержка\"], \"ro\": [\"Managementul înregistrărilor\", \"Rapoarte de bază\", \"Suport email\"]}',29.99,79.99,299.99,'USD',5,1000,NULL,1,0,'2025-07-03 21:07:31','2025-07-03 21:07:31'),(2,'plus','{\"en\": \"Plus Plan\", \"gr\": \"Πλάνο Plus\", \"ru\": \"План Plus\", \"ro\": \"Planul Plus\"}','{\"en\": \"Advanced features for growing churches\", \"gr\": \"Προηγμένα χαρακτηριστικά για αναπτυσσόμενες εκκλησίες\", \"ru\": \"Расширенные функции для растущих церквей\", \"ro\": \"Caracteristici avansate pentru biserici în creștere\"}','{\"en\": [\"All Basic Features\", \"Advanced Reports\", \"Invoice Generation\", \"Phone Support\"], \"gr\": [\"Όλα τα Βασικά\", \"Προηγμένες Αναφορές\", \"Δημιουργία Τιμολογίων\", \"Τηλεφωνική Υποστήριξη\"], \"ru\": [\"Все базовые функции\", \"Расширенные отчеты\", \"Создание счетов\", \"Телефонная поддержка\"], \"ro\": [\"Toate caracteristicile de bază\", \"Rapoarte avansate\", \"Generarea facturilor\", \"Suport telefonic\"]}',59.99,159.99,599.99,'USD',15,5000,NULL,1,0,'2025-07-03 21:07:31','2025-07-03 21:07:31'),(3,'enterprise','{\"en\": \"Enterprise Plan\", \"gr\": \"Εταιρικό Πλάνο\", \"ru\": \"Корпоративный план\", \"ro\": \"Planul Enterprise\"}','{\"en\": \"Complete solution for large churches and dioceses\", \"gr\": \"Πλήρης λύση για μεγάλες εκκλησίες και επισκοπές\", \"ru\": \"Полное решение для больших церквей и епархий\", \"ro\": \"Soluție completă pentru biserici mari și episcopii\"}','{\"en\": [\"All Plus Features\", \"Multi-Church Management\", \"Custom Integrations\", \"Priority Support\", \"Unlimited Storage\"], \"gr\": [\"Όλα τα Plus\", \"Διαχείριση Πολλών Εκκλησιών\", \"Προσαρμοσμένες Ενσωματώσεις\", \"Προτεραιότητα Υποστήριξης\", \"Απεριόριστος Χώρος\"], \"ru\": [\"Все функции Plus\", \"Управление несколькими церквями\", \"Пользовательские интеграции\", \"Приоритетная поддержка\", \"Безлимитное хранилище\"], \"ro\": [\"Toate caracteristicile Plus\", \"Managementul mai multor biserici\", \"Integrări personalizate\", \"Suport prioritar\", \"Stocare nelimitată\"]}',99.99,269.99,999.99,'USD',NULL,NULL,NULL,1,0,'2025-07-03 21:07:31','2025-07-03 21:07:31');
/*!40000 ALTER TABLE `billing_plans` ENABLE KEYS */;
UNLOCK TABLES;

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
  KEY `idx_requested_at` (`requested_at`),
  CONSTRAINT `blog_access_requests_ibfk_1` FOREIGN KEY (`blog_owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `blog_access_requests_ibfk_2` FOREIGN KEY (`requester_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `blog_access_requests`
--

LOCK TABLES `blog_access_requests` WRITE;
/*!40000 ALTER TABLE `blog_access_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `blog_access_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `blog_categories`
--

DROP TABLE IF EXISTS `blog_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `blog_categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
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
  CONSTRAINT `blog_categories_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `blog_categories`
--

LOCK TABLES `blog_categories` WRITE;
/*!40000 ALTER TABLE `blog_categories` DISABLE KEYS */;
INSERT INTO `blog_categories` VALUES (1,4,'Faith & Spirituality','Posts about faith, prayer, and spiritual growth','#4a90e2','🙏',0,'2025-07-21 21:59:30'),(2,4,'Orthodox Traditions','Content about Orthodox customs and traditions','#7b68ee','⛪',0,'2025-07-21 21:59:30'),(3,4,'Personal Reflections','Personal thoughts and spiritual reflections','#50c878','💭',0,'2025-07-21 21:59:30'),(4,4,'Scripture Study','Bible study and scriptural insights','#ff6b6b','📖',0,'2025-07-21 21:59:30'),(5,4,'Community Life','Church community events and fellowship','#ffa500','👥',0,'2025-07-21 21:59:30');
/*!40000 ALTER TABLE `blog_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `blog_comments`
--

DROP TABLE IF EXISTS `blog_comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `blog_comments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
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
  CONSTRAINT `blog_comments_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `blog_posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `blog_comments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `blog_comments_ibfk_3` FOREIGN KEY (`parent_id`) REFERENCES `blog_comments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `blog_comments`
--

LOCK TABLES `blog_comments` WRITE;
/*!40000 ALTER TABLE `blog_comments` DISABLE KEYS */;
/*!40000 ALTER TABLE `blog_comments` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `blog_post_categories`
--

LOCK TABLES `blog_post_categories` WRITE;
/*!40000 ALTER TABLE `blog_post_categories` DISABLE KEYS */;
/*!40000 ALTER TABLE `blog_post_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `blog_posts`
--

DROP TABLE IF EXISTS `blog_posts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `blog_posts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
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
  FULLTEXT KEY `ft_title_content` (`title`,`content`),
  CONSTRAINT `blog_posts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `blog_posts`
--

LOCK TABLES `blog_posts` WRITE;
/*!40000 ALTER TABLE `blog_posts` DISABLE KEYS */;
INSERT INTO `blog_posts` VALUES (1,4,'Test','test','Test','Test...',NULL,'draft','public',0,0,'[]',NULL,0,0,0,NULL,NULL,'2025-07-22 00:44:04','2025-07-22 00:44:04'),(2,4,'Test','test-1','Test','Test...',NULL,'draft','public',0,0,'[]',NULL,0,0,0,NULL,NULL,'2025-07-22 00:44:20','2025-07-22 00:44:20');
/*!40000 ALTER TABLE `blog_posts` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Table structure for table `chat_conversations`
--

DROP TABLE IF EXISTS `chat_conversations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_conversations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
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
  CONSTRAINT `chat_conversations_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chat_conversations`
--

LOCK TABLES `chat_conversations` WRITE;
/*!40000 ALTER TABLE `chat_conversations` DISABLE KEYS */;
/*!40000 ALTER TABLE `chat_conversations` ENABLE KEYS */;
UNLOCK TABLES;

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
  CONSTRAINT `chat_messages_ibfk_2` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chat_messages_ibfk_3` FOREIGN KEY (`reply_to_id`) REFERENCES `chat_messages` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chat_messages`
--

LOCK TABLES `chat_messages` WRITE;
/*!40000 ALTER TABLE `chat_messages` DISABLE KEYS */;
/*!40000 ALTER TABLE `chat_messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chat_participants`
--

DROP TABLE IF EXISTS `chat_participants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_participants` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
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
  CONSTRAINT `chat_participants_ibfk_1` FOREIGN KEY (`conversation_id`) REFERENCES `chat_conversations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chat_participants_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chat_participants`
--

LOCK TABLES `chat_participants` WRITE;
/*!40000 ALTER TABLE `chat_participants` DISABLE KEYS */;
/*!40000 ALTER TABLE `chat_participants` ENABLE KEYS */;
UNLOCK TABLES;

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
  CONSTRAINT `church_admin_panel_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `church_admin_panel_ibfk_2` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `church_admin_panel`
--

LOCK TABLES `church_admin_panel` WRITE;
/*!40000 ALTER TABLE `church_admin_panel` DISABLE KEYS */;
/*!40000 ALTER TABLE `church_admin_panel` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `church_contacts`
--

LOCK TABLES `church_contacts` WRITE;
/*!40000 ALTER TABLE `church_contacts` DISABLE KEYS */;
/*!40000 ALTER TABLE `church_contacts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `churches`
--

DROP TABLE IF EXISTS `churches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `churches` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL DEFAULT '',
  `phone` varchar(50) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state_province` varchar(100) DEFAULT NULL,
  `postal_code` varchar(20) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
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
  `location` varchar(255) DEFAULT NULL,
  `church_name` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_churches_country` (`country`),
  KEY `idx_churches_language` (`preferred_language`),
  KEY `idx_churches_active` (`is_active`),
  KEY `idx_churches_email` (`email`),
  KEY `idx_churches_setup` (`setup_complete`),
  KEY `idx_churches_created` (`created_at`),
  KEY `idx_churches_admin_email` (`admin_email`),
  CONSTRAINT `churches_ibfk_1` FOREIGN KEY (`preferred_language`) REFERENCES `languages` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `churches`
--

LOCK TABLES `churches` WRITE;
/*!40000 ALTER TABLE `churches` DISABLE KEYS */;
INSERT INTO `churches` VALUES (14,'Saints Peter and Paul Orthodox Church','frjames@ssppoc.org','9086851452','605 Washington Ave, Manville NJ 088335','Manville','NJ','08835','United States','en','America/New_York','USD',NULL,'ssppoc.org',NULL,NULL,1,'2025-07-10 22:22:18','2025-07-21 20:19:49',1,1,1,1,NULL,NULL,NULL,NULL,'ssppoc_records_db','frjames@ssppoc.org','en',NULL,'Saints Peter and Paul Orthodox Church');
/*!40000 ALTER TABLE `churches` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `clients`
--

LOCK TABLES `clients` WRITE;
/*!40000 ALTER TABLE `clients` DISABLE KEYS */;
INSERT INTO `clients` VALUES (1,'Saints Peter & Paul Orthodox Church','ssppoc','orthodox_ssppoc','trial','admin@ssppoc.org','{\"primaryColor\": \"#1976d2\", \"secondaryColor\": \"#dc004e\"}','2025-07-09 11:41:08','2025-07-09 11:41:08'),(2,'St. Mary Orthodox Church','stmary','orthodox_stmary','trial','admin@stmary.org','{\"primaryColor\": \"#d32f2f\", \"secondaryColor\": \"#1976d2\"}','2025-07-09 11:41:08','2025-07-09 11:41:08'),(3,'Holy Trinity Cathedral','holytrinity','orthodox_holytrinity','trial','admin@holytrinity.org','{\"primaryColor\": \"#388e3c\", \"secondaryColor\": \"#d32f2f\"}','2025-07-09 11:41:08','2025-07-09 11:41:08'),(4,'ssppoc2','ssppoc2','orthodox_ssppoc2','active','frjames@ssppoc.org','{}','2025-07-09 13:02:31','2025-07-09 13:02:31');
/*!40000 ALTER TABLE `clients` ENABLE KEYS */;
UNLOCK TABLES;

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
  KEY `idx_friendships_users_status` (`requester_id`,`addressee_id`,`status`),
  CONSTRAINT `friendships_ibfk_1` FOREIGN KEY (`requester_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `friendships_ibfk_2` FOREIGN KEY (`addressee_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `friendships`
--

LOCK TABLES `friendships` WRITE;
/*!40000 ALTER TABLE `friendships` DISABLE KEYS */;
/*!40000 ALTER TABLE `friendships` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `images`
--

LOCK TABLES `images` WRITE;
/*!40000 ALTER TABLE `images` DISABLE KEYS */;
INSERT INTO `images` VALUES (1,'image-1752071420432-384120148.jpg','IMG_2024_10_22_11_41_04S.jpg',1338978,'image/jpeg','/uploads/image-1752071420432-384120148.jpg','2025-07-09 14:30:20');
/*!40000 ALTER TABLE `images` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `invoice_items`
--

LOCK TABLES `invoice_items` WRITE;
/*!40000 ALTER TABLE `invoice_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `invoice_items` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `invoices`
--

LOCK TABLES `invoices` WRITE;
/*!40000 ALTER TABLE `invoices` DISABLE KEYS */;
/*!40000 ALTER TABLE `invoices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kanban_board_members`
--

DROP TABLE IF EXISTS `kanban_board_members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `kanban_board_members` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
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
  CONSTRAINT `kanban_board_members_ibfk_1` FOREIGN KEY (`board_id`) REFERENCES `kanban_boards` (`id`) ON DELETE CASCADE,
  CONSTRAINT `kanban_board_members_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `kanban_board_members_ibfk_3` FOREIGN KEY (`invited_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kanban_board_members`
--

LOCK TABLES `kanban_board_members` WRITE;
/*!40000 ALTER TABLE `kanban_board_members` DISABLE KEYS */;
INSERT INTO `kanban_board_members` VALUES (12,9,4,'owner','2025-07-15 20:43:22',NULL);
/*!40000 ALTER TABLE `kanban_board_members` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kanban_boards`
--

DROP TABLE IF EXISTS `kanban_boards`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `kanban_boards` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
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
  CONSTRAINT `kanban_boards_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kanban_boards`
--

LOCK TABLES `kanban_boards` WRITE;
/*!40000 ALTER TABLE `kanban_boards` DISABLE KEYS */;
INSERT INTO `kanban_boards` VALUES (9,'dev','',4,'2025-07-15 20:43:22','2025-07-15 20:43:22',0,'#1976d2');
/*!40000 ALTER TABLE `kanban_boards` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kanban_columns`
--

LOCK TABLES `kanban_columns` WRITE;
/*!40000 ALTER TABLE `kanban_columns` DISABLE KEYS */;
INSERT INTO `kanban_columns` VALUES (33,9,'To Do',0,'#e3f2fd',NULL,'2025-07-15 20:43:22','2025-07-15 20:43:22'),(34,9,'In Progress',1,'#fff3e0',NULL,'2025-07-15 20:43:22','2025-07-15 20:43:22'),(35,9,'Review',2,'#f3e5f5',NULL,'2025-07-15 20:43:22','2025-07-15 20:43:22'),(36,9,'Done',3,'#e8f5e8',NULL,'2025-07-15 20:43:22','2025-07-15 20:43:22');
/*!40000 ALTER TABLE `kanban_columns` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `kanban_labels`
--

LOCK TABLES `kanban_labels` WRITE;
/*!40000 ALTER TABLE `kanban_labels` DISABLE KEYS */;
/*!40000 ALTER TABLE `kanban_labels` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kanban_task_activity`
--

DROP TABLE IF EXISTS `kanban_task_activity`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `kanban_task_activity` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
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
  CONSTRAINT `kanban_task_activity_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `kanban_tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `kanban_task_activity_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kanban_task_activity`
--

LOCK TABLES `kanban_task_activity` WRITE;
/*!40000 ALTER TABLE `kanban_task_activity` DISABLE KEYS */;
INSERT INTO `kanban_task_activity` VALUES (1,3,4,'created','Task created',NULL,NULL,'2025-07-16 16:41:32'),(2,4,4,'created','Task created',NULL,NULL,'2025-07-16 16:42:46'),(3,5,4,'created','Task created',NULL,NULL,'2025-07-16 16:43:58'),(5,7,4,'created','Task created',NULL,NULL,'2025-07-16 16:46:45'),(7,3,4,'updated','Task updated',NULL,NULL,'2025-07-17 19:40:40');
/*!40000 ALTER TABLE `kanban_task_activity` ENABLE KEYS */;
UNLOCK TABLES;

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
  CONSTRAINT `kanban_task_attachments_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `kanban_tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `kanban_task_attachments_ibfk_2` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kanban_task_attachments`
--

LOCK TABLES `kanban_task_attachments` WRITE;
/*!40000 ALTER TABLE `kanban_task_attachments` DISABLE KEYS */;
/*!40000 ALTER TABLE `kanban_task_attachments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kanban_task_comments`
--

DROP TABLE IF EXISTS `kanban_task_comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `kanban_task_comments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `task_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `comment` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_task_id` (`task_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `kanban_task_comments_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `kanban_tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `kanban_task_comments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kanban_task_comments`
--

LOCK TABLES `kanban_task_comments` WRITE;
/*!40000 ALTER TABLE `kanban_task_comments` DISABLE KEYS */;
/*!40000 ALTER TABLE `kanban_task_comments` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `kanban_task_labels`
--

LOCK TABLES `kanban_task_labels` WRITE;
/*!40000 ALTER TABLE `kanban_task_labels` DISABLE KEYS */;
/*!40000 ALTER TABLE `kanban_task_labels` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kanban_tasks`
--

DROP TABLE IF EXISTS `kanban_tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `kanban_tasks` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
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
  CONSTRAINT `kanban_tasks_ibfk_1` FOREIGN KEY (`board_id`) REFERENCES `kanban_boards` (`id`) ON DELETE CASCADE,
  CONSTRAINT `kanban_tasks_ibfk_2` FOREIGN KEY (`column_id`) REFERENCES `kanban_columns` (`id`) ON DELETE CASCADE,
  CONSTRAINT `kanban_tasks_ibfk_3` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `kanban_tasks_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kanban_tasks`
--

LOCK TABLES `kanban_tasks` WRITE;
/*!40000 ALTER TABLE `kanban_tasks` DISABLE KEYS */;
INSERT INTO `kanban_tasks` VALUES (3,9,33,'Records page','Add collapsible capabilities to the primary records page so that only the records are displayed.',NULL,NULL,0,'medium','2025-07-17',NULL,4,'2025-07-16 16:41:32','2025-07-17 19:40:40',NULL,0.50,NULL,''),(4,9,33,'Finish website content','Finish the public website by filling it with content.',NULL,NULL,1,'medium','2025-07-21',NULL,4,'2025-07-16 16:42:46','2025-07-16 16:42:46',NULL,NULL,NULL,NULL),(5,9,33,'Into to OCM','Finish the 90 second into video with Claude.',NULL,NULL,2,'medium','2025-07-18',NULL,4,'2025-07-16 16:43:58','2025-07-16 16:43:58',NULL,NULL,NULL,NULL),(7,9,33,'Admin panel icons','Alot of the links from the admin panel go to 404 pages.',NULL,NULL,3,'high','2025-07-16',NULL,4,'2025-07-16 16:46:45','2025-07-16 16:46:45',NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `kanban_tasks` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `languages`
--

LOCK TABLES `languages` WRITE;
/*!40000 ALTER TABLE `languages` DISABLE KEYS */;
INSERT INTO `languages` VALUES (1,'en','English','English',0,1,'2025-07-03 21:07:30'),(2,'gr','Ελληνικά','Greek',0,1,'2025-07-03 21:07:30'),(3,'ru','Русский','Russian',0,1,'2025-07-03 21:07:30'),(4,'ro','Română','Romanian',0,1,'2025-07-03 21:07:30');
/*!40000 ALTER TABLE `languages` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=51 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `menu_items`
--

LOCK TABLES `menu_items` WRITE;
/*!40000 ALTER TABLE `menu_items` DISABLE KEYS */;
INSERT INTO `menu_items` VALUES (1,'dashboard','Dashboard','/dashboard','IconDashboard',NULL,1,1,'Main dashboard view','2025-07-06 00:33:16','2025-07-06 00:33:16'),(2,'calendar','Calendar','/calendar','IconCalendar',NULL,2,0,'Calendar and events','2025-07-06 00:33:16','2025-07-06 00:33:16'),(3,'records','Records',NULL,'IconBooks',NULL,3,0,'Records management section','2025-07-06 00:33:16','2025-07-06 00:33:16'),(4,'certificates','Certificates',NULL,'IconCertificate',NULL,4,0,'Certificate management','2025-07-06 00:33:16','2025-07-06 00:33:16'),(5,'billing','Billing',NULL,'IconCreditCard',NULL,5,0,'Billing and invoicing','2025-07-06 00:33:16','2025-07-06 00:33:16'),(6,'admin','Administration',NULL,'IconSettings',NULL,6,0,'Administrative functions','2025-07-06 00:33:16','2025-07-06 00:33:16'),(7,'profile','Profile','/profile','IconUser',NULL,99,1,'User profile management','2025-07-06 00:33:16','2025-07-06 00:33:16'),(8,'records.baptism','Baptism Records','/baptism-records','IconDroplet',3,1,0,'Baptism record management','2025-07-06 00:33:16','2025-07-06 00:33:16'),(9,'records.marriage','Marriage Records','/marriage-records','IconHeart',3,2,0,'Marriage record management','2025-07-06 00:33:16','2025-07-06 00:33:16'),(10,'records.funeral','Funeral Records','/funeral-records','IconCross',3,3,0,'Funeral record management','2025-07-06 00:33:16','2025-07-06 00:33:16'),(11,'certificates.baptism','Baptism Certificates','/certificates/baptism','IconCertificate',4,1,0,'Generate baptism certificates','2025-07-06 00:33:16','2025-07-06 00:33:16'),(12,'certificates.marriage','Marriage Certificates','/certificates/marriage','IconCertificate',4,2,0,'Generate marriage certificates','2025-07-06 00:33:16','2025-07-06 00:33:16'),(13,'billing.invoices','Invoices','/billing/invoices','IconReceipt',5,1,0,'Invoice management','2025-07-06 00:33:16','2025-07-06 00:33:16'),(14,'billing.payments','Payments','/billing/payments','IconCreditCard',5,2,0,'Payment tracking','2025-07-06 00:33:16','2025-07-06 00:33:16'),(15,'admin.users','User Management','/admin/users','IconUsers',6,1,0,'Manage system users','2025-07-06 00:33:16','2025-07-06 00:33:16'),(16,'admin.churches','Church Management','/admin/churches','IconBuilding',6,2,0,'Manage churches','2025-07-06 00:33:16','2025-07-06 00:33:16'),(17,'admin.roles','Role Management','/admin/roles','IconShield',6,3,0,'Manage user roles','2025-07-06 00:33:16','2025-07-06 00:33:16'),(18,'admin.menu','Menu Management','/admin/menu','IconMenu',6,4,0,'Manage menu permissions','2025-07-06 00:33:16','2025-07-06 00:33:16'),(19,'admin.settings','System Settings','/admin/settings','IconSettings',6,5,0,'System configuration','2025-07-06 00:33:16','2025-07-06 00:33:16'),(20,'admin.logs','System Logs','/admin/logs','IconFileText',6,6,0,'View system logs','2025-07-06 00:33:16','2025-07-06 00:33:16'),(41,'cms','CMS','/apps/cms','IconEdit',NULL,15,0,'Content Management System - Edit pages and manage content','2025-07-09 14:03:45','2025-07-09 14:03:45'),(42,'cms_page_editor','Page Editor','/apps/cms/page-editor','IconFileText',41,1,0,'Rich text editor for creating and editing pages','2025-07-09 14:03:45','2025-07-09 14:03:45'),(45,'social','Social',NULL,'IconUsers',NULL,10,0,'Social features and community','2025-07-22 15:47:12','2025-07-22 15:47:12'),(46,'social.blog','Blog','/social/blog','IconArticle',45,1,0,'Community blog posts','2025-07-22 15:47:12','2025-07-22 15:47:12'),(47,'social.friends','Friends','/social/friends','IconUserPlus',45,2,0,'Friends and connections','2025-07-22 15:47:12','2025-07-22 15:47:12'),(48,'social.chat','Chat','/social/chat','IconMessageCircle',45,3,0,'Social messaging','2025-07-22 15:47:12','2025-07-22 15:47:12'),(49,'social.notifications','Notifications','/social/notifications','IconBell',45,4,0,'Social notifications','2025-07-22 15:47:12','2025-07-22 15:47:12');
/*!40000 ALTER TABLE `menu_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `menu_role_permissions`
--

DROP TABLE IF EXISTS `menu_role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `menu_role_permissions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `menu_item_id` int(11) NOT NULL,
  `role` enum('super_admin','admin','church_admin','user') NOT NULL,
  `can_view` tinyint(1) DEFAULT 1,
  `can_edit` tinyint(1) DEFAULT 0,
  `can_delete` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_menu_role` (`menu_item_id`,`role`),
  KEY `idx_menu_role` (`menu_item_id`,`role`),
  KEY `idx_role` (`role`),
  CONSTRAINT `menu_role_permissions_ibfk_1` FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `menu_role_permissions`
--

LOCK TABLES `menu_role_permissions` WRITE;
/*!40000 ALTER TABLE `menu_role_permissions` DISABLE KEYS */;
INSERT INTO `menu_role_permissions` VALUES (1,1,'super_admin',1,1,1,'2025-07-12 03:50:54','2025-07-12 03:50:54'),(2,1,'admin',1,0,0,'2025-07-12 03:50:54','2025-07-12 03:50:54'),(3,1,'church_admin',1,0,0,'2025-07-12 03:50:54','2025-07-12 03:50:54'),(4,1,'user',1,0,0,'2025-07-12 03:50:54','2025-07-12 03:50:54'),(5,6,'super_admin',1,1,1,'2025-07-12 03:50:54','2025-07-12 03:50:54'),(6,6,'admin',1,0,0,'2025-07-12 03:50:54','2025-07-12 03:50:54'),(7,3,'super_admin',1,1,1,'2025-07-12 03:50:54','2025-07-12 03:50:54'),(8,3,'admin',1,1,0,'2025-07-12 03:50:54','2025-07-12 03:50:54'),(9,3,'church_admin',1,1,0,'2025-07-12 03:50:54','2025-07-12 03:50:54'),(10,3,'user',1,0,0,'2025-07-12 03:50:54','2025-07-12 03:50:54');
/*!40000 ALTER TABLE `menu_role_permissions` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `note_categories`
--

LOCK TABLES `note_categories` WRITE;
/*!40000 ALTER TABLE `note_categories` DISABLE KEYS */;
INSERT INTO `note_categories` VALUES (1,'General','General notes and reminders','#e3f2fd','IconNote','2025-07-06 00:56:58'),(2,'Meeting','Meeting notes and minutes','#fff3e0','IconUsers','2025-07-06 00:56:58'),(3,'Church','Church-related notes','#f3e5f5','IconBuildingChurch','2025-07-06 00:56:58'),(4,'Personal','Personal notes and thoughts','#e8f5e8','IconUser','2025-07-06 00:56:58'),(5,'Important','Important notes requiring attention','#ffebee','IconAlertCircle','2025-07-06 00:56:58'),(6,'Ideas','Ideas and brainstorming notes','#fff9c4','IconBulb','2025-07-06 00:56:58'),(7,'Tasks','Task-related notes','#e1f5fe','IconCheckbox','2025-07-06 00:56:58'),(8,'Scripture','Scripture study notes','#fce4ec','IconBook','2025-07-06 00:56:58');
/*!40000 ALTER TABLE `note_categories` ENABLE KEYS */;
UNLOCK TABLES;

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
  CONSTRAINT `note_shares_ibfk_1` FOREIGN KEY (`note_id`) REFERENCES `notes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `note_shares_ibfk_2` FOREIGN KEY (`shared_with_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `note_shares_ibfk_3` FOREIGN KEY (`shared_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `note_shares`
--

LOCK TABLES `note_shares` WRITE;
/*!40000 ALTER TABLE `note_shares` DISABLE KEYS */;
/*!40000 ALTER TABLE `note_shares` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notes`
--

DROP TABLE IF EXISTS `notes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `notes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
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
  CONSTRAINT `notes_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notes`
--

LOCK TABLES `notes` WRITE;
/*!40000 ALTER TABLE `notes` DISABLE KEYS */;
/*!40000 ALTER TABLE `notes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notification_history`
--

DROP TABLE IF EXISTS `notification_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
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
  CONSTRAINT `notification_history_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `notification_history_ibfk_2` FOREIGN KEY (`notification_type_id`) REFERENCES `notification_types` (`id`) ON DELETE CASCADE,
  CONSTRAINT `notification_history_ibfk_3` FOREIGN KEY (`template_id`) REFERENCES `notification_templates` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notification_history`
--

LOCK TABLES `notification_history` WRITE;
/*!40000 ALTER TABLE `notification_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `notification_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notification_queue`
--

DROP TABLE IF EXISTS `notification_queue`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification_queue` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
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
  CONSTRAINT `notification_queue_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `notification_queue_ibfk_2` FOREIGN KEY (`notification_type_id`) REFERENCES `notification_types` (`id`) ON DELETE CASCADE,
  CONSTRAINT `notification_queue_ibfk_3` FOREIGN KEY (`template_id`) REFERENCES `notification_templates` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notification_queue`
--

LOCK TABLES `notification_queue` WRITE;
/*!40000 ALTER TABLE `notification_queue` DISABLE KEYS */;
/*!40000 ALTER TABLE `notification_queue` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `notification_templates`
--

LOCK TABLES `notification_templates` WRITE;
/*!40000 ALTER TABLE `notification_templates` DISABLE KEYS */;
INSERT INTO `notification_templates` VALUES (1,1,'Welcome Email','Welcome to Orthodox Metrics!','Welcome to Orthodox Metrics!','Dear {{user_name}},\n\nWelcome to Orthodox Metrics! We are excited to have you join our community.\n\nYour account has been successfully created and you can now access all the features of our platform.\n\nIf you have any questions, please don\'t hesitate to contact our support team.\n\nBest regards,\nThe Orthodox Metrics Team','<h2>Welcome to Orthodox Metrics!</h2><p>Dear {{user_name}},</p><p>Welcome to Orthodox Metrics! We are excited to have you join our community.</p><p>Your account has been successfully created and you can now access all the features of our platform.</p><p>If you have any questions, please don\'t hesitate to contact our support team.</p><p>Best regards,<br>The Orthodox Metrics Team</p>','{\"user_name\": \"User\'s full name\", \"email\": \"User\'s email address\", \"church_name\": \"Church name if applicable\"}','en',1,'2025-07-06 03:58:23','2025-07-06 03:58:23'),(2,5,'Backup Completed','Backup Completed Successfully','Backup Completed','Your backup has been completed successfully.\n\nBackup Details:\n- Size: {{backup_size}}\n- Duration: {{backup_duration}}\n- Files: {{file_count}}\n- Date: {{backup_date}}\n\nThe backup is now available in your backup storage.','<h3>Backup Completed Successfully</h3><p>Your backup has been completed successfully.</p><h4>Backup Details:</h4><ul><li>Size: {{backup_size}}</li><li>Duration: {{backup_duration}}</li><li>Files: {{file_count}}</li><li>Date: {{backup_date}}</li></ul><p>The backup is now available in your backup storage.</p>','{\"backup_size\": \"Backup file size\", \"backup_duration\": \"Time taken for backup\", \"file_count\": \"Number of files backed up\", \"backup_date\": \"Date of backup\"}','en',1,'2025-07-06 03:58:23','2025-07-06 03:58:23'),(3,7,'Certificate Ready','Your Certificate is Ready','Certificate Ready for Download','Your certificate for {{certificate_type}} is now ready for download.\n\nCertificate Details:\n- Type: {{certificate_type}}\n- Name: {{person_name}}\n- Date: {{certificate_date}}\n\nYou can download your certificate from the certificates section.','<h3>Certificate Ready for Download</h3><p>Your certificate for {{certificate_type}} is now ready for download.</p><h4>Certificate Details:</h4><ul><li>Type: {{certificate_type}}</li><li>Name: {{person_name}}</li><li>Date: {{certificate_date}}</li></ul><p>You can download your certificate from the certificates section.</p>','{\"certificate_type\": \"Type of certificate\", \"person_name\": \"Person name on certificate\", \"certificate_date\": \"Date on certificate\"}','en',1,'2025-07-06 03:58:23','2025-07-06 03:58:23');
/*!40000 ALTER TABLE `notification_templates` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=51 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notification_types`
--

LOCK TABLES `notification_types` WRITE;
/*!40000 ALTER TABLE `notification_types` DISABLE KEYS */;
INSERT INTO `notification_types` VALUES (1,'welcome','Welcome message for new users','user',1,1,'2025-07-06 03:58:23','2025-07-06 03:58:23'),(2,'password_reset','Password reset notifications','security',1,1,'2025-07-06 03:58:23','2025-07-06 03:58:23'),(3,'login_alert','Login alert notifications','security',1,1,'2025-07-06 03:58:23','2025-07-06 03:58:23'),(4,'profile_updated','Profile update confirmations','user',1,1,'2025-07-06 03:58:23','2025-07-06 03:58:23'),(5,'backup_completed','Backup completion notifications','backup',1,1,'2025-07-06 03:58:23','2025-07-06 03:58:23'),(6,'backup_failed','Backup failure notifications','backup',1,1,'2025-07-06 03:58:23','2025-07-06 03:58:23'),(7,'certificate_ready','Certificate ready notifications','certificates',1,1,'2025-07-06 03:58:23','2025-07-06 03:58:23'),(8,'certificate_expiring','Certificate expiring reminders','certificates',1,1,'2025-07-06 03:58:23','2025-07-06 03:58:23'),(9,'invoice_created','New invoice notifications','billing',1,1,'2025-07-06 03:58:23','2025-07-06 03:58:23'),(10,'invoice_paid','Invoice payment confirmations','billing',1,1,'2025-07-06 03:58:23','2025-07-06 03:58:23'),(11,'invoice_overdue','Overdue invoice reminders','billing',1,1,'2025-07-06 03:58:23','2025-07-06 03:58:23'),(12,'system_maintenance','System maintenance notifications','system',1,1,'2025-07-06 03:58:23','2025-07-06 03:58:23'),(13,'system_alert','System alert notifications','system',1,1,'2025-07-06 03:58:23','2025-07-06 03:58:23'),(14,'user_activity','User activity notifications','admin',1,0,'2025-07-06 03:58:23','2025-07-06 03:58:23'),(15,'data_export_ready','Data export ready notifications','system',1,1,'2025-07-06 03:58:23','2025-07-06 03:58:23'),(16,'reminder_baptism','Baptism anniversary reminders','reminders',1,1,'2025-07-06 03:58:23','2025-07-06 03:58:23'),(17,'reminder_marriage','Marriage anniversary reminders','reminders',1,1,'2025-07-06 03:58:23','2025-07-06 03:58:23'),(18,'reminder_funeral','Memorial service reminders','reminders',1,1,'2025-07-06 03:58:23','2025-07-06 03:58:23'),(19,'note_shared','Note sharing notifications','user',1,1,'2025-07-06 03:58:23','2025-07-06 03:58:23'),(20,'note_comment','Note comment notifications','user',1,1,'2025-07-06 03:58:23','2025-07-06 03:58:23'),(21,'church_invitation','Church invitation notifications','user',1,1,'2025-07-06 03:58:23','2025-07-06 03:58:23'),(22,'role_changed','Role change notifications','admin',1,1,'2025-07-06 03:58:23','2025-07-06 03:58:23'),(23,'account_locked','Account security notifications','security',1,1,'2025-07-06 03:58:23','2025-07-06 03:58:23'),(24,'weekly_digest','Weekly activity digest','user',1,0,'2025-07-06 03:58:23','2025-07-06 03:58:23'),(25,'monthly_report','Monthly report notifications','admin',1,0,'2025-07-06 03:58:23','2025-07-06 03:58:23');
/*!40000 ALTER TABLE `notification_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
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
  PRIMARY KEY (`id`),
  KEY `idx_user_read` (`user_id`,`is_read`),
  KEY `idx_user_created` (`user_id`,`created_at`),
  KEY `idx_expires` (`expires_at`),
  KEY `idx_priority` (`priority`),
  KEY `idx_notifications_user_priority` (`user_id`,`priority`,`created_at`),
  KEY `idx_notifications_type_created` (`notification_type_id`,`created_at`),
  KEY `idx_notifications_user_unread` (`user_id`,`is_read`,`created_at`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `notifications_ibfk_2` FOREIGN KEY (`notification_type_id`) REFERENCES `notification_types` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ocr_jobs`
--

LOCK TABLES `ocr_jobs` WRITE;
/*!40000 ALTER TABLE `ocr_jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `ocr_jobs` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `orthodox_headlines`
--

LOCK TABLES `orthodox_headlines` WRITE;
/*!40000 ALTER TABLE `orthodox_headlines` DISABLE KEYS */;
/*!40000 ALTER TABLE `orthodox_headlines` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `pages`
--

LOCK TABLES `pages` WRITE;
/*!40000 ALTER TABLE `pages` DISABLE KEYS */;
INSERT INTO `pages` VALUES (1,'home','Home Page','<h1>Welcome to Our Church</h1><p>This is the home page content.</p>','Welcome to our Orthodox church community','published','2025-07-09 13:52:35','2025-07-09 13:52:35'),(2,'about','About Us','<h1>About Our Church</h1><p>Learn about our church history and mission.</p>','Learn about our Orthodox church history and mission','published','2025-07-09 13:52:35','2025-07-09 13:52:35'),(3,'services','Services','<h1>Our Services</h1><p>Information about our worship services.</p>','Information about our worship services and schedule','published','2025-07-09 13:52:35','2025-07-09 13:52:35'),(4,'test-page','test','<p><br></p>','this editor is garbage','draft','2025-07-09 14:30:46','2025-07-09 14:36:17');
/*!40000 ALTER TABLE `pages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `push_subscriptions`
--

DROP TABLE IF EXISTS `push_subscriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `push_subscriptions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
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
  CONSTRAINT `push_subscriptions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `push_subscriptions`
--

LOCK TABLES `push_subscriptions` WRITE;
/*!40000 ALTER TABLE `push_subscriptions` DISABLE KEYS */;
/*!40000 ALTER TABLE `push_subscriptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary table structure for view `recent_backup_activity`
--

DROP TABLE IF EXISTS `recent_backup_activity`;
/*!50001 DROP VIEW IF EXISTS `recent_backup_activity`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `recent_backup_activity` AS SELECT
 1 AS `id`,
  1 AS `filename`,
  1 AS `type`,
  1 AS `status`,
  1 AS `size`,
  1 AS `created_at`,
  1 AS `completed_at`,
  1 AS `schedule_type`,
  1 AS `triggered_by`,
  1 AS `triggered_by_email`,
  1 AS `triggered_by_name` */;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `role_menu_permissions`
--

DROP TABLE IF EXISTS `role_menu_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_menu_permissions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `role` enum('super_admin','admin','manager','user','viewer','priest','deacon') NOT NULL,
  `menu_item_id` int(11) NOT NULL,
  `is_visible` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_role_menu` (`role`,`menu_item_id`),
  KEY `idx_role_permissions` (`role`),
  KEY `idx_menu_permissions` (`menu_item_id`),
  CONSTRAINT `role_menu_permissions_ibfk_1` FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=229 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_menu_permissions`
--

LOCK TABLES `role_menu_permissions` WRITE;
/*!40000 ALTER TABLE `role_menu_permissions` DISABLE KEYS */;
INSERT INTO `role_menu_permissions` VALUES (1,'super_admin',1,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(2,'super_admin',2,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(3,'super_admin',3,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(4,'super_admin',4,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(5,'super_admin',5,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(6,'super_admin',6,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(7,'super_admin',7,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(8,'super_admin',8,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(9,'super_admin',9,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(10,'super_admin',10,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(11,'super_admin',11,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(12,'super_admin',12,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(13,'super_admin',13,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(14,'super_admin',14,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(15,'super_admin',15,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(16,'super_admin',16,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(17,'super_admin',17,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(18,'super_admin',18,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(19,'super_admin',19,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(20,'super_admin',20,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(32,'admin',6,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(33,'admin',16,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(34,'admin',20,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(35,'admin',18,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(36,'admin',17,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(37,'admin',19,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(38,'admin',15,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(39,'admin',5,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(40,'admin',13,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(41,'admin',14,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(42,'admin',2,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(43,'admin',4,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(44,'admin',11,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(45,'admin',12,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(46,'admin',1,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(47,'admin',7,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(48,'admin',3,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(49,'admin',8,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(50,'admin',10,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(51,'admin',9,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(63,'manager',6,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(64,'manager',16,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(65,'manager',20,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(66,'manager',18,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(67,'manager',17,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(68,'manager',19,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(69,'manager',15,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(70,'manager',5,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(71,'manager',13,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(72,'manager',14,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(73,'manager',2,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(74,'manager',4,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(75,'manager',11,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(76,'manager',12,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(77,'manager',1,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(78,'manager',7,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(79,'manager',3,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(80,'manager',8,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(81,'manager',10,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(82,'manager',9,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(94,'priest',6,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(95,'priest',16,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(96,'priest',20,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(97,'priest',18,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(98,'priest',17,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(99,'priest',19,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(100,'priest',15,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(101,'priest',5,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(102,'priest',13,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(103,'priest',14,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(104,'priest',2,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(105,'priest',4,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(106,'priest',11,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(107,'priest',12,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(108,'priest',1,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(109,'priest',7,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(110,'priest',3,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(111,'priest',8,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(112,'priest',10,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(113,'priest',9,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(125,'user',6,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(126,'user',16,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(127,'user',20,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(128,'user',18,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(129,'user',17,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(130,'user',19,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(131,'user',15,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(132,'user',5,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(133,'user',13,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(134,'user',14,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(135,'user',2,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(136,'user',4,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(137,'user',11,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(138,'user',12,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(139,'user',1,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(140,'user',7,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(141,'user',3,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(142,'user',8,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(143,'user',10,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(144,'user',9,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(156,'viewer',6,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(157,'viewer',16,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(158,'viewer',20,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(159,'viewer',18,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(160,'viewer',17,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(161,'viewer',19,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(162,'viewer',15,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(163,'viewer',5,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(164,'viewer',13,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(165,'viewer',14,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(166,'viewer',2,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(167,'viewer',4,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(168,'viewer',11,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(169,'viewer',12,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(170,'viewer',1,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(171,'viewer',7,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(172,'viewer',3,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(173,'viewer',8,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(174,'viewer',10,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(175,'viewer',9,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(187,'deacon',6,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(188,'deacon',16,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(189,'deacon',20,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(190,'deacon',18,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(191,'deacon',17,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(192,'deacon',19,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(193,'deacon',15,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(194,'deacon',5,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(195,'deacon',13,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(196,'deacon',14,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(197,'deacon',2,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(198,'deacon',4,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(199,'deacon',11,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(200,'deacon',12,0,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(201,'deacon',1,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(202,'deacon',7,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(203,'deacon',3,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(204,'deacon',8,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(205,'deacon',10,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(206,'deacon',9,1,'2025-07-06 00:33:16','2025-07-06 00:33:16'),(218,'admin',45,1,'2025-07-22 15:47:12','2025-07-22 15:47:12'),(219,'admin',46,1,'2025-07-22 15:47:12','2025-07-22 15:47:12'),(220,'admin',48,1,'2025-07-22 15:47:12','2025-07-22 15:47:12'),(221,'admin',47,1,'2025-07-22 15:47:12','2025-07-22 15:47:12'),(222,'admin',49,1,'2025-07-22 15:47:12','2025-07-22 15:47:12'),(223,'super_admin',46,1,'2025-07-22 16:01:45','2025-07-22 16:54:44'),(225,'super_admin',45,1,'2025-07-22 16:54:42','2025-07-22 16:54:44'),(226,'super_admin',48,1,'2025-07-22 16:54:42','2025-07-22 16:54:44'),(227,'super_admin',47,1,'2025-07-22 16:54:42','2025-07-22 16:54:44'),(228,'super_admin',49,1,'2025-07-22 16:54:42','2025-07-22 16:54:44');
/*!40000 ALTER TABLE `role_menu_permissions` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `service_actions`
--

LOCK TABLES `service_actions` WRITE;
/*!40000 ALTER TABLE `service_actions` DISABLE KEYS */;
INSERT INTO `service_actions` VALUES (1,'frontend','rebuild','2025-07-22 09:43:41',1,'Build started with NODE_OPTIONS=\"--max-old-space-size=4096\"','superadmin@orthodoxmetrics.com'),(2,'frontend','rebuild','2025-07-22 09:43:43',0,'Command failed: cd /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/front-end && npm install --legacy-deps && NODE_OPTIONS=\"--max-old-space-size=4096\" npm run build\nnpm warn Unknown cli config \"--legacy-deps\". This will stop working in the next major version of npm.\nnpm warn ERESOLVE overriding peer dependency\nnpm warn While resolving: @mui/base@5.0.0-beta.58\nnpm warn Found: @types/react@19.0.1\nnpm warn node_modules/@types/react\nnpm warn   dev @types/react@\"19.0.1\" from the root project\nnpm warn   33 more (@mui/utils, @mui/icons-material, @mui/lab, ...)\nnpm warn\nnpm warn Could not resolve dependency:\nnpm warn peerOptional @types/react@\"^17.0.0 || ^18.0.0\" from @mui/base@5.0.0-beta.58\nnpm warn node_modules/@mui/base\nnpm warn   @mui/base@\"5.0.0-beta.58\" from @mui/lab@6.0.0-beta.10\nnpm warn   node_modules/@mui/lab\nnpm warn\nnpm warn Conflicting peer dependency: @types/react@18.3.23\nnpm warn node_modules/@types/react\nnpm warn   peerOptional @types/react@\"^17.0.0 || ^18.0.0\" from @mui/base@5.0.0-beta.58\nnpm warn   node_modules/@mui/base\nnpm warn     @mui/base@\"5.0.0-beta.58\" from @mui/lab@6.0.0-beta.10\nnpm warn     node_modules/@mui/lab\nnpm error code ERESOLVE\nnpm error ERESOLVE could not resolve\nnpm error\nnpm error While resolving: @mui/icons-material@5.18.0\nnpm error Found: @mui/material@7.2.0\nnpm error node_modules/@mui/material\nnpm error   @mui/material@\"^7.2.0\" from the root project\nnpm error   peer @mui/material@\"^5.15.14 || ^6.0.0 || ^7.0.0\" from @mui/x-tree-view@7.29.1\nnpm error   node_modules/@mui/x-tree-view\nnpm error     @mui/x-tree-view@\"^7.18.0\" from the root project\nnpm error   3 more (formik-mui, mui-tiptap, tss-react)\nnpm error\nnpm error Could not resolve dependency:\nnpm error peer @mui/material@\"^5.0.0\" from @mui/icons-material@5.18.0\nnpm error node_modules/@mui/icons-material\nnpm error   @mui/icons-material@\"^5.14.13\" from the root project\nnpm error   peer @mui/icons-material@\"^5.0.0 || ^6.0.0 || ^7.0.0\" from mui-tiptap@1.21.0\nnpm error   node_modules/mui-tiptap\nnpm error     mui-tiptap@\"^1.13.0\" from the root project\nnpm error\nnpm error Conflicting peer dependency: @mui/material@5.18.0\nnpm error node_modules/@mui/material\nnpm error   peer @mui/material@\"^5.0.0\" from @mui/icons-material@5.18.0\nnpm error   node_modules/@mui/icons-material\nnpm error     @mui/icons-material@\"^5.14.13\" from the root project\nnpm error     peer @mui/icons-material@\"^5.0.0 || ^6.0.0 || ^7.0.0\" from mui-tiptap@1.21.0\nnpm error     node_modules/mui-tiptap\nnpm error       mui-tiptap@\"^1.13.0\" from the root project\nnpm error\nnpm error Fix the upstream dependency conflict, or retry\nnpm error this command with --force or --legacy-peer-deps\nnpm error to accept an incorrect (and potentially broken) dependency resolution.\nnpm error\nnpm error\nnpm error For a full report see:\nnpm error /root/.npm/_logs/2025-07-22T13_43_41_430Z-eresolve-report.txt\nnpm error A complete log of this run can be found in: /root/.npm/_logs/2025-07-22T13_43_41_430Z-debug-0.log\n','superadmin@orthodoxmetrics.com'),(3,'frontend','rebuild','2025-07-22 09:57:44',1,'Build started with NODE_OPTIONS=\"--max-old-space-size=4096\"','superadmin@orthodoxmetrics.com'),(4,'frontend','rebuild','2025-07-22 09:57:47',0,'Command failed: cd /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/front-end && npm install --legacy-peer-deps && NODE_OPTIONS=\"--max-old-space-size=4096\" npm run build\nsh: 1: vite: not found\n','superadmin@orthodoxmetrics.com'),(5,'frontend','rebuild','2025-07-22 10:11:46',1,'Build started with NODE_OPTIONS=\"--max-old-space-size=4096\"','superadmin@orthodoxmetrics.com'),(6,'frontend','rebuild','2025-07-22 10:11:49',0,'Command failed: cd /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/front-end && npm install --legacy-peer-deps && NODE_OPTIONS=\"--max-old-space-size=4096\" npm run build\nsh: 1: vite: not found\n','superadmin@orthodoxmetrics.com');
/*!40000 ALTER TABLE `service_actions` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `service_catalog`
--

LOCK TABLES `service_catalog` WRITE;
/*!40000 ALTER TABLE `service_catalog` DISABLE KEYS */;
INSERT INTO `service_catalog` VALUES (1,'baptism_ceremony','sacraments','{\"en\": \"Baptism Ceremony\", \"gr\": \"Τελετή Βάπτισης\", \"ru\": \"Обряд крещения\", \"ro\": \"Ceremonia de botez\"}','{\"en\": \"Complete baptism ceremony including preparation and documentation\", \"gr\": \"Πλήρης τελετή βάπτισης συμπεριλαμβανομένης της προετοιμασίας και τεκμηρίωσης\", \"ru\": \"Полная церемония крещения включая подготовку и документацию\", \"ro\": \"Ceremonia completă de botez incluzând pregătirea și documentația\"}',150.00,'USD','each',0,0,NULL,0,1,0,'2025-07-03 21:07:32','2025-07-03 21:07:32'),(2,'marriage_ceremony','sacraments','{\"en\": \"Marriage Ceremony\", \"gr\": \"Τελετή Γάμου\", \"ru\": \"Обряд венчания\", \"ro\": \"Ceremonia de căsătorie\"}','{\"en\": \"Orthodox wedding ceremony with all liturgical requirements\", \"gr\": \"Ορθόδοξη γαμήλια τελετή με όλες τις λειτουργικές απαιτήσεις\", \"ru\": \"Православная свадебная церемония со всеми литургическими требованиями\", \"ro\": \"Ceremonia ortodoxă de nuntă cu toate cerințele liturgice\"}',300.00,'USD','each',0,0,NULL,0,1,0,'2025-07-03 21:07:32','2025-07-03 21:07:32'),(3,'funeral_service','sacraments','{\"en\": \"Funeral Service\", \"gr\": \"Κηδεία\", \"ru\": \"Отпевание\", \"ro\": \"Serviciu funerar\"}','{\"en\": \"Complete funeral service and memorial\", \"gr\": \"Πλήρης κηδεία και μνημόσυνο\", \"ru\": \"Полное погребальное служение и поминовение\", \"ro\": \"Serviciu funerar complet și memorial\"}',200.00,'USD','each',0,0,NULL,0,1,0,'2025-07-03 21:07:32','2025-07-03 21:07:32'),(4,'confession','sacraments','{\"en\": \"Confession\", \"gr\": \"Εξομολόγηση\", \"ru\": \"Исповедь\", \"ro\": \"Spovedanie\"}','{\"en\": \"Sacrament of confession and spiritual guidance\", \"gr\": \"Μυστήριο της εξομολόγησης και πνευματικής καθοδήγησης\", \"ru\": \"Таинство исповеди и духовного наставления\", \"ro\": \"Taina spovedaniei și îndrumarea spirituală\"}',0.00,'USD','each',0,0,NULL,0,1,0,'2025-07-03 21:07:32','2025-07-03 21:07:32'),(5,'baptism_record','record_processing','{\"en\": \"Baptism Record Processing\", \"gr\": \"Επεξεργασία Μητρώου Βάπτισης\", \"ru\": \"Обработка записей о крещении\", \"ro\": \"Procesarea înregistrărilor de botez\"}','{\"en\": \"Digital processing and archival of baptism records\", \"gr\": \"Ψηφιακή επεξεργασία και αρχειοθέτηση μητρώων βάπτισης\", \"ru\": \"Цифровая обработка и архивирование записей о крещении\", \"ro\": \"Procesarea digitală și arhivarea înregistrărilor de botez\"}',25.00,'USD','record',1,0,NULL,0,1,0,'2025-07-03 21:07:32','2025-07-03 21:07:32'),(6,'marriage_record','record_processing','{\"en\": \"Marriage Record Processing\", \"gr\": \"Επεξεργασία Μητρώου Γάμου\", \"ru\": \"Обработка записей о браке\", \"ro\": \"Procesarea înregistrărilor de căsătorie\"}','{\"en\": \"Digital processing and archival of marriage records\", \"gr\": \"Ψηφιακή επεξεργασία και αρχειοθέτηση μητρώων γάμου\", \"ru\": \"Цифровая обработка и архивирование записей о браке\", \"ro\": \"Procesarea digitală și arhivarea înregistrărilor de căsătorie\"}',25.00,'USD','record',1,0,NULL,0,1,0,'2025-07-03 21:07:32','2025-07-03 21:07:32'),(7,'baptism_certificate','certificates','{\"en\": \"Baptism Certificate\", \"gr\": \"Πιστοποιητικό Βάπτισης\", \"ru\": \"Свидетельство о крещении\", \"ro\": \"Certificat de botez\"}','{\"en\": \"Official baptism certificate with church seal\", \"gr\": \"Επίσημο πιστοποιητικό βάπτισης με σφραγίδα εκκλησίας\", \"ru\": \"Официальное свидетельство о крещении с церковной печатью\", \"ro\": \"Certificat oficial de botez cu sigiliul bisericii\"}',15.00,'USD','each',1,0,NULL,0,1,0,'2025-07-03 21:07:32','2025-07-03 21:07:32'),(8,'marriage_certificate','certificates','{\"en\": \"Marriage Certificate\", \"gr\": \"Πιστοποιητικό Γάμου\", \"ru\": \"Свидетельство о браке\", \"ro\": \"Certificat de căsătorie\"}','{\"en\": \"Official marriage certificate with church seal\", \"gr\": \"Επίσημο πιστοποιητικό γάμου με σφραγίδα εκκλησίας\", \"ru\": \"Официальное свидетельство о браке с церковной печатью\", \"ro\": \"Certificat oficial de căsătorie cu sigiliul bisericii\"}',15.00,'USD','each',1,0,NULL,0,1,0,'2025-07-03 21:07:32','2025-07-03 21:07:32'),(9,'monthly_subscription','software_services','{\"en\": \"Monthly Subscription\", \"gr\": \"Μηνιαία Συνδρομή\", \"ru\": \"Месячная подписка\", \"ro\": \"Abonament lunar\"}','{\"en\": \"Monthly access to church management software\", \"gr\": \"Μηνιαία πρόσβαση στο λογισμικό διαχείρισης εκκλησίας\", \"ru\": \"Месячный доступ к программному обеспечению управления церковью\", \"ro\": \"Acces lunar la software-ul de management al bisericii\"}',29.99,'USD','month',1,0,NULL,0,1,0,'2025-07-03 21:07:32','2025-07-03 21:07:32'),(10,'annual_subscription','software_services','{\"en\": \"Annual Subscription\", \"gr\": \"Ετήσια Συνδρομή\", \"ru\": \"Годовая подписка\", \"ro\": \"Abonament anual\"}','{\"en\": \"Annual access to church management software with discount\", \"gr\": \"Ετήσια πρόσβαση στο λογισμικό διαχείρισης εκκλησίας με έκπτωση\", \"ru\": \"Годовой доступ к программному обеспечению управления церковью со скидкой\", \"ro\": \"Acces anual la software-ul de management al bisericii cu reducere\"}',299.99,'USD','year',1,0,NULL,0,1,0,'2025-07-03 21:07:32','2025-07-03 21:07:32'),(11,'ocr_processing','software_services','{\"en\": \"OCR Document Processing\", \"gr\": \"Επεξεργασία OCR Εγγράφων\", \"ru\": \"OCR обработка документов\", \"ro\": \"Procesarea OCR a documentelor\"}','{\"en\": \"Optical character recognition for document digitization\", \"gr\": \"Οπτική αναγνώριση χαρακτήρων για ψηφιοποίηση εγγράφων\", \"ru\": \"Оптическое распознавание символов для оцифровки документов\", \"ro\": \"Recunoașterea optică a caracterelor pentru digitizarea documentelor\"}',5.00,'USD','page',1,0,NULL,0,1,0,'2025-07-03 21:07:32','2025-07-03 21:07:32'),(12,'setup_consultation','consulting','{\"en\": \"System Setup Consultation\", \"gr\": \"Συμβουλευτική Εγκατάστασης\", \"ru\": \"Консультация по настройке системы\", \"ro\": \"Consultanță pentru configurarea sistemului\"}','{\"en\": \"Professional consultation for system setup and configuration\", \"gr\": \"Επαγγελματική συμβουλευτική για εγκατάσταση και διαμόρφωση συστήματος\", \"ru\": \"Профессиональная консультация по установке и настройке системы\", \"ro\": \"Consultanță profesională pentru instalarea și configurarea sistemului\"}',100.00,'USD','hour',1,0,NULL,0,1,0,'2025-07-03 21:07:32','2025-07-03 21:07:32'),(13,'training_session','consulting','{\"en\": \"Staff Training Session\", \"gr\": \"Συνεδρία Εκπαίδευσης Προσωπικού\", \"ru\": \"Сессия обучения персонала\", \"ro\": \"Sesiune de formare a personalului\"}','{\"en\": \"Comprehensive training session for church staff\", \"gr\": \"Περιεκτική συνεδρία εκπαίδευσης για το προσωπικό της εκκλησίας\", \"ru\": \"Комплексная сессия обучения για церковного персонала\", \"ro\": \"Sesiune cuprinzătoare de formare pentru personalul bisericii\"}',150.00,'USD','hour',1,0,NULL,0,1,0,'2025-07-03 21:07:32','2025-07-03 21:07:32');
/*!40000 ALTER TABLE `service_catalog` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Table structure for table `sessions`
--

DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `sessions` (
  `session_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `expires` int(11) unsigned NOT NULL,
  `data` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`session_id`),
  KEY `idx_expires` (`expires`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sessions`
--

LOCK TABLES `sessions` WRITE;
/*!40000 ALTER TABLE `sessions` DISABLE KEYS */;
INSERT INTO `sessions` VALUES ('F_3zAZTnIFDjHLegJ2jm1q18LV_wzEQ2',1753297354,'{\"cookie\":{\"originalMaxAge\":86400000,\"expires\":\"2025-07-23T19:02:33.866Z\",\"secure\":true,\"httpOnly\":true,\"domain\":\".orthodoxmetrics.com\",\"path\":\"/\",\"sameSite\":\"lax\"},\"user\":{\"id\":4,\"email\":\"superadmin@orthodoxmetrics.com\",\"first_name\":\"Super\",\"last_name\":\"Admin\",\"role\":\"super_admin\",\"landing_page\":\"/dashboards/modern\"},\"loginTime\":\"2025-07-22T17:51:15.550Z\",\"lastActivity\":\"2025-07-22T19:02:33.865Z\"}'),('J51V_ptYm2z4V9lZZuTjBZxrRu3-mGrE',1753302705,'{\"cookie\":{\"originalMaxAge\":86400000,\"expires\":\"2025-07-23T20:31:42.761Z\",\"secure\":true,\"httpOnly\":true,\"domain\":\".orthodoxmetrics.com\",\"path\":\"/\",\"sameSite\":\"lax\"},\"user\":{\"id\":20,\"email\":\"frjames@ssppoc.org\",\"first_name\":\"Fr. James\",\"last_name\":\"Parsells\",\"role\":\"admin\",\"landing_page\":\"/dashboards/modern\"},\"loginTime\":\"2025-07-22T20:31:12.709Z\",\"lastActivity\":\"2025-07-22T20:31:42.760Z\"}'),('aFKnaxk9TrT5w8DLWvfjfpL7Ju8PZInL',1753301491,'{\"cookie\":{\"originalMaxAge\":86400000,\"expires\":\"2025-07-23T20:11:31.233Z\",\"secure\":true,\"httpOnly\":true,\"domain\":\".orthodoxmetrics.com\",\"path\":\"/\",\"sameSite\":\"lax\"},\"user\":{\"id\":4,\"email\":\"superadmin@orthodoxmetrics.com\",\"first_name\":\"Super\",\"last_name\":\"Admin\",\"role\":\"super_admin\",\"landing_page\":\"/dashboards/modern\"},\"loginTime\":\"2025-07-22T19:28:52.183Z\",\"lastActivity\":\"2025-07-22T20:11:31.233Z\"}'),('ozYTuELdCXkRn4T77WHYD93_E7gMipng',1753305236,'{\"cookie\":{\"originalMaxAge\":86399991,\"expires\":\"2025-07-23T21:13:55.552Z\",\"secure\":true,\"httpOnly\":true,\"domain\":\".orthodoxmetrics.com\",\"path\":\"/\",\"sameSite\":\"lax\"},\"user\":{\"id\":4,\"email\":\"superadmin@orthodoxmetrics.com\",\"first_name\":\"Super\",\"last_name\":\"Admin\",\"role\":\"super_admin\",\"landing_page\":\"/dashboards/modern\"},\"loginTime\":\"2025-07-22T20:19:19.304Z\",\"lastActivity\":\"2025-07-22T21:13:55.560Z\"}');
/*!40000 ALTER TABLE `sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `social_media`
--

DROP TABLE IF EXISTS `social_media`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `social_media` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
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
  CONSTRAINT `social_media_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `social_media`
--

LOCK TABLES `social_media` WRITE;
/*!40000 ALTER TABLE `social_media` DISABLE KEYS */;
/*!40000 ALTER TABLE `social_media` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `social_reactions`
--

DROP TABLE IF EXISTS `social_reactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `social_reactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
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
  CONSTRAINT `social_reactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `social_reactions`
--

LOCK TABLES `social_reactions` WRITE;
/*!40000 ALTER TABLE `social_reactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `social_reactions` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `subscriptions`
--

LOCK TABLES `subscriptions` WRITE;
/*!40000 ALTER TABLE `subscriptions` DISABLE KEYS */;
/*!40000 ALTER TABLE `subscriptions` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `system_settings`
--

LOCK TABLES `system_settings` WRITE;
/*!40000 ALTER TABLE `system_settings` DISABLE KEYS */;
INSERT INTO `system_settings` VALUES (1,'site_name','{\"en\": \"Orthodox Metrics\", \"gr\": \"Orthodox Metrics\", \"ru\": \"Orthodox Metrics\", \"ro\": \"Orthodox Metrics\"}','multilang_text','general','{\"en\": \"Name of the application\", \"gr\": \"Όνομα της εφαρμογής\", \"ru\": \"Название приложения\", \"ro\": \"Numele aplicației\"}',1,'2025-07-03 21:07:34','2025-07-03 21:07:34'),(2,'default_currency','{\"value\": \"USD\"}','string','billing','{\"en\": \"Default currency for billing\", \"gr\": \"Προεπιλεγμένο νόμισμα για χρέωση\", \"ru\": \"Валюта по умолчанию для выставления счетов\", \"ro\": \"Moneda implicită pentru facturare\"}',0,'2025-07-03 21:07:34','2025-07-03 21:07:34'),(3,'tax_rate','{\"value\": 0}','number','billing','{\"en\": \"Default tax rate percentage\", \"gr\": \"Προεπιλεγμένο ποσοστό φόρου\", \"ru\": \"Процентная ставка налога по умолчанию\", \"ro\": \"Rata implicită a taxei în procente\"}',0,'2025-07-03 21:07:34','2025-07-03 21:07:34');
/*!40000 ALTER TABLE `system_settings` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `templates`
--

LOCK TABLES `templates` WRITE;
/*!40000 ALTER TABLE `templates` DISABLE KEYS */;
INSERT INTO `templates` VALUES (1,'BaptismRecords','baptism-records','baptism','Existing Baptism Records template','[{\"label\":\"First Name\",\"field\":\"first_name\",\"type\":\"string\"},{\"label\":\"Last Name\",\"field\":\"last_name\",\"type\":\"string\"},{\"label\":\"Date of Baptism\",\"field\":\"date_of_baptism\",\"type\":\"date\"},{\"label\":\"Place of Baptism\",\"field\":\"place_of_baptism\",\"type\":\"string\"},{\"label\":\"Priest\",\"field\":\"priest_name\",\"type\":\"string\"},{\"label\":\"Godparent(s)\",\"field\":\"godparents\",\"type\":\"string\"},{\"label\":\"Date of Birth\",\"field\":\"date_of_birth\",\"type\":\"date\"},{\"label\":\"Place of Birth\",\"field\":\"place_of_birth\",\"type\":\"string\"}]','aggrid','liturgicalBlueGold','table','{\"en\":true}',1,NULL,'2025-07-12 02:02:54','2025-07-12 02:35:07',NULL,1),(2,'FuneralRecords','funeral-records','funeral','Existing Funeral Records template','[{\"label\":\"Deceased Name\",\"field\":\"deceased_name\",\"type\":\"string\"},{\"label\":\"Date of Death\",\"field\":\"death_date\",\"type\":\"date\"},{\"label\":\"Date of Funeral\",\"field\":\"funeral_date\",\"type\":\"date\"},{\"label\":\"Place of Death\",\"field\":\"place_of_death\",\"type\":\"string\"},{\"label\":\"Burial Location\",\"field\":\"burial_site\",\"type\":\"string\"},{\"label\":\"Priest\",\"field\":\"priest_name\",\"type\":\"string\"},{\"label\":\"Age at Death\",\"field\":\"age_at_death\",\"type\":\"number\"},{\"label\":\"Cause of Death\",\"field\":\"cause_of_death\",\"type\":\"string\"},{\"label\":\"Spouse Name\",\"field\":\"spouse_name\",\"type\":\"string\"},{\"label\":\"Cemetery\",\"field\":\"cemetery_name\",\"type\":\"string\"}]','aggrid','liturgicalBlueGold','table','{\"en\":true}',1,NULL,'2025-07-12 02:02:54','2025-07-12 02:35:07',NULL,1),(3,'MarriageRecords','marriage-records','marriage','Existing Marriage Records template','[{\"label\":\"Groom Name\",\"field\":\"groom_name\",\"type\":\"string\"},{\"label\":\"Bride Name\",\"field\":\"bride_name\",\"type\":\"string\"},{\"label\":\"Marriage Date\",\"field\":\"marriage_date\",\"type\":\"date\"},{\"label\":\"Place of Marriage\",\"field\":\"place_of_marriage\",\"type\":\"number\"},{\"label\":\"Priest\",\"field\":\"priest_name\",\"type\":\"string\"},{\"label\":\"Best Man\",\"field\":\"best_man\",\"type\":\"string\"},{\"label\":\"Maid of Honor\",\"field\":\"maid_of_honor\",\"type\":\"string\"},{\"label\":\"Witnesses\",\"field\":\"witnesses\",\"type\":\"string\"}]','aggrid','liturgicalBlueGold','table','{\"en\":true}',1,NULL,'2025-07-12 02:02:54','2025-07-12 02:35:07',NULL,1),(7,'TestChurchTemplate','testchurchtemplate','custom','Test template for church-specific functionality','[{\"field\":\"test_field\",\"label\":\"Test Field\",\"type\":\"string\"},{\"field\":\"church_specific\",\"label\":\"Church Specific Field\",\"type\":\"string\"}]','aggrid','liturgicalBlueGold','table','{\"en\":true}',1,NULL,'2025-07-12 02:41:32','2025-07-12 02:41:32',14,0),(8,'DuplicatedBaptismRecords','duplicatedbaptism-records','baptism','Duplicated from global template','[{\"label\":\"First Name\",\"field\":\"first_name\",\"type\":\"string\"},{\"label\":\"Last Name\",\"field\":\"last_name\",\"type\":\"string\"},{\"label\":\"Date of Baptism\",\"field\":\"date_of_baptism\",\"type\":\"date\"},{\"label\":\"Place of Baptism\",\"field\":\"place_of_baptism\",\"type\":\"string\"},{\"label\":\"Priest\",\"field\":\"priest_name\",\"type\":\"string\"},{\"label\":\"Godparent(s)\",\"field\":\"godparents\",\"type\":\"string\"},{\"label\":\"Date of Birth\",\"field\":\"date_of_birth\",\"type\":\"date\"},{\"label\":\"Place of Birth\",\"field\":\"place_of_birth\",\"type\":\"string\"}]','aggrid','liturgicalBlueGold','table','{\"en\":true}',1,NULL,'2025-07-12 02:41:32','2025-07-12 02:41:32',14,0);
/*!40000 ALTER TABLE `templates` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `translation_keys`
--

LOCK TABLES `translation_keys` WRITE;
/*!40000 ALTER TABLE `translation_keys` DISABLE KEYS */;
INSERT INTO `translation_keys` VALUES (1,'common.save','common','Save button text','2025-07-03 21:07:35'),(2,'common.cancel','common','Cancel button text','2025-07-03 21:07:35'),(3,'common.delete','common','Delete button text','2025-07-03 21:07:35'),(4,'common.edit','common','Edit button text','2025-07-03 21:07:35'),(5,'invoice.title','invoices','Invoice page title','2025-07-03 21:07:35'),(6,'invoice.new','invoices','New invoice button','2025-07-03 21:07:35'),(7,'church.name','churches','Church name label','2025-07-03 21:07:35'),(8,'church.email','churches','Church email label','2025-07-03 21:07:35');
/*!40000 ALTER TABLE `translation_keys` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `translations`
--

LOCK TABLES `translations` WRITE;
/*!40000 ALTER TABLE `translations` DISABLE KEYS */;
INSERT INTO `translations` VALUES (1,1,'en','Save','2025-07-03 21:07:35','2025-07-03 21:07:35'),(2,1,'gr','Αποθήκευση','2025-07-03 21:07:35','2025-07-03 21:07:35'),(3,1,'ru','Сохранить','2025-07-03 21:07:35','2025-07-03 21:07:35'),(4,1,'ro','Salvează','2025-07-03 21:07:35','2025-07-03 21:07:35'),(5,2,'en','Cancel','2025-07-03 21:07:35','2025-07-03 21:07:35'),(6,2,'gr','Ακύρωση','2025-07-03 21:07:35','2025-07-03 21:07:35'),(7,2,'ru','Отмена','2025-07-03 21:07:35','2025-07-03 21:07:35'),(8,2,'ro','Anulează','2025-07-03 21:07:35','2025-07-03 21:07:35'),(9,3,'en','Delete','2025-07-03 21:07:35','2025-07-03 21:07:35'),(10,3,'gr','Διαγραφή','2025-07-03 21:07:35','2025-07-03 21:07:35'),(11,3,'ru','Удалить','2025-07-03 21:07:35','2025-07-03 21:07:35'),(12,3,'ro','Șterge','2025-07-03 21:07:35','2025-07-03 21:07:35'),(13,4,'en','Edit','2025-07-03 21:07:35','2025-07-03 21:07:35'),(14,4,'gr','Επεξεργασία','2025-07-03 21:07:35','2025-07-03 21:07:35'),(15,4,'ru','Редактировать','2025-07-03 21:07:35','2025-07-03 21:07:35'),(16,4,'ro','Editează','2025-07-03 21:07:35','2025-07-03 21:07:35'),(17,5,'en','Invoice Management','2025-07-03 21:07:35','2025-07-03 21:07:35'),(18,5,'gr','Διαχείριση Τιμολογίων','2025-07-03 21:07:35','2025-07-03 21:07:35'),(19,5,'ru','Управление счетами','2025-07-03 21:07:35','2025-07-03 21:07:35'),(20,5,'ro','Managementul facturilor','2025-07-03 21:07:35','2025-07-03 21:07:35'),(21,6,'en','New Invoice','2025-07-03 21:07:35','2025-07-03 21:07:35'),(22,6,'gr','Νέο Τιμολόγιο','2025-07-03 21:07:35','2025-07-03 21:07:35'),(23,6,'ru','Новый счет','2025-07-03 21:07:35','2025-07-03 21:07:35'),(24,6,'ro','Factură nouă','2025-07-03 21:07:35','2025-07-03 21:07:35'),(25,7,'en','Church Name','2025-07-03 21:07:35','2025-07-03 21:07:35'),(26,7,'gr','Όνομα Εκκλησίας','2025-07-03 21:07:35','2025-07-03 21:07:35'),(27,7,'ru','Название церкви','2025-07-03 21:07:35','2025-07-03 21:07:35'),(28,7,'ro','Numele bisericii','2025-07-03 21:07:35','2025-07-03 21:07:35'),(29,8,'en','Church Email','2025-07-03 21:07:35','2025-07-03 21:07:35'),(30,8,'gr','Email Εκκλησίας','2025-07-03 21:07:35','2025-07-03 21:07:35'),(31,8,'ru','Email церкви','2025-07-03 21:07:35','2025-07-03 21:07:35'),(32,8,'ro','Email-ul bisericii','2025-07-03 21:07:35','2025-07-03 21:07:35');
/*!40000 ALTER TABLE `translations` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Table structure for table `user_notification_preferences`
--

DROP TABLE IF EXISTS `user_notification_preferences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_notification_preferences` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
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
  CONSTRAINT `user_notification_preferences_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_notification_preferences_ibfk_2` FOREIGN KEY (`notification_type_id`) REFERENCES `notification_types` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_notification_preferences`
--

LOCK TABLES `user_notification_preferences` WRITE;
/*!40000 ALTER TABLE `user_notification_preferences` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_notification_preferences` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_profiles`
--

DROP TABLE IF EXISTS `user_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_profiles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `display_name` varchar(100) DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `location` varchar(100) DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
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
  CONSTRAINT `user_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_profiles`
--

LOCK TABLES `user_profiles` WRITE;
/*!40000 ALTER TABLE `user_profiles` DISABLE KEYS */;
INSERT INTO `user_profiles` VALUES (1,4,'Super Admin',NULL,NULL,NULL,NULL,NULL,'default',NULL,NULL,0,'2025-07-21 21:59:30','null','null','2025-07-21 21:59:30','2025-07-22 16:06:14'),(2,20,NULL,NULL,NULL,NULL,NULL,NULL,'default','/images/profile/profile_1753057691760.png','/images/banner/2.png',0,'2025-07-22 15:32:12',NULL,NULL,'2025-07-22 15:32:12','2025-07-22 15:34:40');
/*!40000 ALTER TABLE `user_profiles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_sessions`
--

DROP TABLE IF EXISTS `user_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_sessions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
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
  CONSTRAINT `user_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_sessions`
--

LOCK TABLES `user_sessions` WRITE;
/*!40000 ALTER TABLE `user_sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_sessions_social`
--

DROP TABLE IF EXISTS `user_sessions_social`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_sessions_social` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
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
  CONSTRAINT `user_sessions_social_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_sessions_social`
--

LOCK TABLES `user_sessions_social` WRITE;
/*!40000 ALTER TABLE `user_sessions_social` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_sessions_social` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_social_settings`
--

DROP TABLE IF EXISTS `user_social_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_social_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
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
  CONSTRAINT `user_social_settings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_social_settings`
--

LOCK TABLES `user_social_settings` WRITE;
/*!40000 ALTER TABLE `user_social_settings` DISABLE KEYS */;
INSERT INTO `user_social_settings` VALUES (1,4,1,1,1,1,1,1,1,1,'friends',1,1,1,'{\"friend_requests\":true,\"blog_comments\":true}','2025-07-21 21:59:30','2025-07-22 16:10:14');
/*!40000 ALTER TABLE `user_social_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `preferred_language` char(2) DEFAULT 'en',
  `timezone` varchar(50) DEFAULT 'UTC',
  `role` enum('super_admin','admin','manager','user','viewer') DEFAULT 'user',
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
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON DELETE SET NULL,
  CONSTRAINT `users_ibfk_2` FOREIGN KEY (`preferred_language`) REFERENCES `languages` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (4,'superadmin@orthodoxmetrics.com','$2b$12$v0P8L/wcZwDhgBTEtadHkOg4.B.Ai2joYrSh0A9YI/yd44HveAFcq','Super','Admin',NULL,'en','UTC','super_admin','/admin/users',NULL,1,1,'2025-07-22 20:19:19',NULL,NULL,'2025-07-05 23:24:37','2025-07-22 20:19:19',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,NULL),(11,'testsuperadmin@example.com','$2b$12$y2sgDO4.hdorRy4M88QJzO/cKuG0QYxPeoZcxrc5rM0AmOcqxfy5a','Test','SuperAdmin',NULL,'en','UTC','super_admin','/pages/welcome',NULL,1,0,NULL,NULL,NULL,'2025-07-06 00:21:30','2025-07-22 12:56:59',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,NULL),(20,'frjames@ssppoc.org','$2b$12$J3uXISza5Cwg43Rnb3UYe.YqmNwYY0OkW7A1t525dgkMy5iG8EtCy','Fr. James','Parsells',NULL,'en','UTC','admin','/pages/welcome',14,1,0,'2025-07-22 20:31:12',NULL,NULL,'2025-07-21 23:33:12','2025-07-22 20:31:12',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary table structure for view `v_templates_with_church`
--

DROP TABLE IF EXISTS `v_templates_with_church`;
/*!50001 DROP VIEW IF EXISTS `v_templates_with_church`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `v_templates_with_church` AS SELECT
 1 AS `id`,
  1 AS `name`,
  1 AS `slug`,
  1 AS `record_type`,
  1 AS `description`,
  1 AS `fields`,
  1 AS `grid_type`,
  1 AS `theme`,
  1 AS `layout_type`,
  1 AS `language_support`,
  1 AS `is_editable`,
  1 AS `created_by`,
  1 AS `created_at`,
  1 AS `updated_at`,
  1 AS `church_id`,
  1 AS `is_global`,
  1 AS `church_name`,
  1 AS `church_email`,
  1 AS `display_scope` */;
SET character_set_client = @saved_cs_client;

--
-- Dumping routines for database 'orthodoxmetrics_db'
--

-- insufficient privileges to SHOW CREATE FUNCTION `GetBackupStorageUsed`
-- does orthodoxapps have permissions on mysql.proc?

