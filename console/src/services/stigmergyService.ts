
import { Point } from '../sim/types';

export type CommunityType = 'physics' | 'chemistry' | 'biology' | 'engineering' | 'survival';

export interface AgentDiscovery {
  id: string;
  authorId: string;
  authorName: string;
  community: CommunityType;
  label: string;
  description: string;
  pos: Point;
  timestamp: number;
  karma: number;
  connections: string[]; // IDs of related discoveries
}

export interface AgentProfile {
  id: string;
  name: string;
  reputation: number;
  discoveriesCount: number;
  karmaReceived: number;
}

class InfiniteEngine {
  private discoveries: AgentDiscovery[] = [];
  private agents: Record<string, AgentProfile> = {};

  registerAgent(id: string, name: string) {
    if (!this.agents[id]) {
      this.agents[id] = {
        id,
        name,
        reputation: 10, // Starting reputation
        discoveriesCount: 0,
        karmaReceived: 0
      };
    }
  }

  postDiscovery(discovery: Omit<AgentDiscovery, 'id' | 'timestamp' | 'karma' | 'connections'>) {
    const id = `disc_${Date.now()}_${this.discoveries.length}`;
    
    // Find connections (stigmergic linking)
    const connections = this.discoveries
      .filter(d => d.community === discovery.community)
      .slice(-3)
      .map(d => d.id);

    const newDiscovery: AgentDiscovery = {
      ...discovery,
      id,
      timestamp: Date.now(),
      karma: 0,
      connections
    };

    this.discoveries.push(newDiscovery);
    
    if (this.agents[discovery.authorId]) {
      this.agents[discovery.authorId].discoveriesCount++;
      this.agents[discovery.authorId].reputation += 5; // Reward for contributing
    }

    console.log(`[Infinite] Agent ${discovery.authorName} posted to ${discovery.community}: ${discovery.label}`);
    return id;
  }

  upvote(discoveryId: string, voterId: string) {
    const discovery = this.discoveries.find(d => d.id === discoveryId);
    if (discovery && discovery.authorId !== voterId) {
      discovery.karma++;
      if (this.agents[discovery.authorId]) {
        this.agents[discovery.authorId].karmaReceived++;
        this.agents[discovery.authorId].reputation += 2;
      }
      return true;
    }
    return false;
  }

  getDiscoveriesNear(pos: Point, radius: number): AgentDiscovery[] {
    return this.discoveries.filter(d => {
      const dist = Math.sqrt(Math.pow(d.pos.x - pos.x, 2) + Math.pow(d.pos.y - pos.y, 2));
      return dist <= radius;
    });
  }

  getAllDiscoveries(): AgentDiscovery[] {
    return [...this.discoveries];
  }

  getAgentProfile(id: string): AgentProfile | undefined {
    return this.agents[id];
  }
}

export const infiniteEngine = new InfiniteEngine();
