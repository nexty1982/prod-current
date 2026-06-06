import { createProgram } from './program/createProgram.js';
import { ExitCode } from './types/index.js';

/**
 * Run the omocr CLI. Pass optional argv prefix to inject a default subcommand
 * (used by omocr-query, omocr-process, etc.).
 */
export async function runOmocr(injectedArgs: string[] = []): Promise<number> {
  const argv = ['node', 'omocr', ...injectedArgs, ...process.argv.slice(2)];
  try {
    const program = createProgram();
    await program.parseAsync(argv);
    return ExitCode.OK;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (process.env.OMOCR_DEBUG) console.error(err);
    else console.error(`error: ${msg}`);
    return ExitCode.ERROR;
  }
}
