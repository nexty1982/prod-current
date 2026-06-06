import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import yaml from 'js-yaml';
import { ConfigFileSchema, DEFAULT_PROFILES, type ParsedConfigFile } from './schema.js';
import type { OmocrConfigFile, OmocrProfile } from '../types/index.js';

export const CONFIG_DIR = path.join(os.homedir(), '.config', 'orthodoxmetrics');
export const CONFIG_PATH = path.join(CONFIG_DIR, 'omocr.yaml');

function normalizeProfile(raw: Record<string, unknown>): OmocrProfile {
  let apiBase = (raw.apiBase as string | undefined) || (raw.apiUrl as string | undefined) || 'http://127.0.0.1:3002';
  // Strip trailing /api/ocr or /api if user pasted a scoped URL
  apiBase = apiBase.replace(/\/api\/ocr\/?$/, '').replace(/\/api\/?$/, '');
  return {
    apiBase,
    defaultChurchId: raw.defaultChurchId as number | undefined,
    timeoutSeconds: (raw.timeoutSeconds as number | undefined) ?? 120,
  };
}

export function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function loadConfigFile(): OmocrConfigFile {
  if (!fs.existsSync(CONFIG_PATH)) {
    return {
      activeProfile: 'dev',
      profiles: Object.fromEntries(
        Object.entries(DEFAULT_PROFILES).map(([k, v]) => [k, normalizeProfile(v as Record<string, unknown>)]),
      ),
    };
  }
  const raw = yaml.load(fs.readFileSync(CONFIG_PATH, 'utf8')) as unknown;
  const parsed = ConfigFileSchema.parse(raw ?? {});
  const profiles: Record<string, OmocrProfile> = {};
  for (const [name, prof] of Object.entries(parsed.profiles)) {
    profiles[name] = normalizeProfile(prof as Record<string, unknown>);
  }
  if (!Object.keys(profiles).length) {
    profiles.dev = normalizeProfile(DEFAULT_PROFILES.dev as Record<string, unknown>);
  }
  return { activeProfile: parsed.activeProfile, profiles };
}

export function saveConfigFile(config: OmocrConfigFile): void {
  ensureConfigDir();
  const out = {
    activeProfile: config.activeProfile,
    profiles: config.profiles,
  };
  fs.writeFileSync(CONFIG_PATH, yaml.dump(out, { lineWidth: 120 }), 'utf8');
}

export function resolveActiveProfile(config: OmocrConfigFile, profileName?: string): OmocrProfile {
  const name = profileName || config.activeProfile || 'dev';
  const prof = config.profiles[name];
  if (!prof) {
    throw new Error(`Unknown profile "${name}". Run: omocr config profiles`);
  }
  return prof;
}
