-- Phase 3B: About page translations for el, ru, ro, ka
-- 42 keys × 4 languages = 168 rows
-- Idempotent: uses INSERT IGNORE

INSERT IGNORE INTO ui_translations (lang_code, namespace, translation_key, translation_text) VALUES
-- ═══════════════════════════════════════════════════════════════
-- GREEK (el)
-- ═══════════════════════════════════════════════════════════════

-- Hero
('el', 'about', 'about.hero_badge', 'Η Ιστορία μας'),
('el', 'about', 'about.hero_title', 'Διατήρηση της Ορθόδοξης Κληρονομιάς μέσω Τεχνολογίας'),
('el', 'about', 'about.hero_subtitle', 'Το Orthodox Metrics ιδρύθηκε για να λύσει μια κρίσιμη πρόκληση: την προστασία αιώνων ιερών ενοριακών αρχείων, καθιστώντας τα προσβάσιμα για τις μελλοντικές γενιές.'),

-- Purpose
('el', 'about', 'about.purpose_badge', 'Ο Σκοπός μας'),
('el', 'about', 'about.purpose_title', 'Προστασία Ιερών Αρχείων για τις Μελλοντικές Γενιές'),
('el', 'about', 'about.purpose_p1', 'Πολλές Ορθόδοξες ενορίες εξακολουθούν να βασίζονται σε εύθραυστα, χειρόγραφα αρχεία που είναι ευάλωτα σε απώλεια, φθορά και το πέρασμα του χρόνου. Αυτά τα ιερά έγγραφα περιέχουν αιώνες πνευματικής κληρονομιάς.'),
('el', 'about', 'about.purpose_p2', 'Το Orthodox Metrics βοηθά τις ενορίες να ψηφιοποιήσουν, να διατηρήσουν και να διαχειριστούν με ασφάλεια αυτά τα αρχεία, διατηρώντας τον σεβασμό και την παράδοση που τους αξίζει.'),
('el', 'about', 'about.purpose_p3', 'Η πλατφόρμα μας φέρνει σύγχρονη τεχνολογία στην ιερή τήρηση αρχείων, εξασφαλίζοντας ότι οι μελλοντικές γενιές θα μπορούν να έχουν πρόσβαση και να τιμούν τα πνευματικά ορόσημα των κοινοτήτων τους.'),
('el', 'about', 'about.purpose_card1_title', 'Διατήρηση Ιστορίας'),
('el', 'about', 'about.purpose_card1_desc', 'Μετατρέψτε εύθραυστα χάρτινα αρχεία σε ασφαλή ψηφιακά αρχεία που θα διαρκέσουν για γενιές.'),
('el', 'about', 'about.purpose_card2_title', 'Εύκολη Πρόσβαση'),
('el', 'about', 'about.purpose_card2_desc', 'Αναζητήστε και ανακτήστε αρχεία αμέσως, κάνοντας τη διοίκηση της ενορίας πιο αποτελεσματική.'),
('el', 'about', 'about.purpose_card3_title', 'Ασφαλής Αποθήκευση'),
('el', 'about', 'about.purpose_card3_desc', 'Κρυπτογράφηση τραπεζικού επιπέδου εξασφαλίζει ότι τα ιερά σας αρχεία παραμένουν ιδιωτικά και προστατευμένα.'),

-- Highlights
('el', 'about', 'about.highlights_badge', 'Χαρακτηριστικά Πλατφόρμας'),
('el', 'about', 'about.highlights_title', 'Σχεδιασμένο με Γνώμονα την Ενορία σας'),
('el', 'about', 'about.highlights_subtitle', 'Κάθε χαρακτηριστικό είναι σχεδιασμένο να τιμά την Ορθόδοξη παράδοση, παρέχοντας σύγχρονη ευκολία και ασφάλεια.'),
('el', 'about', 'about.highlight1_title', 'Σχεδιασμένο για Ορθόδοξες Εκκλησίες'),
('el', 'about', 'about.highlight1_desc', 'Η πλατφόρμα ακολουθεί τις κατευθυντήριες γραμμές της Ορθόδοξης Εκκλησίας στην Αμερική, σεβόμενη την παράδοση ενώ αγκαλιάζει σύγχρονα εργαλεία.'),
('el', 'about', 'about.highlight2_title', 'Πολύγλωσση Υποστήριξη'),
('el', 'about', 'about.highlight2_desc', 'Πλήρης υποστήριξη για Ελληνικά, Ρωσικά, Ρουμανικά, Γεωργιανά και Αγγλικά, εξασφαλίζοντας προσβασιμότητα για ποικίλες Ορθόδοξες κοινότητες.'),
('el', 'about', 'about.highlight3_title', 'Ασφαλής Διαχείριση Αρχείων'),
('el', 'about', 'about.highlight3_desc', 'Τα ψηφιοποιημένα μυστηριακά αρχεία κρυπτογραφούνται και αποθηκεύονται με ασφάλεια εταιρικού επιπέδου, προστατεύοντας ευαίσθητα δεδομένα ενορίας.'),
('el', 'about', 'about.highlight4_title', 'Ημερολογιακός Προγραμματισμός'),
('el', 'about', 'about.highlight4_desc', 'Υποστηρίζει τόσο το Παλαιό όσο και το Νέο Ημερολόγιο με 8 λειτουργικά χρωματικά θέματα που ακολουθούν το εκκλησιαστικό ημερολόγιο.'),

-- Team
('el', 'about', 'about.team_badge', 'Η Ομάδα μας'),
('el', 'about', 'about.team_title', 'Με Ηγεσία Ορθόδοξων Χριστιανών'),
('el', 'about', 'about.team_subtitle', 'Η ομάδα μας κατανοεί τις μοναδικές ανάγκες των Ορθόδοξων ενοριών γιατί είμαστε μέρος της κοινότητας'),
('el', 'about', 'about.team1_name', 'π. Νικόλαος Parsells'),
('el', 'about', 'about.team1_role', 'Ιδρυτής & Πνευματικός Σύμβουλος'),
('el', 'about', 'about.team1_desc', '30 χρόνια υπηρεσίας σε Ορθόδοξες ενορίες, με πάθος για τη διατήρηση της πνευματικής μας κληρονομιάς.'),
('el', 'about', 'about.team2_name', 'Μαρία Κωνσταντίνου'),
('el', 'about', 'about.team2_role', 'Υπεύθυνη Προϊόντος'),
('el', 'about', 'about.team2_desc', 'Πρώην γραμματέας ενορίας με βαθιά κατανόηση της διαχείρισης εκκλησιαστικών αρχείων.'),
('el', 'about', 'about.team3_name', 'Δρ. Αλέξανδρος Πέτροφ'),
('el', 'about', 'about.team3_role', 'Διευθυντής Τεχνολογίας'),
('el', 'about', 'about.team3_desc', 'Ειδικός σε συστήματα βάσεων δεδομένων και τεχνολογίες ψηφιακής διατήρησης.'),

-- Values
('el', 'about', 'about.values_title', 'Οι Αξίες μας'),
('el', 'about', 'about.value1_title', 'Σεβασμός'),
('el', 'about', 'about.value1_desc', 'Προσεγγίζουμε τα ιερά αρχεία με τον σεβασμό και τη φροντίδα που τους αξίζει, τιμώντας αιώνες Ορθόδοξης παράδοσης.'),
('el', 'about', 'about.value2_title', 'Εμπιστοσύνη'),
('el', 'about', 'about.value2_desc', 'Τα δεδομένα της ενορίας σας είναι πολύτιμα. Τα προστατεύουμε με τα υψηλότερα πρότυπα ασφαλείας και πλήρη διαφάνεια.'),
('el', 'about', 'about.value3_title', 'Αριστεία'),
('el', 'about', 'about.value3_desc', 'Δεσμευόμαστε να χτίσουμε την καλύτερη δυνατή πλατφόρμα για Ορθόδοξες ενορίες, βελτιώνοντας και καινοτομώντας συνεχώς.'),

