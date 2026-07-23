<?php

namespace HadyFayed\ReactWrapper\Services;

use HadyFayed\ReactWrapper\Contracts\ReactRegistryInterface;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Event;

class ReactComponentRegistry implements ReactRegistryInterface
{
    protected Collection $components;

    public function __construct()
    {
        $this->components = collect();
    }

    public function register(string $name, string $component, array $config = []): void
    {
        // Fire before registration event
        Event::dispatch('react-wrapper.component.registering', [$name, $component, $config]);

        $this->components->put($name, [
            'component' => $component,
            'config' => array_merge([
                'props' => [],
                'defaultProps' => [],
                'wrappers' => [],
                'middleware' => [],
                'cache' => false,
                'lazy' => false,
            ], $config),
            'registered_at' => now(),
        ]);

        // Fire after registration event
        Event::dispatch('react-wrapper.component.registered', [$name, $component, $config]);
    }

    public function get(string $name): ?array
    {
        return $this->components->get($name);
    }

    public function has(string $name): bool
    {
        return $this->components->has($name);
    }

    public function all(): array
    {
        return $this->components->all();
    }

    public function count(): int
    {
        return $this->components->count();
    }

    public function unregister(string $name): void
    {
        Event::dispatch('react-wrapper.component.unregistering', [$name]);
        
        $this->components->forget($name);
        
        Event::dispatch('react-wrapper.component.unregistered', [$name]);
    }

    public function registerMany(array $components): void
    {
        foreach ($components as $name => $config) {
            if (is_numeric($name) && is_string($config)) {
                $this->register($config, $config);
            } else {
                $this->register($name, $config['component'] ?? $name, $config['config'] ?? []);
            }
        }
    }
}
