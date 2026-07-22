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
        'force_laravel_bundle' => env('REACT_WRAPPER_FORCE_LARAVEL_BUNDLE', false),
        'base_url' => env('REACT_WRAPPER_BASE_URL', '/build'),
        'preload' => [
            'components' => true,
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
        ],
    ],

    // Used only by VariableShareService when route sharing is explicitly enabled.
    'share_routes' => false,
];
