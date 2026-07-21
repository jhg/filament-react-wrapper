# Code Splitting

Advanced code splitting strategies for optimal performance and user experience in React Wrapper applications.

## 🎯 Overview

### What is Code Splitting?

Code splitting is the process of splitting your code into smaller chunks that can be loaded on demand, reducing initial bundle size and improving performance.

### React Wrapper Code Splitting Features

- ✅ **Multiple Strategies** - Route-based, feature-based, vendor-based splitting
- ✅ **Intelligent Prefetching** - Predictive loading based on user behavior
- ✅ **Bundle Analysis** - Detailed chunk analysis and optimization recommendations
- ✅ **Cache Management** - Smart caching with TTL and invalidation
- ✅ **Performance Monitoring** - Real-time load time tracking
- ✅ **Error Handling** - Graceful fallbacks for failed chunk loads

## 🚀 Quick Start

### Basic Lazy Loading

```typescript
import { componentRegistry } from '@react-wrapper';

// Register component with lazy loading
componentRegistry.register({
  name: 'LazyDashboard',
  component: () => import('./components/Dashboard'), // Dynamic import
  isAsync: true,
  config: {
    lazy: true,
    cache: true,
    preload: false
  }
});
```

### Advanced Registration

```typescript
componentRegistry.register({
  name: 'AdvancedChart',
  component: () => import('./components/charts/AdvancedChart'),
  isAsync: true,
  config: {
    lazy: true,
    cache: true,
    preload: false
  },
  metadata: {
    category: 'charts',
    chunkName: 'charts-advanced', // Custom chunk name
    priority: 'medium',
    dependencies: ['d3', 'chart.js']
  }
});
```

## 📊 Splitting Strategies

### 1. Route-Based Splitting

Split code by application routes:

```typescript
import { codeSplittingService } from '@react-wrapper';

// Register route-based strategy
codeSplittingService.registerStrategy({
  name: 'route-based',
  condition: (componentName, metadata) => {
    return metadata?.category === 'page' || metadata?.type === 'route';
  },
  chunkName: (componentName) => `route-${componentName.toLowerCase()}`,
  preload: false,
  priority: ChunkPriority.MEDIUM
});

// Register route components
componentRegistry.register({
  name: 'DashboardPage',
  component: () => import('./pages/Dashboard'),
  isAsync: true,
  metadata: { category: 'page', route: '/dashboard' }
});

componentRegistry.register({
  name: 'UserManagementPage',
  component: () => import('./pages/UserManagement'),
  isAsync: true,
  metadata: { category: 'page', route: '/users' }
});
```

### 2. Feature-Based Splitting

Split by application features:

```typescript
// Analytics feature
codeSplittingService.registerStrategy({
  name: 'analytics-feature',
  condition: (componentName, metadata) => {
    return metadata?.feature === 'analytics';
  },
  chunkName: (componentName) => `analytics-${componentName.toLowerCase()}`,
  preload: true, // Preload analytics components
  priority: ChunkPriority.HIGH
});

// Register analytics components
const analyticsComponents = [
  'AnalyticsDashboard',
  'RevenueChart',
  'UserMetrics',
  'ConversionFunnel'
];

analyticsComponents.forEach(name => {
  componentRegistry.register({
    name,
    component: () => import(`./features/analytics/${name}`),
    isAsync: true,
    metadata: { feature: 'analytics' }
  });
});
```

### 3. Vendor-Based Splitting

Separate third-party libraries:

```typescript
codeSplittingService.registerStrategy({
  name: 'vendor-heavy',
  condition: (componentName, metadata) => {
    return metadata?.dependencies?.some(dep => 
      ['chart.js', 'd3', 'three.js', 'monaco-editor'].includes(dep)
    );
  },
  chunkName: (componentName) => {
    const heavyDeps = metadata?.dependencies?.filter(dep => 
      ['chart.js', 'd3', 'three.js', 'monaco-editor'].includes(dep)
    );
    return `vendor-${heavyDeps[0]}-${componentName.toLowerCase()}`;
  },
  preload: false,
  priority: ChunkPriority.LOW
});

// Register vendor-heavy components
componentRegistry.register({
  name: 'CodeEditor',
  component: () => import('./components/CodeEditor'),
  isAsync: true,
  metadata: {
    dependencies: ['monaco-editor', 'typescript'],
    category: 'editor'
  }
});
```

### 4. Size-Based Splitting

Split by component size:

```typescript
codeSplittingService.registerStrategy({
  name: 'size-based',
  condition: (componentName, metadata) => {
    return metadata?.estimatedSize && metadata.estimatedSize > 100000; // 100KB+
  },
  chunkName: (componentName) => `large-${componentName.toLowerCase()}`,
  preload: false,
  priority: ChunkPriority.BACKGROUND
});
```

## 🎯 Intelligent Prefetching

### Prefetch Rules

