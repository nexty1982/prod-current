#!/usr/bin/env python3
import os, re, sys, json, subprocess
from pathlib import Path

# cd to git root (equivalent of the old bash lines)
try:
    root = subprocess.check_output(["git", "rev-parse", "--show-toplevel"], text=True).strip()
    os.chdir(root)
except Exception:
    pass  # already in the right place or not a git repo

ROOT = Path.cwd()
SRC = ROOT / "front-end/src"
ENTRIES = [
    SRC / "main.tsx",           # real entry point (index.html <script src>)
    SRC / "routes/Router.tsx",  # fallback if main.tsx missing
]
EXTS = [".ts",".tsx",".js",".jsx"]

entry_files = [e for e in ENTRIES if e.exists()]
if not entry_files:
    print(f"Missing all entries: {ENTRIES}", file=sys.stderr)
    sys.exit(1)

IMPORT_RE = re.compile(r"""(?:import\s+[^'"]*?from\s+|import\s*\()\s*['"]([^'"]+)['"]\s*\)?""")
REQ_RE = re.compile(r"""require\(\s*['"]([^'"]+)['"]\s*\)""")

def resolve(spec, base):
    if spec.startswith("@/"):
        spec = spec[2:]
        cand = SRC / spec
    elif spec.startswith("./") or spec.startswith("../"):
        cand = (base.parent / spec).resolve()
        try:
            cand = cand.relative_to(ROOT)
            cand = ROOT / cand
        except Exception:
            cand = (base.parent / spec).resolve()
    else:
        return None
    if cand.is_file() and cand.suffix in EXTS:
        return cand
    if cand.is_dir():
        for idx in ["index.ts","index.tsx","index.js","index.jsx"]:
            p = cand / idx
            if p.exists():
                return p
    for ext in EXTS:
        p = Path(str(cand) + ext)
        if p.exists():
            return p
    return None

seen=set()
stack=list(entry_files)

def read_text(p):
    try:
        return p.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return ""

while stack:
    f = stack.pop()
    if f in seen: 
        continue
    seen.add(f)
    txt = read_text(f)
    for m in IMPORT_RE.finditer(txt):
        spec = m.group(1)
        tgt = resolve(spec, f)
        if tgt and tgt.exists() and tgt.is_file() and tgt.suffix in EXTS:
            if str(tgt).startswith(str(SRC)):
                stack.append(tgt)
    for m in REQ_RE.finditer(txt):
        spec = m.group(1)
        tgt = resolve(spec, f)
        if tgt and tgt.exists() and tgt.is_file() and tgt.suffix in EXTS:
            if str(tgt).startswith(str(SRC)):
                stack.append(tgt)

live = sorted([str(p.relative_to(ROOT)) for p in seen])
out_dir = ROOT / "docs" / "cleanup"
out_dir.mkdir(parents=True, exist_ok=True)
(out_dir / "live-files.json").write_text(json.dumps(live, indent=2), encoding="utf-8")
print(f"Wrote {out_dir/'live-files.json'} ({len(live)} files)")

# duplicate filename report
files = [p for p in SRC.rglob("*") if p.is_file() and p.suffix in EXTS]
byname={}
for p in files:
    byname.setdefault(p.name, []).append(p)
dupes = {k:v for k,v in byname.items() if len(v)>1}

lines=[]
for name, paths in sorted(dupes.items(), key=lambda x:(-len(x[1]), x[0].lower())):
    lines.append(f"==== {name} ({len(paths)}) ====")
    for p in sorted(paths):
        rel = str(p.relative_to(ROOT))
        flag = "LIVE" if p in seen else "NOT_LIVE"
        lines.append(f"[{flag}] {rel}")
    lines.append("")
(out_dir / "duplicate-filenames.txt").write_text("\n".join(lines), encoding="utf-8")
print(f"Wrote {out_dir/'duplicate-filenames.txt'} ({len(dupes)} duplicate names)")
