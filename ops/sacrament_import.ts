/**
 * ops/import/sacrament_import.ts
 * Import baptisms, marriages, funerals from CSV using a YAML column mapping.
 * Idempotent via (church_id, source_hash) unique keys.
 *
 * Usage examples:
 *   pnpm add mysql2 fast-csv yaml dayjs
 *   pnpm tsx ops/import/sacrament_import.ts --church 45 --type baptisms \
 *     --csv import/ssppoc/baptisms.csv --map import/ssppoc/baptisms.map.yaml --source ssppoc
 */

import fs from "node:fs";
import crypto from "node:crypto";
import { parse } from "fast-csv";
import YAML from "yaml";
import dayjs from "dayjs";
import mysql from "mysql2/promise";

type ImportType = "baptisms" | "marriages" | "funerals";
type Mapping = { type: ImportType; columns: Record<string, any>; dateFormats?: string[]; };
type Row = Record<string, string>;

const DATE_FORMATS = [
  "YYYY-MM-DD","MM/DD/YYYY","M/D/YYYY","YYYY/MM/DD","DD/MM/YYYY","D/M/YYYY",
  "MMM D, YYYY","MMMM D, YYYY","D-M-YYYY","DD-MMM-YYYY"
];

function getArg(flag: string, fallback?: string) {
  const i = process.argv.indexOf(flag);
  if (i >= 0 && process.argv[i+1]) return process.argv[i+1];
  return fallback;
}
function norm(s?: string | null) { return (s ? String(s).trim().replace(/\s+/g, " ") : ""); }
function toDate(v?: string, fmts?: string[]): string | null {
  const s = norm(v); if (!s) return null;
  const formats = fmts && fmts.length ? fmts.concat(DATE_FORMATS) : DATE_FORMATS;
  for (const f of formats) { const d = dayjs(s, f, true); if (d.isValid()) return d.format("YYYY-MM-DD"); }
  const d2 = dayjs(new Date(s)); return d2.isValid() ? d2.format("YYYY-MM-DD") : null;
}
function sha1(obj: any) { return crypto.createHash("sha1").update(JSON.stringify(obj)).digest("hex"); }

