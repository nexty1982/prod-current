-- Seed: UI translations for Greek (el), Russian (ru), Romanian (ro), Georgian (ka)
-- Idempotent: uses INSERT ... ON DUPLICATE KEY UPDATE
-- 17 keys × 4 languages = 68 rows
-- Date: 2026-03-15

-- ═══════════════════════════════════════
-- Greek (el)
-- ═══════════════════════════════════════

-- Column Headers
INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('type', 'el', 'Τύπος', 'column_header')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('name', 'el', 'Όνομα', 'column_header')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('date', 'el', 'Ημερομηνία', 'column_header')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('location', 'el', 'Τοποθεσία', 'column_header')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('clergy', 'el', 'Κληρικός', 'column_header')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('details', 'el', 'Λεπτομέρειες', 'column_header')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('parents', 'el', 'Γονείς', 'column_header')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

-- Record Types
INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('record_baptism', 'el', 'Βάπτισμα', 'record_type')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('record_marriage', 'el', 'Γάμος', 'record_type')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('record_funeral', 'el', 'Κηδεία', 'record_type')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

-- Analytics
INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('analytics_total_records', 'el', 'Σύνολο Εγγραφών', 'analytics')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('analytics_by_record_type', 'el', 'Κατά Τύπο Εγγραφής', 'analytics')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('analytics_by_language', 'el', 'Κατά Γλώσσα', 'analytics')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('analytics_records_by_decade', 'el', 'Εγγραφές ανά Δεκαετία', 'analytics')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('analytics_top_clergy', 'el', 'Κορυφαίοι Κληρικοί', 'analytics')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

-- UI Labels
INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('records_label', 'el', 'εγγραφές', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('page_label', 'el', 'Σελίδα', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

-- ═══════════════════════════════════════
-- Russian (ru)
-- ═══════════════════════════════════════

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('type', 'ru', 'Тип', 'column_header')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('name', 'ru', 'Имя', 'column_header')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('date', 'ru', 'Дата', 'column_header')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('location', 'ru', 'Место', 'column_header')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('clergy', 'ru', 'Священник', 'column_header')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('details', 'ru', 'Детали', 'column_header')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('parents', 'ru', 'Родители', 'column_header')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('record_baptism', 'ru', 'Крещение', 'record_type')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('record_marriage', 'ru', 'Венчание', 'record_type')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('record_funeral', 'ru', 'Отпевание', 'record_type')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('analytics_total_records', 'ru', 'Всего записей', 'analytics')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('analytics_by_record_type', 'ru', 'По типу записи', 'analytics')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('analytics_by_language', 'ru', 'По языку', 'analytics')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('analytics_records_by_decade', 'ru', 'Записи по десятилетиям', 'analytics')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('analytics_top_clergy', 'ru', 'Основные священнослужители', 'analytics')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('records_label', 'ru', 'записей', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('page_label', 'ru', 'Страница', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

-- ═══════════════════════════════════════
-- Romanian (ro)
-- ═══════════════════════════════════════

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('type', 'ro', 'Tip', 'column_header')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('name', 'ro', 'Nume', 'column_header')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('date', 'ro', 'Dată', 'column_header')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('location', 'ro', 'Locație', 'column_header')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('clergy', 'ro', 'Cleric', 'column_header')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('details', 'ro', 'Detalii', 'column_header')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('parents', 'ro', 'Părinți', 'column_header')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('record_baptism', 'ro', 'Botez', 'record_type')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('record_marriage', 'ro', 'Cununie', 'record_type')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('record_funeral', 'ro', 'Înmormântare', 'record_type')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('analytics_total_records', 'ro', 'Total Înregistrări', 'analytics')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('analytics_by_record_type', 'ro', 'După Tipul Înregistrării', 'analytics')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('analytics_by_language', 'ro', 'După Limbă', 'analytics')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('analytics_records_by_decade', 'ro', 'Înregistrări pe Deceniu', 'analytics')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('analytics_top_clergy', 'ro', 'Clerici Principali', 'analytics')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('records_label', 'ro', 'înregistrări', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('page_label', 'ro', 'Pagina', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

-- ═══════════════════════════════════════
-- Georgian (ka)
-- ═══════════════════════════════════════

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('type', 'ka', 'ტიპი', 'column_header')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('name', 'ka', 'სახელი', 'column_header')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('date', 'ka', 'თარიღი', 'column_header')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('location', 'ka', 'ადგილი', 'column_header')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('clergy', 'ka', 'სასულიერო პირი', 'column_header')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('details', 'ka', 'დეტალები', 'column_header')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('parents', 'ka', 'მშობლები', 'column_header')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('record_baptism', 'ka', 'ნათლობა', 'record_type')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('record_marriage', 'ka', 'ქორწინება', 'record_type')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('record_funeral', 'ka', 'დაკრძალვა', 'record_type')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('analytics_total_records', 'ka', 'სულ ჩანაწერები', 'analytics')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('analytics_by_record_type', 'ka', 'ჩანაწერის ტიპის მიხედვით', 'analytics')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('analytics_by_language', 'ka', 'ენის მიხედვით', 'analytics')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('analytics_records_by_decade', 'ka', 'ჩანაწერები ათწლეულების მიხედვით', 'analytics')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('analytics_top_clergy', 'ka', 'მთავარი სასულიერო პირები', 'analytics')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('records_label', 'ka', 'ჩანაწერები', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('page_label', 'ka', 'გვერდი', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);
