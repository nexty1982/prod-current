// Constants for records-centralized features
// Placeholder implementations

export const FIELD_DEFINITIONS = {
  baptism: [
    { id: 'name', label: 'Name', type: 'text', required: true },
    { id: 'date', label: 'Date', type: 'date', required: true },
    { id: 'location', label: 'Location', type: 'text', required: false }
  ],
  marriage: [
    { id: 'brideName', label: 'Bride Name', type: 'text', required: true },
    { id: 'groomName', label: 'Groom Name', type: 'text', required: true },
    { id: 'date', label: 'Date', type: 'date', required: true },
    { id: 'location', label: 'Location', type: 'text', required: false }
  ],
  funeral: [
    { id: 'name', label: 'Name', type: 'text', required: true },
    { id: 'date', label: 'Date', type: 'date', required: true },
    { id: 'location', label: 'Location', type: 'text', required: false }
  ]
};

export const RECORD_TYPES = {
  BAPTISM: 'baptism',
  MARRIAGE: 'marriage',
  FUNERAL: 'funeral'
};
