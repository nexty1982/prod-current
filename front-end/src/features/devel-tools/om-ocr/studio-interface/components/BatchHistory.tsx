import React, { useMemo, useState } from 'react';
import { Search, RefreshCw, Eye, RotateCcw, Loader2 } from 'lucide-react';
import { PageHeader } from './PageHeader';
import { StatusBadge, RecordTypeBadge, ConfidenceBadge } from './StatusBadge';
import type { OcrStudioBatch } from '../hooks/useOcrStudioBatches';

interface BatchHistoryProps {
  batches: OcrStudioBatch[];
  churchId: number | null;
  loading?: boolean;
  onRefresh?: () => void;
  onRetryBatch?: (jobIds: number[]) => Promise<void>;
}

export function BatchHistory({
  batches,
  churchId,
  loading,
  onRefresh,
  onRetryBatch,
}: BatchHistoryProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const filtered = useMemo(() => batches.filter((b) => {
    const matchSearch = b.name.toLowerCase().includes(search.toLowerCase()) || b.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchSearch && matchStatus;
  }), [batches, search, statusFilter]);

  const handleRetry = async (batch: OcrStudioBatch) => {
    if (!onRetryBatch) return;
    setRetryingId(batch.id);
    try {
      await onRetryBatch(batch.jobIds);
    } finally {
      setRetryingId(null);
    }
  };

  if (!churchId) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Uploads / Batch History" breadcrumb={['OCR Studio', 'Batch History']} />
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-sm text-amber-800">
          Select a church from the top bar to view upload history.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Uploads / Batch History"
        subtitle="View all uploaded batches and their OCR processing status."
        breadcrumb={['OCR Studio', 'Upload & Intake', 'Batch History']}
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

      <div className="flex items-center gap-3 bg-white rounded-lg border border-slate-200 p-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search batches..."
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#c9a84c]"
          />
        </div>
        {['all', 'processing', 'review', 'completed', 'failed'].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-md capitalize font-medium transition-colors ${
              statusFilter === s ? 'bg-[#1a2744] text-white' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            {s === 'all' ? 'All Status' : s}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-100 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
          <div className="col-span-4">Batch</div>
          <div className="col-span-1">Type</div>
          <div className="col-span-1">Files</div>
          <div className="col-span-2">Date</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-1">Confidence</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>
        {loading && filtered.length === 0 && (
          <div className="py-12 flex justify-center"><Loader2 size={20} className="animate-spin text-slate-400" /></div>
        )}
        {filtered.map((batch) => (
          <div key={batch.id} className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-slate-50 last:border-0 items-center hover:bg-slate-50/50 transition-colors">
            <div className="col-span-4">
              <div className="text-sm font-medium text-[#1a2744]">{batch.name}</div>
              <div className="text-[10px] text-slate-400 font-mono">{batch.id}</div>
            </div>
            <div className="col-span-1"><RecordTypeBadge type={batch.type} /></div>
            <div className="col-span-1 text-xs text-slate-600 font-mono">{batch.files}</div>
            <div className="col-span-2 text-xs text-slate-500">{batch.date}</div>
            <div className="col-span-1"><StatusBadge status={batch.status} /></div>
            <div className="col-span-1">{batch.confidence > 0 && <ConfidenceBadge value={batch.confidence} />}</div>
            <div className="col-span-2 flex justify-end gap-1">
              <button type="button" className="p-1.5 rounded hover:bg-blue-50 transition-colors" title="View jobs">
                <Eye size={13} className="text-blue-500" />
              </button>
              {batch.status === 'failed' && onRetryBatch && (
                <button
                  type="button"
                  disabled={retryingId === batch.id}
                  onClick={() => handleRetry(batch)}
                  className="p-1.5 rounded hover:bg-amber-50 transition-colors disabled:opacity-50"
                  title="Retry failed jobs"
                >
                  {retryingId === batch.id
                    ? <Loader2 size={13} className="text-amber-500 animate-spin" />
                    : <RotateCcw size={13} className="text-amber-500" />}
                </button>
              )}
            </div>
          </div>
        ))}
        {!loading && filtered.length === 0 && (
          <div className="py-12 text-center">
            <div className="text-slate-400 text-sm">No batches match your filters.</div>
          </div>
        )}
      </div>
    </div>
  );
}
