import React, { useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Upload, FileImage, CheckCircle, X, AlertTriangle, ChevronRight, Play, Trash2, Loader2,
} from '@/ui/icons';
import { PageHeader } from './PageHeader';
import { StatusBadge } from './StatusBadge';
import type { UploadQueueItem, UploadRecordType } from '../hooks/useOcrUploadQueue';
import { UPLOAD_ACCEPTED_TYPES } from '../hooks/useOcrUploadQueue';
import { ocrStudioPathWithChurch } from '../../utils/ocrStudioChurch';
import { useOcrStudioPaths } from '../OcrStudioPathContext';

type UploadStep = 'config' | 'batch' | 'progress' | 'complete';

export interface UploadIntakeProps {
  churchId: number | null;
  churchLabel: string;
  queue: UploadQueueItem[];
  isUploading: boolean;
  dragActive: boolean;
  recordType: UploadRecordType;
  ocrLanguage: string;
  settingsLoading: boolean;
  languageOptions: Array<{ value: string; label: string }>;
  pendingCount: number;
  allDone: boolean;
  overallProgress: number;
  onRecordTypeChange: (type: UploadRecordType) => void;
  onLanguageChange: (lang: string) => void;
  onAddFiles: (files: FileList | null) => number;
  onRemoveFile: (id: string) => void;
  onClearQueue: () => void;
  onStartUpload: () => Promise<void>;
  onDrag: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

const RECORD_TYPE_OPTIONS: Array<{ value: UploadRecordType; label: string }> = [
  { value: 'custom', label: 'Auto-detect' },
  { value: 'baptism', label: 'Baptism' },
  { value: 'marriage', label: 'Marriage' },
  { value: 'funeral', label: 'Funeral' },
];

function queueStatusLabel(item: UploadQueueItem): string {
  switch (item.status) {
    case 'uploading': return 'Uploading';
    case 'queued': return 'In queue';
    case 'processing': return 'Processing OCR';
    case 'completed': return 'Ready for review';
    case 'failed':
    case 'error': return 'Failed';
    default: return 'Pending';
  }
}

export function UploadIntake(props: UploadIntakeProps) {
  const {
    churchId,
    churchLabel,
    queue,
    isUploading,
    dragActive,
    recordType,
    ocrLanguage,
    settingsLoading,
    languageOptions,
    pendingCount,
    allDone,
    overallProgress,
    onRecordTypeChange,
    onLanguageChange,
    onAddFiles,
    onRemoveFile,
    onClearQueue,
    onStartUpload,
    onDrag,
    onDrop,
  } = props;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toScreen } = useOcrStudioPaths();
  const [step, setStep] = useState<UploadStep>('config');

  const goBatchHistory = () => {
    navigate(ocrStudioPathWithChurch(toScreen('batch-history'), searchParams));
  };

  const goJobs = () => {
    navigate(ocrStudioPathWithChurch(toScreen('job-operations'), searchParams));
  };

