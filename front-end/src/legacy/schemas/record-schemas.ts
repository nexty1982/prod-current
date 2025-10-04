/**
 * Orthodox Metrics - Church Record Schemas
 * Predefined schemas for Baptism, Marriage, and Funeral records
 */

import { 
  RecordSchema, 
  RecordField, 
  ChurchRecord,
  DEFAULT_PALETTES,
} from '../types/church-records-advanced.types';

/**
 * Baptism Record Schema
 */
export const BAPTISM_SCHEMA: RecordSchema = {
  recordType: 'baptism',
  title: 'Baptism Record',
  description: 'Complete baptism record with personal details, sponsors, and ceremony information',
  sections: [
    {
      id: 'personal',
      title: 'Personal Information',
      fields: ['fullName', 'birthDate', 'birthPlace', 'gender', 'parents']
    },
    {
      id: 'ceremony',
      title: 'Baptism Ceremony',
      fields: ['baptismDate', 'celebrant', 'church', 'sponsors', 'notes']
    },
    {
      id: 'registration',
      title: 'Registration Details',
      fields: ['registrationNumber', 'bookPage', 'registrationDate']
    }
  ],
  requiredFields: ['fullName', 'birthDate', 'baptismDate', 'celebrant', 'registrationNumber'],
  defaultColors: {
    fullName: DEFAULT_PALETTES[0].colors.primary,
    baptismDate: DEFAULT_PALETTES[0].colors.accent,
    celebrant: DEFAULT_PALETTES[0].colors.secondary,
    sponsors: DEFAULT_PALETTES[0].colors.success,
  }
};

/**
 * Marriage Record Schema
 */
export const MARRIAGE_SCHEMA: RecordSchema = {
  recordType: 'marriage',
  title: 'Marriage Record',
  description: 'Complete marriage record with bride and groom details, witnesses, and ceremony information',
  sections: [
    {
      id: 'bride',
      title: 'Bride Information',
      fields: ['brideName', 'brideBirthDate', 'brideBirthPlace', 'brideParents', 'bridePreviousMarriage']
    },
    {
      id: 'groom',
      title: 'Groom Information',
      fields: ['groomName', 'groomBirthDate', 'groomBirthPlace', 'groomParents', 'groomPreviousMarriage']
    },
    {
      id: 'ceremony',
      title: 'Marriage Ceremony',
      fields: ['marriageDate', 'celebrant', 'church', 'witnesses', 'notes']
    },
    {
      id: 'registration',
      title: 'Registration Details',
      fields: ['registrationNumber', 'bookPage', 'registrationDate']
    }
  ],
  requiredFields: ['brideName', 'groomName', 'marriageDate', 'celebrant', 'registrationNumber'],
  defaultColors: {
    brideName: DEFAULT_PALETTES[1].colors.primary,
    groomName: DEFAULT_PALETTES[1].colors.secondary,
    marriageDate: DEFAULT_PALETTES[1].colors.accent,
    celebrant: DEFAULT_PALETTES[1].colors.info,
    witnesses: DEFAULT_PALETTES[1].colors.success,
  }
};

/**
 * Funeral Record Schema
 */
export const FUNERAL_SCHEMA: RecordSchema = {
  recordType: 'funeral',
  title: 'Funeral Record',
  description: 'Complete funeral record with deceased details, family, and service information',
  sections: [
    {
      id: 'deceased',
      title: 'Deceased Information',
      fields: ['fullName', 'birthDate', 'deathDate', 'birthPlace', 'deathPlace', 'causeOfDeath']
    },
    {
      id: 'family',
      title: 'Family Information',
      fields: ['spouse', 'children', 'parents', 'siblings', 'nextOfKin']
    },
    {
      id: 'service',
      title: 'Funeral Service',
      fields: ['serviceDate', 'celebrant', 'church', 'cemetery', 'burialDate', 'notes']
    },
    {
      id: 'registration',
      title: 'Registration Details',
      fields: ['registrationNumber', 'bookPage', 'registrationDate']
    }
  ],
  requiredFields: ['fullName', 'deathDate', 'serviceDate', 'celebrant', 'registrationNumber'],
  defaultColors: {
    fullName: DEFAULT_PALETTES[0].colors.neutral,
    deathDate: DEFAULT_PALETTES[0].colors.error,
    serviceDate: DEFAULT_PALETTES[0].colors.warning,
    celebrant: DEFAULT_PALETTES[0].colors.secondary,
    cemetery: DEFAULT_PALETTES[0].colors.info,
  }
};

