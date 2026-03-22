-- Phase 3J: Blog page i18n – el, ru, ro, ka translations
-- 38 keys × 4 languages = 152 rows

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
-- ═══════════════════════════════════════════════════════════════════
-- ─── Greek (el) ─────────────────────────────────────────────────
-- ═══════════════════════════════════════════════════════════════════
-- Hero
('el', 'blog.hero_badge', 'Ιστολόγιο', 'blog'),
('el', 'blog.hero_title', 'Γνώσεις & Ενημερώσεις', 'blog'),
('el', 'blog.hero_subtitle', 'Ιστορίες, οδηγοί και νέα σχετικά με τη διατήρηση της Ορθόδοξης κληρονομιάς μέσω τεχνολογίας', 'blog'),
-- Featured article
('el', 'blog.featured_badge', 'Προτεινόμενο Άρθρο', 'blog'),
('el', 'blog.featured_title', 'Γιατί Κάθε Ορθόδοξη Ενορία Χρειάζεται Ψηφιακά Αρχεία', 'blog'),
('el', 'blog.featured_desc', 'Τα χάρτινα αρχεία είναι εύθραυστα. Φωτιά, πλημμύρα, υγρασία και η φυσική φθορά μπορούν να καταστρέψουν αιώνες ενοριακής ιστορίας σε στιγμές. Σε αυτό το άρθρο, εξερευνούμε γιατί η ψηφιοποίηση των μυστηριακών αρχείων σας δεν είναι απλώς βολική — είναι ουσιαστική για τη διατήρηση.', 'blog'),
('el', 'blog.featured_point1', 'Προστασία από φυσική καταστροφή', 'blog'),
('el', 'blog.featured_point2', 'Άμεση αναζήτηση σε όλα τα αρχεία', 'blog'),
('el', 'blog.featured_point3', 'Ασφαλές αντίγραφο ασφαλείας', 'blog'),
('el', 'blog.featured_point4', 'Πολυγλωσσική προσβασιμότητα', 'blog'),
('el', 'blog.featured_btn', 'Περιήγηση Πλατφόρμας', 'blog'),
-- Recent articles
('el', 'blog.recent_title', 'Πρόσφατα Άρθρα', 'blog'),
('el', 'blog.recent_subtitle', 'Οδηγοί, μελέτες περιπτώσεων και ενημερώσεις από την ομάδα Orthodox Metrics', 'blog'),
('el', 'blog.content_english_only', 'Το περιεχόμενο των άρθρων είναι προς το παρόν διαθέσιμο στα Αγγλικά.', 'blog'),
-- Category badge labels
('el', 'blog.cat_guide', 'Οδηγός', 'blog'),
('el', 'blog.cat_case_study', 'Μελέτη Περίπτωσης', 'blog'),
('el', 'blog.cat_technology', 'Τεχνολογία', 'blog'),
('el', 'blog.cat_features', 'Δυνατότητες', 'blog'),
('el', 'blog.cat_security', 'Ασφάλεια', 'blog'),
('el', 'blog.cat_updates', 'Ενημερώσεις', 'blog'),
-- Browse by topic
('el', 'blog.topics_title', 'Περιήγηση ανά Θέμα', 'blog'),
('el', 'blog.topic1_title', 'Οδηγοί', 'blog'),
('el', 'blog.topic1_desc', 'Βήμα-βήμα εκπαιδευτικά για ψηφιοποίηση και χρήση πλατφόρμας.', 'blog'),
('el', 'blog.topic2_title', 'Μελέτες Περιπτώσεων', 'blog'),
('el', 'blog.topic2_desc', 'Πραγματικές ιστορίες από ενορίες που χρησιμοποιούν το Orthodox Metrics.', 'blog'),
('el', 'blog.topic3_title', 'Τεχνολογία', 'blog'),
('el', 'blog.topic3_desc', 'Εις βάθος ανάλυση OCR, αναζήτησης και διατήρησης δεδομένων.', 'blog'),
('el', 'blog.topic4_title', 'Κοινότητα', 'blog'),
('el', 'blog.topic4_desc', 'Νέα και ενημερώσεις από την ομάδα Orthodox Metrics.', 'blog'),
-- Newsletter
('el', 'blog.newsletter_title', 'Μείνετε Ενημερωμένοι', 'blog'),
('el', 'blog.newsletter_desc', 'Εγγραφείτε στο ενημερωτικό μας δελτίο για τα τελευταία άρθρα, ενημερώσεις λειτουργιών και συμβουλές για τη διαχείριση ενοριακών αρχείων.', 'blog'),
('el', 'blog.newsletter_placeholder', 'Εισάγετε το email σας', 'blog'),
('el', 'blog.newsletter_btn', 'Εγγραφή', 'blog'),
('el', 'blog.newsletter_privacy', 'Σεβόμαστε την ιδιωτικότητά σας. Διαγραφή ανά πάσα στιγμή.', 'blog'),
-- CTA
('el', 'blog.cta_title', 'Έτοιμοι να Διατηρήσετε την Ιστορία της Ενορίας σας;', 'blog'),
('el', 'blog.cta_subtitle', 'Ενωθείτε με ενορίες σε όλη τη χώρα στην ψηφιοποίηση και προστασία των ιερών αρχείων τους', 'blog'),
('el', 'blog.cta_btn_start', 'Ξεκινήστε', 'blog'),
('el', 'blog.cta_btn_samples', 'Δείτε Δείγματα', 'blog'),

