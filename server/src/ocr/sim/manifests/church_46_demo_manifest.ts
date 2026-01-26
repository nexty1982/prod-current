/**
 * Simulation Manifest for Church 46 Demo Images
 * Provides pre-validated OCR results for known demo images
 */

export interface SimResultPayload {
  record_type: 'baptism' | 'marriage' | 'funeral';
  church: string;
  city: string;
  state: string;
  records: any[];
  confidence: number;
  source: 'simulation';
  ocrText?: string;
}

export const CHURCH_46_DEMO_FILES: Record<string, SimResultPayload> = {
  // Baptism - IMG_2025_03_05_10_44_50S.jpg
  'IMG_2025_03_05_10_44_50S.jpg': {
    record_type: 'baptism',
    church: 'SS Peter & Paul Orthodox Church',
    city: 'Manville',
    state: 'NJ',
    records: [
      {
        child_name: 'Patricia',
        date_of_birth: '1952-01-06',
        place_of_birth: 'Somerville, NJ',
        date_of_baptism: '1952-01-10',
        father_name: 'Michael Kapala',
        mother_name: 'Anna Kapala',
        godparents: ['Alexandra Mary', 'Helen Morosky'],
        clergy: 'Rev. Nicholas J. Kryshuk'
      },
      {
        child_name: 'Andrew Bruce',
        date_of_birth: '1951-12-16',
        place_of_birth: 'New Brunswick, NJ',
        date_of_baptism: '1952-01-13',
        father_name: 'Steven Picciolo',
        mother_name: 'Olga Picciolo',
        godparents: ['Dolores Barnaby', 'Robert Kalinowski'],
        clergy: 'Rev. Nicholas J. Kryshuk'
      }
    ],
    confidence: 0.98,
    source: 'simulation',
    ocrText: 'Simulated transcription for baptism records page. Multiple entries extracted with high confidence.'
  },

  // Baptism - IMG_2024_10_25_12_32_04S.jpg
  'IMG_2024_10_25_12_32_04S.jpg': {
    record_type: 'baptism',
    church: 'SS Peter & Paul Orthodox Church',
    city: 'Manville',
    state: 'NJ',
    records: [],
    confidence: 0.90,
    source: 'simulation',
    ocrText: 'Simulated transcription available for demo. Structured extraction pending.'
  },

  // Baptism - IMG_2025_03_05_11_04_55S.jpg
  'IMG_2025_03_05_11_04_55S.jpg': {
    record_type: 'baptism',
    church: 'SS Peter & Paul Orthodox Church',
    city: 'Manville',
    state: 'NJ',
    records: [],
    confidence: 0.90,
    source: 'simulation',
    ocrText: 'Simulated transcription available for demo. Structured extraction pending.'
  },

  // Baptism - IMG_2024_10_22_11_27_57S.jpg
  'IMG_2024_10_22_11_27_57S.jpg': {
    record_type: 'baptism',
    church: 'SS Peter & Paul Orthodox Church',
    city: 'Manville',
    state: 'NJ',
    records: [],
    confidence: 0.90,
    source: 'simulation',
    ocrText: 'Simulated transcription available for demo. Structured extraction pending.'
  },

  // Baptism - IMG_2024_10_22_11_29_28S.jpg
  'IMG_2024_10_22_11_29_28S.jpg': {
    record_type: 'baptism',
    church: 'SS Peter & Paul Orthodox Church',
    city: 'Manville',
    state: 'NJ',
    records: [],
    confidence: 0.90,
    source: 'simulation',
    ocrText: 'Simulated transcription available for demo. Structured extraction pending.'
  },

  // Marriage - IMG_2024_10_25_12_28_25S.jpg
  'IMG_2024_10_25_12_28_25S.jpg': {
    record_type: 'marriage',
    church: 'SS Peter & Paul Orthodox Church',
    city: 'Manville',
    state: 'NJ',
    records: [
      {
        groom_name: 'Frederick Theodore Gorbatuk Jr.',
        bride_name: 'Claire Mary Kormack',
        date_of_marriage: '1971-07-25',
        groom_age: 23,
        bride_age: 24,
        religion: 'Orthodox Christian',
        witnesses: ['Peter Gorbatuk', 'Donna Marie Mantush'],
        priest: 'Rev. Robert A. George Lewis',
        license_number: '58-71'
      },
      {
        groom_name: 'John Frank Charkowski',
        bride_name: 'Mary A. Kulina',
        date_of_marriage: '1972-07-29',
        religion: 'Orthodox',
        witnesses: ['Helen Kulina', 'Peter Hnatuk'],
        priest: 'Rev. Vadim A. Pogrebniak'
      }
    ],
    confidence: 0.97,
    source: 'simulation',
    ocrText: 'Simulated transcription for marriage records spread. Multiple entries extracted with high confidence.'
  },

  // Marriage - IMG_2024_10_22_11_39_09S.jpg
  'IMG_2024_10_22_11_39_09S.jpg': {
    record_type: 'marriage',
    church: 'SS Peter & Paul Orthodox Church',
    city: 'Manville',
    state: 'NJ',
    records: [],
    confidence: 0.90,
    source: 'simulation',
    ocrText: 'Simulated transcription available for demo. Structured extraction pending.'
  },

  // Funeral - IMG_2025_03_12_12_48_44S.jpg
  'IMG_2025_03_12_12_48_44S.jpg': {
    record_type: 'funeral',
    church: 'SS Peter & Paul Orthodox Church',
    city: 'Manville',
    state: 'NJ',
    records: [
      {
        decedent_name: 'John Mecinko',
        age: 68,
        date_of_death: '1988-01-29',
        date_of_burial: '1988-02-02',
        cause_of_death: 'Pulmonary embolism',
        cemetery: 'SS Peter & Paul Cemetery',
        priest: 'Fr. James Parcells'
      },
      {
        decedent_name: 'Anna Kael',
        age: 91,
        date_of_death: '1988-02-04',
        date_of_burial: '1988-02-11',
        priest: 'Fr. James Parcells',
        notes: 'NP – non-parishioner'
      }
    ],
    confidence: 0.96,
    source: 'simulation',
    ocrText: 'Simulated transcription for deaths spread. Multiple entries extracted with high confidence.'
  }
};
