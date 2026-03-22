-- ═══════════════════════════════════════════════════════════════════════
-- Migration: i18n Phase 2 — Nav + Footer + Common shared-component keys
-- Database: orthodoxmetrics_db (platform DB)
-- Date: 2026-03-16
--
-- WHAT THIS DOES:
--   Seeds nav.*, footer.*, and new common.* keys for el/ru/ro/ka
--   English defaults live in backend ENGLISH_DEFAULTS (not in DB)
--
-- SAFE TO RE-RUN: Uses INSERT IGNORE so duplicates are silently skipped.
-- ═══════════════════════════════════════════════════════════════════════

-- ─── common.* keys ────────────────────────────────────────────────

-- common.brand_name (kept as "Orthodox Metrics" in all languages — proper noun)
INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'common.brand_name', 'Orthodox Metrics', 'common'),
('ru', 'common.brand_name', 'Orthodox Metrics', 'common'),
('ro', 'common.brand_name', 'Orthodox Metrics', 'common'),
('ka', 'common.brand_name', 'Orthodox Metrics', 'common');

-- common.sign_in
INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'common.sign_in', 'Σύνδεση', 'common'),
('ru', 'common.sign_in', 'Войти', 'common'),
('ro', 'common.sign_in', 'Autentificare', 'common'),
('ka', 'common.sign_in', 'შესვლა', 'common');

-- common.sign_out
INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'common.sign_out', 'Αποσύνδεση', 'common'),
('ru', 'common.sign_out', 'Выйти', 'common'),
('ro', 'common.sign_out', 'Deconectare', 'common'),
('ka', 'common.sign_out', 'გამოსვლა', 'common');

-- common.church_login
INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'common.church_login', 'Σύνδεση Εκκλησίας', 'common'),
('ru', 'common.church_login', 'Вход для церкви', 'common'),
('ro', 'common.church_login', 'Autentificare Biserică', 'common'),
('ka', 'common.church_login', 'ეკლესიის შესვლა', 'common');

-- common.dark_mode
INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'common.dark_mode', 'Σκοτεινή Λειτουργία', 'common'),
('ru', 'common.dark_mode', 'Тёмная тема', 'common'),
('ro', 'common.dark_mode', 'Mod Întunecat', 'common'),
('ka', 'common.dark_mode', 'მუქი რეჟიმი', 'common');

-- common.light_mode
INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'common.light_mode', 'Φωτεινή Λειτουργία', 'common'),
('ru', 'common.light_mode', 'Светлая тема', 'common'),
('ro', 'common.light_mode', 'Mod Luminos', 'common'),
('ka', 'common.light_mode', 'ნათელი რეჟიმი', 'common');

-- common.language
INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'common.language', 'Γλώσσα', 'common'),
('ru', 'common.language', 'Язык', 'common'),
('ro', 'common.language', 'Limbă', 'common'),
('ka', 'common.language', 'ენა', 'common');

-- ─── nav.* keys ───────────────────────────────────────────────────

-- nav.home
INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'nav.home', 'Αρχική', 'nav'),
('ru', 'nav.home', 'Главная', 'nav'),
('ro', 'nav.home', 'Acasă', 'nav'),
('ka', 'nav.home', 'მთავარი', 'nav');

-- nav.about
INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'nav.about', 'Σχετικά', 'nav'),
('ru', 'nav.about', 'О нас', 'nav'),
('ro', 'nav.about', 'Despre', 'nav'),
('ka', 'nav.about', 'ჩვენს შესახებ', 'nav');

-- nav.tour
INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'nav.tour', 'Περιήγηση', 'nav'),
('ru', 'nav.tour', 'Обзор', 'nav'),
('ro', 'nav.tour', 'Tur', 'nav'),
('ka', 'nav.tour', 'ტური', 'nav');

-- nav.samples
INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'nav.samples', 'Δείγματα', 'nav'),
('ru', 'nav.samples', 'Образцы', 'nav'),
('ro', 'nav.samples', 'Exemple', 'nav'),
('ka', 'nav.samples', 'ნიმუშები', 'nav');

-- nav.pricing
INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'nav.pricing', 'Τιμολόγηση', 'nav'),
('ru', 'nav.pricing', 'Цены', 'nav'),
('ro', 'nav.pricing', 'Prețuri', 'nav'),
('ka', 'nav.pricing', 'ფასები', 'nav');

-- nav.blog
INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'nav.blog', 'Ιστολόγιο', 'nav'),
('ru', 'nav.blog', 'Блог', 'nav'),
('ro', 'nav.blog', 'Blog', 'nav'),
('ka', 'nav.blog', 'ბლოგი', 'nav');

