import { apiClient } from './index';

export interface Memory {
  id: number;
  title: string;
  content: string;
  category: 'instruction' | 'preference' | 'context' | 'rule' | 'fact' | 'procedure' | 'note';
  priority: 'critical' | 'high' | 'medium' | 'low';
  tags: string[];
  is_active: boolean;
  access_level: 'private' | 'team' | 'admin' | 'global';
  usage_count: number;
  created_at: string;
  updated_at: string;
  last_accessed_at?: string;
  expires_at?: string;
  collections: string[];
}

export interface MemoryFilters {
  category?: string;
  priority?: string;
  tags?: string[];
  search?: string;
  is_active?: boolean;
  access_level?: string;
  collection_id?: number;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
}

export interface CreateMemoryData {
  title: string;
  content: string;
  category?: Memory['category'];
  priority?: Memory['priority'];
  tags?: string[];
  access_level?: Memory['access_level'];
  context_data?: object;
  expires_at?: string;
  collection_ids?: number[];
}

export interface UpdateMemoryData extends Partial<CreateMemoryData> {
  is_active?: boolean;
}

export interface MemoriesResponse {
  memories: Memory[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

class MemoriesAPI {
  // Get all memories with filters
  getAll = (filters: MemoryFilters = {}): Promise<{ success: boolean; data: MemoriesResponse }> => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(`${key}[]`, v.toString()));
        } else {
          params.append(key, value.toString());
        }
      }
    });

    return apiClient.get(`/omai/memories?${params.toString()}`);
  };

  // Get specific memory by ID
  getById = (id: number): Promise<{ success: boolean; data: Memory }> =>
    apiClient.get(`/omai/memories/${id}`);

  // Create new memory
  create = (data: CreateMemoryData): Promise<{ success: boolean; data: { id: number; message: string } }> =>
    apiClient.post('/omai/memories', data);

  // Update memory
  update = (id: number, data: UpdateMemoryData): Promise<{ success: boolean; message: string }> =>
    apiClient.put(`/omai/memories/${id}`, data);

  // Delete memory (soft delete by default)
  delete = (id: number, hardDelete = false): Promise<{ success: boolean; message: string }> =>
    apiClient.delete(`/omai/memories/${id}?hard_delete=${hardDelete}`);

  // Search memories
  search = (query: string, filters: Omit<MemoryFilters, 'search'> = {}): Promise<{ success: boolean; data: MemoriesResponse }> =>
    this.getAll({ ...filters, search: query });

  // Get memories by category
  getByCategory = (category: Memory['category'], filters: Omit<MemoryFilters, 'category'> = {}): Promise<{ success: boolean; data: MemoriesResponse }> =>
    this.getAll({ ...filters, category });

  // Get memories by priority
  getByPriority = (priority: Memory['priority'], filters: Omit<MemoryFilters, 'priority'> = {}): Promise<{ success: boolean; data: MemoriesResponse }> =>
    this.getAll({ ...filters, priority });

  // Get memories by tags
  getByTags = (tags: string[], filters: Omit<MemoryFilters, 'tags'> = {}): Promise<{ success: boolean; data: MemoriesResponse }> =>
    this.getAll({ ...filters, tags });

  // Bulk operations
  bulkUpdate = (ids: number[], data: UpdateMemoryData): Promise<{ success: boolean; message: string }> =>
    apiClient.put('/omai/memories/bulk', { ids, data });

  bulkDelete = (ids: number[], hardDelete = false): Promise<{ success: boolean; message: string }> =>
    apiClient.delete(`/omai/memories/bulk?hard_delete=${hardDelete}`, { data: { ids } });

  // Memory analytics
  getAnalytics = (): Promise<{ success: boolean; data: any }> =>
    apiClient.get('/omai/memories/analytics');

  // Export memories
  export = (filters: MemoryFilters = {}): Promise<{ success: boolean; data: any }> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });
    return apiClient.get(`/omai/memories/export?${params.toString()}`);
  };

  // Quick memory creation utilities
  quickCreateInstruction = (title: string, content: string): Promise<{ success: boolean; data: { id: number; message: string } }> =>
    this.create({
      title,
      content,
      category: 'instruction',
      priority: 'high',
      tags: ['quick-create', 'instruction']
    });

  quickCreatePreference = (title: string, content: string): Promise<{ success: boolean; data: { id: number; message: string } }> =>
    this.create({
      title,
      content,
      category: 'preference',
      priority: 'medium',
      tags: ['quick-create', 'preference']
    });

  quickCreateRule = (title: string, content: string): Promise<{ success: boolean; data: { id: number; message: string } }> =>
    this.create({
      title,
      content,
      category: 'rule',
      priority: 'critical',
      tags: ['quick-create', 'rule']
    });

  quickCreateFact = (title: string, content: string): Promise<{ success: boolean; data: { id: number; message: string } }> =>
    this.create({
      title,
      content,
      category: 'fact',
      priority: 'medium',
      tags: ['quick-create', 'fact']
    });
}

export const memoriesAPI = new MemoriesAPI();
export default memoriesAPI; 