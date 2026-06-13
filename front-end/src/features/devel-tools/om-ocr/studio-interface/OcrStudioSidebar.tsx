import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Upload, Eye, Briefcase, AlignLeft,
  Table2, LayoutTemplate, Settings, ChevronDown, ChevronRight,
  Cpu, Cross, User, Activity, History,
} from '@/ui/icons';
import { useAuth } from '@/context/AuthContext';
import { useOcrStudioPaths } from './OcrStudioPathContext';
import { ocrStudioScreenFromPath, type OcrStudioScreen } from './ocrStudioPaths';
import { ocrStudioPathWithChurch } from '../utils/ocrStudioChurch';

type NavScreen = OcrStudioScreen | 'review-detail';

interface NavItemDef {
  id: NavScreen;
  label: string;
  icon: React.ElementType;
  screen: OcrStudioScreen;
  superAdminOnly?: boolean;
}

const ocrSubItems: NavItemDef[] = [
  { id: 'command-center', label: 'Command Center', icon: Activity, screen: 'command-center' },
  { id: 'upload-intake', label: 'Upload & Intake', icon: Upload, screen: 'upload-intake' },
  { id: 'batch-history', label: 'Batch History', icon: History, screen: 'batch-history' },
  { id: 'review-queue', label: 'Review Queue', icon: Eye, screen: 'review-queue' },
  { id: 'job-operations', label: 'Job Operations', icon: Briefcase, screen: 'job-operations', superAdminOnly: true },
  { id: 'record-headers', label: 'Record Headers', icon: AlignLeft, screen: 'record-headers' },
  { id: 'table-extractor', label: 'Table Extractor', icon: Table2, screen: 'table-extractor', superAdminOnly: true },
  { id: 'layout-templates', label: 'Layout Templates', icon: LayoutTemplate, screen: 'layout-templates', superAdminOnly: true },
  { id: 'ocr-settings', label: 'OCR Settings', icon: Settings, screen: 'ocr-settings' },
];

export function OcrStudioSidebar() {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const { user, isSuperAdmin } = useAuth();
  const { basePath, toScreen } = useOcrStudioPaths();
  const [ocrOpen, setOcrOpen] = useState(true);

  const current = ocrStudioScreenFromPath(pathname, basePath);
  const isOcrScreen = current !== null;

  const visibleItems = ocrSubItems.filter((item) => !item.superAdminOnly || isSuperAdmin());

  const goTo = (screen: OcrStudioScreen) => {
    const path = toScreen(screen);
    navigate(ocrStudioPathWithChurch(path, search));
  };

  const displayName = user?.name || user?.email || 'User';
  const roleLabel = user?.role?.replace(/_/g, ' ') || 'Staff';

  return (
    <aside className="flex flex-col w-56 shrink-0 h-full bg-[#1a2744] text-white border-r border-white/5">
      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-[#c9a84c] flex items-center justify-center shrink-0">
            <Cross size={14} className="text-[#1a2744]" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)' }} className="text-sm font-semibold text-white leading-tight">
              Orthodox Metrics
            </div>
            <div className="text-[10px] text-white/40 leading-tight">OCR Studio</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        <NavItem
          icon={LayoutDashboard}
          label="Command Center"
          active={current === 'command-center'}
          onClick={() => goTo('command-center')}
        />

        <div>
          <button
            type="button"
            onClick={() => setOcrOpen(!ocrOpen)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors ${
              isOcrScreen ? 'text-[#c9a84c]' : 'text-white/40 hover:text-white/70'
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
              {visibleItems.filter((i) => i.screen !== 'command-center').map((item) => (
                <NavItem
                  key={item.id}
                  icon={item.icon}
                  label={item.label}
                  active={current === item.id || (item.id === 'review-queue' && current === 'review-detail')}
                  onClick={() => goTo(item.screen)}
                  small
                />
              ))}
            </div>
          )}
        </div>
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-2.5 px-1">
          <div className="w-7 h-7 rounded-full bg-[#c9a84c] flex items-center justify-center shrink-0">
            <User size={13} className="text-[#1a2744]" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-white truncate">{displayName}</div>
            <div className="text-[10px] text-white/40 truncate capitalize">{roleLabel}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function NavItem({
  icon: Icon,
  label,
  active,
  onClick,
  small,
}: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
  small?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 rounded-md transition-colors text-left ${
        small ? 'py-1.5 text-xs' : 'py-2 text-sm'
      } ${
        active
          ? 'bg-white/10 text-white font-medium border-l-2 border-[#c9a84c] rounded-l-none'
          : 'text-white/60 hover:text-white hover:bg-white/5'
      }`}
    >
      <Icon size={small ? 13 : 15} className={active ? 'text-[#c9a84c]' : ''} />
      {label}
    </button>
  );
}

export default OcrStudioSidebar;
