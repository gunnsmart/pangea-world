import React from 'react';
import { motion } from 'motion/react';
import { Baby, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EcoBar } from './EcoBar';
import { HumanState, AnimalState, StructureState } from '../sim/types';
import { TRANSLATIONS } from '../i18n';

import { BrainVisualizer } from './BrainVisualizer';

function TraitBar({ label, value, color, invert = false }: { label: string, value: number, color: string, invert?: boolean }) {
  // Normalize value for display (0-100)
  const displayVal = Math.floor(value || 50);
  const percentage = displayVal;
  
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-[11px]">
        <span className="text-[var(--dim)]">{label}</span>
        <span className="text-[var(--text)] font-mono">{displayVal}</span>
      </div>
      <div className="h-2 bg-[var(--bg)] border border-[var(--border)] rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} transition-all duration-500`} 
          style={{ width: `${percentage}%` }} 
        />
      </div>
    </div>
  );
}

export function BiometricHUD({ entity, type, t }: { entity: HumanState | AnimalState | StructureState | null, type: 'animal' | 'structure' | 'human', t: typeof TRANSLATIONS['en'] }) {
  if (!entity) return null;

  if (type === 'human') {
    const human = entity as HumanState;
    return (
      <motion.div 
        initial={{ x: 20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 20, opacity: 0 }}
        className="bg-[var(--panel)] border border-[var(--border)] rounded-xl p-5 w-full relative overflow-hidden shadow-lg"
      >
        <div className="flex justify-between items-start mb-5">
          <div>
            <div className="text-sm text-[var(--dim)] mb-1">Human (Age: {Math.floor(human.age)})</div>
            <div className="text-xl font-medium text-[var(--text)] tracking-tight">{human.name}</div>
          </div>
          <div className={`w-2.5 h-2.5 rounded-full ${human.health > 0 ? 'bg-[var(--success)]' : 'bg-[var(--danger)]'}`} />
        </div>

        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-md p-4 mb-5 italic text-base text-[var(--text)]">
          "{human.thought}"
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <EcoBar label="Health" value={human.health} max={100} color="var(--success)" />
            <EcoBar label="Energy" value={human.energy} max={100} color="var(--accent)" />
            <EcoBar label="Hunger" value={human.hunger} max={100} color="#f59e0b" />
            <EcoBar label="Thirst" value={human.thirst} max={100} color="#3b82f6" />
          </div>
          
          <div className="border-t border-[var(--border)] pt-5">
            <div className="text-sm text-[var(--dim)] mb-4">Expertise</div>
            <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto custom-scrollbar pr-1">
              {Object.entries(human.skills).map(([skill, val]) => (
                <div key={skill} className="flex justify-between items-center bg-[var(--bg)] border border-[var(--border)] px-3 py-2.5 rounded-md">
                  <span className="text-sm text-[var(--dim)] capitalize">{skill}</span>
                  <span className="text-sm font-medium text-[var(--text)]">{Math.floor(Number(val) || 0)}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[var(--bg)] border border-[var(--border)] rounded-md p-4 mb-6">
            <div className="text-sm text-[var(--dim)] mb-1">State of Mind</div>
            <div className="text-[13px] text-[var(--text)] italic leading-relaxed font-serif">
              "{human.thought || 'ข้าไม่ได้คิดอะไรเลย...'}"
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-[var(--bg)] border border-[var(--border)] rounded-md p-4">
              <div className="text-sm text-[var(--dim)] mb-1">Action</div>
              <div className="text-base font-medium text-[var(--text)] capitalize">{human.action}</div>
            </div>
            <div className="bg-[var(--bg)] border border-[var(--border)] rounded-md p-4">
              <div className="text-sm text-[var(--dim)] mb-1">Gender</div>
              <div className="text-base font-medium text-[var(--text)] capitalize">{human.gender === 'm' ? 'Male' : 'Female'}</div>
            </div>
          </div>

          {human.parents && human.parents.length > 0 && (
            <div className="bg-[var(--bg)] border border-[var(--border)] rounded-md p-4 flex items-center gap-4">
              <div className="p-2 bg-amber-500/10 rounded-full">
                <Users className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-[var(--dim)] mb-1">Ancestry</div>
                <div className="text-sm font-medium text-[var(--text)]">
                  {human.parents.map(p => p.name).join(' + ')}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[var(--panel)] rounded-md p-3 text-center border border-[var(--border)]">
              <div className="text-[10px] text-[var(--dim)] uppercase tracking-wider mb-1">Interactions</div>
              <div className="text-lg font-bold text-[var(--text)]">{human.interactionCount || 0}</div>
            </div>
            <div className="bg-[var(--panel)] rounded-md p-3 text-center border border-[var(--border)]">
              <div className="text-[10px] text-[var(--dim)] uppercase tracking-wider mb-1">Heritage</div>
              <div className="text-lg font-bold text-amber-500">{human.generation > 1 ? `Gen ${human.generation}` : 'Ancestral'}</div>
            </div>
            <div className="bg-[var(--panel)] rounded-md p-3 text-center border border-[var(--border)]">
              <div className="text-[10px] text-[var(--dim)] uppercase tracking-wider mb-1">Wisdom</div>
              <div className="text-lg font-bold text-blue-500">{Math.floor((Object.values(human.skills || {}).reduce((a, b) => (Number(a) || 0) + (Number(b) || 0), 0) / 10))}</div>
            </div>
          </div>

          {human.isPregnant && (
            <div className="bg-[var(--bg)] border border-pink-500/30 rounded-md p-4 flex items-center gap-4">
              <div className="p-2 bg-pink-500/10 rounded-full">
                <Baby className="w-5 h-5 text-pink-500" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-pink-500">Gestation Progress</span>
                  <span className="text-xs font-bold text-pink-500">{Math.floor(human.gestationProgress || 0)}%</span>
                </div>
                <div className="h-2 bg-[var(--panel)] rounded-full overflow-hidden border border-pink-500/10">
                  <motion.div 
                    className="h-full bg-pink-500" 
                    initial={{ width: 0 }}
                    animate={{ width: `${human.gestationProgress || 0}%` }}
                    transition={{ type: "spring", stiffness: 50 }}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="border-t border-[var(--border)] pt-5">
            <div className="text-sm text-[var(--dim)] mb-4">Inventory & Tools</div>
            <div className="flex flex-wrap gap-2 mb-4">
              {/* Specialized Tool Display */}
              {human.inventory.items?.filter(i => ['stone_axe', 'wooden_spear', 'basket'].includes(i.id)).map(tool => (
                <div key={tool.id} className="flex items-center gap-2 bg-amber-500/10 text-amber-500 border border-amber-500/30 px-3 py-1.5 rounded-lg text-xs font-bold ring-1 ring-amber-500/20">
                  {tool.id === 'stone_axe' ? '🪓' : tool.id === 'wooden_spear' ? '🏹' : '🧺'} {tool.name}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {/* General Items */}
              {Object.entries(human.inventory).map(([item, count]) => (
                item !== 'items' && (count as number) > 0 && (
                  <div key={item} className="text-[12px] font-medium bg-[var(--bg)] text-[var(--text)] border border-[var(--border)] px-3 py-2 rounded-md">
                    {item}: {(count as number)}
                  </div>
                )
              ))}
              {human.inventory.items?.filter(i => !['stone_axe', 'wooden_spear', 'basket'].includes(i.id)).map((item, idx) => (
                <div key={idx} className="text-[12px] font-medium bg-[var(--bg)] text-[var(--text)] border border-[var(--border)] px-3 py-2 rounded-md">
                  {item.name}
                </div>
              ))}
              {Object.values(human.inventory).every(count => typeof count === 'number' ? count === 0 : (Array.isArray(count) ? count.length === 0 : true)) && (
                <div className="text-sm text-[var(--dim)] italic">Empty</div>
              )}
            </div>
          </div>

          {human.domainKnowledge && human.domainKnowledge.filter(k => k.category === 'recipe').length > 0 && (
            <div className="border-t border-[var(--border)] pt-5">
              <div className="text-sm text-[var(--dim)] mb-4">Discovered Recipes</div>
              <div className="space-y-2">
                {human.domainKnowledge.filter(k => k.category === 'recipe').map((recipe, idx) => (
                  <div key={idx} className="bg-[var(--bg)] border border-blue-500/20 px-3 py-2 rounded-lg group hover:border-blue-500/40 transition-colors">
                    <div className="text-xs font-bold text-blue-400 mb-1 flex justify-between">
                      <span>{recipe.title}</span>
                      <span className="text-[10px] opacity-60">Verified</span>
                    </div>
                    <div className="text-[11px] text-[var(--dim)] leading-tight">
                      {recipe.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {human.signalAssociations && Object.keys(human.signalAssociations).length > 0 && (
            <div className="border-t border-[var(--border)] pt-5">
              <div className="text-sm text-[var(--dim)] mb-4">Learned Symbols</div>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(human.signalAssociations).map(([signal, score]) => (
                  <div key={signal} className="flex flex-col gap-1 bg-[var(--bg)] border border-[var(--border)] px-3 py-2 rounded-md">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-[var(--text)]">"{signal}"</span>
                      <span className={`text-[10px] ${score > 0 ? 'text-[var(--success)]' : (score < 0 ? 'text-[var(--danger)]' : 'text-[var(--dim)]')}`}>
                        {score > 0 ? 'Positive' : (score < 0 ? 'Negative' : 'Neutral')}
                      </span>
                    </div>
                    <div className="h-1 bg-[var(--border)] rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${score > 0 ? 'bg-[var(--success)]' : 'bg-[var(--danger)]'}`} 
                        style={{ 
                          width: `${Math.abs(score) * 100}%`,
                          marginLeft: score < 0 ? '0' : '0' // Simple bar
                        }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-[var(--border)] pt-5">
            <div className="text-sm text-[var(--dim)] mb-4">Biological Systems</div>
            <div className="grid grid-cols-2 gap-x-5 gap-y-4">
              <div className="flex flex-col gap-2">
                <span className="text-[11px] text-[var(--dim)]">Testosterone</span>
                <div className="h-1.5 bg-[var(--bg)] rounded-full overflow-hidden">
                  <div className="h-full bg-blue-400" style={{ width: `${human.hormones.testosterone}%` }} />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[11px] text-[var(--dim)]">Estrogen</span>
                <div className="h-1.5 bg-[var(--bg)] rounded-full overflow-hidden">
                  <div className="h-full bg-pink-400" style={{ width: `${human.hormones.estrogen}%` }} />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[11px] text-[var(--dim)]">Cortisol (Stress)</span>
                <div className="h-1.5 bg-[var(--bg)] rounded-full overflow-hidden">
                  <div className="h-full bg-red-400" style={{ width: `${human.hormones.cortisol}%` }} />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[11px] text-[var(--dim)]">Oxytocin (Bond)</span>
                <div className="h-1.5 bg-[var(--bg)] rounded-full overflow-hidden">
                  <div className="h-full bg-green-400" style={{ width: `${human.hormones.oxytocin}%` }} />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[11px] text-[var(--dim)]">Muscle Mass</span>
                <div className="h-1.5 bg-[var(--bg)] rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500" style={{ width: `${human.muscleMass}%` }} />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[11px] text-[var(--dim)]">Lactic Acid</span>
                <div className="h-1.5 bg-[var(--bg)] rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-400" style={{ width: `${human.muscleFatigue}%` }} />
                </div>
              </div>
            </div>
            
            {human.gender === 'f' && human.knowledge.moonBloodCycle !== undefined && (
              <div className="mt-5 p-3 bg-[var(--bg)] border border-[var(--border)] rounded-md">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[11px] text-[var(--dim)]">Cycle Day {Math.floor(human.knowledge.moonBloodCycle)}</span>
                  <div className="flex gap-2">
                    {human.knowledge.isMoonBloodActive && <Badge className="text-[10px] h-4 bg-red-500/20 text-red-400 border-red-500/30">Active</Badge>}
                    {human.knowledge.isFertile && <Badge className="text-[10px] h-4 bg-green-500/20 text-green-400 border-green-500/30">Fertile</Badge>}
                  </div>
                </div>
                <div className="h-1.5 bg-[var(--panel)] rounded-full overflow-hidden">
                  <div className="h-full bg-pink-500/50" style={{ width: `${(human.knowledge.moonBloodCycle / 28) * 100}%` }} />
                </div>
              </div>
            )}

            {human.knowledge.diseases && human.knowledge.diseases.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {human.knowledge.diseases.map(d => (
                  <Badge key={d} variant="outline" className="text-[10px] h-5 border-red-500/30 text-red-400">⚠️ {d}</Badge>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-[var(--border)] pt-5">
            <div className="text-sm text-[var(--dim)] mb-4 flex justify-between">
              <span>Genetic Potential</span>
              <span className="text-[10px] text-blue-400 font-mono">GEN_{human.generation}</span>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-3">
                <TraitBar label="Physical Strength" value={human.genetics?.strength} color="bg-orange-500" />
                <TraitBar label="Motor Speed" value={human.genetics?.speed} color="bg-blue-400" />
                <TraitBar label="Cognitive IQ" value={human.genetics?.intelligence} color="bg-purple-400" />
                <TraitBar label="Metabolic Rate" value={human.genetics?.metabolism} color="bg-yellow-400" invert />
                <TraitBar label="Bio Immunity" value={human.genetics?.immunity} color="bg-green-400" />
                <TraitBar label="Cold Resistance" value={human.genetics?.coldResistance} color="bg-cyan-400" />
                <TraitBar label="Heat Resistance" value={human.genetics?.heatResistance} color="bg-red-400" />
              </div>
            </div>
          </div>

          {human.statusFlags?.isParticipatingInRitual && (
            <div className="mt-4 p-2 bg-blue-500/20 border border-blue-500/30 rounded flex items-center justify-center gap-2 animate-pulse">
              <span className="text-[10px] text-blue-400 font-bold tracking-tighter">SACRED RITUAL ACTIVE</span>
            </div>
          )}

          <div className="border-t border-[var(--border)] pt-5">
            <div className="text-sm text-[var(--dim)] mb-4 flex justify-between">
              <span>Language & Culture</span>
              <span className="text-[10px] text-blue-400 font-mono">VOCAB_{human.vocabulary?.length || 0}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {human.vocabulary?.slice(0, 10).map(word => (
                <Badge key={word} variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/20">
                  {word}
                </Badge>
              ))}
              {(human.vocabulary?.length || 0) > 10 && <span className="text-[10px] text-[var(--dim)]">+{human.vocabulary!.length - 10} more</span>}
            </div>
          </div>

          <div className="border-t border-[var(--border)] pt-5">
            <div className="text-sm text-[var(--dim)] mb-4">Perception</div>
            <div className="space-y-4 max-h-48 overflow-y-auto custom-scrollbar pr-1">
              {human.perception.visibleEntities.length > 0 ? (
                <div className="flex flex-col gap-3">
                  <div className="text-sm text-[var(--dim)]">Visible</div>
                  {human.perception.visibleEntities.slice(0, 5).map((entityId: string, i: number) => (
                    <div key={i} className="text-sm text-[var(--text)] bg-[var(--bg)] border border-[var(--border)] px-3 py-2.5 rounded-md truncate">
                      👁️ {entityId}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-[var(--dim)] italic">No entities in sight</div>
              )}
              
              {human.perception.heardSounds.length > 0 && (
                <div className="flex flex-col gap-3 mt-4">
                  <div className="text-sm text-[var(--dim)]">Hearing</div>
                  {human.perception.heardSounds.slice(0, 3).map((sound: string, i: number) => (
                    <div key={i} className="text-sm text-[var(--text)] bg-[var(--bg)] border border-[var(--border)] px-3 py-2.5 rounded-md truncate">
                      👂 {sound}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-[var(--border)] pt-5">
            <div className="text-sm text-[var(--dim)] mb-4">Neural Activity</div>
            <div className="h-40 bg-[var(--bg)] border border-[var(--border)] rounded-md overflow-hidden">
              {human.brainState && (
                <BrainVisualizer brainState={human.brainState} />
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (type === 'structure') {
    const structure = entity as StructureState;
    return (
      <motion.div 
        initial={{ x: 20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 20, opacity: 0 }}
        className="bg-[var(--panel)] border border-[var(--border)] rounded-xl p-5 w-full relative overflow-hidden shadow-lg"
      >
        <div className="flex justify-between items-start mb-5">
          <div>
            <div className="text-xs text-[var(--dim)] mb-1">Selected Structure</div>
            <div className="text-lg font-medium text-[var(--text)] tracking-tight capitalize">{structure.type} <span className="text-[var(--dim)] text-xs">#{structure.id.split('_')[1]}</span></div>
          </div>
          <div className={`w-2.5 h-2.5 rounded-full ${structure.health > 0 ? 'bg-[var(--success)]' : 'bg-[var(--danger)]'}`} />
        </div>

        <div className="space-y-5">
          <EcoBar label="Health" value={structure.health} max={structure.maxHealth} color="var(--success)" />
          <EcoBar label="Progress" value={structure.progress} max={100} color="var(--accent)" />
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[var(--bg)] border border-[var(--border)] rounded-md p-3">
              <div className="text-xs text-[var(--dim)] mb-1">Defense</div>
              <div className="text-sm font-medium text-[var(--text)]">{structure.defenseBonus}</div>
            </div>
            <div className="bg-[var(--bg)] border border-[var(--border)] rounded-md p-3">
              <div className="text-xs text-[var(--dim)] mb-1">Capacity</div>
              <div className="text-sm font-medium text-[var(--text)]">{structure.capacity}</div>
            </div>
            <div className="bg-[var(--bg)] border border-[var(--border)] rounded-md p-3">
              <div className="text-xs text-[var(--dim)] mb-1">Flammability</div>
              <div className="text-sm font-medium text-[var(--text)]">{structure.flammability}</div>
            </div>
            <div className="bg-[var(--bg)] border border-[var(--border)] rounded-md p-3">
              <div className="text-xs text-[var(--dim)] mb-1">Insulation</div>
              <div className="text-sm font-medium text-[var(--text)]">{structure.insulation}</div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  const animal = entity as AnimalState;
  const gestationProgress = animal.isPregnant ? animal.gestationProgress : 0;

  return (
    <motion.div 
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 20, opacity: 0 }}
      className="bg-[var(--panel)] border border-[var(--border)] rounded-xl p-5 w-full relative overflow-hidden shadow-lg"
    >
      <div className="flex justify-between items-start mb-5">
        <div>
          <div className="text-xs text-[var(--dim)] mb-1 capitalize">{t.stats.selected}</div>
          <div className="text-lg font-medium text-[var(--text)] tracking-tight capitalize">{animal.species} <span className="text-[var(--dim)] text-xs">#{animal.id.split('_')[1]}</span></div>
        </div>
        <div className={`w-2.5 h-2.5 rounded-full ${animal.health > 0 ? 'bg-[var(--success)]' : 'bg-[var(--danger)]'}`} />
      </div>

      <div className="space-y-5">
        <EcoBar label={t.stats.health} value={animal.health} max={100} color="var(--success)" />
        <EcoBar label="Energy" value={animal.energy} max={100} color="var(--accent)" />
        <EcoBar label="Hunger" value={animal.hunger} max={100} color="#f59e0b" />
        <EcoBar label="Thirst" value={animal.thirst} max={100} color="#3b82f6" />
        
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[var(--bg)] border border-[var(--border)] rounded-md p-3">
            <div className="text-xs text-[var(--dim)] mb-1 capitalize">{t.stats.age}</div>
            <div className="text-sm font-medium text-[var(--text)]">{Math.floor(animal.age)}h</div>
          </div>
          <div className="bg-[var(--bg)] border border-[var(--border)] rounded-md p-3">
            <div className="text-xs text-[var(--dim)] mb-1 capitalize">{t.stats.status}</div>
            <div className="text-sm font-medium text-[var(--text)] capitalize">
              {animal.health > 0 ? (
                animal.action === 'hunt' ? 'Hunting' :
                animal.action === 'flee' ? 'Fleeing' :
                animal.action === 'mate' ? 'Mating' :
                animal.action === 'poop' ? 'Excreting' :
                animal.action
              ) : 'Deceased'}
            </div>
          </div>
          <div className="bg-[var(--bg)] border border-[var(--border)] rounded-md p-3">
            <div className="text-xs text-[var(--dim)] mb-1">Gender</div>
            <div className="text-sm font-medium text-[var(--text)] capitalize">{animal.gender}</div>
          </div>
          <div className="bg-[var(--bg)] border border-[var(--border)] rounded-md p-3">
            <div className="text-xs text-[var(--dim)] mb-1">Waste</div>
            <div className="text-sm font-medium text-[var(--text)]">{Math.floor(animal.waste)}%</div>
          </div>
        </div>

        {animal.isPregnant && (
          <div className="bg-[var(--bg)] border border-pink-500/30 rounded-md p-3 flex items-center gap-3">
            <Baby className="w-4 h-4 text-pink-500" />
            <div className="flex-1">
              <div className="text-xs text-pink-500 mb-1 capitalize">{t.stats.gestation}</div>
              <div className="h-1.5 bg-[var(--panel)] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-pink-500 transition-all" 
                  style={{ width: `${gestationProgress}%` }} 
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
