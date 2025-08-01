import docBot from './omai-doc-bot';
import apiGuardian from './omai-api-guardian';
import schemaMapper from './omai-schema-mapper';
import refactor from './omai-refactor';

export const agents = [
  docBot,
  apiGuardian,
  schemaMapper,
  refactor
];

export default agents; 