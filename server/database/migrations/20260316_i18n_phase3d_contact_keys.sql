-- Phase 3D: Contact page translations (el, ru, ro, ka)
-- 48 keys × 4 languages = 192 rows
-- Idempotent: INSERT IGNORE

-- ═══════════════════════════════════════════════════════════════
-- GREEK (el)
-- ═══════════════════════════════════════════════════════════════

-- Hero
INSERT IGNORE INTO ui_translations (lang_code, namespace, translation_key, translation_text) VALUES
('el', 'contact', 'contact.hero_badge', 'Επικοινωνήστε Μαζί Μας'),
('el', 'contact', 'contact.hero_title', 'Είμαστε Εδώ για να Βοηθήσουμε'),
('el', 'contact', 'contact.hero_subtitle', 'Έχετε ερωτήσεις σχετικά με το Orthodox Metrics; Η ομάδα μας είναι έτοιμη να βοηθήσει την ενορία σας');

-- Form
INSERT IGNORE INTO ui_translations (lang_code, namespace, translation_key, translation_text) VALUES
('el', 'contact', 'contact.form_title', 'Στείλτε μας Μήνυμα'),
('el', 'contact', 'contact.form_desc', 'Συμπληρώστε τη φόρμα παρακάτω και θα σας απαντήσουμε εντός 24 ωρών.'),
('el', 'contact', 'contact.label_name', 'Το Όνομά σας *'),
('el', 'contact', 'contact.label_email', 'Διεύθυνση Email *'),
('el', 'contact', 'contact.label_parish', 'Όνομα Ενορίας'),
('el', 'contact', 'contact.label_phone', 'Τηλέφωνο'),
('el', 'contact', 'contact.label_topic', 'Πώς μπορούμε να σας βοηθήσουμε; *'),
('el', 'contact', 'contact.label_message', 'Μήνυμα *'),
('el', 'contact', 'contact.placeholder_name', 'π. Ιωάννης Παπαδόπουλος'),
('el', 'contact', 'contact.placeholder_email', 'email@enoria.gr'),
('el', 'contact', 'contact.placeholder_parish', 'Ιερός Ναός Αγίου Νικολάου'),
('el', 'contact', 'contact.placeholder_phone', '(210) 123-4567'),
('el', 'contact', 'contact.placeholder_message', 'Πείτε μας για την ενορία σας και πώς μπορούμε να βοηθήσουμε...'),
('el', 'contact', 'contact.option_demo', 'Αίτημα Επίδειξης'),
('el', 'contact', 'contact.option_general', 'Γενική Ερώτηση'),
('el', 'contact', 'contact.option_billing', 'Πληροφορίες Τιμολόγησης'),
('el', 'contact', 'contact.option_technical', 'Τεχνική Υποστήριξη'),
('el', 'contact', 'contact.option_other', 'Άλλο'),
('el', 'contact', 'contact.btn_send', 'Αποστολή Μηνύματος'),
('el', 'contact', 'contact.btn_sending', 'Αποστολή...');

-- Success / Error
INSERT IGNORE INTO ui_translations (lang_code, namespace, translation_key, translation_text) VALUES
('el', 'contact', 'contact.success_title', 'Το Μήνυμα Εστάλη!'),
('el', 'contact', 'contact.success_desc', 'Θα επικοινωνήσουμε μαζί σας εντός 24 ωρών.'),
('el', 'contact', 'contact.error_message', 'Κάτι πήγε στραβά. Παρακαλώ δοκιμάστε ξανά.');

