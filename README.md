# React Wrapper for Laravel/Filament

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Laravel](https://img.shields.io/badge/Laravel-11--13-red.svg)](https://laravel.com)
[![Filament](https://img.shields.io/badge/Filament-3--5-orange.svg)](https://filamentphp.com)

A comprehensive React integration system for Laravel and Filament applications, providing seamless component registration, state management, and real-time synchronization with built-in memory leak prevention and infinite loop protection.

## 🚀 Features

- **🔧 Universal Component System** - Register and render React components anywhere in your Laravel app
- **🎯 Advanced State Management** - Built-in state management with persistence and Livewire sync
- **⚡ Performance Optimized** - Lazy loading, memoization, efficient re-rendering, and memory leak prevention
- **🛡️ Type Safe** - Full TypeScript support with comprehensive type definitions
- **🔄 Real-time Sync** - Bidirectional data flow with Livewire components
- **📦 Zero Config** - Works out of the box with sensible defaults
- **🎨 Filament Ready** - Native integration with Filament admin panels
- **🧩 Extensible** - Plugin system with middleware support
- **🔒 Security First** - XSS protection, input validation, and secure prop handling
- **🚫 Loop Protection** - Built-in infinite loop detection and prevention
- **🧠 Memory Safe** - Automatic cleanup and bounded data structures

## 📦 Installation

### Quick Start

```bash
# Install the PHP package
composer require hadyfayed/filament-react-wrapper
```

Publish the package assets, bootstrap file, and Blade views with:

```bash
php artisan vendor:publish --tag=react-wrapper
```

The package does not require an npm wrapper or a companion Vite plugin. The application only needs its regular React/Vite dependencies.

### Laravel Setup

1. **Add the published bootstrap to your JavaScript entry:**

```javascript
// resources/js/app.js
import './bootstrap-react';
```

2. **Configure Vite with the Composer-published source:**

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.js'],
            refresh: true,
        }),
        react(),
    ],
    resolve: {
        alias: {
            '@react-wrapper': resolve(__dirname, 'resources/js/react-wrapper'),
        },
    },
});
```

3. **Build your assets:**

```bash
npm run build
```

## 🎯 Quick Start

### 1. Register a React Component

```typescript
import { componentRegistry } from '@react-wrapper';
import MyComponent from './components/MyComponent';

// Simple registration
componentRegistry.register({
  name: 'MyComponent',
  component: MyComponent,
  defaultProps: {
    message: 'Hello World!'
  }
});
```

### 2. Use in Blade Templates

```html
<!-- Basic usage -->
<div data-react-component="MyComponent"></div>

<!-- With props -->
<div 
  data-react-component="MyComponent"
  data-react-props='{"title": "Custom Title", "count": 5}'
></div>

<!-- With state synchronization -->
<div 
  data-react-component="MyComponent"
  data-react-state-path="user.preferences"
  data-react-props='{"userId": {{ $user->id }}}'
></div>
```

### 3. Use in Filament

```php
use HadyFayed\ReactWrapper\Components\ReactComponent;

class EditUser extends EditRecord
{
    protected function getHeaderActions(): array
    {
        return [
            ReactComponent::make('UserProfileEditor')
                ->props([
                    'userId' => $this->record->id,
                    'editable' => true
                ])
                ->statePath('userProfile')
        ];
    }
}
```

## 📚 Component Registration

### Basic Registration

```typescript
import { componentRegistry } from '@react-wrapper';

componentRegistry.register({
  name: 'UserCard',
  component: UserCard,
  defaultProps: {
    showAvatar: true,
    size: 'medium'
  },
  metadata: {
    category: 'user',
    description: 'Displays user information in a card format',
    tags: ['user', 'display', 'card']
  }
});
```

### Advanced Registration with Lazy Loading

```typescript
componentRegistry.register({
  name: 'HeavyComponent',
  component: () => import('./components/HeavyComponent'),
  isAsync: true,
  config: {
    lazy: true,
    cache: true,
    preload: false
  },
  metadata: {
    category: 'charts',
    description: 'Advanced data visualization component'
  }
});
```

### Bulk Registration

```typescript
import { registerComponents } from '@react-wrapper';

const components = [
  { name: 'Button', component: Button },
  { name: 'Modal', component: Modal },
  { name: 'Form', component: Form }
];

