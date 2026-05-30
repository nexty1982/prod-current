import { Calendar, ChevronLeft, ChevronRight, Cross, Heart, Home, MapPin, User2 } from "@/ui/icons";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { AnyRecord, Density } from "../types";
import { densityClasses, recordClergy, recordPrimaryName } from "../types";
import { StatusBadge } from "./StatusBadge";

interface Props {
  records: AnyRecord[];
  highlight?: string;
  density: Density;
  onOpen: (r: AnyRecord) => void;
}

export function CardsView({ records, highlight, density, onOpen }: Props) {
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(3);
  const dc = densityClasses(density);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setPerPage(w < 640 ? 1 : w < 1024 ? 2 : 3);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const totalPages = Math.max(1, Math.ceil(records.length / perPage));
  const safePage = Math.min(page, totalPages - 1);
  const visible = records.slice(safePage * perPage, safePage * perPage + perPage);

  return (
    <div className="relative">
      <button
        onClick={() => setPage((p) => Math.max(0, p - 1))}
        disabled={safePage === 0}
        className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-[var(--rm-card)] border border-[var(--rm-border)] shadow-md hover:bg-[var(--rm-muted)] hover:scale-110 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all"
      >
        <ChevronLeft className="w-5 h-5 text-[var(--rm-fg)]" />
      </button>
      <button
        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
        disabled={safePage >= totalPages - 1}
        className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-[var(--rm-card)] border border-[var(--rm-border)] shadow-md hover:bg-[var(--rm-muted)] hover:scale-110 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all"
      >
        <ChevronRight className="w-5 h-5 text-[var(--rm-fg)]" />
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
            {visible.map((r) => <Card key={r.id} record={r} highlight={highlight} density={density} onOpen={onOpen} />)}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-center gap-1.5 mt-4">
        {Array.from({ length: totalPages }).map((_, i) => (
          <button
            key={i}
            onClick={() => setPage(i)}
            className={`h-1.5 rounded-full transition-all ${i === safePage ? "w-6 bg-[var(--rm-accent)]" : "w-2 bg-[var(--rm-border)] hover:bg-[var(--rm-muted-fg)]/50"}`}
          />
        ))}
      </div>
    </div>
  );
}

function Card({ record, highlight, density, onOpen }: { record: AnyRecord; highlight?: string; density: Density; onOpen: (r: AnyRecord) => void }) {
  const dc = densityClasses(density);
  const name = recordPrimaryName(record);
  const isHi = highlight && name.toLowerCase().includes(highlight.toLowerCase());
  const TypeIcon = record.type === "baptism" ? User2 : record.type === "marriage" ? Heart : Cross;
  const typeLabel = record.type === "baptism" ? "Baptism" : record.type === "marriage" ? "Marriage" : "Funeral";

  return (
    <button
      onClick={() => onOpen(record)}
      className={`group text-left bg-[var(--rm-card)] border border-[var(--rm-border)] rounded-xl ${dc.card} hover:-translate-y-1 hover:shadow-xl transition-all relative overflow-hidden`}
      style={isHi ? { boxShadow: `0 0 0 2px var(--rm-accent)` } : undefined}
    >
      <div className="absolute inset-x-0 top-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-transparent via-[var(--rm-accent)] to-transparent" />
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--rm-accent-soft)] text-[var(--rm-accent)]">
            <TypeIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[var(--rm-fg)]">{name}</div>
          </div>
        </div>
        <StatusBadge status={record.status} />
      </div>
      <div className="text-xs uppercase tracking-wider text-[var(--rm-muted-fg)] mb-2">{typeLabel}</div>
      <div className="grid grid-cols-2 gap-y-3 gap-x-4">
        {record.type === "baptism" && (
          <>
            <Field label="Date of Birth" icon={Calendar} value={record.dob} />
            <Field label="Baptism Date" icon={Calendar} value={record.baptismDate} />
            <Field label="Church" icon={Home} value={record.church} />
            <Field label="Birthplace" icon={MapPin} value={record.birthplace} />
            <div className="col-span-2"><Field label="Address" icon={MapPin} value={record.address} /></div>
            <div className="col-span-2"><Field label="Clergy" icon={User2} value={record.clergy} /></div>
          </>
        )}
        {record.type === "marriage" && (
          <>
            <Field label="Bride" icon={User2} value={record.bride} />
            <Field label="Groom" icon={User2} value={record.groom} />
            <Field label="Marriage Date" icon={Calendar} value={record.marriageDate} />
            <Field label="Church" icon={Home} value={record.church} />
            <div className="col-span-2"><Field label="Witnesses" icon={User2} value={record.witnesses} /></div>
            <div className="col-span-2"><Field label="Celebrant" icon={User2} value={recordClergy(record)} /></div>
          </>
        )}
        {record.type === "funeral" && (
          <>
            <Field label="Date of Death" icon={Calendar} value={record.dod} />
            <Field label="Funeral Date" icon={Calendar} value={record.funeralDate} />
            <Field label="Church" icon={Home} value={record.church} />
            <Field label="Burial Place" icon={MapPin} value={record.burialPlace} />
            <div className="col-span-2"><Field label="Clergy" icon={User2} value={record.clergy} /></div>
          </>
        )}
      </div>
    </button>
  );
}

function Field({ label, icon: Icon, value }: { label: string; icon: any; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-[var(--rm-muted-fg)] flex items-center gap-1"><Icon className="w-3 h-3" /> {label}</div>
      <div className="text-sm text-[var(--rm-fg)] mt-0.5">{value || "—"}</div>
    </div>
  );
}