async function main() {
  const churchId = Number(getArg("--church"));
  const type = (getArg("--type") as ImportType);
  const csvPath = getArg("--csv");
  const mapPath = getArg("--map");
  const sourceSystem = getArg("--source","import");
  const dry = process.argv.includes("--dry");
  const preview = Number(getArg("--preview","0"));

  if (!churchId || !type || !csvPath || !mapPath) {
    console.error("Usage: --church <id> --type <baptisms|marriages|funerals> --csv <file.csv> --map <mapping.yaml> [--source <sys>] [--dry] [--preview <N>]");
    process.exit(1);
  }

  const mapYaml = YAML.parse(fs.readFileSync(mapPath, "utf8")) as Mapping;
  const cols = mapYaml.columns || {};
  const fmts = mapYaml.dateFormats || [];

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: "orthodoxmetrics_db",
    multipleStatements: false
  });

  let inserted = 0, updated = 0, seen = 0;
  const stream = fs.createReadStream(csvPath).pipe(parse({ headers: true, trim: true }));

  for await (const raw of stream) {
    const row: Row = raw;

    if (type === "baptisms") {
      const rec = {
        person_first: norm(row[cols.person_first]),
        person_middle: norm(row[cols.person_middle]),
        person_last: norm(row[cols.person_last]),
        birth_date: toDate(row[cols.birth_date], fmts),
        baptism_date: toDate(row[cols.baptism_date], fmts),
        certificate_no: norm(row[cols.certificate_no]),
        book_no: norm(row[cols.book_no]),
        page_no: norm(row[cols.page_no]),
        entry_no: norm(row[cols.entry_no]),
        father_name: norm(row[cols.father_name]),
        mother_name: norm(row[cols.mother_name]),
        godparents: JSON.stringify(([] as string[]).concat(...([cols.godparents] as any[]).flat().map((k: string) => norm(row[k])).filter(Boolean))),
        officiant_name: norm(row[cols.officiant_name]),
        place_name: norm(row[cols.place_name]),
        notes: norm(row[cols.notes]),
        source_system: sourceSystem,
        source_row_id: norm(row[cols.source_row_id] || ""),
      };
      const fingerprint = {
        person_full: [rec.person_first, rec.person_middle, rec.person_last].filter(Boolean).join(" "),
        baptism_date: rec.baptism_date, certificate_no: rec.certificate_no,
        book_page_entry: [rec.book_no, rec.page_no, rec.entry_no].filter(Boolean).join("/"),
      };
      const source_hash = sha1(fingerprint);
      if (preview && seen++ < preview) console.log({ preview: rec, source_hash });
      if (!dry) {
        const [rows] = await conn.execute("SELECT id FROM baptism_records WHERE church_id=? AND source_hash=? LIMIT 1", [churchId, source_hash]);
        if ((rows as any[]).length) {
          const id = (rows as any[])[0].id;
          await conn.execute(`UPDATE baptism_records SET
              person_first=?, person_middle=?, person_last=?, birth_date=?, baptism_date=?, certificate_no=?, book_no=?, page_no=?, entry_no=?,
              father_name=?, mother_name=?, godparents=?, officiant_name=?, place_name=?, notes=?, source_system=?, source_row_id=?
            WHERE id=? AND church_id=?`,
            [rec.person_first, rec.person_middle, rec.person_last, rec.birth_date, rec.baptism_date, rec.certificate_no, rec.book_no, rec.page_no, rec.entry_no,
             rec.father_name, rec.mother_name, rec.godparents, rec.officiant_name, rec.place_name, rec.notes, rec.source_system, rec.source_row_id, id, churchId]);
          updated++;
        } else {
          await conn.execute(`INSERT INTO baptism_records
            (church_id, person_first, person_middle, person_last, birth_date, baptism_date, certificate_no, book_no, page_no, entry_no,
             father_name, mother_name, godparents, officiant_name, place_name, notes, source_system, source_row_id, source_hash)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [churchId, rec.person_first, rec.person_middle, rec.person_last, rec.birth_date, rec.baptism_date, rec.certificate_no, rec.book_no, rec.page_no, rec.entry_no,
             rec.father_name, rec.mother_name, rec.godparents, rec.officiant_name, rec.place_name, rec.notes, rec.source_system, rec.source_row_id, source_hash]);
          inserted++;
        }
      }
    }

    if (type === "marriages") {
      const rec = {
        groom_first: norm(row[cols.groom_first]),
        groom_middle: norm(row[cols.groom_middle]),
        groom_last: norm(row[cols.groom_last]),
        bride_first: norm(row[cols.bride_first]),
        bride_middle: norm(row[cols.bride_middle]),
        bride_last: norm(row[cols.bride_last]),
        marriage_date: toDate(row[cols.marriage_date], fmts),
        certificate_no: norm(row[cols.certificate_no]),
        book_no: norm(row[cols.book_no]),
        page_no: norm(row[cols.page_no]),
        entry_no: norm(row[cols.entry_no]),
        witnesses: JSON.stringify(([] as string[]).concat(...([cols.witnesses] as any[]).flat().map((k: string) => norm(row[k])).filter(Boolean))),
        officiant_name: norm(row[cols.officiant_name]),
        place_name: norm(row[cols.place_name]),
        notes: norm(row[cols.notes]),
        source_system: sourceSystem,
        source_row_id: norm(row[cols.source_row_id] || ""),
      };
      const fingerprint = {
        groom: [rec.groom_first, rec.groom_middle, rec.groom_last].filter(Boolean).join(" "),
        bride: [rec.bride_first, rec.bride_middle, rec.bride_last].filter(Boolean).join(" "),
        marriage_date: rec.marriage_date, certificate_no: rec.certificate_no,
        book_page_entry: [rec.book_no, rec.page_no, rec.entry_no].filter(Boolean).join("/"),
      };
      const source_hash = sha1(fingerprint);
      if (preview && seen++ < preview) console.log({ preview: rec, source_hash });
      if (!dry) {
        const [rows] = await conn.execute("SELECT id FROM marriage_records WHERE church_id=? AND source_hash=? LIMIT 1", [churchId, source_hash]);
        if ((rows as any[]).length) {
          const id = (rows as any[])[0].id;
          await conn.execute(`UPDATE marriage_records SET
              groom_first=?, groom_middle=?, groom_last=?, bride_first=?, bride_middle=?, bride_last=?, marriage_date=?, certificate_no=?, book_no=?, page_no=?, entry_no=?,
              witnesses=?, officiant_name=?, place_name=?, notes=?, source_system=?, source_row_id=?
            WHERE id=? AND church_id=?`,
            [rec.groom_first, rec.groom_middle, rec.groom_last, rec.bride_first, rec.bride_middle, rec.bride_last, rec.marriage_date, rec.certificate_no, rec.book_no, rec.page_no, rec.entry_no,
             rec.witnesses, rec.officiant_name, rec.place_name, rec.notes, rec.source_system, rec.source_row_id, id, churchId]);
          updated++;
        } else {
          await conn.execute(`INSERT INTO marriage_records
            (church_id, groom_first, groom_middle, groom_last, bride_first, bride_middle, bride_last, marriage_date, certificate_no, book_no, page_no, entry_no,
             witnesses, officiant_name, place_name, notes, source_system, source_row_id, source_hash)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [churchId, rec.groom_first, rec.groom_middle, rec.groom_last, rec.bride_first, rec.bride_middle, rec.bride_last, rec.marriage_date, rec.certificate_no, rec.book_no, rec.page_no, rec.entry_no,
             rec.witnesses, rec.officiant_name, rec.place_name, rec.notes, rec.source_system, rec.source_row_id, source_hash]);
          inserted++;
        }
      }
    }

    if (type === "funerals") {
      const rec = {
        deceased_first: norm(row[cols.deceased_first]),
        deceased_middle: norm(row[cols.deceased_middle]),
        deceased_last: norm(row[cols.deceased_last]),
        birth_date: toDate(row[cols.birth_date], fmts),
        death_date: toDate(row[cols.death_date], fmts),
        funeral_date: toDate(row[cols.funeral_date], fmts),
        certificate_no: norm(row[cols.certificate_no]),
        book_no: norm(row[cols.book_no]),
        page_no: norm(row[cols.page_no]),
        entry_no: norm(row[cols.entry_no]),
        burial_place: norm(row[cols.burial_place]),
        cause_of_death: norm(row[cols.cause_of_death]),
        officiant_name: norm(row[cols.officiant_name]),
        place_name: norm(row[cols.place_name]),
        notes: norm(row[cols.notes]),
        source_system: sourceSystem,
        source_row_id: norm(row[cols.source_row_id] || ""),
      };
      const fingerprint = {
        person: [rec.deceased_first, rec.deceased_middle, rec.deceased_last].filter(Boolean).join(" "),
        funeral_date: rec.funeral_date || rec.death_date, certificate_no: rec.certificate_no,
        book_page_entry: [rec.book_no, rec.page_no, rec.entry_no].filter(Boolean).join("/"),
      };
      const source_hash = sha1(fingerprint);
      if (preview && seen++ < preview) console.log({ preview: rec, source_hash });
      if (!dry) {
        const [rows] = await conn.execute("SELECT id FROM funeral_records WHERE church_id=? AND source_hash=? LIMIT 1", [churchId, source_hash]);
        if ((rows as any[]).length) {
          const id = (rows as any[])[0].id;
          await conn.execute(`UPDATE funeral_records SET
              deceased_first=?, deceased_middle=?, deceased_last=?, birth_date=?, death_date=?, funeral_date=?, certificate_no=?, book_no=?, page_no=?, entry_no=?,
              burial_place=?, cause_of_death=?, officiant_name=?, place_name=?, notes=?, source_system=?, source_row_id=?
            WHERE id=? AND church_id=?`,
            [rec.deceased_first, rec.deceased_middle, rec.deceased_last, rec.birth_date, rec.death_date, rec.funeral_date, rec.certificate_no, rec.book_no, rec.page_no, rec.entry_no,
             rec.burial_place, rec.cause_of_death, rec.officiant_name, rec.place_name, rec.notes, rec.source_system, rec.source_row_id, id, churchId]);
          updated++;
        } else {
          await conn.execute(`INSERT INTO funeral_records
            (church_id, deceased_first, deceased_middle, deceased_last, birth_date, death_date, funeral_date, certificate_no, book_no, page_no, entry_no,
             burial_place, cause_of_death, officiant_name, place_name, notes, source_system, source_row_id, source_hash)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [churchId, rec.deceased_first, rec.deceased_middle, rec.deceased_last, rec.birth_date, rec.death_date, rec.funeral_date, rec.certificate_no, rec.book_no, rec.page_no, rec.entry_no,
             rec.burial_place, rec.cause_of_death, rec.officiant_name, rec.place_name, rec.notes, rec.source_system, rec.source_row_id, source_hash]);
          inserted++;
        }
      }
    }
  }

  console.log(`Done type=${type} church=${churchId} inserted=${inserted} updated=${updated}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });