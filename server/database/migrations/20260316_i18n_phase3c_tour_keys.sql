-- Phase 3C: Tour page translations for el, ru, ro, ka
-- 49 keys × 4 languages = 196 rows
-- Idempotent: uses INSERT IGNORE

INSERT IGNORE INTO ui_translations (lang_code, namespace, translation_key, translation_text) VALUES
-- ═══════════════════════════════════════════════════════════════
-- GREEK (el)
-- ═══════════════════════════════════════════════════════════════

-- Hero
('el', 'tour', 'tour.hero_badge', 'Περιήγηση Πλατφόρμας'),
('el', 'tour', 'tour.hero_title', 'Δείτε Πώς Λειτουργεί το Orthodox Metrics'),
('el', 'tour', 'tour.hero_subtitle', 'Μια βήμα-προς-βήμα περιήγηση στον τρόπο που βοηθάμε τις ενορίες να ψηφιοποιήσουν και να διαχειριστούν τα ιερά τους αρχεία'),

-- Step 1
('el', 'tour', 'tour.step1_badge', 'Βήμα 1'),
('el', 'tour', 'tour.step1_title', 'Ψηφιοποίηση των Αρχείων σας'),
('el', 'tour', 'tour.step1_desc', 'Ξεκινήστε καταγράφοντας εικόνες των υπαρχόντων χάρτινων αρχείων σας. Η πλατφόρμα μας δέχεται σαρώσεις και φωτογραφίες από οποιαδήποτε συσκευή — smartphone, tablet ή σαρωτή.'),
('el', 'tour', 'tour.step1_bullet1', 'Ανεβάστε μεμονωμένα αρχεία ή εισαγάγετε μαζικά εκατοντάδες ταυτόχρονα'),
('el', 'tour', 'tour.step1_bullet2', 'Αυτόματη βελτίωση εικόνας για παλιά ή ξεθωριασμένα έγγραφα'),
('el', 'tour', 'tour.step1_bullet3', 'Η τεχνολογία OCR εξάγει κείμενο από χειρόγραφα αρχεία'),
('el', 'tour', 'tour.step1_bullet4', 'Επαγγελματικές υπηρεσίες ψηφιοποίησης διαθέσιμες για μεγάλους όγκους'),
('el', 'tour', 'tour.step1_mock_dropzone', 'Σύρετε και αφήστε τα έγγραφά σας ή κάντε κλικ για αναζήτηση'),

-- Step 2
('el', 'tour', 'tour.step2_badge', 'Βήμα 2'),
('el', 'tour', 'tour.step2_title', 'Οργάνωση Ενοριακών Δεδομένων'),
('el', 'tour', 'tour.step2_desc', 'Μετατρέψτε εικόνες σε δομημένα, αναζητήσιμα αρχεία. Εισαγάγετε λεπτομέρειες μυστηρίων σε οργανωμένες βάσεις δεδομένων σχεδιασμένες ειδικά για Ορθόδοξες ενορίες.'),
('el', 'tour', 'tour.step2_bullet1', 'Προκατασκευασμένα πρότυπα για βαπτίσεις, γάμους και κηδείες'),
('el', 'tour', 'tour.step2_bullet2', 'Προσαρμοσμένα πεδία για μοναδικές ανάγκες ενορίας'),
('el', 'tour', 'tour.step2_bullet3', 'Σύνδεση σχετικών αρχείων (οικογένειες, ανάδοχοι, μάρτυρες)'),
('el', 'tour', 'tour.step2_bullet4', 'Πολύγλωσση εισαγωγή δεδομένων με υποστήριξη μεταγραφής'),
('el', 'tour', 'tour.step2_mock_name', 'Όνομα'),
('el', 'tour', 'tour.step2_mock_date', 'Ημερομηνία'),
('el', 'tour', 'tour.step2_mock_type', 'Τύπος'),
('el', 'tour', 'tour.step2_mock_priest', 'Ιερέας'),

