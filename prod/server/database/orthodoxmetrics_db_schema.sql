-- Orthodox Metrics Database Schema - Complete Multilingual Support
-- Database: orthodoxmetrics_db
-- Created: July 3, 2025
-- Supports: English, Greek, Russian, Romanian

-- =====================================================
-- CORE SYSTEM TABLES
-- =====================================================

-- Languages table for system-wide language support
DROP TABLE IF EXISTS languages;
CREATE TABLE languages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code CHAR(2) UNIQUE NOT NULL,
    name_native VARCHAR(100) NOT NULL,
    name_english VARCHAR(100) NOT NULL,
    rtl BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert supported languages
INSERT INTO languages (code, name_native, name_english, rtl, is_active) VALUES
('en', 'English', 'English', FALSE, TRUE),
('gr', 'Ελληνικά', 'Greek', FALSE, TRUE),
('ru', 'Русский', 'Russian', FALSE, TRUE),
('ro', 'Română', 'Romanian', FALSE, TRUE);

-- Translation keys table for dynamic multilingual content
DROP TABLE IF EXISTS translation_keys;
CREATE TABLE translation_keys (
    id INT PRIMARY KEY AUTO_INCREMENT,
    key_name VARCHAR(255) UNIQUE NOT NULL,
    category VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Translations table for storing actual translations
DROP TABLE IF EXISTS translations;
CREATE TABLE translations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    key_id INT NOT NULL,
    language_code CHAR(2) NOT NULL,
    translation TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (key_id) REFERENCES translation_keys(id) ON DELETE CASCADE,
    FOREIGN KEY (language_code) REFERENCES languages(code) ON DELETE CASCADE,
    UNIQUE KEY unique_translation (key_id, language_code),
    INDEX idx_translations_lang (language_code),
    INDEX idx_translations_key (key_id)
);

-- =====================================================
-- CHURCH MANAGEMENT TABLES
-- =====================================================

-- Churches/Organizations table with multilingual support
DROP TABLE IF EXISTS churches;
CREATE TABLE churches (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    preferred_language CHAR(2) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    currency CHAR(3) DEFAULT 'USD',
    tax_id VARCHAR(50),
    website VARCHAR(255),
    description_multilang JSON, -- Stores descriptions in multiple languages
    settings JSON, -- Church-specific settings
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (preferred_language) REFERENCES languages(code),
    INDEX idx_churches_country (country),
    INDEX idx_churches_language (preferred_language),
    INDEX idx_churches_active (is_active)
);

-- Church contacts table for multiple contact persons
DROP TABLE IF EXISTS church_contacts;
CREATE TABLE church_contacts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    church_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    title_multilang JSON, -- Title in multiple languages
    email VARCHAR(255),
    phone VARCHAR(50),
    role ENUM('priest', 'deacon', 'administrator', 'treasurer', 'secretary', 'other') DEFAULT 'other',
    is_primary BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE,
    INDEX idx_church_contacts_church (church_id),
    INDEX idx_church_contacts_role (role)
);

-- =====================================================
-- BILLING AND SUBSCRIPTION TABLES
-- =====================================================

-- Billing plans with multilingual support
DROP TABLE IF EXISTS billing_plans;
CREATE TABLE billing_plans (
    id INT PRIMARY KEY AUTO_INCREMENT,
    plan_code VARCHAR(50) UNIQUE NOT NULL,
    name_multilang JSON NOT NULL, -- Plan name in multiple languages
    description_multilang JSON, -- Description in multiple languages
    features_multilang JSON, -- Features list in multiple languages
    price_monthly DECIMAL(10,2) NOT NULL,
    price_quarterly DECIMAL(10,2) NOT NULL,
    price_yearly DECIMAL(10,2) NOT NULL,
    currency CHAR(3) DEFAULT 'USD',
    max_users INT DEFAULT NULL,
    max_records INT DEFAULT NULL,
    max_storage_gb INT DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_billing_plans_active (is_active),
    INDEX idx_billing_plans_code (plan_code)
);

