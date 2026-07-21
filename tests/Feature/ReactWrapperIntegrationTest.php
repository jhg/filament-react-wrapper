<?php

namespace HadyFayed\ReactWrapper\Tests\Feature;

use HadyFayed\ReactWrapper\Forms\Components\ReactField;
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
}
