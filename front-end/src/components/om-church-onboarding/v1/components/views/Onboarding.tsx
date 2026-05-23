import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Switch } from "../ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";
import { Logo } from "../Logo";
import { PriorityBadge } from "../PriorityBadge";
import { ThemeToggle } from "../ThemeToggle";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Save,
  Droplets,
  HeartHandshake,
  Flame,
  ShieldCheck,
  Building2,
  Mail,
  Phone,
  Globe,
  X,
  CircleAlert,
  PartyPopper,
  Copy,
  MapPin,
  Search,
  Loader2,
} from "lucide-react";

const steps = [
  { key: "find-parish", label: "Find Your Parish", n: 1 },
  { key: "profile", label: "Church Profile", n: 2 },
  { key: "modules", label: "Record Modules", n: 3 },
  { key: "admin", label: "Admin Account", n: 4 },
  { key: "review", label: "Review & Submit", n: 5 },
  { key: "confirm", label: "Confirmation", n: 6 },
] as const;

type StepKey = (typeof steps)[number]["key"];

type Props = {
  onCancel: () => void;
  onComplete: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
};

type CrmChurch = {
  id: number;
  name: string;
  city: string;
  state_code: string;
  jurisdiction: string;
};

const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
  IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
  MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
  NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
  NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon",
  PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota",
  TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia",
  WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};
const STATE_CODES = Object.keys(STATE_NAMES);