```typescript
// Prefetch related components
codeSplittingService.addPrefetchRule({
  trigger: 'Dashboard',
  prefetch: ['UserProfile', 'ActivityFeed', 'QuickActions'],
  delay: 2000, // Prefetch after 2 seconds
  condition: () => navigator.connection?.effectiveType !== 'slow-2g'
});

// Prefetch on hover
codeSplittingService.addPrefetchRule({
  trigger: 'navigation-hover',
  prefetch: ['targetPage'],
  delay: 100,
  condition: () => !document.hidden
});

// Prefetch on intersection
codeSplittingService.addPrefetchRule({
  trigger: 'viewport-intersection',
  prefetch: ['BelowFoldComponent'],
  delay: 500,
  condition: () => window.innerHeight > 600
});
```

### Predictive Loading

```typescript
// Track user behavior patterns
const userBehaviorTracker = {
  trackComponentUsage: (componentName: string) => {
    const usage = JSON.parse(localStorage.getItem('componentUsage') || '{}');
    usage[componentName] = (usage[componentName] || 0) + 1;
    localStorage.setItem('componentUsage', JSON.stringify(usage));
  },
  
  getPredictedComponents: (currentComponent: string) => {
    const patterns = JSON.parse(localStorage.getItem('navigationPatterns') || '{}');
    return patterns[currentComponent] || [];
  }
};

// Implement predictive prefetching
codeSplittingService.addPrefetchRule({
  trigger: '*', // Any component
  prefetch: (componentName) => {
    return userBehaviorTracker.getPredictedComponents(componentName);
  },
  delay: 1000,
  condition: () => navigator.connection?.saveData !== true
});
```

## 📈 Performance Optimization

### Chunk Prioritization

```typescript
enum ChunkPriority {
  CRITICAL = 1,   // Load immediately
  HIGH = 2,       // Load after critical
  MEDIUM = 3,     // Load on demand
  LOW = 4,        // Load when idle
  BACKGROUND = 5  // Load in background
}

// Critical components (above the fold)
componentRegistry.register({
  name: 'HeaderNavigation',
  component: HeaderNavigation,
  config: { priority: ChunkPriority.CRITICAL }
});

// High priority (likely to be used soon)
componentRegistry.register({
  name: 'UserMenu',
  component: () => import('./components/UserMenu'),
  isAsync: true,
  config: { priority: ChunkPriority.HIGH }
});

// Background loading (rarely used)
componentRegistry.register({
  name: 'AdminTools',
  component: () => import('./components/AdminTools'),
  isAsync: true,
  config: { priority: ChunkPriority.BACKGROUND }
});
```

### Bundle Analysis

```typescript
// Get bundle analysis
const analysis = codeSplittingService.analyzeBundles();

console.log('Bundle Analysis:', {
  totalChunks: analysis.totalChunks,
  totalSize: analysis.totalSize,
  averageLoadTime: analysis.averageLoadTime,
  cacheHitRate: analysis.cacheHitRate
});

// Get recommendations
analysis.recommendations.forEach(recommendation => {
  console.log(`Recommendation: ${recommendation.type}`, recommendation.description);
});

// Most/least used chunks
console.log('Most used chunks:', analysis.mostUsedChunks);
console.log('Least used chunks:', analysis.leastUsedChunks);
```

### Cache Management

```typescript
// Configure cache settings
codeSplittingService.configureCaching({
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  maxSize: 50 * 1024 * 1024,   // 50MB
  strategy: 'lru', // Least Recently Used
  compression: true
});

// Manual cache management
codeSplittingService.clearCache(); // Clear all
codeSplittingService.clearCache(['old-chunk-1', 'old-chunk-2']); // Clear specific

// Cache warming
codeSplittingService.warmCache([
  'Dashboard',
  'UserProfile',
  'Settings'
]);
```

## 🔧 Advanced Configuration

### Custom Loading States

```typescript
// Global loading component
const ChunkLoadingFallback = ({ chunkName }: { chunkName: string }) => (
  <div className="chunk-loading">
    <div className="spinner" />
    <p>Loading {chunkName}...</p>
  </div>
);

// Register with custom loading
componentRegistry.register({
  name: 'HeavyComponent',
  component: () => import('./components/HeavyComponent'),
  isAsync: true,
  config: {
    lazy: true,
    loadingComponent: ChunkLoadingFallback,
    errorComponent: ({ error }) => (
      <div className="chunk-error">
        <h3>Failed to load component</h3>
        <p>{error.message}</p>
        <button onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    )
  }
});
```

### Webpack Integration

```javascript
// vite.config.js
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom'],
          'vendor-ui': ['@headlessui/react', '@heroicons/react'],
          'vendor-utils': ['lodash', 'date-fns'],
          
          // Feature chunks
          'feature-analytics': [
            './src/features/analytics/index.ts'
          ],
          'feature-dashboard': [
            './src/features/dashboard/index.ts'
          ]
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
});
```

### Runtime Chunk Loading

