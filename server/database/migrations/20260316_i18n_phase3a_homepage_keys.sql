-- ═══════════════════════════════════════════════════════════════════════
-- Migration: i18n Phase 3A — Homepage translation keys
-- Database: orthodoxmetrics_db (platform DB)
-- Date: 2026-03-16
--
-- Seeds home.* keys for el/ru/ro/ka (55 keys × 4 languages = 220 rows)
-- English defaults live in backend ENGLISH_DEFAULTS (not in DB)
-- SAFE TO RE-RUN: Uses INSERT IGNORE.
-- ═══════════════════════════════════════════════════════════════════════

-- ─── Hero ─────────────────────────────────────────────────────────

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.hero_badge', 'Εμπιστοσύνη Ορθόδοξων Ενοριών Παγκοσμίως', 'home'),
('ru', 'home.hero_badge', 'Доверие православных приходов по всему миру', 'home'),
('ro', 'home.hero_badge', 'Încrederea Parohiilor Ortodoxe din Întreaga Lume', 'home'),
('ka', 'home.hero_badge', 'მართლმადიდებელი სამრევლოების ნდობა მთელ მსოფლიოში', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.hero_title', 'Διαχείριση Ιερών Αρχείων για τη Σύγχρονη Ενορία', 'home'),
('ru', 'home.hero_title', 'Управление священными записями для современного прихода', 'home'),
('ro', 'home.hero_title', 'Gestionarea Registrelor Sacre pentru Parohia Modernă', 'home'),
('ka', 'home.hero_title', 'წმინდა ჩანაწერების მართვა თანამედროვე სამრევლოსთვის', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.hero_subtitle', 'Μετατρέψτε αιώνες χειρόγραφων μυστηριακών αρχείων σε ασφαλή, αναζητήσιμα ψηφιακά αρχεία. Διατηρήστε την πνευματική σας κληρονομιά αγκαλιάζοντας τη σύγχρονη τεχνολογία.', 'home'),
('ru', 'home.hero_subtitle', 'Преобразуйте века рукописных записей о таинствах в безопасные цифровые архивы с возможностью поиска. Сохраните духовное наследие, используя современные технологии.', 'home'),
('ro', 'home.hero_subtitle', 'Transformați secole de registre sacramentale scrise de mână în arhive digitale sigure și ușor de căutat. Păstrați patrimoniul spiritual adoptând tehnologia modernă.', 'home'),
('ka', 'home.hero_subtitle', 'საუკუნეების ხელნაწერი საეკლესიო ჩანაწერები გადააქციეთ უსაფრთხო, მოძიებად ციფრულ არქივებად. შეინარჩუნეთ სულიერი მემკვიდრეობა თანამედროვე ტექნოლოგიების გამოყენებით.', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.hero_cta_tour', 'Περιήγηση', 'home'),
('ru', 'home.hero_cta_tour', 'Обзор платформы', 'home'),
('ro', 'home.hero_cta_tour', 'Tur al Platformei', 'home'),
('ka', 'home.hero_cta_tour', 'პლატფორმის ტური', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.hero_cta_demo', 'Αίτημα Demo', 'home'),
('ru', 'home.hero_cta_demo', 'Запросить демо', 'home'),
('ro', 'home.hero_cta_demo', 'Solicită Demo', 'home'),
('ka', 'home.hero_cta_demo', 'დემო მოთხოვნა', 'home');

-- ─── Intro ────────────────────────────────────────────────────────

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.intro_badge', 'Τι Κάνουμε', 'home'),
('ru', 'home.intro_badge', 'Что мы делаем', 'home'),
('ro', 'home.intro_badge', 'Ce Facem', 'home'),
('ka', 'home.intro_badge', 'რას ვაკეთებთ', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.intro_title', 'Ψηφιοποίηση. Διατήρηση. Σύνδεση.', 'home'),
('ru', 'home.intro_title', 'Оцифровка. Сохранение. Связь.', 'home'),
('ro', 'home.intro_title', 'Digitalizare. Conservare. Conectare.', 'home'),
('ka', 'home.intro_title', 'ციფრულიზაცია. შენახვა. დაკავშირება.', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.intro_subtitle', 'Το Orthodox Metrics μεταμορφώνει τον τρόπο που οι ενορίες διαχειρίζονται τα πιο ιερά τους έγγραφα', 'home'),
('ru', 'home.intro_subtitle', 'Orthodox Metrics меняет подход приходов к управлению самыми священными документами', 'home'),
('ro', 'home.intro_subtitle', 'Orthodox Metrics transformă modul în care parohiile gestionează cele mai sfinte documente', 'home'),
('ka', 'home.intro_subtitle', 'Orthodox Metrics ცვლის სამრევლოების მიდგომას მათი ყველაზე წმინდა დოკუმენტების მართვისადმი', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.intro_card1_title', 'Ψηφιακή Διατήρηση', 'home'),
('ru', 'home.intro_card1_title', 'Цифровое сохранение', 'home'),
('ro', 'home.intro_card1_title', 'Conservare Digitală', 'home'),
('ka', 'home.intro_card1_title', 'ციფრული შენახვა', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.intro_card1_desc', 'Μετατρέψτε εύθραυστα χειρόγραφα αρχεία βαπτίσεων, γάμων και κηδειών σε μόνιμα ψηφιακά αρχεία που αντέχουν στο πέρασμα του χρόνου.', 'home'),
('ru', 'home.intro_card1_desc', 'Преобразуйте хрупкие рукописные записи о крещениях, венчаниях и отпеваниях в постоянные цифровые архивы, которые выдержат испытание временем.', 'home'),
('ro', 'home.intro_card1_desc', 'Convertiți registrele fragile scrise de mână ale botezurilor, căsătoriilor și înmormântărilor în arhive digitale permanente care rezistă timpului.', 'home'),
('ka', 'home.intro_card1_desc', 'მყიფე ხელნაწერი ჩანაწერები ნათლობების, ქორწინებებისა და დაკრძალვების შესახებ გადააქციეთ მუდმივ ციფრულ არქივებად, რომლებიც დროის გამოცდას გაუძლებს.', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.intro_card2_title', 'Άμεση Πρόσβαση', 'home'),
('ru', 'home.intro_card2_title', 'Мгновенный доступ', 'home'),
('ro', 'home.intro_card2_title', 'Acces Instant', 'home'),
('ka', 'home.intro_card2_title', 'მყისიერი წვდომა', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.intro_card2_desc', 'Αναζητήστε ολόκληρο το ιστορικό της ενορίας σας σε δευτερόλεπτα. Βρείτε αρχεία κατά όνομα, ημερομηνία, τοποθεσία ή οποιοδήποτε προσαρμοσμένο πεδίο.', 'home'),
('ru', 'home.intro_card2_desc', 'Ищите по всей истории прихода за секунды. Находите записи по имени, дате, месту или любому пользовательскому полю.', 'home'),
('ro', 'home.intro_card2_desc', 'Căutați în întreaga istorie a parohiei în câteva secunde. Găsiți registre după nume, dată, locație sau orice câmp personalizat.', 'home'),
('ka', 'home.intro_card2_desc', 'მოიძიეთ სამრევლოს მთელი ისტორია წამებში. იპოვეთ ჩანაწერები სახელით, თარიღით, ადგილმდებარეობით ან ნებისმიერი ველით.', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.intro_card3_title', 'Ασφάλεια Τραπεζικού Επιπέδου', 'home'),
('ru', 'home.intro_card3_title', 'Банковский уровень защиты', 'home'),
('ro', 'home.intro_card3_title', 'Securitate de Nivel Bancar', 'home'),
('ka', 'home.intro_card3_title', 'საბანკო დონის უსაფრთხოება', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.intro_card3_desc', 'Τα ιερά σας αρχεία είναι κρυπτογραφημένα και προστατευμένα με ασφάλεια εταιρικού επιπέδου, εξασφαλίζοντας απόρρητο και συμμόρφωση.', 'home'),
('ru', 'home.intro_card3_desc', 'Ваши священные записи зашифрованы и защищены системой безопасности корпоративного уровня, обеспечивая конфиденциальность и соответствие нормам.', 'home'),
('ro', 'home.intro_card3_desc', 'Registrele dumneavoastră sacre sunt criptate și protejate cu securitate de nivel enterprise, asigurând confidențialitate și conformitate.', 'home'),
('ka', 'home.intro_card3_desc', 'თქვენი წმინდა ჩანაწერები დაშიფრული და დაცულია კორპორატიული დონის უსაფრთხოებით, რაც უზრუნველყოფს კონფიდენციალურობასა და შესაბამისობას.', 'home');

-- ─── Steps ────────────────────────────────────────────────────────

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.steps_badge', 'Απλή Διαδικασία', 'home'),
('ru', 'home.steps_badge', 'Простой процесс', 'home'),
('ro', 'home.steps_badge', 'Proces Simplu', 'home'),
('ka', 'home.steps_badge', 'მარტივი პროცესი', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.steps_title', 'Από Χαρτί σε Ψηφιακό σε Τρία Βήματα', 'home'),
('ru', 'home.steps_title', 'От бумаги к цифровому за три шага', 'home'),
('ro', 'home.steps_title', 'De la Hârtie la Digital în Trei Pași', 'home'),
('ka', 'home.steps_title', 'ქაღალდიდან ციფრულამდე სამ ნაბიჯში', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.steps_step1_title', 'Ψηφιοποίηση Αρχείων', 'home'),
('ru', 'home.steps_step1_title', 'Оцифровка записей', 'home'),
('ro', 'home.steps_step1_title', 'Digitalizare Registre', 'home'),
('ka', 'home.steps_step1_title', 'ჩანაწერების ციფრულიზაცია', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.steps_step1_desc', 'Σαρώστε ή φωτογραφίστε τα υπάρχοντα αρχεία σας. Η ομάδα μας μπορεί να βοηθήσει με μαζική ψηφιοποίηση εάν χρειαστεί.', 'home'),
('ru', 'home.steps_step1_desc', 'Отсканируйте или сфотографируйте существующие записи. Наша команда поможет с массовой оцифровкой при необходимости.', 'home'),
('ro', 'home.steps_step1_desc', 'Scanați sau fotografiați registrele existente. Echipa noastră vă poate ajuta cu digitalizarea în masă dacă este necesar.', 'home'),
('ka', 'home.steps_step1_desc', 'დაასკანერეთ ან გადაუღეთ ფოტო არსებულ ჩანაწერებს. ჩვენი გუნდი დაგეხმარებათ მასიურ ციფრულიზაციაში საჭიროების შემთხვევაში.', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.steps_step2_title', 'Δομήστε τα Δεδομένα σας', 'home'),
('ru', 'home.steps_step2_title', 'Структурируйте данные', 'home'),
('ro', 'home.steps_step2_title', 'Structurați Datele', 'home'),
('ka', 'home.steps_step2_title', 'მონაცემების სტრუქტურირება', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.steps_step2_desc', 'Εισαγάγετε λεπτομέρειες μυστηρίων σε οργανωμένες βάσεις δεδομένων με προσαρμοσμένα πεδία για τις ανάγκες της ενορίας σας.', 'home'),
('ru', 'home.steps_step2_desc', 'Вводите данные о таинствах в организованные базы данных с настраиваемыми полями для нужд вашего прихода.', 'home'),
('ro', 'home.steps_step2_desc', 'Introduceți detaliile sacramentale în baze de date organizate cu câmpuri personalizate pentru nevoile parohiei.', 'home'),
('ka', 'home.steps_step2_desc', 'შეიყვანეთ საეკლესიო დეტალები ორგანიზებულ მონაცემთა ბაზებში თქვენი სამრევლოს საჭიროებებისთვის მორგებული ველებით.', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.steps_step3_title', 'Αναζήτηση & Ανάλυση', 'home'),
('ru', 'home.steps_step3_title', 'Поиск и аналитика', 'home'),
('ro', 'home.steps_step3_title', 'Căutare și Analiză', 'home'),
('ka', 'home.steps_step3_title', 'ძიება და ანალიტიკა', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.steps_step3_desc', 'Αποκτήστε πρόσβαση σε αρχεία αμέσως, δημιουργήστε αναφορές και αποκτήστε γνώσεις για το ιστορικό της ενορίας σας.', 'home'),
('ru', 'home.steps_step3_desc', 'Мгновенный доступ к записям, создание отчётов и аналитика истории вашего прихода.', 'home'),
('ro', 'home.steps_step3_desc', 'Accesați registrele instantaneu, generați rapoarte și obțineți informații despre istoria parohiei.', 'home'),
('ka', 'home.steps_step3_desc', 'მიიღეთ წვდომა ჩანაწერებზე მყისიერად, შექმენით ანგარიშები და მიიღეთ ინფორმაცია სამრევლოს ისტორიის შესახებ.', 'home');

-- ─── Features ─────────────────────────────────────────────────────

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.features_badge', 'Χαρακτηριστικά', 'home'),
('ru', 'home.features_badge', 'Возможности', 'home'),
('ro', 'home.features_badge', 'Funcționalități', 'home'),
('ka', 'home.features_badge', 'ფუნქციები', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.features_title', 'Σχεδιασμένο για Ορθόδοξες Ενορίες', 'home'),
('ru', 'home.features_title', 'Создано для православных приходов', 'home'),
('ro', 'home.features_title', 'Construit pentru Parohii Ortodoxe', 'home'),
('ka', 'home.features_title', 'შექმნილი მართლმადიდებელი სამრევლოებისთვის', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.features_feat1_title', 'Πολύγλωσση Υποστήριξη', 'home'),
('ru', 'home.features_feat1_title', 'Многоязычная поддержка', 'home'),
('ro', 'home.features_feat1_title', 'Suport Multilingv', 'home'),
('ka', 'home.features_feat1_title', 'მრავალენოვანი მხარდაჭერა', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.features_feat1_desc', 'Πλήρης υποστήριξη για Ελληνικά, Ρωσικά, Ρουμανικά, Γεωργιανά και Αγγλικά αρχεία.', 'home'),
('ru', 'home.features_feat1_desc', 'Полная поддержка записей на греческом, русском, румынском, грузинском и английском языках.', 'home'),
('ro', 'home.features_feat1_desc', 'Suport complet pentru registre în greacă, rusă, română, georgiană și engleză.', 'home'),
('ka', 'home.features_feat1_desc', 'სრული მხარდაჭერა ბერძნული, რუსული, რუმინული, ქართული და ინგლისური ჩანაწერებისთვის.', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.features_feat2_title', 'Ημερολογιακή Ενημερότητα', 'home'),
('ru', 'home.features_feat2_title', 'Учёт календаря', 'home'),
('ro', 'home.features_feat2_title', 'Conștient de Calendar', 'home'),
('ka', 'home.features_feat2_title', 'კალენდარის გათვალისწინება', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.features_feat2_desc', 'Υποστηρίζει τόσο το Παλαιό όσο και το Νέο Ημερολόγιο με λειτουργικά χρωματικά θέματα.', 'home'),
('ru', 'home.features_feat2_desc', 'Поддержка старого и нового стилей календаря с литургическими цветовыми темами.', 'home'),
('ro', 'home.features_feat2_desc', 'Suport pentru ambele tradiții calendaristice, veche și nouă, cu teme liturgice colorate.', 'home'),
('ka', 'home.features_feat2_desc', 'ძველი და ახალი კალენდრის ტრადიციების მხარდაჭერა ლიტურგიკული ფერის თემებით.', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.features_feat3_title', 'Αναλύσεις & Αναφορές', 'home'),
('ru', 'home.features_feat3_title', 'Аналитика и отчёты', 'home'),
('ro', 'home.features_feat3_title', 'Analize și Rapoarte', 'home'),
('ka', 'home.features_feat3_title', 'ანალიტიკა და ანგარიშები', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.features_feat3_desc', 'Δημιουργήστε πληροφορίες για μυστηριακές τάσεις, ανάπτυξη ενορίας και ιστορικά μοτίβα.', 'home'),
('ru', 'home.features_feat3_desc', 'Получайте аналитику о тенденциях таинств, росте прихода и исторических закономерностях.', 'home'),
('ro', 'home.features_feat3_desc', 'Generați informații despre tendințele sacramentale, creșterea parohiei și tiparele istorice.', 'home'),
('ka', 'home.features_feat3_desc', 'მიიღეთ ინფორმაცია საეკლესიო ტენდენციების, სამრევლოს ზრდისა და ისტორიული ნიმუშების შესახებ.', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.features_feat4_title', 'Πρόσβαση βάσει Ρόλου', 'home'),
('ru', 'home.features_feat4_title', 'Ролевой доступ', 'home'),
('ro', 'home.features_feat4_title', 'Acces Bazat pe Roluri', 'home'),
('ka', 'home.features_feat4_title', 'როლზე დაფუძნებული წვდომა', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.features_feat4_desc', 'Ελέγξτε ποιος μπορεί να προβάλει, να επεξεργαστεί ή να διαχειριστεί διαφορετικούς τύπους αρχείων.', 'home'),
('ru', 'home.features_feat4_desc', 'Контролируйте, кто может просматривать, редактировать или управлять различными типами записей.', 'home'),
('ro', 'home.features_feat4_desc', 'Controlați cine poate vizualiza, edita sau gestiona diferite tipuri de registre.', 'home'),
('ka', 'home.features_feat4_desc', 'გააკონტროლეთ, ვის შეუძლია ჩანაწერების სხვადასხვა ტიპის ნახვა, რედაქტირება ან მართვა.', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.features_feat5_title', 'Όλα τα Μυστήρια', 'home'),
('ru', 'home.features_feat5_title', 'Все таинства', 'home'),
('ro', 'home.features_feat5_title', 'Toate Sacramentele', 'home'),
('ka', 'home.features_feat5_title', 'ყველა საიდუმლო', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.features_feat5_desc', 'Βαπτίσεις, χρίσματα, γάμοι, κηδείες και προσαρμοσμένοι τύποι αρχείων.', 'home'),
('ru', 'home.features_feat5_desc', 'Крещения, миропомазания, венчания, отпевания и пользовательские типы записей.', 'home'),
('ro', 'home.features_feat5_desc', 'Botezuri, mirungeri, căsătorii, înmormântări și tipuri personalizate de registre.', 'home'),
('ka', 'home.features_feat5_desc', 'ნათლობები, მირონცხებები, ქორწინებები, დაკრძალვები და მორგებული ტიპის ჩანაწერები.', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.features_feat6_title', 'Σύνθετη Αναζήτηση', 'home'),
('ru', 'home.features_feat6_title', 'Расширенный поиск', 'home'),
('ro', 'home.features_feat6_title', 'Căutare Avansată', 'home'),
('ka', 'home.features_feat6_title', 'გაფართოებული ძიება', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.features_feat6_desc', 'Βρείτε οποιοδήποτε αρχείο χρησιμοποιώντας ονόματα, ημερομηνίες, τοποθεσίες ή προσαρμοσμένα πεδία.', 'home'),
('ru', 'home.features_feat6_desc', 'Находите любую запись по именам, датам, местам или пользовательским полям.', 'home'),
('ro', 'home.features_feat6_desc', 'Găsiți orice registru folosind nume, date, locații sau câmpuri personalizate.', 'home'),
('ka', 'home.features_feat6_desc', 'იპოვეთ ნებისმიერი ჩანაწერი სახელების, თარიღების, ადგილმდებარეობების ან მორგებული ველების გამოყენებით.', 'home');

-- ─── Records ──────────────────────────────────────────────────────

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.records_title', 'Όλα τα Ιερά Αρχεία σας, Μία Πλατφόρμα', 'home'),
('ru', 'home.records_title', 'Все ваши священные записи — одна платформа', 'home'),
('ro', 'home.records_title', 'Toate Registrele Sacre, O Singură Platformă', 'home'),
('ka', 'home.records_title', 'ყველა წმინდა ჩანაწერი ერთ პლატფორმაზე', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.records_subtitle', 'Διαχειριστείτε κάθε τύπο μυστηριακού αρχείου που διατηρεί η ενορία σας', 'home'),
('ru', 'home.records_subtitle', 'Управляйте каждым типом записей о таинствах вашего прихода', 'home'),
('ro', 'home.records_subtitle', 'Gestionați fiecare tip de registru sacramental al parohiei', 'home'),
('ka', 'home.records_subtitle', 'მართეთ თქვენი სამრევლოს საეკლესიო ჩანაწერის ყველა ტიპი', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.records_type1_name', 'Βαπτίσεις', 'home'),
('ru', 'home.records_type1_name', 'Крещения', 'home'),
('ro', 'home.records_type1_name', 'Botezuri', 'home'),
('ka', 'home.records_type1_name', 'ნათლობები', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.records_type1_detail', 'Παρακολούθηση νονών, αναδόχων, ιερέων', 'home'),
('ru', 'home.records_type1_detail', 'Крёстные, восприемники, священники', 'home'),
('ro', 'home.records_type1_detail', 'Urmărire nași, sponsori, preoți', 'home'),
('ka', 'home.records_type1_detail', 'ნათლიების, მხარდამჭერების, მღვდლების აღრიცხვა', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.records_type2_name', 'Γάμοι', 'home'),
('ru', 'home.records_type2_name', 'Венчания', 'home'),
('ro', 'home.records_type2_name', 'Căsătorii', 'home'),
('ka', 'home.records_type2_name', 'ქორწინებები', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.records_type2_detail', 'Μάρτυρες, ημερομηνίες, τοποθεσίες', 'home'),
('ru', 'home.records_type2_detail', 'Свидетели, даты, места', 'home'),
('ro', 'home.records_type2_detail', 'Martori, date, locații', 'home'),
('ka', 'home.records_type2_detail', 'მოწმეები, თარიღები, ადგილები', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.records_type3_name', 'Κηδείες', 'home'),
('ru', 'home.records_type3_name', 'Отпевания', 'home'),
('ro', 'home.records_type3_name', 'Înmormântări', 'home'),
('ka', 'home.records_type3_name', 'დაკრძალვები', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.records_type3_detail', 'Μνημόσυνα, τόποι ταφής', 'home'),
('ru', 'home.records_type3_detail', 'Поминальные службы, места захоронения', 'home'),
('ro', 'home.records_type3_detail', 'Slujbe memoriale, locuri de înmormântare', 'home'),
('ka', 'home.records_type3_detail', 'მემორიალური მსახურებები, დაკრძალვის ადგილები', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.records_type4_name', 'Προσαρμοσμένα Αρχεία', 'home'),
('ru', 'home.records_type4_name', 'Пользовательские записи', 'home'),
('ro', 'home.records_type4_name', 'Registre Personalizate', 'home'),
('ka', 'home.records_type4_name', 'მორგებული ჩანაწერები', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.records_type4_detail', 'Δημιουργήστε τους δικούς σας τύπους αρχείων', 'home'),
('ru', 'home.records_type4_detail', 'Создавайте собственные типы записей', 'home'),
('ro', 'home.records_type4_detail', 'Creați propriile tipuri de registre', 'home'),
('ka', 'home.records_type4_detail', 'შექმენით საკუთარი ტიპის ჩანაწერები', 'home');

-- ─── Why ──────────────────────────────────────────────────────────

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.why_badge', 'Γιατί Orthodox Metrics', 'home'),
('ru', 'home.why_badge', 'Почему Orthodox Metrics', 'home'),
('ro', 'home.why_badge', 'De Ce Orthodox Metrics', 'home'),
('ka', 'home.why_badge', 'რატომ Orthodox Metrics', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.why_title', 'Σχεδιασμένο με Γνώμονα την Ορθόδοξη Παράδοση', 'home'),
('ru', 'home.why_title', 'Создано с учётом православной традиции', 'home'),
('ro', 'home.why_title', 'Proiectat cu Tradiția Ortodoxă în Minte', 'home'),
('ka', 'home.why_title', 'შექმნილი მართლმადიდებლური ტრადიციის გათვალისწინებით', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.why_desc', 'Σε αντίθεση με γενικά συστήματα διαχείρισης αρχείων, το Orthodox Metrics κατασκευάστηκε ειδικά για Ορθόδοξες Χριστιανικές ενορίες, σεβόμενο τις μοναδικές ανάγκες της πίστης μας.', 'home'),
('ru', 'home.why_desc', 'В отличие от универсальных систем управления записями, Orthodox Metrics создан специально для православных христианских приходов с учётом уникальных потребностей нашей веры.', 'home'),
('ro', 'home.why_desc', 'Spre deosebire de sistemele generice de gestionare a registrelor, Orthodox Metrics a fost construit special pentru parohiile creștine ortodoxe, respectând nevoile unice ale tradiției noastre.', 'home'),
('ka', 'home.why_desc', 'ჩანაწერების მართვის ზოგადი სისტემებისგან განსხვავებით, Orthodox Metrics სპეციალურად შეიქმნა მართლმადიდებელი ქრისტიანული სამრევლოებისთვის, ჩვენი რწმენის უნიკალური საჭიროებების პატივისცემით.', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.why_item1', 'Ακολουθεί τις κατευθυντήριες γραμμές του OCA για τήρηση αρχείων', 'home'),
('ru', 'home.why_item1', 'Соответствует рекомендациям ПЦА по ведению записей', 'home'),
('ro', 'home.why_item1', 'Respectă ghidurile OCA pentru păstrarea registrelor', 'home'),
('ka', 'home.why_item1', 'შეესაბამება OCA-ს ჩანაწერების წარმოების სახელმძღვანელოს', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.why_item2', 'Σέβεται τις παραδόσεις του λειτουργικού ημερολογίου', 'home'),
('ru', 'home.why_item2', 'Уважает традиции литургического календаря', 'home'),
('ro', 'home.why_item2', 'Respectă tradițiile calendarului liturgic', 'home'),
('ka', 'home.why_item2', 'პატივს სცემს ლიტურგიკული კალენდრის ტრადიციებს', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.why_item3', 'Πολύγλωσση υποστήριξη για ποικίλες κοινότητες', 'home'),
('ru', 'home.why_item3', 'Многоязычная поддержка для разнообразных общин', 'home'),
('ro', 'home.why_item3', 'Suport multilingv pentru comunități diverse', 'home'),
('ka', 'home.why_item3', 'მრავალენოვანი მხარდაჭერა მრავალფეროვანი თემებისთვის', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.why_item4', 'Ασφαλές, ιδιωτικό και συμμορφωμένο με τους κανονισμούς', 'home'),
('ru', 'home.why_item4', 'Безопасно, конфиденциально и соответствует нормативным требованиям', 'home'),
('ro', 'home.why_item4', 'Sigur, privat și conform reglementărilor', 'home'),
('ka', 'home.why_item4', 'უსაფრთხო, კონფიდენციალური და რეგულაციებთან შესაბამისი', 'home');

-- Stats (numbers stay identical across languages)
INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.why_stat1_number', '500+', 'home'),
('ru', 'home.why_stat1_number', '500+', 'home'),
('ro', 'home.why_stat1_number', '500+', 'home'),
('ka', 'home.why_stat1_number', '500+', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.why_stat1_label', 'Ενορίες χρησιμοποιούν το Orthodox Metrics', 'home'),
('ru', 'home.why_stat1_label', 'Приходов используют Orthodox Metrics', 'home'),
('ro', 'home.why_stat1_label', 'Parohii folosesc Orthodox Metrics', 'home'),
('ka', 'home.why_stat1_label', 'სამრევლო იყენებს Orthodox Metrics-ს', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.why_stat2_number', '1M+', 'home'),
('ru', 'home.why_stat2_number', '1M+', 'home'),
('ro', 'home.why_stat2_number', '1M+', 'home'),
('ka', 'home.why_stat2_number', '1M+', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.why_stat2_label', 'Αρχεία ψηφιοποιημένα και διατηρημένα', 'home'),
('ru', 'home.why_stat2_label', 'Записей оцифровано и сохранено', 'home'),
('ro', 'home.why_stat2_label', 'Registre digitalizate și conservate', 'home'),
('ka', 'home.why_stat2_label', 'ჩანაწერი ციფრულიზებული და შენახული', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.why_stat3_number', '15+', 'home'),
('ru', 'home.why_stat3_number', '15+', 'home'),
('ro', 'home.why_stat3_number', '15+', 'home'),
('ka', 'home.why_stat3_number', '15+', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.why_stat3_label', 'Χώρες παγκοσμίως', 'home'),
('ru', 'home.why_stat3_label', 'Стран по всему миру', 'home'),
('ro', 'home.why_stat3_label', 'Țări din întreaga lume', 'home'),
('ka', 'home.why_stat3_label', 'ქვეყანა მთელ მსოფლიოში', 'home');

-- ─── CTA ──────────────────────────────────────────────────────────

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.cta_title', 'Έτοιμοι να Διατηρήσετε την Ιστορία της Ενορίας σας;', 'home'),
('ru', 'home.cta_title', 'Готовы сохранить историю вашего прихода?', 'home'),
('ro', 'home.cta_title', 'Gata să Păstrați Istoria Parohiei?', 'home'),
('ka', 'home.cta_title', 'მზად ხართ შეინარჩუნოთ სამრევლოს ისტორია?', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.cta_subtitle', 'Ενταχθείτε σε εκατοντάδες Ορθόδοξες ενορίες που ήδη προστατεύουν τα ιερά τους αρχεία', 'home'),
('ru', 'home.cta_subtitle', 'Присоединяйтесь к сотням православных приходов, уже защищающих свои священные записи', 'home'),
('ro', 'home.cta_subtitle', 'Alăturați-vă sutelor de parohii ortodoxe care își protejează deja registrele sacre', 'home'),
('ka', 'home.cta_subtitle', 'შეუერთდით ასობით მართლმადიდებელ სამრევლოს, რომლებიც უკვე იცავენ წმინდა ჩანაწერებს', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.cta_get_started', 'Ξεκινήστε Σήμερα', 'home'),
('ru', 'home.cta_get_started', 'Начать сейчас', 'home'),
('ro', 'home.cta_get_started', 'Începeți Astăzi', 'home'),
('ka', 'home.cta_get_started', 'დაიწყეთ დღეს', 'home');

INSERT IGNORE INTO ui_translations (lang_code, translation_key, translation_text, namespace) VALUES
('el', 'home.cta_view_pricing', 'Τιμολόγηση', 'home'),
('ru', 'home.cta_view_pricing', 'Цены', 'home'),
('ro', 'home.cta_view_pricing', 'Prețuri', 'home'),
('ka', 'home.cta_view_pricing', 'ფასები', 'home');
