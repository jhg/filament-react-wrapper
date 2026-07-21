# Installation Guide

This guide will walk you through installing and setting up React Wrapper in your Laravel/Filament application.

## 📋 Requirements

### System Requirements
- **Node.js**: 20.0+ (required by the Vite 7 toolchain)
- **PHP**: 8.2+ (8.3+ for Laravel 13)
- **Laravel**: 11.x, 12.x, or 13.x
- **Filament**: 3.x, 4.x, or 5.x
- **Livewire**: 3.x or 4.x

### Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 📦 Package Installation

### 1. Install the PHP package

```bash
composer require hadyfayed/filament-react-wrapper
```

### 2. Publish package assets

```bash
php artisan vendor:publish --tag=react-wrapper
```

This publishes the JavaScript source under `resources/js/react-wrapper/`, the bootstrap file, the configuration, and the Blade view overrides.

## 🔧 Laravel Setup

### 1. Publish Configuration

```bash
php artisan vendor:publish --provider="HadyFayed\ReactWrapper\ReactWrapperServiceProvider"
```

This publishes:
- Configuration file to `config/react-wrapper.php`
- JavaScript assets to `resources/js/react-wrapper/`
- Bootstrap file to `resources/js/bootstrap-react.tsx`

### 2. Add to Your JavaScript Build

```javascript
// resources/js/app.js
import './bootstrap-react';
```

### 3. Configure Vite

Update your `vite.config.js`:

```javascript
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
            '@': resolve(__dirname, 'resources/js'),
            '@react-wrapper': resolve(__dirname, 'resources/js/react-wrapper'),
        },
    },
});
```

### 4. Install React Dependencies

```bash
# Install React runtime
npm install react@^18.0.0 react-dom@^18.0.0

# Install Vite React plugin
npm install -D @vitejs/plugin-react@^4.6.0
```

### 5. Build Assets

```bash
npm run build
```

## 🎨 Filament Integration

### 1. No panel plugin is required

The package integrates directly with Filament and its service provider is discovered automatically by Laravel.

### 2. Alternative: Manual Registration

If you prefer manual registration, add to your service provider:

```php
// app/Providers/AppServiceProvider.php
use HadyFayed\ReactWrapper\Services\ReactComponentRegistry;

public function boot()
{
    $registry = app(ReactComponentRegistry::class);
    
    // Your component registrations here
}
```

## ⚙️ Configuration

### Basic Configuration

Edit `config/react-wrapper.php`:

```php
return [
    'debug' => env('REACT_WRAPPER_DEBUG', false),
    'cache_components' => env('REACT_WRAPPER_CACHE', true),
    'preload_components' => env('REACT_WRAPPER_PRELOAD', false),
    
    'components' => [
        'auto_register' => true,
        'scan_directories' => [
            'resources/js/components',
            'resources/js/widgets'
        ],
    ],
    
    'integrations' => [
        'filament' => [
            'enabled' => true,
            'auto_register' => true,
        ],
    ],
];
```

### Environment Variables

Add to your `.env` file:

```env
REACT_WRAPPER_DEBUG=false
REACT_WRAPPER_CACHE=true
REACT_WRAPPER_PRELOAD=false
```

## 📁 Directory Structure

After installation, your project structure should include:

```
your-laravel-app/
├── config/
│   └── react-wrapper.php
├── resources/
│   └── js/
│       ├── bootstrap-react.tsx
│       ├── components/          # Your React components
│       └── react-wrapper/       # Published package assets
├── composer.json                # Updated with package
├── package.json                # Updated with dependencies
└── vite.config.js              # Updated with React plugin
```

## ✅ Verification

### 1. Check Installation

Create a test route to verify installation:

```php
// routes/web.php
Route::get('/react-test', function () {
    return view('react-test');
});
```

```blade
{{-- resources/views/react-test.blade.php --}}
<!DOCTYPE html>
<html>
<head>
    <title>React Wrapper Test</title>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body>
    <div id="react-test" data-react-component="TestComponent"></div>
</body>
</html>
```

### 2. Register a Test Component

```typescript
// resources/js/components/TestComponent.tsx
import React from 'react';

const TestComponent = ({ message = 'Hello from React Wrapper!' }) => (
    <div style={{ padding: '1rem', border: '2px solid #4F46E5', borderRadius: '8px' }}>
        <h2>🎉 React Wrapper Working!</h2>
        <p>{message}</p>
    </div>
);

export default TestComponent;
```

```javascript
// resources/js/app.js
import '@react-wrapper';
import TestComponent from './components/TestComponent';

// Register the component
window.ReactComponentRegistry.register({
    name: 'TestComponent',
    component: TestComponent,
    defaultProps: {
        message: 'Installation successful!'
    }
});
```

### 3. Test the Installation

1. Build your assets: `npm run build`
2. Visit `/react-test` in your browser
3. You should see the test component rendered

## 🚨 Troubleshooting

### Common Issues

#### Build Errors
```bash
# Clear caches and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### React Not Found
```bash
# Ensure React is installed
npm install react@^18.0.0 react-dom@^18.0.0
```

#### Vite Plugin Issues
```bash
# Install Vite React plugin
npm install -D @vitejs/plugin-react
```

#### Component Not Rendering
1. Check browser console for errors
2. Verify component is registered
3. Ensure data attributes are correct
4. Check that assets are built and loaded

#### Filament Integration Issues
1. Clear Filament cache: `php artisan filament:cache-components`
2. Clear Laravel cache: `php artisan cache:clear`
3. Verify plugin is registered in panel provider

### Debug Mode

Enable debug mode for detailed logging:

```env
REACT_WRAPPER_DEBUG=true
```

Check browser console for detailed debug information.

## 🔄 Next Steps

After successful installation:

1. 📖 Read the [Quick Start Guide](./quick-start.md)
2. 🎯 Learn about [Component Registry](./component-registry.md)
3. 🎨 Explore [Filament Integration](./filament-integration.md)
4. 🛠️ Set up [Development Tools](./dev-tools.md)

---

**Installation complete! Ready to build amazing React components in Laravel! 🚀**
