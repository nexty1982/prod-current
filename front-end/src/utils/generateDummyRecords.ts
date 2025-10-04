// front-end/src/utils/generateDummyRecords.ts
// Multilingual dummy record generator for Orthodox church records

import { faker } from '@faker-js/faker';

// ─── LANGUAGE CONFIGURATIONS ─────────────────────────────────────────
interface LanguageConfig {
  locale: string;
  fakerLocale: string;
  names: {
    male: string[];
    female: string[];
    surnames: string[];
  };
  priests: string[];
  places: {
    cities: string[];
    countries: string[];
    cemeteries: string[];
  };
  notes: {
    baptism: string[];
    marriage: string[];
    funeral: string[];
  };
}

const LANGUAGE_CONFIGS: Record<string, LanguageConfig> = {
  en: {
    locale: 'en',
    fakerLocale: 'en_US',
    names: {
      male: [
        'Alexander', 'Constantine', 'Dimitrios', 'George', 'John', 'Michael', 'Nicholas', 'Peter', 'Stephen', 'Theodore',
        'Andrew', 'Anthony', 'Christopher', 'Daniel', 'Gabriel', 'Matthew', 'Paul', 'Philip', 'Thomas', 'Timothy'
      ],
      female: [
        'Alexandra', 'Catherine', 'Christina', 'Elena', 'Helen', 'Irene', 'Maria', 'Sophia', 'Theodora', 'Victoria',
        'Anna', 'Barbara', 'Despina', 'Georgia', 'Katherine', 'Margaret', 'Mary', 'Penelope', 'Sarah', 'Zoe'
      ],
      surnames: [
        'Papadopoulos', 'Dimitriou', 'Stavros', 'Kostas', 'Angelou', 'Petrov', 'Popov', 'Volkov', 'Kozlov', 'Smirnov',
        'Johnson', 'Smith', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'
      ]
    },
    priests: [
      'Father Dimitrios Papadopoulos', 'Father Nicholas Stavros', 'Father Andreas Kostas', 'Father Michael Angelou',
      'Father John Chrysostom', 'Father Christopher Theodorou', 'Father Stefan Milic', 'Father Gabriel Constantine',
      'Father Anthony Gregorios', 'Father Theodore Bartholomew', 'Father Paul Athanasios', 'Father Matthew Basil'
    ],
    places: {
      cities: [
        'Chicago', 'New York', 'Boston', 'Detroit', 'Pittsburgh', 'Cleveland', 'Philadelphia', 'Los Angeles',
        'San Francisco', 'Seattle', 'Portland', 'Denver', 'Atlanta', 'Miami', 'Houston', 'Dallas'
      ],
      countries: ['United States', 'Canada', 'Greece', 'Cyprus', 'Australia', 'United Kingdom'],
      cemeteries: [
        'Holy Cross Orthodox Cemetery', 'Saints Peter and Paul Cemetery', 'Holy Trinity Memorial Gardens',
        'Saint Nicholas Orthodox Cemetery', 'Orthodox Memorial Park', 'Sacred Heart Cemetery'
      ]
    },
    notes: {
      baptism: [
        'Beautiful ceremony with extended family present',
        'Traditional Orthodox baptism with triple immersion',
        'Celebrated with joy and thanksgiving',
        'Family traveled from overseas for the ceremony',
        'First grandchild baptism celebration',
        'Meaningful ceremony on feast day',
        'Community gathered to witness the sacrament',
        'Special blessing from visiting bishop'
      ],
      marriage: [
        'Traditional Orthodox wedding with dance of Isaiah',
        'Beautiful ceremony with crowning and blessing',
        'Celebration continued with traditional reception',
        'Family and friends gathered from many states',
        'Orthodox traditions maintained throughout',
        'Blessed union celebrated by entire community',
        'Meaningful ceremony with Byzantine chanting',
        'Traditional customs observed with reverence'
      ],
      funeral: [
        'Beloved community member remembered with love',
        'Longtime parish supporter and volunteer',
        'Dedicated church member for many years',
        'Devoted family patriarch/matriarch',
        'Active in church ministries and activities',
        'Remembered for kindness and generosity',
        'Faithful servant of the Orthodox faith',
        'Cherished member of the parish family'
      ]
    }
  },
  gr: {
    locale: 'gr',
    fakerLocale: 'el',
    names: {
      male: [
        'Αλέξανδρος', 'Κωνσταντίνος', 'Δημήτριος', 'Γεώργιος', 'Ιωάννης', 'Μιχαήλ', 'Νικόλαος', 'Πέτρος', 'Στέφανος', 'Θεόδωρος',
        'Ανδρέας', 'Αντώνιος', 'Χριστόφορος', 'Δανιήλ', 'Γαβριήλ', 'Ματθαίος', 'Παύλος', 'Φίλιππος', 'Θωμάς', 'Τιμόθεος'
      ],
      female: [
        'Αλεξάνδρα', 'Αικατερίνη', 'Χριστίνα', 'Ελένη', 'Ειρήνη', 'Μαρία', 'Σοφία', 'Θεοδώρα', 'Βικτωρία',
        'Άννα', 'Βαρβάρα', 'Δέσποινα', 'Γεωργία', 'Μαργαρίτα', 'Πηνελόπη', 'Ζωή', 'Ευγενία', 'Παρασκευή', 'Βασιλική'
      ],
      surnames: [
        'Παπαδόπουλος', 'Δημητρίου', 'Σταύρος', 'Κώστας', 'Αγγέλου', 'Νικολάου', 'Γεωργίου', 'Ιωάννου', 'Πέτρου', 'Μιχαήλου',
        'Κανελλόπουλος', 'Οικονόμου', 'Παπαδάκης', 'Παπαγεωργίου', 'Καραγιάννης', 'Στεφανόπουλος', 'Αντωνίου', 'Παναγιώτου'
      ]
    },
    priests: [
      'Πατήρ Δημήτριος Παπαδόπουλος', 'Πατήρ Νικόλαος Σταύρος', 'Πατήρ Ανδρέας Κώστας', 'Πατήρ Μιχαήλ Αγγέλου',
      'Πατήρ Ιωάννης Χρυσόστομος', 'Πατήρ Χριστόφορος Θεοδώρου', 'Πατήρ Γαβριήλ Κωνσταντίνου', 'Πατήρ Αντώνιος Γρηγόριος'
    ],
    places: {
      cities: [
        'Αθήνα', 'Θεσσαλονίκη', 'Πάτρα', 'Ηράκλειο', 'Λάρισα', 'Βόλος', 'Ιωάννινα', 'Καβάλα', 'Σέρρες', 'Κομοτηνή'
      ],
      countries: ['Ελλάδα', 'Κύπρος', 'Ηνωμένες Πολιτείες', 'Καναδάς', 'Αυστραλία', 'Γερμανία'],
      cemeteries: [
        'Ιερό Κοιμητήριο Αγίου Σταύρου', 'Κοιμητήριο Αγίων Πέτρου και Παύλου', 'Ιερός Κήπος Αγίας Τριάδος'
      ]
    },
    notes: {
      baptism: [
        'Όμορφη τελετή με την παρουσία της οικογένειας',
        'Παραδοσιακή ορθόδοξη βάπτιση με τριπλή βύθιση',
        'Γιορτάστηκε με χαρά και ευγνωμοσύνη',
        'Η οικογένεια ταξίδεψε από την Ελλάδα'
      ],
      marriage: [
        'Παραδοσιακός ορθόδοξος γάμος με χορό του Ησαΐα',
        'Όμορφη τελετή με στεφάνωμα και ευλογία',
        'Τήρηση των ορθόδοξων παραδόσεων',
        'Ευλογημένη ένωση στην κοινότητα'
      ],
      funeral: [
        'Αγαπητό μέλος της κοινότητας',
        'Πιστός υπηρέτης της ορθόδοξης πίστης',
        'Ενεργό μέλος της ενορίας επί πολλά χρόνια',
        'Αφοσιωμένος οικογενειάρχης'
      ]
    }
  },
  ru: {
    locale: 'ru',
    fakerLocale: 'ru',
    names: {
      male: [
        'Александр', 'Константин', 'Дмитрий', 'Георгий', 'Иоанн', 'Михаил', 'Николай', 'Петр', 'Стефан', 'Феодор',
        'Андрей', 'Антоний', 'Христофор', 'Даниил', 'Гавриил', 'Матфей', 'Павел', 'Филипп', 'Фома', 'Тимофей'
      ],
      female: [
        'Александра', 'Екатерина', 'Христина', 'Елена', 'Ирина', 'Мария', 'София', 'Феодора', 'Виктория',
        'Анна', 'Варвара', 'Деспина', 'Георгия', 'Маргарита', 'Пенелопа', 'Зоя', 'Евгения', 'Параскева', 'Василиса'
      ],
      surnames: [
        'Петров', 'Попов', 'Волков', 'Козлов', 'Смирнов', 'Иванов', 'Соколов', 'Лебедев', 'Козлов', 'Новиков',
        'Морозов', 'Петров', 'Волков', 'Соловьёв', 'Васильев', 'Зайцев', 'Павлов', 'Семёнов', 'Голубев', 'Виноградов'
      ]
    },
    priests: [
      'Отец Дмитрий Попов', 'Отец Николай Петров', 'Отец Андрей Волков', 'Отец Михаил Козлов',
      'Отец Иоанн Златоуст', 'Отец Христофор Феодоров', 'Отец Гавриил Константинов', 'Отец Антоний Григорий'
    ],
    places: {
      cities: [
        'Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Нижний Новгород', 'Казань', 'Челябинск', 'Омск'
      ],
      countries: ['Россия', 'Украина', 'Беларусь', 'Казахстан', 'США', 'Канада'],
      cemeteries: [
        'Святое кладбище Креста', 'Кладбище Святых Петра и Павла', 'Мемориальный сад Святой Троицы'
      ]
    },
    notes: {
      baptism: [
        'Красивая церемония в присутствии семьи',
        'Традиционное православное крещение с тройным погружением',
        'Отпраздновано с радостью и благодарностью',
        'Семья приехала из России'
      ],
      marriage: [
        'Традиционная православная свадьба с танцем Исайи',
        'Красивая церемония с венчанием и благословением',
        'Соблюдение православных традиций',
        'Благословенный союз в общине'
      ],
      funeral: [
        'Любимый член общины',
        'Верный служитель православной веры',
        'Активный член прихода в течение многих лет',
        'Преданный глава семьи'
      ]
    }
  },
  ro: {
    locale: 'ro',
    fakerLocale: 'ro',
    names: {
      male: [
        'Alexandru', 'Constantin', 'Dimitrie', 'Gheorghe', 'Ioan', 'Mihail', 'Nicolae', 'Petru', 'Ștefan', 'Teodor',
        'Andrei', 'Anton', 'Cristian', 'Daniel', 'Gabriel', 'Matei', 'Pavel', 'Filip', 'Toma', 'Timotei'
      ],
      female: [
        'Alexandra', 'Ecaterina', 'Cristina', 'Elena', 'Irina', 'Maria', 'Sofia', 'Teodora', 'Victoria',
        'Ana', 'Barbara', 'Despina', 'Georgiana', 'Margareta', 'Penelopa', 'Zoe', 'Eugenia', 'Parascheva', 'Vasilica'
      ],
      surnames: [
        'Popescu', 'Ionescu', 'Popa', 'Radu', 'Stoica', 'Stan', 'Dumitrescu', 'Gheorghiu', 'Constantinescu', 'Marin',
        'Moldovan', 'Cristea', 'Matei', 'Preda', 'Barbu', 'Ungureanu', 'Diaconu', 'Ștefănescu', 'Marinescu', 'Tudorache'
      ]
    },
    priests: [
      'Părintele Dimitrie Popescu', 'Părintele Nicolae Ionescu', 'Părintele Andrei Popa', 'Părintele Mihail Radu',
      'Părintele Ioan Gură de Aur', 'Părintele Cristian Teodor', 'Părintele Gabriel Constantin', 'Părintele Anton Grigorie'
    ],
    places: {
      cities: [
        'București', 'Cluj-Napoca', 'Timișoara', 'Iași', 'Constanța', 'Craiova', 'Brașov', 'Galați', 'Ploiești', 'Oradea'
      ],
      countries: ['România', 'Moldova', 'Statele Unite', 'Canada', 'Germania', 'Italia'],
      cemeteries: [
        'Cimitirul Sfintei Cruci', 'Cimitirul Sfinților Petru și Pavel', 'Grădina Memorială Sfintei Treimi'
      ]
    },
    notes: {
      baptism: [
        'Ceremonie frumoasă cu prezența familiei',
        'Botez ortodox tradițional cu tripla scufundare',
        'Sărbătorit cu bucurie și recunoștință',
        'Familia a venit din România'
      ],
      marriage: [
        'Nuntă ortodoxă tradițională cu dansul lui Isaia',
        'Ceremonie frumoasă cu încununare și binecuvântare',
        'Respectarea tradițiilor ortodoxe',
        'Uniune binecuvântată în comunitate'
      ],
      funeral: [
        'Membru iubit al comunității',
        'Servitor fidel al credinței ortodoxe',
        'Membru activ al parohiei de mulți ani',
        'Cap de familie devotat'
      ]
    }
  }
};

