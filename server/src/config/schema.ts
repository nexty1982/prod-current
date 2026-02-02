/**
 * Configuration Schema
 * Defines canonical configuration structure with validation and defaults
 */

import { z } from 'zod';

/**
 * Database configuration schema
 */
const dbConfigSchema = z.object({
  host: z.string().default('localhost'),
  user: z.string().default('orthodoxapps'),
  password: z.string().default(''),
  database: z.string().default('orthodoxmetrics_db'),
  port: z.coerce.number().int().positive().default(3306),
});

/**
 * Server configuration schema
 */
const serverConfigSchema = z.object({
  env: z.enum(['development', 'production', 'test']).default('development'),
  port: z.coerce.number().int().positive().default(3001),
  host: z.string().default('0.0.0.0'),
  baseUrl: z.string().url().optional(),
  trustProxy: z.coerce.boolean().default(true),
});

/**
 * Session configuration schema
 */
const sessionConfigSchema = z.object({
  secret: z.string().min(8),
  cookieName: z.string().default('orthodoxmetrics.sid'),
  cookieDomain: z.string().optional(),
  secure: z.coerce.boolean().default(false),
  sameSite: z.enum(['strict', 'lax', 'none']).default('lax'),
  maxAgeMs: z.coerce.number().int().positive().default(86400000), // 24 hours
  store: z.enum(['memory', 'mysql']).default('mysql'),
});

/**
 * CORS configuration schema
 */
const corsConfigSchema = z.object({
  allowedOrigins: z.array(z.string()).default([
    'https://orthodoxmetrics.com',
    'http://orthodoxmetrics.com',
    'https://www.orthodoxmetrics.com',
    'http://www.orthodoxmetrics.com',
    'http://localhost:3000',
    'https://localhost:3000',
    'http://localhost:5173',
    'https://localhost:5173',
    'http://localhost:5174',
    'https://localhost:5174',
  ]),
  credentials: z.coerce.boolean().default(true),
});

/**
 * Paths configuration schema
 */
const pathsConfigSchema = z.object({
  imagesRoot: z.string().optional(),
  docsRoot: z.string().optional(),
  uploadsRoot: z.string().optional(),
  tempRoot: z.string().optional(),
});

/**
 * Features configuration schema (feature flags)
 */
const featuresConfigSchema = z.object({
  interactiveReports: z.coerce.boolean().default(true),
  notifications: z.coerce.boolean().default(true),
  ocr: z.coerce.boolean().default(true),
  certificates: z.coerce.boolean().default(true),
  invoices: z.coerce.boolean().default(true),
});

/**
 * Main configuration schema
 */
const configSchema = z.object({
  server: serverConfigSchema,
  db: z.object({
    app: dbConfigSchema,
    auth: dbConfigSchema,
  }),
  session: sessionConfigSchema,
  cors: corsConfigSchema,
  paths: pathsConfigSchema,
  features: featuresConfigSchema,
});

export { configSchema };
export type Config = z.infer<typeof configSchema>;

// Also export as CommonJS for compatibility
module.exports = { configSchema };
