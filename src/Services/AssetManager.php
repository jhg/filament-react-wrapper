<?php

namespace HadyFayed\ReactWrapper\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\File;

class AssetManager
{
    protected array $loadedAssets = [];
    protected array $manifestCache = [];
    protected array $pendingAssets = [];
    protected array $componentAssets = [];
    
    public function __construct()
    {
        //
    }

    /**
     * Get the Vite manifest for assets
     */
    public function getViteManifest(): ?array
    {
        $manifestPaths = config('react-wrapper.vite.manifest_paths', [
            'build/.vite/manifest.json',
            'build/manifest.json',
            'build/assets/manifest.json',
        ]);

        foreach ($manifestPaths as $path) {
            $fullPath = public_path($path);
            
            if (File::exists($fullPath)) {
                $cacheKey = 'react-wrapper.manifest.' . md5($fullPath);
                
                return Cache::remember($cacheKey, 300, function () use ($fullPath) {
                    return json_decode(File::get($fullPath), true);
                });
            }
        }

        return null;
    }

    /**
     * Check if Laravel bundle is available
     */
    public function isLaravelBundleAvailable(): bool
    {
        return $this->isFilamentAssetPublished() || $this->isLegacyLaravelBundlePublished();
    }

    /**
     * Check if we should use Laravel bundle
     */
    public function shouldUseLaravelBundle(): bool
    {
        if (config('react-wrapper.assets.mode', 'prebuilt') === 'vite') {
            return false;
        }

        // Force Laravel bundle if configured
        if (config('react-wrapper.assets.force_laravel_bundle', false)) {
            return $this->isLaravelBundleAvailable();
        }

        // Use Laravel bundle in production if available and no dev server
        if (app()->isProduction() && $this->isLaravelBundleAvailable()) {
            return true;
        }

        // Use Laravel bundle if available and dev server is not running
        return $this->isLaravelBundleAvailable() && !$this->isViteDevServerRunning();
    }

    /**
     * Check if Vite dev server is running
     */
    public function isViteDevServerRunning(): bool
    {
        if (!config('react-wrapper.vite.auto_detect_dev_server', true)) {
            return false;
        }

        $devServerUrl = config('react-wrapper.vite.dev_server_url', 'http://localhost:5173');
        
        $cacheKey = 'react-wrapper.dev-server-status';
        
        return Cache::remember($cacheKey, 30, function () use ($devServerUrl) {
            $context = stream_context_create([
                'http' => [
                    'timeout' => 2,
                    'ignore_errors' => true,
                    'method' => 'HEAD'
                ]
            ]);
            
            return @file_get_contents($devServerUrl, false, $context) !== false;
        });
    }

    /**
     * Get asset URL for production or development
     */
    public function getAssetUrl(string $path): ?string
    {
        if ($this->isViteDevServerRunning()) {
            $devServerUrl = config('react-wrapper.vite.dev_server_url', 'http://localhost:5173');
            return rtrim($devServerUrl, '/') . '/' . ltrim($path, '/');
        }

        $manifest = $this->getViteManifest();
        if (!$manifest || !isset($manifest[$path])) {
            return null;
        }

        $baseUrl = config('react-wrapper.assets.base_url', '/build');
        return rtrim($baseUrl, '/') . '/' . ltrim($manifest[$path]['file'], '/');
    }

    /**
     * Get CSS assets for an entry point
     */
    public function getEntryPointCss(string $entryPoint): array
    {
        $manifest = $this->getViteManifest();
        if (!$manifest || !isset($manifest[$entryPoint])) {
            return [];
        }

        $entry = $manifest[$entryPoint];
        $cssFiles = [];

        if (isset($entry['css'])) {
            $baseUrl = config('react-wrapper.assets.base_url', '/build');
            foreach ($entry['css'] as $css) {
                $cssFiles[] = rtrim($baseUrl, '/') . '/' . ltrim($css, '/');
            }
        }

        return $cssFiles;
    }

    /**
     * Mark an asset as loaded to prevent duplicate loading
     */
    public function markAssetLoaded(string $asset): void
    {
        $this->loadedAssets[$asset] = true;
    }

    /**
     * Check if an asset has been loaded
     */
    public function isAssetLoaded(string $asset): bool
    {
        return isset($this->loadedAssets[$asset]);
    }

