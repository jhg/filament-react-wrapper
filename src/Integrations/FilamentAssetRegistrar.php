<?php

namespace HadyFayed\ReactWrapper\Integrations;

use HadyFayed\ReactWrapper\Services\AssetManager;
use HadyFayed\ReactWrapper\Services\ReactComponentRegistry;

/**
 * Single Responsibility: Register Filament-specific React components and assets
 */
class FilamentAssetRegistrar
{
    public function __construct(
        protected AssetManager $assetManager,
        protected ReactComponentRegistry $registry
    ) {}

    /**
     * Register Filament-specific React components that actually exist
     */
    public function registerFilamentAssets(): void
    {
        // Register only existing Filament React components
        $filamentComponents = [
            'FilamentReactAdapter' => [
                'js' => 'resources/js/components/adapters/FilamentReactAdapter.tsx',
                'dependencies' => ['react', 'react-dom'],
                'preload' => true, // Adapter is critical for Filament integration
            ],
        ];

        foreach ($filamentComponents as $component => $config) {
            foreach ($this->getCandidatePaths($config['js']) as $jsPath) {
                if (file_exists(base_path($jsPath))) {
                    $this->registerComponentIfExists($component, array_merge($config, ['js' => $jsPath]));
                    break;
                }
            }
        }
    }

    /**
     * The Composer workflow publishes the package below react-wrapper, while
     * older applications may have copied the adapter into their own source.
     */
    protected function getCandidatePaths(string $path): array
    {
        return [
            str_replace('resources/js/', 'resources/js/react-wrapper/', $path),
            $path,
        ];
    }

    /**
     * Register a component only if its file exists
     */
    protected function registerComponentIfExists(string $component, array $config): void
    {
        // Only register if file actually exists
        $jsPath = base_path($config['js']);
        if (!file_exists($jsPath)) {
            return;
        }

        if (!$this->registry->has($component)) {
            $this->registry->register($component, $component, [
                'lazy' => !($config['preload'] ?? false),
                'preload' => $config['preload'] ?? false,
                'filament_specific' => true,
            ]);
        }

        $this->assetManager->registerComponentAsset($component, array_merge($config, [
            'lazy' => !($config['preload'] ?? false),
        ]));
    }

    /**
     * Get statistics about registered Filament components
     */
    public function getRegistrationStats(): array
    {
        return [
            'components_registered' => count(array_filter(
                $this->registry->all(),
                fn($config) => $config['config']['filament_specific'] ?? false
            )),
            'assets_pending' => count(array_filter(
                $this->assetManager->getPendingAssets(),
                fn($component) => $this->isFilamentComponent($component)
            )),
        ];
    }

    /**
     * Check if a component is Filament-specific
     */
    protected function isFilamentComponent(string $componentName): bool
    {
        $component = $this->registry->get($componentName);
        return $component && ($component['config']['filament_specific'] ?? false);
    }

    /**
     * Clean up Filament-specific components
     */
    public function cleanup(): void
    {
        // Remove Filament-specific components from registry
        $filamentComponents = array_filter(
            $this->registry->all(),
            fn($config) => $config['config']['filament_specific'] ?? false
        );

        foreach (array_keys($filamentComponents) as $componentName) {
            $this->registry->unregister($componentName);
        }
    }
}
