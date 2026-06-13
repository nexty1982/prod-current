import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '@/shared/lib/axiosInstance';
import { fmtFileSize } from '../utils/ocrStudioFormatters';

export type UploadQueueStatus =
  | 'pending'
  | 'uploading'
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'error';

export interface UploadQueueItem {
  id: string;
  file: File;
  name: string;
  size: number;
  sizeLabel: string;
  status: UploadQueueStatus;
  progress: number;
  error?: string;
  jobId?: string;
  reviewStatus?: string;
}

const ACCEPTED_RE = /\.(jpe?g|png|tiff?)$/i;
export const UPLOAD_ACCEPTED_TYPES = '.jpg,.jpeg,.png,.tif,.tiff';
export const UPLOAD_RECORD_TYPES = ['custom', 'baptism', 'marriage', 'funeral'] as const;
export type UploadRecordType = typeof UPLOAD_RECORD_TYPES[number];

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'el', label: 'Greek' },
  { value: 'ru', label: 'Russian' },
  { value: 'ro', label: 'Romanian' },
  { value: 'ka', label: 'Georgian' },
  { value: 'zh', label: 'Chinese' },
];

let _uid = 0;
const uid = () => `ocr_up_${++_uid}_${Date.now()}`;

function mapRemoteJobToQueueStatus(remote: { status: string; review_status?: string }): UploadQueueStatus {
  const reviewStatus = remote.review_status || 'uploaded';
  if (remote.status === 'failed' || remote.status === 'error') return 'failed';
  if (['agent_extracted', 'ready_to_seed', 'seeded'].includes(reviewStatus)) return 'completed';
  if (remote.status === 'processing') return 'processing';
  if (remote.status === 'complete' || remote.status === 'completed') return 'processing';
  return 'queued';
}

function normalizeOcrLanguage(raw?: string | null): string {
  if (!raw) return 'en';
  const code = raw.toLowerCase().trim();
  if (code.length === 2) return code;
  const map: Record<string, string> = { eng: 'en', gre: 'el', ell: 'el', rus: 'ru', ara: 'ar', ron: 'ro' };
  return map[code] || code.slice(0, 2);
}

