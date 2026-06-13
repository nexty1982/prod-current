import React, { useState } from "react";
import { GripVertical, Trash2, Plus, Save, RotateCcw, Eye, Info } from "lucide-react";
import { PageHeader } from "./PageHeader";

type RecordTab = "baptism" | "marriage" | "funeral";

const defaultHeaders: Record<RecordTab, Array<{ order: number; key: string; label: string; ledgerText: string; required: boolean; visible: boolean; impact: "high" | "medium" | "low" }>> = {
  baptism: [
    { order: 1, key: "full_name", label: "Full Name", ledgerText: "Name of Child / Christian Name", required: true, visible: true, impact: "high" },
    { order: 2, key: "date_of_baptism", label: "Date of Baptism", ledgerText: "Date / Date Baptized", required: true, visible: true, impact: "high" },
    { order: 3, key: "parish", label: "Parish", ledgerText: "Parish / Church", required: true, visible: true, impact: "medium" },
    { order: 4, key: "officiating_clergy", label: "Officiating Clergy", ledgerText: "Officiant / Priest / Fr.", required: true, visible: true, impact: "medium" },
    { order: 5, key: "godfather", label: "Godfather", ledgerText: "Godfather / Sponsor (M)", required: false, visible: true, impact: "low" },
    { order: 6, key: "godmother", label: "Godmother", ledgerText: "Godmother / Sponsor (F)", required: false, visible: true, impact: "low" },
    { order: 7, key: "father", label: "Father", ledgerText: "Father / Parent (M)", required: false, visible: true, impact: "low" },
    { order: 8, key: "mother", label: "Mother", ledgerText: "Mother / Parent (F)", required: false, visible: true, impact: "low" },
    { order: 9, key: "notes", label: "Notes", ledgerText: "Remarks / Notes", required: false, visible: false, impact: "low" },
  ],
  marriage: [
    { order: 1, key: "groom_name", label: "Groom Name", ledgerText: "Groom / Bridegroom", required: true, visible: true, impact: "high" },
    { order: 2, key: "bride_name", label: "Bride Name", ledgerText: "Bride / Betrothed", required: true, visible: true, impact: "high" },
    { order: 3, key: "date_of_marriage", label: "Date of Marriage", ledgerText: "Date / Date of Union", required: true, visible: true, impact: "high" },
    { order: 4, key: "parish", label: "Parish", ledgerText: "Parish / Church", required: true, visible: true, impact: "medium" },
    { order: 5, key: "officiating_clergy", label: "Officiating Clergy", ledgerText: "Officiant / Priest / Fr.", required: true, visible: true, impact: "medium" },
    { order: 6, key: "witnesses", label: "Witnesses", ledgerText: "Witnesses / Sponsors", required: false, visible: true, impact: "low" },
    { order: 7, key: "notes", label: "Notes", ledgerText: "Remarks / Notes", required: false, visible: false, impact: "low" },
  ],
  funeral: [
    { order: 1, key: "full_name", label: "Deceased Name", ledgerText: "Name of Deceased", required: true, visible: true, impact: "high" },
    { order: 2, key: "date_of_death", label: "Date of Death", ledgerText: "Date Died / Date of Repose", required: true, visible: true, impact: "high" },
    { order: 3, key: "date_of_burial", label: "Date of Burial", ledgerText: "Date Buried / Date of Funeral", required: true, visible: true, impact: "high" },
    { order: 4, key: "officiating_clergy", label: "Officiating Clergy", ledgerText: "Officiant / Priest / Fr.", required: true, visible: true, impact: "medium" },
    { order: 5, key: "burial_location", label: "Burial Location", ledgerText: "Cemetery / Place of Burial", required: false, visible: true, impact: "low" },
    { order: 6, key: "notes", label: "Notes", ledgerText: "Remarks / Notes", required: false, visible: false, impact: "low" },
  ],
};

const impactColor = (impact: string) => {
  if (impact === "high") return "text-purple-600 bg-purple-50";
  if (impact === "medium") return "text-blue-600 bg-blue-50";
  return "text-slate-500 bg-slate-100";
};

