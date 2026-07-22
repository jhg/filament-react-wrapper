<?php

namespace HadyFayed\ReactWrapper\Components;

use HadyFayed\ReactWrapper\Traits\ReactServiceInjection;
use Illuminate\Support\Str;
use Illuminate\Support\Js;

abstract class BaseReactComponent
{
    use ReactServiceInjection;
    protected string $componentName = '';
    protected array $componentProps = [];
    protected string $containerId;
    protected int $height = 400;
    protected bool $lazy = true;
    protected bool $reactive = true;
    protected array $dependencies = [];

    public function __construct()
    {
        $this->containerId = $this->getContainerPrefix() . '-' . Str::random(8);
        $this->initializeReactServices();
    }
    
    public function initialize(): void
    {
        // Filament fields and widgets assign their component name after this
        // helper is constructed, so do not register an empty component.
        if ($this->componentName !== '') {
            $this->registerComponent();
        }
    }

    /**
     * Get the container prefix for this component type
     */
    abstract protected function getContainerPrefix(): string;

    /**
     * Get the component type identifier
     */
    abstract protected function getComponentType(): string;

    /**
     * Get additional component-specific props
     */
    abstract protected function getSpecificProps(): array;

    // Shared fluent methods
    public function component(string $componentName): static
    {
        $this->componentName = $componentName;

        if ($componentName !== '') {
            $this->registerComponent();
        }

        return $this;
    }

    public function props(array $props): static
    {
        $this->componentProps = array_merge($this->componentProps, $props);
        return $this;
    }

    public function height(int $height): static
    {
        $this->height = $height;
        return $this;
    }

    public function lazy(bool $lazy = true): static
    {
        $this->lazy = $lazy;
        return $this;
    }

    public function reactive(bool $reactive = true): static
    {
        $this->reactive = $reactive;
        return $this;
    }

    public function dependencies(array $dependencies): static
    {
        $this->dependencies = $dependencies;
        return $this;
    }

    // Shared getters
    public function getComponentName(): string
    {
        return $this->componentName;
    }

    public function getContainerId(): string
    {
        return $this->containerId;
    }

    public function getHeight(): int
    {
        return $this->height;
    }

    public function getComponentProps(): array
    {
        $baseProps = [
            'height' => $this->height,
            'containerId' => $this->containerId,
            'lazy' => $this->lazy,
            'reactive' => $this->reactive,
            'dependencies' => $this->dependencies,
            'csrf_token' => csrf_token(),
        ];

        // Merge with component-specific props and user props
        return array_merge(
            $this->componentProps,
            $baseProps,
            $this->getSpecificProps()
        );
    }

    public function getAssetData(): array
    {
        return [
            'component' => $this->componentName,
            'lazy' => $this->lazy,
            'dependencies' => $this->dependencies,
        ];
    }

    protected function registerComponent(): void
    {
        if (!$this->getRegistry()->has($this->componentName)) {
            $this->getRegistry()->register($this->componentName, $this->componentName, [
                'lazy' => $this->lazy,
                $this->getComponentType() => true,
                'dependencies' => $this->dependencies,
            ]);
        }

        // Queue component for loading
        if ($this->lazy) {
            $this->getAssetManager()->queueComponent($this->componentName);
        }
    }

    public function shareComponentData($data = null): void
    {
        $componentData = [
            'height' => $this->height,
            'lazy' => $this->lazy,
            'reactive' => $this->reactive,
            'dependencies' => $this->dependencies,
            'data' => $data,
            $this->getComponentType() . '_component' => true,
        ];

        $this->getVariableShare()->shareToComponent(
            $this->componentName,
            $this->getComponentType() . '_' . $this->containerId,
            $componentData
        );
    }

    public function generateScript(): string
    {
        $props = Js::from($this->getComponentProps());
        $assetData = Js::from($this->getAssetData());
        $containerId = Js::from($this->containerId);
        $componentName = Js::from($this->componentName);
        $componentType = $this->getComponentType();

        return "
            window.ReactWrapper = window.ReactWrapper || {};
            window.ReactWrapper.{$componentType}s = window.ReactWrapper.{$componentType}s || {};
            window.ReactWrapper.{$componentType}s[{$containerId}] = {
                props: {$props},
                assets: {$assetData}
            };

            if (window.ReactWrapper.loadComponent) {
                window.ReactWrapper.loadComponent({$componentName}).then(() => {
                    console.log('React {$componentType} component loaded:', {$componentName});
                });
            }
        ";
    }
}