-- CTA
('el', 'about', 'about.cta_title', 'Ελάτε Μαζί μας στη Διατήρηση της Ορθόδοξης Κληρονομιάς'),
('el', 'about', 'about.cta_subtitle', 'Βοηθήστε μας να προστατέψουμε τα ιερά αρχεία της ενορίας σας για τις μελλοντικές γενιές'),
('el', 'about', 'about.cta_button', 'Επικοινωνήστε'),

-- ═══════════════════════════════════════════════════════════════
-- RUSSIAN (ru)
-- ═══════════════════════════════════════════════════════════════

-- Hero
('ru', 'about', 'about.hero_badge', 'Наша история'),
('ru', 'about', 'about.hero_title', 'Сохранение православного наследия с помощью технологий'),
('ru', 'about', 'about.hero_subtitle', 'Orthodox Metrics был основан для решения важнейшей задачи: защиты многовековых священных приходских записей и обеспечения их доступности для будущих поколений.'),

-- Purpose
('ru', 'about', 'about.purpose_badge', 'Наша цель'),
('ru', 'about', 'about.purpose_title', 'Защита священных записей для будущих поколений'),
('ru', 'about', 'about.purpose_p1', 'Многие православные приходы до сих пор полагаются на хрупкие рукописные записи, уязвимые для утраты, повреждения и воздействия времени. Эти священные документы содержат многовековое духовное наследие.'),
('ru', 'about', 'about.purpose_p2', 'Orthodox Metrics помогает приходам оцифровывать, сохранять и безопасно управлять этими записями, сохраняя благоговение и традиции, которых они заслуживают.'),
('ru', 'about', 'about.purpose_p3', 'Наша платформа привносит современные технологии в священное делопроизводство, обеспечивая доступ будущих поколений к духовным вехам своих общин.'),
('ru', 'about', 'about.purpose_card1_title', 'Сохранение истории'),
('ru', 'about', 'about.purpose_card1_desc', 'Превратите хрупкие бумажные записи в безопасные цифровые архивы, которые сохранятся на поколения.'),
('ru', 'about', 'about.purpose_card2_title', 'Лёгкий доступ'),
('ru', 'about', 'about.purpose_card2_desc', 'Мгновенный поиск и извлечение записей, повышающие эффективность приходского управления.'),
('ru', 'about', 'about.purpose_card3_title', 'Безопасное хранение'),
('ru', 'about', 'about.purpose_card3_desc', 'Шифрование банковского уровня гарантирует, что ваши священные записи останутся конфиденциальными и защищёнными.'),

-- Highlights
('ru', 'about', 'about.highlights_badge', 'Возможности платформы'),
('ru', 'about', 'about.highlights_title', 'Создано с заботой о вашем приходе'),
('ru', 'about', 'about.highlights_subtitle', 'Каждая функция разработана для почитания православной традиции, обеспечивая современное удобство и безопасность.'),
('ru', 'about', 'about.highlight1_title', 'Создано для православных церквей'),
('ru', 'about', 'about.highlight1_desc', 'Платформа следует рекомендациям Православной Церкви в Америке, уважая традиции и используя современные инструменты.'),
('ru', 'about', 'about.highlight2_title', 'Многоязычная поддержка'),
('ru', 'about', 'about.highlight2_desc', 'Полная поддержка греческого, русского, румынского, грузинского и английского языков для разнообразных православных общин.'),
('ru', 'about', 'about.highlight3_title', 'Безопасное управление записями'),
('ru', 'about', 'about.highlight3_desc', 'Оцифрованные записи таинств шифруются и хранятся с корпоративным уровнем безопасности, защищая конфиденциальные данные прихода.'),
('ru', 'about', 'about.highlight4_title', 'Календарное планирование'),
('ru', 'about', 'about.highlight4_desc', 'Поддержка как Старого, так и Нового календаря с 8 литургическими цветовыми темами, следующими церковному календарю.'),

