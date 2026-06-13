import React, { useState } from "react";
import {
  Plus, Save, Play, ZoomIn, ZoomOut, RotateCw, Maximize2,
  Upload, Layers, CheckCircle, Clock, AlertTriangle, Trash2, Edit2, Toggle, ToggleLeft
} from "lucide-react";
import { PageHeader } from "./PageHeader";

const templates = [
  { id: "TPL-001", name: "Baptism Ledger v2", type: "baptism", status: "active", updated: "Jun 10", fields: 9 },
  { id: "TPL-002", name: "Baptism Ledger v1 (Legacy)", type: "baptism", status: "inactive", updated: "Jan 2023", fields: 7 },
  { id: "TPL-003", name: "Marriage Register 1985", type: "marriage", status: "draft", updated: "Jun 12", fields: 7 },
  { id: "TPL-004", name: "Marriage Register 1974", type: "marriage", status: "active", updated: "Mar 2024", fields: 7 },
  { id: "TPL-005", name: "Funeral Register (Legacy)", type: "funeral", status: "active", updated: "Nov 2023", fields: 6 },
  { id: "TPL-006", name: "Parish Register 1920–1935", type: "baptism", status: "active", updated: "Feb 2024", fields: 8 },
];

const fieldMappings = [
  { label: "Full Name", zone: "Column A", confidence: 97, required: true },
  { label: "Date of Baptism", zone: "Column B", confidence: 94, required: true },
  { label: "Parish", zone: "Header", confidence: 99, required: true },
  { label: "Officiating Clergy", zone: "Column C", confidence: 88, required: true },
  { label: "Godfather", zone: "Column D", confidence: 91, required: false },
  { label: "Godmother", zone: "Column E", confidence: 89, required: false },
  { label: "Father", zone: "Column F", confidence: 86, required: false },
  { label: "Mother", zone: "Column G", confidence: 82, required: false },
  { label: "Notes", zone: "Column H", confidence: 71, required: false },
];

const statusIcon = (s: string) => {
  if (s === "active") return <CheckCircle size={11} className="text-green-500" />;
  if (s === "draft") return <Clock size={11} className="text-amber-500" />;
  return <AlertTriangle size={11} className="text-slate-300" />;
};

const typeColor = (t: string) => {
  if (t === "baptism") return "bg-blue-50 text-blue-600";
  if (t === "marriage") return "bg-purple-50 text-purple-600";
  return "bg-slate-100 text-slate-500";
};