-- Insert sample billing plans with multilingual content
INSERT INTO billing_plans (plan_code, name_multilang, description_multilang, features_multilang, price_monthly, price_quarterly, price_yearly, max_users, max_records) VALUES
('basic', 
 '{"en": "Basic Plan", "gr": "Βασικό Πλάνο", "ru": "Базовый план", "ro": "Planul de bază"}',
 '{"en": "Essential features for small churches", "gr": "Βασικά χαρακτηριστικά για μικρές εκκλησίες", "ru": "Основные функции для небольших церквей", "ro": "Caracteristici esențiale pentru biserici mici"}',
 '{"en": ["Record Management", "Basic Reports", "Email Support"], "gr": ["Διαχείριση Αρχείων", "Βασικές Αναφορές", "Υποστήριξη Email"], "ru": ["Управление записями", "Базовые отчеты", "Email поддержка"], "ro": ["Managementul înregistrărilor", "Rapoarte de bază", "Suport email"]}',
 29.99, 79.99, 299.99, 5, 1000),
('plus', 
 '{"en": "Plus Plan", "gr": "Πλάνο Plus", "ru": "План Plus", "ro": "Planul Plus"}',
 '{"en": "Advanced features for growing churches", "gr": "Προηγμένα χαρακτηριστικά για αναπτυσσόμενες εκκλησίες", "ru": "Расширенные функции для растущих церквей", "ro": "Caracteristici avansate pentru biserici în creștere"}',
 '{"en": ["All Basic Features", "Advanced Reports", "Invoice Generation", "Phone Support"], "gr": ["Όλα τα Βασικά", "Προηγμένες Αναφορές", "Δημιουργία Τιμολογίων", "Τηλεφωνική Υποστήριξη"], "ru": ["Все базовые функции", "Расширенные отчеты", "Создание счетов", "Телефонная поддержка"], "ro": ["Toate caracteristicile de bază", "Rapoarte avansate", "Generarea facturilor", "Suport telefonic"]}',
 59.99, 159.99, 599.99, 15, 5000),
('enterprise', 
 '{"en": "Enterprise Plan", "gr": "Εταιρικό Πλάνο", "ru": "Корпоративный план", "ro": "Planul Enterprise"}',
 '{"en": "Complete solution for large churches and dioceses", "gr": "Πλήρης λύση για μεγάλες εκκλησίες και επισκοπές", "ru": "Полное решение для больших церквей и епархий", "ro": "Soluție completă pentru biserici mari și episcopii"}',
 '{"en": ["All Plus Features", "Multi-Church Management", "Custom Integrations", "Priority Support", "Unlimited Storage"], "gr": ["Όλα τα Plus", "Διαχείριση Πολλών Εκκλησιών", "Προσαρμοσμένες Ενσωματώσεις", "Προτεραιότητα Υποστήριξης", "Απεριόριστος Χώρος"], "ru": ["Все функции Plus", "Управление несколькими церквями", "Пользовательские интеграции", "Приоритетная поддержка", "Безлимитное хранилище"], "ro": ["Toate caracteristicile Plus", "Managementul mai multor biserici", "Integrări personalizate", "Suport prioritar", "Stocare nelimitată"]}',
 99.99, 269.99, 999.99, NULL, NULL);

-- Subscriptions table
DROP TABLE IF EXISTS subscriptions;
CREATE TABLE subscriptions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    church_id INT NOT NULL,
    plan_id INT NOT NULL,
    billing_cycle ENUM('monthly', 'quarterly', 'yearly') NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    renewal_date DATE NOT NULL,
    status ENUM('active', 'suspended', 'cancelled', 'trial', 'expired') DEFAULT 'trial',
    amount DECIMAL(10,2) NOT NULL,
    currency CHAR(3) DEFAULT 'USD',
    discount_percent DECIMAL(5,2) DEFAULT 0.00,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    payment_method VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES billing_plans(id),
    INDEX idx_subscriptions_church (church_id),
    INDEX idx_subscriptions_status (status),
    INDEX idx_subscriptions_renewal (renewal_date)
);