-- Team
('ru', 'about', 'about.team_badge', 'Наша команда'),
('ru', 'about', 'about.team_title', 'Под руководством православных христиан'),
('ru', 'about', 'about.team_subtitle', 'Наша команда понимает уникальные потребности православных приходов, потому что мы — часть общины'),
('ru', 'about', 'about.team1_name', 'о. Николай Парселлс'),
('ru', 'about', 'about.team1_role', 'Основатель и духовный наставник'),
('ru', 'about', 'about.team1_desc', '30 лет служения в православных приходах, увлечён сохранением нашего духовного наследия.'),
('ru', 'about', 'about.team2_name', 'Мария Константину'),
('ru', 'about', 'about.team2_role', 'Руководитель продукта'),
('ru', 'about', 'about.team2_desc', 'Бывший секретарь прихода с глубоким пониманием управления церковными записями.'),
('ru', 'about', 'about.team3_name', 'Д-р Александр Петров'),
('ru', 'about', 'about.team3_role', 'Технический директор'),
('ru', 'about', 'about.team3_desc', 'Эксперт в области систем баз данных и технологий цифрового сохранения.'),

-- Values
('ru', 'about', 'about.values_title', 'Наши ценности'),
('ru', 'about', 'about.value1_title', 'Благоговение'),
('ru', 'about', 'about.value1_desc', 'Мы относимся к священным записям с уважением и заботой, которых они заслуживают, чтя многовековую православную традицию.'),
('ru', 'about', 'about.value2_title', 'Доверие'),
('ru', 'about', 'about.value2_desc', 'Данные вашего прихода бесценны. Мы защищаем их с высочайшими стандартами безопасности и полной прозрачностью.'),
('ru', 'about', 'about.value3_title', 'Совершенство'),
('ru', 'about', 'about.value3_desc', 'Мы стремимся создать лучшую платформу для православных приходов, постоянно совершенствуясь и внедряя инновации.'),

-- CTA
('ru', 'about', 'about.cta_title', 'Присоединяйтесь к сохранению православного наследия'),
('ru', 'about', 'about.cta_subtitle', 'Помогите нам защитить священные записи вашего прихода для будущих поколений'),
('ru', 'about', 'about.cta_button', 'Связаться с нами'),

-- ═══════════════════════════════════════════════════════════════
-- ROMANIAN (ro)
-- ═══════════════════════════════════════════════════════════════

-- Hero
('ro', 'about', 'about.hero_badge', 'Povestea noastră'),
('ro', 'about', 'about.hero_title', 'Păstrarea patrimoniului ortodox prin tehnologie'),
('ro', 'about', 'about.hero_subtitle', 'Orthodox Metrics a fost fondat pentru a rezolva o provocare critică: protejarea secolelor de registre parohiale sacre, făcându-le accesibile generațiilor viitoare.'),

-- Purpose
('ro', 'about', 'about.purpose_badge', 'Scopul nostru'),
('ro', 'about', 'about.purpose_title', 'Protejarea registrelor sacre pentru generațiile viitoare'),
('ro', 'about', 'about.purpose_p1', 'Multe parohii ortodoxe se bazează încă pe registre fragile, scrise de mână, vulnerabile la pierdere, deteriorare și trecerea timpului. Aceste documente sacre conțin secole de patrimoniu spiritual.'),
('ro', 'about', 'about.purpose_p2', 'Orthodox Metrics ajută parohiile să digitalizeze, să conserve și să gestioneze în siguranță aceste registre, menținând reverența și tradiția pe care le merită.'),
('ro', 'about', 'about.purpose_p3', 'Platforma noastră aduce tehnologia modernă în păstrarea registrelor sacre, asigurând că generațiile viitoare pot accesa și onora reperele spirituale ale comunităților lor.'),
('ro', 'about', 'about.purpose_card1_title', 'Păstrarea istoriei'),
('ro', 'about', 'about.purpose_card1_desc', 'Transformați registrele fragile de hârtie în arhive digitale sigure care vor dura generații.'),
('ro', 'about', 'about.purpose_card2_title', 'Acces facil'),
('ro', 'about', 'about.purpose_card2_desc', 'Căutați și recuperați registre instantaneu, eficientizând administrarea parohiei.'),
('ro', 'about', 'about.purpose_card3_title', 'Stocare securizată'),
('ro', 'about', 'about.purpose_card3_desc', 'Criptarea de nivel bancar asigură că registrele dumneavoastră sacre rămân private și protejate.'),