    /**
     * Generate script tag for asset
     */
    public function generateScriptTag(string $path, array $attributes = []): string
    {
        $url = $this->getAssetUrl($path);
        if (!$url) {
            return '';
        }

        $attrs = array_merge([
            'type' => 'module',
            'src' => $url
        ], $attributes);

        $attrString = '';
        foreach ($attrs as $key => $value) {
            $attrString .= ' ' . htmlspecialchars($key) . '="' . htmlspecialchars($value) . '"';
        }

        return '<script' . $attrString . '></script>';
    }

    /**
     * Generate link tag for CSS asset
     */
    public function generateLinkTag(string $href, array $attributes = []): string
    {
        $attrs = array_merge([
            'rel' => 'stylesheet',
            'href' => $href
        ], $attributes);

        $attrString = '';
        foreach ($attrs as $key => $value) {
            $attrString .= ' ' . htmlspecialchars($key) . '="' . htmlspecialchars($value) . '"';
        }

        return '<link' . $attrString . '>';
    }

    /**
     * Preload component assets
     */
    public function preloadComponent(string $componentName): array
    {
        if (!config('react-wrapper.assets.preload.components', true)) {
            return [];
        }

        $tags = [];
        $componentPath = "resources/js/components/{$componentName}.tsx";
        
        if ($this->isViteDevServerRunning()) {
            // In development, just return the module preload
            $url = $this->getAssetUrl($componentPath);
            if ($url) {
                $tags[] = '<link rel="modulepreload" href="' . htmlspecialchars($url) . '">';
            }
        } else {
            // In production, preload the component and its dependencies
            $manifest = $this->getViteManifest();
            if ($manifest && isset($manifest[$componentPath])) {
                $entry = $manifest[$componentPath];
                $baseUrl = config('react-wrapper.assets.base_url', '/build');
                
                // Preload main file
                $tags[] = '<link rel="modulepreload" href="' . htmlspecialchars(rtrim($baseUrl, '/') . '/' . ltrim($entry['file'], '/')) . '">';
                
                // Preload imports
                if (isset($entry['imports'])) {
                    foreach ($entry['imports'] as $import) {
                        if (isset($manifest[$import])) {
                            $importUrl = rtrim($baseUrl, '/') . '/' . ltrim($manifest[$import]['file'], '/');
                            $tags[] = '<link rel="modulepreload" href="' . htmlspecialchars($importUrl) . '">';
                        }
                    }
                }
            }
        }

        return $tags;
    }

    /**
     * Register a component for lazy loading
     */
    public function registerComponentAsset(string $componentName, array $config = []): void
    {
        $this->componentAssets[$componentName] = array_merge([
            'js' => "resources/js/components/{$componentName}.tsx",
            'css' => null,
            'dependencies' => [],
            'lazy' => true,
            'preload' => false,
        ], $config);
    }

    /**
     * Get assets needed for a specific component
     */
    public function getComponentAssets(string $componentName): array
    {
        if (!isset($this->componentAssets[$componentName])) {
            return [];
        }

        $config = $this->componentAssets[$componentName];
        $assets = [];

        // Add JavaScript asset
        if ($config['js']) {
            $jsUrl = $this->getAssetUrl($config['js']);
            if ($jsUrl) {
                $assets['js'] = $jsUrl;
            }
        }

        // Add CSS assets
        if ($config['css']) {
            $cssUrl = $this->getAssetUrl($config['css']);
            if ($cssUrl) {
                $assets['css'] = $cssUrl;
            }
        }

        // Get CSS from Vite manifest
        $entryCss = $this->getEntryPointCss($config['js']);
        if (!empty($entryCss)) {
            $assets['css'] = array_merge($assets['css'] ?? [], $entryCss);
        }

        // Add dependencies
        foreach ($config['dependencies'] as $dep) {
            $depAssets = $this->getComponentAssets($dep);
            if (!empty($depAssets)) {
                $assets['dependencies'][$dep] = $depAssets;
            }
        }

        return $assets;
    }

    /**
     * Queue component for loading
     */
    public function queueComponent(string $componentName): void
    {
        if (!$this->isAssetLoaded($componentName)) {
            $this->pendingAssets[] = $componentName;
        }
    }

    /**
     * Get all pending assets for loading
     */
    public function getPendingAssets(): array
    {
        return array_unique($this->pendingAssets);
    }

