-- Migration: Add explorer page UI translations for all supported languages
-- 15 new keys × 4 languages = 60 rows
-- Date: 2026-03-15
-- Idempotent: uses INSERT ... ON DUPLICATE KEY UPDATE

-- ═══════════════════════════════════════
-- Greek (el)
-- ═══════════════════════════════════════

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('back_to_samples', 'el', 'Πίσω στα Δείγματα', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('search_placeholder', 'el', 'Αναζήτηση εγγραφών...', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('all_languages', 'el', 'Όλες οι Γλώσσες', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('all_types', 'el', 'Όλοι οι Τύποι', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('view_table', 'el', 'Πίνακας', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('view_cards', 'el', 'Κάρτες', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('view_timeline', 'el', 'Χρονολόγιο', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('view_analytics', 'el', 'Αναλύσεις', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('lang_english', 'el', 'Αγγλικά', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('lang_greek', 'el', 'Ελληνικά', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('lang_russian', 'el', 'Ρωσικά', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('lang_romanian', 'el', 'Ρουμανικά', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('lang_georgian', 'el', 'Γεωργιανά', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('more_label', 'el', 'ακόμα', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('no_records', 'el', 'Δεν βρέθηκαν εγγραφές', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

-- ═══════════════════════════════════════
-- Russian (ru)
-- ═══════════════════════════════════════

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('back_to_samples', 'ru', 'Назад к Образцам', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('search_placeholder', 'ru', 'Поиск записей...', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('all_languages', 'ru', 'Все языки', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('all_types', 'ru', 'Все типы', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('view_table', 'ru', 'Таблица', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('view_cards', 'ru', 'Карточки', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('view_timeline', 'ru', 'Хронология', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('view_analytics', 'ru', 'Аналитика', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('lang_english', 'ru', 'Английский', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('lang_greek', 'ru', 'Греческий', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('lang_russian', 'ru', 'Русский', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('lang_romanian', 'ru', 'Румынский', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('lang_georgian', 'ru', 'Грузинский', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('more_label', 'ru', 'ещё', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('no_records', 'ru', 'Записи не найдены', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

-- ═══════════════════════════════════════
-- Romanian (ro)
-- ═══════════════════════════════════════

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('back_to_samples', 'ro', 'Înapoi la Exemple', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('search_placeholder', 'ro', 'Caută înregistrări...', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('all_languages', 'ro', 'Toate limbile', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('all_types', 'ro', 'Toate tipurile', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('view_table', 'ro', 'Tabel', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('view_cards', 'ro', 'Carduri', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('view_timeline', 'ro', 'Cronologie', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('view_analytics', 'ro', 'Analize', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('lang_english', 'ro', 'Engleză', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('lang_greek', 'ro', 'Greacă', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('lang_russian', 'ro', 'Rusă', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('lang_romanian', 'ro', 'Română', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('lang_georgian', 'ro', 'Georgiană', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('more_label', 'ro', 'mai mult', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('no_records', 'ro', 'Nu s-au găsit înregistrări', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

-- ═══════════════════════════════════════
-- Georgian (ka)
-- ═══════════════════════════════════════

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('back_to_samples', 'ka', 'ნიმუშებზე დაბრუნება', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('search_placeholder', 'ka', 'ჩანაწერების ძიება...', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('all_languages', 'ka', 'ყველა ენა', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('all_types', 'ka', 'ყველა ტიპი', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('view_table', 'ka', 'ცხრილი', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('view_cards', 'ka', 'ბარათები', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('view_timeline', 'ka', 'ქრონოლოგია', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('view_analytics', 'ka', 'ანალიტიკა', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('lang_english', 'ka', 'ინგლისური', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('lang_greek', 'ka', 'ბერძნული', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('lang_russian', 'ka', 'რუსული', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('lang_romanian', 'ka', 'რუმინული', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('lang_georgian', 'ka', 'ქართული', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('more_label', 'ka', 'კიდევ', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);

INSERT INTO `ui_translations` (`translation_key`, `lang_code`, `translation_text`, `category`)
VALUES ('no_records', 'ka', 'ჩანაწერები ვერ მოიძებნა', 'ui')
ON DUPLICATE KEY UPDATE `translation_text` = VALUES(`translation_text`), `category` = VALUES(`category`);
