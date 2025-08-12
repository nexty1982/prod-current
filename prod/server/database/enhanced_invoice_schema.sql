-- Enhanced Invoice Items Schema for Advanced Invoice Management
-- Created: July 3, 2025

-- Enhanced invoice items table with more detailed item management
DROP TABLE IF EXISTS invoice_items_enhanced;
CREATE TABLE invoice_items_enhanced (
    id INT PRIMARY KEY AUTO_INCREMENT,
    invoice_id INT NOT NULL,
    item_code VARCHAR(50), -- SKU or service code
    name VARCHAR(255) NOT NULL, -- Item/service name
    description TEXT, -- Detailed description
    description_key VARCHAR(100), -- For translation lookup
    category ENUM('service', 'product', 'subscription', 'addon', 'discount', 'tax', 'fee') DEFAULT 'service',
    quantity DECIMAL(10,3) DEFAULT 1.000, -- Support fractional quantities
    unit_price DECIMAL(10,2) NOT NULL,
    line_total DECIMAL(10,2) NOT NULL,
    discount_percent DECIMAL(5,2) DEFAULT 0.00,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    tax_rate DECIMAL(5,2) DEFAULT 0.00,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    INDEX idx_invoice_items_invoice_id (invoice_id),
    INDEX idx_invoice_items_category (category)
);

-- Service catalog table for predefined services
CREATE TABLE IF NOT EXISTS service_catalog (
    id INT PRIMARY KEY AUTO_INCREMENT,
    service_code VARCHAR(50) UNIQUE NOT NULL,
    category ENUM('church_services', 'record_processing', 'certificates', 'software_services', 'consulting', 'other') DEFAULT 'church_services',
    name_en VARCHAR(255) NOT NULL,
    name_gr VARCHAR(255),
    name_ru VARCHAR(255),
    name_ro VARCHAR(255),
    description_en TEXT,
    description_gr TEXT,
    description_ru TEXT,
    description_ro TEXT,
    default_price DECIMAL(10,2) NOT NULL,
    unit_type ENUM('each', 'hour', 'month', 'year', 'record', 'page') DEFAULT 'each',
    is_taxable BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_service_catalog_code (service_code),
    INDEX idx_service_catalog_category (category)
);

-- Insert sample services into the catalog
INSERT INTO service_catalog (service_code, category, name_en, name_gr, name_ru, name_ro, description_en, description_gr, description_ru, description_ro, default_price, unit_type) VALUES
-- Church Services
('baptism_ceremony', 'church_services', 'Baptism Ceremony', 'Τελετή Βάπτισης', 'Обряд крещения', 'Ceremonia de botez', 'Complete baptism ceremony including preparation and documentation', 'Πλήρης τελετή βάπτισης συμπεριλαμβανομένης της προετοιμασίας και τεκμηρίωσης', 'Полная церемония крещения включая подготовку и документацию', 'Ceremonia completă de botez incluzând pregătirea și documentația', 150.00, 'each'),
('marriage_ceremony', 'church_services', 'Marriage Ceremony', 'Τελετή Γάμου', 'Обряд венчания', 'Ceremonia de căsătorie', 'Orthodox wedding ceremony with all liturgical requirements', 'Ορθόδοξη γαμήλια τελετή με όλες τις λειτουργικές απαιτήσεις', 'Православная свадебная церемония со всеми литургическими требованиями', 'Ceremonia ortodoxă de nuntă cu toate cerințele liturgice', 300.00, 'each'),
('funeral_service', 'church_services', 'Funeral Service', 'Κηδεία', 'Отпевание', 'Serviciu funerar', 'Complete funeral service and memorial', 'Πλήρης κηδεία και μνημόσυνο', 'Полное погребальное служение и поминовение', 'Serviciu funerar complet și memorial', 200.00, 'each'),

-- Record Processing
('baptism_record', 'record_processing', 'Baptism Record Processing', 'Επεξεργασία Μητρώου Βάπτισης', 'Обработка записей о крещении', 'Procesarea înregistrărilor de botez', 'Digital processing and archival of baptism records', 'Ψηφιακή επεξεργασία και αρχειοθέτηση μητρώων βάπτισης', 'Цифровая обработка и архивирование записей о крещении', 'Procesarea digitală și arhivarea înregistrărilor de botez', 25.00, 'record'),
('marriage_record', 'record_processing', 'Marriage Record Processing', 'Επεξεργασία Μητρώου Γάμου', 'Обработка записей о браке', 'Procesarea înregistrărilor de căsătorie', 'Digital processing and archival of marriage records', 'Ψηφιακή επεξεργασία και αρχειοθέτηση μητρώων γάμου', 'Цифровая обработка и архивирование записей о браке', 'Procesarea digitală și arhivarea înregistrărilor de căsătorie', 25.00, 'record'),
('funeral_record', 'record_processing', 'Funeral Record Processing', 'Επεξεργασία Μητρώου Κηδείας', 'Обработка записей о похоронах', 'Procesarea înregistrărilor de înmormântare', 'Digital processing and archival of funeral records', 'Ψηφιακή επεξεργασία και αρχειοθέτηση μητρώων κηδείας', 'Цифровая обработка и архивирование записей о похоронах', 'Procesarea digitală și arhivarea înregistrărilor de înmormântare', 25.00, 'record'),

-- Certificates
('baptism_certificate', 'certificates', 'Baptism Certificate', 'Πιστοποιητικό Βάπτισης', 'Свидетельство о крещении', 'Certificat de botez', 'Official baptism certificate with church seal', 'Επίσημο πιστοποιητικό βάπτισης με σφραγίδα εκκλησίας', 'Официальное свидетельство о крещении с церковной печатью', 'Certificat oficial de botez cu sigiliul bisericii', 15.00, 'each'),
('marriage_certificate', 'certificates', 'Marriage Certificate', 'Πιστοποιητικό Γάμου', 'Свидетельство о браке', 'Certificat de căsătorie', 'Official marriage certificate with church seal', 'Επίσημο πιστοποιητικό γάμου με σφραγίδα εκκλησίας', 'Официальное свидетельство о браке с церковной печатью', 'Certificat oficial de căsătorie cu sigiliul bisericii', 15.00, 'each'),

-- Software Services
('monthly_subscription', 'software_services', 'Monthly Subscription', 'Μηνιαία Συνδρομή', 'Месячная подписка', 'Abonament lunar', 'Monthly access to church management software', 'Μηνιαία πρόσβαση στο λογισμικό διαχείρισης εκκλησίας', 'Месячный доступ к программному обеспечению управления церковью', 'Acces lunar la software-ul de management al bisericii', 29.99, 'month'),
('annual_subscription', 'software_services', 'Annual Subscription', 'Ετήσια Συνδρομή', 'Годовая подписка', 'Abonament anual', 'Annual access to church management software with discount', 'Ετήσια πρόσβαση στο λογισμικό διαχείρισης εκκλησίας με έκπτωση', 'Годовой доступ к программному обеспечению управления церковью со скидкой', 'Acces anual la software-ul de management al bisericii cu reducere', 299.99, 'year'),
('ocr_processing', 'software_services', 'OCR Document Processing', 'Επεξεργασία OCR Εγγράφων', 'OCR обработка документов', 'Procesarea OCR a documentelor', 'Optical character recognition for document digitization', 'Οπτική αναγνώριση χαρακτήρων για ψηφιοποίηση εγγράφων', 'Оптическое распознавание символов для оцифровки документов', 'Recunoașterea optică a caracterelor pentru digitizarea documentelor', 5.00, 'page'),

-- Consulting
('setup_consultation', 'consulting', 'System Setup Consultation', 'Συμβουλευτική Εγκατάστασης', 'Консультация по настройке системы', 'Consultanță pentru configurarea sistemului', 'Professional consultation for system setup and configuration', 'Επαγγελματική συμβουλευτική για εγκατάσταση και διαμόρφωση συστήματος', 'Профессиональная консультация по установке и настройке системы', 'Consultanță profesională pentru instalarea și configurarea sistemului', 100.00, 'hour'),
('training_session', 'consulting', 'Staff Training Session', 'Συνεδρία Εκπαίδευσης Προσωπικού', 'Сессия обучения персонала', 'Sesiune de formare a personalului', 'Comprehensive training session for church staff', 'Περιεκτική συνεδρία εκπαίδευσης για το προσωπικό της εκκλησίας', 'Комплексная сессия обучения для церковного персонала', 'Sesiune cuprinzătoare de formare pentru personalul bisericii', 150.00, 'hour');

-- Invoice templates table for custom templates
CREATE TABLE IF NOT EXISTS invoice_templates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    template_type ENUM('standard', 'church_specific', 'custom') DEFAULT 'standard',
    language ENUM('en', 'gr', 'ru', 'ro') DEFAULT 'en',
    header_html TEXT,
    footer_html TEXT,
    css_styles TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default invoice template
INSERT INTO invoice_templates (name, description, template_type, language, header_html, footer_html, css_styles) VALUES
('Standard Orthodox Invoice', 'Default invoice template for Orthodox churches', 'standard', 'en',
'<div class="header"><h1>{{church_name}}</h1><p>{{church_address}}</p></div>',
'<div class="footer"><p>{{thank_you_message}}</p><p>{{payment_terms}}</p></div>',
'body { font-family: Arial, sans-serif; } .header { text-align: center; margin-bottom: 30px; } .footer { margin-top: 30px; border-top: 1px solid #ccc; padding-top: 15px; }');
