import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd(); // run from repo root
const SERVER_DIR = path.join(ROOT, "server");
const SRC_DIR = path.join(SERVER_DIR, "src");

const ALLOW_DIR_PREFIXES = [
  path.join(SERVER_DIR, "src") + path.sep,
  path.join(SERVER_DIR, "scripts") + path.sep,
  path.join(SERVER_DIR, "dist") + path.sep,
  path.join(SERVER_DIR, "node_modules") + path.sep,
];

const ALLOW_FILES = new Set([
  path.join(SERVER_DIR, "package.json"),
  path.join(SERVER_DIR, "package-lock.json"),
  path.join(SERVER_DIR, "tsconfig.json"),
  path.join(SERVER_DIR, "tsconfig.build.json"),
  path.join(SERVER_DIR, "ecosystem.config.cjs"),
  path.join(SERVER_DIR, ".env"),
  path.join(SERVER_DIR, ".env.production"),
]);

const FORBIDDEN_EXTS = new Set([
  ".js", ".cjs", ".mjs",
  ".ts", ".tsx",
  ".json", ".yml", ".yaml",
]);

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function isAllowed(p) {
  if (ALLOW_FILES.has(p)) return true;
  for (const prefix of ALLOW_DIR_PREFIXES) if (p.startsWith(prefix)) return true;
  return false;
}

function isForbiddenFile(p) {
  const ext = path.extname(p).toLowerCase();
  if (!FORBIDDEN_EXTS.has(ext)) return false;
  if (p.includes(path.sep + "dist" + path.sep)) return false;
  if (p.includes(path.sep + "node_modules" + path.sep)) return false;
  if (p.includes(path.sep + "scripts" + path.sep)) return false;
  return !isAllowed(p);
}

if (!fs.existsSync(SERVER_DIR)) {
  console.error("server/ directory not found");
  process.exit(2);
}
if (!fs.existsSync(SRC_DIR)) {
  console.error("server/src/ directory not found (required)");
  process.exit(2);
}

const files = walk(SERVER_DIR);
const violations = files.filter(isForbiddenFile);

if (violations.length) {
  console.error("\n❌ SERVER SRC BOUNDARY VIOLATION");
  console.error("Only server/src/** may contain source-like files.\n");
  for (const v of violations) {
    console.error(" - " + path.relative(ROOT, v));
  }
  console.error("\nFix: move these into server/src/<appropriate-subdir>/");
  process.exit(1);
}

console.log("✅ server/src boundary OK");

