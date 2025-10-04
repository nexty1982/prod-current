/**
 * Field Mapper Schemas
 * Zod schemas and types for the field mapper module
 */

import { z } from "zod";

export const KnownFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(["string", "date", "number", "enum", "bool"]).default("string"),
  required: z.boolean().default(false),
  description: z.string().optional(),
});

export const ColumnSchema = z.object({
  index: z.number().int().nonnegative(),
  header: z.string().nullable(),
  sample: z.array(z.string()).max(5),
  inferredType: z.enum(["string", "date", "number", "enum", "bool"]).default("string")
});

export const MappingItemSchema = z.object({
  columnIndex: z.number().int(),
  targetFieldKey: z.string().nullable(),
  customFieldName: z.string().nullable(),
  outputType: z.enum(["string", "date", "number", "enum", "bool"]).default("string"),
});

export const FieldMappingSchema = z.object({
  churchId: z.string(),
  recordType: z.string(),
  items: z.array(MappingItemSchema),
  updatedAt: z.string().optional(),
});

export type KnownField = z.infer<typeof KnownFieldSchema>;
export type Column = z.infer<typeof ColumnSchema>;
export type MappingItem = z.infer<typeof MappingItemSchema>;
export type FieldMapping = z.infer<typeof FieldMappingSchema>;
