
export interface Relationship {
  trust: number;     // 0-100
  affinity: number;  // 0-100
  conflict: number;  // 0-100
}

// Defines how different actions affect relationship vectors
export const InteractionMatrix: Record<string, { trust: number; affinity: number; conflict: number }> = {
  'SOCIALIZE': { trust: 0.1, affinity: 0.2, conflict: -0.05 },
  'CRAFT_TOGETHER': { trust: 0.3, affinity: 0.1, conflict: -0.1 },
  'SHARE_FOOD': { trust: 0.5, affinity: 0.2, conflict: -0.1 },
  'MATE': { trust: 0.4, affinity: 1.0, conflict: -0.2 },
  'FIGHT': { trust: -1.0, affinity: -0.5, conflict: 1.0 },
  'IGNORE': { trust: 0, affinity: -0.01, conflict: 0 },
};

export class RelationshipManager {
  static getRelationshipStatus(rel: Relationship): string {
    if (rel.conflict > 60) return 'Rival';
    if (rel.trust > 70 && rel.affinity > 50) return 'Partner';
    if (rel.affinity > 60) return 'Friend';
    return 'Stranger';
  }

  static updateRelationship(current: Relationship | undefined, interactionType: string): Relationship {
    const delta = InteractionMatrix[interactionType] || { trust: 0, affinity: 0, conflict: 0 };
    const rel = current || { trust: 50, affinity: 50, conflict: 0 };
    
    return {
      trust: Math.max(0, Math.min(100, rel.trust + delta.trust)),
      affinity: Math.max(0, Math.min(100, rel.affinity + delta.affinity)),
      conflict: Math.max(0, Math.min(100, rel.conflict + delta.conflict))
    };
  }
}