-- Highlights
('ro', 'about', 'about.highlights_badge', 'Caracteristici ale platformei'),
('ro', 'about', 'about.highlights_title', 'Construit cu parohia dumneavoastră în minte'),
('ro', 'about', 'about.highlights_subtitle', 'Fiecare caracteristică este concepută pentru a onora tradiția ortodoxă, oferind confort modern și securitate.'),
('ro', 'about', 'about.highlight1_title', 'Construit pentru biserici ortodoxe'),
('ro', 'about', 'about.highlight1_desc', 'Platforma urmează ghidurile stabilite de Biserica Ortodoxă din America, respectând tradiția și adoptând instrumente moderne.'),
('ro', 'about', 'about.highlight2_title', 'Suport multilingv'),
('ro', 'about', 'about.highlight2_desc', 'Suport complet pentru greacă, rusă, română, georgiană și engleză, asigurând accesibilitatea pentru comunități ortodoxe diverse.'),
('ro', 'about', 'about.highlight3_title', 'Gestionare securizată a registrelor'),
('ro', 'about', 'about.highlight3_desc', 'Registrele sacramentale digitalizate sunt criptate și stocate cu securitate de nivel enterprise, protejând datele sensibile ale parohiei.'),
('ro', 'about', 'about.highlight4_title', 'Programare calendaristică'),
('ro', 'about', 'about.highlight4_desc', 'Suport atât pentru calendarul vechi cât și cel nou, cu 8 teme de culori liturgice care urmează calendarul bisericesc.'),

-- Team
('ro', 'about', 'about.team_badge', 'Echipa noastră'),
('ro', 'about', 'about.team_title', 'Conduși de creștini ortodocși'),
('ro', 'about', 'about.team_subtitle', 'Echipa noastră înțelege nevoile unice ale parohiilor ortodoxe pentru că facem parte din comunitate'),
('ro', 'about', 'about.team1_name', 'Pr. Nicholas Parsells'),
('ro', 'about', 'about.team1_role', 'Fondator și consilier spiritual'),
('ro', 'about', 'about.team1_desc', '30 de ani de slujire în parohii ortodoxe, pasionat de păstrarea patrimoniului nostru spiritual.'),
('ro', 'about', 'about.team2_name', 'Maria Konstantinou'),
('ro', 'about', 'about.team2_role', 'Director de produs'),
('ro', 'about', 'about.team2_desc', 'Fostă secretară de parohie cu înțelegere profundă a gestionării registrelor bisericești.'),
('ro', 'about', 'about.team3_name', 'Dr. Alexander Petrov'),
('ro', 'about', 'about.team3_role', 'Director tehnic'),
('ro', 'about', 'about.team3_desc', 'Expert în sisteme de baze de date și tehnologii de conservare digitală.'),

-- Values
('ro', 'about', 'about.values_title', 'Valorile noastre'),
('ro', 'about', 'about.value1_title', 'Reverență'),
('ro', 'about', 'about.value1_desc', 'Abordăm registrele sacre cu respectul și grija pe care le merită, onorând secole de tradiție ortodoxă.'),
('ro', 'about', 'about.value2_title', 'Încredere'),
('ro', 'about', 'about.value2_desc', 'Datele parohiei dumneavoastră sunt prețioase. Le protejăm cu cele mai înalte standarde de securitate și transparență completă.'),
('ro', 'about', 'about.value3_title', 'Excelență'),
('ro', 'about', 'about.value3_desc', 'Suntem dedicați construirii celei mai bune platforme posibile pentru parohii ortodoxe, îmbunătățind și inovând constant.'),

-- CTA
('ro', 'about', 'about.cta_title', 'Alăturați-vă în păstrarea patrimoniului ortodox'),
('ro', 'about', 'about.cta_subtitle', 'Ajutați-ne să protejăm registrele sacre ale parohiei dumneavoastră pentru generațiile viitoare'),
('ro', 'about', 'about.cta_button', 'Contactați-ne'),

-- ═══════════════════════════════════════════════════════════════
-- GEORGIAN (ka)
-- ═══════════════════════════════════════════════════════════════

