import React, { useState } from "react";
import { Search, Eye, Play, Download, RotateCcw, X, FileImage, AlertTriangle, CheckCircle, Table2 } from "lucide-react";
import { PageHeader } from "./PageHeader";
import { MetricCard } from "./MetricCard";
import { StatusBadge, RecordTypeBadge, ConfidenceBadge } from "./StatusBadge";

const extractions = [
  { id: "EXT-0441", church: "Saints Peter & Paul", file: "baptism_register_1985_page_01.jpg", type: "baptism" as const, template: "Baptism Ledger v2", confidence: 94, created: "Jun 12", status: "completed" as const, rows: 12 },
  { id: "EXT-0440", church: "Saints Peter & Paul", file: "marriage_ledger_1974_003.tiff", type: "marriage" as const, template: "Marriage Register 1974", confidence: 72, created: "Jun 11", status: "review" as const, rows: 8 },
  { id: "EXT-0439", church: "Saints Peter & Paul", file: "funeral_register_1962_page_12.png", type: "funeral" as const, template: "Funeral Register (Legacy)", confidence: 42, created: "Jun 10", status: "failed" as const, rows: 0 },
  { id: "EXT-0438", church: "Saints Peter & Paul", file: "parish_register_1920_p01.jpg", type: "baptism" as const, template: "Parish Register 1920–1935", confidence: 88, created: "Jun 9", status: "completed" as const, rows: 18 },
  { id: "EXT-0437", church: "Test Church", file: "test_marriage_001.jpg", type: "marriage" as const, template: "Marriage Register 1985", confidence: 0, created: "Jun 12", status: "queued" as const, rows: 0 },
];

const previewRows = [
  { name: "Alexandros Nikolaou", date: "14 Mar 1985", parish: "Sts. Peter & Paul", clergy: "Fr. D. Stavros", sponsors: "G. Papadopoulos / E. Stavros" },
  { name: "Maria Petrescu", date: "22 Mar 1985", parish: "Sts. Peter & Paul", clergy: "Fr. D. Stavros", sponsors: "I. Petrescu / A. Popescu" },
  { name: "Giorgi Kapanadze", date: "5 Apr 1985", parish: "Sts. Peter & Paul", clergy: "Fr. D. Stavros", sponsors: "N. Kapanadze / M. Tsiklauri" },
  { name: "Ivan Sokolov", date: "19 Apr 1985", parish: "Sts. Peter & Paul", clergy: "Fr. A. Sorokin", sponsors: "P. Sokolov / O. Ivanova" },
];

