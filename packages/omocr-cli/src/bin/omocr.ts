#!/usr/bin/env node
import { runOmocr } from '../run.js';
import { ExitCode } from '../types/index.js';

runOmocr().then((code) => process.exit(code ?? ExitCode.OK));
