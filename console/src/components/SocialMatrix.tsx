
import React from 'react';
import { HumanState } from '../sim/types';

interface SocialMatrixProps {
  humans: HumanState[];
}

export const SocialMatrix: React.FC<SocialMatrixProps> = ({ humans }) => {
  return (
    <div className="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-4 overflow-x-auto">
      <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
        <span className="text-blue-500">◈</span> Neural Relationship Matrix
      </h3>
      
      <table className="w-full text-[10px] border-collapse">
        <thead>
          <tr>
            <th className="p-1 border border-[var(--border)]"></th>
            {humans.map(h => (
              <th key={h.id} className="p-1 border border-[var(--border)] text-center min-w-[50px]">
                {h.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {humans.map(hA => (
            <tr key={hA.id}>
              <td className="p-1 border border-[var(--border)] font-medium">
                {hA.name}
              </td>
              {humans.map(hB => {
                if (hA.id === hB.id) {
                  return <td key={hB.id} className="p-1 border border-[var(--border)] bg-[var(--border)] opacity-20"></td>;
                }
                
                const rel = hA.emotions.relationships[hB.id];
                if (!rel) return <td key={hB.id} className="p-1 border border-[var(--border)] text-center text-[var(--dim)]">-</td>;
                
                // Color based on affinity and trust
                const affinityColor = rel.affinity > 50 ? `rgba(16, 185, 129, ${rel.affinity / 100})` : `rgba(239, 68, 68, ${(100 - rel.affinity) / 100})`;
                
                return (
                  <td 
                    key={hB.id} 
                    className="p-1 border border-[var(--border)] text-center relative group"
                    style={{ backgroundColor: affinityColor }}
                  >
                    <div className="font-bold text-white shadow-sm">
                      {Math.round(rel.affinity)}
                    </div>
                    
                    {/* Tooltip */}
                    <div className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 bg-black text-white p-2 rounded shadow-lg z-50 whitespace-nowrap">
                      <div className="flex flex-col gap-1 items-start">
                        <span>Trust: {Math.round(rel.trust)}</span>
                        <span>Affinity: {Math.round(rel.affinity)}</span>
                        <span>Conflict: {Math.round(rel.conflict)}</span>
                      </div>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      
      <div className="mt-4 flex gap-4 text-[10px] text-[var(--dim)]">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span>High Affinity (Friends/Partners)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500"></div>
          <span>Low Affinity (Rivals)</span>
        </div>
      </div>
    </div>
  );
};
