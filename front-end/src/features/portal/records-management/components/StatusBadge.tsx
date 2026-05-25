import { CheckCircle2, Clock, ShieldCheck } from "@/ui/icons";
import type { RecordStatus } from "../types";

const MAP = {
  "Recorded": { icon: CheckCircle2, cls: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30" },
  "Verified": { icon: ShieldCheck, cls: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30" },
  "Awaiting Clergy": { icon: Clock, cls: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30" },
} as const;

export function StatusBadge({ status }: { status: RecordStatus }) {
  const { icon: Icon, cls } = MAP[status] || MAP["Recorded"];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs ${cls}`}>
      <Icon className="w-3 h-3" /> {status}
    </span>
  );
}