-- Step 3
('el', 'tour', 'tour.step3_badge', 'Βήμα 3'),
('el', 'tour', 'tour.step3_title', 'Ισχυρές Δυνατότητες Αναζήτησης'),
('el', 'tour', 'tour.step3_desc', 'Βρείτε οποιοδήποτε αρχείο σε δευτερόλεπτα χρησιμοποιώντας τα προηγμένα εργαλεία αναζήτησής μας. Αναζητήστε κατά όνομα, ημερομηνία, τοποθεσία, ιερέα ή οποιοδήποτε προσαρμοσμένο πεδίο.'),
('el', 'tour', 'tour.step3_bullet1', 'Αναζήτηση πλήρους κειμένου σε όλα τα αρχεία και πεδία'),
('el', 'tour', 'tour.step3_bullet2', 'Φίλτρα κατά εύρος ημερομηνιών, τύπους μυστηρίων και τοποθεσίες'),
('el', 'tour', 'tour.step3_bullet3', 'Η ασαφής αντιστοίχιση χειρίζεται παραλλαγές ορθογραφίας'),
('el', 'tour', 'tour.step3_bullet4', 'Αναζήτηση σε πολλές γλώσσες ταυτόχρονα'),
('el', 'tour', 'tour.step3_bullet5', 'Αποθηκεύστε συχνές αναζητήσεις για γρήγορη πρόσβαση'),

-- Step 4
('el', 'tour', 'tour.step4_badge', 'Βήμα 4'),
('el', 'tour', 'tour.step4_title', 'Αναφορές & Αναλύσεις'),
('el', 'tour', 'tour.step4_desc', 'Αποκτήστε πολύτιμες γνώσεις για την ιστορία της ενορίας σας. Δημιουργήστε αναφορές, οπτικοποιήστε τάσεις και κατανοήστε μοτίβα σε δεκαετίες μυστηριακών αρχείων.'),
('el', 'tour', 'tour.step4_bullet1', 'Παρακολουθήστε βαπτίσεις, γάμους και κηδείες στο χρόνο'),
('el', 'tour', 'tour.step4_bullet2', 'Οπτικοποιήστε την ανάπτυξη ενορίας και δημογραφικές τάσεις'),
('el', 'tour', 'tour.step4_bullet3', 'Δημιουργήστε αναφορές για υποβολές μητρόπολης'),
('el', 'tour', 'tour.step4_bullet4', 'Εξαγωγή δεδομένων για προσαρμοσμένη ανάλυση'),
('el', 'tour', 'tour.step4_bullet5', 'Σύγκριση στατιστικών σε χρονικές περιόδους'),
('el', 'tour', 'tour.step4_mock_total_baptisms', 'Σύνολο Βαπτίσεων'),
('el', 'tour', 'tour.step4_mock_this_year', 'Φέτος'),

-- Additional Features
('el', 'tour', 'tour.extras_title', 'Περισσότεροι Τρόποι Υποστήριξης της Ενορίας σας'),
('el', 'tour', 'tour.extra1_title', 'Ασφαλής Αποθήκευση'),
('el', 'tour', 'tour.extra1_desc', 'Κρυπτογράφηση τραπεζικού επιπέδου και πολλαπλά αντίγραφα ασφαλείας εξασφαλίζουν ότι τα αρχεία σας είναι πάντα ασφαλή και προσβάσιμα.'),
('el', 'tour', 'tour.extra2_title', 'Πρόσβαση βάσει Ρόλου'),
('el', 'tour', 'tour.extra2_desc', 'Ελέγξτε ποιος μπορεί να προβάλει, να επεξεργαστεί ή να διαχειριστεί αρχεία με προσαρμόσιμα επίπεδα δικαιωμάτων.'),
('el', 'tour', 'tour.extra3_title', 'Δημιουργία Εγγράφων'),
('el', 'tour', 'tour.extra3_desc', 'Δημιουργήστε πιστοποιητικά, βεβαιώσεις καλής κατάστασης και επίσημα έγγραφα αυτόματα.'),
('el', 'tour', 'tour.extra4_title', 'Ενσωμάτωση Ημερολογίου'),
('el', 'tour', 'tour.extra4_desc', 'Συνδέστε αρχεία με λειτουργικά ημερολόγια με υποστήριξη παραδόσεων Παλαιού και Νέου Ημερολογίου.'),

-- CTA
('el', 'tour', 'tour.cta_title', 'Έτοιμοι να το Δείτε σε Δράση;'),
('el', 'tour', 'tour.cta_subtitle', 'Προγραμματίστε μια εξατομικευμένη επίδειξη για να δείτε πώς το Orthodox Metrics μπορεί να μεταμορφώσει τη διαχείριση αρχείων της ενορίας σας'),
('el', 'tour', 'tour.cta_button', 'Αίτημα Επίδειξης'),