// ─── RECORD TYPES ─────────────────────────────────────────────────────
export type RecordType = 'baptism' | 'marriage' | 'funeral';
export type LanguageCode = 'en' | 'gr' | 'ru' | 'ro';

export interface BaptismRecord {
  person_name: string;
  date_performed: string;
  priest_name: string;
  birth_date: string;
  parents: string;
  sponsors: string;
  birthplace: string;
  notes: string;
}

export interface MarriageRecord {
  groom_name: string;
  bride_name: string;
  date_performed: string;
  priest_name: string;
  witnesses: string;
  marriage_license: string;
  notes: string;
}

export interface FuneralRecord {
  person_name: string;
  deceased_date: string;
  burial_date: string;
  priest_name: string;
  burial_location: string;
  age: number;
  notes: string;
}

export type GeneratedRecord = BaptismRecord | MarriageRecord | FuneralRecord;

// ─── GENERATOR FUNCTIONS ─────────────────────────────────────────────────────
function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function generatePersonName(config: LanguageConfig, gender: 'male' | 'female'): string {
  const firstName = getRandomElement(config.names[gender]);
  const surname = getRandomElement(config.names.surnames);
  return `${firstName} ${surname}`;
}

function generateDateInRange(startDays: number, endDays: number): string {
  const today = new Date();
  const randomDays = Math.floor(Math.random() * (endDays - startDays)) + startDays;
  const date = new Date(today.getTime() - randomDays * 24 * 60 * 60 * 1000);
  return date.toISOString().split('T')[0];
}

