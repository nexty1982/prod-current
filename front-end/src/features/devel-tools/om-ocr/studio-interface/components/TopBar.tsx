import React from "react";
import { Bell, ChevronDown, RefreshCw, Building2, Layers } from '@/ui/icons';

export function TopBar() {
  return (
    <header className="h-12 bg-white border-b border-slate-200 flex items-center px-4 gap-3 shrink-0">
      {/* Build indicator */}
      <span className="text-[10px] font-semibold font-mono bg-purple-100 text-purple-700 px-2 py-0.5 rounded uppercase tracking-wide">
        v2.4.1 — Production
      </span>

      {/* App switcher */}
      <button className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 border border-slate-200 rounded px-2 py-1 transition-colors">
        <Layers size={12} />
        OCR Studio
        <ChevronDown size={11} />
      </button>

      {/* Parish selector */}
      <div className="flex items-center gap-1.5 bg-[#f4f1ea] border border-[#c9a84c]/30 rounded-md px-2.5 py-1 flex-1 max-w-sm">
        <Building2 size={13} className="text-[#c9a84c] shrink-0" />
        <span className="text-xs font-medium text-[#1a2744] truncate">
          Saints Peter &amp; Paul — Manville, NJ
        </span>
        <span className="text-[10px] text-slate-400 ml-0.5 shrink-0">#46</span>
        <ChevronDown size={11} className="text-slate-400 ml-auto shrink-0" />
      </div>

      <div className="ml-auto flex items-center gap-3">
        {/* Last sync */}
        <span className="flex items-center gap-1 text-[11px] text-slate-400">
          <RefreshCw size={11} className="text-green-500" />
          Synced 2 min ago
        </span>

        {/* Notifications */}
        <button className="relative w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-100 transition-colors">
          <Bell size={15} className="text-slate-500" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full" />
        </button>

        {/* User avatar */}
        <button className="w-7 h-7 rounded-full bg-[#1a2744] flex items-center justify-center text-white text-[11px] font-semibold">
          FA
        </button>
      </div>
    </header>
  );
}
