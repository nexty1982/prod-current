/**
 * Seed Records Route
 * POST /api/admin/seed-records — Generate and insert fake church records
 * Extracted from index.ts to fix positioning bug (was after error handlers).
 */
const express = require('express');
const router = express.Router();

router.post('/seed-records', async (req: any, res: any) => {
  try {
    const { church_id, record_type, count, year_start, year_end, dry_run, purge } = req.body;
    if (!church_id || !record_type) {
      return res.status(400).json({ error: 'church_id and record_type are required' });
    }
    if (!['baptism', 'marriage', 'funeral'].includes(record_type)) {
      return res.status(400).json({ error: 'record_type must be baptism, marriage, or funeral' });
    }
    const n = Math.min(Math.max(1, parseInt(count)), 5000);
    const yStart = parseInt(year_start) || 1960;
    const yEnd = parseInt(year_end) || 2024;

    const { promisePool } = require('../../config/db');
    const [churchRows] = await promisePool.query('SELECT id, name, database_name FROM churches WHERE id = ?', [church_id]);
    if (!churchRows.length) return res.status(404).json({ error: 'Church not found' });
    const church = churchRows[0];

    // Handle purge
    if (purge) {
      const tableMap: Record<string, string> = { baptism: 'baptism_records', marriage: 'marriage_records', funeral: 'funeral_records' };
      const table = tableMap[record_type];
      if (!table) return res.status(400).json({ error: 'Invalid record_type for purge' });
      const [result] = await promisePool.query(`DELETE FROM \`${church.database_name}\`.${table} WHERE church_id = ?`, [church_id]);
      return res.json({ success: true, deleted: (result as any).affectedRows, record_type, church: church.name, database: church.database_name });
    }

    if (!count || count < 1) return res.status(400).json({ error: 'count is required and must be >= 1' });

    // --- Name data ---
    const MALE = ['Alexander','Andrew','Anthony','Basil','Benjamin','Charles','Christopher','Constantine','Daniel','David','Demetrios','Dimitri','Edward','Elias','Emmanuel','Evan','George','Gregory','Harry','Henry','Isaac','Jacob','James','Jason','John','Jonathan','Joseph','Joshua','Kenneth','Leo','Lucas','Mark','Matthew','Michael','Nathan','Nicholas','Noah','Oliver','Patrick','Paul','Peter','Philip','Richard','Robert','Samuel','Sebastian','Simon','Spyridon','Stefan','Stephen','Theodore','Thomas','Timothy','Victor','Vincent','William','Zachary'];
    const FEMALE = ['Adriana','Alexandra','Alexis','Anastasia','Angela','Anna','Athena','Barbara','Catherine','Christina','Claire','Constance','Daphne','Diana','Dorothy','Elena','Elizabeth','Emily','Eva','Evelyn','Georgia','Grace','Hannah','Helen','Irene','Isabella','Julia','Katherine','Laura','Lily','Lydia','Margaret','Maria','Marina','Martha','Mary','Mia','Natalia','Nicole','Olivia','Penelope','Rachel','Rebecca','Sophia','Stella','Stephanie','Susan','Tatiana','Theodora','Valentina','Victoria','Zoe'];
    const LAST = ['Adams','Alexandros','Anderson','Angelopoulos','Antonopoulos','Baker','Baxter','Bennett','Brooks','Campbell','Carter','Christodoulou','Clark','Collins','Cooper','Davis','Dimitriou','Edwards','Evans','Fischer','Fleming','Foster','Garcia','Georgiou','Grant','Green','Hall','Harris','Harrison','Hayes','Henderson','Hughes','Ioannou','Jackson','Johnson','Jones','Kallas','Kennedy','King','Konstantinidis','Kowalski','Lazaridis','Lee','Lewis','Martin','Mason','Meyer','Miller','Mitchell','Moore','Morgan','Murphy','Nelson','Nikolaou','Oconnor','Olsen','Pappas','Parker','Papadopoulos','Peterson','Phillips','Popov','Price','Quinn','Reed','Reynolds','Roberts','Robinson','Rogers','Ross','Russell','Schmidt','Scott','Shaw','Simmons','Smith','Stavros','Stewart','Sullivan','Taylor','Thomas','Thompson','Turner','Vasiliev','Walker','Walsh','Ward','Watson','White','Williams','Wilson','Wright','Young'];
    const CLERGY_LIST = ['Fr. Alexander Karloutsos','Fr. Andrew Jarmus','Fr. Anthony Coniaris','Fr. Basil Stoyka','Fr. Constantine Nasr','Fr. Daniel Byantoro','Fr. Demetrios Constantelos','Fr. George Metallinos','Fr. Gregory Wingenbach','Fr. James Bernstein','Fr. John Behr','Fr. John Chryssavgis','Fr. John Meyendorff','Fr. John Peck','Fr. Joseph Huneycutt','Fr. Mark Arey','Fr. Michael Oleksa','Fr. Nicholas Triantafilou','Fr. Patrick Reardon','Fr. Paul Tarazi','Fr. Peter Gillquist','Fr. Philip LeMasters','Fr. Seraphim Bell','Fr. Stephen Freeman','Fr. Theodore Stylianopoulos','Fr. Thomas Hopko','Fr. Timothy Baclig'];
    const CITIES = ['New York, NY','Chicago, IL','Boston, MA','Pittsburgh, PA','Philadelphia, PA','Detroit, MI','Cleveland, OH','San Francisco, CA','Los Angeles, CA','Houston, TX','Atlanta, GA','Baltimore, MD','Denver, CO','Indianapolis, IN','Minneapolis, MN','Milwaukee, WI','Nashville, TN','Portland, OR','Seattle, WA','Washington, DC','Charlotte, NC','Richmond, VA','St. Louis, MO','Columbus, OH','Tampa, FL','Orlando, FL','Dallas, TX','Phoenix, AZ','Sacramento, CA','Hartford, CT','Providence, RI','Worcester, MA'];
    const CEMETERIES = ['Holy Cross Cemetery','Resurrection Cemetery','St. Theodosius Cemetery','All Saints Memorial Park','Orthodox Memorial Gardens','Evergreen Cemetery','Mt. Olivet Cemetery','Calvary Cemetery','Cedar Grove Cemetery','Greenwood Cemetery','Holy Trinity Cemetery','St. Nicholas Memorial Park','Assumption Cemetery','Transfiguration Memorial Gardens','Oak Hill Cemetery','Woodland Cemetery','Fairview Memorial Park','Hillside Cemetery'];

    const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)];
    const rDate = () => {
      const s = new Date(yStart, 0, 1).getTime();
      const e = new Date(yEnd, 11, 31).getTime();
      return new Date(s + Math.random() * (e - s)).toISOString().split('T')[0];
    };
    const addDays = (d: string, lo: number, hi: number) => {
      const dt = new Date(d);
      dt.setDate(dt.getDate() + lo + Math.floor(Math.random() * (hi - lo)));
      return dt.toISOString().split('T')[0];
    };
    const mName = () => ({ f: pick(MALE), l: pick(LAST) });
    const fName = () => ({ f: pick(FEMALE), l: pick(LAST) });
    const full = (n: {f:string,l:string}) => `${n.f} ${n.l}`;
    const parents = (ln: string) => {
      const fa = { f: pick(MALE), l: ln };
      const mo = { f: pick(FEMALE), l: pick(LAST) };
      return `${full(fa)} & ${mo.f} (${mo.l}) ${ln}`;
    };

    const records: any[] = [];
    for (let i = 0; i < n; i++) {
      if (record_type === 'baptism') {
        const isMale = Math.random() < 0.5;
        const child = isMale ? mName() : fName();
        const bd = rDate();
        records.push({
          first_name: child.f, last_name: child.l, birth_date: bd,
          reception_date: addDays(bd, 7, 180), birthplace: pick(CITIES),
          entry_type: 'Baptism', sponsors: Math.random() < 0.3
            ? `${full(mName())} & ${full(fName())}` : full(Math.random() < 0.5 ? mName() : fName()),
          parents: parents(child.l), clergy: pick(CLERGY_LIST), church_id,
        });
      } else if (record_type === 'marriage') {
        const g = mName(), b = fName();
        const md = rDate();
        const wc = 2 + Math.floor(Math.random() * 3);
        const ws: string[] = [];
        for (let w = 0; w < wc; w++) ws.push(full(Math.random() < 0.5 ? mName() : fName()));
        const county = pick(['Cook County','Allegheny County','Suffolk County','Cuyahoga County','Wayne County','Fulton County','Harris County','Los Angeles County','Maricopa County','King County','Hennepin County','Marion County']);
        records.push({
          mdate: md, fname_groom: g.f, lname_groom: g.l, parentsg: parents(g.l),
          fname_bride: b.f, lname_bride: b.l, parentsb: parents(b.l),
          witness: ws.join(', '),
          mlicense: `License #ML-${yStart + Math.floor(Math.random() * (yEnd - yStart))}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}, ${county}`,
          clergy: pick(CLERGY_LIST), church_id,
        });
      } else if (record_type === 'funeral') {
        const isMale = Math.random() < 0.5;
        const dec = isMale ? mName() : fName();
        const dd = rDate();
        records.push({
          deceased_date: dd, burial_date: addDays(dd, 2, 7),
          name: dec.f, lastname: dec.l, age: 25 + Math.floor(Math.random() * 70),
          clergy: pick(CLERGY_LIST),
          burial_location: `${pick(CEMETERIES)}, ${pick(CITIES)}`, church_id,
        });
      }
    }

    // Return preview for dry_run
    if (dry_run) {
      return res.json({ success: true, preview: records.slice(0, 5), total: records.length, church: church.name, database: church.database_name });
    }

    // Insert
    let inserted = 0;
    if (record_type === 'baptism') {
      const cols = ['first_name','last_name','birth_date','reception_date','birthplace','entry_type','sponsors','parents','clergy','church_id'];
      const ph = records.map(() => `(${cols.map(() => '?').join(',')})`).join(',');
      const vals = records.flatMap(r => cols.map(c => r[c] ?? null));
      const [result] = await promisePool.query(`INSERT INTO \`${church.database_name}\`.baptism_records (${cols.join(',')}) VALUES ${ph}`, vals);
      inserted = (result as any).affectedRows;
    } else if (record_type === 'marriage') {
      const cols = ['mdate','fname_groom','lname_groom','parentsg','fname_bride','lname_bride','parentsb','witness','mlicense','clergy','church_id'];
      const ph = records.map(() => `(${cols.map(() => '?').join(',')})`).join(',');
      const vals = records.flatMap(r => cols.map(c => r[c] ?? null));
      const [result] = await promisePool.query(`INSERT INTO \`${church.database_name}\`.marriage_records (${cols.join(',')}) VALUES ${ph}`, vals);
      inserted = (result as any).affectedRows;
    } else if (record_type === 'funeral') {
      const cols = ['deceased_date','burial_date','name','lastname','age','clergy','burial_location','church_id'];
      const ph = records.map(() => `(${cols.map(() => '?').join(',')})`).join(',');
      const vals = records.flatMap(r => cols.map(c => r[c] ?? null));
      const [result] = await promisePool.query(`INSERT INTO \`${church.database_name}\`.funeral_records (${cols.join(',')}) VALUES ${ph}`, vals);
      inserted = (result as any).affectedRows;
    }

    res.json({ success: true, inserted, record_type, church: church.name, database: church.database_name });
  } catch (error: any) {
    console.error('[Seed Records] Error:', error);
    res.status(500).json({ error: 'Failed to seed records', message: error.message });
  }
});

module.exports = router;
export {};
