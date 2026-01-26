/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19  Distrib 10.6.22-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: 192.168.1.239    Database: omai_db
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
-- Table structure for table `bigbook_ai_interactions`
--

DROP TABLE IF EXISTS `bigbook_ai_interactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `bigbook_ai_interactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `interaction_type` enum('search','view','execute','edit','feedback','question') NOT NULL,
  `doc_id` varchar(255) DEFAULT NULL,
  `user_query` text DEFAULT NULL,
  `ai_response` text DEFAULT NULL,
  `user_feedback` enum('helpful','not_helpful','neutral') DEFAULT 'neutral',
  `context_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`context_data`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `session_id` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_interaction_type` (`interaction_type`),
  KEY `idx_doc_id` (`doc_id`),
  KEY `idx_user_feedback` (`user_feedback`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_session_id` (`session_id`),
  CONSTRAINT `bigbook_ai_interactions_ibfk_1` FOREIGN KEY (`doc_id`) REFERENCES `bigbook_documents` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bigbook_ai_interactions`
--

LOCK TABLES `bigbook_ai_interactions` WRITE;
/*!40000 ALTER TABLE `bigbook_ai_interactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `bigbook_ai_interactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bigbook_ai_patterns`
--

DROP TABLE IF EXISTS `bigbook_ai_patterns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `bigbook_ai_patterns` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pattern_type` enum('script_pattern','error_pattern','solution_pattern','workflow_pattern','best_practice') NOT NULL,
  `pattern_name` varchar(200) NOT NULL,
  `pattern_description` text DEFAULT NULL,
  `pattern_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`pattern_data`)),
  `confidence_score` decimal(3,2) DEFAULT 0.00,
  `usage_count` int(11) DEFAULT 0,
  `success_rate` decimal(3,2) DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_active` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_pattern_type` (`pattern_type`),
  KEY `idx_confidence_score` (`confidence_score`),
  KEY `idx_usage_count` (`usage_count`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bigbook_ai_patterns`
--

LOCK TABLES `bigbook_ai_patterns` WRITE;
/*!40000 ALTER TABLE `bigbook_ai_patterns` DISABLE KEYS */;
/*!40000 ALTER TABLE `bigbook_ai_patterns` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bigbook_ai_recommendations`
--

DROP TABLE IF EXISTS `bigbook_ai_recommendations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `bigbook_ai_recommendations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `doc_id` varchar(255) NOT NULL,
  `recommendation_type` enum('improvement','security','performance','maintenance','integration','deprecation') NOT NULL,
  `recommendation_text` text NOT NULL,
  `priority` enum('low','medium','high','critical') DEFAULT 'medium',
  `confidence_score` decimal(3,2) DEFAULT 0.00,
  `status` enum('pending','implemented','rejected','in_progress') DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `implemented_at` timestamp NULL DEFAULT NULL,
  `implemented_by` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_doc_id` (`doc_id`),
  KEY `idx_recommendation_type` (`recommendation_type`),
  KEY `idx_priority` (`priority`),
  KEY `idx_status` (`status`),
  KEY `idx_confidence_score` (`confidence_score`),
  KEY `idx_recommendations_doc_status` (`doc_id`,`status`),
  CONSTRAINT `bigbook_ai_recommendations_ibfk_1` FOREIGN KEY (`doc_id`) REFERENCES `bigbook_documents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bigbook_ai_recommendations`
--

LOCK TABLES `bigbook_ai_recommendations` WRITE;
/*!40000 ALTER TABLE `bigbook_ai_recommendations` DISABLE KEYS */;
/*!40000 ALTER TABLE `bigbook_ai_recommendations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary table structure for view `bigbook_ai_summary`
--

DROP TABLE IF EXISTS `bigbook_ai_summary`;
/*!50001 DROP VIEW IF EXISTS `bigbook_ai_summary`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `bigbook_ai_summary` AS SELECT
 1 AS `type`,
  1 AS `count`,
  1 AS `avg_confidence`,
  1 AS `total_usage` */;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `bigbook_categories`
--

DROP TABLE IF EXISTS `bigbook_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `bigbook_categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `parent_id` int(11) DEFAULT NULL,
  `color` varchar(7) DEFAULT '#007bff',
  `icon` varchar(50) DEFAULT NULL,
  `sort_order` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_sort_order` (`sort_order`),
  KEY `idx_is_active` (`is_active`),
  CONSTRAINT `bigbook_categories_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `bigbook_categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bigbook_categories`
--

LOCK TABLES `bigbook_categories` WRITE;
/*!40000 ALTER TABLE `bigbook_categories` DISABLE KEYS */;
INSERT INTO `bigbook_categories` VALUES (1,'Scripts','Automation and utility scripts',NULL,'#28a745','code',1,1,'2025-07-24 23:17:38'),(2,'Documentation','System documentation and guides',NULL,'#17a2b8','book',2,1,'2025-07-24 23:17:38'),(3,'Database','SQL scripts and database management',NULL,'#ffc107','database',3,1,'2025-07-24 23:17:38'),(4,'Configuration','System configuration files',NULL,'#6f42c1','cog',4,1,'2025-07-24 23:17:38'),(5,'Testing','Test scripts and validation tools',NULL,'#fd7e14','check-circle',5,1,'2025-07-24 23:17:38'),(6,'Deployment','Deployment and setup scripts',NULL,'#e83e8c','rocket',6,1,'2025-07-24 23:17:38'),(7,'Maintenance','System maintenance and cleanup',NULL,'#6c757d','tools',7,1,'2025-07-24 23:17:38'),(8,'AI/ML','AI and machine learning components',NULL,'#20c997','brain',8,1,'2025-07-24 23:17:38');
/*!40000 ALTER TABLE `bigbook_categories` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=71 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bigbook_config`
--

LOCK TABLES `bigbook_config` WRITE;
/*!40000 ALTER TABLE `bigbook_config` DISABLE KEYS */;
INSERT INTO `bigbook_config` VALUES (1,'storage_path','/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/bigbook','string','Base storage path for Big Book files',1,'2025-07-24 23:17:38','2025-07-24 23:17:38'),(2,'max_file_size','10485760','number','Maximum file size in bytes (10MB)',1,'2025-07-24 23:17:38','2025-07-24 23:17:38'),(3,'supported_extensions','[\"md\", \"sql\", \"js\", \"ts\", \"sh\", \"ps1\", \"json\", \"yaml\", \"yml\", \"conf\", \"config\"]','json','Supported file extensions',1,'2025-07-24 23:17:38','2025-07-24 23:17:38'),(4,'ai_enabled','true','boolean','Enable AI learning and recommendations',1,'2025-07-24 23:17:38','2025-07-24 23:17:38'),(5,'auto_index','true','boolean','Automatically index new files',1,'2025-07-24 23:17:38','2025-07-24 23:17:38'),(6,'search_history_retention_days','90','number','Days to retain search history',1,'2025-07-24 23:17:38','2025-07-24 23:17:38'),(7,'backup_enabled','true','boolean','Enable Big Book backup',1,'2025-07-24 23:17:38','2025-07-24 23:17:38'),(8,'backup_retention_days','30','number','Days to retain Big Book backups',1,'2025-07-24 23:17:38','2025-07-24 23:17:38'),(9,'database_name','omai_db','string','OMAI database name',1,'2025-07-24 23:17:38','2025-07-24 23:17:38'),(10,'main_database_name','orthodoxmetrics_db','string','Main OrthodoxMetrics database name',1,'2025-07-24 23:17:38','2025-07-24 23:17:38'),(11,'system_name','OrthodoxMetrics AI (OMAI)','string','System name',1,'2025-07-24 23:17:40','2025-07-24 23:17:40'),(12,'system_version','1.0.0','string','System version',1,'2025-07-24 23:17:40','2025-07-24 23:17:40'),(13,'database_version','1.0.0','string','Database schema version',1,'2025-07-24 23:17:40','2025-07-24 23:17:40'),(14,'created_date','2025-07-24 19:17:40','string','Database creation date',1,'2025-07-24 23:17:40','2025-07-24 23:17:40'),(15,'last_updated','2025-07-24 19:17:40','string','Last system update',1,'2025-07-24 23:17:40','2025-07-24 23:17:40'),(66,'user_database_user','root','string','User setting: user_database_user',0,'2025-07-27 17:57:38','2025-07-27 17:57:38'),(67,'user_use_sudo','true','boolean','User setting: user_use_sudo',0,'2025-07-27 17:57:38','2025-07-27 17:57:38'),(68,'user_default_database','omai_db','string','User setting: user_default_database',0,'2025-07-27 17:57:38','2025-07-27 17:57:38'),(69,'user_script_timeout','30000','number','User setting: user_script_timeout',0,'2025-07-27 17:57:38','2025-07-27 17:57:38'),(70,'user_max_file_size','10485760','number','User setting: user_max_file_size',0,'2025-07-27 17:57:38','2025-07-27 17:57:38');
/*!40000 ALTER TABLE `bigbook_config` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary table structure for view `bigbook_document_summary`
--

DROP TABLE IF EXISTS `bigbook_document_summary`;
/*!50001 DROP VIEW IF EXISTS `bigbook_document_summary`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `bigbook_document_summary` AS SELECT
 1 AS `id`,
  1 AS `title`,
  1 AS `file_path`,
  1 AS `file_type`,
  1 AS `category`,
  1 AS `status`,
  1 AS `priority`,
  1 AS `execution_count`,
  1 AS `last_executed`,
  1 AS `created_at`,
  1 AS `updated_at`,
  1 AS `reference_count`,
  1 AS `execution_count_recent`,
  1 AS `active_recommendations` */;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `bigbook_document_tags`
--

DROP TABLE IF EXISTS `bigbook_document_tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `bigbook_document_tags` (
  `doc_id` varchar(255) NOT NULL,
  `tag_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`doc_id`,`tag_id`),
  KEY `tag_id` (`tag_id`),
  CONSTRAINT `bigbook_document_tags_ibfk_1` FOREIGN KEY (`doc_id`) REFERENCES `bigbook_documents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `bigbook_document_tags_ibfk_2` FOREIGN KEY (`tag_id`) REFERENCES `bigbook_tags` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bigbook_document_tags`
