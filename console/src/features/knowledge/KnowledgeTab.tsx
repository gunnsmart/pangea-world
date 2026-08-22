
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Search, Zap, Cpu } from 'lucide-react';
import { neuralKnowledgeService, NeuralKnowledgeEntry } from '../../sim/NeuralKnowledgeService';
import { cn } from '../../lib/utils';
import { VectorGalaxy } from './VectorGalaxy';

interface KnowledgeTabProps {
  neuralInsights: Record<string, string>;
}

export const KnowledgeTab: React.FC<KnowledgeTabProps> = ({ neuralInsights }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<'ALPHA' | 'BETA'>('ALPHA');
  const [selectedEntry, setSelectedEntry] = useState<NeuralKnowledgeEntry | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'galaxy'>('galaxy');

  const base = neuralKnowledgeService.getBase(selectedAgent);
  
  const searchResults = useMemo(() => {
    if (!searchQuery) return base?.knowledge.slice(0, 20) || [];
    return neuralKnowledgeService.searchByText(selectedAgent, searchQuery, 50).map(r => r.entry);
  }, [base, searchQuery, selectedAgent]);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex-1 flex flex-col gap-6 overflow-hidden pb-20"
    >
      {/* Search Header */}
      <div className="glass rounded-2xl p-4 flex items-center gap-4 border border-primary/20">
        <div className="flex bg-background/50 rounded-lg p-1 border border-white/5">
          {['ALPHA', 'BETA'].map((name) => (
            <button
              key={name}
              onClick={() => setSelectedAgent(name as 'ALPHA' | 'BETA')}
              className={cn(
                "px-4 py-1.5 rounded-md text-[10px] font-headline font-bold transition-all uppercase tracking-widest",
                selectedAgent === name 
                  ? "bg-primary text-background" 
                  : "text-dim hover:text-white"
              )}
            >
              {name}
            </button>
          ))}
        </div>

        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dim" />
          <input 
            type="text"
            placeholder="SEMANTIC_SEARCH_KNOWLEDGE_BASE..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs font-mono focus:outline-none focus:border-primary/50 transition-all"
          />
        </div>

        <div className="flex bg-background/50 rounded-lg p-1 border border-white/5">
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              "px-3 py-1.5 rounded-md text-[10px] font-headline font-bold transition-all uppercase tracking-widest",
              viewMode === 'list' ? "bg-primary/20 text-primary border border-primary/40" : "text-dim"
            )}
          >
            List
          </button>
          <button
            onClick={() => setViewMode('galaxy')}
            className={cn(
              "px-3 py-1.5 rounded-md text-[10px] font-headline font-bold transition-all uppercase tracking-widest",
              viewMode === 'galaxy' ? "bg-primary/20 text-primary border border-primary/40" : "text-dim"
            )}
          >
            Galaxy
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-4 px-4 border-l border-white/10">
          <div className="flex flex-col">
            <span className="text-[8px] font-headline font-bold text-dim uppercase tracking-tighter">Vector_Entries</span>
            <span className="text-xs font-mono font-bold text-primary">{base?.total_entries || 0}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] font-headline font-bold text-dim uppercase tracking-tighter">Dimensions</span>
            <span className="text-xs font-mono font-bold text-tertiary">{base?.vectorDim || 0}D</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {viewMode === 'galaxy' ? (
            <VectorGalaxy 
              entries={searchResults} 
              selectedEntry={selectedEntry} 
              onSelectEntry={setSelectedEntry} 
            />
          ) : (
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-3">
              {searchResults.length > 0 ? searchResults.map((entry, i) => (
                <motion.div
                  key={entry.skill + i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  onClick={() => setSelectedEntry(entry)}
                  className={cn(
                    "glass-panel p-4 rounded-xl border cursor-pointer transition-all hover:bg-primary/5 group",
                    selectedEntry?.skill === entry.skill ? "border-primary/40 bg-primary/10 shadow-neon" : "border-white/5"
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase",
                        entry.domain === 'biology' ? 'bg-tertiary/20 text-tertiary' :
                        entry.domain === 'physics' ? 'bg-primary/20 text-primary' :
                        'bg-accent/20 text-accent'
                      )}>
                        {entry.domain}
                      </span>
                      <h3 className="text-xs font-headline font-bold text-white group-hover:text-primary transition-colors">
                        {entry.skill.split('_').pop()?.substring(0, 40)}...
                      </h3>
                    </div>
                    <div className="text-[9px] font-mono text-dim">
                      {Math.round(entry.confidence * 100)}% Match
                    </div>
                  </div>
                  <p className="text-[11px] text-text/60 line-clamp-2 italic leading-relaxed">
                    "{entry.content}"
                  </p>
                </motion.div>
              )) : (
                <div className="flex flex-col items-center justify-center h-full opacity-20">
                  <div className="text-[10px] font-headline font-bold uppercase tracking-[0.2em]">No records found</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Detail Sidebar */}
        <AnimatePresence mode="wait">
          {selectedEntry ? (
            <motion.div
              key={selectedEntry.skill}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="w-80 glass rounded-2xl p-6 border border-primary/20 flex flex-col gap-6"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-tertiary/10 flex items-center justify-center">
                  <Cpu className="w-5 h-5 text-tertiary" />
                </div>
                <div>
                  <div className="text-[10px] font-headline font-bold text-tertiary uppercase tracking-widest">Neural_Record</div>
                  <h2 className="text-lg font-headline font-bold tracking-tight leading-none uppercase">
                    {selectedEntry.domain}
                  </h2>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-[9px] font-headline font-bold text-dim uppercase tracking-tighter mb-2">Knowledge_Content</div>
                  <div className="glass-lighter p-4 rounded-xl border border-white/5 text-xs italic text-text leading-relaxed">
                    "{selectedEntry.content}"
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="glass-lighter p-3 rounded-xl border border-white/5">
                    <div className="text-[8px] font-headline font-bold text-dim uppercase mb-1">Source</div>
                    <div className="text-[10px] font-mono text-primary font-bold uppercase">{selectedEntry.source}</div>
                  </div>
                  <div className="glass-lighter p-3 rounded-xl border border-white/5">
                    <div className="text-[8px] font-headline font-bold text-dim uppercase mb-1">Type</div>
                    <div className="text-[10px] font-mono text-tertiary font-bold uppercase">{selectedEntry.type}</div>
                  </div>
                </div>

                <div>
                  <div className="text-[9px] font-headline font-bold text-dim uppercase tracking-tighter mb-2">Relational_Tags</div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedEntry.tags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[9px] font-mono text-dim capitalize">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5">
                  <div className="text-[9px] font-headline font-bold text-primary/40 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Zap className="w-3 h-3" />
                    Neural_Network_Context
                  </div>
                  <div className="space-y-2">
                    {selectedEntry.related_knowledge.slice(0, 3).map((rel, i) => (
                      <div key={i} className="text-[9px] font-mono text-dim/60 truncate border-l border-primary/20 pl-2">
                        {rel}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="w-80 glass rounded-2xl p-6 border border-white/5 flex flex-col items-center justify-center text-center opacity-40">
              <BookOpen className="w-12 h-12 text-dim mb-4" />
              <p className="text-[10px] font-headline font-bold uppercase tracking-widest">Select entry to inspect<br/>neural pathway</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Stats */}
      <div className="shrink-0 flex items-center justify-between px-6 py-3 glass rounded-2xl border border-white/5">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <div className="text-[10px] font-headline font-bold text-primary uppercase">Neural_Network_Active</div>
          </div>
          <div className="text-[10px] font-mono text-dim italic">
            "{neuralInsights[selectedAgent] || 'Connecting to Logos...'}"
          </div>
        </div>
        <div className="text-[10px] font-mono text-text/40">
          Latency: <span className="text-tertiary">14ms</span>
        </div>
      </div>
    </motion.div>
  );
};
