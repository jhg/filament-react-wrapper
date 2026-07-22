# Release Notes

## Version 3.2.0 (2025-07-15) 🚀

### 🎯 Major Improvements

#### 🔗 Simplified Vite Integration
- The package now uses the application's regular Laravel/Vite setup.
- No companion Vite plugin is required.
- Component registration, code splitting, and PHP registry support remain available through the package itself.

#### 📚 Documentation Overhaul
- **Updated README**: Standard Laravel/Vite integration examples
- **Installation Guide**: Composer-published assets and standard Vite configuration
- **Best Practice Examples**: Real-world usage patterns and configuration options

### 🔧 Technical Improvements

#### Build System Modernization
- **Vite v7 Compatibility**: Full support for the latest Vite version
- **ESLint v9 Upgrade**: Modern linting with improved TypeScript support
- **Improved Build Structure**: Organized output in `dist/react-wrapper/` for better clarity
- **Enhanced Type Definitions**: Better browser API support and global type definitions

#### Code Quality Enhancements
- **Zero Critical Errors**: All ESLint errors resolved
- **Standardized Dependencies**: Consistent versions across the project
- **Enhanced Testing**: All tests passing with improved output validation
- **Better Type Safety**: Improved TypeScript compatibility and definitions

### 🆕 New Features

#### Developer Experience
- **Configuration Examples**: Standard Vite configuration
- **Pro Tips**: Inline documentation with best practice recommendations

#### Enhanced Compatibility
- **React Hooks Plugin v5.2.0**: Updated for ESLint v9 compatibility
- **Prettier v3.6.2**: Standardized code formatting across the project
- **Modern Browser APIs**: Support for IdleDeadline, PerformanceObserver, and more

### 📦 Package Updates

#### Dependencies
- **Vite**: Updated to v7.0.2 for improved performance
- **ESLint**: Upgraded to v9.30.1 with enhanced TypeScript rules
- **@vitejs/plugin-react**: Updated to v4.6.0 for better React support
- **TypeScript**: Enhanced type definitions and compiler options

#### Build Configuration
- **Output Organization**: Better structured build output
- **Bundle Optimization**: Improved chunk splitting and size optimization
- **Asset Management**: Enhanced asset loading and caching strategies

### 🔄 Breaking Changes

⚠️ **Build Output Structure**
- **Path Change**: Build output moved from `dist/` to `dist/react-wrapper/`
- **Type Definitions**: Now located at `dist/react-wrapper/types/index.d.ts`
- **Migration**: No action needed - package.json exports updated automatically

### 🐛 Bug Fixes

#### ESLint and TypeScript
- **Global Definitions**: Fixed `IdleDeadline` and `PerformanceObserver` not defined errors
- **React Hooks**: Resolved compatibility issues with ESLint v9
- **Build Validation**: Updated build script for new output structure

#### Development Tools
- **Linting Pipeline**: Fixed CI/CD pipeline issues
- **Test Environment**: Improved test stability and output
- **Type Checking**: Enhanced TypeScript validation

### 🎨 Enhanced Documentation

#### README Improvements
- Installation instructions now use the Composer-published bootstrap and standard Laravel Vite configuration.

#### Installation Guide Updates
- **Plugin Benefits**: Clear explanation of enhanced features
- **Configuration Options**: Both basic and advanced setups
- **Troubleshooting**: Common issues and solutions

### 🔗 Integration Benefits

#### Integration Benefits
- **Auto-Discovery**: No manual component registration needed when enabled in configuration
- **Performance**: Automatic optimization and lazy loading
- **PHP Bridge**: Server-side component registry generation

### 📊 Performance Improvements

- **Bundle Size**: Optimized output with better tree shaking
- **Load Time**: Improved asset loading with enhanced caching
- **Development**: Faster builds with modern tooling
- **Runtime**: Better memory management and performance monitoring

### 🚀 Migration Guide

#### From v3.1.x to v3.2.0

**Basic Update:**
```bash
composer update hadyfayed/filament-react-wrapper
```

**JavaScript setup:**
```bash
php artisan filament-react:install
```

### 🎯 What's Next

- **Advanced Dev Tools**: Enhanced debugging and inspection capabilities
- **Performance Monitoring**: Real-time performance analysis
- **Component Generator**: CLI tools for rapid component creation
- **Testing Utilities**: Improved testing helpers and utilities

### 🙏 Contributors

This release focuses on enhanced developer experience and better integration with the modern Vite ecosystem while maintaining full backward compatibility.

### 📈 Statistics

- **0 Critical Errors**: All ESLint errors resolved
- **130 Warnings**: Non-critical type annotations (expected for a flexible library)
- **6/6 Tests Passing**: 100% test suite success rate
- **67.73 KB**: Optimized bundle size

---

## Previous Releases

### Version 3.1.1 - Stability and Performance
- Bug fixes and performance improvements
- Enhanced TypeScript definitions
- Improved Laravel integration

### Version 3.0.0 - Enterprise React Integration
- Complete rewrite for enterprise-grade performance
- Smart asset management with 60% smaller bundles
- No-plugin Filament integration
- Comprehensive documentation and AI agent guide

---

**Full Changelog**: https://github.com/hadyfayed/filament-react-wrapper/compare/v3.1.1...v3.2.0

**Package Links**:
- Packagist: https://packagist.org/packages/hadyfayed/filament-react-wrapper
- GitHub: https://github.com/hadyfayed/filament-react-wrapper