-- ═══════════════════════════════════════════════════════════════
-- RUSSIAN (ru)
-- ═══════════════════════════════════════════════════════════════

-- Hero
('ru', 'tour', 'tour.hero_badge', 'Обзор платформы'),
('ru', 'tour', 'tour.hero_title', 'Узнайте, как работает Orthodox Metrics'),
('ru', 'tour', 'tour.hero_subtitle', 'Пошаговое руководство о том, как мы помогаем приходам оцифровывать и управлять священными записями'),

-- Step 1
('ru', 'tour', 'tour.step1_badge', 'Шаг 1'),
('ru', 'tour', 'tour.step1_title', 'Оцифровка ваших записей'),
('ru', 'tour', 'tour.step1_desc', 'Начните с создания изображений ваших существующих бумажных записей. Наша платформа принимает сканы и фотографии с любого устройства — смартфона, планшета или сканера.'),
('ru', 'tour', 'tour.step1_bullet1', 'Загружайте отдельные записи или импортируйте сотни одновременно'),
('ru', 'tour', 'tour.step1_bullet2', 'Автоматическое улучшение изображений для старых или выцветших документов'),
('ru', 'tour', 'tour.step1_bullet3', 'Технология OCR извлекает текст из рукописных записей'),
('ru', 'tour', 'tour.step1_bullet4', 'Профессиональные услуги оцифровки для больших объёмов'),
('ru', 'tour', 'tour.step1_mock_dropzone', 'Перетащите документы или нажмите для выбора'),

-- Step 2
('ru', 'tour', 'tour.step2_badge', 'Шаг 2'),
('ru', 'tour', 'tour.step2_title', 'Организация приходских данных'),
('ru', 'tour', 'tour.step2_desc', 'Преобразуйте изображения в структурированные записи с возможностью поиска. Вводите сведения о таинствах в организованные базы данных, разработанные специально для православных приходов.'),
('ru', 'tour', 'tour.step2_bullet1', 'Готовые шаблоны для крещений, венчаний и отпеваний'),
('ru', 'tour', 'tour.step2_bullet2', 'Настраиваемые поля для уникальных потребностей прихода'),
('ru', 'tour', 'tour.step2_bullet3', 'Связывание записей (семьи, крёстные, свидетели)'),
('ru', 'tour', 'tour.step2_bullet4', 'Многоязычный ввод данных с поддержкой транслитерации'),
('ru', 'tour', 'tour.step2_mock_name', 'Имя'),
('ru', 'tour', 'tour.step2_mock_date', 'Дата'),
('ru', 'tour', 'tour.step2_mock_type', 'Тип'),
('ru', 'tour', 'tour.step2_mock_priest', 'Священник'),

-- Step 3
('ru', 'tour', 'tour.step3_badge', 'Шаг 3'),
('ru', 'tour', 'tour.step3_title', 'Мощные возможности поиска'),
('ru', 'tour', 'tour.step3_desc', 'Находите любую запись за секунды с помощью наших продвинутых инструментов поиска. Ищите по имени, дате, месту, священнику или любому настраиваемому полю.'),
('ru', 'tour', 'tour.step3_bullet1', 'Полнотекстовый поиск по всем записям и полям'),
('ru', 'tour', 'tour.step3_bullet2', 'Фильтрация по диапазонам дат, типам таинств и местам'),
('ru', 'tour', 'tour.step3_bullet3', 'Нечёткий поиск обрабатывает вариации написания'),
('ru', 'tour', 'tour.step3_bullet4', 'Поиск на нескольких языках одновременно'),
('ru', 'tour', 'tour.step3_bullet5', 'Сохраняйте частые запросы для быстрого доступа'),

