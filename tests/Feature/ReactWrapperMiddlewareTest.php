<?php

namespace HadyFayed\ReactWrapper\Tests\Feature;

use HadyFayed\ReactWrapper\Middleware\ReactWrapperMiddleware;
use HadyFayed\ReactWrapper\Services\AssetManager;
use HadyFayed\ReactWrapper\Services\ReactComponentRegistry;
use HadyFayed\ReactWrapper\Services\VariableShareService;
use HadyFayed\ReactWrapper\Tests\TestCase;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ReactWrapperMiddlewareTest extends TestCase
{
    public function test_it_injects_bootstrap_and_registry_data_before_the_closing_head(): void
    {
        $middleware = $this->middlewareWithComponents();
        $response = new Response(
            '<html><head><title>Dashboard</title></head><body>Content</body></html>',
            200,
            ['Content-Type' => 'text/html; charset=UTF-8'],
        );

        $result = $middleware->handle(Request::create('/'), fn () => $response);
        $content = $result->getContent();

        $this->assertIsString($content);
        $this->assertSame(1, substr_count($content, '<!-- React Wrapper Assets -->'));
        $this->assertStringContainsString('<script>window.shared = true;</script>', $content);
        $this->assertStringContainsString('id="react-wrapper-registry"', $content);
        $this->assertStringContainsString('Chart', $content);
        $this->assertLessThan(
            strpos($content, '</head>'),
            strpos($content, '<!-- React Wrapper Assets -->'),
        );
    }

    public function test_it_does_not_inject_without_components_or_when_already_injected(): void
    {
        $emptyRegistry = new ReactComponentRegistry;
        $emptyMiddleware = $this->middleware($emptyRegistry);
        $emptyContent = '<html><head></head><body></body></html>';
        $emptyResponse = new Response($emptyContent, 200, ['Content-Type' => 'text/html']);

        $this->assertSame(
            $emptyContent,
            $emptyMiddleware->handle(Request::create('/'), fn () => $emptyResponse)->getContent(),
        );

        $alreadyInjected = '<html><head><!-- React Wrapper Assets --></head><body></body></html>';
        $response = new Response($alreadyInjected, 200, ['Content-Type' => 'text/html']);

        $this->assertSame(
            $alreadyInjected,
            $this->middlewareWithComponents()->handle(Request::create('/'), fn () => $response)->getContent(),
        );
    }

    public function test_it_skips_non_html_unsuccessful_and_incomplete_html_responses(): void
    {
        $middleware = $this->middlewareWithComponents();

        $json = new Response('{"ok":true}', 200, ['Content-Type' => 'application/json']);
        $this->assertSame('{"ok":true}', $middleware->handle(Request::create('/'), fn () => $json)->getContent());

        $error = new Response('<html><head></head></html>', 500, ['Content-Type' => 'text/html']);
        $this->assertSame('<html><head></head></html>', $middleware->handle(Request::create('/'), fn () => $error)->getContent());

        $withoutHead = '<html><body>Content</body></html>';
        $incomplete = new Response($withoutHead, 200, ['Content-Type' => 'text/html']);
        $this->assertSame($withoutHead, $middleware->handle(Request::create('/'), fn () => $incomplete)->getContent());
    }

    public function test_empty_content_type_is_treated_as_html(): void
    {
        $response = new Response('<html><head></head><body></body></html>', 200);

        $content = $this->middlewareWithComponents()
            ->handle(Request::create('/'), fn () => $response)
            ->getContent();

        $this->assertIsString($content);
        $this->assertStringContainsString('react-wrapper-registry', $content);
    }

    private function middlewareWithComponents(): ReactWrapperMiddleware
    {
        $registry = new ReactComponentRegistry;
        $registry->register('Chart', 'ChartComponent');

        return $this->middleware($registry);
    }

    private function middleware(ReactComponentRegistry $registry): ReactWrapperMiddleware
    {
        $assetManager = $this->createStub(AssetManager::class);
        $assetManager->method('getPendingAssets')->willReturn(['Chart']);
        $assetManager->method('shouldUseLaravelBundle')->willReturn(false);
        $assetManager->method('isViteDevServerRunning')->willReturn(false);
        $assetManager->method('generateMainBundleScript')->willReturn('<script src="/build.js"></script>');
        $assetManager->method('generateLazyLoadScript')->willReturn('<script>window.lazy = true;</script>');
        $assetManager->method('generatePreloadTags')->willReturn([]);

        $variableShare = $this->createStub(VariableShareService::class);
        $variableShare->method('generateJavaScriptInjection')->willReturn('<script>window.shared = true;</script>');

        return new ReactWrapperMiddleware($registry, $assetManager, $variableShare);
    }
}
