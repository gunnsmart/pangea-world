
import { Tribe, TribeRole, Point } from '../types';
import { Human } from '../entities/humans/Human';
import { LogManager } from './LogManager';
import { rng } from '../SeededRNG';

export class TribeManager {
  private tribes: Map<string, Tribe> = new Map();
  private logger: LogManager;

  constructor(logger: LogManager) {
    this.logger = logger;
  }

  createTribe(name: string, members: Human[], homePos?: Point): Tribe {
    const tribeId = `tribe_${Date.now()}_${this.tribes.size}`;
    const tribe: Tribe = {
      id: tribeId,
      name,
      memberIds: members.map(m => m.id),
      collectiveKnowledge: [],
      sharedInventory: [],
      customSymbols: {},
      homePos,
      relations: {}
    };

    // Initialize relations with existing tribes
    this.tribes.forEach(otherTribe => {
      tribe.relations[otherTribe.id] = { tribeId: otherTribe.id, trust: 50, hostility: 0, alliance: false, tradeHistory: 0 };
      otherTribe.relations[tribe.id] = { tribeId: tribe.id, trust: 50, hostility: 0, alliance: false, tradeHistory: 0 };
    });

    members.forEach(m => {
      m.state.tribeId = tribeId;
      m.state.tribeRole = TribeRole.MEMBER;
    });

    this.tribes.set(tribeId, tribe);
    this.logger.addWorldLog(`[TRIBE] เผ่า '${name}' ได้ถือกำเนิดขึ้นแล้ว! ณ พิกัด (${homePos?.x}, ${homePos?.y})`);
    return tribe;
  }

  getTribe(id: string): Tribe | undefined {
    return this.tribes.get(id);
  }

  getTribes(): Tribe[] {
    return Array.from(this.tribes.values());
  }

  update(deltaMinutes: number, humans: Human[]) {
    this.tribes.forEach(tribe => {
      // 1. Social Cohesion: Tribe members slowly gain affinity for each other
      // Deterministically happen if cohesion is needed
      this.strengthenInternalBonds(tribe, humans, deltaMinutes);

      // 2. Knowledge Sharing: Experienced members teach others
      this.processKnowledgeSharing(tribe, humans, deltaMinutes);

      // 3. Resource Management: Consolidate shared items
      this.managedSharedInventory(tribe, humans);

      // 4. Diplomacy: Interact with other tribes
      this.processDiplomacy(tribe, deltaMinutes);

      // 5. Rituals: Group activities that boost morale
      this.processRituals(tribe, humans, deltaMinutes);
    });
  }

  private processRituals(tribe: Tribe, humans: Human[], deltaMinutes: number) {
    const members = humans.filter(h => tribe.memberIds.includes(h.id) && h.state.health > 0);
    if (members.length < 3) return;

    // A ritual occurs if 3+ members are clustered together
    // Check for a 'fire' nearby too (symbol of ritual)
    members.forEach(h => {
      const neighbors = members.filter(other => {
        if (h.id === other.id) return false;
        const dx = h.state.pos.x - other.state.pos.x;
        const dy = h.state.pos.y - other.state.pos.y;
        return (dx*dx + dy*dy) < 25; // 5 units radius
      });

      if (neighbors.length >= 2) {
        // Participate in ritual effect
        h.state.statusFlags.isParticipatingInRitual = true;
        h.state.emotions.joy = Math.min(100, h.state.emotions.joy + 0.1 * deltaMinutes);
        h.state.stress = Math.max(0, h.state.stress - 0.2 * deltaMinutes);
        h.state.hormones.oxytocin = Math.min(100, h.state.hormones.oxytocin + 0.5 * deltaMinutes);
        
        if (rng.next() < 0.001 * deltaMinutes) {
          h.state.thought = "เรากำลังเต้นรำรอบกองไฟ... จิตวิญญาณของเผ่ารวมเป็นหนึ่งเดียว";
        }

        // Language discovery during rituals
        neighbors.forEach(neighbor => {
          if (neighbor.state.vocabulary.length > h.state.vocabulary.length) {
            const newWord = neighbor.state.vocabulary.find(w => !h.state.vocabulary.includes(w));
            if (newWord && rng.next() < 0.05 * deltaMinutes) {
              h.state.vocabulary.push(newWord);
              this.logger.addHumanLog(h.id, `[LANGUAGE] ฉันได้เรียนรู้คำว่า '${newWord}' จาก ${neighbor.state.name}`);
            }
          }
        });
      } else {
        h.state.statusFlags.isParticipatingInRitual = false;
      }
    });
  }

  private processDiplomacy(tribe: Tribe, deltaMinutes: number) {
    const otherTribes = this.getTribes().filter(t => t.id !== tribe.id);
    otherTribes.forEach(other => {
      const rel = tribe.relations[other.id];
      if (!rel) return;

      // Natural trust decay if no interaction
      rel.trust = Math.max(0, rel.trust - 0.001 * deltaMinutes);

      // Deterministic diplomacy outcomes
      if (rel.trust > 80 && rel.hostility < 10 && !rel.alliance) {
        rel.alliance = true;
        this.logger.addWorldLog(`[DIPLOMACY] ตำนานบทใหม่! เผ่า '${tribe.name}' และ '${other.name}' ได้ประกาศเป็นพันธมิตรกันอย่างเป็นทางการ!`);
      }
    });
  }

  private strengthenInternalBonds(tribe: Tribe, humans: Human[], deltaMinutes: number) {
    tribe.memberIds.forEach(idA => {
      const hA = humans.find(h => h.id === idA);
      if (!hA) return;

      tribe.memberIds.forEach(idB => {
        if (idA === idB) return;
        const rel = hA.state.emotions.relationships[idB] || { trust: 50, affinity: 50, conflict: 0 };
        rel.affinity = Math.min(100, rel.affinity + 0.01 * deltaMinutes);
        rel.trust = Math.min(100, rel.trust + 0.005 * deltaMinutes);
        hA.state.emotions.relationships[idB] = rel;
      });
    });
  }

  private processKnowledgeSharing(tribe: Tribe, humans: Human[], deltaMinutes: number) {
    // Collect all unique knowledge from members into collective pool
    tribe.memberIds.forEach(mId => {
      const h = humans.find(hu => hu.id === mId);
      if (h) {
        h.state.domainKnowledge.forEach(k => {
          if (!tribe.collectiveKnowledge.some(tk => tk.title === k.title)) {
            tribe.collectiveKnowledge.push({ ...k, source: 'taught' });
          }
        });
      }
    });

    // Deterministic learning from collective pool
    tribe.memberIds.forEach(mId => {
      const h = humans.find(hu => hu.id === mId);
      if (h && tribe.collectiveKnowledge.length > 0) {
        // Selection based on history count
        const kIndex = (h.state.domainKnowledge.length) % tribe.collectiveKnowledge.length;
        const targetK = tribe.collectiveKnowledge[kIndex];
        // Only learn if not already known or confidence is low
        const existing = h.state.domainKnowledge.find(hk => hk.title === targetK.title);
        if (!existing) {
          h.state.domainKnowledge.push({ ...targetK, source: 'taught', confidence: 0.2 });
          this.logger.addHumanLog(h.id, `[LEARNING] ฉันได้รับความรู้เรื่อง '${targetK.title}' จากเผ่า`);
        } else if (existing.confidence < 0.8) {
          existing.confidence += 0.001 * deltaMinutes;
        }
      }
    });
  }

  private managedSharedInventory(tribe: Tribe, humans: Human[]) {
    // This could involve moving items to a central location if we implement Storage structures
    // For now, it's a virtual pool
  }
}