-- =====================================================
-- INVOICE MANAGEMENT TABLES
-- =====================================================

-- Enhanced invoices table with multilingual support
DROP TABLE IF EXISTS invoices;
CREATE TABLE invoices (
    id INT PRIMARY KEY AUTO_INCREMENT,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    church_id INT NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE,
    language CHAR(2) DEFAULT 'en',
    currency CHAR(3) DEFAULT 'USD',
    exchange_rate DECIMAL(10,6) DEFAULT 1.000000,
    subtotal DECIMAL(10,2) DEFAULT 0.00,
    tax_rate DECIMAL(5,2) DEFAULT 0.00,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    discount_percent DECIMAL(5,2) DEFAULT 0.00,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL,
    status ENUM('draft', 'pending', 'sent', 'paid', 'overdue', 'cancelled') DEFAULT 'draft',
    payment_terms_multilang JSON, -- Payment terms in multiple languages
    notes_multilang JSON, -- Notes in multiple languages
    internal_notes TEXT,
    pdf_path VARCHAR(500),
    sent_at TIMESTAMP NULL,
    paid_at TIMESTAMP NULL,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE,
    FOREIGN KEY (language) REFERENCES languages(code),
    INDEX idx_invoices_church (church_id),
    INDEX idx_invoices_status (status),
    INDEX idx_invoices_date (issue_date),
    INDEX idx_invoices_number (invoice_number)
);

-- Invoice items table with multilingual descriptions
DROP TABLE IF EXISTS invoice_items;
CREATE TABLE invoice_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    invoice_id INT NOT NULL,
    item_code VARCHAR(50),
    name_multilang JSON NOT NULL, -- Item name in multiple languages
    description_multilang JSON, -- Description in multiple languages
    category ENUM('service', 'product', 'subscription', 'addon', 'discount', 'tax', 'fee') DEFAULT 'service',
    quantity DECIMAL(10,3) DEFAULT 1.000,
    unit_type ENUM('each', 'hour', 'month', 'year', 'record', 'page', 'gb') DEFAULT 'each',
    unit_price DECIMAL(10,2) NOT NULL,
    discount_percent DECIMAL(5,2) DEFAULT 0.00,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    line_total DECIMAL(10,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 0.00,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    INDEX idx_invoice_items_invoice (invoice_id),
    INDEX idx_invoice_items_category (category)
);

-- Service catalog with full multilingual support
DROP TABLE IF EXISTS service_catalog;
CREATE TABLE service_catalog (
    id INT PRIMARY KEY AUTO_INCREMENT,
    service_code VARCHAR(50) UNIQUE NOT NULL,
    category ENUM('church_services', 'record_processing', 'certificates', 'software_services', 'consulting', 'sacraments', 'other') DEFAULT 'church_services',
    name_multilang JSON NOT NULL, -- Service name in all languages
    description_multilang JSON, -- Description in all languages
    default_price DECIMAL(10,2) NOT NULL,
    currency CHAR(3) DEFAULT 'USD',
    unit_type ENUM('each', 'hour', 'month', 'year', 'record', 'page', 'gb') DEFAULT 'each',
    is_taxable BOOLEAN DEFAULT TRUE,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_interval ENUM('weekly', 'monthly', 'quarterly', 'yearly') NULL,
    requires_approval BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_service_catalog_code (service_code),
    INDEX idx_service_catalog_category (category),
    INDEX idx_service_catalog_active (is_active)
);

-- Insert comprehensive service catalog with multilingual support
INSERT INTO service_catalog (service_code, category, name_multilang, description_multilang, default_price, unit_type, is_taxable) VALUES
-- Church Services / Sacraments
('baptism_ceremony', 'sacraments', 
 '{"en": "Baptism Ceremony", "gr": "Τελετή Βάπτισης", "ru": "Обряд крещения", "ro": "Ceremonia de botez"}',
 '{"en": "Complete baptism ceremony including preparation and documentation", "gr": "Πλήρης τελετή βάπτισης συμπεριλαμβανομένης της προετοιμασίας και τεκμηρίωσης", "ru": "Полная церемония крещения включая подготовку и документацию", "ro": "Ceremonia completă de botez incluzând pregătirea și documentația"}',
 150.00, 'each', FALSE),

