import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Eye, EyeOff } from 'lucide-react';

interface ImageComparisonPanelProps {
  imageSrc: string;
  variant: 'primary' | 'secondary';
  delay?: number;
}

export function ImageComparisonPanel({ imageSrc, variant, delay = 0.1 }: ImageComparisonPanelProps) {
  const [expanded, setExpanded] = useState(variant === 'primary');
  const isSecondary = variant === 'secondary';
  const imageHeight = variant === 'primary' ? 'h-52' : 'h-32';

  return (
    <motion.div
      className="mb-5"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
    >
      {isSecondary && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors mb-2 cursor-pointer bg-transparent border-none p-0"
        >
          {expanded ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          <span>{expanded ? 'Hide' : 'Show'} image comparison</span>
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-3.5 h-3.5" />
          </motion.div>
        </button>
      )}

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2 font-['Inter']">Original — Raw Scan</p>
                <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <img src={imageSrc} alt="Original scan" className={`w-full ${imageHeight} object-cover`} loading="lazy" />
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2 font-['Inter']">Enhanced — AI Processed</p>
                <div className="rounded-xl overflow-hidden border border-purple-200 dark:border-purple-800 bg-purple-50/30 dark:bg-purple-900/10">
                  <img
                    src={imageSrc}
                    alt="Enhanced scan"
                    className={`w-full ${imageHeight} object-cover`}
                    style={{ filter: 'brightness(1.15) contrast(1.2) saturate(0.3)' }}
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
