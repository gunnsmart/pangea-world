
import { WorldSnapshot } from './types';

export const WORKER_PROTOCOL_VERSION = '1.1.0';

export enum WorkerMessageType {
  INIT = 'INIT',
  SET_SPEED = 'SET_SPEED',
  SET_PAUSED = 'SET_PAUSED',
  RESET = 'RESET',
  STOP = 'STOP',
  CLEAR_HISTORY = 'CLEAR_HISTORY',
  INTERVENTION = 'INTERVENTION',
  SET_FALLBACK_MODE = 'SET_FALLBACK_MODE',
  SNAPSHOT = 'SNAPSHOT',
  HISTORY_EVENTS = 'HISTORY_EVENTS',
  ERROR = 'ERROR',
  REPLAY_RECORD = 'REPLAY_RECORD',
  START_REPLAY = 'START_REPLAY',
  SET_LOCKSTEP = 'SET_LOCKSTEP',
}

export type WorkerMessageTypeUnion = keyof typeof WorkerMessageType;

export interface WorkerMessage<T = any> {
  version: string;
  type: WorkerMessageType | string;
  payload?: T;
  timestamp: number;
}

// Specific Payload Types
export interface InitPayload {
  width: number;
  height: number;
  seed?: number;
}

export interface SnapshotPayload extends WorldSnapshot {
  stepCount: number;
  isDelta: boolean;
  kpis?: any;
}

export interface ReplayFrame {
  step: number;
  dt: number;
  interventions: any[];
}

export interface ReplayPayload {
  seed: number;
  actionLog: { step: number, type: string, payload?: any }[];
}
