import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  statePersistenceService,
  type StatePersistenceConfig,
} from '../services/StatePersistenceService';

export function usePersistedState<T>(
  key: string,
  defaultValue: T,
  config?: Partial<StatePersistenceConfig>
): [T, (value: T | ((prev: T) => T)) => void] {
  const storage = config?.storage ?? 'localStorage';
  const namespace = config?.namespace ?? 'react-wrapper';
  const syncWithLivewire = config?.syncWithLivewire ?? false;
  const livewirePath = config?.livewirePath;
  const debounceMs = config?.debounceMs ?? 300;
  const serialize = config?.transformer?.serialize;
  const deserialize = config?.transformer?.deserialize;

  // Depend on configuration values instead of the object identity. This lets
  // callers pass an inline config object without re-registering on every render.
  const fullConfig = useMemo<StatePersistenceConfig>(
    () => ({
      key,
      namespace,
      storage,
      syncWithLivewire,
      livewirePath,
      debounceMs,
      transformer: { serialize, deserialize },
    }),
    [key, namespace, storage, syncWithLivewire, livewirePath, debounceMs, serialize, deserialize]
  );

  const [value, setValue] = useState<T>(defaultValue);
  const defaultValueRef = useRef(defaultValue);
  defaultValueRef.current = defaultValue;

  useEffect(() => {
    statePersistenceService.register(fullConfig);
    let mounted = true;

    setValue(defaultValueRef.current);

    const unsubscribe = statePersistenceService.subscribe(key, loaded => {
      if (!mounted) return;
      setValue(loaded === undefined ? defaultValueRef.current : (loaded as T));
    });

    const loadPersistedValue = async () => {
      try {
        const loaded = await statePersistenceService.load(key);
        if (mounted && loaded !== null) {
          setValue(loaded as T);
        }
      } catch (error) {
        console.error('Error loading persisted state:', error);
      }
    };

    loadPersistedValue();

    return () => {
      mounted = false;
      unsubscribe();
      statePersistenceService.unregister(key);
    };
  }, [key, fullConfig]);

  const setter = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      setValue(prevValue => {
        const finalValue =
          typeof newValue === 'function' ? (newValue as (prev: T) => T)(prevValue) : newValue;

        statePersistenceService.save(key, finalValue).catch(error => {
          console.error('Error persisting state:', error);
        });

        return finalValue;
      });
    },
    [key]
  );

  return [value, setter];
}
