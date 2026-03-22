-- Phase 3E: FAQ page + CTA translations (el, ru, ro, ka)
-- 27 keys × 4 languages = 108 rows
-- Idempotent: INSERT IGNORE

-- ═══════════════════════════════════════════════════════════════
-- GREEK (el)
-- ═══════════════════════════════════════════════════════════════

-- Page banner
INSERT IGNORE INTO ui_translations (lang_code, namespace, translation_key, translation_text) VALUES
('el', 'faq', 'faq.page_title', 'Συχνές Ερωτήσεις'),
('el', 'faq', 'faq.page_subtitle', 'Βρείτε απαντήσεις σε συχνές ερωτήσεις σχετικά με το Orthodox Metrics'),
('el', 'faq', 'faq.accordion_title', 'Συχνές Ερωτήσεις');

-- Q&A pairs
INSERT IGNORE INTO ui_translations (lang_code, namespace, translation_key, translation_text) VALUES
('el', 'faq', 'faq.q1', 'Τι περιλαμβάνεται στην αγορά μου;'),
('el', 'faq', 'faq.a1', 'Μια αρχική συμβουλευτική για συζήτηση σχετικά με την εκκλησία σας και πώς μπορούμε να σας βοηθήσουμε καλύτερα.'),
('el', 'faq', 'faq.q2', 'Εφάπαξ αγορά'),
('el', 'faq', 'faq.a2', 'Εφάπαξ αγορά για συνεχή χρήση καθώς η εκκλησία σας αναπτύσσεται.'),
('el', 'faq', 'faq.q3', 'Πώς λειτουργεί το ημερολόγιο του Orthodox Metrics;'),
('el', 'faq', 'faq.a3', 'Το ημερολόγιο χρησιμεύει ως αναφορά τόσο για το Παλαιό όσο και για το Νέο Ημερολόγιο λειτουργικών χρονοδιαγραμμάτων'),
('el', 'faq', 'faq.q4', 'Ποιο είναι το χρονοδιάγραμμα για την ολοκλήρωση των εκκλησιαστικών αρχείων;'),
('el', 'faq', 'faq.a4', 'Θα συνεργαστούμε μαζί σας, γενικά το χρονοδιάγραμμα εξαρτάται από τον αριθμό των αρχείων και πόσο χρειάζεστε να κάνουμε.'),
('el', 'faq', 'faq.q5', 'Αν χρειαστεί να εκτυπώσω πιστοποιητικό βάπτισης ή γάμου, μπορώ;'),
('el', 'faq', 'faq.a5', 'Φυσικά. Τα πιστοποιητικά δημιουργούνται δυναμικά και χρησιμοποιούν το πρότυπο που παρέχεται από τον προϊστάμενο της εκκλησίας σας.'),
('el', 'faq', 'faq.q6', 'Πώς μπορώ να λάβω υποστήριξη;'),
('el', 'faq', 'faq.a6', 'Το email είναι ιδανικό, αλλά μπορούμε να κλείσουμε ένα τηλεφώνημα αν προτιμάτε τη συνομιλία.');

-- Help section
INSERT IGNORE INTO ui_translations (lang_code, namespace, translation_key, translation_text) VALUES
('el', 'faq', 'faq.still_question', 'Έχετε ακόμα ερώτηση;'),
('el', 'faq', 'faq.email_us', 'Στείλτε μας email'),
('el', 'faq', 'faq.or', 'ή'),
('el', 'faq', 'faq.submit_ticket', 'υποβάλετε αίτημα');

-- CTA
INSERT IGNORE INTO ui_translations (lang_code, namespace, translation_key, translation_text) VALUES
('el', 'cta', 'cta.heading1', 'Ξεκινήστε σήμερα με την'),
('el', 'cta', 'cta.heading1_highlight', 'ενορία'),
('el', 'cta', 'cta.heading2', 'Εμείς θα χειριστούμε τα'),
('el', 'cta', 'cta.heading2_highlight', 'αρχεία'),
('el', 'cta', 'cta.subtitle', 'Γίνετε πρώτος χρήστης και βοηθήστε στη δημιουργία μιας πλατφόρμας μετρικών Ορθόδοξης Εκκλησίας!'),
('el', 'cta', 'cta.btn_register', 'Εγγράψτε την Εκκλησία σας'),
('el', 'cta', 'cta.btn_info', 'Ζητήστε Πληροφορίες');

-- ═══════════════════════════════════════════════════════════════
-- RUSSIAN (ru)
-- ═══════════════════════════════════════════════════════════════

-- Page banner
INSERT IGNORE INTO ui_translations (lang_code, namespace, translation_key, translation_text) VALUES
('ru', 'faq', 'faq.page_title', 'Часто задаваемые вопросы'),
('ru', 'faq', 'faq.page_subtitle', 'Найдите ответы на частые вопросы о Orthodox Metrics'),
('ru', 'faq', 'faq.accordion_title', 'Часто задаваемые вопросы');

