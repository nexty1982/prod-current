-- Migration: Add hero section and AG Grid pagination translations
-- 13 new keys × 4 languages = 52 rows
-- Date: 2026-03-15
-- Idempotent: uses INSERT ... ON DUPLICATE KEY UPDATE

-- ═══════════════════════════════════════
-- Greek (el)
-- ═══════════════════════════════════════

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('hero_badge_explorer', 'el', 'Εξερεύνηση Δεδομένων', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('hero_title_explorer', 'el', 'Εξερεύνηση Δειγμάτων Εγγραφών', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('hero_subtitle_explorer', 'el', 'Περιήγηση σε δείγματα μυστηριακών εγγραφών σε πολλές γλώσσες με διαδραστικό πίνακα, κάρτες, χρονολόγιο και αναλύσεις', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('grid_page', 'el', 'Σελίδα', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('grid_of', 'el', 'από', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('grid_to', 'el', 'έως', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('grid_first_page', 'el', 'Πρώτη Σελίδα', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('grid_previous_page', 'el', 'Προηγούμενη Σελίδα', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('grid_next_page', 'el', 'Επόμενη Σελίδα', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('grid_last_page', 'el', 'Τελευταία Σελίδα', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('grid_page_size', 'el', 'Μέγεθος Σελίδας:', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('grid_no_rows', 'el', 'Δεν υπάρχουν γραμμές', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('grid_filter_placeholder', 'el', 'Φίλτρο...', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

-- ═══════════════════════════════════════
-- Russian (ru)
-- ═══════════════════════════════════════

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('hero_badge_explorer', 'ru', 'Обзор данных', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('hero_title_explorer', 'ru', 'Обзор образцов записей', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('hero_subtitle_explorer', 'ru', 'Просматривайте образцы церковных записей на разных языках с интерактивной таблицей, карточками, хронологией и аналитикой', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('grid_page', 'ru', 'Страница', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('grid_of', 'ru', 'из', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('grid_to', 'ru', 'до', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('grid_first_page', 'ru', 'Первая страница', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('grid_previous_page', 'ru', 'Предыдущая страница', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('grid_next_page', 'ru', 'Следующая страница', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('grid_last_page', 'ru', 'Последняя страница', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('grid_page_size', 'ru', 'Размер страницы:', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('grid_no_rows', 'ru', 'Нет строк для отображения', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('grid_filter_placeholder', 'ru', 'Фильтр...', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

-- ═══════════════════════════════════════
-- Romanian (ro)
-- ═══════════════════════════════════════

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('hero_badge_explorer', 'ro', 'Explorator de Date', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('hero_title_explorer', 'ro', 'Explorator de Înregistrări', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('hero_subtitle_explorer', 'ro', 'Răsfoiți exemple de înregistrări sacramentale în mai multe limbi cu tabel interactiv, carduri, cronologie și analize', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('grid_page', 'ro', 'Pagina', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('grid_of', 'ro', 'din', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('grid_to', 'ro', 'până la', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('grid_first_page', 'ro', 'Prima Pagină', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('grid_previous_page', 'ro', 'Pagina Anterioară', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('grid_next_page', 'ro', 'Pagina Următoare', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('grid_last_page', 'ro', 'Ultima Pagină', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('grid_page_size', 'ro', 'Dimensiune Pagină:', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('grid_no_rows', 'ro', 'Nu există rânduri', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('grid_filter_placeholder', 'ro', 'Filtru...', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

-- ═══════════════════════════════════════
-- Georgian (ka)
-- ═══════════════════════════════════════

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('hero_badge_explorer', 'ka', 'მონაცემთა მიმოხილვა', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('hero_title_explorer', 'ka', 'ჩანაწერების ნიმუშების მიმოხილვა', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('hero_subtitle_explorer', 'ka', 'დაათვალიერეთ საეკლესიო ჩანაწერების ნიმუშები სხვადასხვა ენაზე ინტერაქტიული ცხრილით, ბარათებით, ქრონოლოგიით და ანალიტიკით', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('grid_page', 'ka', 'გვერდი', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('grid_of', 'ka', '-დან', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('grid_to', 'ka', '-მდე', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('grid_first_page', 'ka', 'პირველი გვერდი', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('grid_previous_page', 'ka', 'წინა გვერდი', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('grid_next_page', 'ka', 'შემდეგი გვერდი', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('grid_last_page', 'ka', 'ბოლო გვერდი', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('grid_page_size', 'ka', 'გვერდის ზომა:', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('grid_no_rows', 'ka', 'მონაცემები არ არის', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('grid_filter_placeholder', 'ka', 'ფილტრი...', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);
