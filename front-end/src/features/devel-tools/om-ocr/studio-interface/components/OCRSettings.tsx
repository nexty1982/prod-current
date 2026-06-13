import React, { useState } from "react";
import { Save, Info, CheckCircle } from "lucide-react";
import { PageHeader } from "./PageHeader";

type SettingsTab = "documents" | "api" | "rules" | "clergy" | "locations" | "retention";

const clergy = [
  { name: "Fr. Dimitri Stavros", role: "Priest", active: true },
  { name: "Fr. Alexander Sorokin", role: "Priest", active: true },
  { name: "Archdeacon Petrov", role: "Deacon", active: true },
  { name: "Fr. Nikolaos Papadopoulos", role: "Priest", active: false },
];

export function OCRSettings() {
  const [tab, setTab] = useState<SettingsTab>("documents");
  const [settings, setSettings] = useState({
    enhancedHandwriting: true,
    recordSnippets: true,
    autoDeskew: true,
    imageRotation: false,
    compositeSplitting: false,
    defaultRecordType: "auto",
    ocrProvider: "tesseract-custom",
    deleteAfterDays: 90,
    keepOutputDays: 365,
    warnBeforePurge: true,
  });
  const [saved, setSaved] = useState(false);

  const toggle = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key as keyof typeof settings] }));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: "documents", label: "Documents" },
    { id: "api", label: "API" },
    { id: "rules", label: "Rules Engine" },
    { id: "clergy", label: "Parish Clergy" },
    { id: "locations", label: "Locations" },
    { id: "retention", label: "Retention" },
  ];

  const Toggle = ({ active, onChange }: { active: boolean; onChange: () => void }) => (
    <button onClick={onChange} className={`w-10 h-5 rounded-full relative transition-colors ${active ? "bg-[#1a2744]" : "bg-slate-200"}`}>
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${active ? "right-0.5" : "left-0.5"}`} />
    </button>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parish OCR Settings"
        subtitle="Configure OCR defaults, retention rules, clergy mappings, document processing, and extraction behavior for the selected church."
        breadcrumb={["OCR Studio", "OCR Settings"]}
        actions={
          <button onClick={handleSave} className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-md transition-colors ${saved ? "bg-green-600 text-white" : "bg-[#1a2744] text-white hover:bg-[#243459]"}`}>
            <Save size={13} /> {saved ? "Saved!" : "Save Settings"}
          </button>
        }
      />

      {/* Church selector */}
      <select className="text-sm border border-slate-200 rounded-md px-3 py-2 bg-white text-[#1a2744] focus:outline-none focus:ring-1 focus:ring-[#c9a84c] w-80">
        <option>Saints Peter & Paul Orthodox Church — Manville, NJ (#46)</option>
        <option>Test Church — Testville, NY (#278)</option>
      </select>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id ? "border-[#c9a84c] text-[#1a2744]" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-4">
          {tab === "documents" && (
            <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-50">
              <div className="px-5 py-4">
                <h3 className="text-sm font-semibold text-[#1a2744] mb-3">Document Processing</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-[#1a2744]">Default Record Type</div>
                      <div className="text-xs text-slate-500">How to classify uploads when type is not specified</div>
                    </div>
                    <select
                      value={settings.defaultRecordType}
                      onChange={e => setSettings(prev => ({ ...prev, defaultRecordType: e.target.value }))}
                      className="text-sm border border-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#c9a84c]"
                    >
                      <option value="auto">Auto-detect</option>
                      <option value="baptism">Baptism</option>
                      <option value="marriage">Marriage</option>
                      <option value="funeral">Funeral</option>
                    </select>
                  </div>
                  {[
                    { key: "enhancedHandwriting" as const, label: "Enhanced Handwriting Recognition", desc: "Use the handwriting-optimized OCR model. Increases accuracy on cursive scripts." },
                    { key: "recordSnippets" as const, label: "Record Snippets", desc: "Generate image thumbnails for extracted records in the review queue." },
                    { key: "autoDeskew" as const, label: "Auto-Deskew", desc: "Automatically correct slight page rotation during preprocessing." },
                    { key: "imageRotation" as const, label: "Image Rotation Detection", desc: "Detect and rotate pages that are sideways or upside down." },
                    { key: "compositeSplitting" as const, label: "Composite Photo Splitting", desc: "Split pages with multiple photos into individual images." },
                  ].map(item => (
                    <div key={item.key} className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-medium text-[#1a2744]">{item.label}</div>
                        <div className="text-xs text-slate-500">{item.desc}</div>
                      </div>
                      <Toggle active={settings[item.key] as boolean} onChange={() => toggle(item.key)} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="px-5 py-4">
                <h3 className="text-sm font-semibold text-[#1a2744] mb-3">OCR Provider</h3>
                <div className="space-y-2">
                  {[
                    { value: "tesseract-custom", label: "Tesseract 5.x + Custom Orthodox Model", desc: "Recommended — trained on Orthodox parish registers" },
                    { value: "tesseract-base", label: "Tesseract 5.x (Base)", desc: "Standard open-source OCR" },
                    { value: "google-vision", label: "Google Cloud Vision", desc: "Requires API key configuration" },
                    { value: "azure-form", label: "Azure Form Recognizer", desc: "Requires API key configuration" },
                  ].map(opt => (
                    <label key={opt.value} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${settings.ocrProvider === opt.value ? "border-[#c9a84c] bg-[#f4f1ea]" : "border-slate-200 hover:bg-slate-50"}`}>
                      <input
                        type="radio"
                        checked={settings.ocrProvider === opt.value}
                        onChange={() => setSettings(prev => ({ ...prev, ocrProvider: opt.value }))}
                        className="mt-0.5 accent-[#1a2744]"
                      />
                      <div>
                        <div className="text-sm font-medium text-[#1a2744]">{opt.label}</div>
                        <div className="text-xs text-slate-500">{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "retention" && (
            <div className="bg-white rounded-lg border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-[#1a2744] mb-4">Data Retention</h3>
              <div className="space-y-5">
                <div>
                  <label className="text-sm font-medium text-[#1a2744] block mb-1">Delete uploaded images after</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={settings.deleteAfterDays}
                      onChange={e => setSettings(prev => ({ ...prev, deleteAfterDays: Number(e.target.value) }))}
                      className="w-24 text-sm border border-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#c9a84c]"
                    />
                    <span className="text-sm text-slate-500">days</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Original scanned images are deleted after this period. Extracted data is retained.</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-[#1a2744] block mb-1">Keep processed output for</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={settings.keepOutputDays}
                      onChange={e => setSettings(prev => ({ ...prev, keepOutputDays: Number(e.target.value) }))}
                      className="w-24 text-sm border border-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#c9a84c]"
                    />
                    <span className="text-sm text-slate-500">days</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-[#1a2744]">Warn before purge</div>
                    <div className="text-xs text-slate-500">Send admin notification 7 days before scheduled deletion</div>
                  </div>
                  <Toggle active={settings.warnBeforePurge} onChange={() => toggle("warnBeforePurge")} />
                </div>
              </div>
            </div>
          )}

          {tab === "clergy" && (
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#1a2744]">Parish Clergy</h3>
                <button className="text-xs bg-[#1a2744] text-white px-2.5 py-1.5 rounded-md hover:bg-[#243459]">+ Add Clergy</button>
              </div>
              {clergy.map((c, i) => (
                <div key={i} className="px-5 py-3 border-b border-slate-50 last:border-0 flex items-center justify-between hover:bg-slate-50/50">
                  <div>
                    <div className="text-sm font-medium text-[#1a2744]">{c.name}</div>
                    <div className="text-xs text-slate-500">{c.role}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.active ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                      {c.active ? "Active" : "Inactive"}
                    </span>
                    <button className="text-xs text-slate-400 hover:text-slate-600">Edit</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "api" && (
            <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
              <h3 className="text-sm font-semibold text-[#1a2744] mb-2">API Configuration</h3>
              {[
                { label: "Google Cloud Vision API Key", placeholder: "AIza•••••••••••••••••••••••••••••", hint: "Used when Google Cloud Vision is selected as provider" },
                { label: "Azure Form Recognizer Endpoint", placeholder: "https://your-resource.cognitiveservices.azure.com/", hint: "" },
                { label: "Azure Form Recognizer Key", placeholder: "•••••••••••••••••••••••••••••••", hint: "" },
              ].map(field => (
                <div key={field.label}>
                  <label className="text-xs font-medium text-slate-600 block mb-1">{field.label}</label>
                  <input type="password" placeholder={field.placeholder} className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#c9a84c] font-mono" />
                  {field.hint && <p className="text-xs text-slate-400 mt-1">{field.hint}</p>}
                </div>
              ))}
            </div>
          )}

          {(tab === "rules" || tab === "locations") && (
            <div className="bg-white rounded-lg border border-slate-200 p-10 text-center">
              <div className="text-slate-400 text-sm">This section is under configuration.</div>
              <p className="text-xs text-slate-400 mt-1">Contact your system administrator to enable advanced rules configuration.</p>
            </div>
          )}
        </div>

        {/* Recommended settings */}
        <div className="space-y-4">
          <div className="bg-[#f4f1ea] rounded-lg border border-[#c9a84c]/20 p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <CheckCircle size={13} className="text-[#c9a84c]" />
              <h3 className="text-sm font-semibold text-[#1a2744]">Recommended Settings</h3>
            </div>
            <div className="space-y-2.5">
              {[
                { label: "Enhanced Handwriting", status: settings.enhancedHandwriting ? "enabled" : "disabled", ok: true },
                { label: "Auto-Deskew", status: settings.autoDeskew ? "enabled" : "disabled", ok: true },
                { label: "OCR Provider", status: "Custom Orthodox Model", ok: true },
                { label: "Retention", status: `${settings.deleteAfterDays}d images / ${settings.keepOutputDays}d output`, ok: settings.deleteAfterDays >= 30 },
                { label: "Purge Warning", status: settings.warnBeforePurge ? "enabled" : "disabled", ok: settings.warnBeforePurge },
              ].map((item, i) => (
                <div key={i} className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-medium text-[#1a2744]">{item.label}</div>
                    <div className="text-[10px] text-slate-500">{item.status}</div>
                  </div>
                  <CheckCircle size={13} className={item.ok ? "text-green-500 shrink-0" : "text-red-400 shrink-0"} />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Info size={13} className="text-blue-500" />
              <h3 className="text-xs font-semibold text-[#1a2744]">About OCR Settings</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Settings apply to the currently selected parish. Each parish can have independent OCR configuration, clergy mappings, and retention rules.
              Changes take effect on the next batch upload.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