('marriage_ceremony', 'sacraments', 
 '{"en": "Marriage Ceremony", "gr": "Τελετή Γάμου", "ru": "Обряд венчания", "ro": "Ceremonia de căsătorie"}',
 '{"en": "Orthodox wedding ceremony with all liturgical requirements", "gr": "Ορθόδοξη γαμήλια τελετή με όλες τις λειτουργικές απαιτήσεις", "ru": "Православная свадебная церемония со всеми литургическими требованиями", "ro": "Ceremonia ortodoxă de nuntă cu toate cerințele liturgice"}',
 300.00, 'each', FALSE),

('funeral_service', 'sacraments', 
 '{"en": "Funeral Service", "gr": "Κηδεία", "ru": "Отпевание", "ro": "Serviciu funerar"}',
 '{"en": "Complete funeral service and memorial", "gr": "Πλήρης κηδεία και μνημόσυνο", "ru": "Полное погребальное служение и поминовение", "ro": "Serviciu funerar complet și memorial"}',
 200.00, 'each', FALSE),

('confession', 'sacraments', 
 '{"en": "Confession", "gr": "Εξομολόγηση", "ru": "Исповедь", "ro": "Spovedanie"}',
 '{"en": "Sacrament of confession and spiritual guidance", "gr": "Μυστήριο της εξομολόγησης και πνευματικής καθοδήγησης", "ru": "Таинство исповеди и духовного наставления", "ro": "Taina spovedaniei și îndrumarea spirituală"}',
 0.00, 'each', FALSE),

-- Record Processing
('baptism_record', 'record_processing', 
 '{"en": "Baptism Record Processing", "gr": "Επεξεργασία Μητρώου Βάπτισης", "ru": "Обработка записей о крещении", "ro": "Procesarea înregistrărilor de botez"}',
 '{"en": "Digital processing and archival of baptism records", "gr": "Ψηφιακή επεξεργασία και αρχειοθέτηση μητρώων βάπτισης", "ru": "Цифровая обработка и архивирование записей о крещении", "ro": "Procesarea digitală și arhivarea înregistrărilor de botez"}',
 25.00, 'record', TRUE),

('marriage_record', 'record_processing', 
 '{"en": "Marriage Record Processing", "gr": "Επεξεργασία Μητρώου Γάμου", "ru": "Обработка записей о браке", "ro": "Procesarea înregistrărilor de căsătorie"}',
 '{"en": "Digital processing and archival of marriage records", "gr": "Ψηφιακή επεξεργασία και αρχειοθέτηση μητρώων γάμου", "ru": "Цифровая обработка и архивирование записей о браке", "ro": "Procesarea digitală și arhivarea înregistrărilor de căsătorie"}',
 25.00, 'record', TRUE),

-- Certificates
('baptism_certificate', 'certificates', 
 '{"en": "Baptism Certificate", "gr": "Πιστοποιητικό Βάπτισης", "ru": "Свидетельство о крещении", "ro": "Certificat de botez"}',
 '{"en": "Official baptism certificate with church seal", "gr": "Επίσημο πιστοποιητικό βάπτισης με σφραγίδα εκκλησίας", "ru": "Официальное свидетельство о крещении с церковной печатью", "ro": "Certificat oficial de botez cu sigiliul bisericii"}',
 15.00, 'each', TRUE),

('marriage_certificate', 'certificates', 
 '{"en": "Marriage Certificate", "gr": "Πιστοποιητικό Γάμου", "ru": "Свидетельство о браке", "ro": "Certificat de căsătorie"}',
 '{"en": "Official marriage certificate with church seal", "gr": "Επίσημο πιστοποιητικό γάμου με σφραγίδα εκκλησίας", "ru": "Официальное свидетельство о браке с церковной печатью", "ro": "Certificat oficial de căsătorie cu sigiliul bisericii"}',
 15.00, 'each', TRUE),