-- Contact Info
INSERT IGNORE INTO ui_translations (lang_code, namespace, translation_key, translation_text) VALUES
('el', 'contact', 'contact.info_title', 'Στοιχεία Επικοινωνίας'),
('el', 'contact', 'contact.info_desc', 'Προτιμάτε να επικοινωνήσετε απευθείας; Δείτε πώς να επικοινωνήσετε με την ομάδα μας.'),
('el', 'contact', 'contact.info1_title', 'Email'),
('el', 'contact', 'contact.info1_detail', 'support@orthodoxmetrics.com'),
('el', 'contact', 'contact.info1_subtext', 'Απαντάμε εντός 24 ωρών'),
('el', 'contact', 'contact.info2_title', 'Καλέστε μας'),
('el', 'contact', 'contact.info2_detail', '(555) 123-4567'),
('el', 'contact', 'contact.info2_subtext', 'Δευτέρα – Παρασκευή, 9πμ – 5μμ EST'),
('el', 'contact', 'contact.info3_title', 'Ταχυδρομική Διεύθυνση'),
('el', 'contact', 'contact.info3_detail', '123 Church Street, Suite 100'),
('el', 'contact', 'contact.info3_subtext', 'Boston, MA 02118'),
('el', 'contact', 'contact.info4_title', 'Ωράριο Λειτουργίας'),
('el', 'contact', 'contact.info4_detail', 'Δευτέρα – Παρασκευή: 9:00 πμ – 5:00 μμ EST'),
('el', 'contact', 'contact.info4_subtext', 'Κλειστά τις μεγάλες Ορθόδοξες εορτές');

-- Demo CTA
INSERT IGNORE INTO ui_translations (lang_code, namespace, translation_key, translation_text) VALUES
('el', 'contact', 'contact.demo_title', 'Κλείστε μια Επίδειξη'),
('el', 'contact', 'contact.demo_desc', 'Δείτε το Orthodox Metrics σε δράση με μια εξατομικευμένη παρουσίαση για την ενορία σας.'),
('el', 'contact', 'contact.demo_button', 'Κλείστε Ραντεβού Επίδειξης');

-- FAQ
INSERT IGNORE INTO ui_translations (lang_code, namespace, translation_key, translation_text) VALUES
('el', 'contact', 'contact.faq_title', 'Συχνές Ερωτήσεις'),
('el', 'contact', 'contact.faq_subtitle', 'Γρήγορες απαντήσεις σε ερωτήσεις που μπορεί να έχετε'),
('el', 'contact', 'contact.faq1_q', 'Πόσο χρόνο χρειάζεται για να ξεκινήσετε;'),
('el', 'contact', 'contact.faq1_a', 'Οι περισσότερες ενορίες λειτουργούν εντός 1–2 εβδομάδων. Παρέχουμε υποστήριξη ένταξης για να σας βοηθήσουμε στην αρχική ρύθμιση.'),
('el', 'contact', 'contact.faq2_q', 'Προσφέρετε βοήθεια στην ψηφιοποίηση υπαρχόντων αρχείων;'),
('el', 'contact', 'contact.faq2_a', 'Ναι! Μπορούμε να σας συνδέσουμε με επαγγελματικές υπηρεσίες ψηφιοποίησης ή να καθοδηγήσουμε την ομάδα σας στη διαδικασία.'),
('el', 'contact', 'contact.faq3_q', 'Είναι τα δεδομένα μου ασφαλή;'),
('el', 'contact', 'contact.faq3_a', 'Απολύτως. Χρησιμοποιούμε κρυπτογράφηση τραπεζικού επιπέδου, τακτικά αντίγραφα ασφαλείας και συμμορφωνόμαστε με όλους τους κανονισμούς προστασίας δεδομένων.'),
('el', 'contact', 'contact.faq4_q', 'Μπορώ να δοκιμάσω πριν αγοράσω;'),
('el', 'contact', 'contact.faq4_a', 'Ναι, προσφέρουμε δωρεάν δοκιμή 30 ημερών με πλήρη πρόσβαση σε όλες τις λειτουργίες.');

-- ═══════════════════════════════════════════════════════════════
-- RUSSIAN (ru)
-- ═══════════════════════════════════════════════════════════════

