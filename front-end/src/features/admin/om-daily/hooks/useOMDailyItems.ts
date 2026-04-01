/**
 * useOMDailyItems — shared hook for OM Daily item fetching and CRUD.
 * Used by Items page, Board page, and Dashboard.
 */

import { useCallback, useState } from 'react';
import type { DailyItem } from '../omDailyTypes';

interface UseOMDailyItemsOptions {
  autoFetch?: boolean;
}

export function useOMDailyItems(_opts?: UseOMDailyItemsOptions) {
  const [items, setItems] = useState<DailyItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchItems = useCallback(async (params?: {
    horizon?: string;
    status?: string;
    priority?: string;
    category?: string;
    due?: string;
    search?: string;
    sort?: string;
  }) => {
    try {
      setLoading(true);
      const qs = new URLSearchParams();
      if (params?.horizon) qs.set('horizon', params.horizon);
      if (params?.status) qs.set('status', params.status);
      if (params?.priority) qs.set('priority', params.priority);
      if (params?.category) qs.set('category', params.category);
      if (params?.due) qs.set('due', params.due);
      if (params?.search) qs.set('search', params.search);
      qs.set('sort', params?.sort || 'priority');

      const resp = await fetch(`/api/omai-daily/items?${qs}`, { credentials: 'include' });
      if (resp.ok) {
        const data = await resp.json();
        setItems(data.items || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const resp = await fetch('/api/omai-daily/categories', { credentials: 'include' });
      if (resp.ok) {
        const data = await resp.json();
        setCategories(data.categories || []);
      }
    } catch {}
  }, []);

  const saveItem = useCallback(async (form: Record<string, any>, editId?: number) => {
    const url = editId ? `/api/omai-daily/items/${editId}` : '/api/omai-daily/items';
    const method = editId ? 'PUT' : 'POST';
    const resp = await fetch(url, {
      method, credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (!resp.ok) throw new Error('Failed to save');
    return resp.json();
  }, []);

  const deleteItem = useCallback(async (id: number) => {
    const resp = await fetch(`/api/omai-daily/items/${id}`, { method: 'DELETE', credentials: 'include' });
    if (!resp.ok) throw new Error('Failed to delete');
  }, []);

  const updateStatus = useCallback(async (id: number, newStatus: string, extra?: Record<string, any>) => {
    const resp = await fetch(`/api/omai-daily/items/${id}/status`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, ...extra }),
    });
    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      const err = new Error(data.reasons?.join(' ') || data.error || 'Transition blocked');
      (err as any).response = { data };
      throw err;
    }
    return resp.json();
  }, []);

  const startWork = useCallback(async (id: number, branchType: string, agentTool: string) => {
    const resp = await fetch(`/api/omai-daily/items/${id}/start-work`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branch_type: branchType, agent_tool: agentTool }),
    });
    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to start work');
    }
    return resp.json();
  }, []);

  return {
    items, setItems, categories, loading,
    fetchItems, fetchCategories, saveItem, deleteItem, updateStatus, startWork,
  };
}
