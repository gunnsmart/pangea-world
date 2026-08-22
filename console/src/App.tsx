
import React, { useState, Suspense, useEffect } from 'react';
import { EnvironmentTab } from './features/environment/EnvironmentTab';
import { AgentsTab } from './features/agents/AgentsTab';
import { CraftingTab } from './features/crafting/CraftingTab';
import { NeuralTab } from './features/neural/NeuralTab';
import { LogsTab } from './features/logs/LogsTab';
import { useUIStore } from './store/useUIStore';
import { useSimulationStore } from './store/useSimulationStore';
import { useSimulationWorker } from './store/useSimulationWorker';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause,
  ChevronLeft,
  Server,
  Zap
} from 'lucide-react';
import { checkBackendConnection, checkSupabaseConnection } from './lib/supabase';

// Lazy components
// const LoreModal = React.lazy(() => import('./components/LoreModal'));

export default function App() {
  const { activeTab, setActiveTab, showLore, setShowLore, selectedLore, setSelectedLore } = useUIStore();
  const { snapshot, isPaused, setIsPaused } = useSimulationStore();
  const [showSplash, setShowSplash] = useState(true);
  const [backendStatus, setBackendStatus] = useState<{ success: boolean; data?: any; message?: string }>({ success: false });
  const [supabaseStatus, setSupabaseStatus] = useState<{ success: boolean; message?: string }>({ success: false });

  const { vitalityHistory, hormoneHistory, neuralInsights, timeline, clearLogs } = useSimulationWorker();

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2500);
    
    const checkConnections = async () => {
      const bStatus = await checkBackendConnection();
      const sStatus = await checkSupabaseConnection();
      setBackendStatus(bStatus);
      setSupabaseStatus(sStatus);
    };
    checkConnections();

    return () => clearTimeout(timer);
  }, []);

  const navigationItems = [
    { id: 'environment', label: 'World', icon: '🌍' },
    { id: 'agents', label: 'Agents', icon: '👤' },
    { id: 'neural', label: 'Neural', icon: '🧠' },
    { id: 'crafting', label: 'Craft', icon: '⚒' },
    { id: 'logs', label: 'Logs', icon: '📜' },
  ];

  if (showSplash || !snapshot) {
    return (
      <div className="fixed inset-0 bg-background z-[999] flex flex-col items-center justify-center gap-8 p-12 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,212,255,0.05)_0%,transparent_70%)]" />
        <div className="relative mb-6">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute -inset-10 rounded-full border border-primary/10 border-t-primary/40"
          />
          <svg width="72" height="72" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r="26" fill="none" stroke="var(--color-primary)" strokeWidth="0.5" className="opacity-20"/>
            <circle cx="28" cy="28" r="18" fill="none" stroke="var(--color-primary)" strokeWidth="0.5" className="opacity-40"/>
            <motion.circle 
              animate={{ scale: [1, 1.2, 1] }} 
              transition={{ duration: 2, repeat: Infinity }}
              cx="28" cy="18" r="5" fill="var(--color-primary)" 
            />
            <line x1="28" y1="23" x2="20" y2="37" stroke="var(--color-primary)" strokeWidth="1.5"/>
            <line x1="28" y1="23" x2="36" y2="37" stroke="var(--color-primary)" strokeWidth="1.5"/>
            <circle cx="20" cy="38" r="4" fill="var(--color-secondary)"/>
            <circle cx="36" cy="38" r="4" fill="var(--color-tertiary)"/>
          </svg>
        </div>
        <div className="flex flex-col items-center gap-1">
          <h1 className="text-3xl font-headline font-black text-primary tracking-[0.4em] shadow-neon-small">PANGEA_OS</h1>
          <span className="text-[10px] font-mono text-text-dark tracking-[0.4em] uppercase text-center block max-w-xs">NEURAL COMMAND & BIOSPHERE CONTROL</span>
        </div>
        <div className="w-64 h-[1px] bg-border-dim rounded-full overflow-hidden relative">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 2.2, ease: "easeInOut" }}
            className="h-full bg-primary shadow-neon"
          />
        </div>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[10px] font-mono text-primary/60 tracking-[0.3em] uppercase h-4"
        >
          {!snapshot ? "INITIALIZING NEURAL LINK..." : "BOOT SEQUENCE COMPLETE"}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-[#020508] text-text flex flex-col items-center justify-center overflow-hidden relative selection:bg-primary/20">
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-[5%] left-1/4 w-[60%] h-[60%] bg-primary/5 blur-[120px] rounded-full animate-pulse-slow" />
        <div className="absolute bottom-[5%] right-1/4 w-[60%] h-[60%] bg-tertiary/5 blur-[120px] rounded-full animate-pulse-slow" />
      </div>

      <div className="w-full max-w-[480px] h-full sm:h-[880px] bg-background border-x border-border shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col relative z-20 sm:rounded-t-[2.5rem] overflow-hidden">
        <header className="h-16 shrink-0 bg-surface border-b border-border flex items-center justify-between px-5">
          <div className="flex items-center gap-3">
             <svg width="32" height="32" viewBox="0 0 26 26" className="drop-shadow-[0_0_5px_rgba(0,212,255,0.4)]">
                <circle cx="13" cy="13" r="12" fill="none" stroke="var(--color-primary)" strokeWidth="0.5" className="opacity-30"/>
                <circle cx="13" cy="9" r="3.5" fill="var(--color-primary)"/>
                <line x1="13" y1="12.5" x2="9" y2="20" stroke="var(--color-primary)" strokeWidth="1"/>
                <line x1="13" y1="12.5" x2="17" y2="20" stroke="var(--color-primary)" strokeWidth="1"/>
                <circle cx="9" cy="21" r="2.8" fill="var(--color-secondary)"/>
                <circle cx="17" cy="21" r="2.8" fill="var(--color-tertiary)"/>
             </svg>
             <div className="flex flex-col">
                <h2 className="text-sm font-headline font-black text-primary tracking-[0.2em] leading-none mb-1">PANGEA_OS</h2>
                <span className="text-[8px] font-mono text-text-dark tracking-tighter uppercase leading-none">NEURAL CMD & BIOSPHERE CTRL</span>
             </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex flex-col items-end">
                <div className="flex items-center gap-3">
                   <div className="flex items-center gap-1">
                      <span className="text-[10px] font-mono text-primary leading-none">{snapshot.humans.length}👤</span>
                   </div>
                   <div className="flex items-center gap-1">
                      <span className="text-[10px] font-mono text-secondary leading-none">{snapshot.animalCount}🐾</span>
                   </div>
                   <div className="w-1.5 h-1.5 rounded-full bg-secondary shadow-neon-small animate-pulse" />
                   <span className="text-[10px] font-mono text-secondary tracking-tighter leading-none">📍 Christmas Island</span>
                </div>
                <div className="text-[8px] font-mono text-text-dark leading-none mt-1.5 uppercase">
                   T_Scale 1:2 · {snapshot.day}D {snapshot.time}:{snapshot.minute.toString().padStart(2, '0')}
                </div>
             </div>
             <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5" title={backendStatus.success ? `Backend Online (v${backendStatus.data?.version})` : 'Backend Offline'}>
                  <Server size={10} className={cn(backendStatus.success ? "text-secondary animate-pulse" : "text-error opacity-50")} />
                </div>
                <div className="flex items-center gap-1.5" title={supabaseStatus.success ? 'Supabase Connected' : supabaseStatus.message}>
                  <Zap size={10} className={cn(supabaseStatus.success ? "text-warning" : "text-error opacity-50")} />
                </div>
                <div className="badge badge-error border-none bg-error/10 px-2 py-1 animate-pulse">● LIVE</div>
             </div>
          </div>
        </header>

        <div className="h-10 shrink-0 bg-surface/50 border-b border-border/40 flex items-center justify-between px-6">
           <div className="flex items-center gap-2">
              <button 
                onClick={() => setActiveTab('environment')}
                className="hover:scale-110 transition-transform flex items-center"
              >
                <ChevronLeft size={14} className="text-primary/60" />
              </button>
              <span className="text-[10px] font-headline font-bold text-text-dim uppercase tracking-[0.2em]">
                {navigationItems.find(n => n.id === activeTab)?.label}
              </span>
           </div>
           <div className="flex items-center gap-5">
              <button onClick={() => setIsPaused(!isPaused)} className="hover:scale-110 transition-transform">
                {isPaused ? <Play size={14} className="text-warning fill-current" /> : <Pause size={14} className="text-primary fill-current" />}
              </button>
           </div>
        </div>

        <main className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full overflow-y-auto custom-scrollbar"
            >
              <Suspense fallback={null}>
                {activeTab === 'environment' && <EnvironmentTab snapshot={snapshot} vitalityHistory={vitalityHistory} vitalityIndex={0} />}
                {activeTab === 'agents' && <AgentsTab snapshot={snapshot} neuralInsights={neuralInsights} />}
                {activeTab === 'neural' && <NeuralTab snapshot={snapshot} neuralInsights={neuralInsights} />}
                {activeTab === 'crafting' && <CraftingTab snapshot={snapshot} />}
                {activeTab === 'logs' && <LogsTab snapshot={snapshot} timeline={timeline} onClearLogs={clearLogs} />}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>

        <nav className="h-16 shrink-0 bg-surface border-t border-border flex items-center justify-around px-2 pb-safe nav-blur">
           {navigationItems.map(item => (
             <button
               key={item.id}
               onClick={() => setActiveTab(item.id as any)}
               className={cn(
                 "flex flex-col items-center justify-center gap-1 w-16 transition-all relative group",
                 activeTab === item.id ? "text-primary" : "text-text-dark hover:text-text-dim"
               )}
             >
               {activeTab === item.id && (
                 <motion.div 
                   layoutId="nav-active"
                   className="absolute -top-px left-3 right-3 h-[2px] bg-primary shadow-neon-small"
                 />
               )}
               <span className={cn("text-xl mb-0.5", activeTab === item.id && "drop-shadow-[0_0_8px_rgba(0,212,255,0.5)]")}>
                 {item.icon}
               </span>
               <span className="text-[9px] font-mono tracking-tighter uppercase font-bold">{item.label}</span>
             </button>
           ))}
        </nav>
      </div>

      {/* Lore System Disabled */}
      {/* <Suspense fallback={null}>
        {showLore && (
          <LoreModal 
            onClose={() => setShowLore(false)} 
            selectedLore={selectedLore}
            setSelectedLore={setSelectedLore}
          />
        )}
      </Suspense> */}
    </div>
  );
}