-- ═══════════════════════════════════════════════════════════════════
-- ─── Russian (ru) ───────────────────────────────────────────────
-- ═══════════════════════════════════════════════════════════════════
-- Hero
('ru', 'blog.hero_badge', 'Наш Блог', 'blog'),
('ru', 'blog.hero_title', 'Статьи и Обновления', 'blog'),
('ru', 'blog.hero_subtitle', 'Истории, руководства и новости о сохранении православного наследия с помощью технологий', 'blog'),
-- Featured article
('ru', 'blog.featured_badge', 'Избранная Статья', 'blog'),
('ru', 'blog.featured_title', 'Почему Каждому Православному Приходу Нужны Цифровые Записи', 'blog'),
('ru', 'blog.featured_desc', 'Бумажные записи хрупки. Пожар, наводнение, влажность и обычное старение могут уничтожить вековую историю прихода за мгновения. В этой статье мы исследуем, почему оцифровка ваших записей о таинствах — это не просто удобство, а необходимость для сохранения.', 'blog'),
('ru', 'blog.featured_point1', 'Защита от физического повреждения', 'blog'),
('ru', 'blog.featured_point2', 'Мгновенный поиск по всем записям', 'blog'),
('ru', 'blog.featured_point3', 'Надёжное резервное копирование', 'blog'),
('ru', 'blog.featured_point4', 'Многоязычная доступность', 'blog'),
('ru', 'blog.featured_btn', 'Обзор Платформы', 'blog'),
-- Recent articles
('ru', 'blog.recent_title', 'Последние Статьи', 'blog'),
('ru', 'blog.recent_subtitle', 'Руководства, кейсы и обновления от команды Orthodox Metrics', 'blog'),
('ru', 'blog.content_english_only', 'Содержание статей в настоящее время доступно на английском языке.', 'blog'),
-- Category badge labels
('ru', 'blog.cat_guide', 'Руководство', 'blog'),
('ru', 'blog.cat_case_study', 'Кейс', 'blog'),
('ru', 'blog.cat_technology', 'Технология', 'blog'),
('ru', 'blog.cat_features', 'Функции', 'blog'),
('ru', 'blog.cat_security', 'Безопасность', 'blog'),
('ru', 'blog.cat_updates', 'Обновления', 'blog'),
-- Browse by topic
('ru', 'blog.topics_title', 'Просмотр по Темам', 'blog'),
('ru', 'blog.topic1_title', 'Руководства', 'blog'),
('ru', 'blog.topic1_desc', 'Пошаговые инструкции по оцифровке и использованию платформы.', 'blog'),
('ru', 'blog.topic2_title', 'Кейсы', 'blog'),
('ru', 'blog.topic2_desc', 'Реальные истории приходов, использующих Orthodox Metrics.', 'blog'),
('ru', 'blog.topic3_title', 'Технология', 'blog'),
('ru', 'blog.topic3_desc', 'Углублённый анализ OCR, поиска и сохранения данных.', 'blog'),
('ru', 'blog.topic4_title', 'Сообщество', 'blog'),
('ru', 'blog.topic4_desc', 'Новости и обновления от команды Orthodox Metrics.', 'blog'),
-- Newsletter
('ru', 'blog.newsletter_title', 'Будьте в Курсе', 'blog'),
('ru', 'blog.newsletter_desc', 'Подпишитесь на нашу рассылку для получения последних статей, обновлений функций и советов по управлению приходскими записями.', 'blog'),
('ru', 'blog.newsletter_placeholder', 'Введите ваш email', 'blog'),
('ru', 'blog.newsletter_btn', 'Подписаться', 'blog'),
('ru', 'blog.newsletter_privacy', 'Мы уважаем вашу конфиденциальность. Отписаться можно в любое время.', 'blog'),
-- CTA
('ru', 'blog.cta_title', 'Готовы Сохранить Историю Вашего Прихода?', 'blog'),
('ru', 'blog.cta_subtitle', 'Присоединяйтесь к приходам по всей стране в оцифровке и защите священных записей', 'blog'),
('ru', 'blog.cta_btn_start', 'Начать', 'blog'),
('ru', 'blog.cta_btn_samples', 'Посмотреть Образцы', 'blog'),

