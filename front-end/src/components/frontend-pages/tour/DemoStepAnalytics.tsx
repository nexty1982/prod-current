/**
 * DemoStepAnalytics — Step 4: Reporting & analytics simulation.
 * Animated KPI cards with count-up, a lightweight bar chart, and a toggle.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import { MOCK_KPIS, MOCK_CHART_DATA, type MockKPI } from './tourDemoData';

const TREND_ICONS = {
  up: <TrendingUp size={12} className="text-emerald-500" />,
  down: <TrendingDown size={12} className="text-red-400" />,
  flat: <Minus size={12} className="text-[#6a7282]" />,
};

const CHART_COLORS = {
  baptisms: { bar: 'bg-[#2d1b4e] dark:bg-[#d4af37]', legend: 'bg-[#2d1b4e] dark:bg-[#d4af37]' },
  marriages: { bar: 'bg-[#4a2f74] dark:bg-[#c29d2f]', legend: 'bg-[#4a2f74] dark:bg-[#c29d2f]' },
  funerals: { bar: 'bg-[#8b6fb0] dark:bg-[#a88a3d]', legend: 'bg-[#8b6fb0] dark:bg-[#a88a3d]' },
};

type ChartMetric = 'baptisms' | 'marriages' | 'funerals';
const METRIC_OPTIONS: { key: ChartMetric; label: string }[] = [
  { key: 'baptisms', label: 'Baptisms' },
  { key: 'marriages', label: 'Marriages' },
  { key: 'funerals', label: 'Funerals' },
];

interface Props {
  isActive: boolean;
}

/** Simple count-up hook */
function useCountUp(target: number, duration: number, active: boolean) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!active) { setValue(0); return; }
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, active]);

  return value;
}

function KPICard({ kpi, index, isActive }: { kpi: MockKPI; index: number; isActive: boolean }) {
  const count = useCountUp(kpi.value, 1200 + index * 200, isActive);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.1 }}
      className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-[#f3f4f6] dark:border-gray-700 shadow-sm"
    >
      <p className="font-['Inter'] text-[11px] text-[#6a7282] dark:text-gray-500 mb-1">{kpi.label}</p>
      <div className="flex items-end gap-2">
        <span className="font-['Georgia'] text-xl text-[#2d1b4e] dark:text-white leading-none">
          {count.toLocaleString()}
        </span>
        <span className="flex items-center gap-0.5 text-[11px] font-['Inter'] mb-0.5">
          {TREND_ICONS[kpi.trend]}
          <span className={kpi.trend === 'up' ? 'text-emerald-500' : kpi.trend === 'down' ? 'text-red-400' : 'text-[#6a7282]'}>
            {kpi.trendValue}
          </span>
        </span>
      </div>
    </motion.div>
  );
}

const DemoStepAnalytics = ({ isActive }: Props) => {
  const [activeMetrics, setActiveMetrics] = useState<Set<ChartMetric>>(new Set(['baptisms', 'marriages', 'funerals']));
  const [chartReady, setChartReady] = useState(false);

  const toggleMetric = useCallback((metric: ChartMetric) => {
    setActiveMetrics(prev => {
      const next = new Set(prev);
      if (next.has(metric)) {
        if (next.size > 1) next.delete(metric); // keep at least one
      } else {
        next.add(metric);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    setChartReady(false);
    if (!isActive) return;
    const t = setTimeout(() => setChartReady(true), 600);
    return () => clearTimeout(t);
  }, [isActive]);

  // Find max value for chart scaling
  const allValues = MOCK_CHART_DATA.flatMap(d => [d.baptisms, d.marriages, d.funerals]);
  const maxVal = Math.max(...allValues);

  return (
    <div className="h-full flex flex-col">
      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {isActive && MOCK_KPIS.map((kpi, i) => (
          <KPICard key={kpi.label} kpi={kpi} index={i} isActive={isActive} />
        ))}
      </div>

      {/* Chart area */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg border border-[#f3f4f6] dark:border-gray-700 p-4 shadow-sm">
        {/* Chart header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <BarChart3 size={14} className="text-[#6a7282] dark:text-gray-500" />
            <span className="font-['Inter'] text-[12px] font-medium text-[#2d1b4e] dark:text-gray-200">Records by Year</span>
          </div>
          <div className="flex gap-1">
            {METRIC_OPTIONS.map(m => (
              <button
                key={m.key}
                onClick={() => toggleMetric(m.key)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-['Inter'] font-medium transition-all duration-200 ${
                  activeMetrics.has(m.key)
                    ? 'bg-[rgba(45,27,78,0.08)] dark:bg-[rgba(212,175,55,0.15)] text-[#2d1b4e] dark:text-[#d4af37]'
                    : 'text-[#9ca3af] dark:text-gray-600 hover:text-[#6a7282] dark:hover:text-gray-500'
                }`}
              >
                <span className={`w-2 h-2 rounded-sm ${CHART_COLORS[m.key].legend} ${activeMetrics.has(m.key) ? 'opacity-100' : 'opacity-30'}`} />
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bar chart */}
        <div className="flex items-end gap-1 h-28">
          {MOCK_CHART_DATA.map((point, i) => (
            <div key={point.year} className="flex-1 flex flex-col items-center gap-0.5 h-full justify-end">
              <div className="flex items-end gap-px w-full h-full">
                {(['baptisms', 'marriages', 'funerals'] as const).map(metric => (
                  activeMetrics.has(metric) && (
                    <motion.div
                      key={metric}
                      className={`flex-1 ${CHART_COLORS[metric].bar} rounded-t-sm`}
                      initial={{ height: 0 }}
                      animate={chartReady ? { height: `${(point[metric] / maxVal) * 100}%` } : { height: 0 }}
                      transition={{ duration: 0.6, delay: i * 0.08, ease: 'easeOut' }}
                    />
                  )
                ))}
              </div>
              <span className="text-[9px] font-['Inter'] text-[#9ca3af] dark:text-gray-600 mt-1">{point.year.slice(2)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DemoStepAnalytics;
