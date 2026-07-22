/**
 * State Manager Service - implements IStateManager interface
 * Following Liskov Substitution Principle
 */

import {
  IStateManager,
  IStateManagerState,
  IStateValidator,
  IStatePersistence,
} from '../interfaces/IStateManager';
import {
  getNestedValue,
  isStateRecord,
  notifySubscribers,
  setNestedValue,
  type StateSubscribers,
} from '../utils/state';

export abstract class BaseStateManager implements IStateManager {
  protected state: IStateManagerState = {};
  protected subscribers: StateSubscribers = new Map();

  abstract setState(path: string, value: unknown): void;
  abstract updateState(path: string, updater: (current: unknown) => unknown): void;
  abstract getState(path: string): unknown;
  abstract resetState(newState?: IStateManagerState): void;
  abstract batchUpdate(updates: Array<{ path: string; value: unknown }>): void;

  subscribe(path: string, callback: (value: unknown) => void): () => void {
    if (!this.subscribers.has(path)) {
      this.subscribers.set(path, new Set());
    }

    const subscribers = this.subscribers.get(path)!;
    subscribers.add(callback);

    // Immediately notify with current value
    try {
      const currentValue = getNestedValue(this.state, path);
      callback(currentValue);
    } catch (error) {
      console.error(`Error in immediate callback for path ${path}:`, error);
    }

    // Return unsubscribe function
    return () => {
      const pathSubscribers = this.subscribers.get(path);
      if (pathSubscribers) {
        pathSubscribers.delete(callback);
        if (pathSubscribers.size === 0) {
          this.subscribers.delete(path);
        }
      }
    };
  }
}

export class StandardStateManager extends BaseStateManager {
  setState(path: string, value: unknown): void {
    if (!path) return;

    this.state = setNestedValue(this.state, path, value);
    notifySubscribers(this.subscribers, this.state, path, value, (error, subscriberPath) => {
      console.error(`Error in subscriber callback for path ${subscriberPath}:`, error);
    });
  }

  updateState(path: string, updater: (current: unknown) => unknown): void {
    if (!path || typeof updater !== 'function') return;

    const currentValue = getNestedValue(this.state, path);
    const newValue = updater(currentValue);
    this.setState(path, newValue);
  }

  getState(path: string): unknown {
    return getNestedValue(this.state, path);
  }

  resetState(newState: IStateManagerState = {}): void {
    this.state = { ...newState };

    // Notify all subscribers of reset
    this.subscribers.forEach((_, path) => {
      const value = getNestedValue(this.state, path);
      notifySubscribers(
        this.subscribers,
        this.state,
        path,
        value,
        (error, subscriberPath) => {
          console.error(`Error in subscriber callback for path ${subscriberPath}:`, error);
        },
        false
      );
    });
  }

  batchUpdate(updates: Array<{ path: string; value: unknown }>): void {
    if (!Array.isArray(updates) || updates.length === 0) return;

    let newState = { ...this.state };
    const notificationPaths = new Set<string>();

    updates.forEach(({ path, value }) => {
      if (path) {
        newState = setNestedValue(newState, path, value);
        notificationPaths.add(path);
      }
    });

    this.state = newState;

    // Notify all affected paths
    notificationPaths.forEach(path => {
      const value = getNestedValue(this.state, path);
      notifySubscribers(this.subscribers, this.state, path, value, (error, subscriberPath) => {
        console.error(`Error in subscriber callback for path ${subscriberPath}:`, error);
      });
    });
  }
}

export class ValidatedStateManager extends StandardStateManager {
  constructor(private validator?: IStateValidator) {
    super();
  }

  setState(path: string, value: unknown): void {
    if (this.validator && !this.validator.validate(path, value)) {
      const errors = this.validator.getValidationErrors(path, value);
      console.error(`Validation failed for path ${path}:`, errors);
      return;
    }

    super.setState(path, value);
  }

  updateState(path: string, updater: (current: unknown) => unknown): void {
    const currentValue = getNestedValue(this.state, path);
    const newValue = updater(currentValue);

    if (this.validator && !this.validator.validate(path, newValue)) {
      const errors = this.validator.getValidationErrors(path, newValue);
      console.error(`Validation failed for path ${path}:`, errors);
      return;
    }

    super.setState(path, newValue);
  }
}

export class PersistentStateManager extends StandardStateManager {
  constructor(
    private persistence: IStatePersistence,
    private persistenceKey: string = 'app-state'
  ) {
    super();
    this.loadFromPersistence();
  }

  async setState(path: string, value: unknown): Promise<void> {
    super.setState(path, value);
    await this.saveToPersistence();
  }

  async resetState(newState: IStateManagerState = {}): Promise<void> {
    super.resetState(newState);
    await this.saveToPersistence();
  }

  async batchUpdate(updates: Array<{ path: string; value: unknown }>): Promise<void> {
    super.batchUpdate(updates);
    await this.saveToPersistence();
  }

  private async loadFromPersistence(): Promise<void> {
    try {
      const persistedState = await this.persistence.load(this.persistenceKey);
      if (isStateRecord(persistedState)) {
        this.state = persistedState;
      }
    } catch (error) {
      console.error('Error loading persisted state:', error);
    }
  }

  private async saveToPersistence(): Promise<void> {
    try {
      await this.persistence.save(this.persistenceKey, this.state);
    } catch (error) {
      console.error('Error saving state to persistence:', error);
    }
  }

  async clearPersistence(): Promise<void> {
    try {
      await this.persistence.remove(this.persistenceKey);
    } catch (error) {
      console.error('Error clearing persisted state:', error);
    }
  }
}
