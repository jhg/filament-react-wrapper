<?php

namespace HadyFayed\ReactWrapper\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use HadyFayed\ReactWrapper\Services\ReactComponentRegistry;
use HadyFayed\ReactWrapper\Services\AssetManager;
use HadyFayed\ReactWrapper\Services\VariableShareService;
use Symfony\Component\HttpFoundation\Response as BaseResponse;

class ReactWrapperMiddleware
{
    protected ReactComponentRegistry $registry;
    protected AssetManager $assetManager;
    protected VariableShareService $variableShare;

    public function __construct(
        ReactComponentRegistry $registry,
        AssetManager $assetManager,
        VariableShareService $variableShare
    ) {
        $this->registry = $registry;
        $this->assetManager = $assetManager;
        $this->variableShare = $variableShare;
    }

    public function handle(Request $request, Closure $next): BaseResponse
    {
        $response = $next($request);

        // Only process HTML responses
        if (!$this->shouldProcessResponse($response)) {
            return $response;
        }

        $content = $response->getContent();
        
        // Inject React component bootstrapping
        if ($this->shouldInjectBootstrap($content)) {
            $content = $this->injectReactBootstrap($content);
            $response->setContent($content);
        }

        return $response;
    }

    protected function shouldProcessResponse(BaseResponse $response): bool
    {
        // Only process successful HTML responses
        if (!$response->isSuccessful()) {
            return false;
        }

        $contentType = $response->headers->get('Content-Type', '');
        
        return str_contains($contentType, 'text/html') || 
               str_contains($contentType, 'application/xhtml+xml') ||
               empty($contentType); // Default to HTML if no content type
    }

    protected function shouldInjectBootstrap(string $content): bool
    {
        // Only inject if we have components to render and haven't already injected
        return $this->registry->count() > 0 && 
               str_contains($content, '<html') &&
               str_contains($content, '</head>') &&
               !str_contains($content, 'react-wrapper-bootstrap') &&
               !str_contains($content, 'React Wrapper Assets'); // Prevent duplicate injection with FilamentIntegration
    }

    protected function injectReactBootstrap(string $content): string
    {
        $scripts = [];
        
        // Inject shared variables
        $scripts[] = $this->variableShare->generateJavaScriptInjection();
        
        // Get pending components for lazy loading
        $pendingComponents = $this->assetManager->getPendingAssets();
        
        // Check if we should use Laravel bundle
        if ($this->assetManager->shouldUseLaravelBundle()) {
            // Laravel bundle mode - inject external dependencies and main bundle
            $externalDeps = $this->assetManager->generateExternalDependencies();
            $scripts = array_merge($scripts, $externalDeps);
            
            // Add main bundle script
            $mainBundleScript = $this->assetManager->generateMainBundleScript();
            if ($mainBundleScript) {
                $scripts[] = $mainBundleScript;
            }
            
            // Add component initialization for Laravel bundle
            if (!empty($pendingComponents)) {
                $scripts[] = $this->assetManager->generateLazyLoadScript($pendingComponents);
            }
        } else {
            // Vite-based mode (development or production)
            $isDev = $this->assetManager->isViteDevServerRunning();
            
            if ($isDev) {
                // Development mode - inject Vite client
                $viteDevServerUrl = config('react-wrapper.vite.dev_server_url', 'http://localhost:5173');
                $scripts[] = '<script type="module" src="' . $viteDevServerUrl . '/@vite/client"></script>';
                
                // Use main bundle script for consistency
                $mainBundleScript = $this->assetManager->generateMainBundleScript();
                if ($mainBundleScript) {
                    $scripts[] = $mainBundleScript;
                }
            } else {
                // Production mode - use main bundle
                $mainBundleScript = $this->assetManager->generateMainBundleScript();
                if ($mainBundleScript) {
                    $scripts[] = $mainBundleScript;
                }
            }
            
            // Generate lazy loading script for Vite mode
            if (!empty($pendingComponents)) {
                $scripts[] = $this->assetManager->generateLazyLoadScript($pendingComponents);
            }
        }
        
        // Add component registry data
        $registeredComponents = array_keys($this->registry->all());
        $componentData = json_encode([
            'registered' => $registeredComponents,
            'pending' => $pendingComponents,
            'bundleType' => $this->assetManager->shouldUseLaravelBundle() ? 'laravel' : 'vite',
        ], JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT);
        
        $scripts[] = '<script id="react-wrapper-registry" type="application/json">' . $componentData . '</script>';
        
        // Generate preload tags for critical components (only for Vite mode)
        $preloadTags = [];
        if (!$this->assetManager->shouldUseLaravelBundle()) {
            $preloadTags = $this->assetManager->generatePreloadTags($pendingComponents);
        }
        
        // Inject before closing head tag
        $allTags = array_merge($preloadTags, $scripts);
        $scriptTags = implode("\n    ", array_filter($allTags));
        
        return str_replace(
            '</head>',
            "    <!-- React Wrapper Assets -->\n    {$scriptTags}\n</head>",
            $content
        );
    }

}
