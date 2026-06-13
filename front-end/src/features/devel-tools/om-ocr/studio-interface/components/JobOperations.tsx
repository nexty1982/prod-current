import React, { useMemo, useState } from 'react';
import {
  Search, RotateCcw, Eye, X, Clock, CheckCircle,
  AlertTriangle, Activity, FileImage, Terminal, Loader2, RefreshCw,
} from '@/ui/icons';
import { PageHeader } from './PageHeader';
import { MetricCard } from './MetricCard';
import { StatusBadge, RecordTypeBadge, ConfidenceBadge } from './StatusBadge';
import type { MonitorCounts, MonitorJobRow } from '../hooks/useOcrMonitorJobs';

interface JobOperationsProps {
  jobs: MonitorJobRow[];
  counts: MonitorCounts;
  loading?: boolean;
  error?: string | null;
  statusFilter: string;
  search: string;
  onStatusFilterChange: (status: string) => void;
  onSearchChange: (q: string) => void;
  onRefresh?: () => void;
  onRetry?: (job: MonitorJobRow) => Promise<void>;
  onOpenReview?: (churchId: number, jobId: number) => void;
}

export function JobOperations({
  jobs,
  counts,
  loading,
  error,
  statusFilter,
  search,
  onStatusFilterChange,
  onSearchChange,
  onRefresh,
  onRetry,
  onOpenReview,
}: JobOperationsProps) {
  const [selected, setSelected] = useState<MonitorJobRow | null>(null);
  const [retryingId, setRetryingId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return jobs.filter((j) => {
      const matchSearch = !q || String(j.id).includes(q) || j.displayName.toLowerCase().includes(q);
      const matchStatus = !statusFilter || statusFilter === 'all' || j.uiStatus === statusFilter || j.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [jobs, search, statusFilter]);

  const handleRetry = async (job: MonitorJobRow) => {
    if (!onRetry) return;
    setRetryingId(job.id);
    try {
      await onRetry(job);
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="space-y-6 relative">
      <PageHeader
        title="OCR Job Operations"
        subtitle="Monitor processing jobs, retry failures, and manage OCR queue health."
        breadcrumb={['OCR Studio', 'Job Operations']}
        actions={
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs bg-[#1a2744] text-white px-3 py-2 rounded-md hover:bg-[#243459] transition-colors disabled:opacity-60"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            Refresh
          </button>
        }
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-6 gap-3">
        <MetricCard label="Processing" value={counts.processing} icon={Activity} color="blue" />
        <MetricCard label="Queued" value={counts.queued} icon={Clock} color="default" />
        <MetricCard label="Failed" value={counts.failed} icon={AlertTriangle} color="red" />
        <MetricCard label="Completed" value={counts.completed} icon={CheckCircle} color="green" />
        <MetricCard label="Stale" value={counts.stale} color="amber" />
        <MetricCard label="Total Shown" value={filtered.length} color="default" />
      </div>

      <div className="flex items-center gap-3 bg-white rounded-lg border border-slate-200 p-3">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search jobs..."
            className="pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#c9a84c] w-48"
          />
        </div>
        {['all', 'processing', 'queued', 'review', 'completed', 'failed'].map((s) => {
          const active = s === 'all' ? !statusFilter : statusFilter === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => onStatusFilterChange(s === 'all' ? '' : s)}
              className={`text-xs px-3 py-1.5 rounded-md capitalize font-medium transition-colors ${
                active ? 'bg-[#1a2744] text-white' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {s === 'all' ? 'All' : s}
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-100 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
          <div className="col-span-1">Job ID</div>
          <div className="col-span-2">Church</div>
          <div className="col-span-1">Type</div>
          <div className="col-span-3">File</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-1">Conf.</div>
          <div className="col-span-1">Age</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>
        {loading && filtered.length === 0 && (
          <div className="py-12 flex justify-center"><Loader2 size={20} className="animate-spin text-slate-400" /></div>
        )}
        {filtered.map((job) => (
          <div
            key={`${job.church_id}-${job.id}`}
            className={`grid grid-cols-12 gap-2 px-4 py-3 border-b border-slate-50 last:border-0 items-center hover:bg-slate-50/50 transition-colors cursor-pointer ${selected?.id === job.id && selected?.church_id === job.church_id ? 'bg-blue-50/30' : ''}`}
            onClick={() => setSelected(selected?.id === job.id ? null : job)}
          >
            <div className="col-span-1 text-xs font-mono font-medium text-blue-600">#{job.id}</div>
            <div className="col-span-2 text-xs text-slate-600 truncate">{job.church_name}</div>
            <div className="col-span-1"><RecordTypeBadge type={job.record_type} /></div>
            <div className="col-span-3">
              <div className="text-xs text-slate-700 truncate">{job.displayName}</div>
              {job.error && <div className="text-[10px] text-red-500 truncate">{job.error}</div>}
            </div>
            <div className="col-span-1"><StatusBadge status={job.uiStatus} /></div>
            <div className="col-span-1">
              {job.confidence_score != null && job.confidence_score > 0
                ? <ConfidenceBadge value={Math.round(job.confidence_score)} />
                : <span className="text-slate-300 text-xs">—</span>}
            </div>
            <div className="col-span-1 text-xs text-slate-400 font-mono">{job.age}</div>
            <div className="col-span-2 flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
              <button type="button" onClick={() => setSelected(job)} className="p-1.5 rounded hover:bg-blue-50 transition-colors" title="View">
                <Eye size={13} className="text-blue-500" />
              </button>
              {(job.uiStatus === 'failed' || job.status === 'failed') && onRetry && (
                <button
                  type="button"
                  disabled={retryingId === job.id}
                  onClick={() => handleRetry(job)}
                  className="p-1.5 rounded hover:bg-amber-50 transition-colors disabled:opacity-50"
                  title="Retry"
                >
                  {retryingId === job.id
                    ? <Loader2 size={13} className="text-amber-500 animate-spin" />
                    : <RotateCcw size={13} className="text-amber-500" />}
                </button>
              )}
            </div>
          </div>
        ))}
        {!loading && filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-slate-400">No jobs match your filters.</div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-y-0 right-0 w-96 bg-white border-l border-slate-200 shadow-xl z-50 flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-mono">JOB-{selected.id}</div>
              <h2 className="text-base font-semibold text-[#1a2744]">Job Detail</h2>
            </div>
            <button type="button" onClick={() => setSelected(null)} className="p-1.5 rounded hover:bg-slate-100 transition-colors">
              <X size={16} className="text-slate-400" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="bg-slate-100 rounded-lg h-36 flex items-center justify-center overflow-hidden">
              <img
                src={`/api/church/${selected.church_id}/ocr/jobs/${selected.id}/image`}
                alt=""
                className="max-h-full max-w-full object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <FileImage size={32} className="text-slate-300" />
            </div>
            <div className="space-y-2">
              {[
                ['Church', selected.church_name],
                ['Record Type', selected.record_type],
                ['Started', selected.started],
                ['Status', null],
                ['Confidence', selected.confidence_score != null && selected.confidence_score > 0 ? `${Math.round(selected.confidence_score)}%` : '—'],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex justify-between items-center py-1.5 border-b border-slate-50">
                  <span className="text-xs text-slate-500">{k}</span>
                  {k === 'Status' ? <StatusBadge status={selected.uiStatus} /> : <span className="text-xs font-medium text-[#1a2744] capitalize">{String(v)}</span>}
                </div>
              ))}
            </div>
            {selected.error && (
              <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                <div className="flex items-center gap-1.5 mb-1">
                  <AlertTriangle size={13} className="text-red-500" />
                  <span className="text-xs font-semibold text-red-700">Error</span>
                </div>
                <p className="text-xs text-red-600">{selected.error}</p>
              </div>
            )}
            <div className="bg-[#1a2744] rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Terminal size={12} className="text-white/40" />
                <span className="text-[10px] text-white/40 font-mono uppercase tracking-wide">Job Info</span>
              </div>
              <pre className="text-[10px] text-green-400 font-mono leading-relaxed whitespace-pre-wrap">
                {`Status: ${selected.status}\nFile: ${selected.displayName}\nChurch ID: ${selected.church_id}\n${selected.error ? `Error: ${selected.error}` : 'No error recorded'}`}
              </pre>
            </div>
          </div>
          <div className="p-4 border-t border-slate-100 space-y-2">
            {(selected.uiStatus === 'failed' || selected.status === 'failed') && onRetry && (
              <button
                type="button"
                disabled={retryingId === selected.id}
                onClick={() => handleRetry(selected)}
                className="w-full flex items-center justify-center gap-1.5 text-sm bg-amber-500 text-white py-2 rounded-md hover:bg-amber-600 transition-colors disabled:opacity-50"
              >
                {retryingId === selected.id ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                Retry Job
              </button>
            )}
            {(selected.uiStatus === 'review' || selected.uiStatus === 'completed') && onOpenReview && (
              <button
                type="button"
                onClick={() => onOpenReview(selected.church_id, selected.id)}
                className="w-full flex items-center justify-center gap-1.5 text-sm bg-[#1a2744] text-white py-2 rounded-md hover:bg-[#243459] transition-colors"
              >
                <Eye size={14} /> Open Review
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
