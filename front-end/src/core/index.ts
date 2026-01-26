// Core exports for records-centralized features
export const useSearchableFields = () => ({ searchableFields: [], setSearchableFields: () => { }, addSearchableField: () => { }, removeSearchableField: () => { } });
export const useSortableFields = () => ({ sortableFields: [], setSortableFields: () => { }, addSortableField: () => { }, removeSortableField: () => { } });
export const useRequiredFields = () => ({ requiredFields: [], setRequiredFields: () => { }, addRequiredField: () => { }, removeRequiredField: () => { } });
export const getCurrentTemplate = () => "default";
export const switchTemplate = (template) => console.log("Switching to template:", template);
export const useAvailableTables = () => ({ tables: [], isLoading: false, error: null, refetch: () => { } });
export const useTableSchema = (churchId, tableName) => ({ schema: null, loading: false, error: null });
export const useFieldDefinitions = (churchId, tableName) => ({ fields: [], loading: false, error: null });
export { useUnifiedRecords, useUnifiedRecordMutations } from "../features/records-centralized/components/records/useUnifiedRecords";

// Auth exports
export { AuthProvider, useAuth } from '../context/AuthContext';
export { checkAuth } from '../auth/authClient';
