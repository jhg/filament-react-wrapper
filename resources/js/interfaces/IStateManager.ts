/**
 * State Manager Interface - defines contract for state management
 * Following Interface Segregation Principle
 */

export type IStateManagerState = Record<string, unknown>;

export interface IStateAction {
  type: 'SET_STATE' | 'UPDATE_STATE' | 'RESET_STATE' | 'BATCH_UPDATE';
  payload: unknown;
  path?: string;
}

export interface IStateManager {
  setState(path: string, value: unknown): void;
  updateState(path: string, updater: (current: unknown) => unknown): void;
  getState(path: string): unknown;
  resetState(newState?: IStateManagerState): void;
  batchUpdate(updates: Array<{ path: string; value: unknown }>): void;
  subscribe(path: string, callback: (value: unknown) => void): () => void;
}

export interface IStateSubscriber {
  path: string;
  callback: (value: unknown) => void;
  priority?: number;
}

export interface IStateValidator {
  validate(path: string, value: unknown): boolean;
  getValidationErrors(path: string, value: unknown): string[];
}

export interface IStatePersistence {
  save(key: string, state: unknown): Promise<void>;
  load(key: string): Promise<unknown>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}
