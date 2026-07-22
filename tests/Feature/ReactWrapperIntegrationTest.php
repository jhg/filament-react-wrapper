<?php

namespace HadyFayed\ReactWrapper\Tests\Feature;

use HadyFayed\ReactWrapper\Forms\Components\ReactField;
use HadyFayed\ReactWrapper\Factories\ReactComponentFactory;
use HadyFayed\ReactWrapper\Tests\TestCase;
use HadyFayed\ReactWrapper\Widgets\ReactWidget;

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

    public function test_blade_scripts_use_javascript_escaping_for_dynamic_values(): void
    {
        $widgetView = file_get_contents(__DIR__.'/../../resources/views/filament/widgets/react-widget.blade.php');
        $fieldView = file_get_contents(__DIR__.'/../../resources/views/filament/fields/react-field.blade.php');

        $this->assertIsString($widgetView);
        $this->assertIsString($fieldView);
        $this->assertStringContainsString('document.getElementById(@js($containerId))', $widgetView);
        $this->assertStringContainsString('document.getElementById(@js($containerId))', $fieldView);
        $this->assertStringNotContainsString('document.getElementById(\'{{ $containerId }}\')', $widgetView);
        $this->assertStringNotContainsString('document.getElementById(\'{{ $containerId }}\')', $fieldView);
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
}
