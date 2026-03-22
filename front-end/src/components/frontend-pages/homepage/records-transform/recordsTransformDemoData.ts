/**
 * Demo data for the Records Transform showcase on the homepage.
 * English-only for Phase 1. Each record type defines its label, year, image,
 * column schema, row data, and display mode.
 */

export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type RecordType = 'baptisms' | 'marriages' | 'funerals' | 'custom';
export type ViewerMode = 'standard' | 'difficult';

// ── Row types ──

export interface BaptismRow {
  firstName: string;
  lastName: string;
  birthDate: string;
  baptismDate: string;
  birthplace: string;
  godparents: string;
}

export interface MarriageRow {
  groomName: string;
  brideName: string;
  marriageDate: string;
  location: string;
  witnesses: string;
}

export interface FuneralRow {
  fullName: string;
  deathDate: string;
  burialDate: string;
  age: number;
  causeOfDeath: string;
}

export interface CustomRow {
  name: string;
  birthDate: string;
  baptismDate: string;
  parents: string;
  location: string;
  religion: string;
  sponsors: string;
  confidence: ConfidenceLevel;
}

// ── Card config ──

export interface RecordCard {
  type: RecordType;
  label: string;
  year: string;
  count: number;
  image: string;
  mode: ViewerMode;
  badge?: string;
}

export const recordCards: RecordCard[] = [
  { type: 'baptisms', label: 'Baptisms', year: '1969', count: 7, image: '/images/demo/baptism-sample.jpg', mode: 'standard' },
  { type: 'marriages', label: 'Marriages', year: '1989', count: 4, image: '/images/demo/marriage-sample.jpg', mode: 'standard' },
  { type: 'funerals', label: 'Funerals', year: '1988', count: 12, image: '/images/demo/death-sample.jpg', mode: 'standard' },
  { type: 'custom', label: 'Custom / Difficult', year: '1924', count: 9, image: '/images/demo/difficult-data.jpg', mode: 'difficult', badge: 'AI Enhanced' },
];

// ── Row data ──

export const baptismData: BaptismRow[] = [
  { firstName: 'Gerard', lastName: 'Verrelli', birthDate: '1969-05-26', baptismDate: '1969-10-19', birthplace: 'Somerville, NJ', godparents: 'John Sopchak, Elaine Macinko' },
  { firstName: 'David James', lastName: 'Riegler', birthDate: '1969-04-06', baptismDate: '1969-05-24', birthplace: 'Fall River, MA', godparents: 'David Branchick, Mary Jane Branchick' },
  { firstName: 'Tara Lynn', lastName: 'Kachek', birthDate: '1969-05-08', baptismDate: '1969-06-29', birthplace: 'Somerville, NJ', godparents: '\u2014' },
  { firstName: 'Vincent John', lastName: 'Zakrzewski', birthDate: '1969-06-30', baptismDate: '1969-07-14', birthplace: 'Harrisburg, PA', godparents: '\u2014' },
  { firstName: 'Sofia Melisa', lastName: 'Hortis', birthDate: '1969-02-17', baptismDate: '1969-07-19', birthplace: 'Somerville, NJ', godparents: 'Bruce Piscadio, Delores Barnosky' },
  { firstName: 'Watson Karl John', lastName: 'Early', birthDate: '1969-05-01', baptismDate: '1969-06-23', birthplace: 'Lebanon, PA', godparents: '\u2014' },
  { firstName: 'Nina Mary', lastName: 'Hazorek', birthDate: '1969-02-24', baptismDate: '1969-04-19', birthplace: 'Trenton, NJ', godparents: 'Terence John Murphy, Michelle Rober' },
];

export const marriageData: MarriageRow[] = [
  { groomName: 'Robert Lawrence Porchnik', brideName: 'Jill Ann Filippini', marriageDate: '1989-05-27', location: 'Manville, NJ', witnesses: 'Theresa Filippini, Mark Porchnik' },
  { groomName: 'Peter John Kulina', brideName: 'Shirley Terzowski', marriageDate: '1989-06-25', location: 'Manville, NJ', witnesses: 'Paul Kulin, Sharon Foster' },
  { groomName: 'John A. Ward', brideName: 'Stephanie Hanzel', marriageDate: '1989-09-03', location: 'Bridgewater, NJ', witnesses: 'Susan Pielish, Gregory Pacheus' },
  { groomName: 'Robert Michael Polito', brideName: 'Martha Lanza Melendez', marriageDate: '1989-10-22', location: 'River Edge, NJ', witnesses: 'John Polito, Christina Melendez' },
];

