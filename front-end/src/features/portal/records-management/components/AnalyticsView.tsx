import { Activity, Award, Calendar, ChevronRight, Cross, Droplet, Heart, TrendingUp } from "@/ui/icons";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AnyRecord, RecordType } from "../types";
import { recordClergy, recordPrimaryDate, recordPrimaryName } from "../types";
import { StatusBadge } from "./StatusBadge";

interface AnalyticsConfig {
  totalLabel: string; totalValue: string;
  thisYearLabel: string; thisYearValue: string;
  peakLabel: string; peakValue: string; peakSub: string;
  avgLabel: string; avgValue: string;
  totalIcon: any;
  trends: { year: string; v: number }[];
  distribution: { name: string; value: number; color: string }[];
  yoy: { y: string; v: number }[];
  seasonal: { m: string; v: number }[];
  completeness: number;
  yoyDelta: string;
  trendsLabel: string;
  seasonalLabel: string;
}

const baptismConfig: AnalyticsConfig = {
  totalLabel: "Total Baptisms", totalValue: "620",
  thisYearLabel: "Baptisms This Year", thisYearValue: "42",
  peakLabel: "Peak Baptism Year", peakValue: "1953", peakSub: "32 baptisms",
  avgLabel: "Avg. Baptisms Per Year", avgValue: "8.2",
  totalIcon: Droplet,
  trends: [
    { year: "1945", v: 12 },{ year: "1950", v: 18 },{ year: "1953", v: 32 },{ year: "1958", v: 28 },
    { year: "1963", v: 22 },{ year: "1968", v: 30 },{ year: "1973", v: 24 },{ year: "1978", v: 19 },
    { year: "1983", v: 26 },{ year: "1988", v: 22 },{ year: "1993", v: 17 },{ year: "1998", v: 14 },
    { year: "2003", v: 11 },{ year: "2008", v: 9 },{ year: "2013", v: 8 },{ year: "2018", v: 7 },
    { year: "2023", v: 10 },{ year: "2025", v: 42 },
  ],
  distribution: [
    { name: "Baptisms", value: 420, color: "var(--rm-accent)" },
    { name: "Funerals", value: 110, color: "#e9c46a" },
    { name: "Marriages", value: 90, color: "#7a1111" },
  ],
  yoy: [{ y: "2021", v: 28 },{ y: "2022", v: 34 },{ y: "2023", v: 31 },{ y: "2024", v: 38 },{ y: "2025", v: 42 }],
  seasonal: [
    { m: "Jan", v: 28 },{ m: "Feb", v: 22 },{ m: "Mar", v: 35 },{ m: "Apr", v: 48 },{ m: "May", v: 52 },{ m: "Jun", v: 44 },
    { m: "Jul", v: 38 },{ m: "Aug", v: 36 },{ m: "Sep", v: 32 },{ m: "Oct", v: 30 },{ m: "Nov", v: 28 },{ m: "Dec", v: 27 },
  ],
  completeness: 98, yoyDelta: "+10.5% vs last year",
  trendsLabel: "Baptism Trends", seasonalLabel: "Seasonal Baptism Patterns",
};

const marriageConfig: AnalyticsConfig = {
  totalLabel: "Total Marriages", totalValue: "184",
  thisYearLabel: "Marriages This Year", thisYearValue: "14",
  peakLabel: "Peak Marriage Year", peakValue: "1962", peakSub: "21 marriages",
  avgLabel: "Avg. Marriages Per Year", avgValue: "4.6",
  totalIcon: Heart,
  trends: [
    { year: "1955", v: 8 },{ year: "1960", v: 14 },{ year: "1962", v: 21 },{ year: "1968", v: 17 },
    { year: "1975", v: 12 },{ year: "1985", v: 10 },{ year: "1995", v: 8 },{ year: "2005", v: 6 },
    { year: "2015", v: 7 },{ year: "2020", v: 9 },{ year: "2025", v: 14 },
  ],
  distribution: [
    { name: "Crowning", value: 142, color: "var(--rm-accent)" },
    { name: "Civil + Blessing", value: 28, color: "#e9c46a" },
    { name: "Convalidation", value: 14, color: "#7a1111" },
  ],
  yoy: [{ y: "2021", v: 9 },{ y: "2022", v: 11 },{ y: "2023", v: 10 },{ y: "2024", v: 12 },{ y: "2025", v: 14 }],
  seasonal: [
    { m: "Jan", v: 4 },{ m: "Feb", v: 6 },{ m: "Mar", v: 8 },{ m: "Apr", v: 12 },{ m: "May", v: 22 },{ m: "Jun", v: 28 },
    { m: "Jul", v: 24 },{ m: "Aug", v: 22 },{ m: "Sep", v: 20 },{ m: "Oct", v: 18 },{ m: "Nov", v: 10 },{ m: "Dec", v: 10 },
  ],
  completeness: 96, yoyDelta: "+16.7% vs last year",
  trendsLabel: "Marriage Trends", seasonalLabel: "Seasonal Marriage Patterns",
};

