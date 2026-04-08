export const BAPTISM_RECORDS_PREVIEW = [
  { id: 1, first_name: 'Paul', last_name: 'Harris', birth_date: '3/30/1952', reception_date: '2/4/1953', birthplace: 'New York', entry_type: 'Chrismation', sponsors: 'Katherine Owens; James Franklin', parents: 'Christopher Harris & Claire Franklin', clergy: 'Fr. Michael Taylor' },
  { id: 2, first_name: 'Mary', last_name: 'Fletcher', birth_date: '8/13/1969', reception_date: '5/8/1970', birthplace: 'Detroit', entry_type: 'Baptism', sponsors: 'Jonathan Thompson; Mary Powers', parents: 'Andrew Fletcher & Madeline Warren', clergy: 'Fr. George Davis' },
  { id: 3, first_name: 'Lydia', last_name: 'Richards', birth_date: '8/1/1950', reception_date: '2/10/1951', birthplace: 'Pittsburgh', entry_type: 'Baptism', sponsors: 'Luke Griffin; Olivia Richards', parents: 'Anna Richards & Laura Vaughn', clergy: 'Fr. Michael Brown' },
];

export const MARRIAGE_RECORDS_PREVIEW = [
  { id: 1, married_date_name: '11/20/2004 Emily Griffin', last_name: 'Nathan Bennett', parents_groom: 'Olivia Griffin & Joseph Bates', parents: 'Charlotte Bennett & Victoria Ellis', witnesses: 'Daniel Ingram; James Ulrich', marriage_license: 'ML-720644', clergy: 'Fr. John Ta' },
  { id: 2, married_date_name: '6/14/2008 Benjamin York', last_name: 'Mary Fletcher', parents_groom: 'James York & Naomi Ingram', parents: 'Rachel Fletcher & Elizabeth Quinn', witnesses: 'Samuel Underwood; Laura Ingram', marriage_license: 'ML-898207', clergy: 'Fr. Andrew' },
  { id: 3, married_date_name: '8/19/1992 Samuel Richards', last_name: 'Philis Bishop', parents_groom: 'Gabriella Richards & Sarah Knight', parents: 'Mary Bishop & Caroline Ortega', witnesses: 'Elizabeth Walker; Matthew Warren', marriage_license: 'ML-890870', clergy: 'Fr. Michae' },
  { id: 4, married_date_name: '9/3/1983 Mary Parker', last_name: 'Andrew Bennett', parents_groom: 'Katherine Parker & James Knight', parents: 'Joseph Bennett & Rebecca Reeves', witnesses: 'Laura Ingram; Luke Quinn', marriage_license: 'ML-735324', clergy: 'Fr. Andrew' },
];

export const FUNERAL_RECORDS_PREVIEW = [
  { id: 1, date_of_deceased: '11/1/2068', date_of_burial: '11/3/2068', first_name: 'Adam', last_name: 'Ingram', age: 77, clergy: 'Fr. Andrew Taylor', burial_location: 'Resurrection Cemetery' },
  { id: 2, date_of_deceased: '10/28/2040', date_of_burial: '11/5/2040', first_name: 'Joseph', last_name: 'Quinn', age: 53, clergy: 'Fr. Michael Brown', burial_location: 'St. George Cemetery' },
  { id: 3, date_of_deceased: '9/23/2010', date_of_burial: '9/26/2010', first_name: 'Sarah', last_name: 'Griffin', age: 73, clergy: 'Fr. John Moore', burial_location: 'St. George Cemetery' },
  { id: 4, date_of_deceased: '6/21/2040', date_of_burial: '6/26/2040', first_name: 'Peter', last_name: 'Walker', age: 44, clergy: 'Fr. Thomas Moore', burial_location: 'St. George Cemetery' },
  { id: 5, date_of_deceased: '1/10/2012', date_of_burial: '1/18/2012', first_name: 'Benjamin', last_name: 'Morris', age: 53, clergy: 'Fr. Peter Brown', burial_location: 'Resurrection Cemetery' },
  { id: 6, date_of_deceased: '3/24/2036', date_of_burial: '3/29/2036', first_name: 'Patrick', last_name: 'Powers', age: 50, clergy: 'Fr. Peter Taylor', burial_location: 'St. Nicholas Cemetery' },
];

export const DEFAULT_RECORD_SETTINGS = {
  logo: {
    enabled: false,
    column: 3,
    file: null as File | null,
    width: 200,
    height: 200,
    objectFit: 'contain' as const,
    opacity: 100,
    quadrant: 'middle' as const,
    horizontalPosition: 'center' as const,
  },
  calendar: {
    enabled: false,
    column: 2,
    quadrant: 'middle' as const,
    horizontalPosition: 'center' as const,
  },
  omLogo: {
    enabled: false,
    column: 4,
    width: 68,
    height: 68,
    quadrant: 'middle' as const,
    horizontalPosition: 'center' as const,
  },
  headerText: {
    fontFamily: 'Arial, sans-serif',
    fontSize: 16,
    fontWeight: 700,
    color: '#4C1D95',
    column: 1,
    position: 'above',
    quadrant: 'middle',
    horizontalPosition: 'center' as const,
  },
  recordImages: {
    column: 1,
    quadrant: 'middle',
    horizontalPosition: 'center' as const,
    width: 160,
    height: 160,
  },
  backgroundImage: {
    enabled: true,
    column: 0,
    images: [] as string[],
    currentIndex: 0,
    quadrant: 'middle' as const,
  },
  g1Image: {
    enabled: true,
    column: 0,
    images: [] as string[],
    currentIndex: 0,
    quadrant: 'middle' as const,
  },
  imageLibrary: {
    logo: [] as string[],
    omLogo: [] as string[],
    baptism: [] as string[],
    marriage: [] as string[],
    funeral: [] as string[],
    bg: [] as string[],
    g1: [] as string[],
    recordImage: [] as string[],
  },
  currentImageIndex: {
    logo: 0,
    omLogo: 0,
    baptism: 0,
    marriage: 0,
    funeral: 0,
    bg: 0,
    g1: 0,
    recordImage: 0,
  },
};

export const DEFAULT_THEME_TOKENS = {
  headerBg: '#1976d2',
  headerText: '#ffffff',
  rowOddBg: '#fafafa',
  rowEvenBg: '#ffffff',
  border: '#e0e0e0',
  accent: '#1976d2',
  cellText: '#212121',
};