-- Step 4
('ru', 'tour', 'tour.step4_badge', 'Шаг 4'),
('ru', 'tour', 'tour.step4_title', 'Отчёты и аналитика'),
('ru', 'tour', 'tour.step4_desc', 'Получите ценную информацию об истории вашего прихода. Создавайте отчёты, визуализируйте тенденции и анализируйте закономерности за десятилетия записей таинств.'),
('ru', 'tour', 'tour.step4_bullet1', 'Отслеживайте крещения, венчания и отпевания во времени'),
('ru', 'tour', 'tour.step4_bullet2', 'Визуализируйте рост прихода и демографические тенденции'),
('ru', 'tour', 'tour.step4_bullet3', 'Создавайте отчёты для подачи в епархию'),
('ru', 'tour', 'tour.step4_bullet4', 'Экспортируйте данные для пользовательского анализа'),
('ru', 'tour', 'tour.step4_bullet5', 'Сравнивайте статистику за разные периоды'),
('ru', 'tour', 'tour.step4_mock_total_baptisms', 'Всего крещений'),
('ru', 'tour', 'tour.step4_mock_this_year', 'В этом году'),

-- Additional Features
('ru', 'tour', 'tour.extras_title', 'Больше способов поддержки вашего прихода'),
('ru', 'tour', 'tour.extra1_title', 'Безопасное хранение'),
('ru', 'tour', 'tour.extra1_desc', 'Шифрование банковского уровня и множественные резервные копии гарантируют, что ваши записи всегда в безопасности и доступны.'),
('ru', 'tour', 'tour.extra2_title', 'Доступ по ролям'),
('ru', 'tour', 'tour.extra2_desc', 'Управляйте тем, кто может просматривать, редактировать или управлять записями с настраиваемыми уровнями прав.'),
('ru', 'tour', 'tour.extra3_title', 'Генерация документов'),
('ru', 'tour', 'tour.extra3_desc', 'Создавайте свидетельства, справки о добропорядочности и официальные документы автоматически.'),
('ru', 'tour', 'tour.extra4_title', 'Интеграция с календарём'),
('ru', 'tour', 'tour.extra4_desc', 'Связывайте записи с литургическими календарями с поддержкой традиций Старого и Нового календаря.'),

-- CTA
('ru', 'tour', 'tour.cta_title', 'Готовы увидеть в действии?'),
('ru', 'tour', 'tour.cta_subtitle', 'Запланируйте персональную демонстрацию, чтобы увидеть, как Orthodox Metrics может преобразить ведение записей вашего прихода'),
('ru', 'tour', 'tour.cta_button', 'Запросить демо'),

-- ═══════════════════════════════════════════════════════════════
-- ROMANIAN (ro)
-- ═══════════════════════════════════════════════════════════════

-- Hero
('ro', 'tour', 'tour.hero_badge', 'Tur al Platformei'),
('ro', 'tour', 'tour.hero_title', 'Vedeți cum funcționează Orthodox Metrics'),
('ro', 'tour', 'tour.hero_subtitle', 'Un ghid pas cu pas despre cum ajutăm parohiile să digitalizeze și să gestioneze registrele lor sacre'),

-- Step 1
('ro', 'tour', 'tour.step1_badge', 'Pasul 1'),
('ro', 'tour', 'tour.step1_title', 'Digitalizarea registrelor'),
('ro', 'tour', 'tour.step1_desc', 'Începeți prin capturarea imaginilor registrelor existente pe hârtie. Platforma noastră acceptă scanări și fotografii de pe orice dispozitiv — smartphone, tabletă sau scanner.'),
('ro', 'tour', 'tour.step1_bullet1', 'Încărcați registre individuale sau importați sute simultan'),
('ro', 'tour', 'tour.step1_bullet2', 'Îmbunătățire automată a imaginilor pentru documente vechi sau decolorate'),
('ro', 'tour', 'tour.step1_bullet3', 'Tehnologia OCR extrage textul din registrele scrise de mână'),
('ro', 'tour', 'tour.step1_bullet4', 'Servicii profesionale de digitalizare disponibile pentru volume mari'),
('ro', 'tour', 'tour.step1_mock_dropzone', 'Trageți și plasați documentele sau faceți clic pentru a răsfoi'),