  const handleChooseFiles = () => fileInputRef.current?.click();

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const added = onAddFiles(e.target.files);
    if (added > 0) setStep('batch');
    e.target.value = '';
  };

  const handleDropWithStep = (e: React.DragEvent) => {
    onDrop(e);
    if (e.dataTransfer.files?.length) setStep('batch');
  };

  const handleStartUpload = async () => {
    setStep('progress');
    await onStartUpload();
  };

  if (!churchId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Upload Parish Record Images" breadcrumb={['OCR Studio', 'Upload & Intake']} />
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-sm text-amber-800">
          Select a church from the top bar to upload OCR record images.
        </div>
      </div>
    );
  }

  if (step === 'complete' || (step === 'progress' && allDone && queue.length > 0)) {
    const completed = queue.filter((f) => f.status === 'completed' || f.jobId).length;
    return (
      <div className="space-y-6">
        <PageHeader title="Upload Parish Record Images" breadcrumb={['OCR Studio', 'Upload & Intake']} />
        <div className="bg-white rounded-lg border border-green-200 p-10 text-center max-w-2xl mx-auto">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-[#1a2744] mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            Upload Complete
          </h2>
          <p className="text-slate-500 mb-6">Your files have been queued for OCR processing.</p>
          <div className="bg-[#f4f1ea] rounded-lg p-4 text-left mb-6 grid grid-cols-2 gap-3">
            {[
              ['Files Uploaded', `${completed} of ${queue.length}`],
              ['Record Type', RECORD_TYPE_OPTIONS.find((o) => o.value === recordType)?.label || recordType],
              ['Language', languageOptions.find((o) => o.value === ocrLanguage)?.label || ocrLanguage],
              ['Church', churchLabel],
            ].map(([k, v]) => (
              <div key={k}>
                <div className="text-[10px] text-slate-400 uppercase tracking-wide">{k}</div>
                <div className="text-sm font-medium text-[#1a2744]">{v}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 justify-center flex-wrap">
            <button type="button" onClick={goBatchHistory} className="text-sm bg-[#1a2744] text-white px-4 py-2 rounded-md hover:bg-[#243459] transition-colors">
              View Batch History
            </button>
            <button type="button" onClick={goJobs} className="text-sm border border-slate-200 text-[#1a2744] px-4 py-2 rounded-md hover:bg-slate-50 transition-colors">
              Go to Job Operations
            </button>
            <button type="button" onClick={() => { onClearQueue(); setStep('config'); }} className="text-sm border border-slate-200 text-[#1a2744] px-4 py-2 rounded-md hover:bg-slate-50 transition-colors">
              Upload More Images
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'progress') {
    const uploadedCount = queue.filter((f) => f.progress >= 100 || f.jobId).length;
    return (
      <div className="space-y-6">
        <PageHeader title="Upload Parish Record Images" breadcrumb={['OCR Studio', 'Upload & Intake']} />
        <div className="bg-white rounded-lg border border-slate-200 p-6 max-w-3xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-[#1a2744]">
              {isUploading ? 'Uploading Batch' : 'Processing Queue'}
            </h2>
            {!isUploading && allDone && (
              <button type="button" onClick={() => setStep('complete')} className="text-xs bg-green-600 text-white px-2.5 py-1 rounded-md">
                Done
              </button>
            )}
          </div>
          <div className="mb-4">
            <div className="flex justify-between text-xs text-slate-500 mb-1.5">
              <span>Overall Progress</span>
              <span className="font-mono font-semibold">{overallProgress}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#1a2744] rounded-full transition-all" style={{ width: `${overallProgress}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>{uploadedCount} of {queue.length} files uploaded</span>
              {isUploading && <span className="flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Uploading…</span>}
            </div>
          </div>
          <div className="space-y-2">
            {queue.map((file) => (
              <div key={file.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <FileImage size={16} className="text-slate-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-slate-700 truncate">{file.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="h-1 bg-slate-200 rounded-full overflow-hidden flex-1">
                      <div
                        className={`h-full rounded-full transition-all ${file.status === 'completed' ? 'bg-green-500' : file.status === 'failed' || file.status === 'error' ? 'bg-red-500' : 'bg-blue-500'}`}
                        style={{ width: `${file.progress}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">{file.progress}%</span>
                  </div>
                  {file.error && <div className="text-[10px] text-red-500 mt-0.5">{file.error}</div>}
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded font-medium shrink-0 bg-slate-100 text-slate-600">
                  {queueStatusLabel(file)}
                </span>
              </div>
            ))}
          </div>
          {!isUploading && allDone && (
            <button type="button" onClick={() => setStep('complete')} className="mt-4 w-full text-sm bg-green-600 text-white py-2 rounded-md hover:bg-green-700 transition-colors">
              Continue
            </button>
          )}
        </div>
      </div>
    );
  }

  if (step === 'batch') {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Upload Parish Record Images"
          subtitle="Review selected files before uploading."
          breadcrumb={['OCR Studio', 'Upload & Intake']}
          actions={
            <div className="flex gap-2">
              <button type="button" onClick={() => { onClearQueue(); setStep('config'); }} className="text-sm border border-slate-200 text-slate-600 px-3 py-2 rounded-md hover:bg-slate-50">
                Clear Batch
              </button>
              <button
                type="button"
                disabled={pendingCount === 0 || isUploading}
                onClick={handleStartUpload}
                className="flex items-center gap-1.5 text-sm bg-[#1a2744] text-white px-4 py-2 rounded-md hover:bg-[#243459] transition-colors disabled:opacity-50"
              >
                <Play size={13} />
                Start Upload
              </button>
            </div>
          }
        />
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="grid grid-cols-4 gap-4 text-sm">
            {[
              ['Church', churchLabel],
              ['Record Type', RECORD_TYPE_OPTIONS.find((o) => o.value === recordType)?.label || recordType],
              ['Language', languageOptions.find((o) => o.value === ocrLanguage)?.label || ocrLanguage],
              ['File Count', `${queue.length} files`],
            ].map(([k, v]) => (
              <div key={k}>
                <div className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">{k}</div>
                <div className="text-sm font-medium text-[#1a2744]">{v}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 grid grid-cols-12 gap-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
            <div className="col-span-7">File</div>
            <div className="col-span-2">Size</div>
            <div className="col-span-3 text-right">Actions</div>
          </div>
          {queue.map((file) => (
            <div key={file.id} className="px-4 py-3 border-b border-slate-50 last:border-0 grid grid-cols-12 gap-2 items-center hover:bg-slate-50/50">
              <div className="col-span-7 flex items-center gap-2">
                <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center shrink-0">
                  <FileImage size={14} className="text-slate-400" />
                </div>
                <span className="text-xs font-medium text-slate-700 truncate">{file.name}</span>
              </div>
              <div className="col-span-2 text-xs text-slate-400 font-mono">{file.sizeLabel}</div>
              <div className="col-span-3 flex justify-end gap-1">
                <button type="button" onClick={() => onRemoveFile(file.id)} className="p-1 rounded hover:bg-red-50 transition-colors">
                  <X size={13} className="text-red-400" />
                </button>
              </div>
            </div>
          ))}
          {queue.length === 0 && (
            <div className="py-8 text-center text-sm text-slate-400">No files selected.</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <input ref={fileInputRef} type="file" multiple accept={UPLOAD_ACCEPTED_TYPES} className="hidden" onChange={handleFileInput} />
      <PageHeader
        title="Upload Parish Record Images"
        subtitle="Upload scanned baptism, marriage, and funeral register pages for OCR processing and review."
        breadcrumb={['OCR Studio', 'Upload & Intake']}
      />
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-4">
          <div className="bg-white rounded-lg border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-[#1a2744] mb-4">Upload Configuration</h3>
            {settingsLoading ? (
              <div className="text-sm text-slate-400 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading church settings…</div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Church</label>
                  <div className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-slate-50 text-[#1a2744]">{churchLabel}</div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Record Type</label>
                  <select
                    value={recordType}
                    onChange={(e) => onRecordTypeChange(e.target.value as UploadRecordType)}
                    className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white text-[#1a2744] focus:outline-none focus:ring-1 focus:ring-[#c9a84c]"
                  >
                    {RECORD_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Language</label>
                  <select
                    value={ocrLanguage}
                    onChange={(e) => onLanguageChange(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white text-[#1a2744] focus:outline-none focus:ring-1 focus:ring-[#c9a84c]"
                  >
                    {languageOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
          <div
            className={`rounded-lg border-2 border-dashed transition-all p-10 text-center ${
              dragActive ? 'border-[#c9a84c] bg-[#f4f1ea]' : 'border-slate-300 bg-white hover:border-slate-400'
            }`}
            onDragEnter={onDrag}
            onDragOver={onDrag}
            onDragLeave={onDrag}
            onDrop={handleDropWithStep}
          >
            <div className="w-14 h-14 bg-[#1a2744]/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload size={24} className="text-[#1a2744]/40" />
            </div>
            <h3 className="text-base font-medium text-[#1a2744] mb-1" style={{ fontFamily: 'var(--font-display)' }}>
              Drag scanned register pages here
            </h3>
            <p className="text-sm text-slate-400 mb-4">JPG, PNG, or TIFF · 300 DPI or higher recommended</p>
            <button type="button" onClick={handleChooseFiles} className="text-sm bg-[#1a2744] text-white px-4 py-2 rounded-md hover:bg-[#243459] transition-colors">
              Choose Files
            </button>
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-[#1a2744] mb-3 flex items-center gap-2">
              <CheckCircle size={14} className="text-[#c9a84c]" />
              Before You Upload
            </h3>
            <ul className="space-y-2">
              {[
                'Pages are clear and readable',
                'Text is not cut off at edges',
                'Page is not rotated sideways',
                'One register page per image preferred',
                'Avoid glare, shadows, and blur',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs text-slate-600">
                  <CheckCircle size={12} className="text-green-500 shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-[#f4f1ea] rounded-lg border border-[#c9a84c]/20 p-4">
            <h3 className="text-xs font-semibold text-[#1a2744] mb-2">My Uploads</h3>
            <p className="text-xs text-slate-500 mb-2">View all previous batches and their processing status.</p>
            <button type="button" onClick={goBatchHistory} className="text-xs text-[#c9a84c] font-medium hover:underline">
              View Batch History →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
