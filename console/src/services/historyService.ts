
import { supabase } from '../lib/supabase';

export interface TimelineEvent {
  id: string;
  day: number;
  event_type: 'milestone' | 'time_skip' | 'daily_summary' | 'birth' | 'death' | 'system';
  description: string;
  created_at: string;
  data?: any;
}

export class HistoryService {
  private static localTimeline: TimelineEvent[] = [];
  private static readonly MAX_LOCAL_EVENTS = 100;
  
  // Batching & Debouncing
  private static eventBuffer: TimelineEvent[] = [];
  private static flushTimeout: any = null;
  private static readonly BATCH_INTERVAL_MS = 30000; // 30 seconds
  private static readonly MAX_BATCH_SIZE = 50;

  private static telemetry = {
    writes: 0,
    errors: 0,
    lastError: null as string | null,
    syncStatus: 'idle' as 'idle' | 'syncing' | 'error' | 'buffered'
  };

  static getTelemetry() {
    return { ...this.telemetry };
  }

  private static async withRetry<T>(fn: () => Promise<T>, attempts: number = 3): Promise<T> {
    try {
      this.telemetry.writes++;
      this.telemetry.syncStatus = 'syncing';
      const result = await fn();
      this.telemetry.syncStatus = 'idle';
      return result;
    } catch (err) {
      this.telemetry.errors++;
      this.telemetry.lastError = err instanceof Error ? err.message : String(err);
      if (attempts <= 1) {
        this.telemetry.syncStatus = 'error';
        throw err;
      }
      const delay = Math.pow(2, 4 - attempts) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.withRetry(fn, attempts - 1);
    }
  }

  // Removed static initialization block to ensure environment compatibility
  static async flush() {
    if (this.eventBuffer.length === 0 || !supabase) {
      if (this.eventBuffer.length === 0) this.telemetry.syncStatus = 'idle';
      return;
    }

    const eventsToSync = [...this.eventBuffer];
    this.eventBuffer = []; // Clear buffer early

    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }

    try {
      await this.withRetry(async () => {
        const { error } = await supabase!
          .from('sim_timeline')
          .insert(eventsToSync.map(event => ({
            day: event.day,
            event_type: event.event_type,
            description: event.description,
            data: event.data,
            created_at: event.created_at || new Date().toISOString()
          })));

        if (error) {
          if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.code === '42P01') {
            console.warn('Supabase table sim_timeline not found. Buffered events cleared.');
            return;
          }
          throw error;
        }
      });
      console.log(`[SYSTEM] Synced ${eventsToSync.length} events to Supabase`);
      this.telemetry.syncStatus = 'idle';
    } catch (err) {
      console.error('Batch sync failed, re-buffering events:', err);
      // Put events back in buffer if they aren't too many
      if (this.eventBuffer.length < this.MAX_LOCAL_EVENTS) {
        this.eventBuffer = [...eventsToSync, ...this.eventBuffer].slice(-this.MAX_LOCAL_EVENTS);
      }
      this.telemetry.syncStatus = 'error';
    }
  }

  static async saveEvents(events: TimelineEvent[]) {
    if (events.length === 0) return;
    
    // Always save to local first
    this.localTimeline = [...this.localTimeline, ...events].slice(-this.MAX_LOCAL_EVENTS);
    
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('pangea_timeline', JSON.stringify(this.localTimeline));
      }
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }

    if (!supabase) return;

    // Add to sync buffer
    this.eventBuffer.push(...events);
    this.telemetry.syncStatus = 'buffered';

    // Flush if buffer is too big
    if (this.eventBuffer.length >= this.MAX_BATCH_SIZE) {
      this.flush();
    } else if (!this.flushTimeout) {
      // Otherwise set a debounce timer
      this.flushTimeout = setTimeout(() => this.flush(), this.BATCH_INTERVAL_MS);
    }
  }

  static async saveEvent(event: TimelineEvent) {
    await this.saveEvents([event]);
  }

  static async clearHistory() {
    this.localTimeline = [];
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem('pangea_timeline');
    }
    
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('sim_timeline')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      
      if (error) throw error;
      console.log('[SYSTEM] Remote history cleared');
    } catch (err) {
      console.error('Failed to clear Supabase history:', err);
    }
  }

  static async getHistory() {
    // Load local first
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem('pangea_timeline');
        if (stored) {
          this.localTimeline = JSON.parse(stored).slice(-this.MAX_LOCAL_EVENTS);
        }
      }
    } catch (e) {
      console.warn('Failed to load from localStorage:', e);
    }

    if (!supabase) return this.localTimeline;

    return this.withRetry(async () => {
      const { data, error } = await supabase
        .from('sim_timeline')
        .select('*')
        .order('day', { ascending: false }) // Get latest first
        .limit(this.MAX_LOCAL_EVENTS);

      if (error) {
        if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.code === '42P01') {
          console.warn('Supabase table sim_timeline not found. Returning local storage.');
          return this.localTimeline;
        }
        throw error;
      }
      
      // Reverse to maintain chronological order for components
      return (data || []).reverse();
    }).catch(err => {
      console.error('Failed to fetch from Supabase:', err);
      return this.localTimeline;
    });
  }

  private static snapshotQueue: { day: number, snapshot: any }[] = [];
  private static isSyncingSnapshots = false;

  static async saveSnapshot(day: number, snapshot: any) {
    if (!supabase) {
      console.warn('Supabase not connected. Epoch archiving skipped.');
      return;
    }

    // Queue the snapshot
    this.snapshotQueue.push({ day, snapshot });
    this.telemetry.syncStatus = 'buffered';

    // Start processing queue if not already
    this.processSnapshotQueue();
  }

  private static async processSnapshotQueue() {
    if (this.isSyncingSnapshots || this.snapshotQueue.length === 0 || !supabase) return;

    this.isSyncingSnapshots = true;

    while (this.snapshotQueue.length > 0) {
      const { day, snapshot } = this.snapshotQueue[0];

      try {
        await this.withRetry(async () => {
          const { error } = await supabase!
            .from('sim_snapshots')
            .insert([{
              day,
              snapshot_data: snapshot,
              created_at: new Date().toISOString()
            }]);

          if (error) {
            if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.code === '42P01') {
              console.warn('Supabase table sim_snapshots not found. Snapshot archiving skipped.');
              return;
            }
            throw error;
          }
          console.log(`[SYSTEM] Epoch archived successfully for Day ${day}`);
        });
        
        // Success, remove from queue
        this.snapshotQueue.shift();
      } catch (err) {
        console.error(`Failed to save snapshot for Day ${day}:`, err);
        // If it failed after retries, we might want to skip it or keep it for later.
        // For snapshots, we'll keep it in queue but break the loop for now to avoid death spiral
        break;
      }
    }

    this.isSyncingSnapshots = false;
  }
}
