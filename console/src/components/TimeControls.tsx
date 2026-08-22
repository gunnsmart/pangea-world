import React from 'react';
import { Play, Pause } from 'lucide-react';

export function TimeControls({ isPaused, setIsPaused }: { isPaused: boolean, setIsPaused: (p: boolean) => void }) {
  return (
    <div className="flex bg-[var(--panel)] border border-[var(--border)] p-1 gap-1 rounded-md">
      <button 
        onClick={() => setIsPaused(!isPaused)}
        className={`p-1.5 rounded transition-all ${isPaused ? 'bg-[var(--text)] text-[var(--bg)]' : 'text-[var(--dim)] hover:text-[var(--text)]'}`}
      >
        {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
      </button>
      <div className="px-3 py-1 text-xs font-medium rounded bg-[var(--bg)] text-[var(--text)] flex items-center border border-[var(--border)]">
        Realtime 2x
      </div>
    </div>
  );
}
