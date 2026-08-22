import React from 'react';

export function Metric({ label, value, icon, critical }: { label: string, value: string | number, icon?: React.ReactNode, critical?: boolean }) {
  return (
    <div className={`metric-card glass-panel tactical-border p-3 md:p-4 ${critical ? 'border-[var(--danger)]' : ''}`}>
      <div className="flex items-center gap-2 mb-1 md:mb-2">
        {icon}
        <div className="metric-label">{label}</div>
      </div>
      <div className="metric-value glow-text text-sm md:text-base">{value}</div>
    </div>
  );
}
