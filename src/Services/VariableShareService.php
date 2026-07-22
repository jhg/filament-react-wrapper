<?php

namespace HadyFayed\ReactWrapper\Services;

use Illuminate\Support\Facades\View;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Collection;

class VariableShareService
{
    protected array $globalVariables = [];
    protected array $componentVariables = [];
    protected array $sensitiveKeys = [];
    protected array $transformers = [];

    public function __construct()
    {
        $this->setupDefaultTransformers();
        $this->setupSensitiveKeys();
    }

    /**
     * Share a variable globally to all React components
     */
    public function shareGlobal(string $key, mixed $value): void
    {
        $this->globalVariables[$key] = $value;
    }

    /**
     * Share multiple variables globally
     */
    public function shareGlobalMany(array $variables): void
    {
        foreach ($variables as $key => $value) {
            $this->shareGlobal($key, $value);
        }
    }

    /**
     * Share a variable to a specific component
     */
    public function shareToComponent(string $componentName, string $key, mixed $value): void
    {
        if (!isset($this->componentVariables[$componentName])) {
            $this->componentVariables[$componentName] = [];
        }
        
        $this->componentVariables[$componentName][$key] = $value;
    }

    /**
     * Share multiple variables to a specific component
     */
    public function shareToComponentMany(string $componentName, array $variables): void
    {
        foreach ($variables as $key => $value) {
            $this->shareToComponent($componentName, $key, $value);
        }
    }

    /**
     * Get all variables for a specific component
     */
    public function getVariablesForComponent(string $componentName): array
    {
        $variables = array_merge(
            $this->globalVariables,
            $this->componentVariables[$componentName] ?? []
        );

        return $this->transformVariables($variables);
    }

    /**
     * Get all global variables
     */
    public function getGlobalVariables(): array
    {
        return $this->transformVariables($this->globalVariables);
    }

    /**
     * Share common Laravel data automatically
     */
    public function shareCommonData(): void
    {
        // Auth data
        if (Auth::check()) {
            $this->shareGlobal('auth', [
                'user' => Auth::user()->only(['id', 'name', 'email']),
                'permissions' => method_exists(Auth::user(), 'getAllPermissions') 
                    ? Auth::user()->getAllPermissions()->pluck('name') 
                    : [],
                'roles' => method_exists(Auth::user(), 'getRoleNames') 
                    ? Auth::user()->getRoleNames() 
                    : [],
            ]);
        } else {
            $this->shareGlobal('auth', ['user' => null]);
        }

        // App data
        $this->shareGlobal('app', [
            'name' => config('app.name'),
            'url' => config('app.url'),
            'locale' => app()->getLocale(),
            'timezone' => config('app.timezone'),
            'environment' => app()->environment(),
            'debug' => config('app.debug'),
        ]);

        // CSRF token
        $this->shareGlobal('csrf_token', csrf_token());

        // Routes (if needed)
        if (config('react-wrapper.share_routes', false)) {
            $this->shareGlobal('routes', $this->getNamedRoutes());
        }

        // View shared data
        $this->shareGlobal('view_data', View::getShared());

        // Flash messages
        if (session()->has('flash')) {
            $this->shareGlobal('flash', session('flash'));
        }

        // Validation errors
        if (session()->has('errors')) {
            $this->shareGlobal('errors', session('errors')->toArray());
        }
    }

    /**
     * Add a transformer for a specific key
     */
    public function addTransformer(string $key, callable $transformer): void
    {
        $this->transformers[$key] = $transformer;
    }

    /**
     * Add a sensitive key to be filtered out
     */
    public function addSensitiveKey(string $key): void
    {
        $this->sensitiveKeys[] = $key;
    }

    /**
     * Remove a sensitive key
     */
    public function removeSensitiveKey(string $key): void
    {
        $this->sensitiveKeys = array_filter($this->sensitiveKeys, fn($k) => $k !== $key);
    }

    /**
     * Generate JavaScript variables injection
     */
    public function generateJavaScriptInjection(?string $componentName = null): string
    {
        $variables = $componentName 
            ? $this->getVariablesForComponent($componentName)
            : $this->getGlobalVariables();

        if (empty($variables)) {
            return '';
        }

        $variablesJson = json_encode($variables, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT);
        $targetObject = $componentName ? "componentData['{$componentName}']" : 'globalData';

        return "<script>
            window.ReactWrapper = window.ReactWrapper || {};
            window.ReactWrapper.data = window.ReactWrapper.data || {};
            window.ReactWrapper.data.{$targetObject} = {$variablesJson};
        </script>";
    }