/**
 * Create default baptism record fields
 */
export const createBaptismRecord = (): RecordField[] => [
  // Personal Information
  {
    key: 'fullName',
    label: 'Full Name',
    value: '',
    type: 'text',
    editable: true,
    required: true,
    section: 'personal',
    placeholder: 'Enter full name of the baptized person'
  },
  {
    key: 'birthDate',
    label: 'Birth Date',
    value: null,
    type: 'date',
    editable: true,
    required: true,
    section: 'personal'
  },
  {
    key: 'birthPlace',
    label: 'Birth Place',
    value: '',
    type: 'text',
    editable: true,
    section: 'personal',
    placeholder: 'City, State/Province, Country'
  },
  {
    key: 'gender',
    label: 'Gender',
    value: '',
    type: 'select',
    editable: true,
    section: 'personal',
    options: ['Male', 'Female']
  },
  {
    key: 'parents',
    label: 'Parents',
    value: '',
    type: 'textarea',
    editable: true,
    section: 'personal',
    placeholder: 'Father: [Name]\nMother: [Name]'
  },
  
  // Ceremony Information
  {
    key: 'baptismDate',
    label: 'Baptism Date',
    value: null,
    type: 'date',
    editable: true,
    required: true,
    section: 'ceremony'
  },
  {
    key: 'celebrant',
    label: 'Celebrant',
    value: '',
    type: 'text',
    editable: true,
    required: true,
    section: 'ceremony',
    placeholder: 'Name of priest who performed baptism'
  },
  {
    key: 'church',
    label: 'Church',
    value: '',
    type: 'text',
    editable: true,
    section: 'ceremony',
    placeholder: 'Name of church where baptism took place'
  },
  {
    key: 'sponsors',
    label: 'Sponsors (Godparents)',
    value: '',
    type: 'textarea',
    editable: true,
    section: 'ceremony',
    placeholder: 'List all sponsors/godparents'
  },
  {
    key: 'notes',
    label: 'Additional Notes',
    value: '',
    type: 'textarea',
    editable: true,
    section: 'ceremony',
    placeholder: 'Any additional ceremony details or notes'
  },
  
  // Registration Details
  {
    key: 'registrationNumber',
    label: 'Registration Number',
    value: '',
    type: 'text',
    editable: true,
    required: true,
    section: 'registration',
    placeholder: 'Unique registration number'
  },
  {
    key: 'bookPage',
    label: 'Book/Page Reference',
    value: '',
    type: 'text',
    editable: true,
    section: 'registration',
    placeholder: 'Book number, page number'
  },
  {
    key: 'registrationDate',
    label: 'Registration Date',
    value: null,
    type: 'date',
    editable: true,
    section: 'registration'
  }
];

/**
 * Create default marriage record fields
 */
