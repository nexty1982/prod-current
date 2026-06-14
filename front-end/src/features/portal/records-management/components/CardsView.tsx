import type { PortalRecordsThemeStyle } from '@/features/portal/themes/records/portalRecordsTheme';
import { Calendar, ChevronLeft, ChevronRight, Cross, Heart, Home, MapPin, User2 } from '@/ui/icons';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { AnyRecord, Density } from '../types';
import { densityClasses, recordClergy, recordPrimaryName } from '../types';
import { StatusBadge } from './StatusBadge';

const BENTO_SHELLS = [
  'bg-[#dbeafe] border-[#93c5fd] dark:bg-blue-950/40 dark:border-blue-700',
  'bg-[#ffedd5] border-[#fdba74] dark:bg-orange-950/40 dark:border-orange-700',
  'bg-[#ede9fe] border-[#c4b5fd] dark:bg-violet-950/40 dark:border-violet-700',
];

interface Props {
  records: AnyRecord[];
  highlight?: string;
  density: Density;
  recordsTheme: PortalRecordsThemeStyle;
  onOpen: (r: AnyRecord) => void;
}

export function CardsView({ records, highlight, density, recordsTheme, onOpen }: Props) {
  const layout = recordsTheme.cards.layout;

  if (layout === 'list') {
    return (
      <div className={`rm-cards-list space-y-0 ${recordsTheme.recordsClass}`} style={{ fontFamily: recordsTheme.table.fontFamily }}>
        {records.map((r) => (
          <ListRow key={r.id} record={r} highlight={highlight} onOpen={onOpen} />
        ))}
      </div>
    );
  }

  if (layout === 'bento') {
    return (
      <div className={`rm-cards-bento grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 ${recordsTheme.recordsClass}`}>
        {records.map((r, i) => (
          <BentoCard key={r.id} record={r} shell={BENTO_SHELLS[i % BENTO_SHELLS.length]} onOpen={onOpen} />
        ))}
      </div>
    );
  }

  if (layout === 'grid' || layout === 'ornate' || layout === 'glass') {
    return (
      <div className={`rm-cards-grid grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 ${recordsTheme.recordsClass}`}>
        {records.map((r) => (
          <Card
            key={r.id}
            record={r}
            highlight={highlight}
            density={density}
            recordsTheme={recordsTheme}
            onOpen={onOpen}
          />
        ))}
      </div>
    );
  }

  return <CarouselCards records={records} highlight={highlight} density={density} recordsTheme={recordsTheme} onOpen={onOpen} />;
}