-- ═══════════════════════════════════════════════════════════════════
-- ─── Romanian (ro) ──────────────────────────────────────────────
-- ═══════════════════════════════════════════════════════════════════
-- Hero
('ro', 'blog.hero_badge', 'Blogul Nostru', 'blog'),
('ro', 'blog.hero_title', 'Perspective & Actualizări', 'blog'),
('ro', 'blog.hero_subtitle', 'Povești, ghiduri și noutăți despre păstrarea moștenirii ortodoxe prin tehnologie', 'blog'),
-- Featured article
('ro', 'blog.featured_badge', 'Articol Recomandat', 'blog'),
('ro', 'blog.featured_title', 'De Ce Fiecare Parohie Ortodoxă Are Nevoie de Registre Digitale', 'blog'),
('ro', 'blog.featured_desc', 'Registrele pe hârtie sunt fragile. Incendiile, inundațiile, umiditatea și simpla trecere a timpului pot distruge secole de istorie parohială în câteva momente. În acest articol, explorăm de ce digitalizarea registrelor sacramentale nu este doar convenabilă — este esențială pentru conservare.', 'blog'),
('ro', 'blog.featured_point1', 'Protecție împotriva deteriorării fizice', 'blog'),
('ro', 'blog.featured_point2', 'Căutare instantanee în toate registrele', 'blog'),
('ro', 'blog.featured_point3', 'Copie de siguranță securizată', 'blog'),
('ro', 'blog.featured_point4', 'Accesibilitate multilingvă', 'blog'),
('ro', 'blog.featured_btn', 'Tur al Platformei', 'blog'),
-- Recent articles
('ro', 'blog.recent_title', 'Articole Recente', 'blog'),
('ro', 'blog.recent_subtitle', 'Ghiduri, studii de caz și actualizări de la echipa Orthodox Metrics', 'blog'),
('ro', 'blog.content_english_only', 'Conținutul articolelor este disponibil momentan în limba engleză.', 'blog'),
-- Category badge labels
('ro', 'blog.cat_guide', 'Ghid', 'blog'),
('ro', 'blog.cat_case_study', 'Studiu de Caz', 'blog'),
('ro', 'blog.cat_technology', 'Tehnologie', 'blog'),
('ro', 'blog.cat_features', 'Funcționalități', 'blog'),
('ro', 'blog.cat_security', 'Securitate', 'blog'),
('ro', 'blog.cat_updates', 'Actualizări', 'blog'),
-- Browse by topic
('ro', 'blog.topics_title', 'Explorare pe Teme', 'blog'),
('ro', 'blog.topic1_title', 'Ghiduri', 'blog'),
('ro', 'blog.topic1_desc', 'Tutoriale pas cu pas pentru digitalizare și utilizarea platformei.', 'blog'),
('ro', 'blog.topic2_title', 'Studii de Caz', 'blog'),
('ro', 'blog.topic2_desc', 'Povești reale de la parohii care folosesc Orthodox Metrics.', 'blog'),
('ro', 'blog.topic3_title', 'Tehnologie', 'blog'),
('ro', 'blog.topic3_desc', 'Analize aprofundate despre OCR, căutare și conservarea datelor.', 'blog'),
('ro', 'blog.topic4_title', 'Comunitate', 'blog'),
('ro', 'blog.topic4_desc', 'Noutăți și actualizări de la echipa Orthodox Metrics.', 'blog'),
-- Newsletter
('ro', 'blog.newsletter_title', 'Rămâneți Informați', 'blog'),
('ro', 'blog.newsletter_desc', 'Abonați-vă la newsletter-ul nostru pentru cele mai recente articole, actualizări de funcționalități și sfaturi pentru gestionarea registrelor parohiale.', 'blog'),
('ro', 'blog.newsletter_placeholder', 'Introduceți emailul', 'blog'),
('ro', 'blog.newsletter_btn', 'Abonare', 'blog'),
('ro', 'blog.newsletter_privacy', 'Respectăm confidențialitatea dumneavoastră. Dezabonare oricând.', 'blog'),
-- CTA
('ro', 'blog.cta_title', 'Pregătiți să Păstrați Istoria Parohiei?', 'blog'),
('ro', 'blog.cta_subtitle', 'Alăturați-vă parohiilor din întreaga țară în digitalizarea și protejarea registrelor sacre', 'blog'),
('ro', 'blog.cta_btn_start', 'Începeți', 'blog'),
('ro', 'blog.cta_btn_samples', 'Vedeți Exemple', 'blog'),

