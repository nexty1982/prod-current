import React, { useMemo, useState } from 'react';
import { Search, FileImage, Loader2, RefreshCw } from 'lucide-react';
import { PageHeader } from './PageHeader';
import { MetricCard } from './MetricCard';
import { StatusBadge, RecordTypeBadge, ConfidenceBadge } from './StatusBadge';
import type { OcrStudioJobRow, OcrStudioJobStats } from '../hooks/useOcrStudioJobData';
import { filterReviewQueueJobs } from '../hooks/useOcrStudioBatches';

interface ReviewQueueProps {
  jobs: OcrStudioJobRow[];
  stats: OcrStudioJobStats;
  churchId: number | null;
  loading?: boolean;
  onRefresh?: () => void;
  onOpenReview: (churchId: number, jobId: number) => void;
}

export function ReviewQueue({
  jobs,
  stats,
  churchId,
  loading,
  onRefresh,
  onOpenReview,
}: ReviewQueueProps) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const reviewJobs = useMemo(() => filterReviewQueueJobs(jobs), [jobs]);

  const filtered = useMemo(() => {
    return reviewJobs.filter((job) => {
      const q = search.toLowerCase();
      const matchSearch = !q
        || job.displayName.toLowerCase().includes(q)
        || String(job.id).includes(q);
      let matchStatus = true;
      if (statusFilter === 'review') {
        matchStatus = ['agent_extracted', 'ocr_complete', 'pending_review', 'in_review'].includes(job.review_status);
      } else if (statusFilter === 'approved') {
        matchStatus = job.review_status === 'ready_to_seed';
      } else if (statusFilter === 'needs_correction') {
        matchStatus = job.review_status === 'returned';
      }
      return matchSearch && matchStatus;
    });
  }, [reviewJobs, search, statusFilter]);

  if (!churchId) {
    return (
      <div className="space-y-6">
        <PageHeader title="OCR Review Queue" breadcrumb={['OCR Studio', 'Review Queue']} />
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-sm text-amber-800">
          Select a church from the top bar to view records awaiting review.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="OCR Review Queue"
        subtitle="Review extracted fields before records are approved and added to the parish database."
        breadcrumb={['OCR Studio', 'Review Queue']}
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

      <div className="grid grid-cols-5 gap-3">
        <MetricCard label="Needs Review" value={stats.review} color="amber" />
        <MetricCard label="Ready to Seed" value={stats.readyToSeed} color="green" />
        <MetricCard label="Low Confidence" value={stats.lowConfidence} color="red" />
        <MetricCard label="Seeded" value={stats.seeded} color="default" />
        <MetricCard label="Failed" value={stats.failed} color="red" />
      </div>

      <div className="flex items-center gap-3 bg-white rounded-lg border border-slate-200 p-3">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search records..."
            className="pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#c9a84c] w-48"
          />
        </div>
        {['all', 'review', 'approved', 'needs_correction'].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
              statusFilter === s ? 'bg-[#1a2744] text-white' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            {s === 'all' ? 'All' : s === 'needs_correction' ? 'Needs Correction' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-100 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
          <div className="col-span-4">Record</div>
          <div className="col-span-1">Type</div>
          <div className="col-span-1">Confidence</div>
          <div className="col-span-2">Pipeline</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-1">Age</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>
        {loading && filtered.length === 0 && (
          <div className="py-12 flex justify-center text-slate-400">
            <Loader2 size={20} className="animate-spin" />
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-slate-400">
            No records in the review queue for this church.
          </div>
        )}
        {filtered.map((rec) => (
          <div key={rec.id} className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-slate-50 last:border-0 items-center hover:bg-slate-50/50 transition-colors">
            <div className="col-span-4 flex items-center gap-2">
              <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center shrink-0 overflow-hidden relative">
                <img
                  src={`/api/church/${rec.church_id}/ocr/jobs/${rec.id}/image`}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <FileImage size={14} className="text-slate-400" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-[#1a2744] truncate">{rec.displayName}</div>
                <div className="text-[10px] text-slate-400 font-mono">JOB-{rec.id}</div>
              </div>
            </div>
            <div className="col-span-1"><RecordTypeBadge type={rec.record_type} /></div>
            <div className="col-span-1">
              {rec.confidence_score != null && rec.confidence_score > 0
                ? <ConfidenceBadge value={Math.round(rec.confidence_score)} />
                : <span className="text-slate-300 text-xs">—</span>}
            </div>
            <div className="col-span-2 text-[10px] text-slate-500 capitalize">{rec.review_status.replace(/_/g, ' ')}</div>
            <div className="col-span-1"><StatusBadge status={rec.uiStatus} /></div>
            <div className="col-span-1 text-[10px] text-slate-400 font-mono">{rec.age}</div>
            <div className="col-span-2 flex justify-end gap-1">
              <button
                type="button"
                onClick={() => onOpenReview(rec.church_id, rec.id)}
                className="text-xs bg-[#1a2744] text-white px-2.5 py-1 rounded-md hover:bg-[#243459] transition-colors"
              >
                Review Fields
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
