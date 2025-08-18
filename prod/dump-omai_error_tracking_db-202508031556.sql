/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19-11.7.2-MariaDB, for Win64 (AMD64)
--
-- Host: 192.168.1.240    Database: omai_error_tracking_db
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
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;

--
-- Table structure for table `error_events`
--

DROP TABLE IF EXISTS `error_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `error_events` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `error_id` int(11) NOT NULL,
  `occurred_at` datetime NOT NULL,
  `user_agent` text DEFAULT NULL,
  `session_id` varchar(128) DEFAULT NULL,
  `additional_context` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`additional_context`)),
  PRIMARY KEY (`id`),
  KEY `error_id` (`error_id`),
  CONSTRAINT `error_events_ibfk_1` FOREIGN KEY (`error_id`) REFERENCES `errors` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `error_tags`
--

DROP TABLE IF EXISTS `error_tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `error_tags` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `error_id` int(11) NOT NULL,
  `tag` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `error_id` (`error_id`),
  CONSTRAINT `error_tags_ibfk_1` FOREIGN KEY (`error_id`) REFERENCES `errors` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `errors`
--

DROP TABLE IF EXISTS `errors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `errors` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `hash` char(64) NOT NULL,
  `type` enum('frontend','backend','nginx','db','api') NOT NULL,
  `source` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `first_seen` datetime NOT NULL,
  `last_seen` datetime NOT NULL,
  `occurrences` int(11) DEFAULT 1,
  `status` enum('pending','in-progress','resolved','ignored','low-priority') DEFAULT 'pending',
  `severity` enum('critical','high','medium','low') DEFAULT 'medium',
  `log_level` enum('INFO','WARN','ERROR','DEBUG','SUCCESS') DEFAULT 'ERROR',
  `origin` varchar(64) DEFAULT NULL COMMENT 'Source origin: server, browser, devtools, etc.',
  `source_component` varchar(128) DEFAULT NULL COMMENT 'Component that generated the log',
  `auto_tracked` tinyint(1) DEFAULT 1,
  `github_issue_url` varchar(512) DEFAULT NULL COMMENT 'URL of created GitHub issue',
  PRIMARY KEY (`id`),
  UNIQUE KEY `hash` (`hash`),
  KEY `idx_errors_log_level` (`log_level`),
  KEY `idx_errors_origin` (`origin`),
  KEY `idx_errors_source_component` (`source_component`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `github_issues`
--

DROP TABLE IF EXISTS `github_issues`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `github_issues` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `error_hash` varchar(64) NOT NULL,
  `issue_number` int(11) NOT NULL,
  `issue_url` varchar(512) NOT NULL,
  `issue_title` varchar(255) NOT NULL,
  `issue_body` text DEFAULT NULL,
  `labels` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`labels`)),
  `status` enum('open','closed') DEFAULT 'open',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_error_hash` (`error_hash`),
  KEY `idx_issue_number` (`issue_number`),
  CONSTRAINT `github_issues_ibfk_1` FOREIGN KEY (`error_hash`) REFERENCES `errors` (`hash`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping routines for database 'omai_error_tracking_db'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2025-08-03 15:56:38