registerComponents(components);
```

### Registration from Laravel/PHP

You can also register React components from the Laravel/PHP side, which is useful for package authors or when you want to manage component registration through Laravel configuration:

#### Service Provider Registration

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

        // Register components with PHP
        $registry->register([
            'name' => 'UserCard',
            'component_path' => 'resources/js/components/UserCard.tsx',
            'default_props' => [
                'showAvatar' => true,
                'size' => 'medium'
            ],
            'metadata' => [
                'category' => 'user',
                'description' => 'Displays user information in a card format',
                'tags' => ['user', 'display', 'card']
            ]
        ]);

        // Register multiple components
        $registry->registerMany([
            [
                'name' => 'ProductCard',
                'component_path' => 'resources/js/components/ProductCard.tsx',
                'default_props' => ['showPrice' => true],
                'metadata' => ['category' => 'product']
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

#### Configuration-Based Registration

Add to `config/react-wrapper.php`:

```php
<?php

return [
    'components' => [
        'auto_register' => true,
        'scan_directories' => [
            'resources/js/components',
            'resources/js/widgets'
        ],
        'registered_components' => [
            'UserProfile' => [
                'component_path' => 'resources/js/components/UserProfile.tsx',
                'default_props' => ['editable' => false],
                'config' => ['lazy' => false, 'cache' => true],
                'metadata' => [
                    'category' => 'user',
                    'description' => 'User profile management component'
                ]
            ],
            'DataTable' => [
                'component_path' => 'resources/js/components/DataTable.tsx',
                'is_async' => true,
                'default_props' => [
                    'pageSize' => 10,
                    'sortable' => true
                ],
                'config' => [
                    'lazy' => true,
                    'cache' => true,
                    'preload' => false
                ]
            ]
        ]
    ]
];
```

#### Artisan Command for Registration

Generate component registration via Artisan:

```bash
# Create a new React component with auto-registration
php artisan make:react-component UserDashboard --register

# Register an existing component
php artisan react:register ProductCard --path=resources/js/components/ProductCard.tsx

# Register multiple components from a directory
php artisan react:scan resources/js/components --register
```

#### Facade Usage

Use the ReactWrapper facade for quick registration:

```php
<?php

use HadyFayed\ReactWrapper\Facades\ReactWrapper;

// In a controller, middleware, or service
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
                'cache' => false // Don't cache dynamic components
            ]
        ]);

        return response()->json(['message' => 'Component registered successfully']);
    }

    public function getRegisteredComponents()
    {
        $components = ReactWrapper::getRegistered();
        return response()->json($components);
    }
}
```

#### Package Integration

For Laravel package authors:

```php
<?php

namespace YourPackage\Providers;

use Illuminate\Support\ServiceProvider;
use HadyFayed\ReactWrapper\Services\ReactComponentRegistry;

class YourPackageServiceProvider extends ServiceProvider
{
    public function boot()
    {
        // Register package components automatically
        $this->registerPackageComponents();
        
        // Publish package components
        $this->publishes([
            __DIR__.'/../resources/js/components' => resource_path('js/vendor/your-package'),
        ], 'your-package-components');
    }

    protected function registerPackageComponents()
    {
        $registry = app(ReactComponentRegistry::class);

        $packageComponents = [
            'PackageWidget' => [
                'component_path' => 'js/vendor/your-package/PackageWidget.tsx',
                'default_props' => ['theme' => 'package-default'],
                'metadata' => [
                    'category' => 'package-widgets',
                    'package' => 'your-package',
                    'version' => '1.0.0'
                ]
            ]
        ];

        foreach ($packageComponents as $name => $config) {
            $registry->register(array_merge($config, ['name' => $name]));
        }
    }
}
```

#### Dynamic Registration in Filament

Register components dynamically in Filament resources:

```php
<?php

namespace App\Filament\Resources;

use Filament\Resources\Resource;
use HadyFayed\ReactWrapper\Services\ReactComponentRegistry;

class UserResource extends Resource
{
    public static function boot()
    {
        parent::boot();
        
        // Register resource-specific components
        app(ReactComponentRegistry::class)->register([
            'name' => 'UserResourceChart',
            'component_path' => 'resources/js/filament/UserResourceChart.tsx',
            'default_props' => [
                'resource' => 'users',
                'metric' => 'registrations'
            ]
        ]);
    }

    public static function form(Form $form): Form
    {
        return $form->schema([
            ReactField::make('user_analytics')
                ->component('UserResourceChart')
                ->props(['userId' => fn($record) => $record?->id])
                ->visible(fn($record) => $record !== null)
        ]);
    }
}
```

## 🎯 State Management

### Using State Manager Provider

```typescript
import { StateManagerProvider, useStateManager } from '@react-wrapper';