```typescript
// Load components programmatically
const loadComponentRuntime = async (componentName: string) => {
  try {
    // Show loading state
    const loadingEl = document.createElement('div');
    loadingEl.textContent = 'Loading component...';
    document.body.appendChild(loadingEl);
    
    // Load component
    const component = await codeSplittingService.loadComponent(
      componentName,
      { priority: ChunkPriority.HIGH }
    );
    
    // Remove loading state
    document.body.removeChild(loadingEl);
    
    return component;
  } catch (error) {
    console.error('Failed to load component:', error);
    throw error;
  }
};

// Usage
const handleButtonClick = async () => {
  const DynamicModal = await loadComponentRuntime('DynamicModal');
  // Use component
};
```

## 📊 Monitoring and Analytics

### Performance Metrics

```typescript
// Track chunk loading performance
codeSplittingService.onChunkLoad((event) => {
  const { chunkName, loadTime, cacheHit, size } = event;
  
  // Send to analytics
  analytics.track('chunk_loaded', {
    chunkName,
    loadTime,
    cacheHit,
    size,
    networkType: navigator.connection?.effectiveType
  });
  
  // Log slow loads
  if (loadTime > 3000) {
    console.warn(`Slow chunk load: ${chunkName} took ${loadTime}ms`);
  }
});

// Monitor cache performance
codeSplittingService.onCacheEvent((event) => {
  if (event.type === 'cache_miss') {
    console.log(`Cache miss for ${event.chunkName}`);
  }
});
```

### Error Tracking

```typescript
// Track chunk loading errors
codeSplittingService.onChunkError((error, chunkName) => {
  // Send to error tracking service
  errorTracker.captureException(error, {
    tags: {
      chunkName,
      loadStrategy: 'code-splitting'
    },
    extra: {
      userAgent: navigator.userAgent,
      connection: navigator.connection?.effectiveType
    }
  });
  
  // Retry logic
  if (error.retryCount < 3) {
    setTimeout(() => {
      codeSplittingService.loadComponent(chunkName, {
        forceReload: true,
        retryCount: (error.retryCount || 0) + 1
      });
    }, 1000 * Math.pow(2, error.retryCount || 0)); // Exponential backoff
  }
});
```

## 🎯 Best Practices

### 1. Chunk Sizing

```typescript
// Aim for 50-250KB chunks
const isOptimalSize = (size: number) => size >= 50000 && size <= 250000;

// Combine small components
const smallComponents = ['Icon', 'Button', 'Badge', 'Tooltip'];
componentRegistry.registerGroup({
  name: 'ui-components',
  components: smallComponents.map(name => ({
    name,
    component: () => import(`./components/${name}`)
  })),
  config: { 
    lazy: true,
    chunkName: 'ui-small-components'
  }
});
```

### 2. Critical Path Optimization

```typescript
// Identify critical components
const criticalComponents = [
  'AppHeader',
  'Navigation',
  'AuthenticationGuard',
  'ErrorBoundary'
];

// Preload critical components
criticalComponents.forEach(name => {
  componentRegistry.register({
    name,
    component: () => import(`./components/${name}`),
    isAsync: true,
    config: {
      preload: true,
      priority: ChunkPriority.CRITICAL
    }
  });
});
```

### 3. Network-Aware Loading

```typescript
// Adapt to network conditions
const getLoadingStrategy = () => {
  const connection = navigator.connection;
  
  if (!connection) return 'default';
  
  switch (connection.effectiveType) {
    case 'slow-2g':
    case '2g':
      return 'minimal'; // Load only essential
    case '3g':
      return 'moderate'; // Load with delays
    case '4g':
    default:
      return 'aggressive'; // Load everything
  }
};

// Apply strategy
const strategy = getLoadingStrategy();
codeSplittingService.setGlobalStrategy(strategy);
```

### 4. User Experience

```typescript
// Preload on user intent
const preloadOnIntent = () => {
  // Hover intent
  document.addEventListener('mouseover', (e) => {
    const target = e.target as HTMLElement;
    const componentName = target.dataset.preloadComponent;
    
    if (componentName) {
      codeSplittingService.preloadComponents([componentName]);
    }
  });
  
  // Scroll intent
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const componentName = entry.target.getAttribute('data-preload-component');
        if (componentName) {
          codeSplittingService.preloadComponents([componentName]);
        }
      }
    });
  }, { rootMargin: '50px' });
  
  document.querySelectorAll('[data-preload-component]').forEach(el => {
    observer.observe(el);
  });
};

// Initialize
preloadOnIntent();
```

## 🐛 Debugging

### Debug Mode

```typescript
// Enable debug mode
codeSplittingService.setDebugMode(true);

// Get debug information
const debugInfo = codeSplittingService.getDebugInfo();
console.log('Code Splitting Debug Info:', debugInfo);

// Visualize chunks
codeSplittingService.visualizeChunks(); // Opens debug panel
```

### Performance Profiling

```typescript
// Profile chunk loading
codeSplittingService.startProfiling();

// Load some components
await codeSplittingService.loadComponent('Dashboard');
await codeSplittingService.loadComponent('UserProfile');

// Get profiling results
const profile = codeSplittingService.getProfile();
console.log('Loading Profile:', profile);
```

---

**Optimize your application with intelligent code splitting! ⚡**