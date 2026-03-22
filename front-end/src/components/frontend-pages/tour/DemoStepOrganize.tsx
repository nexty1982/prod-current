/**
 * DemoStepOrganize — Step 2: Structured record form simulation.
 * Fields populate sequentially with smooth transitions.
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Cross, Heart, BookOpen } from 'lucide-react';
import { MOCK_RECORDS, type MockSacramentRecord } from './tourDemoData';

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  baptism: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
  marriage: { bg: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800' },
  funeral: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  baptism: <Cross size={14} />,
  marriage: <Heart size={14} />,
  funeral: <BookOpen size={14} />,
};

interface Props {
  isActive: boolean;
}

const DemoStepOrganize = ({ isActive }: Props) => {
  const [activeType, setActiveType] = useState(0);
  const [visibleFields, setVisibleFields] = useState<number[]>([]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const record = MOCK_RECORDS[activeType];

  // Reset and animate fields when type changes or step activates
  useEffect(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setVisibleFields([]);

    if (!isActive) return;

    record.fields.forEach((f, i) => {
      const t = setTimeout(() => {
        setVisibleFields(prev => [...prev, i]);
      }, 300 + f.delay);
      timersRef.current.push(t);
    });

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [isActive, activeType, record.fields]);

  // Auto-cycle sacrament types
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      setActiveType(prev => (prev + 1) % MOCK_RECORDS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <div className="h-full flex flex-col">
      {/* Type selector tabs */}
      <div className="flex gap-2 mb-4">
        {MOCK_RECORDS.map((r, i) => {
          const colors = TYPE_COLORS[r.type];
          const active = i === activeType;
          return (
            <button
              key={r.type}
              onClick={() => setActiveType(i)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-['Inter'] font-medium border transition-all duration-200 ${
                active
                  ? `${colors.bg} ${colors.text} ${colors.border}`
                  : 'bg-[#f9fafb] dark:bg-gray-800 text-[#6a7282] dark:text-gray-400 border-[#f3f4f6] dark:border-gray-700 hover:border-[#d1d5db] dark:hover:border-gray-600'
              }`}
            >
              {TYPE_ICONS[r.type]}
              {r.typeLabel}
            </button>
          );
        })}
      </div>

      {/* Record card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={record.type}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.3 }}
          className="flex-1 bg-gradient-to-br from-[#2d1b4e] to-[#4a2f74] dark:from-gray-800 dark:to-gray-700 rounded-xl p-5 text-white overflow-hidden"
        >
          {/* Card header */}
          <div className="flex items-center gap-2 mb-4">
            <Database size={18} className="text-[#d4af37]" />
            <span className="font-['Inter'] text-[13px] font-medium text-[rgba(255,255,255,0.8)]">
              Extracted Record
            </span>
            <span className={`ml-auto text-[11px] font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[record.type].bg} ${TYPE_COLORS[record.type].text}`}>
              {record.typeLabel}
            </span>
          </div>

          {/* Fields */}
          <div className="space-y-2.5">
            <AnimatePresence>
              {record.fields.map((field, i) => (
                visibleFields.includes(i) && (
                  <motion.div
                    key={field.label}
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="bg-white/10 backdrop-blur-sm rounded-lg px-3.5 py-2.5 border border-white/10"
                  >
                    <p className="font-['Inter'] text-[11px] text-[rgba(255,255,255,0.5)] mb-0.5">{field.label}</p>
                    <p className="font-['Inter'] text-[14px] text-white">{field.value}</p>
                  </motion.div>
                )
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default DemoStepOrganize;