const funeralConfig: AnalyticsConfig = {
  totalLabel: "Total Funerals", totalValue: "312",
  thisYearLabel: "Funerals This Year", thisYearValue: "19",
  peakLabel: "Peak Funeral Year", peakValue: "1979", peakSub: "24 funerals",
  avgLabel: "Avg. Funerals Per Year", avgValue: "6.8",
  totalIcon: Cross,
  trends: [
    { year: "1955", v: 9 },{ year: "1965", v: 14 },{ year: "1975", v: 19 },{ year: "1979", v: 24 },
    { year: "1985", v: 18 },{ year: "1995", v: 16 },{ year: "2005", v: 14 },{ year: "2015", v: 12 },
    { year: "2020", v: 22 },{ year: "2023", v: 17 },{ year: "2025", v: 19 },
  ],
  distribution: [
    { name: "Parish Cemetery", value: 168, color: "var(--rm-accent)" },
    { name: "Manville", value: 74, color: "#e9c46a" },
    { name: "Other", value: 70, color: "#7a1111" },
  ],
  yoy: [{ y: "2021", v: 14 },{ y: "2022", v: 17 },{ y: "2023", v: 17 },{ y: "2024", v: 16 },{ y: "2025", v: 19 }],
  seasonal: [
    { m: "Jan", v: 32 },{ m: "Feb", v: 30 },{ m: "Mar", v: 28 },{ m: "Apr", v: 22 },{ m: "May", v: 18 },{ m: "Jun", v: 17 },
    { m: "Jul", v: 18 },{ m: "Aug", v: 19 },{ m: "Sep", v: 22 },{ m: "Oct", v: 26 },{ m: "Nov", v: 30 },{ m: "Dec", v: 30 },
  ],
  completeness: 94, yoyDelta: "+18.8% vs last year",
  trendsLabel: "Funeral Trends", seasonalLabel: "Seasonal Funeral Patterns",
};

const CONFIGS: Record<RecordType, AnalyticsConfig> = { baptism: baptismConfig, marriage: marriageConfig, funeral: funeralConfig };

