/**
 * DemoStepSearch — Step 3: Live search simulation.
 * Types out a query, then reveals matching results with filter chips.
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Cross, Heart, BookOpen, Globe } from 'lucide-react';
import { MOCK_SEARCH_RESULTS, SEARCH_QUERY, SEARCH_FILTER_CHIPS, type MockSearchResult } from './tourDemoData';

const TYPE_BADGE: Record<string, { bg: string; text: string }> = {
  baptism: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
  marriage: { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-300' },
  funeral: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300' },
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  baptism: <Cross size={11} />,
  marriage: <Heart size={11} />,
  funeral: <BookOpen size={11} />,
};

interface Props {
  isActive: boolean;
}

const DemoStepSearch = ({ isActive }: Props) => {
  const [typedText, setTypedText] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [visibleResults, setVisibleResults] = useState<number[]>([]);
  const [activeFilter, setActiveFilter] = useState(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setTypedText('');
    setShowResults(false);
    setVisibleResults([]);
    setActiveFilter(0);

    if (!isActive) return;

    // Type out the query character by character
    SEARCH_QUERY.split('').forEach((_, i) => {
      const t = setTimeout(() => {
        setTypedText(SEARCH_QUERY.slice(0, i + 1));
      }, 400 + i * 65);
      timersRef.current.push(t);
    });

    // Show results after typing completes
    const typingEnd = 400 + SEARCH_QUERY.length * 65 + 300;
    const t1 = setTimeout(() => setShowResults(true), typingEnd);
    timersRef.current.push(t1);

    // Stagger result cards
    MOCK_SEARCH_RESULTS.forEach((_, i) => {
      const t = setTimeout(() => {
        setVisibleResults(prev => [...prev, i]);
      }, typingEnd + 100 + i * 150);
      timersRef.current.push(t);
    });

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [isActive]);

  const filteredResults = activeFilter === 0
    ? MOCK_SEARCH_RESULTS
    : MOCK_SEARCH_RESULTS.filter(r => r.typeLabel === SEARCH_FILTER_CHIPS[activeFilter]);

  return (
    <div className="h-full flex flex-col">
      {/* Search bar */}
      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6a7282] dark:text-gray-500" />
        <div className="w-full pl-9 pr-4 py-2.5 bg-[#f9fafb] dark:bg-gray-800 border-2 border-[#2d1b4e] dark:border-[#d4af37] rounded-lg font-['Inter'] text-[14px] text-[#2d1b4e] dark:text-gray-100 min-h-[40px] flex items-center">
          {typedText}
          {typedText.length < SEARCH_QUERY.length && isActive && (
            <motion.span
              className="inline-block w-[2px] h-[16px] bg-[#2d1b4e] dark:bg-[#d4af37] ml-[1px]"
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.6, repeat: Infinity }}
            />
          )}
        </div>
      </div>

      {/* Filter chips */}
      {showResults && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="flex gap-1.5 mb-3 flex-wrap"
        >
          {SEARCH_FILTER_CHIPS.map((chip, i) => (
            <button
              key={chip}
              onClick={() => setActiveFilter(i)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-['Inter'] font-medium transition-all duration-200 ${
                i === activeFilter
                  ? 'bg-[#2d1b4e] dark:bg-[#d4af37] text-white dark:text-[#2d1b4e]'
                  : 'bg-[#f3f4f6] dark:bg-gray-700 text-[#6a7282] dark:text-gray-400 hover:bg-[#e5e7eb] dark:hover:bg-gray-600'
              }`}
            >
              {chip}
            </button>
          ))}
          <span className="ml-auto flex items-center gap-1 text-[11px] font-['Inter'] text-[#6a7282] dark:text-gray-500">
            <Globe size={11} /> Multilingual
          </span>
        </motion.div>
      )}

      {/* Results count */}
      {showResults && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="font-['Inter'] text-[12px] text-[#6a7282] dark:text-gray-500 mb-2"
        >
          {filteredResults.length} records found in 0.04s
        </motion.p>
      )}

      {/* Results */}
      <div className="flex-1 space-y-2 overflow-hidden">
        <AnimatePresence>
          {showResults && filteredResults.map((result, i) => (
            visibleResults.includes(MOCK_SEARCH_RESULTS.indexOf(result)) && (
              <motion.div
                key={result.name + result.type}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-[#f3f4f6] dark:border-gray-700 hover:border-[#d4af37] dark:hover:border-[#d4af37] transition-colors cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-['Inter'] text-[13px] font-medium text-[#2d1b4e] dark:text-gray-100 group-hover:text-[#4a2f74] dark:group-hover:text-[#d4af37] transition-colors">
                    {result.name}
                  </p>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${TYPE_BADGE[result.type].bg} ${TYPE_BADGE[result.type].text}`}>
                    {TYPE_ICONS[result.type]}
                    {result.typeLabel}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-['Inter'] text-[#6a7282] dark:text-gray-500">
                  <span>{result.date}</span>
                  <span className="w-1 h-1 bg-[#d1d5db] dark:bg-gray-600 rounded-full" />
                  <span>{result.parish}</span>
                </div>
                <p className="text-[11px] font-['Inter'] text-[#9ca3af] dark:text-gray-500 mt-1">{result.detail}</p>
              </motion.div>
            )
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DemoStepSearch;