-- Hero
('ka', 'about', 'about.hero_badge', 'ჩვენი ისტორია'),
('ka', 'about', 'about.hero_title', 'მართლმადიდებლური მემკვიდრეობის შენარჩუნება ტექნოლოგიით'),
('ka', 'about', 'about.hero_subtitle', 'Orthodox Metrics დაარსდა კრიტიკული გამოწვევის გადასაჭრელად: საუკუნეების წმინდა სამრევლო ჩანაწერების დაცვა და მომავალი თაობებისთვის ხელმისაწვდომობის უზრუნველყოფა.'),

-- Purpose
('ka', 'about', 'about.purpose_badge', 'ჩვენი მიზანი'),
('ka', 'about', 'about.purpose_title', 'წმინდა ჩანაწერების დაცვა მომავალი თაობებისთვის'),
('ka', 'about', 'about.purpose_p1', 'ბევრი მართლმადიდებელი სამრევლო კვლავ ეყრდნობა მყიფე, ხელნაწერ ჩანაწერებს, რომლებიც დაუცველია დაკარგვის, დაზიანებისა და დროის გავლენისგან. ეს წმინდა დოკუმენტები შეიცავს საუკუნეების სულიერ მემკვიდრეობას.'),
('ka', 'about', 'about.purpose_p2', 'Orthodox Metrics ეხმარება სამრევლოებს ამ ჩანაწერების ციფრულიზაციაში, შენარჩუნებასა და უსაფრთხო მართვაში, პატივისცემისა და ტრადიციის შენარჩუნებით.'),
('ka', 'about', 'about.purpose_p3', 'ჩვენი პლატფორმა თანამედროვე ტექნოლოგიას მოაქვს წმინდა ჩანაწერების წარმოებაში, უზრუნველყოფს, რომ მომავალმა თაობებმა შეძლონ თავიანთი თემების სულიერ ეტაპებზე წვდომა და პატივისცემა.'),
('ka', 'about', 'about.purpose_card1_title', 'ისტორიის შენარჩუნება'),
('ka', 'about', 'about.purpose_card1_desc', 'მყიფე ქაღალდის ჩანაწერები გადააქციეთ უსაფრთხო ციფრულ არქივებად, რომლებიც თაობებს გაუძლებს.'),
('ka', 'about', 'about.purpose_card2_title', 'მარტივი წვდომა'),
('ka', 'about', 'about.purpose_card2_desc', 'მოიძიეთ და აღადგინეთ ჩანაწერები მყისიერად, სამრევლოს ადმინისტრირების ეფექტურობის ამაღლებით.'),
('ka', 'about', 'about.purpose_card3_title', 'უსაფრთხო შენახვა'),
('ka', 'about', 'about.purpose_card3_desc', 'საბანკო დონის დაშიფვრა უზრუნველყოფს, რომ თქვენი წმინდა ჩანაწერები კონფიდენციალური და დაცული დარჩეს.'),

-- Highlights
('ka', 'about', 'about.highlights_badge', 'პლატფორმის მახასიათებლები'),
('ka', 'about', 'about.highlights_title', 'შექმნილი თქვენი სამრევლოსთვის'),
('ka', 'about', 'about.highlights_subtitle', 'ყოველი ფუნქცია შექმნილია მართლმადიდებლური ტრადიციის პატივისცემით, თანამედროვე კომფორტისა და უსაფრთხოების უზრუნველყოფით.'),
('ka', 'about', 'about.highlight1_title', 'შექმნილი მართლმადიდებელი ეკლესიებისთვის'),
('ka', 'about', 'about.highlight1_desc', 'პლატფორმა მიყვება ამერიკის მართლმადიდებელი ეკლესიის მიერ დადგენილ სახელმძღვანელო პრინციპებს, პატივს სცემს ტრადიციას და იყენებს თანამედროვე ინსტრუმენტებს.'),
('ka', 'about', 'about.highlight2_title', 'მრავალენოვანი მხარდაჭერა'),
('ka', 'about', 'about.highlight2_desc', 'სრული მხარდაჭერა ბერძნული, რუსული, რუმინული, ქართული და ინგლისურისთვის, უზრუნველყოფს ხელმისაწვდომობას სხვადასხვა მართლმადიდებელი თემისთვის.'),
('ka', 'about', 'about.highlight3_title', 'ჩანაწერების უსაფრთხო მართვა'),
('ka', 'about', 'about.highlight3_desc', 'ციფრულიზებული საეკლესიო ჩანაწერები დაშიფრული და შენახულია კორპორატიული დონის უსაფრთხოებით, იცავს სამრევლოს მგრძნობიარე მონაცემებს.'),
('ka', 'about', 'about.highlight4_title', 'კალენდარული დაგეგმვა'),
('ka', 'about', 'about.highlight4_desc', 'მხარდაჭერა როგორც ძველი, ისე ახალი კალენდრისთვის 8 ლიტურგიკული ფერის თემით, რომლებიც მიყვება საეკლესიო კალენდარს.'),

