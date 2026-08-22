
import { useEffect, useRef, useState, useCallback } from 'react';
import { WorldSnapshot } from '../sim/types';
import { useSimulationStore } from './useSimulationStore';
import { neuralKnowledgeService } from '../sim/NeuralKnowledgeService';

import { HistoryService, TimelineEvent } from '../services/historyService';
import {
  adaptPythonSnapshot,
  createRemoteSession,
  connectWorldSocket,
  sendCommand,
} from '../lib/pangeaBridge';

export function useSimulationWorker() {
  const setSnapshot = useSimulationStore(state => state.setSnapshot);
  const isPaused = useSimulationStore(state => state.isPaused);

  const [vitalityHistory, setVitalityHistory] = useState<{ time: number, value: number }[]>([]);
  const [hormoneHistory, setHormoneHistory] = useState<Record<string, { time: number, cortisol: number, oxytocin: number }[]>>({ Adam: [], Eve: [] });
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const lastArchivedDayRef = useRef<number>(-1);
  const sessionIdRef = useRef<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const lastSimTimeRef = useRef<number>(-1);
  const reconnectTimerRef = useRef<number | null>(null);
  const closedRef = useRef<boolean>(false);

  useEffect(() => {
    HistoryService.getHistory().then(setTimeline);
    neuralKnowledgeService.init().catch(err => console.error('UI: Failed to init Knowledge Service:', err));
  }, []);

  const handleSnapshot = useCallback((data: WorldSnapshot) => {
    setSnapshot(data);

    if (data.day > 0 && data.day !== lastArchivedDayRef.current) {
      lastArchivedDayRef.current = data.day;
      HistoryService.saveSnapshot(data.day, data).catch(err => {
        console.error(`[CRITICAL] Failed to archive Day ${data.day}:`, err);
      });
    }

    const simTime = (data.day * 1440 + data.time * 60 + data.minute);
    if (simTime !== lastSimTimeRef.current) {
      lastSimTimeRef.current = simTime;
      const vIndex = (data.humans || []).reduce((acc, h) => acc + h.health, 0) / (data.humans?.length || 1);
      setVitalityHistory(prev => [...prev, { time: simTime, value: vIndex }].slice(-100));
      setHormoneHistory(prev => {
        const next = { ...prev };
        data.humans?.forEach(h => {
          if (h.name === 'Adam' || h.name === 'Eve') {
            next[h.name] = [...(next[h.name] || []), {
              time: simTime,
              cortisol: h.hormones?.cortisol || 0,
              oxytocin: h.hormones?.oxytocin || 0
            }].slice(-50);
          }
        });
        return next;
      });
    }
  }, [setSnapshot]);

  useEffect(() => {
    closedRef.current = false;

    const scheduleReconnect = () => {
      if (closedRef.current) return;
      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = window.setTimeout(connect, 2500);
    };

    const connect = async () => {
      if (closedRef.current) return;
      try {
        if (!sessionIdRef.current) {
          sessionIdRef.current = await createRemoteSession();
        }
        const sid = sessionIdRef.current;
        console.log('[Bridge] Connecting world socket for session', sid);
        wsRef.current = connectWorldSocket(
          sid,
          (raw) => handleSnapshot(adaptPythonSnapshot(raw)),
          () => scheduleReconnect()
        );
      } catch (err) {
        console.error('[Bridge] Failed to establish session:', err);
        scheduleReconnect();
      }
    };

    connect();

    return () => {
      closedRef.current = true;
      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
      sessionIdRef.current = null;
    };
  }, [handleSnapshot]);

  useEffect(() => {
    const sid = sessionIdRef.current;
    if (sid) sendCommand(sid, isPaused ? 'pause' : 'start');
  }, [isPaused]);

  const triggerIntervention = useCallback((type: string) => {
    const sid = sessionIdRef.current;
    if (!sid) return;
    sendCommand(sid, `intervene/${encodeURIComponent(type)}`);
  }, []);

  const resetSimulation = useCallback(() => {
    const sid = sessionIdRef.current;
    lastArchivedDayRef.current = -1;
    setVitalityHistory([]);
    setHormoneHistory({ Adam: [], Eve: [] });
    setTimeline([]);
    setSnapshot(null);
    if (sid) sendCommand(sid, 'reset');
  }, [setSnapshot]);

  const clearLogs = useCallback(async () => {
    setTimeline([]);
    await HistoryService.clearHistory();
    const currentSnapshot = useSimulationStore.getState().snapshot;
    if (currentSnapshot) {
      setSnapshot({ ...currentSnapshot, logs: [], alphaLogs: [], betaLogs: [], historyEvents: [] });
    }
  }, [setSnapshot]);

  const [neuralInsights, setNeuralInsights] = useState<Record<string, string>>({ ADAM: '', EVE: '' });

  useEffect(() => {
    const updateInsights = () => {
      setNeuralInsights({
        ADAM: neuralKnowledgeService.getRandomWisdom('ADAM')?.content || 'Processing neural patterns...',
        EVE: neuralKnowledgeService.getRandomWisdom('EVE')?.content || 'Processing neural patterns...',
      });
    };

    updateInsights();
    const interval = setInterval(updateInsights, 5000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return {
    vitalityHistory,
    hormoneHistory,
    neuralInsights,
    timeline,
    resetSimulation,
    triggerIntervention,
    clearLogs
  };
}
