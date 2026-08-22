import React from 'react';
import { WorldSnapshot } from '../sim/types';

export function SystemStatusBar({ snapshot }: { snapshot: WorldSnapshot }) {
  return (
    <div className="h-12 bg-[var(--bg)] border-t border-[var(--border)] flex items-center px-4 md:px-6 gap-4 md:gap-8 text-xs font-medium text-[var(--dim)] overflow-hidden shrink-0">
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-1.5 h-1.5 bg-[var(--success)] rounded-full animate-pulse" />
        <span className="text-[var(--text)] hidden xs:inline">System Online</span>
        <span className="text-[var(--text)] xs:hidden">ONL</span>
      </div>
      <div className="h-4 w-[1px] bg-[var(--border)]" />
      <div className="flex items-center gap-2 md:gap-3">
        <span>Temp:</span>
        <span className="text-[var(--text)] w-8 md:w-10">{snapshot.globalTemp.toFixed(1)}°C</span>
      </div>
      <div className="flex items-center gap-2 md:gap-3 hidden sm:flex">
        <span>Pop:</span>
        <span className="text-[var(--text)] w-16 md:w-20">H:{snapshot.humans.length} A:{snapshot.animals.length}</span>
      </div>
      <div className="flex items-center gap-2 md:gap-3">
        <span>Score:</span>
        <span className="text-[var(--text)] w-10 md:w-12">{snapshot.score}</span>
      </div>
      <div className="h-4 w-[1px] bg-[var(--border)] hidden md:block" />
      <div className="flex items-center gap-3 ml-auto hidden lg:flex">
        <span>Weather:</span>
        <span className="text-[var(--text)]">{snapshot.weather}</span>
      </div>
      <div className="flex items-center gap-2 md:gap-3 ml-auto md:ml-0">
        <span>Step:</span>
        <span className="text-[var(--text)] w-12 md:w-16 text-right">{snapshot?.stepCount || 0}</span>
      </div>
    </div>
  );
}
