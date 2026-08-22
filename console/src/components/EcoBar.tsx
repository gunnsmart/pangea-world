import React from 'react';
import { motion } from 'motion/react';

export function EcoBar({ label, value, max, color }: { label: string, value: number, max: number, color: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-end">
        <span className="text-xs text-[var(--dim)]">{label}</span>
        <span className="text-xs font-medium text-[var(--text)]">{Math.floor(value)}</span>
      </div>
      <div className="h-1.5 bg-[var(--bg)] rounded-full overflow-hidden border border-[var(--border)]">
        <motion.div 
          className="h-full rounded-full transition-all" 
          initial={{ width: 0 }}
          animate={{ width: `${(value/max)*100}%` }}
          style={{ 
            backgroundColor: color
          }} 
        />
      </div>
    </div>
  );
}