--

LOCK TABLES `bigbook_document_tags` WRITE;
/*!40000 ALTER TABLE `bigbook_document_tags` DISABLE KEYS */;
/*!40000 ALTER TABLE `bigbook_document_tags` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bigbook_documents`
--

DROP TABLE IF EXISTS `bigbook_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `bigbook_documents` (
  `id` varchar(255) NOT NULL,
  `title` varchar(500) NOT NULL,
  `content` longtext NOT NULL,
  `file_path` varchar(1000) NOT NULL,
  `file_type` enum('markdown','sql','javascript','typescript','bash','powershell','json','yaml','config','other') NOT NULL,
  `category` varchar(100) NOT NULL,
  `subcategory` varchar(100) DEFAULT NULL,
  `tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tags`)),
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `version` int(11) DEFAULT 1,
  `status` enum('active','deprecated','draft','archived') DEFAULT 'active',
  `priority` int(11) DEFAULT 5,
  `execution_count` int(11) DEFAULT 0,
  `last_executed` timestamp NULL DEFAULT NULL,
  `created_by` varchar(100) DEFAULT 'system',
  `modified_by` varchar(100) DEFAULT 'system',
  PRIMARY KEY (`id`),
  KEY `idx_category` (`category`),
  KEY `idx_file_type` (`file_type`),
  KEY `idx_status` (`status`),
  KEY `idx_priority` (`priority`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_updated_at` (`updated_at`),
  KEY `idx_file_path` (`file_path`(255)),
  KEY `idx_docs_category_status` (`category`,`status`),
  KEY `idx_docs_type_priority` (`file_type`,`priority`),
  FULLTEXT KEY `idx_content` (`title`,`content`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bigbook_documents`
--

LOCK TABLES `bigbook_documents` WRITE;
/*!40000 ALTER TABLE `bigbook_documents` DISABLE KEYS */;
/*!40000 ALTER TABLE `bigbook_documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bigbook_executions`
--

DROP TABLE IF EXISTS `bigbook_executions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `bigbook_executions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `doc_id` varchar(255) NOT NULL,
  `executed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `execution_type` enum('manual','scheduled','automated','test') NOT NULL,
  `status` enum('success','failed','partial','timeout') NOT NULL,
  `duration_ms` int(11) DEFAULT NULL,
  `output` longtext DEFAULT NULL,
  `error_message` text DEFAULT NULL,
  `executed_by` varchar(100) DEFAULT NULL,
  `environment` varchar(50) DEFAULT 'production',
  PRIMARY KEY (`id`),
  KEY `idx_doc_id` (`doc_id`),
  KEY `idx_executed_at` (`executed_at`),
  KEY `idx_status` (`status`),
  KEY `idx_execution_type` (`execution_type`),
  KEY `idx_executions_doc_status` (`doc_id`,`status`),
  CONSTRAINT `bigbook_executions_ibfk_1` FOREIGN KEY (`doc_id`) REFERENCES `bigbook_documents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bigbook_executions`
--

LOCK TABLES `bigbook_executions` WRITE;
/*!40000 ALTER TABLE `bigbook_executions` DISABLE KEYS */;
/*!40000 ALTER TABLE `bigbook_executions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bigbook_relationships`
--

DROP TABLE IF EXISTS `bigbook_relationships`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `bigbook_relationships` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `source_doc_id` varchar(255) NOT NULL,
  `target_doc_id` varchar(255) NOT NULL,
  `relationship_type` enum('depends_on','references','imports','extends','similar_to','replaces','version_of') NOT NULL,
  `strength` decimal(3,2) DEFAULT 1.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_relationship` (`source_doc_id`,`target_doc_id`,`relationship_type`),
  KEY `target_doc_id` (`target_doc_id`),
  KEY `idx_relationship_type` (`relationship_type`),
  KEY `idx_strength` (`strength`),
  CONSTRAINT `bigbook_relationships_ibfk_1` FOREIGN KEY (`source_doc_id`) REFERENCES `bigbook_documents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `bigbook_relationships_ibfk_2` FOREIGN KEY (`target_doc_id`) REFERENCES `bigbook_documents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bigbook_relationships`
--

LOCK TABLES `bigbook_relationships` WRITE;
/*!40000 ALTER TABLE `bigbook_relationships` DISABLE KEYS */;
/*!40000 ALTER TABLE `bigbook_relationships` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bigbook_search_history`
--

DROP TABLE IF EXISTS `bigbook_search_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `bigbook_search_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `query_text` varchar(500) NOT NULL,
  `results_count` int(11) DEFAULT 0,
  `clicked_doc_id` varchar(255) DEFAULT NULL,
  `search_duration_ms` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `session_id` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_query_text` (`query_text`),
  KEY `idx_clicked_doc_id` (`clicked_doc_id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_session_id` (`session_id`),
  CONSTRAINT `bigbook_search_history_ibfk_1` FOREIGN KEY (`clicked_doc_id`) REFERENCES `bigbook_documents` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bigbook_search_history`
--

LOCK TABLES `bigbook_search_history` WRITE;
/*!40000 ALTER TABLE `bigbook_search_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `bigbook_search_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bigbook_search_index`
--

DROP TABLE IF EXISTS `bigbook_search_index`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `bigbook_search_index` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `doc_id` varchar(255) NOT NULL,
  `search_text` longtext NOT NULL,
  `keywords` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`keywords`)),
  `last_indexed` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_doc_index` (`doc_id`),
  KEY `idx_last_indexed` (`last_indexed`),
  FULLTEXT KEY `idx_search_text` (`search_text`),
  CONSTRAINT `bigbook_search_index_ibfk_1` FOREIGN KEY (`doc_id`) REFERENCES `bigbook_documents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bigbook_search_index`
--

LOCK TABLES `bigbook_search_index` WRITE;
/*!40000 ALTER TABLE `bigbook_search_index` DISABLE KEYS */;
/*!40000 ALTER TABLE `bigbook_search_index` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bigbook_tags`
--

DROP TABLE IF EXISTS `bigbook_tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `bigbook_tags` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `color` varchar(7) DEFAULT '#6c757d',
  `usage_count` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `idx_usage_count` (`usage_count`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bigbook_tags`
--

LOCK TABLES `bigbook_tags` WRITE;
/*!40000 ALTER TABLE `bigbook_tags` DISABLE KEYS */;
/*!40000 ALTER TABLE `bigbook_tags` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bigbook_timeline`
--

DROP TABLE IF EXISTS `bigbook_timeline`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `bigbook_timeline` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `event_type` enum('created','updated','executed','recommended','deprecated','archived','restored') NOT NULL,
  `doc_id` varchar(255) DEFAULT NULL,
  `event_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`event_data`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_by` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_event_type` (`event_type`),
  KEY `idx_doc_id` (`doc_id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_timeline_doc_type` (`doc_id`,`event_type`),
  CONSTRAINT `bigbook_timeline_ibfk_1` FOREIGN KEY (`doc_id`) REFERENCES `bigbook_documents` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bigbook_timeline`
--

LOCK TABLES `bigbook_timeline` WRITE;
/*!40000 ALTER TABLE `bigbook_timeline` DISABLE KEYS */;
/*!40000 ALTER TABLE `bigbook_timeline` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bigbook_versions`
--

DROP TABLE IF EXISTS `bigbook_versions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `bigbook_versions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `doc_id` varchar(255) NOT NULL,
  `version_number` int(11) NOT NULL,
  `content` longtext NOT NULL,
  `change_summary` text DEFAULT NULL,
  `changed_by` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_version` (`doc_id`,`version_number`),
  KEY `idx_doc_id` (`doc_id`),
  KEY `idx_version_number` (`version_number`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `bigbook_versions_ibfk_1` FOREIGN KEY (`doc_id`) REFERENCES `bigbook_documents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bigbook_versions`
--

LOCK TABLES `bigbook_versions` WRITE;
/*!40000 ALTER TABLE `bigbook_versions` DISABLE KEYS */;
/*!40000 ALTER TABLE `bigbook_versions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bigbook_watchers`
--

DROP TABLE IF EXISTS `bigbook_watchers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `bigbook_watchers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `watch_path` varchar(1000) NOT NULL,
  `file_patterns` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`file_patterns`)),
  `exclude_patterns` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`exclude_patterns`)),
  `is_active` tinyint(1) DEFAULT 1,
  `last_scan` timestamp NULL DEFAULT NULL,
  `scan_interval_seconds` int(11) DEFAULT 300,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_watch_path` (`watch_path`(255)),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_last_scan` (`last_scan`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bigbook_watchers`
--

LOCK TABLES `bigbook_watchers` WRITE;
/*!40000 ALTER TABLE `bigbook_watchers` DISABLE KEYS */;
INSERT INTO `bigbook_watchers` VALUES (1,'/var/www/orthodox-church-mgmt/orthodoxmetrics/prod','[\"**/*.md\", \"**/*.sql\", \"**/*.js\", \"**/*.ts\", \"**/*.sh\", \"**/*.ps1\"]','[\"**/node_modules/**\", \"**/.git/**\", \"**/logs/**\", \"**/temp/**\", \"**/bigbook/**\"]',1,NULL,300,'2025-07-24 23:17:38'),(2,'/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server/scripts','[\"**/*.js\", \"**/*.sh\", \"**/*.sql\"]','[\"**/backups/**\", \"**/temp/**\"]',1,NULL,300,'2025-07-24 23:17:38'),(3,'/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/docs','[\"**/*.md\", \"**/*.sql\"]','[\"**/archive/**\"]',1,NULL,300,'2025-07-24 23:17:38'),(4,'/var/www/orthodox-church-mgmt/orthodoxmetrics/prod','[\"**/*.md\", \"**/*.sql\", \"**/*.js\", \"**/*.ts\", \"**/*.sh\", \"**/*.ps1\"]','[\"**/node_modules/**\", \"**/.git/**\", \"**/logs/**\", \"**/temp/**\", \"**/bigbook/**\"]',1,NULL,300,'2025-07-24 23:18:24'),(5,'/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server/scripts','[\"**/*.js\", \"**/*.sh\", \"**/*.sql\"]','[\"**/backups/**\", \"**/temp/**\"]',1,NULL,300,'2025-07-24 23:18:24'),(6,'/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/docs','[\"**/*.md\", \"**/*.sql\"]','[\"**/archive/**\"]',1,NULL,300,'2025-07-24 23:18:24'),(7,'/var/www/orthodox-church-mgmt/orthodoxmetrics/prod','[\"**/*.md\", \"**/*.sql\", \"**/*.js\", \"**/*.ts\", \"**/*.sh\", \"**/*.ps1\"]','[\"**/node_modules/**\", \"**/.git/**\", \"**/logs/**\", \"**/temp/**\", \"**/bigbook/**\"]',1,NULL,300,'2025-07-24 23:19:04'),(8,'/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server/scripts','[\"**/*.js\", \"**/*.sh\", \"**/*.sql\"]','[\"**/backups/**\", \"**/temp/**\"]',1,NULL,300,'2025-07-24 23:19:04'),(9,'/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/docs','[\"**/*.md\", \"**/*.sql\"]','[\"**/archive/**\"]',1,NULL,300,'2025-07-24 23:19:04');
/*!40000 ALTER TABLE `bigbook_watchers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Final view structure for view `bigbook_ai_summary`
--

/*!50001 DROP VIEW IF EXISTS `bigbook_ai_summary`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb3 */;
/*!50001 SET character_set_results     = utf8mb3 */;
/*!50001 SET collation_connection      = utf8mb3_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`omai_user`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `bigbook_ai_summary` AS select 'patterns' AS `type`,count(0) AS `count`,avg(`bigbook_ai_patterns`.`confidence_score`) AS `avg_confidence`,sum(`bigbook_ai_patterns`.`usage_count`) AS `total_usage` from `bigbook_ai_patterns` where `bigbook_ai_patterns`.`is_active` = 1 union all select 'recommendations' AS `type`,count(0) AS `count`,avg(`bigbook_ai_recommendations`.`confidence_score`) AS `avg_confidence`,count(case when `bigbook_ai_recommendations`.`status` = 'implemented' then 1 end) AS `total_usage` from `bigbook_ai_recommendations` union all select 'interactions' AS `type`,count(0) AS `count`,avg(case when `bigbook_ai_interactions`.`user_feedback` = 'helpful' then 1.0 when `bigbook_ai_interactions`.`user_feedback` = 'not_helpful' then 0.0 else 0.5 end) AS `avg_confidence`,count(case when `bigbook_ai_interactions`.`user_feedback` = 'helpful' then 1 end) AS `total_usage` from `bigbook_ai_interactions` where `bigbook_ai_interactions`.`created_at` >= current_timestamp() - interval 30 day */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `bigbook_document_summary`
--

