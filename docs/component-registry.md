# Component Registry

The Component Registry is the heart of React Wrapper, providing a centralized system for registering, managing, and rendering React components across your Laravel application.

## 🎯 Basic Concepts

### What is the Component Registry?

The Component Registry is a service that:
- **Stores** React component definitions with metadata
- **Manages** component lifecycle and dependencies
- **Provides** a unified API for component access
- **Supports** lazy loading and code splitting
- **Enables** middleware and hooks system

### Key Features

- ✅ **Dynamic Registration** - Register components at runtime
- ✅ **Metadata Support** - Rich component descriptions and categorization
- ✅ **Lazy Loading** - Load components on demand
- ✅ **Middleware System** - Transform components before rendering
- ✅ **Event System** - Listen to registration and lifecycle events
- ✅ **Type Safety** - Full TypeScript support

## 📝 Component Registration

### Basic Registration

```typescript
import { componentRegistry } from '@react-wrapper';
import MyComponent from './components/MyComponent';

componentRegistry.register({
  name: 'MyComponent',
  component: MyComponent,
  defaultProps: {
    title: 'Default Title',
    theme: 'light'
  },
  metadata: {
    category: 'ui',
    description: 'A versatile UI component',
    tags: ['ui', 'display', 'card']
  }
});
```

### Advanced Registration

```typescript
componentRegistry.register({
  name: 'AdvancedChart',
  component: () => import('./components/AdvancedChart'), // Lazy loading
  isAsync: true,
  defaultProps: {
    type: 'line',
    animated: true,
    responsive: true
  },
  config: {
    lazy: true,
    cache: true,
    preload: false
  },
  metadata: {
    category: 'charts',
    description: 'Advanced charting component with animations',
    tags: ['chart', 'visualization', 'data'],
    author: 'Your Team',
    version: '1.2.0'
  }
});
```

### Bulk Registration

```typescript
import { registerComponents } from '@react-wrapper';

const components = [
  {
    name: 'Button',
    component: Button,
    defaultProps: { variant: 'primary' },
    metadata: { category: 'forms' }
  },
  {
    name: 'Modal',
    component: Modal,
    defaultProps: { closable: true },
    metadata: { category: 'overlay' }
  },
  {
    name: 'DataTable',
    component: () => import('./DataTable'),
    isAsync: true,
    config: { lazy: true },
    metadata: { category: 'data' }
  }
];

registerComponents(components);
```

## 🔧 Registration from PHP/Laravel

### Service Provider Registration

```php
<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use HadyFayed\ReactWrapper\Services\ReactComponentRegistry;

class ReactComponentServiceProvider extends ServiceProvider
{
    public function boot()
    {
        $registry = app(ReactComponentRegistry::class);

        // Register components
        $registry->register([
            'name' => 'UserProfile',
            'component_path' => 'resources/js/components/UserProfile.tsx',
            'default_props' => [
                'editable' => false,
                'showAvatar' => true
            ],
            'metadata' => [
                'category' => 'user',
                'description' => 'User profile display component',
                'tags' => ['user', 'profile', 'display']
            ]
        ]);

        // Register multiple components
        $registry->registerMany([
            [
                'name' => 'ProductCard',
                'component_path' => 'resources/js/components/ProductCard.tsx',
                'default_props' => ['showPrice' => true],
                'metadata' => ['category' => 'ecommerce']
            ],
            [
                'name' => 'OrderSummary',
                'component_path' => 'resources/js/components/OrderSummary.tsx',
                'is_async' => true,
                'config' => ['lazy' => true, 'cache' => true]
            ]
        ]);
    }
}
```

### Configuration-Based Registration

```php
// config/react-wrapper.php
return [
    'components' => [
        'auto_register' => true,
        'scan_directories' => [
            'resources/js/components',
            'resources/js/widgets'
        ],
        'registered_components' => [
            'Dashboard' => [
                'component_path' => 'resources/js/components/Dashboard.tsx',
                'default_props' => [
                    'refreshInterval' => 30000,
                    'showNotifications' => true
                ],
                'config' => [
                    'lazy' => false,
                    'cache' => true,
                    'preload' => true
                ],
                'metadata' => [
                    'category' => 'admin',
                    'description' => 'Main dashboard component'
                ]
            ],
            'ReportGenerator' => [
                'component_path' => 'resources/js/components/ReportGenerator.tsx',
                'is_async' => true,
                'default_props' => [
                    'format' => 'pdf',
                    'includeCharts' => true
                ],
                'config' => [
                    'lazy' => true,
                    'cache' => false,
                    'preload' => false
                ]
            ]
        ]
    ]
];
```

### Artisan Commands

```bash
# Create and register a new React component
php artisan make:react-component UserDashboard --register

# Register an existing component
php artisan react:register ProductCard --path=resources/js/components/ProductCard.tsx

# Register all components in a directory
php artisan react:scan resources/js/components --register

# List all registered components
php artisan react:list

# Show component details
php artisan react:show UserDashboard

# Clear component registry
php artisan react:clear
```

### Facade Usage