-- Hero
INSERT IGNORE INTO ui_translations (lang_code, namespace, translation_key, translation_text) VALUES
('ru', 'contact', 'contact.hero_badge', 'Свяжитесь с нами'),
('ru', 'contact', 'contact.hero_title', 'Мы готовы помочь'),
('ru', 'contact', 'contact.hero_subtitle', 'Есть вопросы о Orthodox Metrics? Наша команда готова помочь вашему приходу');

-- Form
INSERT IGNORE INTO ui_translations (lang_code, namespace, translation_key, translation_text) VALUES
('ru', 'contact', 'contact.form_title', 'Отправьте нам сообщение'),
('ru', 'contact', 'contact.form_desc', 'Заполните форму ниже, и мы ответим в течение 24 часов.'),
('ru', 'contact', 'contact.label_name', 'Ваше имя *'),
('ru', 'contact', 'contact.label_email', 'Адрес электронной почты *'),
('ru', 'contact', 'contact.label_parish', 'Название прихода'),
('ru', 'contact', 'contact.label_phone', 'Номер телефона'),
('ru', 'contact', 'contact.label_topic', 'Чем мы можем вам помочь? *'),
('ru', 'contact', 'contact.label_message', 'Сообщение *'),
('ru', 'contact', 'contact.placeholder_name', 'о. Иоанн Петров'),
('ru', 'contact', 'contact.placeholder_email', 'email@prikhod.ru'),
('ru', 'contact', 'contact.placeholder_parish', 'Храм Святителя Николая'),
('ru', 'contact', 'contact.placeholder_phone', '(495) 123-4567'),
('ru', 'contact', 'contact.placeholder_message', 'Расскажите нам о вашем приходе и как мы можем помочь...'),
('ru', 'contact', 'contact.option_demo', 'Запросить демо'),
('ru', 'contact', 'contact.option_general', 'Общий вопрос'),
('ru', 'contact', 'contact.option_billing', 'Информация о ценах'),
('ru', 'contact', 'contact.option_technical', 'Техническая поддержка'),
('ru', 'contact', 'contact.option_other', 'Другое'),
('ru', 'contact', 'contact.btn_send', 'Отправить сообщение'),
('ru', 'contact', 'contact.btn_sending', 'Отправка...');

-- Success / Error
INSERT IGNORE INTO ui_translations (lang_code, namespace, translation_key, translation_text) VALUES
('ru', 'contact', 'contact.success_title', 'Сообщение отправлено!'),
('ru', 'contact', 'contact.success_desc', 'Мы свяжемся с вами в течение 24 часов.'),
('ru', 'contact', 'contact.error_message', 'Что-то пошло не так. Пожалуйста, попробуйте снова.');

-- Contact Info
INSERT IGNORE INTO ui_translations (lang_code, namespace, translation_key, translation_text) VALUES
('ru', 'contact', 'contact.info_title', 'Контактная информация'),
('ru', 'contact', 'contact.info_desc', 'Предпочитаете связаться напрямую? Вот как связаться с нашей командой.'),
('ru', 'contact', 'contact.info1_title', 'Электронная почта'),
('ru', 'contact', 'contact.info1_detail', 'support@orthodoxmetrics.com'),
('ru', 'contact', 'contact.info1_subtext', 'Отвечаем в течение 24 часов'),
('ru', 'contact', 'contact.info2_title', 'Позвоните нам'),
('ru', 'contact', 'contact.info2_detail', '(555) 123-4567'),
('ru', 'contact', 'contact.info2_subtext', 'Понедельник – Пятница, 9:00 – 17:00 EST'),
('ru', 'contact', 'contact.info3_title', 'Почтовый адрес'),
('ru', 'contact', 'contact.info3_detail', '123 Church Street, Suite 100'),
('ru', 'contact', 'contact.info3_subtext', 'Boston, MA 02118'),
('ru', 'contact', 'contact.info4_title', 'Часы работы'),
('ru', 'contact', 'contact.info4_detail', 'Понедельник – Пятница: 9:00 – 17:00 EST'),
('ru', 'contact', 'contact.info4_subtext', 'Закрыто в дни великих Православных праздников');

