<?php

namespace HadyFayed\ReactWrapper\Integrations;

use HadyFayed\ReactWrapper\Services\AssetManager;
use HadyFayed\ReactWrapper\Services\VariableShareService;
use HadyFayed\ReactWrapper\Services\ReactComponentRegistry;

/**
 * Single Responsibility: Register Filament render hooks for asset injection
 */
class FilamentHookRegistrar
{
    protected bool $hooksRegistered = false;

    public function __construct(
        protected AssetManager $assetManager,
        protected VariableShareService $variableShare,
        protected ReactComponentRegistry $registry,
        protected FilamentPanelManager $panelManager
    ) {}

    /**
     * Setup Filament render hooks for asset injection
     */
    public function registerHooks(): void
    {
        if ($this->hooksRegistered) {
            return;
        }

        $panel = $this->panelManager->getCurrentPanel();
        if (!$panel) {
            return;
        }

        // Inject assets in head
        $panel->renderHook(
            'panels::head.end',
            function (): string {
                return $this->generateHeadInjection();
            }
        );

        // Initialize lazy loading
        $panel->renderHook(
            'panels::body.end',
            function (): string {
                return $this->generateBodyInjection();
            }
        );

        $this->hooksRegistered = true;
    }

    /**
     * Generate head injection for assets and variables
     */
    protected function generateHeadInjection(): string
    {
        $scripts = [];

        // Inject shared variables
        $scripts[] = $this->variableShare->generateJavaScriptInjection();

        // Get pending Filament components
        $pendingComponents = array_filter(
            $this->assetManager->getPendingAssets(),
            fn($component) => $this->isFilamentComponent($component)
        );

        // Generate lazy loading script for Filament components
        if (!empty($pendingComponents)) {
            $scripts[] = $this->assetManager->generateLazyLoadScript($pendingComponents);
        }

        // Generate preload tags for critical Filament components
        $preloadTags = $this->assetManager->generatePreloadTags($pendingComponents);

        $allTags = array_merge($preloadTags, array_filter($scripts));

        return implode("\n", $allTags);
    }

    /**
     * Generate body injection for initialization
     */
    protected function generateBodyInjection(): string
    {
        return '<script>
            document.addEventListener("DOMContentLoaded", function() {
                if (window.ReactWrapper?.initializeLazyLoading) {
                    window.ReactWrapper.initializeLazyLoading();
                    console.log("React Wrapper initialized for Filament");
                }

            });
        </script>';
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
     * Check if hooks are registered
     */
    public function isRegistered(): bool
    {
        return $this->hooksRegistered;
    }

    /**
     * Reset hook registration state
     */
    public function reset(): void
    {
        $this->hooksRegistered = false;
    }
}