export const createMarriageRecord = (): RecordField[] => [
  // Bride Information
  {
    key: 'brideName',
    label: 'Bride Full Name',
    value: '',
    type: 'text',
    editable: true,
    required: true,
    section: 'bride',
    placeholder: 'Bride\'s full name'
  },
  {
    key: 'brideBirthDate',
    label: 'Bride Birth Date',
    value: null,
    type: 'date',
    editable: true,
    section: 'bride'
  },
  {
    key: 'brideBirthPlace',
    label: 'Bride Birth Place',
    value: '',
    type: 'text',
    editable: true,
    section: 'bride',
    placeholder: 'City, State/Province, Country'
  },
  {
    key: 'brideParents',
    label: 'Bride\'s Parents',
    value: '',
    type: 'textarea',
    editable: true,
    section: 'bride',
    placeholder: 'Father: [Name]\nMother: [Name]'
  },
  {
    key: 'bridePreviousMarriage',
    label: 'Bride Previous Marriage',
    value: false,
    type: 'boolean',
    editable: true,
    section: 'bride'
  },
  
  // Groom Information
  {
    key: 'groomName',
    label: 'Groom Full Name',
    value: '',
    type: 'text',
    editable: true,
    required: true,
    section: 'groom',
    placeholder: 'Groom\'s full name'
  },
  {
    key: 'groomBirthDate',
    label: 'Groom Birth Date',
    value: null,
    type: 'date',
    editable: true,
    section: 'groom'
  },
  {
    key: 'groomBirthPlace',
    label: 'Groom Birth Place',
    value: '',
    type: 'text',
    editable: true,
    section: 'groom',
    placeholder: 'City, State/Province, Country'
  },
  {
    key: 'groomParents',
    label: 'Groom\'s Parents',
    value: '',
    type: 'textarea',
    editable: true,
    section: 'groom',
    placeholder: 'Father: [Name]\nMother: [Name]'
  },
  {
    key: 'groomPreviousMarriage',
    label: 'Groom Previous Marriage',
    value: false,
    type: 'boolean',
    editable: true,
    section: 'groom'
  },
  
  // Ceremony Information
  {
    key: 'marriageDate',
    label: 'Marriage Date',
    value: null,
    type: 'date',
    editable: true,
    required: true,
    section: 'ceremony'
  },
  {
    key: 'celebrant',
    label: 'Celebrant',
    value: '',
    type: 'text',
    editable: true,
    required: true,
    section: 'ceremony',
    placeholder: 'Name of priest who performed marriage'
  },
  {
    key: 'church',
    label: 'Church',
    value: '',
    type: 'text',
    editable: true,
    section: 'ceremony',
    placeholder: 'Name of church where marriage took place'
  },
  {
    key: 'witnesses',
    label: 'Witnesses',
    value: '',
    type: 'textarea',
    editable: true,
    section: 'ceremony',
    placeholder: 'List all witnesses to the marriage'
  },
  {
    key: 'notes',
    label: 'Additional Notes',
    value: '',
    type: 'textarea',
    editable: true,
    section: 'ceremony',
    placeholder: 'Any additional ceremony details or notes'
  },
  
  // Registration Details
  {
    key: 'registrationNumber',
    label: 'Registration Number',
    value: '',
    type: 'text',
    editable: true,
    required: true,
    section: 'registration',
    placeholder: 'Unique registration number'
  },
  {
    key: 'bookPage',
    label: 'Book/Page Reference',
    value: '',
    type: 'text',
    editable: true,
    section: 'registration',
    placeholder: 'Book number, page number'
  },
  {
    key: 'registrationDate',
    label: 'Registration Date',
    value: null,
    type: 'date',
    editable: true,
    section: 'registration'
  }
];

/**
 * Create default funeral record fields
 */
