import { Calendar, ChevronLeft, ChevronRight, Download, FileText, History, Home, MapPin, Pencil, User2, X } from "@/ui/icons";
import { Drawer } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import apiClient from "@/api/utils/axiosInstance";
import type { AnyRecord } from "../types";
import { recordPrimaryName } from "../types";
import { StatusBadge } from "./StatusBadge";

interface Props {
  record: AnyRecord | null;
  churchId?: string | number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  focusAudit?: boolean;
  onEdit?: () => void;
  onExport?: () => void;
  onCertificate?: () => void;
  onStatusChange?: (recordId: string, status: string) => void;
}

const STATUS_OPTIONS = ["Recorded", "Awaiting Clergy", "Verified"] as const;

interface HistoryEvent {
  id: number;
  type: string;
  description: string;
  timestamp: string;
  actor: string | null;
  source: string;
  changedFields: string[];
}

const ENDPOINT_PREFIX: Record<AnyRecord["type"], string> = {
  baptism: "baptism-records",
  marriage: "marriage-records",
  funeral: "funeral-records",
};

const EVENT_META: Record<string, { label: string; dot: string }> = {
  create: { label: "Created", dot: "bg-emerald-500" },
  update: { label: "Updated", dot: "bg-blue-500" },
  merge: { label: "Merged", dot: "bg-amber-500" },
  delete: { label: "Deleted", dot: "bg-red-500" },
};

function formatWhen(ts: string): string {
  try {
    return new Date(ts).toLocaleString(undefined, {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return ts;
  }
}

export function RecordDrawer({ record, churchId, onClose, onPrev, onNext, focusAudit, onEdit, onExport, onCertificate, onStatusChange }: Props) {
  const auditRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (focusAudit && record && auditRef.current) {
      auditRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [focusAudit, record]);

  // Load the real audit trail from the church's {type}_history table.
  const recordId = record?.id;
  const recordType = record?.type;
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [statusSaving, setStatusSaving] = useState(false);

  useEffect(() => {
    if (!recordId || !recordType) return;
    let cancelled = false;
    setHistoryLoading(true);
    setHistoryError(null);
    setHistory([]);
    const q = churchId ? `?church_id=${churchId}` : "";
    apiClient
      .get<{ success: boolean; history: HistoryEvent[] }>(`/${ENDPOINT_PREFIX[recordType]}/${recordId}/history${q}`)
      .then((res: any) => { if (!cancelled) setHistory(res?.history ?? []); })
      .catch((err: any) => { if (!cancelled) setHistoryError(err?.message || "Failed to load history"); })
      .finally(() => { if (!cancelled) setHistoryLoading(false); });
    return () => { cancelled = true; };
  }, [recordId, recordType, churchId, reloadKey]);

  async function changeStatus(newStatus: string) {
    if (!recordId || !recordType || statusSaving || newStatus === record?.status) return;
    setStatusSaving(true);
    try {
      await apiClient.patch(`/${ENDPOINT_PREFIX[recordType]}/${recordId}/status`, { status: newStatus, church_id: churchId });
      onStatusChange?.(recordId, newStatus); // update the list badge
      setReloadKey((k) => k + 1);             // refresh the audit trail
    } catch {
      // best-effort; the badge stays on the prior status if the call fails
    } finally {
      setStatusSaving(false);
    }
  }

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

            <Section title="Status">
              <div className="flex flex-wrap items-center gap-2">
                {STATUS_OPTIONS.map((s) => {
                  const active = record.status === s;
                  return (
                    <button
                      key={s}
                      disabled={statusSaving}
                      onClick={() => changeStatus(s)}
                      className={`px-2.5 py-1 rounded-md text-xs border transition-all disabled:opacity-60 ${
                        active
                          ? "border-[var(--rm-accent)] text-[var(--rm-accent)] bg-[var(--rm-accent-soft)]"
                          : "border-[var(--rm-border)] text-[var(--rm-muted-fg)] hover:bg-[var(--rm-muted)]"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
                {statusSaving && <span className="text-xs text-[var(--rm-muted-fg)]">Saving…</span>}
              </div>
            </Section>

            <div ref={auditRef}>
              <Section title="Audit Trail">
                {historyLoading ? (
                  <div className="text-sm text-[var(--rm-muted-fg)]">Loading history…</div>
                ) : historyError ? (
                  <div className="text-sm text-red-500">{historyError}</div>
                ) : history.length === 0 ? (
                  <div className="text-sm text-[var(--rm-muted-fg)]">No history recorded for this record yet.</div>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {history.map((ev) => {
                      const meta = EVENT_META[ev.type] || { label: ev.type, dot: "bg-indigo-500" };
                      return (
                        <li key={ev.id} className="flex items-start gap-3">
                          <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${meta.dot}`} />
                          <div className="flex-1 min-w-0">
                            <div className="text-[var(--rm-fg)]">
                              {meta.label}
                              {ev.actor && <span className="text-[var(--rm-muted-fg)]"> by {ev.actor}</span>}
                              {ev.source && <span className="text-[var(--rm-muted-fg)]"> · {ev.source}</span>}
                            </div>
                            {ev.changedFields.length > 0 && (
                              <div className="text-xs text-[var(--rm-muted-fg)] truncate" title={ev.changedFields.join(", ")}>
                                Changed: {ev.changedFields.join(", ")}
                              </div>
                            )}
                            <div className="text-xs text-[var(--rm-muted-fg)]">{formatWhen(ev.timestamp)}</div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Section>
            </div>

            <div className={`grid ${showCert ? "grid-cols-4" : "grid-cols-3"} gap-2 pt-2`}>
              <button onClick={onEdit} className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-md text-white text-sm transition-all bg-[var(--rm-accent)] hover:bg-[var(--rm-accent-hover)]"><Pencil className="w-4 h-4" /> Edit</button>
              <button onClick={() => auditRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })} className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-md border border-[var(--rm-border)] text-sm text-[var(--rm-fg)] hover:bg-[var(--rm-muted)] transition-all"><History className="w-4 h-4" /> Audit</button>
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