export function AnalyticsView({ records, recordType, totalRecords, onOpen }: { records: AnyRecord[]; recordType: RecordType; totalRecords: number; onOpen: (r: AnyRecord) => void }) {
  const cfg = CONFIGS[recordType];
  const accent = "var(--rm-accent)";
  const displayTotal = totalRecords > 0 ? String(totalRecords) : cfg.totalValue;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <Kpi icon={cfg.totalIcon} label={cfg.totalLabel} value={displayTotal} color={accent} />
      <Kpi icon={Calendar} label={cfg.thisYearLabel} value={cfg.thisYearValue} color="#1a5e3a" />
      <Kpi icon={Award} label={cfg.peakLabel} value={cfg.peakValue} color="#e9c46a" sub={cfg.peakSub} />
      <Kpi icon={Activity} label={cfg.avgLabel} value={cfg.avgValue} color="#7a1111" />

      <ChartCard title={cfg.trendsLabel} className="xl:col-span-2">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={cfg.trends}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--rm-border)" vertical={false} />
            <XAxis dataKey="year" tick={{ fill: "var(--rm-muted-fg)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "var(--rm-muted-fg)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "var(--rm-popover)", border: "1px solid var(--rm-border)", borderRadius: 8 }} />
            <Bar dataKey="v" fill={accent} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Record Distribution">
        <div className="flex items-center gap-4">
          <div className="w-[55%] h-[220px]" style={{ overflow: 'visible' }}>
            <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
              <Pie data={cfg.distribution} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                {cfg.distribution.map((d, i) => <Cell key={`cell-${i}`} fill={d.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--rm-popover)", border: "1px solid var(--rm-border)", borderRadius: 8 }} />
            </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 text-sm">
            {cfg.distribution.map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: d.color }} />
                <span className="text-[var(--rm-muted-fg)] w-28">{d.name}</span>
                <span className="text-[var(--rm-fg)]">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </ChartCard>

      <ChartCard title="Year-over-Year Comparison">
        <div className="flex items-center gap-2 mb-1 text-emerald-600 dark:text-emerald-400 text-sm">
          <TrendingUp className="w-4 h-4" /> {cfg.yoyDelta}
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={cfg.yoy}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--rm-border)" vertical={false} />
            <XAxis dataKey="y" tick={{ fill: "var(--rm-muted-fg)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "var(--rm-muted-fg)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "var(--rm-popover)", border: "1px solid var(--rm-border)", borderRadius: 8 }} />
            <Line type="monotone" dataKey="v" stroke={accent} strokeWidth={2.5} dot={{ fill: accent, r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title={cfg.seasonalLabel} className="xl:col-span-2">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={cfg.seasonal}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--rm-border)" vertical={false} />
            <XAxis dataKey="m" tick={{ fill: "var(--rm-muted-fg)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "var(--rm-muted-fg)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "var(--rm-popover)", border: "1px solid var(--rm-border)", borderRadius: 8 }} />
            <Bar dataKey="v" fill="#1a5e3a" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Data Completeness">
        <div className="flex flex-col items-center justify-center h-[200px]">
          <div className="relative w-32 h-32">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              <circle cx="60" cy="60" r="48" stroke="var(--rm-border)" strokeWidth="12" fill="none" />
              <circle cx="60" cy="60" r="48" stroke="#1a5e3a" strokeWidth="12" fill="none"
                strokeDasharray={`${2 * Math.PI * 48 * (cfg.completeness / 100)} ${2 * Math.PI * 48}`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-2xl text-[var(--rm-fg)]">{cfg.completeness}%</div>
          </div>
          <div className="text-xs text-[var(--rm-muted-fg)] mt-2">{Math.round((cfg.completeness / 100) * Number(displayTotal))} of {displayTotal} records complete</div>
        </div>
      </ChartCard>

      <ChartCard title={`Recent ${recordType === "baptism" ? "Baptism" : recordType === "marriage" ? "Marriage" : "Funeral"} Records`} className="xl:col-span-2">
        <div className="divide-y divide-[var(--rm-border)]">
          {records.slice(0, 6).map((r) => {
            const name = recordPrimaryName(r);
            const initials = name.split(/[\s&]+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("");
            return (
              <button key={r.id} onClick={() => onOpen(r)} className="w-full flex items-center gap-3 py-2.5 px-1 text-left hover:bg-[var(--rm-muted)] rounded-md transition-colors">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs bg-[var(--rm-accent-soft)] text-[var(--rm-accent)]">{initials}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[var(--rm-fg)] truncate">{name}</div>
                  <div className="text-xs text-[var(--rm-muted-fg)]">{recordPrimaryDate(r)} · {recordClergy(r)}</div>
                </div>
                <StatusBadge status={r.status} />
                <ChevronRight className="w-4 h-4 text-[var(--rm-muted-fg)]" />
              </button>
            );
          })}
          {records.length === 0 && <div className="py-6 text-center text-[var(--rm-muted-fg)]">No records found</div>}
        </div>
      </ChartCard>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, color, sub }: any) {
  return (
    <div className="group bg-[var(--rm-card)] border border-[var(--rm-border)] rounded-xl p-4 hover:-translate-y-1 hover:shadow-lg transition-all">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 bg-[var(--rm-accent-soft)]" style={{ color }}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="text-xs uppercase tracking-wider text-[var(--rm-muted-fg)]">{label}</div>
      </div>
      <div className="mt-3 text-2xl text-[var(--rm-fg)]">{value}</div>
      {sub && <div className="text-xs text-[var(--rm-muted-fg)] mt-0.5">{sub}</div>}
    </div>
  );
}

function ChartCard({ title, children, className = "" }: any) {
  return (
    <div className={`bg-[var(--rm-card)] border border-[var(--rm-border)] rounded-xl p-4 hover:-translate-y-0.5 hover:shadow-lg transition-all ${className}`}>
      <div className="text-sm text-[var(--rm-fg)] mb-3">{title}</div>
      {children}
    </div>
  );
}