export const createFuneralRecord = (): RecordField[] => [
  // Deceased Information
  {
    key: 'fullName',
    label: 'Full Name of Deceased',
    value: '',
    type: 'text',
    editable: true,
    required: true,
    section: 'deceased',
    placeholder: 'Full name of the deceased person'
  },
  {
    key: 'birthDate',
    label: 'Birth Date',
    value: null,
    type: 'date',
    editable: true,
    section: 'deceased'
  },
  {
    key: 'deathDate',
    label: 'Death Date',
    value: null,
    type: 'date',
    editable: true,
    required: true,
    section: 'deceased'
  },
  {
    key: 'birthPlace',
    label: 'Birth Place',
    value: '',
    type: 'text',
    editable: true,
    section: 'deceased',
    placeholder: 'City, State/Province, Country'
  },
  {
    key: 'deathPlace',
    label: 'Death Place',
    value: '',
    type: 'text',
    editable: true,
    section: 'deceased',
    placeholder: 'City, State/Province, Country'
  },
  {
    key: 'causeOfDeath',
    label: 'Cause of Death',
    value: '',
    type: 'text',
    editable: true,
    section: 'deceased',
    placeholder: 'If known and appropriate to record'
  },
  
  // Family Information
  {
    key: 'spouse',
    label: 'Spouse',
    value: '',
    type: 'text',
    editable: true,
    section: 'family',
    placeholder: 'Name of surviving spouse'
  },
  {
    key: 'children',
    label: 'Children',
    value: '',
    type: 'textarea',
    editable: true,
    section: 'family',
    placeholder: 'List of children'
  },
  {
    key: 'parents',
    label: 'Parents',
    value: '',
    type: 'textarea',
    editable: true,
    section: 'family',
    placeholder: 'Father: [Name]\nMother: [Name]'
  },
  {
    key: 'siblings',
    label: 'Siblings',
    value: '',
    type: 'textarea',
    editable: true,
    section: 'family',
    placeholder: 'List of siblings'
  },
  {
    key: 'nextOfKin',
    label: 'Next of Kin',
    value: '',
    type: 'text',
    editable: true,
    section: 'family',
    placeholder: 'Primary contact person'
  },
  
  // Service Information
  {
    key: 'serviceDate',
    label: 'Funeral Service Date',
    value: null,
    type: 'date',
    editable: true,
    required: true,
    section: 'service'
  },
  {
    key: 'celebrant',
    label: 'Celebrant',
    value: '',
    type: 'text',
    editable: true,
    required: true,
    section: 'service',
    placeholder: 'Name of priest who performed service'
  },
  {
    key: 'church',
    label: 'Church',
    value: '',
    type: 'text',
    editable: true,
    section: 'service',
    placeholder: 'Name of church where service took place'
  },
  {
    key: 'cemetery',
    label: 'Cemetery',
    value: '',
    type: 'text',
    editable: true,
    section: 'service',
    placeholder: 'Name and location of cemetery'
  },
  {
    key: 'burialDate',
    label: 'Burial Date',
    value: null,
    type: 'date',
    editable: true,
    section: 'service'
  },
  {
    key: 'notes',
    label: 'Additional Notes',
    value: '',
    type: 'textarea',
    editable: true,
    section: 'service',
    placeholder: 'Any additional service details or notes'
  },
  
  // Registration Details
  {
    key: 'registrationNumber',
    label: 'Registration Number',
    value: '',
    type: 'text',
    editable: true,
    required: true,
    section: 'registration',
    placeholder: 'Unique registration number'
  },
  {
    key: 'bookPage',
    label: 'Book/Page Reference',
    value: '',
    type: 'text',
    editable: true,
    section: 'registration',
    placeholder: 'Book number, page number'
  },
  {
    key: 'registrationDate',
    label: 'Registration Date',
    value: null,
    type: 'date',
    editable: true,
    section: 'registration'
  }
];

/**
 * Get schema by record type
 */
export const getRecordSchema = (recordType: string): RecordSchema => {
  switch (recordType) {
    case 'baptism':
      return BAPTISM_SCHEMA;
    case 'marriage':
      return MARRIAGE_SCHEMA;
    case 'funeral':
      return FUNERAL_SCHEMA;
    default:
      throw new Error(`Unknown record type: ${recordType}`);
  }
};

/**
 * Create record with default fields
 */
export const createRecordWithFields = (recordType: string): ChurchRecord => {
  let fields: RecordField[] = [];
  
  switch (recordType) {
    case 'baptism':
      fields = createBaptismRecord();
      break;
    case 'marriage':
      fields = createMarriageRecord();
      break;
    case 'funeral':
      fields = createFuneralRecord();
      break;
    default:
      throw new Error(`Unknown record type: ${recordType}`);
  }
  
  const schema = getRecordSchema(recordType);
  
  return {
    id: `temp-${Date.now()}`,
    recordType: recordType as any,
    fields,
    metadata: {
      churchId: 0,
      createdBy: 0,
      createdAt: new Date(),
      status: 'draft',
      version: 1,
    },
    colorOverrides: { ...schema.defaultColors },
    tags: [],
  };
};