export function Onboarding({ onCancel, onComplete, theme, onToggleTheme }: Props) {
  const [step, setStep] = useState<StepKey>("find-parish");

  // Frame 1: parish location
  const [parish, setParish] = useState<{
    state: string;
    query: string;
    results: CrmChurch[];
    selected: CrmChurch | null;
    searching: boolean;
    notListed: boolean;
    manualName: string;
  }>({
    state: "",
    query: "",
    results: [],
    selected: null,
    searching: false,
    notListed: false,
    manualName: "",
  });

  const [profile, setProfile] = useState({
    churchName: "Holy Trinity Orthodox Church",
    jurisdiction: "Greek Orthodox Archdiocese of America",
    firstName: "Andreas",
    lastName: "Stavros",
    email: "frandreas@holytrinity.org",
    phone: "(312) 555-0140",
    website: "https://holytrinity.org",
    address: "245 N. Cathedral Way",
    city: "Chicago",
    state: "IL",
    zip: "60611",
    country: "United States",
    timezone: "America/Chicago",
    size: "200–500",
    referral: "Diocesan recommendation",
  });
  const [modules, setModules] = useState({ baptism: true, marriage: true, funeral: false });
  const [admin, setAdmin] = useState({
    firstName: "Andreas",
    lastName: "Stavros",
    email: "frandreas@holytrinity.org",
    password: "",
    confirm: "",
    secondAdmin: false,
  });

  const stepIndex = steps.findIndex((s) => s.key === step);

  const findParishComplete =
    parish.selected !== null ||
    (parish.notListed && parish.manualName.trim().length > 0);

  const canProceed = step === "find-parish" ? findParishComplete : true;

  function goNext() {
    if (!canProceed) return;
    if (stepIndex < steps.length - 1) setStep(steps[stepIndex + 1].key);
  }
  function goBack() {
    if (stepIndex > 0) setStep(steps[stepIndex - 1].key);
    else onCancel();
  }

  const selectedModules = Object.entries(modules).filter(([, v]) => v).map(([k]) => k);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo size="sm" />
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="hidden md:inline-flex">
              <Save className="h-3 w-3 mr-1" /> Draft saved · 2 min ago
            </Badge>
            <Button variant="ghost" onClick={onCancel}>
              <X className="h-4 w-4 mr-2" /> Cancel
            </Button>
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10 grid lg:grid-cols-[260px_1fr] gap-10">
        <aside>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-3">
            Onboarding Wizard
          </div>
          <ol className="space-y-1">
            {steps.map((s, i) => {
              const done = i < stepIndex;
              const active = i === stepIndex;
              return (
                <li key={s.key}>
                  <button
                    onClick={() => i <= stepIndex && setStep(s.key)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-md text-left transition-colors ${
                      active
                        ? "bg-[#3a1d6e] text-white"
                        : done
                          ? "text-foreground hover:bg-muted"
                          : "text-muted-foreground"
                    }`}
                  >
                    <span
                      className={`h-6 w-6 rounded-full flex items-center justify-center text-xs shrink-0 ${
                        active
                          ? "bg-[#c9a14a] text-[#2a1450]"
                          : done
                            ? "bg-[#c9a14a]/30 text-[#5a4413] dark:text-[#e3c483]"
                            : "border border-border"
                      }`}
                    >
                      {done ? <Check className="h-3.5 w-3.5" /> : s.n}
                    </span>
                    <div>
                      <div className="text-xs opacity-70">Frame {s.n}</div>
                      <div className="text-sm">{s.label}</div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="mt-6">
            <PriorityBadge p="P0" />
          </div>
        </aside>

        <div className="space-y-6">
          {step === "find-parish" && (
            <FindParishStep parish={parish} setParish={setParish} />
          )}
          {step === "profile" && (
            <ProfileStep profile={profile} setProfile={setProfile} />
          )}
          {step === "modules" && (
            <ModulesStep modules={modules} setModules={setModules} />
          )}
          {step === "admin" && <AdminStep admin={admin} setAdmin={setAdmin} />}
          {step === "review" && (
            <ReviewStep
              profile={profile}
              modules={selectedModules}
              admin={admin}
            />
          )}
          {step === "confirm" && (
            <ConfirmStep
              profile={profile}
              modules={selectedModules}
              admin={admin}
              onDashboard={onComplete}
              onHome={onCancel}
            />
          )}

          {step !== "confirm" && (
            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" onClick={goBack}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="outline">
                  <Save className="h-4 w-4 mr-2" /> Save Draft
                </Button>
                <Button
                  onClick={goNext}
                  disabled={!canProceed}
                  className="bg-[#3a1d6e] hover:bg-[#2a1450] text-white"
                >
                  {step === "review" ? "Submit Provision Request" : "Next"}{" "}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  number,
  title,
  description,
  children,
}: {
  number: number;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-border">
      <CardContent className="p-6 space-y-6">
        <div className="space-y-1 border-b border-border pb-4">
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Frame {number}
          </div>
          <h2 className="text-xl">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function Req() {
  return <span className="text-destructive ml-0.5">*</span>;
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">
        {label}
        {required && <Req />}
      </Label>
      {children}
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function FindParishStep({
  parish,
  setParish,
}: {
  parish: {
    state: string;
    query: string;
    results: CrmChurch[];
    selected: CrmChurch | null;
    searching: boolean;
    notListed: boolean;
    manualName: string;
  };
  setParish: React.Dispatch<React.SetStateAction<any>>;
}) {
  const { state, query, results, selected, searching, notListed, manualName } = parish;
  const update = (patch: Partial<typeof parish>) => setParish((p: any) => ({ ...p, ...patch }));

  // Live church search: debounced fetch against OM public API.
  // In Workshop preview the API isn't reachable — fail soft and surface
  // the "I don't see my church" manual path.
  useEffect(() => {
    if (!state) {
      update({ results: [], selected: null });
      return;
    }
    let cancelled = false;
    update({ searching: true });
    const params = new URLSearchParams({ state });
    if (query.trim().length >= 2) params.set("q", query.trim());
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/church-search?${params}`);
        const data = await res.json();
        if (cancelled) return;
        update({
          results: data?.success ? (data.churches ?? []) : [],
          searching: false,
        });
      } catch {
        if (cancelled) return;
        update({ results: [], searching: false });
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [state, query]);

  return (
    <SectionCard
      number={1}
      title="Find Your Parish"
      description="Tell us which Orthodox parish you serve. We use this to match you to the right diocese and pre-fill what we already know."
    >
      <div className="space-y-5">
        <Field label="State" required>
          <Select
            value={state}
            onValueChange={(v) =>
              update({ state: v, query: "", selected: null, notListed: false, manualName: "" })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select your state…" />
            </SelectTrigger>
            <SelectContent>
              {STATE_CODES.map((code) => (
                <SelectItem key={code} value={code}>
                  {STATE_NAMES[code]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {state && !notListed && (
          <Field
            label="Parish name"
            required
            hint="Start typing to search Orthodox parishes in your state."
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={selected ? selected.name : query}
                onChange={(e) => update({ query: e.target.value, selected: null })}
                placeholder="e.g. Holy Trinity"
                className="pl-9"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
              )}
            </div>

            {!selected && query.length >= 2 && (
              <div className="mt-2 rounded-md border border-border overflow-hidden">
                {results.length === 0 && !searching ? (
                  <div className="px-3 py-3 text-sm text-muted-foreground">
                    No parishes found. Try a different spelling or use{" "}
                    <em>I don't see my church</em> below.
                  </div>
                ) : (
                  <ul className="max-h-64 overflow-y-auto divide-y divide-border">
                    {results.slice(0, 8).map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => update({ selected: c })}
                          className="w-full text-left px-3 py-2.5 hover:bg-muted transition-colors"
                        >
                          <div className="text-sm">{c.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {c.city}, {c.state_code} · {c.jurisdiction}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Field>
        )}

        {selected && (
          <div className="flex items-start gap-3 p-4 rounded-md bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
            <Check className="h-4 w-4 mt-0.5 text-emerald-700 dark:text-emerald-300 shrink-0" />
            <div className="flex-1">
              <div className="text-sm">{selected.name}</div>
              <div className="text-xs text-muted-foreground">
                {selected.city}, {selected.state_code} · {selected.jurisdiction}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => update({ selected: null, query: "" })}
            >
              Change
            </Button>
          </div>
        )}

        {state && !selected && (
          <div>
            <Button
              type="button"
              variant={notListed ? "outline" : "ghost"}
              size="sm"
              onClick={() =>
                update({ notListed: !notListed, query: "", results: [] })
              }
            >
              <Building2 className="h-3.5 w-3.5 mr-2" />
              {notListed ? "Cancel — search the list" : "I don't see my church"}
            </Button>
            {notListed && (
              <div className="mt-3">
                <Field
                  label="Enter your parish name"
                  required
                  hint="We'll add it to the directory after we verify with you."
                >
                  <Input
                    value={manualName}
                    onChange={(e) => update({ manualName: e.target.value })}
                    placeholder="e.g. SS Peter & Paul Orthodox Church"
                  />
                </Field>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-start gap-3 p-4 rounded-md bg-[#f6efdb]/60 dark:bg-[#3a1d6e]/30 border border-[#c9a14a]/30 text-sm">
        <MapPin className="h-4 w-4 mt-0.5 text-[#5a4413] dark:text-[#e3c483] shrink-0" />
        <div>
          We pull from the Orthodox Metrics parish directory. If your church
          isn't there yet, choose <em>I don't see my church</em> — we'll add it.
        </div>
      </div>
    </SectionCard>
  );
}

function ProfileStep({ profile, setProfile }: any) {
  const set = (k: string, v: string) => setProfile({ ...profile, [k]: v });
  return (
    <SectionCard
      number={2}
      title="Church Profile"
      description="Tell us about your parish. These details help Orthodox Metrics provision your workspace and tailor your records."
    >
      <div className="grid md:grid-cols-2 gap-5">
        <Field label="Church name" required>
          <Input value={profile.churchName} onChange={(e) => set("churchName", e.target.value)} />
        </Field>
        <Field label="Jurisdiction" required>
          <Select value={profile.jurisdiction} onValueChange={(v) => set("jurisdiction", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {[
                "Greek Orthodox Archdiocese of America",
                "Orthodox Church in America (OCA)",
                "Antiochian Orthodox Christian Archdiocese",
                "Serbian Orthodox Church",
                "Russian Orthodox Church Outside Russia",
                "Romanian Orthodox Archdiocese",
                "Other",
              ].map((j) => (
                <SelectItem key={j} value={j}>{j}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Parish contact first name" required>
          <Input value={profile.firstName} onChange={(e) => set("firstName", e.target.value)} />
        </Field>
        <Field label="Parish contact last name" required>
          <Input value={profile.lastName} onChange={(e) => set("lastName", e.target.value)} />
        </Field>
        <Field label="Contact email" required hint="Used for provisioning updates.">
          <Input type="email" value={profile.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field label="Phone">
          <Input value={profile.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>
        <Field label="Website">
          <Input value={profile.website} onChange={(e) => set("website", e.target.value)} />
        </Field>
        <Field label="Church size">
          <Select value={profile.size} onValueChange={(v) => set("size", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["Under 100", "100–200", "200–500", "500–1000", "1000+"].map((v) => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Address" required>
          <Input value={profile.address} onChange={(e) => set("address", e.target.value)} />
        </Field>
        <Field label="City" required>
          <Input value={profile.city} onChange={(e) => set("city", e.target.value)} />
        </Field>
        <Field label="State / Province" required>
          <Input value={profile.state} onChange={(e) => set("state", e.target.value)} />
        </Field>
        <Field label="Postal code" required>
          <Input value={profile.zip} onChange={(e) => set("zip", e.target.value)} />
        </Field>
        <Field label="Country" required>
          <Input value={profile.country} onChange={(e) => set("country", e.target.value)} />
        </Field>
        <Field label="Timezone" required>
          <Select value={profile.timezone} onValueChange={(v) => set("timezone", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {[
                "America/New_York",
                "America/Chicago",
                "America/Denver",
                "America/Los_Angeles",
                "Europe/Athens",
                "Europe/Bucharest",
              ].map((tz) => (
                <SelectItem key={tz} value={tz}>{tz}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Referral source">
          <Input value={profile.referral} onChange={(e) => set("referral", e.target.value)} />
        </Field>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-md bg-[#f6efdb]/60 dark:bg-[#3a1d6e]/30 border border-[#c9a14a]/30 text-sm">
        <CircleAlert className="h-4 w-4 mt-0.5 text-[#5a4413] dark:text-[#e3c483] shrink-0" />
        <div>
          Required fields are marked with <Req />. Your draft is saved automatically every minute.
        </div>
      </div>
    </SectionCard>
  );
}

function ModulesStep({ modules, setModules }: any) {
  const cards = [
    {
      key: "baptism",
      icon: Droplets,
      title: "Baptism Records",
      desc: "Names, sponsors, clergy, and dates of holy baptism — searchable across decades.",
      recommended: true,
    },
    {
      key: "marriage",
      icon: HeartHandshake,
      title: "Marriage Records",
      desc: "Sacramental marriages with full witness, clergy, and dispensation details.",
      recommended: true,
    },
    {
      key: "funeral",
      icon: Flame,
      title: "Funeral Records",
      desc: "Honor the departed with organized funeral, burial, and memorial records.",
      recommended: false,
    },
  ] as const;
  const count = Object.values(modules).filter(Boolean).length;
  return (
    <SectionCard
      number={3}
      title="Record Module Selection"
      description="Choose the sacramental record books you want to digitize and manage. You can add more later."
    >
      <div className="grid md:grid-cols-3 gap-4">
        {cards.map((c) => {
          const selected = modules[c.key];
          const Icon = c.icon;
          return (
            <button
              key={c.key}
              onClick={() => setModules({ ...modules, [c.key]: !selected })}
              className={`text-left rounded-lg border p-5 transition-all ${
                selected
                  ? "border-[#3a1d6e] dark:border-[#c9a14a] ring-2 ring-[#3a1d6e]/20 dark:ring-[#c9a14a]/30 bg-[#f1ecf7] dark:bg-[#3a1d6e]/30"
                  : "border-border hover:border-[#3a1d6e]/40"
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="h-10 w-10 rounded-md bg-[#3a1d6e] text-[#c9a14a] flex items-center justify-center">
                  <Icon className="h-5 w-5" />
                </div>
                {c.recommended && (
                  <Badge className="bg-[#c9a14a] text-[#2a1450] border-transparent">
                    Recommended
                  </Badge>
                )}
              </div>
              <div className="space-y-1">
                <div>{c.title}</div>
                <p className="text-sm text-muted-foreground">{c.desc}</p>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {selected ? "Selected" : "Tap to select"}
                </span>
                <span
                  className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                    selected
                      ? "bg-[#3a1d6e] border-[#3a1d6e] text-white"
                      : "border-border"
                  }`}
                >
                  {selected && <Check className="h-3 w-3" />}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-md bg-muted">
        <div className="text-sm">
          <span className="text-muted-foreground">Selected modules: </span>
          <strong>{count}</strong> of 3
        </div>
        <div className="flex gap-2">
          {Object.entries(modules)
            .filter(([, v]) => v)
            .map(([k]) => (
              <Badge key={k} variant="outline" className="capitalize">
                {k}
              </Badge>
            ))}
        </div>
      </div>
    </SectionCard>
  );
}

function AdminStep({ admin, setAdmin }: any) {
  const set = (k: string, v: any) => setAdmin({ ...admin, [k]: v });
  return (
    <SectionCard
      number={4}
      title="Admin Account Setup"
      description="Create the first church administrator. You can invite additional users after approval."
    >
      <div className="grid md:grid-cols-2 gap-5">
        <Field label="Admin first name" required>
          <Input value={admin.firstName} onChange={(e) => set("firstName", e.target.value)} />
        </Field>
        <Field label="Admin last name" required>
          <Input value={admin.lastName} onChange={(e) => set("lastName", e.target.value)} />
        </Field>
        <Field label="Admin email" required>
          <Input type="email" value={admin.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <div />
        <Field
          label="Password"
          required
          hint="At least 12 characters, with one number and one symbol."
        >
          <Input
            type="password"
            value={admin.password}
            onChange={(e) => set("password", e.target.value)}
            placeholder="••••••••••••"
          />
        </Field>
        <Field label="Confirm password" required>
          <Input
            type="password"
            value={admin.confirm}
            onChange={(e) => set("confirm", e.target.value)}
            placeholder="••••••••••••"
          />
        </Field>
      </div>

      <div className="flex items-start justify-between gap-4 p-4 rounded-md border border-border">
        <div className="space-y-1">
          <div>Invite a second administrator</div>
          <div className="text-sm text-muted-foreground">
            Recommended for parishes with more than one priest or records keeper.
          </div>
        </div>
        <Switch
          checked={admin.secondAdmin}
          onCheckedChange={(v) => set("secondAdmin", v)}
        />
      </div>

      <div className="flex items-start gap-3 p-4 rounded-md bg-[#f6efdb]/60 dark:bg-[#3a1d6e]/30 border border-[#c9a14a]/30 text-sm">
        <ShieldCheck className="h-4 w-4 mt-0.5 text-[#5a4413] dark:text-[#e3c483] shrink-0" />
        <div>
          Your password is hashed and stored securely. Orthodox Metrics staff cannot read your
          password. You can change it at any time from Settings.
        </div>
      </div>
    </SectionCard>
  );
}

function ReviewStep({ profile, modules, admin }: any) {
  return (
    <SectionCard
      number={5}
      title="Review & Submit"
      description="Confirm your details below. Submitting will create a provision request for Orthodox Metrics staff to review."
    >
      <div className="grid md:grid-cols-2 gap-4">
        <SummaryCard title="Church profile" icon={Building2}>
          <Row k="Church name" v={profile.churchName} />
          <Row k="Jurisdiction" v={profile.jurisdiction} />
          <Row k="Size" v={profile.size} />
          <Row k="Address" v={`${profile.address}, ${profile.city}, ${profile.state} ${profile.zip}`} />
          <Row k="Country" v={profile.country} />
          <Row k="Timezone" v={profile.timezone} />
        </SummaryCard>
        <SummaryCard title="Contact" icon={Mail}>
          <Row k="Name" v={`${profile.firstName} ${profile.lastName}`} />
          <Row k="Email" v={profile.email} />
          <Row k="Phone" v={profile.phone} />
          <Row k="Website" v={profile.website} />
          <Row k="Referral" v={profile.referral} />
        </SummaryCard>
        <SummaryCard title="Selected modules" icon={Droplets}>
          <div className="flex flex-wrap gap-2">
            {modules.length === 0 && (
              <span className="text-sm text-muted-foreground">None selected</span>
            )}
            {modules.map((m: string) => (
              <Badge key={m} variant="outline" className="capitalize">
                {m}
              </Badge>
            ))}
          </div>
        </SummaryCard>
        <SummaryCard title="Admin account" icon={ShieldCheck}>
          <Row k="Name" v={`${admin.firstName} ${admin.lastName}`} />
          <Row k="Email" v={admin.email} />
          <Row k="Password" v="••••••••••••" />
          <Row k="Second admin" v={admin.secondAdmin ? "Yes — invite later" : "No"} />
        </SummaryCard>
      </div>

      <div className="p-4 rounded-md bg-[#f1ecf7] dark:bg-[#3a1d6e]/40 border border-[#3a1d6e]/30 text-sm">
        <div className="mb-1">What happens next</div>
        <div className="text-muted-foreground">
          Orthodox Metrics staff will review your request within 1–2 business days. You'll get an
          email once your workspace is approved and ready for record uploads.
        </div>
      </div>
    </SectionCard>
  );
}

function ConfirmStep({ profile, modules, admin, onDashboard, onHome }: any) {
  const requestId = "OM-PROV-2026-0429";
  return (
    <SectionCard
      number={6}
      title="Submission Confirmation"
      description="Your provision request has been received."
    >
      <div className="flex flex-col items-center text-center py-6 space-y-4">
        <div className="h-16 w-16 rounded-full bg-[#3a1d6e] text-[#c9a14a] flex items-center justify-center">
          <PartyPopper className="h-7 w-7" />
        </div>
        <h2 className="text-2xl">Thank you, {profile.firstName}.</h2>
        <p className="text-muted-foreground max-w-md">
          We've received your request for {profile.churchName}. Our staff will review it shortly.
        </p>
        <div className="flex items-center gap-2 px-4 py-2 rounded-md bg-muted">
          <span className="text-sm text-muted-foreground">Provision ID:</span>
          <code className="text-sm">{requestId}</code>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <SummaryCard title="Submitted details" icon={Building2}>
          <Row k="Church" v={profile.churchName} />
          <Row k="Contact email" v={profile.email} />
          <Row k="Modules" v={modules.join(", ") || "None"} />
          <Row k="Admin" v={admin.email} />
        </SummaryCard>
        <SummaryCard title="What happens next" icon={ShieldCheck}>
          <ul className="text-sm space-y-2 text-muted-foreground">
            <li>1. OM staff verifies your church and contact details.</li>
            <li>2. We provision your workspace and selected record modules.</li>
            <li>3. You receive an approval email with a sign-in link.</li>
            <li>4. Begin uploading your first batch of records.</li>
          </ul>
        </SummaryCard>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Button variant="outline" onClick={onHome}>Return Home</Button>
        <Button onClick={onDashboard} className="bg-[#3a1d6e] hover:bg-[#2a1450] text-white">
          Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </SectionCard>
  );
}

function SummaryCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm">
        <Icon className="h-4 w-4 text-[#3a1d6e] dark:text-[#c9a14a]" />
        <span>{title}</span>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
      <div className="text-muted-foreground">{k}</div>
      <div className="break-words">{v}</div>
    </div>
  );
}