-- Q&A pairs
INSERT IGNORE INTO ui_translations (lang_code, namespace, translation_key, translation_text) VALUES
('ru', 'faq', 'faq.q1', 'Что входит в мою покупку?'),
('ru', 'faq', 'faq.a1', 'Первичная консультация для обсуждения вашего храма и того, как мы можем лучше всего помочь вам.'),
('ru', 'faq', 'faq.q2', 'Единовременная покупка'),
('ru', 'faq', 'faq.a2', 'Единовременная покупка для непрерывного использования по мере роста вашего храма.'),
('ru', 'faq', 'faq.q3', 'Как работает календарь Orthodox Metrics?'),
('ru', 'faq', 'faq.a3', 'Календарь служит справочником как для Старого, так и для Нового литургического календаря'),
('ru', 'faq', 'faq.q4', 'Каковы сроки завершения оформления церковных записей?'),
('ru', 'faq', 'faq.a4', 'Мы будем работать с вами, в целом сроки зависят от количества записей и от того, сколько вам нужно от нас.'),
('ru', 'faq', 'faq.q5', 'Могу ли я распечатать свидетельство о крещении или венчании?'),
('ru', 'faq', 'faq.a5', 'Конечно. Свидетельства генерируются динамически и используют шаблон, предоставленный главой вашего храма.'),
('ru', 'faq', 'faq.q6', 'Как получить поддержку?'),
('ru', 'faq', 'faq.a6', 'Электронная почта — идеальный вариант, но мы можем назначить звонок, если вы предпочитаете разговор.');

-- Help section
INSERT IGNORE INTO ui_translations (lang_code, namespace, translation_key, translation_text) VALUES
('ru', 'faq', 'faq.still_question', 'Остались вопросы?'),
('ru', 'faq', 'faq.email_us', 'Напишите нам'),
('ru', 'faq', 'faq.or', 'или'),
('ru', 'faq', 'faq.submit_ticket', 'отправьте заявку');

-- CTA
INSERT IGNORE INTO ui_translations (lang_code, namespace, translation_key, translation_text) VALUES
('ru', 'cta', 'cta.heading1', 'Начните сегодня с вашим'),
('ru', 'cta', 'cta.heading1_highlight', 'приходом'),
('ru', 'cta', 'cta.heading2', 'Мы позаботимся о'),
('ru', 'cta', 'cta.heading2_highlight', 'записях'),
('ru', 'cta', 'cta.subtitle', 'Станьте одним из первых пользователей и помогите создать платформу метрик Православной Церкви!'),
('ru', 'cta', 'cta.btn_register', 'Зарегистрируйте ваш храм'),
('ru', 'cta', 'cta.btn_info', 'Запросить информацию');

-- ═══════════════════════════════════════════════════════════════
-- ROMANIAN (ro)
-- ═══════════════════════════════════════════════════════════════

-- Page banner
INSERT IGNORE INTO ui_translations (lang_code, namespace, translation_key, translation_text) VALUES
('ro', 'faq', 'faq.page_title', 'Întrebări Frecvente'),
('ro', 'faq', 'faq.page_subtitle', 'Găsiți răspunsuri la întrebările frecvente despre Orthodox Metrics'),
('ro', 'faq', 'faq.accordion_title', 'Întrebări Frecvente');

-- Q&A pairs
INSERT IGNORE INTO ui_translations (lang_code, namespace, translation_key, translation_text) VALUES
('ro', 'faq', 'faq.q1', 'Ce este inclus în achiziția mea?'),
('ro', 'faq', 'faq.a1', 'O consultare inițială pentru o discuție despre biserica dumneavoastră și cum vă putem ajuta cel mai bine.'),
('ro', 'faq', 'faq.q2', 'Achiziție unică'),
('ro', 'faq', 'faq.a2', 'Achiziție unică pentru utilizare continuă pe măsură ce biserica dumneavoastră crește.'),
('ro', 'faq', 'faq.q3', 'Cum funcționează calendarul Orthodox Metrics?'),
('ro', 'faq', 'faq.a3', 'Calendarul servește ca referință atât pentru calendarul liturgic vechi, cât și pentru cel nou'),
('ro', 'faq', 'faq.q4', 'Care este termenul pentru completarea registrelor bisericești?'),
('ro', 'faq', 'faq.a4', 'Vom lucra cu dumneavoastră, în general termenul depinde de cantitatea de registre și cât de mult aveți nevoie de noi.'),
('ro', 'faq', 'faq.q5', 'Dacă am nevoie să tipăresc un certificat de botez sau căsătorie, pot face asta?'),
('ro', 'faq', 'faq.a5', 'Desigur. Certificatele sunt generate dinamic și folosesc modelul furnizat de conducătorul bisericii dumneavoastră.'),
('ro', 'faq', 'faq.q6', 'Cum pot obține suport?'),
('ro', 'faq', 'faq.a6', 'Emailul este ideal, dar putem programa un apel dacă preferați să vorbiți.');

-- Help section
INSERT IGNORE INTO ui_translations (lang_code, namespace, translation_key, translation_text) VALUES
('ro', 'faq', 'faq.still_question', 'Mai aveți o întrebare?'),
('ro', 'faq', 'faq.email_us', 'Trimiteți-ne un email'),
('ro', 'faq', 'faq.or', 'sau'),
('ro', 'faq', 'faq.submit_ticket', 'trimiteți un tichet');

