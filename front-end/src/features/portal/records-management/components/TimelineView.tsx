import { MapPin, User2 } from "@/ui/icons";
import type { AnyRecord, Density } from "../types";
import { densityClasses, recordClergy, recordPrimaryDate, recordPrimaryName } from "../types";
import { StatusBadge } from "./StatusBadge";

interface Props {
  records: AnyRecord[];
  highlight?: string;
  density: Density;
  onOpen: (r: AnyRecord) => void;
}

export function TimelineView({ records, highlight, density, onOpen }: Props) {
  const dc = densityClasses(density);
  return (
    <div className="bg-[var(--rm-card)] border border-[var(--rm-border)] rounded-xl p-6">
      <div className="relative">
        <div className="absolute left-[88px] top-0 bottom-0 w-px bg-[var(--rm-border)]" />
        <div className="space-y-2">
          {records.slice(0, 12).map((r) => {
            const name = recordPrimaryName(r);
            const date = recordPrimaryDate(r);
            const isHi = highlight && name.toLowerCase().includes(highlight.toLowerCase());
            const parts = date.split(" ");
            const place = r.type === "baptism" ? r.birthplace : r.type === "funeral" ? r.burialPlace : r.church;
            return (
              <button
                key={r.id}
                onClick={() => onOpen(r)}
                className={`w-full text-left flex items-center gap-4 ${dc.row.includes("py-4") ? "p-4" : dc.row.includes("py-1.5") ? "p-2" : "p-3"} rounded-lg transition-all hover:bg-[var(--rm-muted)] hover:-translate-y-0.5 hover:shadow-md`}
                style={isHi ? { boxShadow: `0 0 0 2px var(--rm-accent)`, background: "var(--rm-accent-soft)" } : undefined}
              >
                <div className="w-20 text-right shrink-0">
                  <div className="text-xs text-[var(--rm-muted-fg)] uppercase tracking-wider">{parts[0]?.slice(0, 3)} {parts[1]?.replace(",", "")}</div>
                  <div className="text-sm text-[var(--rm-fg)]">{parts[2]}</div>
                </div>
                <div className="w-3 h-3 rounded-full shrink-0 bg-[var(--rm-accent)] hover:scale-125 transition-transform" style={{ boxShadow: `0 0 0 4px var(--rm-accent-soft)` }} />
                <div className="flex-1 min-w-0 grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-12 sm:col-span-4">
                    <div className="text-[var(--rm-fg)]">{name}</div>
                    <div className="text-xs text-[var(--rm-muted-fg)]">Record No. {r.recordNo}</div>
                  </div>
                  <div className="hidden sm:block sm:col-span-2 text-xs text-[var(--rm-muted-fg)]">
                    <div className="uppercase tracking-wider">{r.type === "baptism" ? "Baptism" : r.type === "marriage" ? "Marriage" : "Funeral"} Date</div>
                    <div className="text-[var(--rm-fg)] text-sm">{date}</div>
                  </div>
                  <div className="hidden md:flex md:col-span-2 items-center gap-1 text-sm text-[var(--rm-fg)]">
                    <span className="text-[var(--rm-muted-fg)]">Church:</span> {r.church}
                  </div>
                  <div className="hidden lg:flex lg:col-span-2 items-center gap-1 text-sm text-[var(--rm-fg)]">
                    <MapPin className="w-3.5 h-3.5 text-[var(--rm-muted-fg)]" /> {place || "—"}
                  </div>
                  <div className="hidden lg:flex lg:col-span-1 items-center gap-1 text-xs text-[var(--rm-muted-fg)] truncate">
                    <User2 className="w-3.5 h-3.5" /> {recordClergy(r).replace("Rev. ", "")}
                  </div>
                  <div className="col-span-12 sm:col-span-1 flex justify-end">
                    <StatusBadge status={r.status} />
                  </div>
                </div>
              </button>
            );
          })}
          {records.length === 0 && (
            <div className="py-8 text-center text-[var(--rm-muted-fg)]">No records found</div>
          )}
        </div>
      </div>
    </div>
  );
}
