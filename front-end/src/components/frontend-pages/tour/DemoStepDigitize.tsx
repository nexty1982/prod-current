/**
 * DemoStepDigitize — Step 1: Upload & OCR simulation.
 * Animated file cards appear one by one, then an OCR-ready badge fades in.
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileImage, FileText, FolderArchive, CheckCircle2, Camera, ScanLine } from 'lucide-react';
import { MOCK_UPLOAD_FILES, type MockUploadFile } from './tourDemoData';

const FILE_ICONS: Record<string, React.ReactNode> = {
  scan: <FileText size={18} className="text-[#2d1b4e] dark:text-[#d4af37]" />,
  photo: <Camera size={18} className="text-[#2d1b4e] dark:text-[#d4af37]" />,
  batch: <FolderArchive size={18} className="text-[#2d1b4e] dark:text-[#d4af37]" />,
};

interface Props {
  isActive: boolean;
}

const DemoStepDigitize = ({ isActive }: Props) => {
  const [visibleFiles, setVisibleFiles] = useState<number[]>([]);
  const [ocrReady, setOcrReady] = useState(false);
  const [progressMap, setProgressMap] = useState<Record<number, number>>({});
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    // Clean up on deactivate
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (!isActive) {
      setVisibleFiles([]);
      setOcrReady(false);
      setProgressMap({});
      return;
    }

    // Stagger file appearance
    MOCK_UPLOAD_FILES.forEach((_, i) => {
      const t1 = setTimeout(() => {
        setVisibleFiles(prev => [...prev, i]);
        // Animate progress for this file
        let prog = 0;
        const interval = setInterval(() => {
          prog += Math.random() * 25 + 10;
          if (prog >= 100) {
            prog = 100;
            clearInterval(interval);
          }
          setProgressMap(prev => ({ ...prev, [i]: Math.min(prog, 100) }));
        }, 120);
        timersRef.current.push(interval as unknown as ReturnType<typeof setTimeout>);
      }, 600 + i * 700);
      timersRef.current.push(t1);
    });

    // OCR-ready badge
    const t2 = setTimeout(() => setOcrReady(true), 600 + MOCK_UPLOAD_FILES.length * 700 + 800);
    timersRef.current.push(t2);

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [isActive]);

  return (
    <div className="h-full flex flex-col">
      {/* Drop zone */}
      <motion.div
        className="border-2 border-dashed border-[rgba(45,27,78,0.25)] dark:border-[rgba(212,175,55,0.3)] rounded-xl p-6 text-center mb-4 bg-[rgba(45,27,78,0.02)] dark:bg-[rgba(212,175,55,0.03)]"
        animate={visibleFiles.length === 0 ? { borderColor: ['rgba(45,27,78,0.15)', 'rgba(45,27,78,0.35)', 'rgba(45,27,78,0.15)'] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <Upload className="mx-auto mb-2 text-[#6a7282] dark:text-gray-500" size={28} />
        <p className="font-['Inter'] text-[14px] text-[#6a7282] dark:text-gray-400">
          Drop scans, photos, or archives here
        </p>
        <div className="flex justify-center gap-3 mt-3">
          {[
            { icon: <ScanLine size={13} />, label: 'Scan' },
            { icon: <Camera size={13} />, label: 'Photo' },
            { icon: <FolderArchive size={13} />, label: 'Batch' },
          ].map(b => (
            <span key={b.label} className="inline-flex items-center gap-1 text-[11px] font-['Inter'] font-medium text-[#4a5565] dark:text-gray-400 bg-[#f3f4f6] dark:bg-gray-700 px-2 py-1 rounded-full">
              {b.icon} {b.label}
            </span>
          ))}
        </div>
      </motion.div>

      {/* File list */}
      <div className="flex-1 space-y-2.5 overflow-hidden">
        <AnimatePresence>
          {visibleFiles.map(idx => {
            const file = MOCK_UPLOAD_FILES[idx];
            const progress = progressMap[idx] ?? 0;
            const done = progress >= 100;
            return (
              <motion.div
                key={file.name}
                initial={{ opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-[#f3f4f6] dark:border-gray-700 shadow-sm"
              >
                <div className="w-8 h-8 rounded-lg bg-[rgba(45,27,78,0.06)] dark:bg-[rgba(212,175,55,0.1)] flex items-center justify-center flex-shrink-0">
                  {FILE_ICONS[file.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-['Inter'] text-[13px] font-medium text-[#2d1b4e] dark:text-gray-100 truncate">{file.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] font-['Inter'] text-[#6a7282] dark:text-gray-500">{file.size}</span>
                    {file.pages && (
                      <span className="text-[11px] font-['Inter'] text-[#6a7282] dark:text-gray-500">{file.pages} pages</span>
                    )}
                  </div>
                  {/* Progress bar */}
                  {!done && (
                    <div className="mt-1.5 h-1 bg-[#f3f4f6] dark:bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-[#2d1b4e] dark:bg-[#d4af37] rounded-full"
                        style={{ width: `${progress}%` }}
                        transition={{ duration: 0.15 }}
                      />
                    </div>
                  )}
                </div>
                {done && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }}>
                    <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* OCR Ready badge */}
      <AnimatePresence>
        {ocrReady && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="mt-4 flex items-center gap-2 justify-center p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg"
          >
            <ScanLine size={16} className="text-emerald-600 dark:text-emerald-400" />
            <span className="font-['Inter'] text-[13px] font-medium text-emerald-700 dark:text-emerald-300">
              4 documents ready for OCR processing
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DemoStepDigitize;