```php
use HadyFayed\ReactWrapper\Facades\ReactWrapper;

class ComponentController extends Controller
{
    public function registerComponent()
    {
        ReactWrapper::register([
            'name' => 'DynamicChart',
            'component_path' => 'resources/js/charts/DynamicChart.tsx',
            'default_props' => [
                'type' => 'line',
                'animated' => true
            ],
            'config' => [
                'lazy' => true,
                'cache' => false
            ]
        ]);

        return response()->json(['message' => 'Component registered successfully']);
    }

    public function getComponents()
    {
        $components = ReactWrapper::getRegistered();
        return response()->json($components);
    }
}
```

## 🎭 Component Retrieval and Usage

### Getting Components

```typescript
// Check if component exists
if (componentRegistry.has('MyComponent')) {
    console.log('Component is registered');
}

// Get component definition
const definition = componentRegistry.get('MyComponent');
console.log(definition.metadata);

// Get all component names
const names = componentRegistry.getComponentNames();
console.log('Registered components:', names);

// Get registry statistics
const stats = componentRegistry.getStats();
console.log('Total components:', stats.totalComponents);
```

### Creating Component Instances

```typescript
// Create component with default props
const Component = componentRegistry.create('MyComponent');

// Create component with custom props
const CustomComponent = componentRegistry.create('MyComponent', {
    title: 'Custom Title',
    theme: 'dark'
});

// Render component
if (Component) {
    ReactDOM.render(<Component />, document.getElementById('app'));
}
```

### Mounting Components

```typescript
// Mount to DOM element
componentRegistry.mount('MyComponent', 'my-container', {
    title: 'Mounted Component'
});

// Unmount from DOM element
componentRegistry.unmount('my-container');

// Mount multiple components
componentRegistry.batchMount([
    { component: 'Header', container: 'header-container' },
    { component: 'Sidebar', container: 'sidebar-container' },
    { component: 'Content', container: 'content-container' }
]);
```

## 🔌 Middleware System

### Global Middleware

```typescript
// Add analytics tracking to all components
componentRegistry.addMiddleware((component, props, context) => {
    return (componentProps) => {
        React.useEffect(() => {
            analytics.track('component_rendered', {
                component: context.metadata.name,
                category: context.metadata.category,
                props: Object.keys(componentProps)
            });
        }, []);

        return React.createElement(component, componentProps);
    };
});

// Add error boundary to all components
componentRegistry.addMiddleware((component, props, context) => {
    return (componentProps) => {
        const ErrorBoundary = ({ children }) => {
            const [hasError, setHasError] = React.useState(false);

            React.useEffect(() => {
                const errorHandler = (error) => {
                    console.error(`Error in ${context.metadata.name}:`, error);
                    setHasError(true);
                };

                window.addEventListener('error', errorHandler);
                return () => window.removeEventListener('error', errorHandler);
            }, []);

            if (hasError) {
                return <div>Something went wrong in {context.metadata.name}</div>;
            }

            return children;
        };

        return React.createElement(
            ErrorBoundary,
            {},
            React.createElement(component, componentProps)
        );
    };
});
```

### Component-Specific Middleware

```typescript
componentRegistry.register({
    name: 'SecureComponent',
    component: SecureComponent,
    config: {
        middleware: [
            // Authentication middleware
            (component, props, context) => {
                return (componentProps) => {
                    if (!componentProps.user?.authenticated) {
                        return React.createElement('div', {}, 'Access Denied');
                    }
                    return React.createElement(component, componentProps);
                };
            },
            // Logging middleware
            (component, props, context) => {
                return (componentProps) => {
                    console.log(`Rendering ${context.metadata.name} with props:`, componentProps);
                    return React.createElement(component, componentProps);
                };
            }
        ]
    }
});
```

## 📡 Event System

### Listening to Events

```typescript
// Listen to component registration
componentRegistry.on('component:registered', (data) => {
    console.log('Component registered:', data.name);
    
    // Send to analytics
    analytics.track('component_registered', {
        name: data.name,
        category: data.metadata?.category
    });
});

// Listen to component mounting
componentRegistry.on('component:mounted', (data) => {
    console.log('Component mounted:', data.name, 'in', data.container);
});

// Listen to component errors
componentRegistry.on('component:error', (data) => {
    console.error('Component error:', data.name, data.error);
    
    // Send to error tracking
    errorTracker.captureException(data.error, {
        tags: { component: data.name }
    });
});

// Listen to all events
componentRegistry.on('*', (eventType, data) => {
    console.log('Registry event:', eventType, data);
});
```

### Custom Events

```typescript
// Emit custom events
componentRegistry.emit('component:customEvent', {
    component: 'MyComponent',
    action: 'button_clicked',
    data: { buttonId: 'submit' }
});

// Listen to custom events
componentRegistry.on('component:customEvent', (data) => {
    console.log('Custom event:', data);
});
```

## 🔄 Lifecycle Hooks

### Component Lifecycle