function App() {
  return (
    <StateManagerProvider
      initialState={{ user: { name: 'John' } }}
      onStateChange={(state) => console.log('State changed:', state)}
      syncPath="app.state"
    >
      <MyComponent />
    </StateManagerProvider>
  );
}

function MyComponent() {
  const { state, setState, getState } = useStateManager();
  
  const updateUser = () => {
    setState('user.name', 'Jane Doe');
  };
  
  return (
    <div>
      <p>User: {getState('user.name')}</p>
      <button onClick={updateUser}>Update Name</button>
    </div>
  );
}
```

### Using State Path Hook

```typescript
import { useStatePath } from '@react-wrapper';

function UserProfile() {
  const [user, setUser] = useStatePath('user', { name: '', email: '' });
  
  return (
    <form>
      <input
        value={user.name}
        onChange={(e) => setUser(prev => ({ ...prev, name: e.target.value }))}
      />
      <input
        value={user.email}
        onChange={(e) => setUser(prev => ({ ...prev, email: e.target.value }))}
      />
    </form>
  );
}
```

### Global State Manager

```typescript
import { globalStateManager } from '@react-wrapper';

// Set global state
globalStateManager.setState('app.theme', 'dark');

// Get global state
const theme = globalStateManager.getState('app.theme');

// Subscribe to changes
const unsubscribe = globalStateManager.subscribe('app.theme', (newTheme) => {
  console.log('Theme changed to:', newTheme);
});

// Clean up
unsubscribe();
```

## 💾 State Persistence

### Using Persisted State Hook

```typescript
import { usePersistedState } from '@react-wrapper';

function ThemeSelector() {
  const [theme, setTheme] = usePersistedState('theme', 'light', {
    storage: 'localStorage',
    syncWithLivewire: true,
    livewirePath: 'user.theme'
  });
  
  return (
    <select value={theme} onChange={(e) => setTheme(e.target.value)}>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  );
}
```

### Manual Persistence Service

```typescript
import { statePersistenceService } from '@react-wrapper';

// Register a persistence config
statePersistenceService.register({
  key: 'userPreferences',
  storage: 'localStorage',
  syncWithLivewire: true,
  livewirePath: 'user.preferences',
  debounceMs: 500,
  transformer: {
    serialize: (data) => JSON.stringify(data),
    deserialize: (data) => JSON.parse(data)
  }
});

// Save data
statePersistenceService.save('userPreferences', {
  theme: 'dark',
  language: 'en'
});

// Load data
const preferences = statePersistenceService.load('userPreferences');
```

## 🎨 Filament Integration

### Creating Filament Components

```php
<?php

namespace App\Filament\Components;

use HadyFayed\ReactWrapper\Components\ReactComponent;

class UserDashboard extends ReactComponent
{
    protected string $component = 'UserDashboard';
    
    public static function make(string $component = null): static
    {
        return new static($component ?? static::$component);
    }
    
    public function userId(int $userId): static
    {
        $this->props(['userId' => $userId]);
        return $this;
    }
    
    public function editable(bool $editable = true): static
    {
        $this->props(['editable' => $editable]);
        return $this;
    }
}
```

### Using in Filament Pages

```php
use App\Filament\Components\UserDashboard;

class Dashboard extends Page
{
    protected static string $view = 'filament.pages.dashboard';
    
    protected function getHeaderWidgets(): array
    {
        return [
            UserDashboard::make()
                ->userId(auth()->id())
                ->editable(true)
                ->statePath('dashboard.user')
        ];
    }
}
```

### Form Field Integration

```php
use HadyFayed\ReactWrapper\Forms\Components\ReactField;

class UserForm extends Form
{
    public function form(Form $form): Form
    {
        return $form->schema([
            ReactField::make('profile_editor')
                ->component('UserProfileEditor')
                ->props([
                    'allowImageUpload' => true,
                    'maxImageSize' => '2MB'
                ])
                ->statePath('profile')
                ->reactive()
                ->afterStateUpdated(function ($state) {
                    // Handle state updates
                    $this->user->update($state);
                })
        ]);
    }
}
```

## 🔧 Advanced Features

### Middleware System

```typescript
import { componentRegistry } from '@react-wrapper';

// Global middleware
componentRegistry.addMiddleware((component, props, context) => {
  // Add analytics tracking
  return (componentProps) => {
    React.useEffect(() => {
      analytics.track('component_rendered', {
        component: context.metadata.name,
        props: Object.keys(componentProps)
      });
    }, []);
    
    return React.createElement(component, componentProps);
  };
});