-- Demo CTA
INSERT IGNORE INTO ui_translations (lang_code, namespace, translation_key, translation_text) VALUES
('ru', 'contact', 'contact.demo_title', 'Запланировать демонстрацию'),
('ru', 'contact', 'contact.demo_desc', 'Посмотрите Orthodox Metrics в действии с персональной демонстрацией для вашего прихода.'),
('ru', 'contact', 'contact.demo_button', 'Записаться на демо');

-- FAQ
INSERT IGNORE INTO ui_translations (lang_code, namespace, translation_key, translation_text) VALUES
('ru', 'contact', 'contact.faq_title', 'Частые вопросы'),
('ru', 'contact', 'contact.faq_subtitle', 'Быстрые ответы на вопросы, которые могут у вас возникнуть'),
('ru', 'contact', 'contact.faq1_q', 'Сколько времени нужно, чтобы начать?'),
('ru', 'contact', 'contact.faq1_a', 'Большинство приходов начинают работу в течение 1–2 недель. Мы предоставляем поддержку при подключении, чтобы помочь вам с начальной настройкой.'),
('ru', 'contact', 'contact.faq2_q', 'Вы помогаете с оцифровкой существующих записей?'),
('ru', 'contact', 'contact.faq2_a', 'Да! Мы можем связать вас с профессиональными услугами оцифровки или провести вашу команду через этот процесс.'),
('ru', 'contact', 'contact.faq3_q', 'Мои данные в безопасности?'),
('ru', 'contact', 'contact.faq3_a', 'Абсолютно. Мы используем шифрование банковского уровня, регулярное резервное копирование и соблюдаем все нормы защиты данных.'),
('ru', 'contact', 'contact.faq4_q', 'Можно ли попробовать перед покупкой?'),
('ru', 'contact', 'contact.faq4_a', 'Да, мы предлагаем 30-дневную бесплатную пробную версию с полным доступом ко всем функциям.');

-- ═══════════════════════════════════════════════════════════════
-- ROMANIAN (ro)
-- ═══════════════════════════════════════════════════════════════

-- Hero
INSERT IGNORE INTO ui_translations (lang_code, namespace, translation_key, translation_text) VALUES
('ro', 'contact', 'contact.hero_badge', 'Contactați-ne'),
('ro', 'contact', 'contact.hero_title', 'Suntem Aici să Vă Ajutăm'),
('ro', 'contact', 'contact.hero_subtitle', 'Aveți întrebări despre Orthodox Metrics? Echipa noastră este pregătită să asiste parohia dumneavoastră');

-- Form
INSERT IGNORE INTO ui_translations (lang_code, namespace, translation_key, translation_text) VALUES
('ro', 'contact', 'contact.form_title', 'Trimiteți-ne un Mesaj'),
('ro', 'contact', 'contact.form_desc', 'Completați formularul de mai jos și vă vom răspunde în 24 de ore.'),
('ro', 'contact', 'contact.label_name', 'Numele dumneavoastră *'),
('ro', 'contact', 'contact.label_email', 'Adresă de email *'),
('ro', 'contact', 'contact.label_parish', 'Numele parohiei'),
('ro', 'contact', 'contact.label_phone', 'Număr de telefon'),
('ro', 'contact', 'contact.label_topic', 'Cu ce vă putem ajuta? *'),
('ro', 'contact', 'contact.label_message', 'Mesaj *'),
('ro', 'contact', 'contact.placeholder_name', 'Pr. Ioan Popescu'),
('ro', 'contact', 'contact.placeholder_email', 'email@parohie.ro'),
('ro', 'contact', 'contact.placeholder_parish', 'Biserica Sfântul Nicolae'),
('ro', 'contact', 'contact.placeholder_phone', '(021) 123-4567'),
('ro', 'contact', 'contact.placeholder_message', 'Spuneți-ne despre parohia dumneavoastră și cum vă putem ajuta...'),
('ro', 'contact', 'contact.option_demo', 'Solicitați o demonstrație'),
('ro', 'contact', 'contact.option_general', 'Întrebare generală'),
('ro', 'contact', 'contact.option_billing', 'Informații despre prețuri'),
('ro', 'contact', 'contact.option_technical', 'Suport tehnic'),
('ro', 'contact', 'contact.option_other', 'Altele'),
('ro', 'contact', 'contact.btn_send', 'Trimite mesajul'),
('ro', 'contact', 'contact.btn_sending', 'Se trimite...');

