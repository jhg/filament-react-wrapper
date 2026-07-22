<?php

return [
    /*
    |--------------------------------------------------------------------------
    | React Wrapper Configuration
    |--------------------------------------------------------------------------
    |
    | This file contains the configuration options for the React Wrapper
    | package. You can customize the behavior of React components and
    | their integration with Laravel/Filament.
    |
    */

    /*
    |--------------------------------------------------------------------------
    | Vite Integration
    |--------------------------------------------------------------------------
    |
    | Configuration for Vite integration across different Laravel versions
    | and development environments.
    |
    */
    'vite' => [
        'dev_server_url' => env('VITE_DEV_SERVER_URL', 'http://localhost:5173'),
        'manifest_paths' => [
            'build/.vite/manifest.json', // Laravel 12.x
            'build/manifest.json',       // Laravel 11.x
            'build/assets/manifest.json', // Alternative
        ],
        'auto_detect_dev_server' => env('VITE_AUTO_DETECT_DEV_SERVER', true),
    ],

    /*
    |--------------------------------------------------------------------------
    | Component Registry
    |--------------------------------------------------------------------------
    |
    | Configure the component registry behavior including caching,
    | auto-discovery, and default component settings.
    |
    */
    'registry' => [
        'cache' => [
            'enabled' => env('REACT_WRAPPER_CACHE', true),
            'driver' => env('REACT_WRAPPER_CACHE_DRIVER', 'file'),
            'ttl' => env('REACT_WRAPPER_CACHE_TTL', 3600),
        ],
        
        'auto_discovery' => [
            'enabled' => env('REACT_WRAPPER_AUTO_DISCOVERY', true),
            'paths' => [
                'resources/js/components',
                'vendor/*/resources/js/components',
            ],
            'patterns' => [
                '*.tsx',
                '*.jsx',
            ],
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Component Defaults
    |--------------------------------------------------------------------------
    |
    | Default settings that will be applied to all React components
    | unless overridden at the component level.
    |
    */
    'defaults' => [
        'lazy' => false,
        'cache' => false,
        'ssr' => false,
        'hydrate' => true,
        'wrapper' => 'div',
        'attributes' => [],
        'middleware' => [],
    ],

    /*
    |--------------------------------------------------------------------------
    | Asset Management
    |--------------------------------------------------------------------------
    |
    | Configure how React assets are loaded and managed.
    |
    */
    'assets' => [
        // "prebuilt" is the zero-Node installation path. Set this to "vite"
        // when the application imports the published TypeScript source and
        // owns the React build itself.
        'mode' => env('REACT_WRAPPER_ASSET_MODE', 'prebuilt'),
        'auto_load' => env('REACT_WRAPPER_AUTO_LOAD_ASSETS', true),
        'force_laravel_bundle' => env('REACT_WRAPPER_FORCE_LARAVEL_BUNDLE', false),
        'manifest_path' => public_path('build/.vite/manifest.json'),
        'base_url' => env('REACT_WRAPPER_BASE_URL', '/build'),
        'chunk_loading' => 'async',
        'preload' => [
            'components' => true,
            'chunks' => false,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Extensions
    |--------------------------------------------------------------------------
    |
    | Configure extension loading and management.
    |
    */
    'extensions' => [
        'auto_boot' => env('REACT_WRAPPER_AUTO_BOOT_EXTENSIONS', true),
        'discovery_paths' => [
            'app/ReactExtensions',
            'vendor/*/src/ReactExtensions',
        ],
        'enabled' => [],
        'disabled' => [],
    ],

    /*
    |--------------------------------------------------------------------------
    | Performance
    |--------------------------------------------------------------------------
    |
    | Performance optimization configuration.
    |
    */
    'performance' => [
        'lazy_loading' => [
            'enabled' => env('REACT_WRAPPER_LAZY_LOADING', true),
            'threshold' => '100px',
        ],
        'code_splitting' => [
            'enabled' => env('REACT_WRAPPER_CODE_SPLITTING', true),
            'chunk_size' => env('REACT_WRAPPER_CHUNK_SIZE', 250000),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Development Mode
    |--------------------------------------------------------------------------
    |
    | Enable development mode for additional debugging and development tools.
    |
    */
    'dev_mode' => env('REACT_WRAPPER_DEV_MODE', app()->environment('local')),

    /*
    |--------------------------------------------------------------------------
    | Development
    |--------------------------------------------------------------------------
    |
    | Development-specific settings.
    |
    */
    'development' => [
        'hot_reload' => env('REACT_WRAPPER_HOT_RELOAD', true),
        'debug' => env('REACT_WRAPPER_DEBUG', false),
        'error_overlay' => env('REACT_WRAPPER_ERROR_OVERLAY', true),
    ],

    /*
    |--------------------------------------------------------------------------
    | Error Handling
    |--------------------------------------------------------------------------
    |
    | Configuration for error handling and display.
    |
    */
    'error_handling' => [
        'show_error_overlay' => env('REACT_WRAPPER_SHOW_ERROR_OVERLAY', app()->environment('local')),
        'log_react_errors' => env('REACT_WRAPPER_LOG_REACT_ERRORS', true),
        'error_boundary' => env('REACT_WRAPPER_ERROR_BOUNDARY', true),
    ],

    /*
    |--------------------------------------------------------------------------
    | State Management
    |--------------------------------------------------------------------------
    |
    | Configuration for the state management system.
    |
    */
    'state_management' => [
        'persistence' => [
            'default_storage' => 'localStorage',
            'debounce_ms' => 300,
        ],
        'livewire_sync' => true,
    ],

    /*
    |--------------------------------------------------------------------------
    | Security
    |--------------------------------------------------------------------------
    |
    | Security-related configuration options.
    |
    */
    'security' => [
        'sanitize_props' => env('REACT_WRAPPER_SANITIZE_PROPS', true),
        'max_prop_size' => env('REACT_WRAPPER_MAX_PROP_SIZE', 1024 * 100),
        'allowed_origins' => ['*'],
    ],

    /*
    |--------------------------------------------------------------------------
    | Integrations
    |--------------------------------------------------------------------------
    |
    | Settings for integrating with various frameworks and tools.
    |
    */
    'integrations' => [
        'filament' => [
            'enabled' => env('REACT_WRAPPER_FILAMENT', true),
            'auto_register' => true,
        ],
        'livewire' => [
            'enabled' => env('REACT_WRAPPER_LIVEWIRE', true),
            'morph_aware' => true,
        ],
    ],
];