    /**
     * Generate data attributes for component
     */
    public function generateDataAttributes(string $componentName): string
    {
        $variables = $this->getVariablesForComponent($componentName);
        
        if (empty($variables)) {
            return '';
        }

        $dataJson = json_encode($variables, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT);
        
        return 'data-react-variables="' . htmlspecialchars($dataJson, ENT_QUOTES, 'UTF-8') . '"';
    }

    /**
     * Share Livewire properties if available
     */
    public function shareLivewireData(): void
    {
        if (!class_exists('\Livewire\Livewire')) {
            return;
        }

        // Get current Livewire component if available
        if (app()->bound('livewire')) {
            $this->shareGlobal('livewire', [
                'enabled' => true,
                'csrf_token' => csrf_token(),
            ]);
        }
    }

    /**
     * Share Filament panel data if available
     * Delegates to FilamentIntegration for comprehensive data sharing
     */
    public function shareFilamentData(): void
    {
        if (!class_exists('\Filament\Facades\Filament')) {
            return;
        }
        
        try {
            // Let FilamentIntegration handle comprehensive Filament data sharing
            $filamentIntegration = app(\HadyFayed\ReactWrapper\Integrations\FilamentIntegration::class);
            if ($filamentIntegration->isFilamentAvailable()) {
                // FilamentIntegration will handle the data sharing via its own methods
                // This prevents duplication and ensures consistency
                logger()->debug('Filament data sharing delegated to FilamentIntegration');
            }
        } catch (\Exception $e) {
            // Filament integration not available - fall back to basic sharing
            try {
                $panel = \Filament\Facades\Filament::getCurrentPanel();
                if ($panel) {
                    $this->shareGlobal('filament', [
                        'panel_id' => $panel->getId(),
                        'panel_path' => $panel->getPath(),
                        'theme' => $panel->getTheme(),
                        'dark_mode' => $panel->hasDarkMode(),
                    ]);
                }
            } catch (\Exception $fallbackError) {
                logger()->debug('Filament data sharing failed', ['error' => $fallbackError->getMessage()]);
            }
        }
    }

    /**
     * Transform variables before sending to frontend
     */
    protected function transformVariables(array $variables): array
    {
        $transformed = [];

        foreach ($variables as $key => $value) {
            // Skip sensitive keys
            if (in_array($key, $this->sensitiveKeys)) {
                continue;
            }

            // Apply transformer if available
            if (isset($this->transformers[$key])) {
                $value = call_user_func($this->transformers[$key], $value);
            }

            // Handle special types
            $transformed[$key] = $this->transformValue($value);
        }

        return $transformed;
    }

    /**
     * Transform individual values
     */
    protected function transformValue(mixed $value): mixed
    {
        if ($value instanceof Collection) {
            return $value->toArray();
        }

        if (is_object($value) && method_exists($value, 'toArray')) {
            return $value->toArray();
        }

        if (is_object($value) && method_exists($value, 'jsonSerialize')) {
            return $value->jsonSerialize();
        }

        // Handle Carbon dates
        if ($value instanceof \Carbon\Carbon) {
            return [
                'date' => $value->toISOString(),
                'timestamp' => $value->timestamp,
                'human' => $value->diffForHumans(),
                'formatted' => $value->format('Y-m-d H:i:s'),
            ];
        }

        return $value;
    }

    /**
     * Get named routes for frontend routing
     */
    protected function getNamedRoutes(): array
    {
        $routes = [];
        
        foreach (app('router')->getRoutes() as $route) {
            if ($name = $route->getName()) {
                $routes[$name] = [
                    'uri' => $route->uri(),
                    'methods' => $route->methods(),
                ];
            }
        }

        return $routes;
    }

    /**
     * Setup default transformers
     */
    protected function setupDefaultTransformers(): void
    {
        // User transformer
        $this->addTransformer('user', function ($user) {
            if (!$user) return null;
            
            return [
                'id' => $user->id ?? null,
                'name' => $user->name ?? null,
                'email' => $user->email ?? null,
                'avatar' => $user->avatar ?? null,
                'created_at' => $user->created_at ?? null,
            ];
        });

        // Error transformer
        $this->addTransformer('errors', function ($errors) {
            if (is_object($errors) && method_exists($errors, 'toArray')) {
                return $errors->toArray();
            }
            return $errors;
        });
    }

    /**
     * Setup sensitive keys to filter out
     */
    protected function setupSensitiveKeys(): void
    {
        $this->sensitiveKeys = [
            'password',
            'password_confirmation',
            'token',
            'secret',
            'api_key',
            'private_key',
            'database_url',
            '_token',
        ];
    }

    /**
     * Clear all shared variables
     */
    public function clear(): void
    {
        $this->globalVariables = [];
        $this->componentVariables = [];
    }

    /**
     * Clear variables for a specific component
     */
    public function clearComponent(string $componentName): void
    {
        unset($this->componentVariables[$componentName]);
    }
}