// Component-specific middleware
componentRegistry.register({
  name: 'SecureComponent',
  component: SecureComponent,
  config: {
    middleware: [
      (component, props, context) => {
        // Add authentication check
        return (componentProps) => {
          if (!componentProps.user?.authenticated) {
            return React.createElement('div', null, 'Access Denied');
          }
          return React.createElement(component, componentProps);
        };
      }
    ]
  }
});
```

### Error Handling

All components are automatically wrapped with error boundaries that provide:

- Graceful error display
- Error reporting to console
- Retry functionality
- Custom error handlers

```typescript
componentRegistry.register({
  name: 'RiskyComponent',
  component: RiskyComponent,
  config: {
    onError: (error, componentName) => {
      // Custom error handling
      console.error(`Error in ${componentName}:`, error);
      // Report to error tracking service
      errorTracker.report(error, { component: componentName });
    }
  }
});
```

## 🚀 Performance & Memory Safety

### Memory Leak Prevention

The system includes comprehensive protection against memory leaks:

```typescript
// Automatic cleanup on component unmount
React.useEffect(() => {
  const unsubscribe = globalStateManager.subscribe('user.data', handleUserChange);
  
  return () => {
    unsubscribe(); // Automatic cleanup
  };
}, []);

// Bounded data structures prevent unlimited growth
// Maximum 1000 entries in persistence service with automatic cleanup
```

### Infinite Loop Protection

Built-in protection against infinite loops in state updates:

```typescript
// Circular notification detection
if (this._notifyingPaths.has(path)) {
  console.warn(`Circular notification detected for path: ${path}`);
  return; // Prevents infinite loops
}
```

### Performance Optimizations

- **Memoization** - Automatic memoization of components and state
- **Debouncing** - Built-in debouncing for state changes and notifications
- **Lazy Loading** - Code splitting for large components
- **Efficient Re-rendering** - Smart prop comparison and update batching

## 🔒 Security Features

### Input Validation

```typescript
// Validate props before rendering
componentRegistry.register({
  name: 'SecureComponent',
  component: SecureComponent,
  config: {
    middleware: [
      (component, props, context) => {
        return (componentProps) => {
          // Validate props
          const validatedProps = validateProps(componentProps, {
            userId: 'number',
            email: 'email',
            role: ['admin', 'user', 'guest']
          });
          
          return React.createElement(component, validatedProps);
        };
      }
    ]
  }
});
```

### XSS Prevention

```typescript
// Sanitize HTML content
import DOMPurify from 'dompurify';

const SafeComponent = ({ htmlContent }) => {
  const sanitizedHTML = DOMPurify.sanitize(htmlContent);
  return <div dangerouslySetInnerHTML={{ __html: sanitizedHTML }} />;
};
```

## 🛠️ API Reference

### Component Registry

```typescript
interface IComponentRegistry {
  register(definition: IComponentDefinition): void;
  get(name: string): IComponentDefinition | undefined;
  create(name: string, props?: Record<string, any>): React.ComponentType<any> | null;
  has(name: string): boolean;
  unregister(name: string): boolean;
  clear(): void;
  getComponentNames(): string[];
  getStats(): ComponentStats;
  mount(componentName: string, containerId: string, props?: Record<string, any>): void;
  unmount(containerId: string): void;
  on(event: string, callback: Function, priority?: number): void;
  off(event: string, callback: Function): void;
}
```

### State Manager

```typescript
interface IStateManager {
  setState(path: string, value: any): void;
  updateState(path: string, updater: (current: any) => any): void;
  getState(path: string): any;
  resetState(newState?: StateManagerState): void;
  batchUpdate(updates: Array<{ path: string; value: any }>): void;
  subscribe(path: string, callback: (value: any) => void): () => void;
}
```

### Hooks

```typescript
// State Manager Hook
const useStateManager = (): StateManagerContextType => { ... };

// State Path Hook
const useStatePath = <T = any>(
  path: string,
  defaultValue?: T
): [T, (value: T | ((prev: T) => T)) => void] => { ... };

// Persisted State Hook
const usePersistedState = <T>(
  key: string,
  defaultValue: T,
  config?: Partial<StatePersistenceConfig>
): [T, (value: T | ((prev: T) => T)) => void] => { ... };
```

### PHP/Laravel API

#### ReactComponentRegistry Service

```php
<?php

namespace HadyFayed\ReactWrapper\Services;