    /**
     * Get the main React Wrapper bundle URL
     */
    public function getMainBundleUrl(): ?string
    {
        if ($this->shouldUseLaravelBundle()) {
            if ($this->isFilamentAssetPublished()) {
                try {
                    return \Filament\Support\Facades\FilamentAsset::getScriptSrc(
                        \HadyFayed\ReactWrapper\ReactWrapperServiceProvider::FILAMENT_ASSET_ID,
                        \HadyFayed\ReactWrapper\ReactWrapperServiceProvider::FILAMENT_ASSET_PACKAGE,
                    );
                } catch (\Throwable) {
                    // Fall back to the legacy URL below if an older Filament
                    // asset manager cannot resolve the registered asset.
                }
            }

            return asset('vendor/react-wrapper/js/react-wrapper.js');
        }

        if ($this->isViteDevServerRunning()) {
            $devServerUrl = config('react-wrapper.vite.dev_server_url', 'http://localhost:5173');
            foreach ($this->getMainEntryPaths() as $entryPath) {
                if (File::exists(base_path($entryPath))) {
                    return rtrim($devServerUrl, '/') . '/' . ltrim($entryPath, '/');
                }
            }

            return null;
        }

        // Try Vite manifest
        foreach ($this->getMainEntryPaths() as $entryPath) {
            $mainAssetUrl = $this->getAssetUrl($entryPath);
            if ($mainAssetUrl) {
                return $mainAssetUrl;
            }
        }

        return null;
    }

    /**
     * Published applications load the bootstrap entrypoint, while older
     * installations may still expose the package source at the legacy path.
     */
    protected function getMainEntryPaths(): array
    {
        return [
            'resources/js/bootstrap-react.tsx',
            'resources/js/react-wrapper/index.tsx',
            'resources/js/index.tsx',
        ];
    }

    /**
     * Generate the main bundle script tag
     */
    public function generateMainBundleScript(): string
    {
        $bundleUrl = $this->getMainBundleUrl();
        if (!$bundleUrl) {
            return '';
        }

        if ($this->shouldUseLaravelBundle()) {
            // The Composer-distributed bundle is self-contained. Legacy
            // published bundles still work through the compatibility path.
            return '<script src="' . htmlspecialchars($bundleUrl) . '" defer></script>';
        }

        // Vite dev server or built assets
        return '<script type="module" src="' . htmlspecialchars($bundleUrl) . '"></script>';
    }

    /**
     * Generate compatibility dependencies for legacy Laravel bundles.
     */
    public function generateExternalDependencies(): array
    {
        if (!$this->shouldUseLaravelBundle() || !$this->isLegacyLaravelBundlePublished()) {
            return [];
        }

        // Keep compatibility with bundles published by versions before the
        // Composer asset became self-contained. New bundles do not use a CDN.
        return [
            '<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>',
            '<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>',
        ];
    }

    protected function isFilamentAssetPublished(): bool
    {
        if (! class_exists(\Filament\Support\Assets\Js::class)) {
            return false;
        }

        $asset = \Filament\Support\Assets\Js::make(
            \HadyFayed\ReactWrapper\ReactWrapperServiceProvider::FILAMENT_ASSET_ID,
            \HadyFayed\ReactWrapper\ReactWrapperServiceProvider::getComposerAssetPath(),
        )->package(\HadyFayed\ReactWrapper\ReactWrapperServiceProvider::FILAMENT_ASSET_PACKAGE);

        return File::exists($asset->getPublicPath());
    }

    protected function isLegacyLaravelBundlePublished(): bool
    {
        return File::exists(public_path('vendor/react-wrapper/js/react-wrapper.js'));
    }

