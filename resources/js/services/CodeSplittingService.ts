/**
 * Advanced Code Splitting Service for React Wrapper
 * Implements sophisticated strategies beyond basic lazy loading
 */

import { devTools } from './DevTools';
import type { ComponentProps, ReactComponent } from '../interfaces/IComponentRegistry';

interface ChunkInfo {
  id: string;
  name: string;
  size: number;
  loadTime: number;
  dependencies: string[];
  priority: ChunkPriority;
  lastAccessed: number;
  hitCount: number;
}

interface SplitStrategy {
  name: string;
  condition: (componentName: string, metadata?: ComponentProps) => boolean;
  chunkName: (componentName: string) => string;
  preload?: boolean;
  priority?: ChunkPriority;
}

interface PrefetchRule {
  trigger: string; // component name or pattern
  prefetch: string[]; // components to prefetch
  delay?: number; // delay in ms
  condition?: () => boolean; // optional condition
}

interface BundleAnalysis {
  totalChunks: number;
  totalSize: number;
  averageLoadTime: number;
  cacheHitRate: number;
  mostUsedChunks: ChunkInfo[];
  leastUsedChunks: ChunkInfo[];
  recommendations: BundleRecommendation[];
}

interface BundleRecommendation {
  type: 'merge' | 'split' | 'preload' | 'remove';
  chunks: string[];
  reason: string;
  estimatedSavings: number;
}

enum ChunkPriority {
  CRITICAL = 1, // Load immediately
  HIGH = 2, // Preload on idle
  MEDIUM = 3, // Load on demand
  LOW = 4, // Load on demand with delay
  BACKGROUND = 5, // Load in background
}

class CodeSplittingService {
  private chunks: Map<string, ChunkInfo> = new Map();
  private strategies: SplitStrategy[] = [];
  private prefetchRules: PrefetchRule[] = [];
  private cache: Map<string, Promise<ReactComponent>> = new Map();
  private loadingQueue: Map<ChunkPriority, Set<string>> = new Map();
  private maxCacheSize: number = 100;
  private maxConcurrentLoads: number = 3;
  private currentLoads: number = 0;

  constructor() {
    this.initializeDefaultStrategies();
    this.setupIdleCallback();
    this.setupIntersectionObserver();
  }

  /**
   * Register a custom code splitting strategy
   */
  registerStrategy(strategy: SplitStrategy): void {
    this.strategies.push(strategy);
    devTools.log(`Code splitting strategy registered: ${strategy.name}`);
  }

  /**
   * Add prefetch rules for predictive loading
   */
  addPrefetchRule(rule: PrefetchRule): void {
    this.prefetchRules.push(rule);
    devTools.log(`Prefetch rule added for trigger: ${rule.trigger}`);
  }

  /**
   * Smart component loading with strategy selection
   */
  async loadComponent(
    componentName: string,
    metadata: ComponentProps = {},
    forceStrategy?: string
  ): Promise<ReactComponent> {
    const startTime = performance.now();

    try {
      // Check cache first
      const cached = this.cache.get(componentName);
      if (cached) {
        this.updateChunkStats(componentName, 0, true);
        return await cached;
      }

      // Select splitting strategy
      const strategy = forceStrategy
        ? this.strategies.find(s => s.name === forceStrategy)
        : this.selectStrategy(componentName, metadata);

      if (!strategy) {
        throw new Error(`No suitable strategy found for component: ${componentName}`);
      }

      // Create load promise
      const loadPromise = this.executeStrategy(strategy, componentName, metadata);

      // Cache the promise
      this.cache.set(componentName, loadPromise);

      // Manage cache size
      this.manageCacheSize();

      // Execute prefetch rules
      this.executePrefetchRules(componentName);

      const result = await loadPromise;
      const loadTime = performance.now() - startTime;

      this.updateChunkStats(componentName, loadTime, false);

      return result;
    } catch (error) {
      this.cache.delete(componentName); // Remove failed load from cache
      devTools.trackComponentError(componentName, error as Error);
      throw error;
    }
  }

  /**
   * Preload components based on priority
   */
  preloadComponents(components: string[], priority: ChunkPriority = ChunkPriority.HIGH): void {
    if (!this.loadingQueue.has(priority)) {
      this.loadingQueue.set(priority, new Set());
    }

    const queue = this.loadingQueue.get(priority)!;
    components.forEach(component => {
      if (!this.cache.has(component)) {
        queue.add(component);
      }
    });

    this.processLoadingQueue();
  }