-- Software Services
('monthly_subscription', 'software_services', 
 '{"en": "Monthly Subscription", "gr": "Μηνιαία Συνδρομή", "ru": "Месячная подписка", "ro": "Abonament lunar"}',
 '{"en": "Monthly access to church management software", "gr": "Μηνιαία πρόσβαση στο λογισμικό διαχείρισης εκκλησίας", "ru": "Месячный доступ к программному обеспечению управления церковью", "ro": "Acces lunar la software-ul de management al bisericii"}',
 29.99, 'month', TRUE),

('annual_subscription', 'software_services', 
 '{"en": "Annual Subscription", "gr": "Ετήσια Συνδρομή", "ru": "Годовая подписка", "ro": "Abonament anual"}',
 '{"en": "Annual access to church management software with discount", "gr": "Ετήσια πρόσβαση στο λογισμικό διαχείρισης εκκλησίας με έκπτωση", "ru": "Годовой доступ к программному обеспечению управления церковью со скидкой", "ro": "Acces anual la software-ul de management al bisericii cu reducere"}',
 299.99, 'year', TRUE),

('ocr_processing', 'software_services', 
 '{"en": "OCR Document Processing", "gr": "Επεξεργασία OCR Εγγράφων", "ru": "OCR обработка документов", "ro": "Procesarea OCR a documentelor"}',
 '{"en": "Optical character recognition for document digitization", "gr": "Οπτική αναγνώριση χαρακτήρων για ψηφιοποίηση εγγράφων", "ru": "Оптическое распознавание символов для оцифровки документов", "ro": "Recunoașterea optică a caracterelor pentru digitizarea documentelor"}',
 5.00, 'page', TRUE),

-- Consulting Services
('setup_consultation', 'consulting', 
 '{"en": "System Setup Consultation", "gr": "Συμβουλευτική Εγκατάστασης", "ru": "Консультация по настройке системы", "ro": "Consultanță pentru configurarea sistemului"}',
 '{"en": "Professional consultation for system setup and configuration", "gr": "Επαγγελματική συμβουλευτική για εγκατάσταση και διαμόρφωση συστήματος", "ru": "Профессиональная консультация по установке и настройке системы", "ro": "Consultanță profesională pentru instalarea și configurarea sistemului"}',
 100.00, 'hour', TRUE),

('training_session', 'consulting', 
 '{"en": "Staff Training Session", "gr": "Συνεδρία Εκπαίδευσης Προσωπικού", "ru": "Сессия обучения персонала", "ro": "Sesiune de formare a personalului"}',
 '{"en": "Comprehensive training session for church staff", "gr": "Περιεκτική συνεδρία εκπαίδευσης για το προσωπικό της εκκλησίας", "ru": "Комплексная сессия обучения για церковного персонала", "ro": "Sesiune cuprinzătoare de formare pentru personalul bisericii"}',
 150.00, 'hour', TRUE);

-- =====================================================
-- CHURCH RECORDS TABLES (Multilingual)
-- =====================================================

-- Baptism records with multilingual support
DROP TABLE IF EXISTS baptism_records;
CREATE TABLE baptism_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    church_id INT NOT NULL,
    record_number VARCHAR(50),
    person_name VARCHAR(255) NOT NULL,
    person_name_native VARCHAR(255), -- Name in native script (Greek, Cyrillic, etc.)
    birth_date DATE,
    baptism_date DATE NOT NULL,
    father_name VARCHAR(255),
    mother_name VARCHAR(255),
    godfather_name VARCHAR(255),
    godmother_name VARCHAR(255),
    priest_name VARCHAR(255),
    location_multilang JSON, -- Location in multiple languages
    notes_multilang JSON, -- Notes in multiple languages
    certificate_issued BOOLEAN DEFAULT FALSE,
    certificate_number VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE,
    INDEX idx_baptism_church (church_id),
    INDEX idx_baptism_date (baptism_date),
    INDEX idx_baptism_person (person_name)
);