    /**
     * Generate lazy loading script for components
     */
    public function generateLazyLoadScript(array $components): string
    {
        if (empty($components)) {
            return '';
        }

        // If using Laravel bundle, components are all included in the main bundle
        if ($this->shouldUseLaravelBundle()) {
            return $this->generateLaravelBundleComponentScript($components);
        }

        // Vite-based lazy loading (existing logic)
        $componentAssets = [];
        foreach ($components as $componentName) {
            $assets = $this->getComponentAssets($componentName);
            if (!empty($assets)) {
                $componentAssets[$componentName] = $assets;
            }
        }

        if (empty($componentAssets)) {
            return '';
        }

        $assetsJson = json_encode($componentAssets, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT);

        return "<script type=\"module\">
            (function() {
                const componentAssets = {$assetsJson};
                const loadedModules = new Set();
                
                window.ReactWrapper = window.ReactWrapper || {};
                window.ReactWrapper.loadComponent = async function(componentName) {
                    if (loadedModules.has(componentName)) {
                        return;
                    }
                    
                    const assets = componentAssets[componentName];
                    if (!assets) {
                        console.warn('No assets found for component:', componentName);
                        return;
                    }
                    
                    // Load dependencies first
                    if (assets.dependencies) {
                        for (const [depName, depAssets] of Object.entries(assets.dependencies)) {
                            await window.ReactWrapper.loadComponent(depName);
                        }
                    }
                    
                    // Load CSS
                    if (assets.css) {
                        const cssUrls = Array.isArray(assets.css) ? assets.css : [assets.css];
                        for (const cssUrl of cssUrls) {
                            if (!document.querySelector(`link[href=\"\${cssUrl}\"]`)) {
                                const link = document.createElement('link');
                                link.rel = 'stylesheet';
                                link.href = cssUrl;
                                document.head.appendChild(link);
                            }
                        }
                    }
                    
                    // Load JavaScript module
                    if (assets.js) {
                        await import(assets.js);
                    }
                    
                    loadedModules.add(componentName);
                    console.debug('Loaded component:', componentName);
                };
                
                // Auto-load components that are visible
                window.ReactWrapper.initializeLazyLoading = function() {
                    const observer = new IntersectionObserver((entries) => {
                        entries.forEach(entry => {
                            if (entry.isIntersecting) {
                                const componentName = entry.target.getAttribute('data-react-component');
                                if (componentName && componentAssets[componentName]) {
                                    window.ReactWrapper.loadComponent(componentName);
                                    observer.unobserve(entry.target);
                                }
                            }
                        });
                    }, {
                        rootMargin: '50px'
                    });
                    
                    document.querySelectorAll('[data-react-component][data-lazy=\"true\"]').forEach(el => {
                        observer.observe(el);
                    });
                };
                
                // Initialize on DOM ready
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', window.ReactWrapper.initializeLazyLoading);
                } else {
                    window.ReactWrapper.initializeLazyLoading();
                }
            })();
        </script>";
    }

    /**
     * Generate Laravel bundle component initialization script
     */
    protected function generateLaravelBundleComponentScript(array $components): string
    {
        $componentsJson = json_encode($components, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT);

        return "<script>
            (function() {
                const components = {$componentsJson};
                
                window.ReactWrapper = window.ReactWrapper || {};
                window.ReactWrapper.loadComponent = function(componentName) {
                    // With Laravel bundle, all components are pre-loaded
                    console.debug('Component available in bundle:', componentName);
                    return Promise.resolve();
                };
                
                // Initialize components immediately since they're in the bundle
                window.ReactWrapper.initializeLazyLoading = function() {
                    document.querySelectorAll('[data-react-component]').forEach(el => {
                        const componentName = el.getAttribute('data-react-component');
                        if (components.includes(componentName)) {
                            // Component is available in the main bundle
                            window.ReactWrapper.initializeComponent && window.ReactWrapper.initializeComponent(el);
                        }
                    });
                };
                
                // Initialize on DOM ready
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', window.ReactWrapper.initializeLazyLoading);
                } else {
                    window.ReactWrapper.initializeLazyLoading();
                }
            })();
        </script>";
    }

    /**
     * Generate preload tags for critical components
     */
    public function generatePreloadTags(array $components): array
    {
        $tags = [];
        
        foreach ($components as $componentName) {
            $config = $this->componentAssets[$componentName] ?? null;
            if (!$config || !$config['preload']) {
                continue;
            }
            
            $assets = $this->getComponentAssets($componentName);
            
            // Preload JavaScript
            if (isset($assets['js'])) {
                $tags[] = '<link rel="modulepreload" href="' . htmlspecialchars($assets['js']) . '">';
            }
            
            // Preload CSS
            if (isset($assets['css'])) {
                $cssUrls = is_array($assets['css']) ? $assets['css'] : [$assets['css']];
                foreach ($cssUrls as $cssUrl) {
                    $tags[] = '<link rel="preload" href="' . htmlspecialchars($cssUrl) . '" as="style">';
                }
            }
        }
        
        return $tags;
    }

    /**
     * Clear pending assets
     */
    public function clearPendingAssets(): void
    {
        $this->pendingAssets = [];
    }

    /**
     * Clear asset cache
     */
    public function clearCache(): void
    {
        Cache::forget('react-wrapper.dev-server-status');
        
        // Clear manifest cache
        $manifestPaths = config('react-wrapper.vite.manifest_paths', []);
        foreach ($manifestPaths as $path) {
            $fullPath = public_path($path);
            $cacheKey = 'react-wrapper.manifest.' . md5($fullPath);
            Cache::forget($cacheKey);
        }
        
        $this->loadedAssets = [];
        $this->manifestCache = [];
        $this->pendingAssets = [];
    }
}