export const funeralData: FuneralRow[] = [
  { fullName: 'John Mucinko', deathDate: '1988-01-29', burialDate: '1988-02-02', age: 68, causeOfDeath: 'Pulmonary embolism' },
  { fullName: 'Anna Kisel', deathDate: '1988-02-04', burialDate: '1988-02-11', age: 91, causeOfDeath: '\u2014' },
  { fullName: 'Ksenia Fedoriv', deathDate: '1988-02-09', burialDate: '1988-02-12', age: 93, causeOfDeath: 'Cardiac arrest' },
  { fullName: 'Tatiana Shudik', deathDate: '1988-05-27', burialDate: '1988-05-31', age: 91, causeOfDeath: 'Lung cancer' },
  { fullName: 'John Suseck Sr.', deathDate: '1988-07-23', burialDate: '1988-07-25', age: 80, causeOfDeath: 'Brain hemorrhage' },
  { fullName: 'David James Riegler', deathDate: '1988-07-23', burialDate: '1988-07-28', age: 19, causeOfDeath: 'Subdural hematoma' },
  { fullName: 'Lepaszcz (Lillian) Gratzkovich', deathDate: '1988-08-05', burialDate: '1988-08-09', age: 84, causeOfDeath: '\u2014' },
  { fullName: 'Caroline E. Fechter', deathDate: '1988-08-18', burialDate: '1988-08-23', age: 57, causeOfDeath: 'Sudden cardiac arrest' },
  { fullName: 'Raymond Koslosky', deathDate: '1988-09-17', burialDate: '1988-09-21', age: 47, causeOfDeath: 'Asbestosis' },
  { fullName: 'George Kuzinec', deathDate: '1988-10-20', burialDate: '1988-10-24', age: 86, causeOfDeath: 'Metastatic lung cancer' },
  { fullName: 'Michael Sofko', deathDate: '1988-12-10', burialDate: '1988-12-14', age: 74, causeOfDeath: '\u2014' },
  { fullName: 'Michael Borna', deathDate: '1988-12-30', burialDate: '1989-01-05', age: 62, causeOfDeath: 'Cancer' },
];

export const customData: CustomRow[] = [
  { name: 'Elizabeth', birthDate: 'May 22', baptismDate: 'June 9', parents: 'John Vasiliev Marchisin & Helen', location: 'Halicia (Liskovo-Koshovchik)', religion: 'Orthodox', sponsors: 'Paul Shunko, Mary Yermak', confidence: 'high' },
  { name: 'Peter', birthDate: 'June 12', baptismDate: 'June 22', parents: 'John Vasiliev Vashuta & Julia', location: 'Aus. Sharikshansko, Kraina Bistra', religion: 'Orthodox', sponsors: 'John Wanczak, Anna Watrak', confidence: 'high' },
  { name: 'Joseph', birthDate: 'May 31', baptismDate: 'June 22', parents: 'Peter Petracek & Anna', location: 'Aus. Sharikshansko, Matissova', religion: 'Orthodox', sponsors: 'John Lukach, Susan Onufry', confidence: 'high' },
  { name: 'Julia', birthDate: 'June 12', baptismDate: 'June 19', parents: 'Dimitri Ivanov & Mary', location: 'Aus. Sharikshansko, Bodrunskal', religion: 'Orthodox', sponsors: 'Peter Kulina, Anastasia Kuzmick', confidence: 'medium' },
  { name: 'Vladimir', birthDate: 'April 10', baptismDate: 'July 6', parents: 'Sergei Ivanov & Mitka', location: 'Russia (Bereszansky region)', religion: 'Orthodox', sponsors: 'Vasily Vasilievich, Joseph Legedza', confidence: 'medium' },
  { name: 'Nicholas', birthDate: 'July 22', baptismDate: 'August 10', parents: 'Jacob Stefanov-Baranovsky & Nicholas', location: 'Halicia (Novy Sanch / Barnobec)', religion: 'Orthodox', sponsors: 'Maxim Hanyczak, Elena Wislocky', confidence: 'medium' },
  { name: 'Anna', birthDate: 'August 19', baptismDate: 'September 28', parents: 'Peter Ivanov Hromacko & Mary', location: 'Aus. Sharikshansko, Bodruzan', religion: 'Orthodox', sponsors: 'John Zimansky, Anna Hanyczak', confidence: 'high' },
  { name: 'Mary', birthDate: 'October 24', baptismDate: 'November 9', parents: 'Gregory Brown & Anna', location: 'Halicia (Krasna)', religion: 'Greek Catholic / Roman', sponsors: 'Michael Mazur, Mary Firose', confidence: 'low' },
  { name: 'Anthony', birthDate: 'January 9', baptismDate: 'December 25', parents: 'Ivan Ivanov Filipchuk & Pelagia Bartholomew', location: 'Russia (Horodnitsky region)', religion: 'Orthodox', sponsors: 'Alexey Zechinas, Agatha Ric', confidence: 'low' },
];
