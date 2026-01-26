// Records types for records-centralized features
// Placeholder implementations

export interface RecordData {
  id: string;
  [key: string]: any;
}

export interface RecordFilters {
  search?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  [key: string]: any;
}

export interface UnifiedTableSchema {
  id: string;
  name: string;
  fields: Array<{
    id: string;
    name: string;
    type: string;
    required: boolean;
  }>;
}
