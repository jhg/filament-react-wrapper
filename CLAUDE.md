# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React Wrapper package for Laravel/Filament applications - an enterprise-grade React integration system that provides seamless component registration, state management, and real-time synchronization. It's both an NPM package (@hadyfayed/filament-react-wrapper) and a Composer package (hadyfayed/filament-react-wrapper).

## Architecture

### Dual Package Structure
- **NPM Package**: TypeScript/React components and services in `resources/js/`
- **Composer Package**: PHP Laravel/Filament integration in `src/`
- **Hybrid Build**: Produces both ES modules for NPM and Laravel-specific bundles

### Core Components

#### React/TypeScript Side (`resources/js/`)
- **Main Entry**: `index.tsx` - Central export point for all functionality
- **Component Registry**: `components/ReactComponentRegistry.tsx` - Dynamic component registration system
- **Universal Renderer**: `components/UniversalReactRenderer.tsx` - Renders components from DOM attributes
- **State Manager**: `components/StateManager.tsx` - Global state management with React context
- **Filament Adapter**: `components/adapters/FilamentReactAdapter.tsx` - Filament-specific integration
- **Services**: Code splitting, persistence, dev tools, and component versioning

#### PHP/Laravel Side (`src/`)
- **Service Provider**: `ReactWrapperServiceProvider.php` - Main Laravel integration point
- **Component Registry**: `Services/ReactComponentRegistry.php` - Server-side component management
- **Forms Integration**: `Forms/Components/ReactField.php` - Filament form field integration
- **Widgets**: `Widgets/ReactWidget.php` - Filament widget integration
- **Asset Management**: `Services/AssetManager.php` - Handles asset loading and Vite integration
- **Blade Directives**: `Blade/ReactDirective.php` - Custom Blade directives for React components

## Development Commands

### Build Commands
```bash
# Build for all targets (ES, Laravel, UMD)
npm run build:all

# Build specific targets
npm run build          # ES modules only
npm run build:laravel  # Laravel-specific bundle
npm run build:umd      # UMD bundle for CDN usage

# Development with watch mode
npm run dev

# Custom build script with advanced options
node scripts/build.js --target=all --verbose --skip-tests
```

### Vite Integration
The package uses the application's regular Laravel/Vite setup. The Composer
service provider publishes the JavaScript source and bootstrap entry point;
there is no companion Vite plugin.

- **Auto-discovery**: Components are discovered by the PHP integration when enabled
- **PHP Registry**: Server-side component registry remains available
- **Dual Build**: NPM and Laravel asset targets remain available

### Development Tools
```bash
# Type checking
npm run typecheck

# Linting and formatting
npm run lint           # ESLint with auto-fix
npm run lint:check     # ESLint without auto-fix
npm run format         # Prettier formatting
npm run format:check   # Check formatting without changes

# Testing
npm run test           # Run tests once
npm run test:watch     # Watch mode for development
npm run test:coverage  # Generate coverage report

# Continuous Integration
npm run ci             # Full CI pipeline: typecheck + lint + format + test

# Bundle analysis
npm run analyze        # Analyze bundle size and dependencies
```

### PHP/Laravel Commands
```bash
# Publish package assets
php artisan vendor:publish --tag=react-wrapper

# Integration reports
php artisan react-wrapper:integration-report

# Component auto-discovery (automatic, but can be run manually)
# Discovers React components in configured directories and registers them
```

## Key Configuration Files

### Build Configuration
- **`vite.config.js`**: Main Vite config for ES module builds with DTS generation
- **`vite.laravel.config.js`**: Laravel-specific build configuration
- **`scripts/build.js`**: Advanced build script with multiple targets and validation
- **`vitest.config.ts`**: Test configuration with JSDOM environment

### TypeScript & Linting
- **`tsconfig.json`**: Strict TypeScript configuration with path aliases
- **`eslint.config.js`**: ESLint configuration with React and TypeScript rules

### Package Configuration
- **`package.json`**: NPM package with ES module exports and comprehensive scripts
- **`composer.json`**: Composer package for Laravel integration with auto-discovery

## Architecture Patterns

### Component Registration
Components can be registered from either JavaScript or PHP:

**JavaScript Registration:**
```typescript
import { componentRegistry } from '@hadyfayed/filament-react-wrapper';
componentRegistry.register({
  name: 'UserCard',
  component: UserCard,
  defaultProps: { showAvatar: true }
});
```

**PHP Registration:**
```php
$registry = app(ReactComponentRegistry::class);
$registry->register('UserCard', UserCard::class, [
    'default_props' => ['showAvatar' => true]
]);
```

### State Management Architecture
- **Global State Manager**: Singleton service for cross-component state
- **React Context**: Component-level state with React hooks
- **Persistence Service**: Automatic state persistence with configurable storage
- **Filament Integration**: Two-way data binding with Filament forms and Livewire

### Asset Management
- **Vite Integration**: Seamless development with hot module replacement
- **Lazy Loading**: Components can be loaded on-demand with code splitting
- **Version Management**: Automatic component versioning and cache busting
- **Multi-format Output**: ES modules, Laravel bundles, and UMD for different use cases

## Security & Performance Features

### Memory Safety
- **Bounded Data Structures**: Automatic cleanup to prevent memory leaks
- **Subscription Management**: Automatic cleanup of event listeners
- **Infinite Loop Protection**: Built-in detection and prevention of circular updates

### Performance Optimizations
- **Memoization**: Automatic component and state memoization
- **Debouncing**: Built-in debouncing for state changes
- **Code Splitting**: Automatic chunking for large components
- **Bundle Analysis**: Built-in bundle size monitoring

## Testing Approach

### Unit Testing
- **Vitest**: Modern test runner with TypeScript support
- **Testing Library**: React Testing Library for component testing
- **Coverage**: Comprehensive coverage reporting with exclusions for build files

### Integration Testing
- **Component Registry**: Tests for registration and creation
- **State Management**: Tests for state synchronization and persistence
- **Filament Integration**: Tests for form fields and widgets

## Common Development Patterns

### Adding New Components
1. Create component in `resources/js/components/`
2. Export from appropriate service/registry file
3. Add to main `index.tsx` exports
4. Register via JavaScript or PHP as needed
5. Write tests in `tests/components/`

### Extending State Management
1. Add new state paths to type definitions
2. Implement state logic in `StateManager.tsx`
3. Add persistence configuration if needed
4. Update Filament integration for two-way binding

### Build Process Customization
1. Modify `scripts/build.js` for new build targets
2. Update Vite configurations for different output formats
3. Add validation steps in build script
4. Update CI/CD pipeline in package.json scripts

## Key Integration Points

### With Laravel/Filament
- Service provider auto-registers with Laravel
- Filament panels automatically discover and load the package
- Blade directives enable template integration
- Form fields and widgets provide UI integration points

### With Vite/Build Tools
- Multiple Vite configurations for different build targets
- Asset manifest generation for Laravel integration
- Hot module replacement in development
- Production optimization and minification
