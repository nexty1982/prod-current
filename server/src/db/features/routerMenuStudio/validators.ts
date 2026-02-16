import { z } from 'zod';
import type { RoutesListQuery, MenusListQuery, ReorderMenusInput } from './types';

export const RoutesListSchema = z.object({
  q: z.string().optional(),
  is_active: z.enum(['1','0']).optional(),
  limit: z.string().transform(s => Math.min(Math.max(parseInt(s) ?? 20, 1), 200)).optional(),
  offset: z.string().transform(s => Math.max(parseInt(s) ?? 0, 0)).optional(),
  sort: z.enum(['path','component','title','order_index','updated_at']).optional(),
  dir: z.enum(['asc','desc']).optional()
});

export const MenusListSchema = z.object({
  q: z.string().optional(),
  is_active: z.enum(['1','0']).optional(),
  limit: z.string().transform(s => Math.min(Math.max(parseInt(s) ?? 20, 1), 200)).optional(),
  offset: z.string().transform(s => Math.max(parseInt(s) ?? 0, 0)).optional(),
  sort: z.enum(['label','key_name','order_index','updated_at']).optional(),
  dir: z.enum(['asc','desc']).optional()
});

export const CreateRouteSchema = z.object({
  path: z.string().min(1).max(255),
  component: z.string().min(1).max(255),
  title: z.string().nullable(),
  description: z.string().nullable(),
  layout: z.string().max(64).nullable(),
  roles: z.array(z.string()).default([]),
  is_active: z.boolean().default(true),
  order_index: z.number().int().min(0),
  tags: z.array(z.string()).nullable().optional(),
  meta: z.object({}).passthrough().nullable().optional()
});

export const UpdateRouteSchema = CreateRouteSchema.partial();

export const CreateMenuSchema = z.object({
  parent_id: z.number().int().optional(),
  key_name: z.string().min(1).max(255),
  label: z.string().min(1).max(255),
  icon: z.string().max(128).nullable().optional(),
  path: z.string().max(255).nullable().optional(),
  roles: z.array(z.string()).default([]),
  is_active: z.boolean().default(true),
  order_index: z.number().int().min(0),
  meta: z.object({}).passthrough().nullable().optional()
});

export const UpdateMenuSchema = CreateMenuSchema.partial();

export const ReorderMenusSchema = z.object({
  items: z.array(z.object({
    id: z.number().int().positive(),
    parent_id: z.number().int().positive().optional(),
    order_index: z.number().int().min(0)
  }))
});

export function validate(
  schema: z.ZodTypeAny,
  data: unknown
): { success: boolean; data?: unknown; errors?: z.ZodError['issues'] } {
  try {
    return { success: true, data: schema.parse(data) };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.issues };
    }
    throw error;
  }
}