function CarouselCards({ records, highlight, density, recordsTheme, onOpen }: Props) {
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(3);
  const dc = densityClasses(density);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setPerPage(w < 640 ? 1 : w < 1024 ? 2 : 3);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const totalPages = Math.max(1, Math.ceil(records.length / perPage));
  const safePage = Math.min(page, totalPages - 1);
  const visible = records.slice(safePage * perPage, safePage * perPage + perPage);

  return (
    <div className={`relative ${recordsTheme.recordsClass}`}>
      <button
        type="button"
        onClick={() => setPage((p) => Math.max(0, p - 1))}
        disabled={safePage === 0}
        className="absolute -left-3 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--rm-border)] bg-[var(--rm-card)] shadow-md transition-all hover:scale-110 hover:bg-[var(--rm-muted)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft className="size-5 text-[var(--rm-fg)]" />
      </button>
      <button
        type="button"
        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
        disabled={safePage >= totalPages - 1}
        className="absolute -right-3 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--rm-border)] bg-[var(--rm-card)] shadow-md transition-all hover:scale-110 hover:bg-[var(--rm-muted)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronRight className="size-5 text-[var(--rm-fg)]" />
      </button>

      <div className="overflow-hidden px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={safePage}
            initial={{ x: 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -60, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className={`grid ${dc.gap}`}
            style={{ gridTemplateColumns: `repeat(${perPage}, minmax(0, 1fr))` }}
          >
            {visible.map((r) => (
              <Card key={r.id} record={r} highlight={highlight} density={density} recordsTheme={recordsTheme} onOpen={onOpen} />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-4 flex items-center justify-center gap-1.5">
        {Array.from({ length: totalPages }).map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setPage(i)}
            className={`h-1.5 rounded-full transition-all ${i === safePage ? 'w-6 bg-[var(--rm-accent)]' : 'w-2 bg-[var(--rm-border)] hover:bg-[var(--rm-muted-fg)]/50'}`}
          />
        ))}
      </div>
    </div>
  );
}

function cardShellClass(theme: PortalRecordsThemeStyle): string {
  if (theme.cards.layout === 'ornate') {
    return 'border-2 border-[var(--rm-accent)] bg-[var(--rm-card)] shadow-md';
  }
  if (theme.cards.layout === 'glass') {
    return 'portal-glass-card border border-[var(--rm-border)]';
  }
  return 'border border-[var(--rm-border)] bg-[var(--rm-card)] shadow-sm';
}

function Card({
  record,
  highlight,
  density,
  recordsTheme,
  onOpen,
}: {
  record: AnyRecord;
  highlight?: string;
  density: Density;
  recordsTheme: PortalRecordsThemeStyle;
  onOpen: (r: AnyRecord) => void;
}) {
  const dc = densityClasses(density);
  const name = recordPrimaryName(record);
  const isHi = highlight && name.toLowerCase().includes(highlight.toLowerCase());
  const TypeIcon = record.type === 'baptism' ? User2 : record.type === 'marriage' ? Heart : Cross;
  const typeLabel = record.type === 'baptism' ? 'Baptism' : record.type === 'marriage' ? 'Marriage' : 'Funeral';

  return (
    <button
      type="button"
      onClick={() => onOpen(record)}
      className={`group relative overflow-hidden text-left ${cardShellClass(recordsTheme)} ${dc.card} transition-all hover:-translate-y-0.5 hover:shadow-lg`}
      style={{
        borderRadius: recordsTheme.table.radius,
        fontFamily: recordsTheme.table.fontFamily,
        ...(isHi ? { boxShadow: '0 0 0 2px var(--rm-accent)' } : {}),
      }}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[var(--rm-accent)] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex size-10 items-center justify-center rounded-full bg-[var(--rm-accent-soft)] text-[var(--rm-accent)]">
            <TypeIcon className="size-5" />
          </div>
          <div className="text-[var(--rm-fg)]">{name}</div>
        </div>
        <StatusBadge status={record.status} />
      </div>
      <div className="mb-2 text-xs uppercase tracking-wider text-[var(--rm-muted-fg)]">{typeLabel}</div>
      <CardFields record={record} />
    </button>
  );
}

function BentoCard({ record, shell, onOpen }: { record: AnyRecord; shell: string; onOpen: (r: AnyRecord) => void }) {
  const name = recordPrimaryName(record);
  const TypeIcon = record.type === 'baptism' ? User2 : record.type === 'marriage' ? Heart : Cross;
  return (
    <button
      type="button"
      onClick={() => onOpen(record)}
      className={`rounded-2xl border-2 p-4 text-left transition-transform hover:scale-[1.01] ${shell}`}
    >
      <TypeIcon className="mb-2 size-5" />
      <p className="truncate text-sm font-bold">{name}</p>
      <p className="mt-1 text-xs text-[var(--rm-muted-fg)]">{recordClergy(record)}</p>
      <div className="mt-3"><StatusBadge status={record.status} /></div>
    </button>
  );
}

function ListRow({ record, highlight, onOpen }: { record: AnyRecord; highlight?: string; onOpen: (r: AnyRecord) => void }) {
  const name = recordPrimaryName(record);
  const isHi = highlight && name.toLowerCase().includes(highlight.toLowerCase());
  return (
    <button
      type="button"
      onClick={() => onOpen(record)}
      className={`flex w-full items-center justify-between gap-4 border-b border-[var(--rm-border)] py-4 text-left transition-colors hover:bg-[var(--rm-muted)]/40 ${isHi ? 'bg-[var(--rm-accent-soft)]' : ''}`}
    >
      <div>
        <p className="text-base font-semibold text-[var(--rm-fg)]">{name}</p>
        <p className="text-sm text-[var(--rm-muted-fg)]">{recordClergy(record)}</p>
      </div>
      <StatusBadge status={record.status} />
    </button>
  );
}

function CardFields({ record }: { record: AnyRecord }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
      {record.type === 'baptism' && (
        <>
          <Field label="Date of Birth" icon={Calendar} value={record.dob} />
          <Field label="Baptism Date" icon={Calendar} value={record.baptismDate} />
          <Field label="Church" icon={Home} value={record.church} />
          <Field label="Birthplace" icon={MapPin} value={record.birthplace} />
          <div className="col-span-2"><Field label="Clergy" icon={User2} value={record.clergy} /></div>
        </>
      )}
      {record.type === 'marriage' && (
        <>
          <Field label="Bride" icon={User2} value={record.bride} />
          <Field label="Groom" icon={User2} value={record.groom} />
          <Field label="Marriage Date" icon={Calendar} value={record.marriageDate} />
          <Field label="Church" icon={Home} value={record.church} />
          <div className="col-span-2"><Field label="Celebrant" icon={User2} value={recordClergy(record)} /></div>
        </>
      )}
      {record.type === 'funeral' && (
        <>
          <Field label="Date of Death" icon={Calendar} value={record.dod} />
          <Field label="Funeral Date" icon={Calendar} value={record.funeralDate} />
          <Field label="Church" icon={Home} value={record.church} />
          <Field label="Burial Place" icon={MapPin} value={record.burialPlace} />
          <div className="col-span-2"><Field label="Clergy" icon={User2} value={record.clergy} /></div>
        </>
      )}
    </div>
  );
}

function Field({ label, icon: Icon, value }: { label: string; icon: typeof Calendar; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-[var(--rm-muted-fg)]">
        <Icon className="size-3" /> {label}
      </div>
      <div className="mt-0.5 text-sm text-[var(--rm-fg)]">{value || '—'}</div>
    </div>
  );
}