-- Success / Error
INSERT IGNORE INTO ui_translations (lang_code, namespace, translation_key, translation_text) VALUES
('ro', 'contact', 'contact.success_title', 'Mesaj trimis!'),
('ro', 'contact', 'contact.success_desc', 'Vă vom contacta în 24 de ore.'),
('ro', 'contact', 'contact.error_message', 'Ceva nu a funcționat. Vă rugăm încercați din nou.');

-- Contact Info
INSERT IGNORE INTO ui_translations (lang_code, namespace, translation_key, translation_text) VALUES
('ro', 'contact', 'contact.info_title', 'Informații de Contact'),
('ro', 'contact', 'contact.info_desc', 'Preferați să ne contactați direct? Iată cum puteți lua legătura cu echipa noastră.'),
('ro', 'contact', 'contact.info1_title', 'Email'),
('ro', 'contact', 'contact.info1_detail', 'support@orthodoxmetrics.com'),
('ro', 'contact', 'contact.info1_subtext', 'Răspundem în 24 de ore'),
('ro', 'contact', 'contact.info2_title', 'Sunați-ne'),
('ro', 'contact', 'contact.info2_detail', '(555) 123-4567'),
('ro', 'contact', 'contact.info2_subtext', 'Luni – Vineri, 9:00 – 17:00 EST'),
('ro', 'contact', 'contact.info3_title', 'Adresă Poștală'),
('ro', 'contact', 'contact.info3_detail', '123 Church Street, Suite 100'),
('ro', 'contact', 'contact.info3_subtext', 'Boston, MA 02118'),
('ro', 'contact', 'contact.info4_title', 'Program de Lucru'),
('ro', 'contact', 'contact.info4_detail', 'Luni – Vineri: 9:00 – 17:00 EST'),
('ro', 'contact', 'contact.info4_subtext', 'Închis în zilele marilor sărbători Ortodoxe');

-- Demo CTA
INSERT IGNORE INTO ui_translations (lang_code, namespace, translation_key, translation_text) VALUES
('ro', 'contact', 'contact.demo_title', 'Programați o Demonstrație'),
('ro', 'contact', 'contact.demo_desc', 'Vedeți Orthodox Metrics în acțiune cu o prezentare personalizată pentru parohia dumneavoastră.'),
('ro', 'contact', 'contact.demo_button', 'Programați un Apel Demo');

-- FAQ
INSERT IGNORE INTO ui_translations (lang_code, namespace, translation_key, translation_text) VALUES
('ro', 'contact', 'contact.faq_title', 'Întrebări Frecvente'),
('ro', 'contact', 'contact.faq_subtitle', 'Răspunsuri rapide la întrebări pe care le-ați putea avea'),
('ro', 'contact', 'contact.faq1_q', 'Cât durează până la începerea utilizării?'),
('ro', 'contact', 'contact.faq1_a', 'Majoritatea parohiilor sunt operaționale în 1–2 săptămâni. Oferim suport de integrare pentru a vă ajuta cu configurarea inițială.'),
('ro', 'contact', 'contact.faq2_q', 'Oferiți ajutor pentru digitalizarea registrelor existente?'),
('ro', 'contact', 'contact.faq2_a', 'Da! Vă putem conecta cu servicii profesionale de digitalizare sau vă putem ghida echipa prin proces.'),
('ro', 'contact', 'contact.faq3_q', 'Datele mele sunt în siguranță?'),
('ro', 'contact', 'contact.faq3_a', 'Absolut. Folosim criptare de nivel bancar, copii de siguranță regulate și respectăm toate reglementările de protecție a datelor.'),
('ro', 'contact', 'contact.faq4_q', 'Pot încerca înainte de a cumpăra?'),
('ro', 'contact', 'contact.faq4_a', 'Da, oferim o perioadă de probă gratuită de 30 de zile cu acces complet la toate funcțiile.');

-- ═══════════════════════════════════════════════════════════════
-- GEORGIAN (ka)
-- ═══════════════════════════════════════════════════════════════

-- Hero
INSERT IGNORE INTO ui_translations (lang_code, namespace, translation_key, translation_text) VALUES
('ka', 'contact', 'contact.hero_badge', 'დაგვიკავშირდით'),
('ka', 'contact', 'contact.hero_title', 'ჩვენ მზად ვართ დაგეხმაროთ'),
('ka', 'contact', 'contact.hero_subtitle', 'გაქვთ კითხვები Orthodox Metrics-ის შესახებ? ჩვენი გუნდი მზად არის თქვენი სამრევლოს დასახმარებლად');

-- Form
INSERT IGNORE INTO ui_translations (lang_code, namespace, translation_key, translation_text) VALUES
('ka', 'contact', 'contact.form_title', 'გამოგვიგზავნეთ შეტყობინება'),
('ka', 'contact', 'contact.form_desc', 'შეავსეთ ქვემოთ მოცემული ფორმა და ჩვენ გიპასუხებთ 24 საათში.'),
('ka', 'contact', 'contact.label_name', 'თქვენი სახელი *'),
('ka', 'contact', 'contact.label_email', 'ელ. ფოსტის მისამართი *'),
('ka', 'contact', 'contact.label_parish', 'სამრევლოს სახელი'),
('ka', 'contact', 'contact.label_phone', 'ტელეფონის ნომერი'),
('ka', 'contact', 'contact.label_topic', 'რით შეგვიძლია დაგეხმაროთ? *'),
('ka', 'contact', 'contact.label_message', 'შეტყობინება *'),
('ka', 'contact', 'contact.placeholder_name', 'მამა იოანე'),
('ka', 'contact', 'contact.placeholder_email', 'email@samrevlo.ge'),
('ka', 'contact', 'contact.placeholder_parish', 'წმინდა ნიკოლოზის ტაძარი'),
('ka', 'contact', 'contact.placeholder_phone', '(032) 123-4567'),
('ka', 'contact', 'contact.placeholder_message', 'მოგვიყევით თქვენი სამრევლოს შესახებ და როგორ შეგვიძლია დაგეხმაროთ...'),
('ka', 'contact', 'contact.option_demo', 'მოითხოვეთ დემო'),
('ka', 'contact', 'contact.option_general', 'ზოგადი შეკითხვა'),
('ka', 'contact', 'contact.option_billing', 'ფასების ინფორმაცია'),
('ka', 'contact', 'contact.option_technical', 'ტექნიკური მხარდაჭერა'),
('ka', 'contact', 'contact.option_other', 'სხვა'),
('ka', 'contact', 'contact.btn_send', 'შეტყობინების გაგზავნა'),
('ka', 'contact', 'contact.btn_sending', 'იგზავნება...');

-- Success / Error
INSERT IGNORE INTO ui_translations (lang_code, namespace, translation_key, translation_text) VALUES
('ka', 'contact', 'contact.success_title', 'შეტყობინება გაიგზავნა!'),
('ka', 'contact', 'contact.success_desc', 'დაგიკავშირდებით 24 საათში.'),
('ka', 'contact', 'contact.error_message', 'რაღაც შეცდომა მოხდა. გთხოვთ, სცადეთ ხელახლა.');

