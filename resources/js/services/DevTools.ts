/**
 * Development Tools for React Wrapper
 * Provides debugging utilities, performance monitoring, and component inspection
 */

interface ComponentInfo {
  name: string;
  props: Record<string, unknown>;
  mountTime: number;
  renderCount: number;
  lastRenderTime: number;
  errors: Error[];
  warnings: string[];
}

interface PerformanceMetrics {
  componentName: string;
  mountTime: number;
  renderTime: number;
  propsChanges: number;
  memoryUsage?: number;
}

interface StateChange {
  path: string;
  oldValue: unknown;
  newValue: unknown;
  timestamp: number;
  source: string;
}

class DevTools {
  private _isEnabled: boolean = false;
  private components: Map<string, ComponentInfo> = new Map();
  private performanceMetrics: PerformanceMetrics[] = [];
  private stateHistory: StateChange[] = [];
  private maxHistorySize: number = 1000;
  private observers: Set<(event: DevToolsEvent) => void> = new Set();

  constructor() {
    this._isEnabled = this.shouldEnable();

    if (this._isEnabled) {
      this.initializeDevTools();
    }
  }

  private shouldEnable(): boolean {
    return (
      typeof window !== 'undefined' &&
      ((typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') ||
        window.location.hostname === 'localhost' ||
        window.location.search.includes('react-wrapper-debug=true') ||
        localStorage.getItem('react-wrapper-debug') === 'true')
    );
  }

  private initializeDevTools(): void {
    // Add to window for console access
    if (typeof window !== 'undefined') {
      (window as unknown as Record<string, unknown>).__REACT_WRAPPER_DEV_TOOLS__ = this;
    }

    // Log initialization
    console.log(
      '%c[React Wrapper] Dev Tools Enabled',
      'color: #4F46E5; font-weight: bold; font-size: 12px;'
    );

    // Add keyboard shortcuts
    this.setupKeyboardShortcuts();

    // Setup performance observer
    this.setupPerformanceObserver();
  }

  private setupKeyboardShortcuts(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', event => {
      // Ctrl/Cmd + Shift + R + W = Show React Wrapper debug panel
      if (event.ctrlKey && event.shiftKey && event.key === 'W') {
        event.preventDefault();
        this.showDebugPanel();
      }

      // Ctrl/Cmd + Shift + R + C = Log component info
      if (event.ctrlKey && event.shiftKey && event.key === 'C') {
        event.preventDefault();
        this.logComponentInfo();
      }

      // Ctrl/Cmd + Shift + R + S = Log state info
      if (event.ctrlKey && event.shiftKey && event.key === 'S') {
        event.preventDefault();
        this.logStateInfo();
      }
    });
  }

  private setupPerformanceObserver(): void {
    if (typeof window === 'undefined' || !window.PerformanceObserver) return;

    try {
      const observer = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (entry.name.startsWith('react-wrapper-')) {
            this.recordPerformanceMetric({
              componentName: entry.name.replace('react-wrapper-', ''),
              mountTime: entry.startTime,
              renderTime: entry.duration,
              propsChanges: 0, // Will be updated separately
            });
          }
        }
      });

      observer.observe({ entryTypes: ['measure'] });
    } catch (error) {
      console.warn('[React Wrapper] Performance observer not available:', error);
    }
  }

  // Component tracking methods
  trackComponentMount(name: string, props: Record<string, unknown>): void {
    if (!this._isEnabled) return;

    const info: ComponentInfo = {
      name,
      props: { ...props },
      mountTime: Date.now(),
      renderCount: 1,
      lastRenderTime: Date.now(),
      errors: [],
      warnings: [],
    };

    this.components.set(name, info);
    this.notifyObservers({
      type: 'component:mounted',
      data: { name, props },
    });

    this.log(`Component mounted: ${name}`, props);
  }

  trackComponentRender(name: string, props: Record<string, unknown>): void {
    if (!this._isEnabled) return;

    const info = this.components.get(name);
    if (info) {
      info.renderCount++;
      info.lastRenderTime = Date.now();
      info.props = { ...props };
    }

    this.notifyObservers({
      type: 'component:rendered',
      data: { name, props, renderCount: info?.renderCount },
    });
  }

  trackComponentUnmount(name: string): void {
    if (!this._isEnabled) return;

    this.notifyObservers({
      type: 'component:unmounted',
      data: { name },
    });

    this.log(`Component unmounted: ${name}`);
  }

  trackComponentError(name: string, error: Error): void {
    if (!this._isEnabled) return;

    const info = this.components.get(name);
    if (info) {
      info.errors.push(error);
    }

    this.notifyObservers({
      type: 'component:error',
      data: { name, error },
    });

    this.error(`Component error in ${name}:`, error);
  }

  trackComponentWarning(name: string, warning: string): void {
    if (!this._isEnabled) return;

    const info = this.components.get(name);
    if (info) {
      info.warnings.push(warning);
    }

    this.notifyObservers({
      type: 'component:warning',
      data: { name, warning },
    });

    this.warn(`Component warning in ${name}:`, warning);
  }

  // State tracking methods
  trackStateChange(
    path: string,
    oldValue: unknown,
    newValue: unknown,
    source: string = 'unknown'
  ): void {
    if (!this._isEnabled) return;

    const change: StateChange = {
      path,
      oldValue,
      newValue,
      timestamp: Date.now(),
      source,
    };

    this.stateHistory.push(change);

    // Limit history size
    if (this.stateHistory.length > this.maxHistorySize) {
      this.stateHistory.shift();
    }

    this.notifyObservers({
      type: 'state:changed',
      data: change,
    });

    this.log(`State changed: ${path}`, { oldValue, newValue, source });
  }

  // Performance tracking methods
  recordPerformanceMetric(metric: PerformanceMetrics): void {
    if (!this._isEnabled) return;

    this.performanceMetrics.push(metric);

    // Limit metrics size
    if (this.performanceMetrics.length > this.maxHistorySize) {
      this.performanceMetrics.shift();
    }

    this.notifyObservers({
      type: 'performance:metric',
      data: metric,
    });

    // Warn about slow renders
    if (metric.renderTime > 50) {
      this.warn(`Slow render detected for ${metric.componentName}: ${metric.renderTime}ms`);
    }
  }

  startPerformanceMeasure(name: string): void {
    if (!this.isEnabled || typeof performance === 'undefined') return;
    performance.mark(`react-wrapper-${name}-start`);
  }

  endPerformanceMeasure(name: string): void {
    if (!this.isEnabled || typeof performance === 'undefined') return;

    try {
      performance.mark(`react-wrapper-${name}-end`);
      performance.measure(
        `react-wrapper-${name}`,
        `react-wrapper-${name}-start`,
        `react-wrapper-${name}-end`
      );
    } catch (error) {
      this.warn('Performance measurement failed:', error);
    }
  }

  // Information retrieval methods
  getComponentInfo(name?: string): ComponentInfo | ComponentInfo[] | undefined {
    if (!this.isEnabled) return undefined;

    if (name) {
      return this.components.get(name);
    }

    return Array.from(this.components.values());
  }

  getPerformanceMetrics(componentName?: string): PerformanceMetrics[] {
    if (!this.isEnabled) return [];

    if (componentName) {
      return this.performanceMetrics.filter(m => m.componentName === componentName);
    }

    return [...this.performanceMetrics];
  }

  getStateHistory(path?: string): StateChange[] {
    if (!this.isEnabled) return [];

    if (path) {
      return this.stateHistory.filter(change => change.path.startsWith(path));
    }

    return [...this.stateHistory];
  }

  // Debug panel methods
  showDebugPanel(): void {
    if (!this._isEnabled) return;

    const panel = this.createDebugPanel();
    document.body.appendChild(panel);
  }

  private createDebugPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'react-wrapper-debug-panel';
    panel.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 400px;
      max-height: 600px;
      background: white;
      border: 2px solid #4F46E5;
      border-radius: 8px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.1);
      z-index: 10000;
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
      font-size: 12px;
      overflow: hidden;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      background: #4F46E5;
      color: white;
      padding: 10px;
      font-weight: bold;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    header.innerHTML = `
      <span>React Wrapper Dev Tools</span>
      <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: white; cursor: pointer; font-size: 16px;">×</button>
    `;

    const content = document.createElement('div');
    content.style.cssText = 'padding: 10px; max-height: 550px; overflow-y: auto;';

    content.innerHTML = `
      <div>
        <h3>Components (${this.components.size})</h3>
        ${Array.from(this.components.entries())
          .map(
            ([name, info]) => `
          <div style="margin-bottom: 10px; padding: 8px; background: #f8f9fa; border-radius: 4px;">
            <strong>${name}</strong><br>
            Renders: ${info.renderCount}<br>
            Errors: ${info.errors.length}<br>
            Warnings: ${info.warnings.length}
          </div>
        `
          )
          .join('')}
      </div>
      
      <div style="margin-top: 20px;">
        <h3>Recent State Changes (${this.stateHistory.slice(-5).length})</h3>
        ${this.stateHistory
          .slice(-5)
          .reverse()
          .map(
            change => `
          <div style="margin-bottom: 8px; padding: 6px; background: #fff3cd; border-radius: 4px; font-size: 11px;">
            <strong>${change.path}</strong><br>
            ${new Date(change.timestamp).toLocaleTimeString()}<br>
            Source: ${change.source}
          </div>
        `
          )
          .join('')}
      </div>
      
      <div style="margin-top: 20px;">
        <h3>Performance</h3>
        <div style="padding: 8px; background: #d1ecf1; border-radius: 4px;">
          Components: ${this.components.size}<br>
          Avg Render Time: ${this.getAverageRenderTime()}ms<br>
          Slow Renders: ${this.getSlowRenderCount()}
        </div>
      </div>
    `;

    panel.appendChild(header);
    panel.appendChild(content);

    return panel;
  }

  private getAverageRenderTime(): string {
    if (this.performanceMetrics.length === 0) return '0';

    const total = this.performanceMetrics.reduce((sum, metric) => sum + metric.renderTime, 0);
    return (total / this.performanceMetrics.length).toFixed(2);
  }

  private getSlowRenderCount(): number {
    return this.performanceMetrics.filter(metric => metric.renderTime > 50).length;
  }

  // Logging methods
  logComponentInfo(): void {
    if (!this._isEnabled) return;

    console.group('%c[React Wrapper] Component Info', 'color: #059669; font-weight: bold;');
    this.components.forEach((info, name) => {
      console.log(`${name}:`, info);
    });
    console.groupEnd();
  }

  logStateInfo(): void {
    if (!this._isEnabled) return;

    console.group('%c[React Wrapper] State History', 'color: #DC2626; font-weight: bold;');
    this.stateHistory.slice(-10).forEach(change => {
      console.log(`${change.path}:`, change);
    });
    console.groupEnd();
  }

  logPerformanceInfo(): void {
    if (!this._isEnabled) return;

    console.group('%c[React Wrapper] Performance Metrics', 'color: #7C2D12; font-weight: bold;');
    console.table(this.performanceMetrics.slice(-20));
    console.groupEnd();
  }

  // Make logging methods public so they can be used by other services
  public log(message: string, data?: unknown): void {
    if (data !== undefined) {
      console.log(`%c[React Wrapper] ${message}`, 'color: #4F46E5;', data);
    } else {
      console.log(`%c[React Wrapper] ${message}`, 'color: #4F46E5;');
    }
  }

  public warn(message: string, ...args: unknown[]): void {
    console.warn(`%c[React Wrapper] ${message}`, 'color: #D97706;', ...args);
  }

  public error(message: string, ...args: unknown[]): void {
    console.error(`%c[React Wrapper] ${message}`, 'color: #DC2626;', ...args);
  }

  // Observer pattern for external tools
  subscribe(callback: (event: DevToolsEvent) => void): () => void {
    this.observers.add(callback);
    return () => this.observers.delete(callback);
  }

  private notifyObservers(event: DevToolsEvent): void {
    this.observers.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('[React Wrapper] Observer error:', error);
      }
    });
  }

  // Public API methods
  enable(): void {
    this._isEnabled = true;
    localStorage.setItem('react-wrapper-debug', 'true');
    this.initializeDevTools();
  }

  disable(): void {
    this._isEnabled = false;
    localStorage.removeItem('react-wrapper-debug');

    // Remove debug panel if exists
    const panel = document.getElementById('react-wrapper-debug-panel');
    if (panel) {
      panel.remove();
    }
  }

  isEnabled(): boolean {
    return this._isEnabled;
  }

  clear(): void {
    this.components.clear();
    this.performanceMetrics.length = 0;
    this.stateHistory.length = 0;
  }

  // Memory usage tracking (if available)
  getMemoryUsage(): number | undefined {
    const performanceWithMemory = window.performance as typeof window.performance & {
      memory?: { usedJSHeapSize: number };
    };
    if (typeof window !== 'undefined' && performanceWithMemory.memory) {
      return performanceWithMemory.memory.usedJSHeapSize;
    }
    return undefined;
  }
}

// Event types for the observer pattern
interface DevToolsEvent {
  type: string;
  data: unknown;
}

// Create singleton instance
export const devTools = new DevTools();

// Export types for external use
export type { ComponentInfo, PerformanceMetrics, StateChange, DevToolsEvent };

// Default export
export default devTools;
