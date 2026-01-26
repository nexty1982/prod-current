/**
 * Zod validation schemas for OCR Extractor API
 */

import { z } from 'zod';

export const FieldTypeSchema = z.enum(['text', 'number', 'date', 'group']);
export const PageModeSchema = z.enum(['single', 'variable']);
export const RecordTypeSchema = z.enum(['baptism', 'marriage', 'funeral', 'custom']);

export const CreateFieldSchema: z.ZodType<any> = z.object({
  name: z.string().min(1).max(255),
  key: z.string().min(1).max(255).regex(/^[a-z0-9_]+$/, 'Key must be lowercase alphanumeric with underscores'),
  field_type: FieldTypeSchema,
  multiple: z.boolean().default(false),
  instructions: z.string().nullable().optional(),
  sort_order: z.number().int().min(0).default(0),
  parent_field_id: z.number().int().positive().nullable().optional(),
  children: z.lazy(() => z.array(CreateFieldSchema).optional())
});

export const CreateExtractorSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().nullable().optional(),
  record_type: RecordTypeSchema.default('custom'),
  page_mode: PageModeSchema.default('single'),
  fields: z.array(CreateFieldSchema).default([])
});

export const UpdateExtractorSchema = CreateExtractorSchema.partial();

export const ExtractorTestSchema = z.object({
  imageId: z.number().int().positive().optional(),
  jobId: z.number().int().positive().optional(),
  fileRef: z.string().optional(),
  page: z.number().int().min(0).optional(),
  recordType: z.string().optional()
}).refine(
  (data) => data.imageId || data.jobId || data.fileRef,
  { message: 'Must provide imageId, jobId, or fileRef' }
);

export const RunExtractionSchema = z.object({
  extractorId: z.number().int().positive()
});

export function validate<T>(
  schema: z.ZodType<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError['issues'] } {
  try {
    return { success: true, data: schema.parse(data) };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.issues };
    }
    throw error;
  }
}