export function TableExtractor() {
  const [selected, setSelected] = useState<typeof extractions[0] | null>(null);

  return (
    <div className="space-y-6 relative">
      <PageHeader
        title="OCR Table Extractor"
        subtitle="Extract structured tabular records from scanned register pages using configured layout templates."
        breadcrumb={["OCR Studio", "Table Extractor"]}
        actions={
          <button className="flex items-center gap-1.5 text-xs bg-[#1a2744] text-white px-3 py-2 rounded-md hover:bg-[#243459] transition-colors">
            <Play size={13} /> Run New Extraction
          </button>
        }
      />

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-3">
        <MetricCard label="Pending Extraction" value={3} color="amber" />
        <MetricCard label="Extracted Tables" value={28} color="green" />
        <MetricCard label="Low Confidence" value={4} color="red" />
        <MetricCard label="Failed Extraction" value={2} color="red" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 bg-white rounded-lg border border-slate-200 p-3">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input placeholder="Search files..." className="pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#c9a84c] w-48" />
        </div>
        <select className="text-sm border border-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#c9a84c]">
          <option>All Templates</option>
          <option>Baptism Ledger v2</option>
          <option>Marriage Register 1974</option>
          <option>Parish Register 1920–1935</option>
        </select>
        <select className="text-sm border border-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#c9a84c]">
          <option>All Status</option>
          <option>Completed</option>
          <option>Queued</option>
          <option>Failed</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-100 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
          <div className="col-span-1">ID</div>
          <div className="col-span-2">Church</div>
          <div className="col-span-2">File</div>
          <div className="col-span-1">Type</div>
          <div className="col-span-2">Template</div>
          <div className="col-span-1">Confidence</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>
        {extractions.map(ext => (
          <div key={ext.id} className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-slate-50 last:border-0 items-center hover:bg-slate-50/50 transition-colors">
            <div className="col-span-1 text-xs font-mono text-blue-600">{ext.id}</div>
            <div className="col-span-2 text-xs text-slate-600 truncate">{ext.church}</div>
            <div className="col-span-2 text-xs text-slate-700 truncate">{ext.file}</div>
            <div className="col-span-1"><RecordTypeBadge type={ext.type} /></div>
            <div className="col-span-2 text-xs text-slate-600 truncate">{ext.template}</div>
            <div className="col-span-1">{ext.confidence > 0 ? <ConfidenceBadge value={ext.confidence} /> : <span className="text-slate-300 text-xs">—</span>}</div>
            <div className="col-span-1"><StatusBadge status={ext.status} /></div>
            <div className="col-span-2 flex justify-end gap-1">
              <button onClick={() => setSelected(ext)} className="p-1.5 rounded hover:bg-blue-50 transition-colors" title="Preview"><Eye size={13} className="text-blue-500" /></button>
              {ext.status === "queued" && <button className="p-1.5 rounded hover:bg-green-50 transition-colors" title="Extract"><Play size={13} className="text-green-500" /></button>}
              {ext.status === "failed" && <button className="p-1.5 rounded hover:bg-amber-50 transition-colors" title="Re-run"><RotateCcw size={13} className="text-amber-500" /></button>}
              {ext.status === "completed" && <button className="p-1.5 rounded hover:bg-slate-100 transition-colors" title="Download CSV"><Download size={13} className="text-slate-400" /></button>}
            </div>
          </div>
        ))}
      </div>

      {/* Preview Drawer */}
      {selected && (
        <div className="fixed inset-y-0 right-0 w-[480px] bg-white border-l border-slate-200 shadow-xl z-50 flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-mono">{selected.id}</div>
              <h2 className="text-base font-semibold text-[#1a2744]">Extraction Preview</h2>
            </div>
            <button onClick={() => setSelected(null)} className="p-1.5 rounded hover:bg-slate-100"><X size={16} className="text-slate-400" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Source image */}
            <div className="bg-slate-100 rounded-lg h-28 flex items-center justify-center border border-slate-200">
              <div className="text-center">
                <FileImage size={24} className="text-slate-300 mx-auto mb-1" />
                <div className="text-xs text-slate-400">{selected.file}</div>
              </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-2">
              {[
                ["Template", selected.template],
                ["Record Type", selected.type],
                ["Rows Extracted", selected.rows > 0 ? `${selected.rows} rows` : "—"],
                ["Confidence", selected.confidence > 0 ? `${selected.confidence}%` : "—"],
              ].map(([k, v]) => (
                <div key={String(k)} className="bg-slate-50 rounded-lg p-2.5">
                  <div className="text-[10px] text-slate-400 uppercase">{k}</div>
                  <div className="text-sm font-medium text-[#1a2744] capitalize">{String(v)}</div>
                </div>
              ))}
            </div>

            {/* Warning */}
            {selected.confidence > 0 && selected.confidence < 80 && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg p-3">
                <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">Confidence below 80%. Review all extracted rows carefully before seeding.</p>
              </div>
            )}
            {selected.status === "failed" && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg p-3">
                <AlertTriangle size={13} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">Extraction failed. Image may not match the configured layout template. Try a different template or re-run with enhanced mode.</p>
              </div>
            )}

            {/* Extracted table preview */}
            {selected.status === "completed" && (
              <div>
                <h3 className="text-xs font-semibold text-[#1a2744] mb-2 flex items-center gap-1.5">
                  <Table2 size={13} className="text-[#c9a84c]" />
                  Extracted Table ({selected.rows} rows)
                </h3>
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        {["Name", "Date", "Clergy", "Sponsors"].map(h => (
                          <th key={h} className="text-left px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, i) => (
                        <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                          <td className="px-3 py-2 font-medium text-[#1a2744]">{row.name}</td>
                          <td className="px-3 py-2 text-slate-600 font-mono">{row.date}</td>
                          <td className="px-3 py-2 text-slate-600">{row.clergy}</td>
                          <td className="px-3 py-2 text-slate-500 truncate max-w-[120px]">{row.sponsors}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  <CheckCircle size={12} className="text-green-500" />
                  <span className="text-[10px] text-slate-400">Showing 4 of {selected.rows} rows</span>
                </div>
              </div>
            )}
          </div>
          <div className="p-4 border-t border-slate-100 space-y-2">
            {selected.status === "completed" && (
              <div className="grid grid-cols-2 gap-2">
                <button className="text-sm bg-[#1a2744] text-white py-2 rounded-md hover:bg-[#243459] transition-colors">Confirm Extraction</button>
                <button className="text-sm border border-slate-200 text-slate-600 py-2 rounded-md hover:bg-slate-50">Send to Review</button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              {selected.status === "completed" && <button className="text-sm border border-slate-200 text-slate-600 py-2 rounded-md hover:bg-slate-50 flex items-center justify-center gap-1.5"><Download size={13} />Download CSV</button>}
              <button className={`text-sm border border-slate-200 text-slate-600 py-2 rounded-md hover:bg-slate-50 flex items-center justify-center gap-1.5 ${selected.status === "completed" ? "" : "col-span-2"}`}>
                <RotateCcw size={13} />Re-run Extraction
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