-- Marriage records with multilingual support
DROP TABLE IF EXISTS marriage_records;
CREATE TABLE marriage_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    church_id INT NOT NULL,
    record_number VARCHAR(50),
    husband_name VARCHAR(255) NOT NULL,
    husband_name_native VARCHAR(255),
    wife_name VARCHAR(255) NOT NULL,
    wife_name_native VARCHAR(255),
    marriage_date DATE NOT NULL,
    witness1_name VARCHAR(255),
    witness2_name VARCHAR(255),
    priest_name VARCHAR(255),
    location_multilang JSON,
    notes_multilang JSON,
    certificate_issued BOOLEAN DEFAULT FALSE,
    certificate_number VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE,
    INDEX idx_marriage_church (church_id),
    INDEX idx_marriage_date (marriage_date),
    INDEX idx_marriage_husband (husband_name),
    INDEX idx_marriage_wife (wife_name)
);

-- Funeral records with multilingual support
DROP TABLE IF EXISTS funeral_records;
CREATE TABLE funeral_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    church_id INT NOT NULL,
    record_number VARCHAR(50),
    person_name VARCHAR(255) NOT NULL,
    person_name_native VARCHAR(255),
    birth_date DATE,
    death_date DATE NOT NULL,
    funeral_date DATE NOT NULL,
    next_of_kin VARCHAR(255),
    priest_name VARCHAR(255),
    location_multilang JSON,
    burial_location_multilang JSON,
    notes_multilang JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE,
    INDEX idx_funeral_church (church_id),
    INDEX idx_funeral_date (funeral_date),
    INDEX idx_funeral_person (person_name)
);

-- =====================================================
-- USER MANAGEMENT TABLES
-- =====================================================

-- Users table with multilingual preferences
DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    preferred_language CHAR(2) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    role ENUM('super_admin', 'admin', 'manager', 'user', 'viewer') DEFAULT 'user',
    church_id INT,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP NULL,
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE SET NULL,
    FOREIGN KEY (preferred_language) REFERENCES languages(code),
    INDEX idx_users_email (email),
    INDEX idx_users_church (church_id),
    INDEX idx_users_role (role)
);

-- User sessions table
DROP TABLE IF EXISTS user_sessions;
CREATE TABLE user_sessions (
    id VARCHAR(128) PRIMARY KEY,
    user_id INT NOT NULL,
    expires TIMESTAMP NOT NULL,
    data TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_sessions_user (user_id),
    INDEX idx_sessions_expires (expires)
);

-- =====================================================
-- SYSTEM CONFIGURATION TABLES
-- =====================================================

-- System settings with multilingual support
DROP TABLE IF EXISTS system_settings;
CREATE TABLE system_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    key_name VARCHAR(255) UNIQUE NOT NULL,
    value_multilang JSON,
    data_type ENUM('string', 'number', 'boolean', 'json', 'multilang_text') DEFAULT 'string',
    category VARCHAR(100),
    description_multilang JSON,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_settings_category (category),
    INDEX idx_settings_public (is_public)
);

-- Insert default system settings
INSERT INTO system_settings (key_name, value_multilang, data_type, category, description_multilang, is_public) VALUES
('site_name', '{"en": "Orthodox Metrics", "gr": "Orthodox Metrics", "ru": "Orthodox Metrics", "ro": "Orthodox Metrics"}', 'multilang_text', 'general', '{"en": "Name of the application", "gr": "Όνομα της εφαρμογής", "ru": "Название приложения", "ro": "Numele aplicației"}', TRUE),
('default_currency', '{"value": "USD"}', 'string', 'billing', '{"en": "Default currency for billing", "gr": "Προεπιλεγμένο νόμισμα για χρέωση", "ru": "Валюта по умолчанию для выставления счетов", "ro": "Moneda implicită pentru facturare"}', FALSE),
('tax_rate', '{"value": 0}', 'number', 'billing', '{"en": "Default tax rate percentage", "gr": "Προεπιλεγμένο ποσοστό φόρου", "ru": "Процентная ставка налога по умолчанию", "ro": "Rata implicită a taxei în procente"}', FALSE);

