import { Calendar, ChevronLeft, ChevronRight, Download, FileText, History, Home, MapPin, Pencil, User2, X } from "@/ui/icons";
import { Drawer } from "@mui/material";
import { useEffect, useRef } from "react";
import type { AnyRecord } from "../types";
import { recordClergy, recordPrimaryName } from "../types";
import { StatusBadge } from "./StatusBadge";

interface Props {
  record: AnyRecord | null;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  focusAudit?: boolean;
  onEdit?: () => void;
  onExport?: () => void;
  onCertificate?: () => void;
}

export function RecordDrawer({ record, onClose, onPrev, onNext, focusAudit, onEdit, onExport, onCertificate }: Props) {
  const auditRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (focusAudit && record && auditRef.current) {
      auditRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [focusAudit, record]);

  const typeLabel = record?.type === "baptism" ? "BAPTISM RECORD" : record?.type === "marriage" ? "MARRIAGE RECORD" : "FUNERAL RECORD";
  const showCert = record?.type === "baptism" || record?.type === "marriage";

  return (
    <Drawer
      anchor="right"
      open={!!record}
      onClose={onClose}
      slotProps={{ backdrop: { sx: { backgroundColor: 'rgba(0,0,0,0.25)' } } }}
      PaperProps={{ sx: { width: { xs: '100%', sm: 420 }, bgcolor: 'transparent' } }}
    >
      {record && (
        <div className="rm-scope h-full overflow-y-auto" style={{ background: 'var(--rm-bg)' }}>
          <div className="relative text-white p-6" style={{ background: 'linear-gradient(to bottom right, var(--rm-accent-dark), var(--rm-accent))' }}>
            <div className="flex items-center justify-between mb-3">
              <button onClick={onPrev} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all hover:scale-105" title="Previous record">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={onNext} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all hover:scale-105" title="Next record">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-md hover:bg-white/10 flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-widest text-[#e9c46a]">{typeLabel}</div>
              <div className="text-lg font-semibold">{recordPrimaryName(record)}</div>
              <div className="text-xs text-white/70">Record No. {record.recordNo}</div>
            </div>
            <div className="mt-3"><StatusBadge status={record.status} /></div>
          </div>

          <div className="p-6 space-y-5">
            <Section title="Sacrament Details">
              {record.type === "baptism" && (
                <>
                  <Detail icon={Calendar} label="Date of Birth" value={record.dob} />
                  <Detail icon={Calendar} label="Baptism Date" value={record.baptismDate} />
                  <Detail icon={Home} label="Church" value={record.church} />
                  <Detail icon={MapPin} label="Birthplace" value={record.birthplace} />
                  <Detail icon={MapPin} label="Address" value={record.address} />
                  <Detail icon={User2} label="Clergy" value={record.clergy} />
                </>
              )}
              {record.type === "marriage" && (
                <>
                  <Detail icon={User2} label="Bride" value={record.bride} />
                  <Detail icon={User2} label="Groom" value={record.groom} />
                  <Detail icon={Calendar} label="Marriage Date" value={record.marriageDate} />
                  <Detail icon={Home} label="Church" value={record.church} />
                  <Detail icon={User2} label="Celebrant" value={record.celebrant} />
                  <Detail icon={User2} label="Witnesses" value={record.witnesses} />
                </>
              )}
              {record.type === "funeral" && (
                <>
                  <Detail icon={Calendar} label="Date of Death" value={record.dod} />
                  <Detail icon={Calendar} label="Funeral Date" value={record.funeralDate} />
                  <Detail icon={Home} label="Church" value={record.church} />
                  <Detail icon={MapPin} label="Burial Place" value={record.burialPlace} />
                  <Detail icon={User2} label="Clergy" value={record.clergy} />
                </>
              )}
            </Section>

            <div ref={auditRef}>
              <Section title="Audit Trail">
                <ul className="space-y-2 text-sm">
                  {[
                    ["Created", recordClergy(record), "2024-03-12"],
                    ["Verified", recordClergy(record), "2024-03-13"],
                    ["Last edited", recordClergy(record), "2025-09-21"],
                  ].map(([action, by, when]) => (
                    <li key={action} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-indigo-500" />
                      <div className="flex-1">
                        <div className="text-[var(--rm-fg)]">{action} <span className="text-[var(--rm-muted-fg)]">by {by}</span></div>
                        <div className="text-xs text-[var(--rm-muted-fg)]">{when}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </Section>
            </div>

            <div className={`grid ${showCert ? "grid-cols-4" : "grid-cols-3"} gap-2 pt-2`}>
              <button onClick={onEdit} className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-md text-white text-sm transition-all bg-[var(--rm-accent)] hover:bg-[var(--rm-accent-hover)]"><Pencil className="w-4 h-4" /> Edit</button>
              <button className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-md border border-[var(--rm-border)] text-sm text-[var(--rm-fg)] hover:bg-[var(--rm-muted)] transition-all"><History className="w-4 h-4" /> Audit</button>
              <button onClick={onExport} className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-md border border-[var(--rm-border)] text-sm text-[var(--rm-fg)] hover:bg-[var(--rm-muted)] transition-all"><Download className="w-4 h-4" /> Export</button>
              {showCert && (
                <button onClick={onCertificate} className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-md border border-green-600 text-sm text-green-600 hover:bg-green-600/10 transition-all"><FileText className="w-4 h-4" /> Cert</button>
              )}
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}

function Section({ title, children }: any) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-[var(--rm-muted-fg)] mb-2">{title}</div>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function Detail({ icon: Icon, label, value }: any) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-full bg-[var(--rm-muted)] text-[var(--rm-muted-fg)] flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-[var(--rm-muted-fg)]">{label}</div>
        <div className="text-sm text-[var(--rm-fg)]">{value || "—"}</div>
      </div>
    </div>
  );
}