```typescript
componentRegistry.register({
    name: 'LifecycleComponent',
    component: MyComponent,
    hooks: {
        beforeMount: (props, container) => {
            console.log('About to mount component');
            return props; // Can modify props
        },
        afterMount: (instance, container) => {
            console.log('Component mounted successfully');
        },
        beforeUnmount: (instance, container) => {
            console.log('About to unmount component');
        },
        afterUnmount: (container) => {
            console.log('Component unmounted');
        },
        onError: (error, componentName) => {
            console.error('Component error:', error);
            errorReporter.captureException(error);
        }
    }
});
```

## 📊 Registry Management

### Registry Information

```typescript
// Get detailed statistics
const stats = componentRegistry.getStats();
console.log({
    totalComponents: stats.totalComponents,
    asyncComponents: stats.asyncComponents,
    cachedComponents: stats.cachedComponents,
    mountedComponents: stats.mountedComponents
});

// Get component by category
const uiComponents = componentRegistry.getByCategory('ui');
const chartComponents = componentRegistry.getByCategory('charts');

// Search components
const searchResults = componentRegistry.search('user', {
    searchInName: true,
    searchInDescription: true,
    searchInTags: true
});
```

### Registry Maintenance

```typescript
// Unregister component
const removed = componentRegistry.unregister('OldComponent');
console.log('Component removed:', removed);

// Clear all components
componentRegistry.clear();

// Reload component registry
componentRegistry.reload();

// Validate registry
const validation = componentRegistry.validate();
if (!validation.valid) {
    console.error('Registry validation errors:', validation.errors);
}
```

## 🎨 Usage in Templates

### Blade Templates

```blade
{{-- Basic usage --}}
<div data-react-component="UserProfile"></div>

{{-- With props --}}
<div 
    data-react-component="UserProfile"
    data-react-props='{
        "userId": {{ $user->id }},
        "editable": {{ auth()->user()->can("edit", $user) ? "true" : "false" }},
        "theme": "{{ $theme }}"
    }'
></div>

{{-- With state synchronization --}}
<div 
    data-react-component="UserProfile"
    data-react-state-path="user.profile"
    data-react-props='@json($user->toArray())'
></div>
```

### Auto-Discovery

Components are automatically discovered and mounted when the page loads:

```javascript
// Manual scan and mount
componentRegistry.scanAndMount();

// Scan specific container
componentRegistry.scanAndMount(document.getElementById('app'));

// Auto-mount on DOM changes (enabled by default)
const observer = new MutationObserver(() => {
    componentRegistry.scanAndMount();
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});
```

## 💡 Best Practices

### 1. Naming Conventions

```typescript
// Use PascalCase for component names
componentRegistry.register({ name: 'UserProfileCard', ... });

// Use descriptive names
componentRegistry.register({ name: 'ProductSearchFilter', ... });

// Include category in complex apps
componentRegistry.register({ name: 'AdminUserManagement', ... });
```

### 2. Metadata Organization

```typescript
componentRegistry.register({
    name: 'DataVisualizationChart',
    component: Chart,
    metadata: {
        category: 'data-visualization',
        subcategory: 'charts',
        description: 'Interactive chart component with multiple visualization types',
        tags: ['chart', 'data', 'interactive', 'responsive'],
        author: 'Data Team',
        version: '2.1.0',
        documentation: 'https://docs.example.com/components/chart',
        examples: [
            'basic-line-chart',
            'multi-series-bar-chart',
            'real-time-dashboard'
        ]
    }
});
```

### 3. Performance Optimization

```typescript
// Use lazy loading for large components
componentRegistry.register({
    name: 'HeavyDashboard',
    component: () => import('./HeavyDashboard'),
    isAsync: true,
    config: {
        lazy: true,
        cache: true,
        preload: false
    }
});

// Preload critical components
componentRegistry.register({
    name: 'CriticalHeader',
    component: Header,
    config: {
        preload: true,
        cache: true
    }
});
```

### 4. Error Handling

```typescript
componentRegistry.register({
    name: 'ReliableComponent',
    component: MyComponent,
    config: {
        onError: (error, componentName) => {
            // Log error
            console.error(`Error in ${componentName}:`, error);
            
            // Report to monitoring service
            errorReporter.captureException(error, {
                tags: { component: componentName }
            });
            
            // Show user-friendly message
            toast.error('Something went wrong. Please try again.');
        },
        fallback: () => (
            <div className="error-fallback">
                Component temporarily unavailable
            </div>
        )
    }
});
```

## 🔧 Debugging

### Debug Mode

```typescript
// Enable debug mode
componentRegistry.setDebugMode(true);

// Check debug status
console.log('Debug mode:', componentRegistry.isDebugMode());

// Get debug information
const debugInfo = componentRegistry.getDebugInfo();
console.log('Registry debug info:', debugInfo);
```

### Registry Inspector

```typescript
// Inspect specific component
const info = componentRegistry.inspect('MyComponent');
console.log('Component info:', info);

// Inspect all components
const allInfo = componentRegistry.inspectAll();
console.log('All components:', allInfo);

// Export registry state
const registryState = componentRegistry.export();
console.log('Registry state:', registryState);
```

---

**Master the Component Registry to unlock the full power of React Wrapper! 🚀**