export function LayoutTemplates() {
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0]);
  const [imageLoaded, setImageLoaded] = useState(true);
  const [mappings, setMappings] = useState(fieldMappings);

  const toggleRequired = (i: number) => {
    setMappings(prev => prev.map((m, j) => j === i ? { ...m, required: !m.required } : m));
  };

  return (
    <div className="flex flex-col gap-4" style={{ height: "calc(100vh - 120px)" }}>
      <PageHeader
        title="Layout Template Editor"
        subtitle="Create and edit OCR field mapping templates for each register format."
        breadcrumb={["OCR Studio", "Layout Templates"]}
        actions={
          <div className="flex gap-2">
            <button className="text-xs border border-slate-200 text-slate-600 px-3 py-2 rounded-md hover:bg-slate-50 flex items-center gap-1.5"><Plus size={13} />New Template</button>
            <button className="text-xs bg-[#1a2744] text-white px-3 py-2 rounded-md hover:bg-[#243459] flex items-center gap-1.5"><Save size={13} />Save Template</button>
          </div>
        }
      />

      {/* Config bar */}
      <div className="bg-white rounded-lg border border-slate-200 p-3 flex items-center gap-3 shrink-0">
        <select className="text-xs border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#c9a84c]">
          <option>Saints Peter & Paul — Manville, NJ</option>
        </select>
        <select className="text-xs border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#c9a84c] flex-1 max-w-xs">
          <option>{selectedTemplate.name}</option>
        </select>
        <select className="text-xs border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#c9a84c]">
          <option>Baptism</option>
          <option>Marriage</option>
          <option>Funeral</option>
        </select>
        <select className="text-xs border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#c9a84c]">
          <option>Tabular</option>
          <option>Form</option>
          <option>Multi-Form</option>
          <option>Auto</option>
        </select>
        <div className="ml-auto flex gap-2">
          <button className="text-xs border border-slate-200 text-slate-600 px-3 py-1.5 rounded-md hover:bg-slate-50 flex items-center gap-1.5"><Play size={12} />Preview Extraction</button>
          <button className="text-xs border border-purple-200 text-purple-700 px-3 py-1.5 rounded-md hover:bg-purple-50 flex items-center gap-1.5"><Play size={12} />Run Test Extraction</button>
        </div>
      </div>

      {/* Main 3-panel layout */}
      <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
        {/* Left: Template library */}
        <div className="col-span-2 bg-white rounded-lg border border-slate-200 flex flex-col overflow-hidden">
          <div className="px-3 py-2.5 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-[#1a2744]">Templates</span>
            <button className="text-[#c9a84c] hover:text-[#1a2744] transition-colors"><Plus size={14} /></button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {["baptism", "marriage", "funeral"].map(group => (
              <div key={group}>
                <div className="px-3 py-1.5 text-[9px] text-slate-400 uppercase tracking-wider font-semibold bg-slate-50 border-b border-slate-100 capitalize">{group}</div>
                {templates.filter(t => t.type === group).map(tpl => (
                  <button
                    key={tpl.id}
                    onClick={() => setSelectedTemplate(tpl)}
                    className={`w-full text-left px-3 py-2.5 border-b border-slate-50 last:border-0 transition-colors ${selectedTemplate.id === tpl.id ? "bg-[#f4f1ea] border-l-2 border-l-[#c9a84c]" : "hover:bg-slate-50"}`}
                  >
                    <div className="flex items-start gap-1.5">
                      {statusIcon(tpl.status)}
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-[#1a2744] leading-snug truncate">{tpl.name}</div>
                        <div className="text-[9px] text-slate-400 mt-0.5">{tpl.fields} fields · {tpl.updated}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Center: Canvas */}
        <div className="col-span-7 bg-white rounded-lg border border-slate-200 flex flex-col overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-[#1a2744]">Image Canvas — {selectedTemplate.name}</span>
            <div className="flex items-center gap-1">
              {[ZoomOut, ZoomIn, RotateCw, Maximize2].map((Icon, i) => (
                <button key={i} className="p-1.5 rounded hover:bg-slate-100 transition-colors">
                  <Icon size={13} className="text-slate-400" />
                </button>
              ))}
              <button onClick={() => setImageLoaded(!imageLoaded)} className="ml-2 text-xs border border-slate-200 px-2 py-1 rounded-md text-slate-500 hover:bg-slate-50">
                {imageLoaded ? "Clear Image" : "Load Image"}
              </button>
            </div>
          </div>
          <div className="flex-1 bg-[#1a2744]/5 flex items-center justify-center p-6 overflow-auto">
            {imageLoaded ? (
              <div className="relative bg-white shadow-lg rounded border border-slate-200 w-full max-w-2xl" style={{ aspectRatio: "1 / 1.3" }}>
                {/* Simulated register page */}
                <div className="p-5">
                  <div className="text-center mb-3 pb-2 border-b-2 border-[#1a2744]">
                    <div className="text-sm font-semibold text-[#1a2744]" style={{ fontFamily: "var(--font-display)" }}>
                      Saints Peter & Paul Orthodox Church
                    </div>
                    <div className="text-xs text-slate-500">Baptism Register — Book IV — 1985</div>
                  </div>
                  {/* Column headers with overlay zones */}
                  <div className="grid grid-cols-5 gap-1 mb-2">
                    {["Name", "Date", "Clergy", "Godfather", "Godmother"].map((col, i) => (
                      <div key={i} className="border-2 border-blue-400 bg-blue-50/50 rounded px-1 py-0.5 text-center">
                        <div className="text-[9px] font-semibold text-blue-600">Col {String.fromCharCode(65 + i)}</div>
                        <div className="text-[10px] text-slate-600">{col}</div>
                      </div>
                    ))}
                  </div>
                  {/* Data rows */}
                  {["Nikolaou, Alexandros", "Petrescu, Maria", "Kapanadze, Giorgi", "Sokolov, Ivan"].map((name, i) => (
                    <div key={i} className="grid grid-cols-5 gap-1 mb-1">
                      <div className="border border-green-300 bg-green-50/30 rounded px-1 py-1 text-[10px] text-slate-700">{name}</div>
                      <div className="border border-green-300 bg-green-50/30 rounded px-1 py-1 text-[10px] text-slate-600 font-mono">{`${14 + i * 7} Mar 85`}</div>
                      <div className="border border-green-300 bg-green-50/30 rounded px-1 py-1 text-[10px] text-slate-600">Fr. Stavros</div>
                      <div className="border border-amber-300 bg-amber-50/30 rounded px-1 py-1 text-[10px] text-slate-600">G. Papadopoulos</div>
                      <div className="border border-amber-300 bg-amber-50/30 rounded px-1 py-1 text-[10px] text-slate-600">E. Stavros</div>
                    </div>
                  ))}
                </div>
                {/* Zone legend */}
                <div className="absolute bottom-3 right-3 flex gap-2">
                  <span className="flex items-center gap-1 text-[9px] text-blue-600"><span className="w-3 h-2 bg-blue-200 rounded border border-blue-400" />Column</span>
                  <span className="flex items-center gap-1 text-[9px] text-green-600"><span className="w-3 h-2 bg-green-200 rounded border border-green-400" />High conf</span>
                  <span className="flex items-center gap-1 text-[9px] text-amber-600"><span className="w-3 h-2 bg-amber-200 rounded border border-amber-400" />Med conf</span>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Layers size={24} className="text-slate-300" />
                </div>
                <h3 className="text-sm font-medium text-slate-500 mb-1">No reference image loaded</h3>
                <p className="text-xs text-slate-400 mb-4">Select a completed OCR job or upload a reference register page to begin mapping fields.</p>
                <div className="flex gap-3 justify-center">
                  <button onClick={() => setImageLoaded(true)} className="text-xs bg-[#1a2744] text-white px-3 py-2 rounded-md hover:bg-[#243459] flex items-center gap-1.5">
                    <Play size={12} /> Select Reference Job
                  </button>
                  <button onClick={() => setImageLoaded(true)} className="text-xs border border-slate-200 text-slate-600 px-3 py-2 rounded-md hover:bg-slate-50 flex items-center gap-1.5">
                    <Upload size={12} /> Upload Reference Image
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Field mapping */}
        <div className="col-span-3 bg-white rounded-lg border border-slate-200 flex flex-col overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-[#1a2744]">Field Mapping</span>
            <button className="text-[#c9a84c] hover:text-[#1a2744] transition-colors"><Plus size={14} /></button>
          </div>
          <div className="px-3 py-2 border-b border-slate-50 bg-slate-50 grid grid-cols-3 text-[9px] font-semibold text-slate-400 uppercase tracking-wide">
            <div>Field</div>
            <div>Zone</div>
            <div className="text-right">Conf / Req</div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
            {mappings.map((m, i) => (
              <div key={i} className="px-3 py-2.5 grid grid-cols-3 items-center gap-1 hover:bg-slate-50/50 group">
                <div className="text-xs font-medium text-[#1a2744] truncate">{m.label}</div>
                <div className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-mono truncate">{m.zone}</div>
                <div className="flex items-center gap-1 justify-end">
                  <span className={`text-[10px] font-semibold font-mono ${m.confidence > 85 ? "text-green-600" : m.confidence > 65 ? "text-amber-600" : "text-red-500"}`}>{m.confidence}%</span>
                  <button onClick={() => toggleRequired(i)} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ml-1 ${m.required ? "bg-[#1a2744] text-white" : "bg-slate-100 text-slate-400"}`}>
                    {m.required ? "Req" : "Opt"}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-100 p-3">
            <div className="text-[10px] text-slate-400 mb-1">Extraction Rules</div>
            <div className="space-y-1.5">
              {["Skip blank rows", "Normalize date format", "Trim whitespace"].map((rule, i) => (
                <label key={i} className="flex items-center gap-2 cursor-pointer">
                  <div className="w-7 h-3.5 bg-[#1a2744] rounded-full relative">
                    <span className="absolute right-0.5 top-0.5 w-2.5 h-2.5 bg-white rounded-full" />
                  </div>
                  <span className="text-xs text-slate-600">{rule}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