-- CTA
INSERT IGNORE INTO ui_translations (lang_code, namespace, translation_key, translation_text) VALUES
('ro', 'cta', 'cta.heading1', 'Începeți astăzi cu'),
('ro', 'cta', 'cta.heading1_highlight', 'parohia'),
('ro', 'cta', 'cta.heading2', 'Noi ne ocupăm de'),
('ro', 'cta', 'cta.heading2_highlight', 'registre'),
('ro', 'cta', 'cta.subtitle', 'Deveniți un utilizator timpuriu și ajutați la construirea unei platforme de metrici pentru Biserica Ortodoxă!'),
('ro', 'cta', 'cta.btn_register', 'Înregistrați-vă Biserica'),
('ro', 'cta', 'cta.btn_info', 'Solicitați Informații');

-- ═══════════════════════════════════════════════════════════════
-- GEORGIAN (ka)
-- ═══════════════════════════════════════════════════════════════

-- Page banner
INSERT IGNORE INTO ui_translations (lang_code, namespace, translation_key, translation_text) VALUES
('ka', 'faq', 'faq.page_title', 'ხშირად დასმული კითხვები'),
('ka', 'faq', 'faq.page_subtitle', 'იპოვეთ პასუხები Orthodox Metrics-ის შესახებ ხშირ კითხვებზე'),
('ka', 'faq', 'faq.accordion_title', 'ხშირად დასმული კითხვები');

-- Q&A pairs
INSERT IGNORE INTO ui_translations (lang_code, namespace, translation_key, translation_text) VALUES
('ka', 'faq', 'faq.q1', 'რა შედის ჩემს შენაძენში?'),
('ka', 'faq', 'faq.a1', 'საწყისი კონსულტაცია თქვენი ეკლესიის შესახებ განხილვისა და თქვენთვის საუკეთესო დახმარების გზების შესახებ.'),
('ka', 'faq', 'faq.q2', 'ერთჯერადი შენაძენი'),
('ka', 'faq', 'faq.a2', 'ერთჯერადი შენაძენი მუდმივი გამოყენებისთვის, თქვენი ეკლესიის ზრდასთან ერთად.'),
('ka', 'faq', 'faq.q3', 'როგორ მუშაობს Orthodox Metrics-ის კალენდარი?'),
('ka', 'faq', 'faq.a3', 'კალენდარი ემსახურება როგორც ძველი, ისე ახალი კალენდრის ლიტურგიკული ვადების საცნობარო წყაროს'),
('ka', 'faq', 'faq.q4', 'რა ვადაშია საეკლესიო ჩანაწერების დასრულება?'),
('ka', 'faq', 'faq.a4', 'ჩვენ თქვენთან ერთად ვიმუშავებთ, ზოგადად ვადა დამოკიდებულია ჩანაწერების რაოდენობასა და იმაზე, რამდენის გაკეთება გჭირდებათ ჩვენგან.'),
('ka', 'faq', 'faq.q5', 'თუ ნათლობის ან ქორწინების მოწმობის ბეჭდვა დამჭირდება, შემიძლია?'),
('ka', 'faq', 'faq.a5', 'რა თქმა უნდა. მოწმობები დინამიურად იქმნება და იყენებს თქვენი ეკლესიის მეთაურის მიერ მოწოდებულ შაბლონს.'),
('ka', 'faq', 'faq.q6', 'როგორ მივიღო მხარდაჭერა?'),
('ka', 'faq', 'faq.a6', 'ელ. ფოსტა იდეალურია, მაგრამ შეგვიძლია ზარის დაგეგმვა, თუ საუბარს ანიჭებთ უპირატესობას.');

-- Help section
INSERT IGNORE INTO ui_translations (lang_code, namespace, translation_key, translation_text) VALUES
('ka', 'faq', 'faq.still_question', 'ჯერ კიდევ გაქვთ კითხვა?'),
('ka', 'faq', 'faq.email_us', 'მოგვწერეთ'),
('ka', 'faq', 'faq.or', 'ან'),
('ka', 'faq', 'faq.submit_ticket', 'გამოგზავნეთ მოთხოვნა');

-- CTA
INSERT IGNORE INTO ui_translations (lang_code, namespace, translation_key, translation_text) VALUES
('ka', 'cta', 'cta.heading1', 'დაიწყეთ დღეს თქვენი'),
('ka', 'cta', 'cta.heading1_highlight', 'სამრევლოთი'),
('ka', 'cta', 'cta.heading2', 'ჩვენ ვიზრუნებთ'),
('ka', 'cta', 'cta.heading2_highlight', 'ჩანაწერებზე'),
('ka', 'cta', 'cta.subtitle', 'გახდით ერთ-ერთი პირველი მომხმარებელი და დაეხმარეთ მართლმადიდებელი ეკლესიის მეტრიკების პლატფორმის შექმნას!'),
('ka', 'cta', 'cta.btn_register', 'დაარეგისტრირეთ თქვენი ეკლესია'),
('ka', 'cta', 'cta.btn_info', 'მოითხოვეთ ინფორმაცია');
