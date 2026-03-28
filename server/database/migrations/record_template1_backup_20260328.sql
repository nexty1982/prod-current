-- record_template1 full backup
-- Date: 2026-03-28
-- Pre-cleanup snapshot

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
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `marriage_history` (`id`,`type`,`description`,`timestamp`,`record_id`,`record_data`,`church_id`) VALUES (1,'add','Added record #207','2025-05-16 19:25:45',NULL,'{\"id\": 207, \"mdate\": \"2001-01-01\", \"clergy\": \"Rev. James Parsells\", \"witness\": \"Alex & Bob\", \"mlicense\": \"12345\", \"parentsb\": \"Paul & Mary\", \"parentsg\": \"Peter & Ann\", \"fname_bride\": \"Jane\", \"fname_groom\": \"John\", \"lname_bride\": \"Roe\", \"lname_groom\": \"Doe\"}',14);
INSERT INTO `marriage_history` (`id`,`type`,`description`,`timestamp`,`record_id`,`record_data`,`church_id`) VALUES (2,'delete','Deleted record #207','2025-05-16 19:25:57',NULL,'{\"id\": 207, \"mdate\": \"2001-01-01\", \"clergy\": \"Rev. James Parsells\", \"witness\": \"Alex & Bob\", \"mlicense\": \"12345\", \"parentsb\": \"Paul & Mary\", \"parentsg\": \"Peter & Ann\", \"fname_bride\": \"Jane\", \"fname_groom\": \"John\", \"lname_bride\": \"Roe\", \"lname_groom\": \"Doe\"}',14);
INSERT INTO `marriage_history` (`id`,`type`,`description`,`timestamp`,`record_id`,`record_data`,`church_id`) VALUES (3,'delete','Deleted record #206','2025-05-16 19:26:00',NULL,'{\"id\": 206, \"mdate\": \"2001-01-01\", \"clergy\": \"Rev. James Parsells\", \"witness\": \"Alex & Bob\", \"mlicense\": \"12345\", \"parentsb\": \"Paul & Mary\", \"parentsg\": \"Peter & Ann\", \"fname_bride\": \"Jane\", \"fname_groom\": \"John\", \"lname_bride\": \"Roe\", \"lname_groom\": \"Doe\"}',14);
INSERT INTO `marriage_history` (`id`,`type`,`description`,`timestamp`,`record_id`,`record_data`,`church_id`) VALUES (4,'delete','Deleted record #205','2025-05-16 19:26:01',NULL,'{\"id\": 205, \"mdate\": \"2001-01-01\", \"clergy\": \"Rev. James Parsells\", \"witness\": \"Alex & Bob\", \"mlicense\": \"12345\", \"parentsb\": \"Paul & Mary\", \"parentsg\": \"Peter & Ann\", \"fname_bride\": \"Jane\", \"fname_groom\": \"John\", \"lname_bride\": \"Roe\", \"lname_groom\": \"Doe\"}',14);
INSERT INTO `marriage_history` (`id`,`type`,`description`,`timestamp`,`record_id`,`record_data`,`church_id`) VALUES (5,'add','Added record #208','2025-05-16 20:15:30',NULL,'{\"id\": 208, \"mdate\": \"2001-01-01\", \"clergy\": \"Rev. James Parsells\", \"witness\": \"Alex & Bob\", \"mlicense\": \"12345\", \"parentsb\": \"Paul & Mary\", \"parentsg\": \"Peter & Ann\", \"fname_bride\": \"Jane\", \"fname_groom\": \"John\", \"lname_bride\": \"Roe\", \"lname_groom\": \"Doe\"}',14);
INSERT INTO `marriage_history` (`id`,`type`,`description`,`timestamp`,`record_id`,`record_data`,`church_id`) VALUES (6,'add','Added record #209','2025-05-17 21:54:50',NULL,'{\"id\": 209, \"mdate\": \"1982-01-01\", \"clergy\": \"Rev. James Parsells\", \"witness\": \"Peter Parsells\", \"mlicense\": \"98765\", \"parentsb\": \"Edward\", \"parentsg\": \"James & Daria\", \"fname_bride\": \"Kim\", \"fname_groom\": \"Nick\", \"lname_bride\": \"Chu\", \"lname_groom\": \"Parsells\"}',14);
INSERT INTO `marriage_history` (`id`,`type`,`description`,`timestamp`,`record_id`,`record_data`,`church_id`) VALUES (7,'delete','Deleted record #209','2025-05-18 05:40:44',NULL,'{\"id\": 209, \"mdate\": \"1982-01-01\", \"clergy\": \"Rev. James Parsells\", \"witness\": \"Peter Parsells\", \"mlicense\": \"98765\", \"parentsb\": \"Edward\", \"parentsg\": \"James & Daria\", \"fname_bride\": \"Kim\", \"fname_groom\": \"Nick\", \"lname_bride\": \"Chu\", \"lname_groom\": \"Parsells\"}',14);
INSERT INTO `marriage_history` (`id`,`type`,`description`,`timestamp`,`record_id`,`record_data`,`church_id`) VALUES (8,'delete','Deleted record #208','2025-05-18 05:45:16',NULL,'{\"id\": 208, \"mdate\": \"2001-01-01\", \"clergy\": \"Rev. James Parsells\", \"witness\": \"Alex & Bob\", \"mlicense\": \"12345\", \"parentsb\": \"Paul & Mary\", \"parentsg\": \"Peter & Ann\", \"fname_bride\": \"Jane\", \"fname_groom\": \"John\", \"lname_bride\": \"Roe\", \"lname_groom\": \"Doe\"}',14);

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
) ENGINE=InnoDB AUTO_INCREMENT=211 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (7,'1942-04-11 04:00:00','John','Bednar','Frank & Francis','Irene','Kudelko','John & Helen','Olga Kudelko Joseph Bedmon',NULL,'Rev. Michael Lototsky',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (8,'1942-04-25 04:00:00','Wasil','Kutch','Methody & Agattha','Anna','Kolchersky','Anthony & Yadvigz','Alice Teleck Louis L. Milclorvic',NULL,'Rev. Michael Lototsky',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (9,'1942-04-25 04:00:00','Caesar','Mastriomo','Anthony & A','Nancy ','Lebedz','Nicholas & Mary','Henry Cellette Charles Fetchko',NULL,'Rev. Michael Lototsky',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (10,'1942-05-10 04:00:00','Alexander  ','Naruta','Alexander & Anna','Mary','Marchison','John & Helen','John Marchison John Naruta',NULL,'Rev. Michael Lototsky',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (11,'1942-07-18 04:00:00','Constantine','Putyrski','Peter & Anna','Margaret','Macey','Joseph & Margarita','Michael Rowry Alex Putryske',NULL,'Rev. Theodore Labowsky',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (12,'1942-09-19 04:00:00','Charles','Specian','Alexander & Francis','Julie','Skwarla','Nazor & Mary','Mary Ann Specian Stella Sulla',NULL,'Rev. Theodore Labowsky',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (13,'1942-10-11 04:00:00','Joseph','Leminuk','Joakim & Ksenia','Dorothy','Kravolich','Paul & Paulina','Stanley Bughawki Raslaughi',NULL,'Rev. Theodore Labowsky',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (14,'1942-11-18 04:00:00','Andrew','Hriniak','Andrew & Ekaterina','Anna','Rosocha','John & Helen','Jack Hriniak William Lesinsky',NULL,'Rev. Michael Lototsky',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (15,'1943-10-23 04:00:00','Frank','Pellegrino','James & Teresa','Ann','Max','Steve & Mary','Anthony Jatton Helen Max',NULL,'Rev. Michael Lototsky',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (16,'1944-01-08 04:00:00','Michael','Rabatsky','Paul & Sophie','Mary','Fajan','Michael & Elizabeth','John Kovach Stella Hudak',NULL,'Rev. Michael Lototsky',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (17,'1944-01-25 04:00:00','George L.','Sudrinko','George & Anna','Sophie','Klimovich','Andrew & Anna','Olga Klimovich Beatty',NULL,'Rev. Michael Lototsky',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (18,'1944-02-06 04:00:00','Francis','Reilly','Christopher & Henrictta','Helen','Roman','George & Mary','Anna Cherniak Mary Kuzmiak',NULL,'Rev. Michael Lototsky',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (19,'1944-02-22 04:00:00','Vlodimir','Wilhousky',NULL,'Ivanna','Tobias','Frank & Margaret','Elizabeth Wilhousky R. Hriniak',NULL,'Rev. Michael Lototsky',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (20,'1945-11-11 05:00:00','Frederick','Gorbatuk','Steve & Katherine','Olga','Klimovich','Anthony & Anna','Anna Skvarla Helen Holovach',NULL,'Rev. Michael Lototsky',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (21,'1946-02-09 05:00:00','Joseph  ','Holovach','Michael & Julia','Mary','Kuzmiak','Michael & Anastasia','John Holovach John Marym',NULL,'Rev. Michael Lototsky',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (22,'1948-07-14 04:00:00','Everett','Snyder','Nelson & Maud','Stella','Lopatka','John & Helen',NULL,NULL,'Rev. Nicholas Kiryluk',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (23,'1948-08-14 04:00:00','Andrew','Spotts','Alexander & Catherine','Mary','Skwarla','Nazor & Mary','Julia Specian Joseph Onushak',NULL,'Rev. Nicholas Kiryluk',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (24,'1948-09-25 04:00:00','Charles P.','Kulina','Peter & Alexandra','Helen','Lukasivch','Martin','George Roman Anthony Pawlik',NULL,'Rev. Nicholas Kiryluk',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (25,'1948-10-02 05:00:00','John','Kucharz','Andrew & Anna','Adele','Pirrone','Frank & Vinsewza',NULL,NULL,'Rev. Nicholas Kiryluk',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (26,'1962-11-27 05:00:00','Peter P.','Zeban','Peter & Anna','Phyllis','Jowell','Stuart & Mariam',NULL,NULL,'Rev. Theodore Labowsky',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (27,'1963-02-02 05:00:00','Gennaro M.','Russo','Michael & Antonetta','Helen Lebedz','Russo','Nicholas & Mary',NULL,NULL,'Rev. Theodore Labowsky',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (28,'1963-05-11 04:00:00','Charles Jr.','Bradley','John & Catharine','Maria Joyce','Tacak','Michael',NULL,NULL,'Rev. Theodore Labowsky',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (29,'1963-05-18 04:00:00','Stephen','Skirzenski','Walter & Natalie','Ann Maria',NULL,'Alek & Anna',NULL,NULL,'Rev. Theodore Labowsky',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (30,'1963-07-20 04:00:00','Andrew H.','Phillips','Andrew & Theresa','Anastasia Nancy','Adamchak','Theodore & Anna',NULL,NULL,'Rev. Theodore Labowsky',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (31,'1964-02-11 05:00:00','Leon J.','Rakowski','Joseph & Ann','Natti','Colli',NULL,NULL,NULL,'Rev. Theodore Labowsky',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (32,'1964-10-03 04:00:00','John','Kulina','John & Natalie','Victoria','Riccardi','Anthony & Julia',NULL,NULL,'Rev. Theodore Labowsky',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (33,'1965-01-30 05:00:00','William','Zorzi','Massino & Vita','Julia','Jeffs','William & Helen',NULL,NULL,'Rev. Theodore Labowsky',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (34,'1965-06-06 04:00:00','Nicholas','Stashkevich',NULL,'Helen   ','McCloskey',NULL,NULL,NULL,'Rev. Theodore Labowsky',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (35,'1967-01-15 05:00:00','Herman Arthur','Colie','Herbert & Margaret','Lydia','Zeban','Peter & Anna',NULL,NULL,'Rev. Theodore Labowsky',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (36,'1967-06-24 04:00:00','Arnold','Katko','Ernest & Helen','Julia','Carney','David & Irene',NULL,NULL,'Rev. Theodore Labowsky',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (37,'1967-11-18 05:00:00','John','Melver','Andrew & Joan','June',NULL,NULL,NULL,NULL,NULL,37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (38,'1968-06-01 04:00:00','Harvey George','Fielding','William & Jane','Carol Ann','Mock','Stephen & Mildred',NULL,NULL,'Rev. Theodore Labowsky',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (39,'1968-06-15 04:00:00','Peter','Sibilia','Rocco & Mary','Barbara Ann','Sofko','Michael & Anna',NULL,NULL,'Rev. Theodore Labowsky',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (40,'1968-11-02 05:00:00','Wayne C.','Atkinson','John & Mary','Barbara','Almond','Peter & Olga',NULL,NULL,'Rev. Theodore Labowsky',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (41,'1968-11-02 05:00:00','Wayne C.','Atkinson','John J.','Barbara','Krenetsky','Peter & Olga','Frankfort Kentsoky Janette Almind',NULL,'Rev. Theodore Labowsky',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (42,'1968-11-02 05:00:00','Douglas  ','Reigler','Fordinano & Masotta','Daria','Holovach','Joseph & Mary','David Slater',NULL,NULL,37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (43,'1968-11-02 05:00:00','Douglas J.','Riegler','Ferdinand & Masetta','Daria','Holovach','Joseph & Mary',NULL,NULL,'Rev. Theodore Labowsky',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (44,'1969-02-01 05:00:00','Stanley','Bozinta','Stanley & Mary','Helen','Gregor','Nicholas',NULL,NULL,'Rev. Theodore Labowsky',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (45,'1969-07-12 04:00:00','Vincent John','Zakarzewski','Vincent & Gertrude','Maureen Susan','Wassel','John & Sonia','Thomas Pickar Susan Mastrianni',NULL,'Rev. George Lewis',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (46,'1969-08-30 04:00:00','Thomas','Kononchuk','Alex & Claire','Linda Jean','Giambatista','Eugene & Alice','John H. Chervenack Gay Dagrosa',NULL,'Rev. George Lewis',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (47,'1970-02-14 05:00:00','Harry','Gustich','Paul & Mary','Leona','Houston','Victor & Iola','George Grabania Lydia Grabania',NULL,'Rev. George Lewis',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (48,'1970-08-08 04:00:00','Nicholas John','Chabra','Nicholas & Louise','Kathleen','Miklowcic','John & Mary','Denis J. Holovach Barbara Miklowcic',NULL,'Rev. George Lewis',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (49,'1970-08-08 04:00:00','Nicholas J.','Chabra','Nicholas & Louise','Kathleen','Milowcic','John & Mary Ann','Dennis J. Holovach Barbara Milowcic',NULL,'Rev. George Lewis',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (50,'1970-10-04 04:00:00','Charles Jr.','Fetchko','Charles Eugenia','Rose Ghilda','Romero','Avaristo & Dora','Michael Fetchko Margaret Anne Proctor',NULL,'Rev. George Lewis',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (51,'1970-10-17 04:00:00','John Jr.','Rosocha','John & Mary','Joan Ann','Lechinsky','John & Maria','Vincent Zakarzewski Ann Lechinsky',NULL,'Rev. George Lewis',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (52,'1971-02-01 05:00:00','William','Davidovich','William & Mary','Jo-Ann','Kuntzevich','Alexander & Kraisky','Charles Kachek Stephanie Kachek',NULL,'Rev. George Lewis',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (53,'1971-02-14 05:00:00','Thomas John','Kurtyka','Thomas & Catherine','Sarah','Kulina','Philip & Helen','Dale Kurtyka Joan Prince',NULL,'Rev. George Lewis',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (54,'1971-02-21 05:00:00','George','Oliver','George & Augusta','Anna','Max','Stephen & Mary','George Grabania Lydia Grabania',NULL,'Rev. George Lewis',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (55,'1971-07-07 04:00:00','Richard John','Ostapovich','John & Pauline','Susan Mary','Andreychik','Harry & Anna','Harry Andreychik Anna Andreychik',NULL,'Rev. George Lewis',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (56,'1971-07-11 04:00:00','Thomas Frank','Richardson','Frank & Catherine','Maria','Marini','Giuseppe & Giovanina','Robert Clim Helen Russo',NULL,'Rev. George Lewis',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (57,'1971-07-25 04:00:00','Frederick Theodore','Gorbatuk','Frederick & Olga','Claire Mary ','Krombach','Charles & Adele','Peter Gorbatuk Donna Marie Mantush',NULL,'Rev. George Lewis',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (58,'1972-04-16 05:00:00','Alan Brent','Beatty','James & Beatrice','Patricia','Sofko','Michael & Anna','Matushka Helen Pogrebniak Alexander Padlo',NULL,'Rev. Vadmin Pogrebniak',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (59,'1972-06-03 04:00:00','Robert Raymond','Schuback','William & Dorothy','Louise Bertha','Kilner','George & Mary','Barbara Kulick Matushka Helen Pogrebniak',NULL,'Rev. Vadmin Pogrebniak',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (60,'1972-07-29 04:00:00','John Frank','Chapkowski','John & Sylvia','Mary A. ','Kulina','Joseph & Alice','Helen Kulina Peter Hnatuk',NULL,'Rev. Vadmin Pogrebniak',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (61,'1973-02-24 05:00:00','Stephen John','Suseck','John & Mary','Maureen Ann','O\'Rourke','Vincent & Nora','Clare E. Collins John Suseck Jr.',NULL,'Rev. Vadmin Pogrebniak',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (62,'1973-04-04 05:00:00','Peter John','Jegou','Eugene & Lucille','Carol Ann','Kulina','Stephen & Helen','Chris Stellatella Nancy Kulina',NULL,'Rev. Eugene Tarris',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (63,'1973-05-06 04:00:00','George','Barnosky','Jacob & Madeline','Laura Nellie','Pietrucha','Steven & Nellie','Robert Golden Jeanne Golden',NULL,'Rev. Eugene Tarris',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (64,'1973-05-13 04:00:00','Peter ','Aparin','Stefan & Eva','Christine','Cranendonk','Charles & Gladys','George Nikityn Margaret Schiller',NULL,'Rev. Eugene Tarris',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (65,'1973-08-25 04:00:00','Michael','Fetchko','Charles & Eugenia','Carol Lynn','Maurer','Francis & Irma','Richard D. Pankowski Linda M. Nigro',NULL,'Rev. Eugene Tarris',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (66,'1973-09-29 04:00:00','Edward','Petro','Edward & Joan','Cynthia','Rosocha','John & Mary','John Rosocha Jr., Veronica Petro',NULL,'Rev. Eugene Tarris',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (67,'1973-11-11 05:00:00','Michael James','Iskra','Edward & Josephine','Ann Marie','Macinko','John & Helen','Walter J. Kostuk Elaine Kresefki',NULL,'Rev. Eugene Tarris',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (68,'1974-01-26 04:00:00','John','Kulina','Peter & Alexandria','Natalie','Minne','Philip & Helen','Philip Kulina Helen Kulina',NULL,'Rev. Eugene Tarris',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (69,'1974-02-03 04:00:00','Robert Edward','Sangster','Robert & Margaret','Christina','Aivalikles','George & Ourania','Diane Liothake Helen Aivalikles',NULL,'Rev. Eugene Tarris',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (70,'1974-05-26 04:00:00','Steven','Welenteychik','Michael & Vera','Elizabeth Ann','Hill','Raymond & Anna','Michael Welentechik Eleanor Gais',NULL,'Rev. Eugene Tarris',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (71,'1975-07-13 04:00:00','Peter John','Chabra','Nicholas & Louise','Carol Ann','Babyak','William & Irene','Zena Holovach James David Caruso',NULL,'Rev. Eugene Tarris',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (72,'1976-07-11 04:00:00','Anthony Joseph','Winchatz','Anthony & Helen','Avorey Gayle','Hull','Sylvester & Margaret','Thomas Winchatz Dorothy Hull',NULL,'Rev. Eugene Tarris',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (73,'1978-07-02 04:00:00','Gerard James','Lippmann','Albert & Margaret','Daria','Kachek','Charles & Stephanie','James Cramer Nancy Kulina',NULL,'Rev. Eugene Tarris',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (74,'1978-10-08 04:00:00','Donald','Davidovich','William & Mary','Nancy','Marshalek','Edward & Sophie','William Davidovich Victoria Paul',NULL,'Rev. John Nehrebecki',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (75,'1979-05-27 04:00:00','Kenneth','Gerlach','Bertha & Adolph','Janice Diane','Perhach','Peter & Pauline','Patricia Perhach John Roland',NULL,'Rev. James Parsells',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (76,'1979-06-03 04:00:00','John Charles','Mayernik','John & Mary Ellen','Christine Joy','Nevitt','Theodosia & Richard','Edward Droad Carol Lyn Nevitt',NULL,'Rev. James Parsells',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (77,'1979-09-02 04:00:00','David Allen','Ludgin','Nancy & Earle','Marsha Karin','Hyll','Irene & Walter','Jason Richardson Sandra Hull',NULL,'Rev. James Parsells',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (78,'1979-11-04 05:00:00','Nicholas   ','Kadola',NULL,'Inge','Leins','Herman & Olga','Leonid Fedorov Brigette Fedorov',NULL,'Rev. James Parsells',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (79,'1980-05-18 04:00:00','Robert Di','Mauro','Emmanuel & Marie','Christine','Makara','George & Margaret','Richard Di Mauro Makara',NULL,'Rev. James Parsells',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (80,'1982-05-23 04:00:00','Peter','Epifan','Ivan & Tamara','Carrie Ann','Liedl','John & Vera','Alexis Epifan Jane Buhega',NULL,'Rev. James Parsells',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (81,'1982-06-13 04:00:00','Gary','Sampson','John & Audrey','Cynthia','Babyak','William & Irene','Marcela Perdue William Wilson',NULL,'Rev. James Parsells',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (82,'1982-07-25 04:00:00','Thomas','Gardner','Thomas & Muriel','Linda','Lapchuk','John & Helen','Melanie Carrol Mark Gardner',NULL,'Rev. James Parsells',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (83,'1983-07-24 04:00:00','Robert','Kita','Stanley & Helen','Anastasia','Nevitt','Richard & Tess','Jacqueline De Larato James Daley',NULL,'Rev. James Parsells',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (84,'1983-11-13 05:00:00','Michael John','Chabra','Nicholas & Louise','Patricia','Penlack','Steven & Elizabeth','Louise Chabra Christine Perlack',NULL,'Rev. James Parsells',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (85,'1984-10-27 04:00:00','Stanley','Bozinta','Stanley & Mary','Valerie','Ruhe','Paul & Viola','Daria Barsigian',NULL,'Rev. James Parsells',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (86,'1985-10-06 04:00:00','Robert Louis','Hanson','Louis & Dolly','Tatiana','Mickel','Laverne & Anastasia',NULL,NULL,'Rev. James Parsells',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (87,'1986-08-17 04:00:00','Michael John','Lewis','John & Irene','Kyra','Kulick','Basil & Barbara','Anthony Yazge Larissa Kulick',NULL,'Rev. James Parsells',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (88,'1987-02-15 05:00:00','Jeffrey John','Stein','John & Mae','Donna R. ','Zaeko','Paul & Rosalie','Robert Paul Zaeko Jo-Ellen Bistronovitz',NULL,'Rev. James Parsells',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (89,'1988-04-17 04:00:00','Stephen','Mickel','Laverene & Anastasia','Lisa Ann','Griven','Theodore & Maria','Michael Grigal Tatiana Hansen',NULL,'Rev. James Parsells',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (90,'1988-10-09 04:00:00','Mark','Kulick','Basil & Barbara','Barbara','Fetchko','Nicholas & ','Kyra Lewis Robert Telep',NULL,'Rev. James Parsells',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (91,'1989-05-27 04:00:00','Robert Lawrence','Porchik','Albert & Irene','Jill Ann','Filippini','Atopere & Joan','Theresa Filipinni Mark Porchik',NULL,'Rev. James Parsells',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (92,'1989-06-25 04:00:00','Peter John','Kulina','John & Natalie','Shirley','Jarkowski','Raymond & Margaret','Paul Kulina Sharyn Foster',NULL,'Rev. James Parsells',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (93,'1989-09-03 04:00:00','John A.','Ward','John & Jennie','Stephanie','Hnatuk','Peter & Helen','Susan Pribish Gregory Rohaus',NULL,'Rev. James Parsells',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (94,'1989-10-22 04:00:00','Robert Michael','Pallitto','Robert & Kathryn','Martha Luiz','Melendz','Jose & Anna','John Pallitto Chrstina Melenda',NULL,'Rev. James Parsells',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (95,'1990-09-02 04:00:00','John','Alpaugh','Raymond & Lois','Debra','Kachmasky','Peter & Helen','Craig Kachmasky Donna Supock',NULL,'Rev. James Parsells',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (96,'1990-10-07 04:00:00','Austin','Kachek','John & Theodra','Carol Ann','Yenchik','Lawrence & Irene','Kraig Scarbinsky Stephanie Kachek',NULL,'Rev. James Parsells',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (97,'1990-10-21 04:00:00','Mark','Ryan','Anthony & Vera','Linda','Cowell','Richard & John','John Zahodnick Lisa Ryan',NULL,'Rev. James Parsells',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (98,'1992-10-11 04:00:00','Frank','Mattei','Frank & Filippa','Larissa','Kulick','Basil & Barbara','Opeko Kyra Lewis',NULL,'Rev. James Parsells',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (99,'1997-06-06 04:00:00','Patrick J.','Carroll','Mary Ann','Mary B Kelly','Yackovich',NULL,'Deacon Paul Sokol Daria Barsigian',NULL,'Rev. James Parsells',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (100,'1997-06-22 04:00:00','Eric Eugene','Kupersmith','Carl & Judith','Nicole Helen','DeLarato','Nicholas & Jaquelene','Eric Lupen Kristen De Larato',NULL,'Rev. James Parsells',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (101,'2000-02-20 05:00:00','Robert Charles','Erkman','James & Evelyn','Barbara','Lohsen','Floyd & Margaret','Deacon Paul Sokol Kathryn Motoviloff',NULL,'Rev. James Parsells',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (102,'2000-10-08 04:00:00','Todd Alan','Peterson','Donald & Carole','Jill Ann','Filippini','Atopere & Joan','Mark Applegit Teresa Filippini',NULL,'Rev. James Parsells',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (103,'2001-02-11 05:00:00','Kakha','Kalizshrili','Vasil & Klara','Ekaterina','Margiani','Bukhuti & Katusha','N. Murguliani Alexander Lomidze',NULL,'Rev. James Parsells',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (104,'2005-06-12 04:00:00','John','Parsells','James & Daria','Emily Joyce','Straut','David & Donna','Gregory Parsells Anna Straut',NULL,'Bishop Tikhon',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (105,'2005-11-26 05:00:00','James','Holot',NULL,'Natalie','Trushova',NULL,'Daria Barsigian John Zahodnick',NULL,'Rev. James Parsells',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (106,'2006-10-01 04:00:00','Jerome C.','Stone','Jerome & Shirley','Pamela Marie','Oliver','Nicholas & Elenore','Peter Gorbatuk  Patricia Sokol',NULL,'Rev. James Parsells',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (107,'2008-11-02 04:00:00','Timothy','Gorbatuk','Peter & Susan','Rebecca Marie','Boyce','James & Maria','James Nectarios Parsells Catherine Gorbatuk',NULL,'Rev. James Parsells',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (108,'2009-09-20 04:00:00','John','Finnigan','John & Heather','Nino','Kachaveli','Nemo & Neli','John Michael Finnigan Lali Utavashvili',NULL,'Rev. James Parsells',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (109,'2011-07-10 04:00:00','Scott Joseph','Nagele','Robert & Kathleen','Amanda Sarah','Kita','Robert & Stacy','Eric Nagele Katherine Markevich',NULL,'Rev. James Parsells',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (110,'2011-07-17 04:00:00','Christopher Michael','Brooks','Ronald & Carol','Catherine','Gorbatuk','Peter & Susan','Timothy Gorbatuk Rebecca Gorbatuk',NULL,'Rev. James Parsells',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (111,'2015-06-07 04:00:00','Scott Michael','Kloss','Lawrence & Sharon','Catherine Rose','Weissman','Martin & Patricia','Richard Kloss Emily Perryman',NULL,'Rev. Daniel Davirtiendose',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (112,'2015-08-16 04:00:00','Stephen Holland','Varney','Eugene & Ruth','Svetlana','Malenkova','Leonid & Tamara','Alexander Alvarado Irina Staina',NULL,'Rev. James Parsells',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (113,'2017-10-08 04:00:00','George','Hadzitheodorou','John & Helen','Lei','Su','Zhangli & Qingmei',NULL,NULL,'Rev. James Parsells',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (114,'2019-09-29 04:00:00','Steven James','Parlacosta','Denis & Steven','Geena Marie','Gladysiewicz','Mary & Robert','Nicholas Torrisi Kelly Lafferty',NULL,'Rev. James Parsells',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (115,'2021-05-23 04:00:00','Robert Cruz','Rangal','Theresa & Cormin','Rebecca   ','Oliver','Neil & Pamela','Robert McGuire Catilin Chetwyrd',NULL,'Rev. James Parsells',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (116,'2021-05-30 04:00:00','Alexander Richard','Torrisi','Daniel & Maria','Anne Catherine','Burca','Benjamin & Christie','Nicholas Torrisi Kristine Hopkins',NULL,'Rev. James Parsells',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (117,'2023-01-15 05:00:00','Nicholas','Torrisi','Daniel & Maria','Samantha','Dominy','John & Deborah','Alexander Torrisi Margot Coates',NULL,'Rev. James Parsells',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (118,'2023-10-15 04:00:00','Giorgi','Khvadagiazi','Nugzari & Amalia','Salome','Managadze','Valeri & Nina','Daviti Zakredze',NULL,'Rev. Peter Kruvashvilli',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (120,NULL,'Victor','Lindholm','Victor Lamarr','Kristine','Aydzaj','John Olga','Johanna Rydaaj Terry Ash',NULL,'Rev. James Parsells',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (121,NULL,'Stanley','Bozinta','Stanley & Mary','Helen','Gregor','Nicholas','Howard W. Bozinta Jeanette H. Datz',NULL,'Rev. Theodore Labowsky',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (122,NULL,'Paul','Cheresko','Steve & Anna','Cecelia','Kalafor','Alexander & Mary','John Karlowick Gladys Herfurent',NULL,'Rev. Michael Lototsky',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (123,NULL,'Nicholas','Chwat','Steve & Olga','Stefanja','Slisz','Steven & Antonette','Alexander Kolosh',NULL,'Rev. Nicholas Kiryluk',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (124,NULL,'Joseph','Famming','Joseph & Lacricio','Helen','Marchuk ','Michael & Eva',NULL,NULL,NULL,37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (125,NULL,'John','Felice','John & Anna','Mary','Kluchmik','Wasil & Olga','Helen Kralovich John Majur',NULL,'Rev. Nicholas Kiryluk',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (126,NULL,'Charles','Fetchko','Michael & Julia','Eugenia','Lebedz','Nicholas & Mary','Martin Slawetlu Jesse V. Moustamisi',NULL,'Rev. Theodore Labowsky',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (127,NULL,'Harvey George','Fielding','William & Jane','Carol Ann','Mock','Stephen & Mildred',NULL,NULL,NULL,37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (128,NULL,'Anthony  ','Gattones','James & Carmella','Helen','May','Steven & Mary','Leo Carrino Mary Holovach',NULL,'Rev. Nicholas Kiryluk',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (129,NULL,'Edward','Kozura','Peter & Stella','Elizabeth Ann','Richards','Paul & Elizabeth','Joseph Weiss Carol Rasscuello',NULL,'Rev. George Lewis',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (130,NULL,'Joseph P.','Kulina','Peter & Alexandria','Alice','Hartzog','Walter & Hulda','Charles Kulina Helen Hukasovrtz',NULL,'Rev. Nicholas Kiryluk',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (131,NULL,'Emil A. ','Nater','Emil & Carmen','Marion','Felice','John & Mary','Anthony J. Lombardo Joan Felice',NULL,'Rev. George Lewis',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (132,NULL,'John ','Paletelo','Andrew & Sonia','Genevieve','Parzych','Paul & Frances','Alex Poletelo Stella Parzych',NULL,'Rev. Nicholas Kiryluk',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (133,NULL,'Harry W.','Peck','Harry & Katherine','Olga','Kuchary','Andrew & Anna',NULL,NULL,NULL,37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (134,NULL,'Joseph','Peschek','Joseph & Elizabeth','Anne Catherine','Skwarla','Nazor & Mary','John Skwarla William Marali',NULL,'Rev. Nicholas Kiryluk',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (135,NULL,'Steven S.','Piscadlo','Jacob & Anna','Olga','Barnosky','Jacob & Madelina','Joseph Barnosky Frances Zydales',NULL,'Rev. Nicholas Kiryluk',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (136,NULL,'Joseph T.','Pobuta','John & Teresa','Marie','Lisowski','Thomas & Antho',NULL,NULL,'Rev. Michael Lototsky',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (137,NULL,'Michael','Putyrski','Peter & Barbara','Anna','Shvidrik','Paul & Tessie','Nicholas Shvidrik Constantine Putruske',NULL,'Rev. Nicholas Kiryluk',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (138,NULL,'Nicholas','Schridrik','Paul & Tatianna','Margaret','Lenner','Thomas & Mary','John Craig Sophie Craig',NULL,'Rev. Nicholas Kiryluk',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (139,NULL,'Peter','Sibilia','Rocco & Mary','Barbara Ann','Sofko','Michael & Anna',NULL,NULL,NULL,37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (140,NULL,'Alex ','Traska','Wasil & Retren','Mary','Kolorites','Charles & Jesse','Mary Holovach Mike Marchuk',NULL,'Rev. Michael Lototsky',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (141,NULL,'Gerard L. ','Verrelli ','Gerard & Julia','Karen L.','Cherniak','Anthony & Anna','Henry Gilbert ',NULL,'Rev. George Lewis',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (142,NULL,'Joseph','Wilhousky','Joseph & Elena','Mae','Cuppers',NULL,NULL,NULL,NULL,37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (143,'1949-07-30 04:00:00','Daniel','Podobed','Kiprin & Pauline','Helen','Haldins','Roman & Mary','Anna Yalsh John Yalsh',NULL,'Rev. Nicholas Kiryluk',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (144,'1948-10-02 05:00:00','Generoso','Sorice','Salvatore & Frances','Sonia','Lisowski','Thomas & Anna','Alice Lisowski John Lorgordo Jr.',NULL,'Rev. Nicholas Kiryluk',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (145,'1949-02-26 05:00:00','Joseph','Gerhard','Peter & Sara','Elizabeth  ','Cherniak','Anthony & Anna','Carolyn Werntz William Werntz',NULL,'Rev. Nicholas Kiryluk',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (146,'1948-11-19 05:00:00','Joseph J.','Sparatta','Frank & Mary','Olga','Naruta','Alexander & Anna','Anna Naruta Louis Fractartinio',NULL,'Rev. Nicholas Kiryluk',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (147,'1950-02-12 05:00:00','Earl','Percefull','Clarence & Lulu','Mary','Nekorcuk','Alexander & Irene','William Nekorcuk Mary Sheysek',NULL,'Rev. Nicholas Kiryluk',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (148,'1949-08-06 04:00:00','Sylvester ','Hull','Sylverster & Mary','Margaret','Palfy','Andrew & Susan','Margaret Muregot Alex Hull',NULL,'Rev. Nicholas Kiryluk',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (149,'1949-01-01 05:00:00','Boris','Carney','David & Irene','Elizabeth ','Cimpko','Thomas & Anna','Boris Dzula Olga Marchison',NULL,'Rev. Nicholas Kiryluk',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (150,'1949-01-01 05:00:00','Steven','Stutoski','Philip & Palalia','Lydia ','Lubov','John & Helen','Leo Lapotka Marys Maninelli',NULL,'Rev. Nicholas Kiryluk',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (151,'1950-09-16 04:00:00','Joseph','Pirone','Carmon & Katherine','Olga','Makowski','John & Anna','Mary Palazzi Alfred Popa',NULL,'Rev. Nicholas Kiryluk',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (152,'1950-04-22 05:00:00','Alexander ','Shestakoff','Peter & Anna','Antoinette','Vigilante','Antonio & Elizabeth','William Wislosky Michael Shestokoff',NULL,'Rev. Nicholas Kiryluk',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (153,'1950-11-25 05:00:00','Charles','Bush','Wilburn & Donice','Anatasia','Harbor','Sergius & Maria','Barbara Fedornock James J. McClarkey',NULL,'Rev. Nicholas Kiryluk',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (154,NULL,'John T.','Jackowlew','Tikon & Pauline','Emma','Sarkozy','Joseph & Barbara','Erma Tracker Frank V. Golday',NULL,'Rev. Nicholas Kiryluk',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (155,NULL,'Frank','Gregovich','Thomas & Theophila','Helen','Kravolich','John & Mary','Charles Chester Ann Kravolich',NULL,'Rev. Nicholas Kiryluk',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (156,'1951-08-11 04:00:00','Stephen','Susko','Peter & Tekla','Anna','Grenther','Michael & Xenia','Ann B. Lysy Joleu Sriseyk',NULL,'Rev. Nicholas Kiryluk',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (157,NULL,'Kenneth M.','Brong','Monroe & Emma','Jennie','Slidz','Steve & Antoinette','Joseph Weber Jr. Glendora Brong',NULL,'Rev. Nicholas Kiryluk',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (158,'1951-09-01 04:00:00','Steve','Trehubets','Harry & Natalie','Helen','Sudillo','Julian & Christine','Mildred Eugalhardt Peter Tylansky',NULL,'Rev. Nicholas Kiryluk',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (159,NULL,'Peter','Hnatuk','Michael & Helen','Helen','Kulina','Peter & Alexandra','Julie Kulina Alexander Kulina',NULL,'Rev. Nicholas Kiryluk',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (160,NULL,'John','Sopchak','Andrew & Ann','Dorothy','Kucha','John & Ann ','Nicholas Sopchak Mary Swaskola',NULL,'Rev. Nicholas Kiryluk',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (161,NULL,'Carmine','Liscio','Michael & Philineino','Dorothy','Padlo','Lazar & Madeline','Vladimir Padlo Ann Padlo',NULL,'Rev. Nicholas Kiryluk',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (162,NULL,'Philip','Gregor','John & Natalie','Valentina','Olluchyncka','John & Eugenia','Helen Dronsky Walter Sebert',NULL,'Rev. Nicholas Kiryluk',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (163,NULL,'Peter E.','Krivoshik','Enoch & Ann','Elizabeth','Carney','David & Irene','Paul Krivoski Helen Carney',NULL,'Rev. Nicholas Kiryluk',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (164,NULL,'Walter','Gellner','John & Dora','Sonia','Chwat','Tilli','Daniel Syrete Anna Secsuk',NULL,'Rev. Nicholas Kiryluk',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (165,NULL,'Frank','Bongiorno','Frank & Adeline','Joan  ','Magilewsky','Jacob & Pauline','Tomasina Bongiorno Dominic Bongiorno',NULL,'Rev. Nicholas Kiryluk',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (166,NULL,'Joseph ','Andrews','William & Julia','Gladys','Lo Callo','Louis & Isabella','Harry Sovynda Lo Callo',NULL,'Rev. Nicholas Kiryluk',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (167,'1953-06-20 04:00:00','William','Nolan','John & Frances','Ann','Padlo','Lazar & Madeline',NULL,NULL,'Rev. Nicholas Kiryluk',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (168,'1953-02-14 05:00:00','Frank','Chupinka','Mary  ','Betty','Hicks','Frank & Ethyl','Mildred Mock William Slovak',NULL,'Rev. Nicholas Kiryluk',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (169,NULL,'Charles','Kachek','Harry & Mary','Stephanie','Kulina','Peter & Alexandra','Alex Kulina Anna Kachek',NULL,'Rev. Nicholas Kiryluk',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (170,NULL,'John','Krapcho','Martin & Ann','Martha  ','Lopazauski','John & Anna','Paul Krapcho',NULL,'Rev. Nicholas Kiryluk',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (171,'1953-10-31 05:00:00','John','Olennick','Dimitri & Mary','Olga','Peck','Andrew & Anna','John Kucharz June Gutoruski',NULL,'Rev. Nicholas Kiryluk',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (172,NULL,'Nicholas','Lebedz','Nicholas & Mary','Elizabeth','Brolist','Raymond & Beatrice','John Hassel Helen Russo',NULL,'Rev. Nicholas Kiryluk',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (173,'1952-02-14 05:00:00','Michael','Pinarchick','George & Sofie','Clara','Sarkoff','Radion & Pauline','Mary Bozinta Joseph Sobcluriski',NULL,'Rev. Nicholas Kiryluk',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (174,'1953-09-19 04:00:00','Peter','Lorenick','Peter & Helen','Rose  ','Kuliruski','Walter & Pearl','Alfred J. Harcarik Sophi Kuluriski',NULL,'Rev. Nicholas Kiryluk',37);
INSERT INTO `marriage_records` (`id`,`mdate`,`fname_groom`,`lname_groom`,`parentsg`,`fname_bride`,`lname_bride`,`parentsb`,`witness`,`mlicense`,`clergy`,`church_id`) VALUES (210,'2025-06-01 04:00:00','Aleksy','Olovyannikon','','Marisa Marie','Surowiec','','Paul Sokol and Katherine Mantzafos','NYC October 21, 2024 M-2024-21293','Rev. James Parsells',37);

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
  `source` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `template_meta` (`id`,`name`,`source`,`created_at`) VALUES (1,'record_template1','dump-orthodoxmetrics_ch_37-202508101846.sql','2025-08-10 22:54:01');

