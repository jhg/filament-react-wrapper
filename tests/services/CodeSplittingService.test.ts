import {
  ChunkPriority,
  CodeSplittingService,
} from '../../resources/js/services/CodeSplittingService';
import { describe, expect, it, vi } from 'vitest';

describe('CodeSplittingService', () => {
  it('loads and caches a component, then reports chunk statistics', async () => {
    const service = new CodeSplittingService();

    const first = await service.loadComponent('EnhancedStateManager');
    const second = await service.loadComponent('EnhancedStateManager');

    expect(first).toBe(second);
    expect(service.isLoaded('EnhancedStateManager')).toBe(true);
    expect(service.getChunkInfo('EnhancedStateManager')).toEqual(
      expect.objectContaining({ name: 'EnhancedStateManager', hitCount: 2 })
    );
    expect(service.analyzeBundles()).toEqual(
      expect.objectContaining({ totalChunks: 1, cacheHitRate: 1 })
    );
  });

  it('supports custom strategies, prefetch rules, queues, and cache clearing', async () => {
    vi.useFakeTimers();
    const service = new CodeSplittingService();
    const prefetch = vi.fn();
    service.registerStrategy({
      name: 'custom',
      condition: () => true,
      chunkName: name => `custom-${name}`,
    });
    service.addPrefetchRule({
      trigger: 'EnhancedStateManager',
      prefetch: ['EnhancedStateManager'],
      condition: prefetch,
    });

    service.preloadComponents(['EnhancedStateManager'], ChunkPriority.HIGH);
    await vi.runAllTimersAsync();
    expect(prefetch).toHaveBeenCalled();
    expect(service.isLoaded('EnhancedStateManager')).toBe(true);

    service.clearCache();
    expect(service.isLoaded('EnhancedStateManager')).toBe(false);
    expect(service.getChunkInfo()).toEqual([]);
    vi.useRealTimers();
  });

  it('reports failed loads and handles invalid forced strategies', async () => {
    const service = new CodeSplittingService();

    await expect(service.loadComponent('MissingComponent', {}, 'unknown')).rejects.toThrow(
      'No suitable strategy found'
    );
    await expect(service.loadComponent('MissingComponent')).rejects.toThrow(
      'Failed to load component MissingComponent'
    );
    await expect(service.preloadComponent('MissingComponent')).resolves.toBeUndefined();
  });
});