-- =====================================================
-- AUDIT AND LOGGING TABLES
-- =====================================================

-- Activity log for tracking changes
DROP TABLE IF EXISTS activity_log;
CREATE TABLE activity_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    church_id INT,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id INT,
    changes JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE SET NULL,
    INDEX idx_activity_user (user_id),
    INDEX idx_activity_church (church_id),
    INDEX idx_activity_entity (entity_type, entity_id),
    INDEX idx_activity_date (created_at)
);

-- =====================================================
-- INDEXES AND PERFORMANCE OPTIMIZATIONS
-- =====================================================

-- Additional composite indexes for common queries
CREATE INDEX idx_invoices_church_status ON invoices(church_id, status);
CREATE INDEX idx_invoices_church_date ON invoices(church_id, issue_date);
CREATE INDEX idx_subscriptions_church_status ON subscriptions(church_id, status);

-- =====================================================
-- VIEWS FOR EASY MULTILINGUAL ACCESS
-- =====================================================

-- View for service catalog with current language
DROP VIEW IF EXISTS service_catalog_view;
CREATE VIEW service_catalog_view AS
SELECT 
    sc.id,
    sc.service_code,
    sc.category,
    sc.name_multilang,
    sc.description_multilang,
    sc.default_price,
    sc.currency,
    sc.unit_type,
    sc.is_taxable,
    sc.is_active,
    sc.sort_order
FROM service_catalog sc
WHERE sc.is_active = TRUE
ORDER BY sc.sort_order, sc.service_code;

-- View for active billing plans
DROP VIEW IF EXISTS billing_plans_view;
CREATE VIEW billing_plans_view AS
SELECT 
    bp.id,
    bp.plan_code,
    bp.name_multilang,
    bp.description_multilang,
    bp.features_multilang,
    bp.price_monthly,
    bp.price_quarterly,
    bp.price_yearly,
    bp.currency,
    bp.max_users,
    bp.max_records,
    bp.is_active
FROM billing_plans bp
WHERE bp.is_active = TRUE
ORDER BY bp.sort_order, bp.price_monthly;

-- =====================================================
-- INITIAL SAMPLE DATA
-- =====================================================

-- Insert sample church
INSERT INTO churches (name, email, address, city, country, preferred_language, currency) VALUES
('St. Nicholas Orthodox Cathedral', 'admin@stnicholascathedral.org', '123 Orthodox Way', 'New York', 'United States', 'en', 'USD'),
('Αγίου Νικολάου Ορθόδοξος Καθεδρικός', 'admin@agiosnikolaos.gr', 'Λεωφόρος Ορθοδοξίας 456', 'Αθήνα', 'Greece', 'gr', 'EUR'),
('Собор Святого Николая', 'admin@nikolay-sobor.ru', 'Православная улица 789', 'Москва', 'Russia', 'ru', 'RUB');

-- Insert sample user
INSERT INTO users (email, password_hash, first_name, last_name, preferred_language, role, church_id) VALUES
('admin@orthodoxmetrics.com', '$2a$10$example_hash', 'System', 'Administrator', 'en', 'super_admin', NULL);

-- Insert common translation keys
INSERT INTO translation_keys (key_name, category, description) VALUES
('common.save', 'common', 'Save button text'),
('common.cancel', 'common', 'Cancel button text'),
('common.delete', 'common', 'Delete button text'),
('common.edit', 'common', 'Edit button text'),
('invoice.title', 'invoices', 'Invoice page title'),
('invoice.new', 'invoices', 'New invoice button'),
('church.name', 'churches', 'Church name label'),
('church.email', 'churches', 'Church email label');