export function RecordHeaders() {
  const [tab, setTab] = useState<RecordTab>("baptism");
  const [headers, setHeaders] = useState(defaultHeaders);
  const [saved, setSaved] = useState(false);

  const currentHeaders = headers[tab];

  const toggleRequired = (i: number) => {
    setHeaders(prev => ({
      ...prev,
      [tab]: prev[tab].map((h, j) => j === i ? { ...h, required: !h.required } : h),
    }));
  };

  const toggleVisible = (i: number) => {
    setHeaders(prev => ({
      ...prev,
      [tab]: prev[tab].map((h, j) => j === i ? { ...h, visible: !h.visible } : h),
    }));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Record Header Configuration"
        subtitle="Define which printed ledger headers map to OCR fields for baptism, marriage, and funeral records."
        breadcrumb={["OCR Studio", "Record Headers"]}
        actions={
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 text-xs border border-slate-200 text-slate-600 px-3 py-2 rounded-md hover:bg-slate-50">
              <RotateCcw size={13} /> Reset to Defaults
            </button>
            <button className="flex items-center gap-1.5 text-xs border border-slate-200 text-slate-600 px-3 py-2 rounded-md hover:bg-slate-50">
              <Eye size={13} /> Preview Review Fields
            </button>
            <button onClick={handleSave} className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-md transition-colors ${saved ? "bg-green-600 text-white" : "bg-[#1a2744] text-white hover:bg-[#243459]"}`}>
              <Save size={13} /> {saved ? "Saved!" : "Save Configuration"}
            </button>
          </div>
        }
      />

      <div className="flex gap-2 mb-1">
        <div className="flex-1">
          <select className="text-sm border border-slate-200 rounded-md px-3 py-2 bg-white text-[#1a2744] focus:outline-none focus:ring-1 focus:ring-[#c9a84c]">
            <option>Saints Peter & Paul Orthodox Church — Manville, NJ (#46)</option>
            <option>Test Church — Testville, NY (#278)</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {(["baptism", "marriage", "funeral"] as RecordTab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-medium capitalize border-b-2 transition-colors ${
              tab === t ? "border-[#c9a84c] text-[#1a2744]" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-4">
        {/* Table */}
        <div className="col-span-3 bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-100 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
            <div className="col-span-0.5 w-5" />
            <div className="col-span-1">#</div>
            <div className="col-span-2">Field Key</div>
            <div className="col-span-2">Display Label</div>
            <div className="col-span-3">Ledger Header Text</div>
            <div className="col-span-1">Required</div>
            <div className="col-span-1">Visible</div>
            <div className="col-span-1">Impact</div>
          </div>
          {currentHeaders.map((h, i) => (
            <div key={h.key} className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-slate-50 last:border-0 items-center hover:bg-slate-50/50 group">
              <div className="col-span-0.5 w-5">
                <GripVertical size={14} className="text-slate-200 group-hover:text-slate-400 cursor-grab" />
              </div>
              <div className="col-span-1 text-xs text-slate-400 font-mono">{h.order}</div>
              <div className="col-span-2 text-xs font-mono text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">{h.key}</div>
              <div className="col-span-2">
                <input
                  defaultValue={h.label}
                  className="w-full text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#c9a84c]"
                />
              </div>
              <div className="col-span-3">
                <input
                  defaultValue={h.ledgerText}
                  className="w-full text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#c9a84c] text-slate-600"
                />
              </div>
              <div className="col-span-1">
                <button onClick={() => toggleRequired(i)} className={`w-8 h-4 rounded-full relative transition-colors ${h.required ? "bg-[#1a2744]" : "bg-slate-200"}`}>
                  <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${h.required ? "right-0.5" : "left-0.5"}`} />
                </button>
              </div>
              <div className="col-span-1">
                <button onClick={() => toggleVisible(i)} className={`w-8 h-4 rounded-full relative transition-colors ${h.visible ? "bg-[#c9a84c]" : "bg-slate-200"}`}>
                  <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${h.visible ? "right-0.5" : "left-0.5"}`} />
                </button>
              </div>
              <div className="col-span-1">
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold capitalize ${impactColor(h.impact)}`}>{h.impact}</span>
              </div>
            </div>
          ))}
          {/* Add row */}
          <div className="px-4 py-2.5 border-t border-dashed border-slate-200">
            <button className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-[#1a2744] transition-colors">
              <Plus size={13} /> Add Custom Header
            </button>
          </div>
        </div>

        {/* Help panel */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Info size={13} className="text-[#c9a84c]" />
              <h3 className="text-sm font-semibold text-[#1a2744]">How Headers Are Used</h3>
            </div>
            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <p><span className="font-medium text-[#1a2744]">Ledger headers</span> help the OCR engine identify and match printed column labels to structured data fields.</p>
              <p><span className="font-medium text-[#1a2744]">Required fields</span> are always shown in the review screen and must be verified before a record can be approved.</p>
              <p><span className="font-medium text-[#1a2744]">Hidden fields</span> are extracted but suppressed during the review display to reduce clutter.</p>
              <p><span className="font-medium text-[#1a2744]">Confidence impact</span> indicates how much this field affects overall OCR quality scoring.</p>
              <p className="text-slate-400">Changes apply to future OCR jobs only. Existing records are not affected.</p>
            </div>
          </div>

          <div className="bg-[#f4f1ea] rounded-lg border border-[#c9a84c]/20 p-4">
            <h3 className="text-xs font-semibold text-[#1a2744] mb-2">Configuration Status</h3>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Baptism headers</span>
                <span className="text-green-600 font-medium">Complete</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Marriage headers</span>
                <span className="text-green-600 font-medium">Complete</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Funeral headers</span>
                <span className="text-amber-600 font-medium">Incomplete</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
