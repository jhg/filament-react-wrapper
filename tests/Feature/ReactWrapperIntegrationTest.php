<?php

namespace HadyFayed\ReactWrapper\Tests\Feature;

use HadyFayed\ReactWrapper\Forms\Components\ReactField;
use HadyFayed\ReactWrapper\Factories\ReactComponentFactory;
use HadyFayed\ReactWrapper\ReactWrapperServiceProvider;
use HadyFayed\ReactWrapper\Tests\TestCase;
use HadyFayed\ReactWrapper\Widgets\ReactWidget;
use HadyFayed\ReactWrapper\Blade\ReactDirective;
use Filament\Support\Facades\FilamentAsset;
use Illuminate\Support\Facades\Blade;
use Illuminate\Support\Facades\File;

class ReactWrapperIntegrationTest extends TestCase
{
    public function test_it_can_load_the_service_provider()
    {
        $this->assertTrue(true);
    }

    public function test_it_can_register_react_components()
    {
        $this->assertTrue(true);
    }

    public function test_the_prebuilt_runtime_is_registered_as_a_filament_asset(): void
    {
        $assets = FilamentAsset::getScripts([
            'hadyfayed/filament-react-wrapper',
        ]);

        $this->assertCount(1, $assets);
        $this->assertSame('react-wrapper', $assets[0]->getId());
        $this->assertFileExists($assets[0]->getPath());
        $this->assertStringNotContainsString('unpkg.com', file_get_contents($assets[0]->getPath()));
        $this->assertArrayHasKey(
            'filament-react:assets',
            \Artisan::all(),
        );
    }

    public function test_the_asset_command_publishes_the_runtime_to_filaments_asset_path(): void
    {
        config()->set('filament.assets_path', 'react-wrapper-test');

        $destination = public_path('react-wrapper-test/js/hadyfayed/filament-react-wrapper/react-wrapper.js');

        try {
            $this->artisan('filament-react:assets', ['--force' => true])
                ->assertExitCode(0);

            $this->assertFileExists($destination);
            $this->assertSame(
                file_get_contents(ReactWrapperServiceProvider::getComposerAssetPath()),
                file_get_contents($destination),
            );
        } finally {
            File::deleteDirectory(public_path('react-wrapper-test'));
        }
    }

    public function test_filament_components_can_be_loaded_and_configured()
    {
        $this->assertTrue(view()->exists('react-wrapper::filament.fields.react-field'));
        $this->assertTrue(view()->exists('react-wrapper::filament.widgets.react-widget'));

        $field = ReactField::make('content')->component('Editor');
        $widget = ReactWidget::component('Dashboard');

        $this->assertSame('Editor', $field->getComponentName());
        $this->assertSame('Dashboard', $widget->getComponentName());
        $this->assertStringContainsString('react-wrapper::filament.widgets.react-widget', $widget->render()->name());
    }

    public function test_component_script_escapes_extension_controlled_identifiers(): void
    {
        $componentName = "</script><script>alert('component')</script>";
        $widget = ReactWidget::component($componentName);

        $script = $widget->generateWidgetScript();

        $this->assertStringNotContainsString($componentName, $script);
        $this->assertStringNotContainsString('</script>', $script);
        $this->assertStringContainsString('window.ReactWrapper.widgets[', $script);
    }

    public function test_blade_views_delegate_runtime_lifecycle_to_the_adapter(): void
    {
        $widgetView = file_get_contents(__DIR__.'/../../resources/views/filament/widgets/react-widget.blade.php');
        $fieldView = file_get_contents(__DIR__.'/../../resources/views/filament/fields/react-field.blade.php');

        $this->assertIsString($widgetView);
        $this->assertIsString($fieldView);
        $this->assertStringNotContainsString("@push('scripts')", $widgetView);
        $this->assertStringNotContainsString("@push('scripts')", $fieldView);
        $this->assertStringNotContainsString('DOMContentLoaded', $widgetView);
        $this->assertStringNotContainsString('DOMContentLoaded', $fieldView);
        $this->assertStringNotContainsString('@this.set', $widgetView);
        $this->assertStringNotContainsString('@this.set', $fieldView);
    }

    public function test_react_fields_expose_a_state_path_for_controlled_updates(): void
    {
        $view = file_get_contents(__DIR__.'/../../resources/views/filament/fields/react-field.blade.php');

        $this->assertIsString($view);
        $this->assertStringContainsString('data-react-state-path="{{ $getStatePath() }}"', $view);
        $this->assertStringNotContainsString('@this.set', $view);
    }

    public function test_react_component_directive_parser_handles_nested_php_expressions(): void
    {
        $parser = new \ReflectionMethod(ReactDirective::class, 'parseDirectiveArguments');
        $parser->setAccessible(true);
        $directive = app(ReactDirective::class);

        $arguments = $parser->invoke($directive, '(Editor, ["label" => "A, B", "meta" => ["nested" => true]], ["lazy" => true])');

        $this->assertSame([
            'Editor',
            '["label" => "A, B", "meta" => ["nested" => true]]',
            '["lazy" => true]',
        ], $arguments);
    }

    public function test_react_component_directive_parser_preserves_parentheses_and_escaped_quotes(): void
    {
        $parser = new \ReflectionMethod(ReactDirective::class, 'parseDirectiveArguments');
        $parser->setAccessible(true);
        $directive = app(ReactDirective::class);

        $arguments = $parser->invoke($directive, '(Editor, fn ($value) => strtoupper($value), ["title" => "Say \\"hello\\""])');

        $this->assertSame('fn ($value) => strtoupper($value)', $arguments[1]);
        $this->assertSame('["title" => "Say \\"hello\\""]', $arguments[2]);
    }

    public function test_blade_factory_renders_escaped_component_attributes(): void
    {
        $html = app(ReactComponentFactory::class)->render(
            '</div><script>alert(1)</script>',
            ['title' => 'A & B'],
            ['container_id' => 'react-test']
        );

        $this->assertStringContainsString('id="react-test"', $html);
        $this->assertStringNotContainsString('</script>', $html);
        $this->assertStringContainsString('data-react-component="&lt;/div&gt;', $html);
    }

    public function test_attribute_directives_hex_encode_untrusted_json_values(): void
    {
        $props = ['value' => '</script><script>alert("x")</script>'];

        $propsHtml = Blade::render('@reactProps($props)', compact('props'));
        $configHtml = Blade::render('@reactConfig($props)', compact('props'));

        foreach ([$propsHtml, $configHtml] as $html) {
            $this->assertStringStartsWith('data-react-', $html);
            $this->assertStringContainsString('\u003C\/script\u003E\u003Cscript\u003E', $html);
            $this->assertStringNotContainsString('</script>', $html);
        }
    }

    public function test_filament_views_hex_encode_component_props_before_html_escaping(): void
    {
        $fieldView = file_get_contents(__DIR__.'/../../resources/views/filament/fields/react-field.blade.php');
        $widgetView = file_get_contents(__DIR__.'/../../resources/views/filament/widgets/react-widget.blade.php');

        $this->assertStringContainsString('JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT', $fieldView);
        $this->assertStringContainsString('JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT', $widgetView);
    }
}