-- Step 2
('ro', 'tour', 'tour.step2_badge', 'Pasul 2'),
('ro', 'tour', 'tour.step2_title', 'Organizarea datelor parohiale'),
('ro', 'tour', 'tour.step2_desc', 'Transformați imaginile în registre structurate și căutabile. Introduceți detalii sacramentale în baze de date organizate, concepute special pentru parohii ortodoxe.'),
('ro', 'tour', 'tour.step2_bullet1', 'Șabloane predefinite pentru botezuri, căsătorii și înmormântări'),
('ro', 'tour', 'tour.step2_bullet2', 'Câmpuri personalizate pentru nevoile unice ale parohiei'),
('ro', 'tour', 'tour.step2_bullet3', 'Legare de registre conexe (familii, nași, martori)'),
('ro', 'tour', 'tour.step2_bullet4', 'Introducere date multilingvă cu suport de transliterare'),
('ro', 'tour', 'tour.step2_mock_name', 'Nume'),
('ro', 'tour', 'tour.step2_mock_date', 'Data'),
('ro', 'tour', 'tour.step2_mock_type', 'Tip'),
('ro', 'tour', 'tour.step2_mock_priest', 'Preot'),

-- Step 3
('ro', 'tour', 'tour.step3_badge', 'Pasul 3'),
('ro', 'tour', 'tour.step3_title', 'Capabilități avansate de căutare'),
('ro', 'tour', 'tour.step3_desc', 'Găsiți orice registru în câteva secunde folosind instrumentele noastre avansate de căutare. Căutați după nume, dată, locație, preot sau orice câmp personalizat.'),
('ro', 'tour', 'tour.step3_bullet1', 'Căutare full-text în toate registrele și câmpurile'),
('ro', 'tour', 'tour.step3_bullet2', 'Filtrare după intervale de date, tipuri de sacramente și locații'),
('ro', 'tour', 'tour.step3_bullet3', 'Potrivirea aproximativă gestionează variațiile de ortografie'),
('ro', 'tour', 'tour.step3_bullet4', 'Căutare în mai multe limbi simultan'),
('ro', 'tour', 'tour.step3_bullet5', 'Salvați căutările frecvente pentru acces rapid'),

-- Step 4
('ro', 'tour', 'tour.step4_badge', 'Pasul 4'),
('ro', 'tour', 'tour.step4_title', 'Rapoarte și analize'),
('ro', 'tour', 'tour.step4_desc', 'Obțineți informații valoroase despre istoria parohiei. Generați rapoarte, vizualizați tendințe și înțelegeți tipare de-a lungul deceniilor de registre sacramentale.'),
('ro', 'tour', 'tour.step4_bullet1', 'Urmăriți botezurile, căsătoriile și înmormântările în timp'),
('ro', 'tour', 'tour.step4_bullet2', 'Vizualizați creșterea parohiei și tendințele demografice'),
('ro', 'tour', 'tour.step4_bullet3', 'Generați rapoarte pentru depuneri la episcopie'),
('ro', 'tour', 'tour.step4_bullet4', 'Exportați date pentru analize personalizate'),
('ro', 'tour', 'tour.step4_bullet5', 'Comparați statisticile pe perioade de timp'),
('ro', 'tour', 'tour.step4_mock_total_baptisms', 'Total botezuri'),
('ro', 'tour', 'tour.step4_mock_this_year', 'Anul acesta'),

-- Additional Features
('ro', 'tour', 'tour.extras_title', 'Mai multe moduri de a vă sprijini parohia'),
('ro', 'tour', 'tour.extra1_title', 'Stocare securizată'),
('ro', 'tour', 'tour.extra1_desc', 'Criptare de nivel bancar și copii de siguranță multiple asigură că registrele sunt întotdeauna sigure și accesibile.'),
('ro', 'tour', 'tour.extra2_title', 'Acces bazat pe roluri'),
('ro', 'tour', 'tour.extra2_desc', 'Controlați cine poate vizualiza, edita sau gestiona registrele cu niveluri personalizabile de permisiuni.'),
('ro', 'tour', 'tour.extra3_title', 'Generare documente'),
('ro', 'tour', 'tour.extra3_desc', 'Creați certificate, scrisori de bună purtare și documente oficiale automat.'),
('ro', 'tour', 'tour.extra4_title', 'Integrare calendar'),
('ro', 'tour', 'tour.extra4_desc', 'Legați registrele de calendarele liturgice cu suport pentru tradițiile calendarului vechi și nou.'),

-- CTA
('ro', 'tour', 'tour.cta_title', 'Pregătiți să vedeți în acțiune?'),
('ro', 'tour', 'tour.cta_subtitle', 'Programați o demonstrație personalizată pentru a vedea cum Orthodox Metrics poate transforma gestionarea registrelor parohiei'),
('ro', 'tour', 'tour.cta_button', 'Solicitați o demonstrație'),

-- ═══════════════════════════════════════════════════════════════
-- GEORGIAN (ka)
-- ═══════════════════════════════════════════════════════════════

-- Hero
('ka', 'tour', 'tour.hero_badge', 'პლატფორმის ტური'),
('ka', 'tour', 'tour.hero_title', 'ნახეთ როგორ მუშაობს Orthodox Metrics'),
('ka', 'tour', 'tour.hero_subtitle', 'ნაბიჯ-ნაბიჯ გზამკვლევი, თუ როგორ ვეხმარებით სამრევლოებს წმინდა ჩანაწერების ციფრულიზაციასა და მართვაში'),

-- Step 1
('ka', 'tour', 'tour.step1_badge', 'ნაბიჯი 1'),
('ka', 'tour', 'tour.step1_title', 'თქვენი ჩანაწერების ციფრულიზაცია'),
('ka', 'tour', 'tour.step1_desc', 'დაიწყეთ არსებული ქაღალდის ჩანაწერების გადაღებით. ჩვენი პლატფორმა იღებს სკანერებს და ფოტოებს ნებისმიერი მოწყობილობიდან — სმარტფონი, ტაბლეტი ან სკანერი.'),
('ka', 'tour', 'tour.step1_bullet1', 'ატვირთეთ ცალკეული ჩანაწერები ან მასიურად შემოიტანეთ ასობით ერთდროულად'),
('ka', 'tour', 'tour.step1_bullet2', 'გამოსახულების ავტომატური გაუმჯობესება ძველი ან გაცვეთილი დოკუმენტებისთვის'),
('ka', 'tour', 'tour.step1_bullet3', 'OCR ტექნოლოგია ხელნაწერი ჩანაწერებიდან ტექსტს ამოიღებს'),
('ka', 'tour', 'tour.step1_bullet4', 'პროფესიონალური ციფრულიზაციის სერვისები დიდი მოცულობებისთვის'),
('ka', 'tour', 'tour.step1_mock_dropzone', 'გადმოიტანეთ დოკუმენტები ან დააჭირეთ ფაილის ასარჩევად'),

-- Step 2
('ka', 'tour', 'tour.step2_badge', 'ნაბიჯი 2'),
('ka', 'tour', 'tour.step2_title', 'სამრევლო მონაცემების ორგანიზება'),
('ka', 'tour', 'tour.step2_desc', 'გადააქციეთ გამოსახულებები სტრუქტურირებულ, საძიებო ჩანაწერებად. შეიყვანეთ საეკლესიო დეტალები ორგანიზებულ მონაცემთა ბაზებში, სპეციალურად შექმნილ მართლმადიდებელი სამრევლოებისთვის.'),
('ka', 'tour', 'tour.step2_bullet1', 'წინასწარ შექმნილი შაბლონები ნათლობების, ქორწინებებისა და დაკრძალვებისთვის'),
('ka', 'tour', 'tour.step2_bullet2', 'მორგებადი ველები სამრევლოს უნიკალური საჭიროებებისთვის'),
('ka', 'tour', 'tour.step2_bullet3', 'დაკავშირებული ჩანაწერების მიბმა (ოჯახები, ნათლიები, მოწმეები)'),
('ka', 'tour', 'tour.step2_bullet4', 'მრავალენოვანი მონაცემთა შეყვანა ტრანსლიტერაციის მხარდაჭერით'),
('ka', 'tour', 'tour.step2_mock_name', 'სახელი'),
('ka', 'tour', 'tour.step2_mock_date', 'თარიღი'),
('ka', 'tour', 'tour.step2_mock_type', 'ტიპი'),
('ka', 'tour', 'tour.step2_mock_priest', 'მღვდელი'),