export function useOcrUploadQueue(churchId: number | null) {
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [recordType, setRecordType] = useState<UploadRecordType>('custom');
  const [ocrLanguage, setOcrLanguage] = useState('en');
  const [recordLayoutMode, setRecordLayoutMode] = useState('auto');
  const [settingsLoading, setSettingsLoading] = useState(false);
  const queueRef = useRef(queue);
  queueRef.current = queue;
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!churchId) return;
    let cancelled = false;
    (async () => {
      setSettingsLoading(true);
      try {
        const res: any = await apiClient.get(`/api/church/${churchId}/ocr/settings`);
        const data = res?.data ?? res;
        if (cancelled) return;
        setOcrLanguage(normalizeOcrLanguage(data?.defaultLanguage || data?.language));
        const savedType = data?.documentProcessing?.defaultRecordType;
        if (savedType && UPLOAD_RECORD_TYPES.includes(savedType)) setRecordType(savedType);
        setRecordLayoutMode(data?.documentProcessing?.recordLayoutMode || 'auto');
      } catch {
        if (!cancelled) {
          setOcrLanguage('en');
          setRecordType('custom');
          setRecordLayoutMode('auto');
        }
      } finally {
        if (!cancelled) setSettingsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [churchId]);

  const syncQueueFromServer = useCallback(async () => {
    if (!churchId) return;
    try {
      const res: any = await apiClient.get(`/api/church/${churchId}/ocr/jobs?limit=200`);
      const jobs: any[] = res?.jobs || res?.data?.jobs || [];
      if (!Array.isArray(jobs)) return;
      const statusMap = new Map(jobs.map((j) => [String(j.id), j]));
      setQueue((prev) => {
        let changed = false;
        const next = prev.map((f) => {
          if (!f.jobId) return f;
          const remote = statusMap.get(String(f.jobId));
          if (!remote) return f;
          const uiStatus = mapRemoteJobToQueueStatus(remote);
          const reviewStatus = remote.review_status || 'uploaded';
          if (uiStatus === f.status && reviewStatus === f.reviewStatus) return f;
          changed = true;
          return {
            ...f,
            status: uiStatus,
            reviewStatus,
            progress: uiStatus === 'completed' ? 100 : f.progress,
            error: uiStatus === 'failed'
              ? (remote.error_message || remote.error || 'Processing failed')
              : f.error,
          };
        });
        return changed ? next : prev;
      });
    } catch { /* non-fatal */ }
  }, [churchId]);

  const shouldPollQueue = useMemo(
    () => queue.some((f) => f.jobId && !['completed', 'failed', 'error'].includes(f.status)),
    [queue],
  );

  useEffect(() => {
    if (!churchId || !shouldPollQueue) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    syncQueueFromServer();
    pollRef.current = setInterval(syncQueueFromServer, 4000);
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [churchId, shouldPollQueue, syncQueueFromServer]);

  const addFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return 0;
    const newFiles: UploadQueueItem[] = Array.from(fileList)
      .filter((f) => ACCEPTED_RE.test(f.name))
      .map((f) => ({
        id: uid(),
        file: f,
        name: f.name,
        size: f.size,
        sizeLabel: fmtFileSize(f.size),
        status: 'pending' as const,
        progress: 0,
      }));
    if (newFiles.length > 0) setQueue((prev) => [...prev, ...newFiles]);
    return newFiles.length;
  }, []);

  const removeFile = useCallback((id: string) => {
    setQueue((q) => q.filter((f) => f.id !== id));
  }, []);

  const clearQueue = useCallback(() => setQueue([]), []);

  const startUpload = useCallback(async () => {
    if (!churchId) return;
    const pending = queueRef.current.filter((f) => f.status === 'pending');
    if (pending.length === 0) return;
    setIsUploading(true);
    for (const item of pending) {
      setQueue((q) => q.map((f) => (f.id === item.id ? { ...f, status: 'uploading', progress: 0 } : f)));
      try {
        const formData = new FormData();
        formData.append('files', item.file);
        formData.append('churchId', churchId.toString());
        formData.append('recordType', recordType);
        formData.append('language', ocrLanguage);
        formData.append('recordLayoutMode', recordLayoutMode);
        const response: any = await apiClient.post('/api/ocr/jobs/upload', formData, { timeout: 120000 });
        const jobs = response?.jobs || response?.data?.jobs || [];
        const jobId = jobs.length > 0 ? String(jobs[0].id) : undefined;
        if (jobId) {
          setQueue((q) => q.map((f) => (f.id === item.id ? {
            ...f,
            status: 'queued' as const,
            progress: 100,
            jobId,
            reviewStatus: 'uploaded',
          } : f)));
        } else {
          setQueue((q) => q.map((f) => (f.id === item.id ? {
            ...f,
            status: 'error',
            progress: 100,
            error: 'Upload OK but no job created',
          } : f)));
        }
      } catch (err: any) {
        const body = err?.originalError?.response?.data ?? err?.response?.data;
        const serverMsg = body?.error || body?.message || err?.message || 'Upload failed';
        setQueue((q) => q.map((f) => (f.id === item.id ? { ...f, status: 'error', error: serverMsg } : f)));
      }
    }
    setIsUploading(false);
    await syncQueueFromServer();
  }, [churchId, recordType, ocrLanguage, recordLayoutMode, syncQueueFromServer]);

  const pendingCount = queue.filter((f) => f.status === 'pending').length;
  const allDone = queue.length > 0 && queue.every((f) => ['completed', 'failed', 'error'].includes(f.status));
  const overallProgress = queue.length === 0
    ? 0
    : Math.round(queue.reduce((sum, f) => sum + f.progress, 0) / queue.length);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  return {
    queue,
    isUploading,
    dragActive,
    recordType,
    setRecordType,
    ocrLanguage,
    setOcrLanguage,
    recordLayoutMode,
    settingsLoading,
    languageOptions: LANGUAGE_OPTIONS,
    pendingCount,
    allDone,
    overallProgress,
    addFiles,
    removeFile,
    clearQueue,
    startUpload,
    handleDrag,
    handleDrop,
    setDragActive,
  };
}
