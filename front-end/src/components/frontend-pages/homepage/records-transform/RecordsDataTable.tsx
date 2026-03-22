import { ReactNode } from 'react';
import { motion } from 'framer-motion';

export interface Column<T> {
  key: string;
  label: string;
  render: (row: T, index: number) => ReactNode;
  className?: string;
}

interface RecordsDataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T, index: number) => string;
  delay?: number;
}

export function RecordsDataTable<T>({ columns, data, rowKey, delay = 0.1 }: RecordsDataTableProps<T>) {
  return (
    <motion.div
      className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay }}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`text-left py-3 px-4 text-gray-500 dark:text-gray-400 text-xs tracking-wider uppercase font-['Inter'] ${col.className || ''}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <motion.tr
                key={rowKey(row, i)}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (delay + 0.1) + i * 0.06, duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                className={i % 2 === 0 ? 'bg-gray-50/60 dark:bg-white/[0.02]' : ''}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`py-3 px-4 text-sm font-['Inter'] ${col.className || ''}`}>
                    {col.render(row, i)}
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