-- Insert translations for common keys
INSERT INTO translations (key_id, language_code, translation) VALUES
(1, 'en', 'Save'),
(1, 'gr', 'Αποθήκευση'),
(1, 'ru', 'Сохранить'),
(1, 'ro', 'Salvează'),
(2, 'en', 'Cancel'),
(2, 'gr', 'Ακύρωση'),
(2, 'ru', 'Отмена'),
(2, 'ro', 'Anulează'),
(3, 'en', 'Delete'),
(3, 'gr', 'Διαγραφή'),
(3, 'ru', 'Удалить'),
(3, 'ro', 'Șterge'),
(4, 'en', 'Edit'),
(4, 'gr', 'Επεξεργασία'),
(4, 'ru', 'Редактировать'),
(4, 'ro', 'Editează'),
(5, 'en', 'Invoice Management'),
(5, 'gr', 'Διαχείριση Τιμολογίων'),
(5, 'ru', 'Управление счетами'),
(5, 'ro', 'Managementul facturilor'),
(6, 'en', 'New Invoice'),
(6, 'gr', 'Νέο Τιμολόγιο'),
(6, 'ru', 'Новый счет'),
(6, 'ro', 'Factură nouă'),
(7, 'en', 'Church Name'),
(7, 'gr', 'Όνομα Εκκλησίας'),
(7, 'ru', 'Название церкви'),
(7, 'ro', 'Numele bisericii'),
(8, 'en', 'Church Email'),
(8, 'gr', 'Email Εκκλησίας'),
(8, 'ru', 'Email церкви'),
(8, 'ro', 'Email-ul bisericii');

-- =====================================================
-- STORED PROCEDURES FOR MULTILINGUAL CONTENT
-- =====================================================

DELIMITER //

-- Procedure to get translation by key and language
CREATE PROCEDURE GetTranslation(
    IN p_key_name VARCHAR(255),
    IN p_language_code CHAR(2),
    OUT p_translation TEXT
)
BEGIN
    SELECT t.translation INTO p_translation
    FROM translation_keys tk
    JOIN translations t ON tk.id = t.key_id
    WHERE tk.key_name = p_key_name 
      AND t.language_code = p_language_code;
    
    -- If translation not found, try English as fallback
    IF p_translation IS NULL THEN
        SELECT t.translation INTO p_translation
        FROM translation_keys tk
        JOIN translations t ON tk.id = t.key_id
        WHERE tk.key_name = p_key_name 
          AND t.language_code = 'en';
    END IF;
END //

-- Function to extract multilingual value from JSON
CREATE FUNCTION GetMultilingualValue(
    p_json_data JSON,
    p_language_code CHAR(2)
) RETURNS TEXT
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE result TEXT;
    
    -- Try to get value for requested language
    SET result = JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$.', p_language_code)));
    
    -- If not found, try English as fallback
    IF result IS NULL OR result = 'null' THEN
        SET result = JSON_UNQUOTE(JSON_EXTRACT(p_json_data, '$.en'));
    END IF;
    
    -- If still not found, try the first available language
    IF result IS NULL OR result = 'null' THEN
        SET result = JSON_UNQUOTE(JSON_EXTRACT(p_json_data, '$[0]'));
    END IF;
    
    RETURN result;
END //

DELIMITER ;

-- =====================================================
-- SECURITY AND CONSTRAINTS
-- =====================================================

-- Create database user for the application
-- Note: Execute these commands as root/admin user
-- CREATE USER 'orthodoxmetrics_user'@'localhost' IDENTIFIED BY 'SecureOCMPassword2025!';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON orthodoxmetrics_db.* TO 'orthodoxmetrics_user'@'localhost';
-- FLUSH PRIVILEGES;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

SELECT 'Orthodox Metrics Database Schema Created Successfully!' as 'Status',
       'Multilingual support enabled for: English, Greek, Russian, Romanian' as 'Languages',
       'Ready for production deployment' as 'Deployment_Status';
