import type { Express, Request, Response, NextFunction } from 'express';

export interface RouteRecord {
  id?: number;
  path: string;
  component: string;
  title: string | null;
  description?: string | null;
  layout?: string | null;
  roles: string[];
  is_active: boolean;
  order_index: number;
  tags?: string[] | null;
  meta?: Record<string, unknown> | null;
  created_at: Date | string;
  updated_at: Date | string;
  updated_by?: string | null | undefined;
}

export interface MenuNode {
  id?: number;
  parent_id?: number | null;
  key_name: string;
  label: string;
  icon?: string | null;
  path?: string | null;
  roles: string[];
  is_active: boolean;
  order_index: number;
  meta?: Record<string, unknown> | null;
  created_at: Date | string;
  updated_at: Date | string;
  updated_by?: string | null | undefined;
  children?: MenuNode[];
}

// Query params for listing
export interface RoutesListQuery {
  q?: string;
  is_active?: string;  // '1'|'0' or omitted for both
  limit?: string;
  offset?: string;
  sort?: 'path'|'component'|'title'|'order_index'|'updated_at';
  dir?: 'asc'|'desc';
}

export interface MenusListQuery extends Omit<RoutesListQuery, 'sort'> {
  sort?: 'label'|'key_name'|'order_index'|'updated_at';
}

// Reorder inputs
export interface ReorderMenusInput {
  items: { id: number; parent_id?: number; order_index: number }[];
}

// Custom error shapes for API friendly responses
export class RouterMenuStudioApiError extends Error {
  constructor(message: string, public statusCode: number, public field?: string) { 
    super(message); 
  }
}

// Helper middleware typing
export interface AuthenticatedRequest extends Request {
  user?: { userId: number; email: string; role: string; churchId?: number };
}

// Service shape
export type RouteOptions = Pick<RouteRecord, Exclude<keyof RouteRecord, 'id'|'created_at'|'updated_at'|'updated_by'>>;
export type MenuNodeOptions = Pick<MenuNode, Exclude<keyof MenuNode, 'id'|'created_at'|'updated_at'|'updated_by'|'children'>>;
export interface UpdateOptions { 
  updated_at?: string | Date; 
  updated_by?: string; 
}
