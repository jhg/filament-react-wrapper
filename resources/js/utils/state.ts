/**
 * Shared state helpers used by all state-manager implementations.
 */

export type StateRecord = Record<string, unknown>;
export type StateSubscriber = (value: unknown) => void;
export type StateSubscribers = Map<string, Set<StateSubscriber>>;

export function isStateRecord(value: unknown): value is StateRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getNestedValue<T = unknown>(obj: unknown, path: string): T | undefined {
  if (!path) return obj as T;
  if (!isStateRecord(obj)) return undefined;

  let current: unknown = obj;
  for (const key of path.split('.')) {
    if (!key || !isStateRecord(current) || !(key in current)) return undefined;
    current = current[key];
  }

  return current as T;
}

export function setNestedValue(obj: StateRecord, path: string, value: unknown): StateRecord {
  if (!path) return isStateRecord(value) ? value : { value };

  const result: StateRecord = { ...obj };
  const keys = path.split('.').filter(Boolean);
  if (keys.length === 0) return result;

  let current = result;
  for (const key of keys.slice(0, -1)) {
    const existing = current[key];
    current[key] = isStateRecord(existing) ? { ...existing } : {};
    current = current[key] as StateRecord;
  }

  const lastKey = keys[keys.length - 1];
  if (lastKey) current[lastKey] = value;
  return result;
}

export function notifySubscribers(
  subscribers: StateSubscribers,
  state: StateRecord,
  path: string,
  value: unknown,
  onError: (error: unknown, subscriberPath: string) => void = () => undefined,
  includeParents = true
): void {
  const paths = [path];
  const parts = path.split('.');
  if (includeParents) {
    for (let index = parts.length - 1; index > 0; index -= 1) {
      paths.push(parts.slice(0, index).join('.'));
    }
  }

  for (const subscriberPath of paths) {
    const callbacks = subscribers.get(subscriberPath);
    if (!callbacks) continue;

    const nextValue = subscriberPath === path ? value : getNestedValue(state, subscriberPath);
    callbacks.forEach(callback => {
      try {
        callback(nextValue);
      } catch (error) {
        onError(error, subscriberPath);
      }
    });
  }
}
