import type { Command } from 'commander';
import { OcrApiClient } from '../../api/ocrApiClient.js';
import { resolveOutputFormat, writeError, writeJson } from '../../output/format.js';
import type { GlobalCliFlags, OmocrProfile } from '../../types/index.js';
import { ExitCode } from '../../types/index.js';

export function registerTemplateCommands(program: Command, getCtx: () => { profile: OmocrProfile; flags: GlobalCliFlags }) {
  const template = program.command('template').description('Layout template management (requires admin token)');

  template
    .command('list')
    .option('--church-id <id>', 'Filter by church (when API supports it)')
    .action(async () => {
      const { profile, flags } = getCtx();
      const client = new OcrApiClient({ profile, flags });
      try {
        const res = await client.listLayoutTemplates();
        if (resolveOutputFormat(flags) === 'json') writeJson(res, flags);
        else {
          const list = (res.templates || res) as Array<{ id?: number; name?: string }>;
          if (Array.isArray(list)) {
            for (const t of list) console.log(`${t.id ?? '?'}  ${t.name ?? JSON.stringify(t)}`);
          } else console.log(JSON.stringify(res, null, 2));
        }
      } catch (e: unknown) {
        writeError((e as Error).message, flags);
        process.exit(ExitCode.API);
      }
    });

  template
    .command('show')
    .argument('<id>', 'Template ID')
    .action(async (idStr) => {
      const { profile, flags } = getCtx();
      const client = new OcrApiClient({ profile, flags });
      try {
        const tpl = await client.getLayoutTemplate(parseInt(idStr, 10));
        if (resolveOutputFormat(flags) === 'json') writeJson(tpl, flags);
        else console.log(JSON.stringify(tpl, null, 2));
      } catch (e: unknown) {
        writeError((e as Error).message, flags);
        process.exit(ExitCode.API);
      }
    });

  template
    .command('test')
    .argument('<id>', 'Template ID')
    .argument('<file>', 'Page image to preview')
    .action(async (idStr, _file) => {
      writeError('template test requires POST /api/ocr/templates/:id/test (not yet exposed). Use layout-templates preview API via Studio.', getCtx().flags);
      process.exit(ExitCode.USAGE);
    });

  ['apply', 'activate', 'deactivate', 'versions', 'create'].forEach((sub) => {
    template
      .command(sub)
      .description(`${sub} — requires dedicated API endpoints (planned)`)
      .action(() => {
        writeError(`omocr template ${sub} is not yet implemented. Track API additions in docs/ocr-cli.md`, getCtx().flags);
        process.exit(ExitCode.USAGE);
      });
  });
}