function generateMarriageLicense(): string {
  const states = ['IL', 'NY', 'CA', 'TX', 'FL', 'PA', 'OH', 'MI', 'GA', 'NC'];
  const year = new Date().getFullYear();
  const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
  const number = String(Math.floor(Math.random() * 999999)).padStart(6, '0');
  return `${getRandomElement(states)}-${year}-${month}-${number}`;
}

function generateBaptismRecord(config: LanguageConfig): BaptismRecord {
  const gender = Math.random() > 0.5 ? 'male' : 'female';
  const personName = generatePersonName(config, gender);
  const birthDate = generateDateInRange(30, 365); // Born 1 month to 1 year ago
  const baptismDate = generateDateInRange(7, 180); // Baptized 1 week to 6 months ago
  
  const fatherName = generatePersonName(config, 'male');
  const motherName = generatePersonName(config, 'female');
  const sponsorMale = generatePersonName(config, 'male');
  const sponsorFemale = generatePersonName(config, 'female');

  return {
    person_name: personName,
    date_performed: baptismDate,
    priest_name: getRandomElement(config.priests),
    birth_date: birthDate,
    parents: `${fatherName} and ${motherName}`,
    sponsors: `${sponsorMale} and ${sponsorFemale}`,
    birthplace: `${getRandomElement(config.places.cities)}, ${getRandomElement(config.places.countries)}`,
    notes: getRandomElement(config.notes.baptism)
  };
}