interface ReactComponentRegistryInterface
{
    public function register(array $definition): void;
    public function registerMany(array $definitions): void;
    public function get(string $name): ?array;
    public function has(string $name): bool;
    public function unregister(string $name): bool;
    public function clear(): void;
    public function getRegistered(): array;
    public function getStats(): array;
    public function scan(string $directory): array;
}
```

#### ReactWrapper Facade

```php
<?php

use HadyFayed\ReactWrapper\Facades\ReactWrapper;

// Register component
ReactWrapper::register([
    'name' => 'ComponentName',
    'component_path' => 'path/to/component.tsx',
    'default_props' => ['prop' => 'value'],
    'config' => ['lazy' => true, 'cache' => true],
    'metadata' => ['category' => 'widgets']
]);

// Register multiple components
ReactWrapper::registerMany($components);

// Get component definition
$definition = ReactWrapper::get('ComponentName');

// Check if component exists
$exists = ReactWrapper::has('ComponentName');

// Get all registered components
$components = ReactWrapper::getRegistered();

// Get registration statistics
$stats = ReactWrapper::getStats();

// Scan directory for components
$found = ReactWrapper::scan('resources/js/components');
```

#### ReactField Form Component

```php
<?php

use HadyFayed\ReactWrapper\Forms\Components\ReactField;

ReactField::make('field_name')
    ->component('ComponentName')           // React component name
    ->props(['key' => 'value'])           // Component props
    ->defaultProps(['default' => true])   // Default props
    ->statePath('form.field')             // State synchronization path
    ->height(400)                         // Container height
    ->width('100%')                       // Container width
    ->reactive()                          // Make field reactive
    ->live()                             // Enable live updates
    ->debounce(300)                      // Debounce updates (ms)
    ->afterStateUpdated(fn($state) => ...) // State change callback
    ->visible(fn($get) => $get('show'))   // Conditional visibility
    ->disabled(fn($get) => !$get('edit')) // Conditional disable
    ->required()                          // Mark as required
    ->columnSpan(2)                       // Grid column span
    ->extraAttributes(['class' => 'custom']); // Additional HTML attributes
```

#### ReactWidget

```php
<?php

use HadyFayed\ReactWrapper\Widgets\ReactWidget;

class CustomWidget extends ReactWidget
{
    protected string $component = 'WidgetComponent';
    
    protected function getProps(): array
    {
        return [
            'title' => 'Widget Title',
            'data' => $this->getData(),
            'config' => $this->getConfig()
        ];
    }
    
    protected function getHeight(): ?string
    {
        return '300px';
    }
    
    protected function getStatePath(): ?string
    {
        return 'widgets.custom';
    }
    
    public static function canView(): bool
    {
        return auth()->user()?->can('view-widgets') ?? false;
    }
}
```

#### Configuration Options

```php
<?php

// config/react-wrapper.php
return [
    'debug' => env('REACT_WRAPPER_DEBUG', false),
    'cache_components' => env('REACT_WRAPPER_CACHE', true),
    'preload_components' => env('REACT_WRAPPER_PRELOAD', false),
    'max_state_size' => env('REACT_WRAPPER_MAX_STATE_SIZE', 1000),
    
    'components' => [
        'auto_register' => true,
        'scan_directories' => [
            'resources/js/components',
            'resources/js/widgets'
        ],
        'registered_components' => [
            // Component definitions
        ]
    ],
    
    'memory_safety' => [
        'max_subscriptions_per_path' => 100,
        'cleanup_interval' => 300000, // 5 minutes
        'enable_loop_detection' => true,
    ],
    
    'security' => [
        'validate_props' => true,
        'sanitize_html' => true,
        'max_prop_size' => 1024 * 1024, // 1MB
    ]
];
```

#### Artisan Commands

```bash
# Create React component with registration
php artisan make:react-component ComponentName --register

# Register existing component
php artisan react:register ComponentName --path=resources/js/components/ComponentName.tsx

# Scan and register components from directory
php artisan react:scan resources/js/components --register

# List registered components
php artisan react:list

# Clear component registry
php artisan react:clear

# Show component statistics
php artisan react:stats

# Generate component registration file
php artisan react:export --output=bootstrap-components.php
```

#### Event Hooks

```php
<?php

use HadyFayed\ReactWrapper\Events\ComponentRegistered;
use HadyFayed\ReactWrapper\Events\ComponentRendered;

// Listen for component registration
Event::listen(ComponentRegistered::class, function ($event) {
    Log::info('Component registered: ' . $event->componentName);
});