-- ═══════════════════════════════════════════════════════════════════
-- ─── Georgian (ka) ──────────────────────────────────────────────
-- ═══════════════════════════════════════════════════════════════════
-- Hero
('ka', 'blog.hero_badge', 'ჩვენი ბლოგი', 'blog'),
('ka', 'blog.hero_title', 'შეხედულებები და სიახლეები', 'blog'),
('ka', 'blog.hero_subtitle', 'ისტორიები, სახელმძღვანელოები და სიახლეები მართლმადიდებლური მემკვიდრეობის შენარჩუნების შესახებ ტექნოლოგიის მეშვეობით', 'blog'),
-- Featured article
('ka', 'blog.featured_badge', 'რჩეული სტატია', 'blog'),
('ka', 'blog.featured_title', 'რატომ სჭირდება ყველა მართლმადიდებლურ სამრევლოს ციფრული ჩანაწერები', 'blog'),
('ka', 'blog.featured_desc', 'ქაღალდის ჩანაწერები მყიფეა. ხანძარმა, წყალდიდობამ, ტენიანობამ და უბრალო დაძველებამ შეიძლება წამებში გაანადგუროს სამრევლო ისტორიის საუკუნეები. ამ სტატიაში ვიკვლევთ, რატომ არის თქვენი საიდუმლო ჩანაწერების დიგიტალიზაცია არა მხოლოდ მოხერხებული — არამედ აუცილებელი შენარჩუნებისთვის.', 'blog'),
('ka', 'blog.featured_point1', 'ფიზიკური დაზიანებისგან დაცვა', 'blog'),
('ka', 'blog.featured_point2', 'მყისიერი ძიება ყველა ჩანაწერში', 'blog'),
('ka', 'blog.featured_point3', 'უსაფრთხო სარეზერვო ასლი', 'blog'),
('ka', 'blog.featured_point4', 'მრავალენოვანი ხელმისაწვდომობა', 'blog'),
('ka', 'blog.featured_btn', 'პლატფორმის ტური', 'blog'),
-- Recent articles
('ka', 'blog.recent_title', 'ბოლო სტატიები', 'blog'),
('ka', 'blog.recent_subtitle', 'სახელმძღვანელოები, საქმის შესწავლა და სიახლეები Orthodox Metrics-ის გუნდისგან', 'blog'),
('ka', 'blog.content_english_only', 'სტატიების შინაარსი ამჟამად ხელმისაწვდომია ინგლისურ ენაზე.', 'blog'),
-- Category badge labels
('ka', 'blog.cat_guide', 'სახელმძღვანელო', 'blog'),
('ka', 'blog.cat_case_study', 'საქმის შესწავლა', 'blog'),
('ka', 'blog.cat_technology', 'ტექნოლოგია', 'blog'),
('ka', 'blog.cat_features', 'ფუნქციები', 'blog'),
('ka', 'blog.cat_security', 'უსაფრთხოება', 'blog'),
('ka', 'blog.cat_updates', 'განახლებები', 'blog'),
-- Browse by topic
('ka', 'blog.topics_title', 'თემების მიხედვით', 'blog'),
('ka', 'blog.topic1_title', 'სახელმძღვანელოები', 'blog'),
('ka', 'blog.topic1_desc', 'ნაბიჯ-ნაბიჯ ინსტრუქციები დიგიტალიზაციისა და პლატფორმის გამოყენებისთვის.', 'blog'),
('ka', 'blog.topic2_title', 'საქმის შესწავლა', 'blog'),
('ka', 'blog.topic2_desc', 'რეალური ისტორიები სამრევლოებისგან, რომლებიც იყენებენ Orthodox Metrics-ს.', 'blog'),
('ka', 'blog.topic3_title', 'ტექნოლოგია', 'blog'),
('ka', 'blog.topic3_desc', 'OCR-ის, ძიებისა და მონაცემთა შენარჩუნების სიღრმისეული ანალიზი.', 'blog'),
('ka', 'blog.topic4_title', 'საზოგადოება', 'blog'),
('ka', 'blog.topic4_desc', 'სიახლეები და განახლებები Orthodox Metrics-ის გუნდისგან.', 'blog'),
-- Newsletter
('ka', 'blog.newsletter_title', 'იყავით ინფორმირებული', 'blog'),
('ka', 'blog.newsletter_desc', 'გამოიწერეთ ჩვენი საინფორმაციო ბიულეტენი უახლესი სტატიების, ფუნქციების განახლებებისა და სამრევლო ჩანაწერების მართვის რჩევებისთვის.', 'blog'),
('ka', 'blog.newsletter_placeholder', 'შეიყვანეთ თქვენი ელფოსტა', 'blog'),
('ka', 'blog.newsletter_btn', 'გამოწერა', 'blog'),
('ka', 'blog.newsletter_privacy', 'ჩვენ ვპატივობთ თქვენს კონფიდენციალობას. გამოწერის გაუქმება ნებისმიერ დროს.', 'blog'),
-- CTA
('ka', 'blog.cta_title', 'მზად ხართ შეინარჩუნოთ თქვენი სამრევლოს ისტორია?', 'blog'),
('ka', 'blog.cta_subtitle', 'შეუერთდით სამრევლოებს მთელ ქვეყანაში წმინდა ჩანაწერების დიგიტალიზაციასა და დაცვაში', 'blog'),
('ka', 'blog.cta_btn_start', 'დაწყება', 'blog'),
('ka', 'blog.cta_btn_samples', 'ნიმუშების ნახვა', 'blog');