/*!50001 DROP VIEW IF EXISTS `bigbook_document_summary`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb3 */;
/*!50001 SET character_set_results     = utf8mb3 */;
/*!50001 SET collation_connection      = utf8mb3_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`omai_user`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `bigbook_document_summary` AS select `d`.`id` AS `id`,`d`.`title` AS `title`,`d`.`file_path` AS `file_path`,`d`.`file_type` AS `file_type`,`d`.`category` AS `category`,`d`.`status` AS `status`,`d`.`priority` AS `priority`,`d`.`execution_count` AS `execution_count`,`d`.`last_executed` AS `last_executed`,`d`.`created_at` AS `created_at`,`d`.`updated_at` AS `updated_at`,count(distinct `r`.`target_doc_id`) AS `reference_count`,count(distinct `e`.`id`) AS `execution_count_recent`,count(distinct `ar`.`id`) AS `active_recommendations` from (((`bigbook_documents` `d` left join `bigbook_relationships` `r` on(`d`.`id` = `r`.`source_doc_id`)) left join `bigbook_executions` `e` on(`d`.`id` = `e`.`doc_id` and `e`.`executed_at` >= current_timestamp() - interval 30 day)) left join `bigbook_ai_recommendations` `ar` on(`d`.`id` = `ar`.`doc_id` and `ar`.`status` = 'pending')) group by `d`.`id` */;
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

-- Dump completed on 2025-07-29  2:04:05
