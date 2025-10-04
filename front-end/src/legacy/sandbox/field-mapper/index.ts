/**
 * Field Mapper Export Surface
 * Main entry point for the field mapper module
 */

// Export schemas and types
export * from './api/schemas';

// Export main components
export { FieldMapperTable } from './shared/ui/legacy/FieldMapperTable';

// Export demo page
export { default as FieldMapperDemoPage } from './pages/FieldMapperDemoPage';

// Export hooks for external integration
export {
  useKnownFields,
  useColumnSample,
  useFieldMapping,
  useSaveFieldMapping,
} from './api/queries';