-- Team
('ka', 'about', 'about.team_badge', 'ჩვენი გუნდი'),
('ka', 'about', 'about.team_title', 'მართლმადიდებელი ქრისტიანების ხელმძღვანელობით'),
('ka', 'about', 'about.team_subtitle', 'ჩვენი გუნდი ესმის მართლმადიდებელი სამრევლოების უნიკალურ საჭიროებებს, რადგან ჩვენ თემის ნაწილი ვართ'),
('ka', 'about', 'about.team1_name', 'მამა ნიკოლოზ პარსელსი'),
('ka', 'about', 'about.team1_role', 'დამფუძნებელი და სულიერი მრჩეველი'),
('ka', 'about', 'about.team1_desc', '30 წლის მსახურება მართლმადიდებელ სამრევლოებში, ჩვენი სულიერი მემკვიდრეობის შენარჩუნების ენთუზიასტი.'),
('ka', 'about', 'about.team2_name', 'მარია კონსტანტინუ'),
('ka', 'about', 'about.team2_role', 'პროდუქტის ხელმძღვანელი'),
('ka', 'about', 'about.team2_desc', 'ყოფილი სამრევლო მდივანი, საეკლესიო ჩანაწერების მართვის ღრმა ცოდნით.'),
('ka', 'about', 'about.team3_name', 'დოქტორი ალექსანდრე პეტროვი'),
('ka', 'about', 'about.team3_role', 'ტექნოლოგიების დირექტორი'),
('ka', 'about', 'about.team3_desc', 'მონაცემთა ბაზების სისტემებისა და ციფრული შენარჩუნების ტექნოლოგიების ექსპერტი.'),

-- Values
('ka', 'about', 'about.values_title', 'ჩვენი ღირებულებები'),
('ka', 'about', 'about.value1_title', 'პატივისცემა'),
('ka', 'about', 'about.value1_desc', 'წმინდა ჩანაწერებს მივუდგებით იმ პატივისცემითა და ზრუნვით, რასაც ისინი იმსახურებენ, საუკუნეების მართლმადიდებლური ტრადიციის პატივისცემით.'),
('ka', 'about', 'about.value2_title', 'ნდობა'),
('ka', 'about', 'about.value2_desc', 'თქვენი სამრევლოს მონაცემები ძვირფასია. ვიცავთ მათ უმაღლესი უსაფრთხოების სტანდარტებითა და სრული გამჭვირვალობით.'),
('ka', 'about', 'about.value3_title', 'სრულყოფილება'),
('ka', 'about', 'about.value3_desc', 'ჩვენ ვალდებულნი ვართ შევქმნათ საუკეთესო შესაძლო პლატფორმა მართლმადიდებელი სამრევლოებისთვის, მუდმივი გაუმჯობესებითა და ინოვაციით.'),

-- CTA
('ka', 'about', 'about.cta_title', 'შემოგვიერთდით მართლმადიდებლური მემკვიდრეობის შენარჩუნებაში'),
('ka', 'about', 'about.cta_subtitle', 'დაგვეხმარეთ თქვენი სამრევლოს წმინდა ჩანაწერების დაცვაში მომავალი თაობებისთვის'),
('ka', 'about', 'about.cta_button', 'დაგვიკავშირდით');