-- nav.contact
INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'nav.contact', 'Επικοινωνία', 'nav'),
('ru', 'nav.contact', 'Контакты', 'nav'),
('ro', 'nav.contact', 'Contact', 'nav'),
('ka', 'nav.contact', 'კონტაქტი', 'nav');

-- ─── footer.* keys ────────────────────────────────────────────────

-- footer.tagline
INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'footer.tagline', 'Διατηρώντας ιερά αρχεία για Ορθόδοξες Χριστιανικές ενορίες.', 'footer'),
('ru', 'footer.tagline', 'Сохранение священных записей для православных христианских приходов.', 'footer'),
('ro', 'footer.tagline', 'Păstrarea registrelor sacre pentru parohiile creștine ortodoxe.', 'footer'),
('ka', 'footer.tagline', 'წმინდა ჩანაწერების შენახვა მართლმადიდებლური ქრისტიანული სამრევლოებისთვის.', 'footer');

-- footer.heading_product
INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'footer.heading_product', 'Προϊόν', 'footer'),
('ru', 'footer.heading_product', 'Продукт', 'footer'),
('ro', 'footer.heading_product', 'Produs', 'footer'),
('ka', 'footer.heading_product', 'პროდუქტი', 'footer');

-- footer.heading_company
INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'footer.heading_company', 'Εταιρεία', 'footer'),
('ru', 'footer.heading_company', 'Компания', 'footer'),
('ro', 'footer.heading_company', 'Companie', 'footer'),
('ka', 'footer.heading_company', 'კომპანია', 'footer');

-- footer.heading_support
INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'footer.heading_support', 'Υποστήριξη', 'footer'),
('ru', 'footer.heading_support', 'Поддержка', 'footer'),
('ro', 'footer.heading_support', 'Suport', 'footer'),
('ka', 'footer.heading_support', 'მხარდაჭერა', 'footer');

-- footer.platform_tour
INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'footer.platform_tour', 'Περιήγηση Πλατφόρμας', 'footer'),
('ru', 'footer.platform_tour', 'Обзор платформы', 'footer'),
('ro', 'footer.platform_tour', 'Tur al Platformei', 'footer'),
('ka', 'footer.platform_tour', 'პლატფორმის ტური', 'footer');

-- footer.sample_records
INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'footer.sample_records', 'Δείγματα Αρχείων', 'footer'),
('ru', 'footer.sample_records', 'Образцы записей', 'footer'),
('ro', 'footer.sample_records', 'Registre Exemplu', 'footer'),
('ka', 'footer.sample_records', 'ნიმუშის ჩანაწერები', 'footer');

-- footer.pricing
INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'footer.pricing', 'Τιμολόγηση', 'footer'),
('ru', 'footer.pricing', 'Цены', 'footer'),
('ro', 'footer.pricing', 'Prețuri', 'footer'),
('ka', 'footer.pricing', 'ფასები', 'footer');

-- footer.about_us
INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'footer.about_us', 'Σχετικά με Εμάς', 'footer'),
('ru', 'footer.about_us', 'О нас', 'footer'),
('ro', 'footer.about_us', 'Despre Noi', 'footer'),
('ka', 'footer.about_us', 'ჩვენს შესახებ', 'footer');

-- footer.blog
INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'footer.blog', 'Ιστολόγιο', 'footer'),
('ru', 'footer.blog', 'Блог', 'footer'),
('ro', 'footer.blog', 'Blog', 'footer'),
('ka', 'footer.blog', 'ბლოგი', 'footer');

-- footer.contact
INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'footer.contact', 'Επικοινωνία', 'footer'),
('ru', 'footer.contact', 'Контакты', 'footer'),
('ro', 'footer.contact', 'Contact', 'footer'),
('ka', 'footer.contact', 'კონტაქტი', 'footer');

-- footer.hours
INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'footer.hours', 'Δευτέρα – Παρασκευή, 9πμ – 5μμ EST', 'footer'),
('ru', 'footer.hours', 'Понедельник – Пятница, 9:00 – 17:00 EST', 'footer'),
('ro', 'footer.hours', 'Luni – Vineri, 9:00 – 17:00 EST', 'footer'),
('ka', 'footer.hours', 'ორშაბათი – პარასკევი, 9:00 – 17:00 EST', 'footer');

-- footer.copyright (with {year} placeholder)
INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'footer.copyright', '© {year} Orthodox Metrics. Με επιφύλαξη παντός δικαιώματος.', 'footer'),
('ru', 'footer.copyright', '© {year} Orthodox Metrics. Все права защищены.', 'footer'),
('ro', 'footer.copyright', '© {year} Orthodox Metrics. Toate drepturile rezervate.', 'footer'),
('ka', 'footer.copyright', '© {year} Orthodox Metrics. ყველა უფლება დაცულია.', 'footer');