// Listen for component rendering
Event::listen(ComponentRendered::class, function ($event) {
    // Track component usage
    Analytics::track('component_rendered', [
        'component' => $event->componentName,
        'props' => $event->props
    ]);
});
```

## 🐛 Debugging & Troubleshooting

### Enable Debug Mode

```typescript
// Enable debug logging
window.ReactWrapperConfig = {
  debug: true,
  logLevel: 'verbose'
};
```

### Common Issues

#### Component Not Found

```typescript
// Check if component is registered
if (!componentRegistry.has('MyComponent')) {
  console.log('Available components:', componentRegistry.getComponentNames());
}

// Check component statistics
console.log('Registry stats:', componentRegistry.getStats());
```

#### State Not Syncing

```typescript
// Check Livewire connection
if (!window.workflowDataSync) {
  console.warn('Livewire sync not available');
}

// Monitor state changes
globalStateManager.subscribe('', (state) => {
  console.log('Global state changed:', state);
});
```

#### Memory Leaks

```typescript
// Monitor subscription counts
console.log('Active subscriptions:', globalStateManager.subscribers.size);

// Monitor active components
console.log('Active components:', universalReactRenderer.getActiveContainers());
```

## 📊 Testing

### Unit Testing Components

```typescript
import { render, screen } from '@testing-library/react';
import { componentRegistry } from '@react-wrapper';
import MyComponent from './MyComponent';

describe('Component Registry', () => {
  beforeEach(() => {
    componentRegistry.clear();
  });

  test('registers and creates component', () => {
    componentRegistry.register({
      name: 'TestComponent',
      component: MyComponent
    });

    expect(componentRegistry.has('TestComponent')).toBe(true);
    
    const Component = componentRegistry.create('TestComponent', { title: 'Test' });
    expect(Component).toBeDefined();
  });
});
```

### Integration Testing

```typescript
import { StateManagerProvider, useStatePath } from '@react-wrapper';

const TestComponent = () => {
  const [value, setValue] = useStatePath('test.value', 'initial');
  return (
    <div>
      <span data-testid="value">{value}</span>
      <button onClick={() => setValue('updated')}>Update</button>
    </div>
  );
};

test('state management works', () => {
  render(
    <StateManagerProvider>
      <TestComponent />
    </StateManagerProvider>
  );
  
  expect(screen.getByTestId('value')).toHaveTextContent('initial');
  
  fireEvent.click(screen.getByText('Update'));
  expect(screen.getByTestId('value')).toHaveTextContent('updated');
});
```

## 🚀 Deployment

### Production Build

```bash
# Build for production
npm run build

# Laravel asset compilation
php artisan filament:assets
```

### Environment Configuration

```php
// config/react-wrapper.php
return [
    'debug' => env('REACT_WRAPPER_DEBUG', false),
    'cache_components' => env('REACT_WRAPPER_CACHE', true),
    'preload_components' => env('REACT_WRAPPER_PRELOAD', false),
    'max_state_size' => env('REACT_WRAPPER_MAX_STATE_SIZE', 1000),
    'memory_safety' => [
        'max_subscriptions_per_path' => 100,
        'cleanup_interval' => 300000, // 5 minutes
        'enable_loop_detection' => true,
    ],
];
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/hadyfayed/filament-react-wrapper.git

# Install dependencies
npm install
composer install

# Run tests
npm test
php artisan test

# Start development server
npm run dev
php artisan serve
```

### Code Style

We use ESLint and Prettier for code formatting:

```bash
npm run lint
npm run format
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with ❤️ for the Laravel and React communities
- Inspired by modern component architecture patterns
- Special thanks to all contributors and maintainers

## 📞 Support

- 📚 [Documentation](https://docs.hadyfayed.com/react-wrapper)
- 💬 [Discussions](https://github.com/hadyfayed/filament-react-wrapper/discussions)
- 🐛 [Issue Tracker](https://github.com/hadyfayed/filament-react-wrapper/issues)
- 📧 [Email Support](mailto:support@hadyfayed.com)

---

<div align="center">
  <p>Made with ❤️ by <a href="https://hadyfayed.com">Hady Fayed</a></p>
  <p>
    <a href="https://github.com/hadyfayed/filament-react-wrapper/stargazers">⭐ Star us on GitHub</a> •
    <a href="https://twitter.com/hadyfayed">🐦 Follow on Twitter</a> •
    <a href="https://hadyfayed.com/blog">📝 Read our Blog</a>
  </p>
</div>