  /**
   * Get bundle analysis and recommendations
   */
  analyzeBundles(): BundleAnalysis {
    const chunks = Array.from(this.chunks.values());
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
    const totalLoadTime = chunks.reduce((sum, chunk) => sum + chunk.loadTime, 0);
    const cacheHits = chunks.filter(chunk => chunk.hitCount > 1).length;

    return {
      totalChunks: chunks.length,
      totalSize,
      averageLoadTime: chunks.length > 0 ? totalLoadTime / chunks.length : 0,
      cacheHitRate: chunks.length > 0 ? cacheHits / chunks.length : 0,
      mostUsedChunks: chunks.sort((a, b) => b.hitCount - a.hitCount).slice(0, 5),
      leastUsedChunks: chunks.sort((a, b) => a.hitCount - b.hitCount).slice(0, 5),
      recommendations: this.generateRecommendations(chunks),
    };
  }

  /**
   * Clear cache and reset statistics
   */
  clearCache(): void {
    this.cache.clear();
    this.chunks.clear();
    this.loadingQueue.clear();
    devTools.log('Code splitting cache cleared');
  }

  /**
   * Get chunk information
   */
  getChunkInfo(componentName?: string): ChunkInfo | ChunkInfo[] | null {
    if (componentName) {
      return this.chunks.get(componentName) || null;
    }
    return Array.from(this.chunks.values());
  }

  private initializeDefaultStrategies(): void {
    // Route-based splitting
    this.registerStrategy({
      name: 'route-based',
      condition: (componentName, metadata) =>
        metadata?.category === 'page' || componentName.toLowerCase().includes('page'),
      chunkName: componentName => `route-${componentName.toLowerCase()}`,
      priority: ChunkPriority.HIGH,
    });

    // Feature-based splitting
    this.registerStrategy({
      name: 'feature-based',
      condition: (componentName, metadata) =>
        metadata?.category === 'feature' || this.isFeatureComponent(componentName),
      chunkName: componentName => `feature-${this.extractFeatureName(componentName)}`,
      priority: ChunkPriority.MEDIUM,
    });

    // Vendor-based splitting
    this.registerStrategy({
      name: 'vendor-based',
      condition: (componentName, metadata) =>
        metadata?.external === true || this.isVendorComponent(componentName),
      chunkName: componentName => `vendor-${this.extractVendorName(componentName)}`,
      priority: ChunkPriority.LOW,
    });

    // Size-based splitting
    this.registerStrategy({
      name: 'size-based',
      condition: (componentName, metadata) =>
        metadata?.size === 'large' || this.isLargeComponent(componentName),
      chunkName: componentName => `large-${componentName.toLowerCase()}`,
      priority: ChunkPriority.BACKGROUND,
    });

    // Critical path splitting
    this.registerStrategy({
      name: 'critical-path',
      condition: (componentName, metadata) =>
        metadata?.critical === true || this.isCriticalComponent(componentName),
      chunkName: componentName => `critical-${componentName.toLowerCase()}`,
      priority: ChunkPriority.CRITICAL,
      preload: true,
    });

    // Default strategy
    this.registerStrategy({
      name: 'default',
      condition: () => true, // Always matches
      chunkName: componentName => `component-${componentName.toLowerCase()}`,
      priority: ChunkPriority.MEDIUM,
    });
  }

  private selectStrategy(
    componentName: string,
    metadata: ComponentProps
  ): SplitStrategy | undefined {
    // Find the first matching strategy (order matters)
    return this.strategies.find(strategy => strategy.condition(componentName, metadata));
  }

  private async executeStrategy(
    strategy: SplitStrategy,
    componentName: string,
    _metadata: ComponentProps
  ): Promise<ReactComponent> {
    const chunkName = strategy.chunkName(componentName);

    devTools.startPerformanceMeasure(`chunk-load-${chunkName}`);

    try {
      // Dynamic import with chunk name
      const module = await import(
        /* webpackChunkName: "[request]" */
        /* webpackMode: "lazy" */
        `@/components/${componentName}`
      );

      devTools.endPerformanceMeasure(`chunk-load-${chunkName}`);

      return (module.default || module) as ReactComponent;
    } catch (error) {
      devTools.endPerformanceMeasure(`chunk-load-${chunkName}`);
      throw new Error(`Failed to load component ${componentName}: ${error}`);
    }
  }

