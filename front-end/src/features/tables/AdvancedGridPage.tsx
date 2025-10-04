import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { AdvancedGridDialog } from './AdvancedGridDialog';
import { listRecords, type TableKey, type SortDir } from '@/shared/lib/recordsApi';

type GridDatasets = {
  baptism: any[];
  marriage: any[];
  funeral: any[];
};
type GridCounts = { baptism: number; marriage: number; funeral: number };

const AdvancedGridPage: React.FC = () => {
  const { state } = useLocation() as { state?: any };
  const [sp] = useSearchParams();

  const initialTab = (state?.table || sp.get('table') || 'baptism') as TableKey;
  const churchId = Number(state?.churchId || sp.get('churchId') || sp.get('church_id') || 46);
  const search = String(state?.search || sp.get('search') || '');
  const sortField = (state?.sortField || sp.get('sortField') || undefined) as string | undefined;
  const sortDirection = (state?.sortDirection || sp.get('sortDirection') || 'desc') as SortDir;

  const [datasets, setDatasets] = useState<GridDatasets>({ baptism: [], marriage: [], funeral: [] });
  const [counts, setCounts] = useState<GridCounts>({ baptism: 0, marriage: 0, funeral: 0 });
  const [loading, setLoading] = useState(true);

  // helpers (same normalization used in RecordsUIPage)
  const firstNonEmpty = (...vals: any[]) =>
    vals.find(v => (Array.isArray(v) ? v.length : v !== null && v !== undefined && String(v).trim?.() !== ''));
  const normalizeList = (v: any): string => {
    if (v == null) return '';
    if (Array.isArray(v)) return v.filter(Boolean).join(', ');
    if (typeof v === 'object') return Object.values(v).filter(Boolean).join(', ');
    return String(v);
  };
  const joinName = (first?: string, last?: string) =>
    [first ?? '', last ?? ''].map(s => String(s).trim()).filter(Boolean).join(' ');

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);

    // pick sensible defaults per table if caller didn't pass one
    const perTableSort: Record<TableKey, string> = {
      baptism:  'baptismDate',
      marriage: 'marriageDate',
      funeral:  'funeralDate'
    };

    const fetchOne = async (table: TableKey) => {
      const { rows, count } = await listRecords({
        table,
        churchId,
        page: 1,
        limit: 1000,
        search,
        sortField: sortField || perTableSort[table],
        sortDirection,
        signal: ctrl.signal
      });

      // normalize like your main page
      const normalized = rows.map(row => {
        const o = row.originalRecord ?? row;

        if (table === 'baptism') {
          const sponsorsRaw = firstNonEmpty(
            o.sponsors, o.sponsor, o.godparents, o.godparentNames,
            [o.godfather, o.godmother].filter(Boolean), row.godparents, row.sponsors
          );
          const parentsRaw = firstNonEmpty(
            o.parents, o.parentsName, [o.fatherName, o.motherName].filter(Boolean),
            o.parents_names, row.parents
          );
          const clergyRaw = firstNonEmpty(
            o.clergy, o.clergyName, o.officiant, o.priestName, o.priest, o.officiating_clergy, row.clergy
          );
          return {
            ...row,
            firstName:   o.firstName   ?? o.first_name   ?? row.firstName   ?? '',
            lastName:    o.lastName    ?? o.last_name    ?? row.lastName    ?? '',
            birthDate:   o.birthDate   ?? o.birth_date   ?? o.dateOfBirth   ?? row.birthDate   ?? '',
            baptismDate: o.baptismDate ?? o.reception_date ?? o.dateOfBaptism ?? row.baptismDate ?? '',
            birthplace:  o.birthplace  ?? o.placeOfBirth ?? row.birthplace  ?? '',
            sponsors:    normalizeList(sponsorsRaw),
            parents:     normalizeList(parentsRaw),
            clergy:      normalizeList(clergyRaw),
          };
        }

        if (table === 'marriage') {
          const gFirst = firstNonEmpty(o.groomFirstName, o.groom_first_name, o.groomFirst, row.groomFirstName);
          const gLast  = firstNonEmpty(o.groomLastName,  o.groom_last_name,  o.groomLast,  row.groomLastName);
          const bFirst = firstNonEmpty(o.brideFirstName, o.bride_first_name, o.brideFirst, row.brideFirstName);
          const bLast  = firstNonEmpty(o.brideLastName,  o.bride_last_name,  o.brideLast,  row.brideLastName);
          const groomParentsRaw = firstNonEmpty(o.groomParents, o.parentsOfGroom, [o.groomFatherName,o.groomMotherName].filter(Boolean), o.parents_groom, row.groomParents);
          const brideParentsRaw = firstNonEmpty(o.brideParents, o.parentsOfBride, [o.brideFatherName,o.brideMotherName].filter(Boolean), o.parents_bride, row.brideParents);
          const witnessesRaw = firstNonEmpty(o.witnesses, o.witness, o.witnessNames, [o.bestMan,o.maidOfHonor].filter(Boolean), row.witnesses);
          const licenseRaw = firstNonEmpty(o.marriageLicense, o.licenseNumber, o.license_no, o.licenseNo, row.marriageLicense);
          return {
            ...row,
            marriageDate:   o.marriageDate ?? o.mdate ?? o.dateOfMarriage ?? o.marriage_date ?? row.marriageDate ?? '',
            groomName:      joinName(gFirst, gLast),
            brideName:      joinName(bFirst, bLast),
            groomParents:   normalizeList(groomParentsRaw),
            brideParents:   normalizeList(brideParentsRaw),
            witnesses:      normalizeList(witnessesRaw),
            marriageLicense:String(licenseRaw ?? ''),
            clergy:         o.clergy ?? o.clergyName ?? o.officiant ?? o.priestName ?? row.clergy ?? '',
          };
        }

        // funeral
        return {
          ...row,
          deathDate:     o.deceased_date ?? o.dateOfDeath   ?? o.death_date   ?? row.deathDate   ?? '',
          funeralDate:   o.burial_date   ?? o.dateOfFuneral ?? o.funeral_date ?? o.burialDate ?? row.burialDate ?? row.funeralDate ?? '',
          age:           o.age           ?? o.ageYears      ?? o.age_at_death ?? row.age ?? '',
          burialLocation:
                         o.burial_location ?? o.burialLocation ?? o.burial_place ?? o.cemetery ?? o.cemeteryName ?? o.placeOfBurial ?? row.burialLocation ?? '',
          firstName:     o.first_name    ?? o.firstName ?? row.firstName ?? '',
          lastName:      o.last_name     ?? o.lastName  ?? row.lastName  ?? '',
          clergy:        o.clergy        ?? o.clergyName ?? o.officiant ?? o.priestName ?? row.clergy ?? '',
        };
      });

      return { rows: normalized, count };
    };

    Promise.all([fetchOne('baptism'), fetchOne('marriage'), fetchOne('funeral')])
      .then(([b, m, f]) => {
        setDatasets({ baptism: b.rows, marriage: m.rows, funeral: f.rows });
        setCounts({ baptism: b.count, marriage: m.count, funeral: f.count });
      })
      .finally(() => !ctrl.signal.aborted && setLoading(false));

    return () => ctrl.abort();
  }, [churchId, search, sortField, sortDirection]);

  return (
    <AdvancedGridDialog
      open={true}
      onClose={() => window.history.back()}
      datasets={datasets}
      counts={counts}
      recordType={initialTab}
      loading={loading}
    />
  );
};

export default AdvancedGridPage;
