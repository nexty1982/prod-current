-- Church Provisioning Pipeline Database Schema
-- This handles the automated church provisioning queue and related data

-- Church provision queue table
CREATE TABLE church_provision_queue (
  id INT AUTO_INCREMENT PRIMARY KEY,
  church_id INT NOT NULL,
  status ENUM('pending', 'approved', 'provisioning', 'provisioned', 'failed', 'cancelled') DEFAULT 'pending',
  stage ENUM('submission', 'pending_review', 'approval', 'provision_site', 'test_site', 'create_credentials', 'notify_church', 'completed') DEFAULT 'submission',
  language_preference VARCHAR(5) DEFAULT 'en',
  site_slug VARCHAR(100) UNIQUE,
  domain_name VARCHAR(255),
  admin_email VARCHAR(255),
  admin_password_hash VARCHAR(255),
  test_user_email VARCHAR(255),
  test_user_password_hash VARCHAR(255),
  provision_data JSON,
  error_log TEXT,
  approved_by INT,
  approved_at TIMESTAMP NULL,
  provisioned_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  
  INDEX idx_status (status),
  INDEX idx_stage (stage),
  INDEX idx_church_id (church_id),
  INDEX idx_created_at (created_at)
);

-- Provision stage logs for detailed tracking
CREATE TABLE provision_stage_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  queue_id INT NOT NULL,
  stage ENUM('submission', 'pending_review', 'approval', 'provision_site', 'test_site', 'create_credentials', 'notify_church', 'completed') NOT NULL,
  status ENUM('pending', 'in_progress', 'completed', 'failed', 'skipped') DEFAULT 'pending',
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  duration_seconds INT,
  log_data JSON,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (queue_id) REFERENCES church_provision_queue(id) ON DELETE CASCADE,
  
  INDEX idx_queue_id (queue_id),
  INDEX idx_stage (stage),
  INDEX idx_status (status)
);

-- Church site templates for different languages
CREATE TABLE church_site_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  language_code VARCHAR(5) NOT NULL,
  template_name VARCHAR(100) NOT NULL,
  template_path VARCHAR(500) NOT NULL,
  config_data JSON,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_lang_template (language_code, template_name),
  INDEX idx_language (language_code),
  INDEX idx_active (is_active)
);

-- Provision notification templates
CREATE TABLE provision_notification_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  language_code VARCHAR(5) NOT NULL,
  template_type ENUM('approval_pending', 'provision_started', 'provision_completed', 'provision_failed', 'credentials_sent') NOT NULL,
  subject_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_lang_type (language_code, template_type),
  INDEX idx_language (language_code),
  INDEX idx_type (template_type)
);

-- Add provision tracking to churches table
ALTER TABLE churches 
ADD COLUMN provision_status ENUM('manual', 'pending', 'provisioned', 'failed') DEFAULT 'manual',
ADD COLUMN provision_queue_id INT NULL,
ADD COLUMN site_slug VARCHAR(100) NULL,
ADD COLUMN site_url VARCHAR(500) NULL,
ADD COLUMN provisioned_at TIMESTAMP NULL,
ADD FOREIGN KEY (provision_queue_id) REFERENCES church_provision_queue(id) ON DELETE SET NULL;

-- Insert default site templates
INSERT INTO church_site_templates (language_code, template_name, template_path, config_data) VALUES
('en', 'orthodox_church_standard', '/templates/react-site-en/', '{"theme": "orthodox", "features": ["calendar", "records", "billing"]}'),
('gr', 'orthodox_church_standard', '/templates/react-site-gr/', '{"theme": "orthodox", "features": ["calendar", "records", "billing"]}'),
('ru', 'orthodox_church_standard', '/templates/react-site-ru/', '{"theme": "orthodox", "features": ["calendar", "records", "billing"]}'),
('ro', 'orthodox_church_standard', '/templates/react-site-ro/', '{"theme": "orthodox", "features": ["calendar", "records", "billing"]}');

-- Insert default notification templates
INSERT INTO provision_notification_templates (language_code, template_type, subject_template, body_template) VALUES
-- English templates
('en', 'approval_pending', 'Church Registration Submitted - Pending Review', 
'Dear {{contactName}},\n\nThank you for registering {{churchName}} with OrthodoxMetrics.\n\nYour application is currently under review by our team. You will receive another email once your church has been approved and your dedicated site is ready.\n\nExpected processing time: 24-48 hours\n\nBest regards,\nThe OrthodoxMetrics Team'),

('en', 'provision_completed', 'Your Church Site is Ready!', 
'Dear {{contactName}},\n\nGreat news! Your OrthodoxMetrics instance for {{churchName}} is now live and ready to use.\n\n🔗 Access URL: {{siteUrl}}\n👤 Admin Login: {{adminEmail}}\n🔑 Password: {{adminPassword}}\n\n🧪 Test Account:\nEmail: {{testEmail}}\nPassword: {{testPassword}}\n\nNext Steps:\n1. Log in using your admin credentials\n2. Complete your church profile\n3. Import your first records\n4. Invite your team members\n\nSupport: support@orthodoxmetrics.com\n\nWelcome to OrthodoxMetrics!\nThe OrthodoxMetrics Team'),

-- Greek templates  
('gr', 'approval_pending', 'Η Εγγραφή της Εκκλησίας Υποβλήθηκε - Εκκρεμεί Έλεγχος',
'Αγαπητέ {{contactName}},\n\nΣας ευχαριστούμε που εγγράψατε την {{churchName}} στο OrthodoxMetrics.\n\nΗ αίτησή σας εξετάζεται από την ομάδα μας. Θα λάβετε άλλο email όταν η εκκλησία σας εγκριθεί και ο αποκλειστικός σας ιστότοπος είναι έτοιμος.\n\nΑναμενόμενος χρόνος επεξεργασίας: 24-48 ώρες\n\nΜε εκτίμηση,\nΗ Ομάδα OrthodoxMetrics'),

('gr', 'provision_completed', 'Ο Ιστότοπος της Εκκλησίας σας είναι Έτοιμος!',
'Αγαπητέ {{contactName}},\n\nΜεγάλα νέα! Το OrthodoxMetrics για την {{churchName}} είναι πλέον ζωντανό και έτοιμο για χρήση.\n\n🔗 URL Πρόσβασης: {{siteUrl}}\n👤 Σύνδεση Διαχειριστή: {{adminEmail}}\n🔑 Κωδικός: {{adminPassword}}\n\n🧪 Λογαριασμός Δοκιμών:\nEmail: {{testEmail}}\nΚωδικός: {{testPassword}}\n\nΕπόμενα Βήματα:\n1. Συνδεθείτε με τα διαπιστευτήρια διαχειριστή\n2. Συμπληρώστε το προφίλ της εκκλησίας σας\n3. Εισάγετε τα πρώτα σας αρχεία\n4. Προσκαλέστε τα μέλη της ομάδας σας\n\nΥποστήριξη: support@orthodoxmetrics.com\n\nΚαλώς ήρθατε στο OrthodoxMetrics!\nΗ Ομάδα OrthodoxMetrics'),

-- Russian templates
('ru', 'approval_pending', 'Регистрация Церкви Подана - Ожидает Рассмотрения',
'Дорогой {{contactName}},\n\nСпасибо за регистрацию {{churchName}} в OrthodoxMetrics.\n\nВаша заявка в настоящее время рассматривается нашей командой. Вы получите еще одно письмо, когда ваша церковь будет одобрена и ваш выделенный сайт будет готов.\n\nОжидаемое время обработки: 24-48 часов\n\nС уважением,\nКоманда OrthodoxMetrics'),

('ru', 'provision_completed', 'Сайт Вашей Церкви Готов!',
'Дорогой {{contactName}},\n\nОтличные новости! Ваш экземпляр OrthodoxMetrics для {{churchName}} теперь работает и готов к использованию.\n\n🔗 URL доступа: {{siteUrl}}\n👤 Вход администратора: {{adminEmail}}\n🔑 Пароль: {{adminPassword}}\n\n🧪 Тестовый аккаунт:\nEmail: {{testEmail}}\nПароль: {{testPassword}}\n\nСледующие шаги:\n1. Войдите, используя учетные данные администратора\n2. Заполните профиль вашей церкви\n3. Импортируйте ваши первые записи\n4. Пригласите членов вашей команды\n\nПоддержка: support@orthodoxmetrics.com\n\nДобро пожаловать в OrthodoxMetrics!\nКоманда OrthodoxMetrics'),

-- Romanian templates
('ro', 'approval_pending', 'Înregistrarea Bisericii Trimisă - În Așteptarea Revizuirii',
'Dragă {{contactName}},\n\nVă mulțumim pentru înregistrarea {{churchName}} la OrthodoxMetrics.\n\nCererea dumneavoastră este în prezent în curs de revizuire de către echipa noastră. Veți primi un alt email odată ce biserica dumneavoastră a fost aprobată și site-ul dedicat este gata.\n\nTimp estimat de procesare: 24-48 ore\n\nCu stimă,\nEchipa OrthodoxMetrics'),

('ro', 'provision_completed', 'Site-ul Bisericii Dumneavoastră este Gata!',
'Dragă {{contactName}},\n\nVești minunate! Instanța dumneavoastră OrthodoxMetrics pentru {{churchName}} este acum activă și gata de utilizare.\n\n🔗 URL de Acces: {{siteUrl}}\n👤 Login Administrator: {{adminEmail}}\n🔑 Parolă: {{adminPassword}}\n\n🧪 Cont de Test:\nEmail: {{testEmail}}\nParolă: {{testPassword}}\n\nPașii Următori:\n1. Conectați-vă folosind acreditările de administrator\n2. Completați profilul bisericii dumneavoastră\n3. Importați primele înregistrări\n4. Invitați membrii echipei\n\nSuport: support@orthodoxmetrics.com\n\nBun venit la OrthodoxMetrics!\nEchipa OrthodoxMetrics');