-- Step 3
('ka', 'tour', 'tour.step3_badge', 'ნაბიჯი 3'),
('ka', 'tour', 'tour.step3_title', 'ძლიერი ძიების შესაძლებლობები'),
('ka', 'tour', 'tour.step3_desc', 'იპოვეთ ნებისმიერი ჩანაწერი წამებში ჩვენი გაფართოებული ძიების ინსტრუმენტებით. მოიძიეთ სახელით, თარიღით, ადგილმდებარეობით, მღვდლით ან ნებისმიერი ველით.'),
('ka', 'tour', 'tour.step3_bullet1', 'სრულტექსტიანი ძიება ყველა ჩანაწერსა და ველში'),
('ka', 'tour', 'tour.step3_bullet2', 'გაფილტვრა თარიღის დიაპაზონების, საეკლესიო ტიპებისა და ადგილების მიხედვით'),
('ka', 'tour', 'tour.step3_bullet3', 'მიახლოებითი შედარება მართლწერის ვარიაციებს ამუშავებს'),
('ka', 'tour', 'tour.step3_bullet4', 'ძიება რამდენიმე ენაზე ერთდროულად'),
('ka', 'tour', 'tour.step3_bullet5', 'შეინახეთ ხშირი ძიებები სწრაფი წვდომისთვის'),

-- Step 4
('ka', 'tour', 'tour.step4_badge', 'ნაბიჯი 4'),
('ka', 'tour', 'tour.step4_title', 'ანგარიშები და ანალიტიკა'),
('ka', 'tour', 'tour.step4_desc', 'მიიღეთ ღირებული ინფორმაცია სამრევლოს ისტორიის შესახებ. შექმენით ანგარიშები, ვიზუალიზაცია გაუკეთეთ ტენდენციებს და გაიაზრეთ ნიმუშები ათწლეულების საეკლესიო ჩანაწერებში.'),
('ka', 'tour', 'tour.step4_bullet1', 'თვალი ადევნეთ ნათლობებს, ქორწინებებსა და დაკრძალვებს დროში'),
('ka', 'tour', 'tour.step4_bullet2', 'ვიზუალიზაცია გაუკეთეთ სამრევლოს ზრდასა და დემოგრაფიულ ტენდენციებს'),
('ka', 'tour', 'tour.step4_bullet3', 'შექმენით ანგარიშები ეპარქიისთვის წარსადგენად'),
('ka', 'tour', 'tour.step4_bullet4', 'ექსპორტი მონაცემების ინდივიდუალური ანალიზისთვის'),
('ka', 'tour', 'tour.step4_bullet5', 'შეადარეთ სტატისტიკა სხვადასხვა პერიოდებში'),
('ka', 'tour', 'tour.step4_mock_total_baptisms', 'ნათლობები სულ'),
('ka', 'tour', 'tour.step4_mock_this_year', 'წელს'),

-- Additional Features
('ka', 'tour', 'tour.extras_title', 'მეტი გზა თქვენი სამრევლოს მხარდაჭერისთვის'),
('ka', 'tour', 'tour.extra1_title', 'უსაფრთხო შენახვა'),
('ka', 'tour', 'tour.extra1_desc', 'საბანკო დონის დაშიფვრა და მრავალჯერადი სარეზერვო ასლები უზრუნველყოფს, რომ თქვენი ჩანაწერები ყოველთვის უსაფრთხო და ხელმისაწვდომია.'),
('ka', 'tour', 'tour.extra2_title', 'როლზე დაფუძნებული წვდომა'),
('ka', 'tour', 'tour.extra2_desc', 'გააკონტროლეთ, ვის შეუძლია ჩანაწერების ნახვა, რედაქტირება ან მართვა მორგებადი უფლებების დონეებით.'),
('ka', 'tour', 'tour.extra3_title', 'დოკუმენტების გენერაცია'),
('ka', 'tour', 'tour.extra3_desc', 'შექმენით სერტიფიკატები, კეთილსინდისიერების წერილები და ოფიციალური დოკუმენტები ავტომატურად.'),
('ka', 'tour', 'tour.extra4_title', 'კალენდრის ინტეგრაცია'),
('ka', 'tour', 'tour.extra4_desc', 'დაუკავშირეთ ჩანაწერები ლიტურგიკულ კალენდრებს ძველი და ახალი კალენდრის ტრადიციების მხარდაჭერით.'),

-- CTA
('ka', 'tour', 'tour.cta_title', 'მზად ხართ ნახოთ მოქმედებაში?'),
('ka', 'tour', 'tour.cta_subtitle', 'დაგეგმეთ პერსონალიზებული დემონსტრაცია, რომ ნახოთ როგორ შეუძლია Orthodox Metrics-ს თქვენი სამრევლოს ჩანაწერების მართვის გარდაქმნა'),
('ka', 'tour', 'tour.cta_button', 'მოითხოვეთ დემო');
