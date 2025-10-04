export interface ImportError {
  file: string;
  specifier: string;
  line?: number;
  column?: number;
  errorMessage?: string;
}

export interface FixCandidate {
  targetPath: string;
  score: number;
  heuristic: string;
  isAlias?: boolean;
  needsExtension?: boolean;
}

export interface ImportFix {
  file: string;
  oldImport: string;
  newImport: string;
  heuristic: string;
  score: number;
  applied: boolean;
}

export interface FixerOptions {
  root: string;
  src: string;
  fromBuild?: string;
  runVite?: boolean;
  dry: boolean;
  apply: boolean;
  createStubs: boolean;
  preferAlias: boolean;
}

export interface FileIndex {
  files: Map<string, string>; // basename -> full path
  directories: Map<string, string[]>; // directory -> files
  aliases: Map<string, string>; // alias -> resolved path
}

export interface Report {
  timestamp: string;
  options: FixerOptions;
  fixes: ImportFix[];
  errors: ImportError[];
  unresolvedCount: number;
  fixedCount: number;
  duration: number;
}
