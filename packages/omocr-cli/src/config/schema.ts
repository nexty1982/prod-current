import { z } from 'zod';

export const ProfileSchema = z.object({
  apiBase: z.string().url().optional(),
  /** Legacy alias — normalized to apiBase */
  apiUrl: z.string().url().optional(),
  defaultChurchId: z.coerce.number().int().positive().optional(),
  timeoutSeconds: z.coerce.number().int().positive().optional(),
});

export const ConfigFileSchema = z.object({
  activeProfile: z.string().default('dev'),
  profiles: z.record(ProfileSchema).default({}),
});

export type ParsedConfigFile = z.infer<typeof ConfigFileSchema>;

export const DEFAULT_PROFILES: ParsedConfigFile['profiles'] = {
  dev: {
    apiBase: 'http://127.0.0.1:3002',
    defaultChurchId: 46,
    timeoutSeconds: 120,
  },
  production: {
    apiBase: 'https://orthodoxmetrics.com',
    timeoutSeconds: 120,
  },
};