function generateMarriageRecord(config: LanguageConfig): MarriageRecord {
  const groomName = generatePersonName(config, 'male');
  const brideName = generatePersonName(config, 'female');
  const witnessMale = generatePersonName(config, 'male');
  const witnessFemale = generatePersonName(config, 'female');
  
  return {
    groom_name: groomName,
    bride_name: brideName,
    date_performed: generateDateInRange(30, 730), // Married 1 month to 2 years ago
    priest_name: getRandomElement(config.priests),
    witnesses: `${witnessMale} and ${witnessFemale}`,
    marriage_license: generateMarriageLicense(),
    notes: getRandomElement(config.notes.marriage)
  };
}

function generateFuneralRecord(config: LanguageConfig): FuneralRecord {
  const gender = Math.random() > 0.5 ? 'male' : 'female';
  const personName = generatePersonName(config, gender);
  const age = Math.floor(Math.random() * 60) + 40; // Age 40-99
  const deceasedDate = generateDateInRange(7, 365); // Died 1 week to 1 year ago
  const burialDate = new Date(new Date(deceasedDate).getTime() + Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000);
  
  return {
    person_name: personName,
    deceased_date: deceasedDate,
    burial_date: burialDate.toISOString().split('T')[0],
    priest_name: getRandomElement(config.priests),
    burial_location: getRandomElement(config.places.cemeteries),
    age: age,
    notes: getRandomElement(config.notes.funeral)
  };
}