  private executePrefetchRules(triggerComponent: string): void {
    const matchingRules = this.prefetchRules.filter(
      rule => rule.trigger === triggerComponent || new RegExp(rule.trigger).test(triggerComponent)
    );

    matchingRules.forEach(rule => {
      const shouldPrefetch = !rule.condition || rule.condition();
      if (shouldPrefetch) {
        const delay = rule.delay || 0;
        setTimeout(() => {
          this.preloadComponents(rule.prefetch, ChunkPriority.HIGH);
        }, delay);
      }
    });
  }

  private processLoadingQueue(): void {
    if (this.currentLoads >= this.maxConcurrentLoads) {
      return; // Too many concurrent loads
    }

    // Process by priority
    const priorities = [
      ChunkPriority.CRITICAL,
      ChunkPriority.HIGH,
      ChunkPriority.MEDIUM,
      ChunkPriority.LOW,
      ChunkPriority.BACKGROUND,
    ];

    for (const priority of priorities) {
      const queue = this.loadingQueue.get(priority);
      if (queue && queue.size > 0) {
        const component = queue.values().next().value;
        if (component) {
          queue.delete(component);

          this.currentLoads++;
          this.loadComponent(component).finally(() => {
            this.currentLoads--;
            this.processLoadingQueue(); // Process next in queue
          });
        }

        if (this.currentLoads >= this.maxConcurrentLoads) {
          break;
        }
      }
    }
  }

  private updateChunkStats(componentName: string, loadTime: number, cacheHit: boolean): void {
    let chunk = this.chunks.get(componentName);

    if (!chunk) {
      chunk = {
        id: componentName,
        name: componentName,
        size: 0, // Would need to be calculated from actual bundle
        loadTime,
        dependencies: [],
        priority: ChunkPriority.MEDIUM,
        lastAccessed: Date.now(),
        hitCount: 0,
      };
      this.chunks.set(componentName, chunk);
    }

    chunk.lastAccessed = Date.now();
    chunk.hitCount++;

    if (!cacheHit) {
      chunk.loadTime = (chunk.loadTime + loadTime) / 2; // Running average
    }
  }

  private manageCacheSize(): void {
    if (this.cache.size <= this.maxCacheSize) {
      return;
    }

    // Remove least recently used items
    const chunks = Array.from(this.chunks.values()).sort((a, b) => a.lastAccessed - b.lastAccessed);

    const toRemove = chunks.slice(0, this.cache.size - this.maxCacheSize);
    toRemove.forEach(chunk => {
      this.cache.delete(chunk.id);
      this.chunks.delete(chunk.id);
    });
  }

  private setupIdleCallback(): void {
    if (typeof window === 'undefined' || !window.requestIdleCallback) {
      return;
    }

    const processIdleTasks = (deadline: IdleDeadline) => {
      while (deadline.timeRemaining() > 0) {
        const queue = this.loadingQueue.get(ChunkPriority.BACKGROUND);
        if (queue && queue.size > 0) {
          const component = queue.values().next().value;
          if (component) {
            queue.delete(component);
            this.loadComponent(component);
          } else {
            break;
          }
        } else {
          break;
        }
      }

      // Schedule next idle callback
      window.requestIdleCallback(processIdleTasks);
    };

    window.requestIdleCallback(processIdleTasks);
  }

