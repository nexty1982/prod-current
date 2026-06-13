import React, { useMemo } from 'react';
import {
  Activity, Upload, Eye, Briefcase, AlignLeft, Table2, LayoutTemplate,
  AlertTriangle, CheckCircle, Clock, ChevronRight, TrendingUp, RefreshCw, Loader2,
} from 'lucide-react';
import { MetricCard } from './MetricCard';
import { PageHeader } from './PageHeader';
import { StatusBadge, ConfidenceBadge } from './StatusBadge';
import type { OcrStudioJobStats } from '../hooks/useOcrStudioJobData';
import type { OcrStudioBatch } from '../hooks/useOcrStudioBatches';

type Screen = 'upload-intake' | 'review-queue' | 'job-operations' | 'record-headers' | 'table-extractor' | 'layout-templates';

interface CommandAction {
  id: number;
  title: string;
  description: string;
  severity: 'review' | 'failed' | 'warning' | 'info' | 'queued';
  screen: Screen;
  action: string;
}

interface CommandCenterProps {
  onNavigate: (screen: Screen) => void;
  stats: OcrStudioJobStats;
  recentBatches: OcrStudioBatch[];
  loading?: boolean;
  churchSelected?: boolean;
  onRefresh?: () => void;
}

const severityBadge = (s: string) => {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    review: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Review' },
    failed: { bg: 'bg-red-100', text: 'text-red-700', label: 'Failed' },
    warning: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Warning' },
    info: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Info' },
    queued: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Queued' },
  };
  const c = map[s] ?? map.info;
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded ${c.bg} ${c.text}`}>{c.label}</span>;
};

function buildActions(stats: OcrStudioJobStats): CommandAction[] {
  const actions: CommandAction[] = [];
  let id = 1;
  if (stats.review > 0) {
    actions.push({
      id: id++,
      title: `Review ${stats.review} extracted record${stats.review === 1 ? '' : 's'}`,
      description: `${stats.review} OCR record${stats.review === 1 ? ' is' : 's are'} awaiting field verification before approval.`,
      severity: 'review',
      screen: 'review-queue',
      action: 'Open Review Queue',
    });
  }
  if (stats.failed > 0) {
    actions.push({
      id: id++,
      title: `Retry ${stats.failed} failed OCR job${stats.failed === 1 ? '' : 's'}`,
      description: `${stats.failed} job${stats.failed === 1 ? '' : 's'} failed during processing — check resolution and file quality.`,
      severity: 'failed',
      screen: 'job-operations',
      action: 'Go to Job Operations',
    });
  }
  if (stats.readyToSeed > 0) {
    actions.push({
      id: id++,
      title: `${stats.readyToSeed} record${stats.readyToSeed === 1 ? '' : 's'} ready to seed`,
      description: 'Approved records are ready for database insertion.',
      severity: 'info',
      screen: 'review-queue',
      action: 'View Ready Records',
    });
  }
  if (stats.processing > 0 || stats.queued > 0) {
    actions.push({
      id: id++,
      title: `${stats.processing + stats.queued} job${stats.processing + stats.queued === 1 ? '' : 's'} in pipeline`,
      description: 'OCR processing is active — monitor progress in Job Operations.',
      severity: 'queued',
      screen: 'job-operations',
      action: 'Monitor Jobs',
    });
  }
  if (actions.length === 0) {
    actions.push({
      id: 1,
      title: 'Upload new register pages',
      description: 'No active OCR work for this church — start by uploading scanned register images.',
      severity: 'info',
      screen: 'upload-intake',
      action: 'Upload Images',
    });
  }
  return actions;
}

export function CommandCenter({
  onNavigate,
  stats,
  recentBatches,
  loading,
  churchSelected = true,
  onRefresh,
}: CommandCenterProps) {
  const actions = useMemo(() => buildActions(stats), [stats]);

  const pipelineSteps = [
    { label: 'Uploaded', count: stats.uploaded, color: 'bg-blue-500' },
    { label: 'OCR Processing', count: stats.ocrComplete + stats.processing, color: 'bg-purple-500' },
    { label: 'Review Fields', count: stats.review, color: 'bg-amber-500' },
    { label: 'Approved / Seeded', count: stats.readyToSeed + stats.seeded, color: 'bg-green-500' },
  ];

  const quickLaunch = [
    { label: 'Upload Images', icon: Upload, screen: 'upload-intake' as Screen, desc: 'Add scanned pages' },
    { label: 'Review Queue', icon: Eye, screen: 'review-queue' as Screen, desc: `${stats.review} pending` },
    { label: 'Job Operations', icon: Briefcase, screen: 'job-operations' as Screen, desc: `${stats.active} active` },
    { label: 'Record Headers', icon: AlignLeft, screen: 'record-headers' as Screen, desc: 'Configure fields' },
    { label: 'Layout Templates', icon: LayoutTemplate, screen: 'layout-templates' as Screen, desc: 'Templates' },
    { label: 'Table Extractor', icon: Table2, screen: 'table-extractor' as Screen, desc: 'Extract tables' },
  ];

  if (!churchSelected) {
    return (
      <div className="space-y-6">
        <PageHeader title="OCR Studio Command Center" breadcrumb={['OCR Studio', 'Command Center']} />
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-sm text-amber-800">
          Select a church from the top bar to view OCR pipeline status and actions.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="OCR Studio Command Center"
        subtitle="Manage parish record digitization, OCR processing, review queues, and extraction templates."
        breadcrumb={['OCR Studio', 'Command Center']}
        actions={
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs bg-[#1a2744] text-white px-3 py-2 rounded-md hover:bg-[#243459] transition-colors disabled:opacity-60"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            Refresh Status
          </button>
        }
      />

      <div className="grid grid-cols-6 gap-3">
        <MetricCard label="Active Jobs" value={stats.active} icon={Activity} color="blue" />
        <MetricCard label="Ready for Review" value={stats.review} icon={Eye} color="amber" onClick={() => onNavigate('review-queue')} />
        <MetricCard label="Failed Jobs" value={stats.failed} icon={AlertTriangle} color="red" onClick={() => onNavigate('job-operations')} />
        <MetricCard label="Completed" value={stats.seeded + stats.readyToSeed} icon={CheckCircle} color="green" />
        <MetricCard label="Avg. Confidence" value={stats.avgConfidence != null ? `${stats.avgConfidence}%` : '—'} icon={TrendingUp} color="purple" />
        <MetricCard label="In Queue" value={stats.queued} icon={Clock} color="gold" onClick={() => onNavigate('job-operations')} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-white rounded-lg border border-slate-200">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#1a2744]">Next Best Actions</h2>
            <span className="text-xs text-slate-400">{actions.length} items</span>
          </div>
          <div className="divide-y divide-slate-50">
            {actions.map((action) => (
              <div key={action.id} className="px-4 py-3 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {severityBadge(action.severity)}
                      <span className="text-sm font-medium text-[#1a2744]">{action.title}</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{action.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate(action.screen)}
                    className="shrink-0 text-xs bg-[#1a2744] text-white px-2.5 py-1.5 rounded-md hover:bg-[#243459] transition-colors whitespace-nowrap"
                  >
                    {action.action}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h2 className="text-sm font-semibold text-[#1a2744] mb-3">OCR Workflow Pipeline</h2>
            <div className="space-y-2">
              {pipelineSteps.map((step, i) => (
                <div key={step.label} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${step.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium text-slate-700 truncate">{step.label}</span>
                      <span className="text-xs font-semibold text-slate-600 font-mono ml-2">{step.count}</span>
                    </div>
                    <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${step.color}`} style={{ width: step.count > 0 ? `${Math.min(100, step.count * 8)}%` : '0%' }} />
                    </div>
                  </div>
                  {i < pipelineSteps.length - 1 && <ChevronRight size={12} className="text-slate-300 shrink-0" />}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200">
            <div className="px-4 py-3 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-[#1a2744]">Recent Batches</h2>
            </div>
            <div className="divide-y divide-slate-50">
              {recentBatches.slice(0, 5).map((b) => (
                <div key={b.id} className="px-4 py-2.5 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-[#1a2744] truncate">{b.name}</div>
                    <div className="text-[10px] text-slate-400">{b.files} files · {b.date}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {b.confidence > 0 && <ConfidenceBadge value={b.confidence} />}
                    <StatusBadge status={b.status} />
                  </div>
                </div>
              ))}
              {recentBatches.length === 0 && (
                <div className="px-4 py-6 text-xs text-slate-400 text-center">No uploads yet for this church.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h2 className="text-sm font-semibold text-[#1a2744] mb-3">Quick Launch</h2>
        <div className="grid grid-cols-6 gap-3">
          {quickLaunch.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => onNavigate(item.screen)}
              className="flex flex-col items-center gap-2 p-3 rounded-lg border border-slate-200 hover:border-[#c9a84c] hover:bg-[#f4f1ea] transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-[#1a2744] flex items-center justify-center group-hover:bg-[#c9a84c] transition-colors">
                <item.icon size={16} className="text-white group-hover:text-[#1a2744]" />
              </div>
              <div className="text-center">
                <div className="text-xs font-medium text-[#1a2744] leading-tight">{item.label}</div>
                <div className="text-[10px] text-slate-400">{item.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