-- Contact Info
INSERT IGNORE INTO ui_translations (lang_code, namespace, translation_key, translation_text) VALUES
('ka', 'contact', 'contact.info_title', 'საკონტაქტო ინფორმაცია'),
('ka', 'contact', 'contact.info_desc', 'გირჩევნიათ პირდაპირ დაკავშირება? აი, როგორ დაუკავშირდეთ ჩვენს გუნდს.'),
('ka', 'contact', 'contact.info1_title', 'ელ. ფოსტა'),
('ka', 'contact', 'contact.info1_detail', 'support@orthodoxmetrics.com'),
('ka', 'contact', 'contact.info1_subtext', 'პასუხობთ 24 საათში'),
('ka', 'contact', 'contact.info2_title', 'დაგვირეკეთ'),
('ka', 'contact', 'contact.info2_detail', '(555) 123-4567'),
('ka', 'contact', 'contact.info2_subtext', 'ორშაბათი – პარასკევი, 9:00 – 17:00 EST'),
('ka', 'contact', 'contact.info3_title', 'საფოსტო მისამართი'),
('ka', 'contact', 'contact.info3_detail', '123 Church Street, Suite 100'),
('ka', 'contact', 'contact.info3_subtext', 'Boston, MA 02118'),
('ka', 'contact', 'contact.info4_title', 'სამუშაო საათები'),
('ka', 'contact', 'contact.info4_detail', 'ორშაბათი – პარასკევი: 9:00 – 17:00 EST'),
('ka', 'contact', 'contact.info4_subtext', 'დახურულია მართლმადიდებლური დიდი დღესასწაულების დღეებში');

-- Demo CTA
INSERT IGNORE INTO ui_translations (lang_code, namespace, translation_key, translation_text) VALUES
('ka', 'contact', 'contact.demo_title', 'დაგეგმეთ დემონსტრაცია'),
('ka', 'contact', 'contact.demo_desc', 'ნახეთ Orthodox Metrics მოქმედებაში თქვენი სამრევლოსთვის პერსონალიზებული პრეზენტაციით.'),
('ka', 'contact', 'contact.demo_button', 'დაჯავშნეთ დემო ზარი');

-- FAQ
INSERT IGNORE INTO ui_translations (lang_code, namespace, translation_key, translation_text) VALUES
('ka', 'contact', 'contact.faq_title', 'ხშირი კითხვები'),
('ka', 'contact', 'contact.faq_subtitle', 'სწრაფი პასუხები კითხვებზე, რომლებიც შეიძლება გქონდეთ'),
('ka', 'contact', 'contact.faq1_q', 'რამდენი დრო სჭირდება დაწყებას?'),
('ka', 'contact', 'contact.faq1_a', 'სამრევლოების უმეტესობა 1–2 კვირაში იწყებს მუშაობას. ჩვენ უზრუნველვყოფთ ადაპტაციის მხარდაჭერას საწყისი კონფიგურაციის დროს.'),
('ka', 'contact', 'contact.faq2_q', 'გთავაზობთ თუ არა არსებული ჩანაწერების ციფრულიზაციაში დახმარებას?'),
('ka', 'contact', 'contact.faq2_a', 'დიახ! შეგვიძლია დაგაკავშიროთ პროფესიონალურ ციფრულიზაციის სერვისებთან ან გავუძღვეთ თქვენს გუნდს პროცესში.'),
('ka', 'contact', 'contact.faq3_q', 'ჩემი მონაცემები უსაფრთხოა?'),
('ka', 'contact', 'contact.faq3_a', 'აბსოლუტურად. ვიყენებთ საბანკო დონის დაშიფვრას, რეგულარულ სარეზერვო ასლებს და ვიცავთ მონაცემთა დაცვის ყველა რეგულაციას.'),
('ka', 'contact', 'contact.faq4_q', 'შემიძლია ვცადო ყიდვამდე?'),
('ka', 'contact', 'contact.faq4_a', 'დიახ, გთავაზობთ 30-დღიან უფასო საცდელ პერიოდს ყველა ფუნქციაზე სრული წვდომით.');