// ─── MAIN GENERATOR FUNCTION ─────────────────────────────────────────────────────
export function generateDummyRecords(
  recordType: RecordType,
  language: LanguageCode,
  count: number
): GeneratedRecord[] {
  const config = LANGUAGE_CONFIGS[language];
  if (!config) {
    throw new Error(`Unsupported language: ${language}`);
  }

  const records: GeneratedRecord[] = [];
  
  for (let i = 0; i < count; i++) {
    let record: GeneratedRecord;
    
    switch (recordType) {
      case 'baptism':
        record = generateBaptismRecord(config);
        break;
      case 'marriage':
        record = generateMarriageRecord(config);
        break;
      case 'funeral':
        record = generateFuneralRecord(config);
        break;
      default:
        throw new Error(`Unsupported record type: ${recordType}`);
    }
    
    records.push(record);
  }
  
  return records;
}

// ─── UTILITY FUNCTIONS ─────────────────────────────────────────────────────
export function getLanguageDisplayName(language: LanguageCode): string {
  const names = {
    en: 'English',
    gr: 'Ελληνικά (Greek)',
    ru: 'Русский (Russian)',
    ro: 'Română (Romanian)'
  };
  return names[language];
}

export function getRecordTypeDisplayName(recordType: RecordType): string {
  const names = {
    baptism: 'Baptism Records',
    marriage: 'Marriage Records',
    funeral: 'Funeral Records'
  };
  return names[recordType];
}

export function generateFileName(recordType: RecordType, language: LanguageCode, count: number): string {
  return `${recordType}_records_${language}_${count}.json`;
}