  private setupIntersectionObserver(): void {
    if (typeof window === 'undefined' || !window.IntersectionObserver) {
      return;
    }

    // Observer for prefetching components that will soon be visible
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const componentName = entry.target.getAttribute('data-react-component');
            if (componentName && !this.cache.has(componentName)) {
              this.preloadComponents([componentName], ChunkPriority.HIGH);
            }
          }
        });
      },
      {
        rootMargin: '100px', // Start loading when component is 100px away from viewport
        threshold: 0.1,
      }
    );

    // Observe all component containers
    const containers = document.querySelectorAll('[data-react-component]');
    containers.forEach(container => observer.observe(container));
  }

  private generateRecommendations(chunks: ChunkInfo[]): BundleRecommendation[] {
    const recommendations: BundleRecommendation[] = [];

    // Recommend merging small, frequently used chunks
    const smallFrequentChunks = chunks.filter(chunk => chunk.size < 10000 && chunk.hitCount > 10);

    if (smallFrequentChunks.length > 1) {
      recommendations.push({
        type: 'merge',
        chunks: smallFrequentChunks.map(c => c.name),
        reason: 'Small, frequently accessed chunks should be merged to reduce HTTP overhead',
        estimatedSavings: smallFrequentChunks.length * 50, // Estimated ms saved
      });
    }

    // Recommend splitting large chunks
    const largeChunks = chunks.filter(chunk => chunk.size > 100000);
    largeChunks.forEach(chunk => {
      recommendations.push({
        type: 'split',
        chunks: [chunk.name],
        reason: 'Large chunk should be split for better loading performance',
        estimatedSavings: chunk.loadTime * 0.3,
      });
    });

    // Recommend preloading critical chunks
    const criticalChunks = chunks.filter(
      chunk => chunk.priority === ChunkPriority.CRITICAL && chunk.hitCount > 5
    );

    if (criticalChunks.length > 0) {
      recommendations.push({
        type: 'preload',
        chunks: criticalChunks.map(c => c.name),
        reason: 'Critical chunks with high usage should be preloaded',
        estimatedSavings: criticalChunks.reduce((sum, chunk) => sum + chunk.loadTime, 0),
      });
    }

    // Recommend removing unused chunks
    const unusedChunks = chunks.filter(
      chunk => chunk.hitCount === 0 && Date.now() - chunk.lastAccessed > 86400000 // 24 hours
    );

    if (unusedChunks.length > 0) {
      recommendations.push({
        type: 'remove',
        chunks: unusedChunks.map(c => c.name),
        reason: 'Unused chunks should be removed to reduce bundle size',
        estimatedSavings: unusedChunks.reduce((sum, chunk) => sum + chunk.size, 0) / 1000, // KB saved
      });
    }

    return recommendations;
  }

  // Helper methods for component classification
  private isFeatureComponent(componentName: string): boolean {
    const featureKeywords = ['dashboard', 'profile', 'settings', 'admin', 'analytics'];
    return featureKeywords.some(keyword => componentName.toLowerCase().includes(keyword));
  }

  private extractFeatureName(componentName: string): string {
    const featureKeywords = ['dashboard', 'profile', 'settings', 'admin', 'analytics'];
    const feature = featureKeywords.find(keyword => componentName.toLowerCase().includes(keyword));
    return feature || 'general';
  }

  private isVendorComponent(componentName: string): boolean {
    const vendorKeywords = ['chart', 'calendar', 'editor', 'map', 'payment'];
    return vendorKeywords.some(keyword => componentName.toLowerCase().includes(keyword));
  }

  private extractVendorName(componentName: string): string {
    const vendorKeywords = ['chart', 'calendar', 'editor', 'map', 'payment'];
    const vendor = vendorKeywords.find(keyword => componentName.toLowerCase().includes(keyword));
    return vendor || 'external';
  }

  private isLargeComponent(componentName: string): boolean {
    const largeKeywords = ['grid', 'table', 'canvas', 'visualization', 'complex'];
    return largeKeywords.some(keyword => componentName.toLowerCase().includes(keyword));
  }

  private isCriticalComponent(componentName: string): boolean {
    const criticalKeywords = ['header', 'navigation', 'layout', 'auth', 'error'];
    return criticalKeywords.some(keyword => componentName.toLowerCase().includes(keyword));
  }

  /**
   * Preload component for better performance
   */
  async preloadComponent(componentName: string): Promise<void> {
    try {
      await this.loadComponent(componentName);
    } catch (error) {
      console.error(`Failed to preload component ${componentName}:`, error);
    }
  }

  /**
   * Check if component is loaded
   */
  isLoaded(componentName: string): boolean {
    return this.cache.has(componentName);
  }
}

// Export singleton instance
export const codeSplittingService = new CodeSplittingService();

// Export types
export type { ChunkInfo, SplitStrategy, PrefetchRule, BundleAnalysis, BundleRecommendation };

export { ChunkPriority };

// Default export
export default codeSplittingService;
