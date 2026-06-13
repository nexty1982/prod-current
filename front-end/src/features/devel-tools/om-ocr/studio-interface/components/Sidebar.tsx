import React, { useState } from "react";
import {
  LayoutDashboard, Upload, Eye, Briefcase, AlignLeft,
  Table2, LayoutTemplate, Settings, FileText, BarChart3,
  Shield, ChevronDown, ChevronRight, Cpu, Cross, User,
  Activity
} from '@/ui/icons';

type Screen =
  | "command-center" | "upload-intake" | "batch-history"
  | "job-operations" | "review-queue" | "review-detail"
  | "record-headers" | "table-extractor" | "layout-templates"
  | "ocr-settings" | "dashboard";

interface SidebarProps {
  current: Screen;
  onChange: (screen: Screen) => void;
}

const ocrSubItems = [
  { id: "command-center" as Screen, label: "Command Center", icon: Activity },
  { id: "upload-intake" as Screen, label: "Upload & Intake", icon: Upload },
  { id: "review-queue" as Screen, label: "Review Queue", icon: Eye },
  { id: "job-operations" as Screen, label: "Job Operations", icon: Briefcase },
  { id: "record-headers" as Screen, label: "Record Headers", icon: AlignLeft },
  { id: "table-extractor" as Screen, label: "Table Extractor", icon: Table2 },
  { id: "layout-templates" as Screen, label: "Layout Templates", icon: LayoutTemplate },
  { id: "ocr-settings" as Screen, label: "OCR Settings", icon: Settings },
];

export function Sidebar({ current, onChange }: SidebarProps) {
  const [ocrOpen, setOcrOpen] = useState(true);
  const isOcrScreen = ocrSubItems.some(i => i.id === current);

  return (
    <aside className="flex flex-col w-56 shrink-0 h-screen bg-[#1a2744] text-white border-r border-white/5">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-[#c9a84c] flex items-center justify-center shrink-0">
            <Cross size={14} className="text-[#1a2744]" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-display)" }} className="text-sm font-semibold text-white leading-tight">Orthodox Metrics</div>
            <div className="text-[10px] text-white/40 leading-tight">Admin Studio</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        <NavItem icon={LayoutDashboard} label="Dashboard" active={current === "dashboard"} onClick={() => onChange("dashboard")} />

        {/* OCR Studio group */}
        <div>
          <button
            onClick={() => setOcrOpen(!ocrOpen)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors ${
              isOcrScreen ? "text-[#c9a84c]" : "text-white/40 hover:text-white/70"
            }`}
          >
            <span className="flex items-center gap-2">
              <Cpu size={13} />
              OCR Studio
            </span>
            {ocrOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
          {ocrOpen && (
            <div className="mt-0.5 space-y-0.5 pl-2">
              {ocrSubItems.map(item => (
                <NavItem
                  key={item.id}
                  icon={item.icon}
                  label={item.label}
                  active={current === item.id}
                  onClick={() => onChange(item.id)}
                  small
                />
              ))}
            </div>
          )}
        </div>

        <div className="pt-1">
          <NavItem icon={FileText} label="Records" active={false} onClick={() => {}} />
          <NavItem icon={BarChart3} label="Reports" active={false} onClick={() => {}} />
          <NavItem icon={Shield} label="Admin" active={false} onClick={() => {}} />
        </div>
      </nav>

      {/* Profile */}
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-2.5 px-1">
          <div className="w-7 h-7 rounded-full bg-[#c9a84c] flex items-center justify-center shrink-0">
            <User size={13} className="text-[#1a2744]" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-white truncate">Fr. Admin User</div>
            <div className="text-[10px] text-white/40 truncate">Super Admin</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function NavItem({ icon: Icon, label, active, onClick, small }: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
  small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 rounded-md transition-colors text-left ${
        small ? "py-1.5 text-xs" : "py-2 text-sm"
      } ${
        active
          ? "bg-white/10 text-white font-medium border-l-2 border-[#c9a84c] rounded-l-none"
          : "text-white/60 hover:text-white hover:bg-white/5"
      }`}
    >
      <Icon size={small ? 13 : 15} className={active ? "text-[#c9a84c]" : ""} />
      {label}
    </button>
  );
}
