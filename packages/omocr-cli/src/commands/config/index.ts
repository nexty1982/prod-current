import type { Command } from 'commander';
import {
  CONFIG_PATH,
  loadConfigFile,
  resolveActiveProfile,
  saveConfigFile,
} from '../../config/loadConfig.js';
import { resolveOutputFormat, writeError, writeJson } from '../../output/format.js';
import type { GlobalCliFlags, OmocrProfile } from '../../types/index.js';
import { ExitCode } from '../../types/index.js';

function setNestedProfileKey(profile: OmocrProfile, key: string, value: string): OmocrProfile {
  const next = { ...profile };
  if (key === 'defaultChurchId' || key === 'timeoutSeconds') {
    (next as Record<string, unknown>)[key] = parseInt(value, 10);
  } else if (key === 'apiBase' || key === 'apiUrl') {
    next.apiBase = value.replace(/\/api\/ocr\/?$/, '').replace(/\/api\/?$/, '');
  } else {
    throw new Error(`Unknown config key: ${key}`);
  }
  return next;
}

export function registerConfigCommands(program: Command, getCtx: () => { profile: OmocrProfile; flags: GlobalCliFlags; profileName: string }) {
  const config = program.command('config').description('Manage omocr profiles (~/.config/orthodoxmetrics/omocr.yaml)');

  config
    .command('show')
    .action(() => {
      const { profile, flags, profileName } = getCtx();
      const cfg = loadConfigFile();
      const payload = { path: CONFIG_PATH, activeProfile: profileName, profile, tokenSet: !!process.env.OMOCR_TOKEN };
      if (resolveOutputFormat(flags) === 'json') writeJson(payload, flags);
      else {
        console.log(`Config: ${CONFIG_PATH}`);
        console.log(`Active profile: ${profileName}`);
        console.log(`  apiBase: ${profile.apiBase}`);
        console.log(`  defaultChurchId: ${profile.defaultChurchId ?? '—'}`);
        console.log(`  timeoutSeconds: ${profile.timeoutSeconds ?? 120}`);
        console.log(`  OMOCR_TOKEN: ${process.env.OMOCR_TOKEN ? '(set)' : '(not set)'}`);
        console.log(`Profiles: ${Object.keys(cfg.profiles).join(', ')}`);
      }
    });

  config
    .command('profiles')
    .action(() => {
      const { flags } = getCtx();
      const cfg = loadConfigFile();
      if (resolveOutputFormat(flags) === 'json') writeJson(cfg.profiles, flags);
      else {
        for (const [name, p] of Object.entries(cfg.profiles)) {
          const active = name === cfg.activeProfile ? '*' : ' ';
          console.log(`${active} ${name}: ${p.apiBase}  church=${p.defaultChurchId ?? '—'}`);
        }
      }
    });

  config
    .command('use')
    .argument('<profile>', 'Profile name')
    .action((name) => {
      const { flags } = getCtx();
      const cfg = loadConfigFile();
      if (!cfg.profiles[name]) {
        writeError(`Unknown profile: ${name}`, flags);
        process.exit(ExitCode.USAGE);
      }
      cfg.activeProfile = name;
      saveConfigFile(cfg);
      console.log(`Active profile: ${name}`);
    });

  config
    .command('set')
    .argument('<key>', 'Profile key (apiBase, defaultChurchId, timeoutSeconds)')
    .argument('<value>', 'Value')
    .option('--profile <name>', 'Profile to modify (default: active)')
    .action((key, value, opts) => {
      const { flags, profileName } = getCtx();
      const cfg = loadConfigFile();
      const name = opts.profile || profileName;
      if (!cfg.profiles[name]) {
        writeError(`Unknown profile: ${name}`, flags);
        process.exit(ExitCode.USAGE);
      }
      try {
        cfg.profiles[name] = setNestedProfileKey(cfg.profiles[name], key, value);
        saveConfigFile(cfg);
        console.log(`Set ${name}.${key} = ${value}`);
      } catch (e: unknown) {
        writeError((e as Error).message, flags);
        process.exit(ExitCode.USAGE);
      }
    });
}

export function buildConfigContext(opts: { profile?: string; churchId?: number; json?: boolean; ndjson?: boolean; quiet?: boolean; verbose?: boolean }) {
  const cfg = loadConfigFile();
  const profileName = opts.profile || cfg.activeProfile;
  const profile = resolveActiveProfile(cfg, profileName);
  const flags: GlobalCliFlags = {
    profile: profileName,
    churchId: opts.churchId ?? profile.defaultChurchId,
    json: opts.json,
    ndjson: opts.ndjson,
    quiet: opts.quiet,
    verbose: opts.verbose,
  };
  return { profile, flags, profileName };
}
