import React from 'react';
export default function Logo({ size = 28, label = 'OrthodoxMetrics', ...rest }: any) {
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:8 }} {...rest}>
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.1"/>
        <path d="M12 3v18M3 12h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      <span style={{ fontWeight:700 }}>{label}</span>
    </div>
  );
}
