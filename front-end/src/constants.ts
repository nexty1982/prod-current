export const APP_NAME = 'OrthodoxMetrics';
export const VERSION = '0.0.0-refactor';
export default { APP_NAME, VERSION };

// Field definitions for records
export const FIELD_DEFINITIONS = {
  BAPTISM: {
    personalInfo: ['firstName', 'lastName', 'middleName', 'gender', 'dateOfBirth'],
    baptismInfo: ['dateOfBaptism', 'placeOfBaptism', 'officiant', 'godparents'],
    parents: ['fatherName', 'motherName', 'parentsAddress'],
    notes: ['notes', 'specialCircumstances']
  },
  MARRIAGE: {
    groomInfo: ['groomFirstName', 'groomLastName', 'groomAge', 'groomOccupation'],
    brideInfo: ['brideFirstName', 'brideLastName', 'brideAge', 'brideOccupation'],
    ceremonyInfo: ['dateOfMarriage', 'placeOfMarriage', 'officiant', 'witnesses'],
    notes: ['notes', 'specialCircumstances']
  },
  FUNERAL: {
    personalInfo: ['firstName', 'lastName', 'dateOfBirth', 'dateOfDeath'],
    funeralInfo: ['dateOfFuneral', 'placeOfFuneral', 'officiant', 'burialLocation'],
    family: ['spouse', 'children', 'nextOfKin'],
    notes: ['notes', 'causeOfDeath']
  },
  CHRISMATION: {
    personalInfo: ['firstName', 'lastName', 'dateOfBirth', 'previousReligion'],
    chrismationInfo: ['dateOfChrismation', 'placeOfChrismation', 'officiant', 'sponsor'],
    preparation: ['preparationPeriod', 'instructorName', 'preparationNotes'],
    notes: ['notes', 'specialCircumstances']
  }
};

// Record types
export const RECORD_TYPES = {
  BAPTISM: 'baptism',
  MARRIAGE: 'marriage', 
  FUNERAL: 'funeral',
  CHRISMATION: 'chrismation'
};

// Theme colors for records
export const THEME_COLORS = {
  BAPTISM: '#2196f3',    // Blue
  MARRIAGE: '#e91e63',   // Pink  
  FUNERAL: '#9c27b0',    // Purple
  CHRISMATION: '#4caf50' // Green
};

// CSV Headers for export
export const CSV_HEADERS = {
  BAPTISM: ['First Name', 'Last Name', 'Date of Birth', 'Date of Baptism', 'Place', 'Officiant', 'Godparents'],
  MARRIAGE: ['Groom Name', 'Bride Name', 'Date of Marriage', 'Place', 'Officiant', 'Witnesses'],
  FUNERAL: ['Name', 'Date of Birth', 'Date of Death', 'Date of Funeral', 'Place', 'Officiant'],
  CHRISMATION: ['Name', 'Date of Birth', 'Date of Chrismation', 'Place', 'Officiant', 'Sponsor']
};
