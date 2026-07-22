import { devTools } from '../../resources/js/services/DevTools';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('DevTools', () => {
  beforeEach(() => {
    devTools.enable();
    devTools.clear();
  });

  afterEach(() => {
    devTools.clear();
    devTools.disable();
  });

  it('tracks components, state, performance, and observer events', () => {
    const events: string[] = [];
    const unsubscribe = devTools.subscribe(event => events.push(event.type));

    devTools.trackComponentMount('Probe', { enabled: true });
    devTools.trackComponentRender('Probe', { enabled: false });
    devTools.trackComponentWarning('Probe', 'deprecated prop');
    devTools.trackComponentError('Probe', new Error('broken'));
    devTools.trackStateChange('profile.name', 'Ada', 'Grace', 'test');
    devTools.recordPerformanceMetric({
      componentName: 'Probe',
      mountTime: 1,
      renderTime: 60,
      propsChanges: 1,
    });
    devTools.trackComponentUnmount('Probe');
    unsubscribe();

    const info = devTools.getComponentInfo('Probe');
    expect(info).toEqual(
      expect.objectContaining({ renderCount: 2, warnings: ['deprecated prop'] })
    );
    expect((info as { errors: Error[] }).errors).toHaveLength(1);
    expect(devTools.getStateHistory('profile')).toHaveLength(1);
    expect(devTools.getPerformanceMetrics('Probe')).toHaveLength(1);
    expect(events).toEqual([
      'component:mounted',
      'component:rendered',
      'component:warning',
      'component:error',
      'state:changed',
      'performance:metric',
      'component:unmounted',
    ]);
  });

  it('shows and removes the debug panel and supports performance marks', () => {
    devTools.showDebugPanel();
    expect(document.getElementById('react-wrapper-debug-panel')).toBeInTheDocument();
    devTools.startPerformanceMeasure('probe');
    devTools.endPerformanceMeasure('probe');
    devTools.logComponentInfo();
    devTools.logStateInfo();
    devTools.logPerformanceInfo();
    devTools.disable();
    expect(document.getElementById('react-wrapper-debug-panel')).not.toBeInTheDocument();
    expect(devTools.isEnabled()).toBe(false);
  });

  it('returns empty data while disabled and tolerates invalid performance measures', () => {
    devTools.disable();
    expect(devTools.getComponentInfo()).toBeUndefined();
    expect(devTools.getPerformanceMetrics()).toEqual([]);
    expect(devTools.getStateHistory()).toEqual([]);
    devTools.endPerformanceMeasure('never-started');
    expect(devTools.getMemoryUsage()).toBeUndefined();
  });
});
