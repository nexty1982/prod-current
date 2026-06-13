import React from 'react';
import { Bell, ChevronDown, RefreshCw, Building2, Layers } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useOcrChurchSelector } from '../hooks/useOcrChurchSelector';
import OcrChurchSelector from '../components/OcrChurchSelector';

function initials(name?: string | null, email?: string | null): string {
  const src = (name || email || 'U').trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

export function OcrStudioTopBar() {
  const { user } = useAuth();
  const { selectedChurchId } = useOcrChurchSelector();

  return (
    <header className="h-12 bg-white border-b border-slate-200 flex items-center px-4 gap-3 shrink-0">
      <span className="text-[10px] font-semibold font-mono bg-purple-100 text-purple-700 px-2 py-0.5 rounded uppercase tracking-wide">
        OCR Studio
      </span>

      <button
        type="button"
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 border border-slate-200 rounded px-2 py-1 transition-colors"
      >
        <Layers size={12} />
        Admin Studio
        <ChevronDown size={11} />
      </button>

      <div className="flex items-center gap-2 flex-1 max-w-md min-w-0">
        <div className="flex items-center gap-1.5 bg-[#f4f1ea] border border-[#c9a84c]/30 rounded-md px-2.5 py-1 flex-1 min-w-0">
          <Building2 size={13} className="text-[#c9a84c] shrink-0" />
          <span className="text-xs font-medium text-[#1a2744] truncate">
            {selectedChurchId ? `Parish #${selectedChurchId}` : 'Select parish'}
          </span>
          {selectedChurchId ? (
            <span className="text-[10px] text-slate-400 ml-0.5 shrink-0">#{selectedChurchId}</span>
          ) : null}
        </div>
        <div className="shrink-0 [&_.MuiFormControl-root]:min-w-[140px] [&_.MuiInputBase-root]:text-xs">
          <OcrChurchSelector variant="inline" />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <span className="flex items-center gap-1 text-[11px] text-slate-400">
          <RefreshCw size={11} className="text-green-500" />
          Live
        </span>

        <button
          type="button"
          className="relative w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-100 transition-colors"
          aria-label="Notifications"
        >
          <Bell size={15} className="text-slate-500" />
        </button>

        <button
          type="button"
          className="w-7 h-7 rounded-full bg-[#1a2744] flex items-center justify-center text-white text-[11px] font-semibold"
          title={user?.email || undefined}
        >
          {initials(user?.name, user?.email)}
        </button>
      </div>
    </header>
  );
}

export default OcrStudioTopBar;
