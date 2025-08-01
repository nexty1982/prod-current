/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19  Distrib 10.6.22-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: orthodox_ssppoc2
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
-- Table structure for table `baptism_records`
--

DROP TABLE IF EXISTS `baptism_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `baptism_records` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `church_id` int(11) NOT NULL,
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
  PRIMARY KEY (`id`),
  KEY `idx_baptism_church_date` (`church_id`,`reception_date`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `baptism_records`
--

LOCK TABLES `baptism_records` WRITE;
/*!40000 ALTER TABLE `baptism_records` DISABLE KEYS */;
INSERT INTO `baptism_records` VALUES (1,14,'John','Smith',NULL,'2024-01-15',NULL,NULL,NULL,'Michael and Sarah Smith','Fr. Peter','2025-07-09 13:02:31'),(2,14,'Mary','Johnson',NULL,'2024-02-20',NULL,NULL,NULL,'David and Anna Johnson','Fr. Paul','2025-07-09 13:02:31');
/*!40000 ALTER TABLE `baptism_records` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `church_info`
--

DROP TABLE IF EXISTS `church_info`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `church_info` (
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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `church_info`
--

LOCK TABLES `church_info` WRITE;
/*!40000 ALTER TABLE `church_info` DISABLE KEYS */;
INSERT INTO `church_info` VALUES (1,'ssppoc2',NULL,NULL,'frjames@ssppoc.org',NULL,'#1976d2','#dc004e','2025-07-09 13:02:30');
/*!40000 ALTER TABLE `church_info` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `funeral_records`
--

DROP TABLE IF EXISTS `funeral_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `funeral_records` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `church_id` int(11) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `birth_date` date DEFAULT NULL,
  `death_date` date NOT NULL,
  `funeral_date` date DEFAULT NULL,
  `burial_place` varchar(150) DEFAULT NULL,
  `clergy` varchar(150) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_funeral_church_date` (`church_id`,`funeral_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `funeral_records`
--

LOCK TABLES `funeral_records` WRITE;
/*!40000 ALTER TABLE `funeral_records` DISABLE KEYS */;
/*!40000 ALTER TABLE `funeral_records` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `marriage_records`
--

DROP TABLE IF EXISTS `marriage_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `marriage_records` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `church_id` int(11) NOT NULL,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `marriage_records`
--

LOCK TABLES `marriage_records` WRITE;
/*!40000 ALTER TABLE `marriage_records` DISABLE KEYS */;
/*!40000 ALTER TABLE `marriage_records` ENABLE KEYS */;
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
  `first_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `role` enum('admin','priest','deacon','secretary','viewer') DEFAULT 'viewer',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'orthodox_ssppoc2'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-07-22 17:15:52
