<?php

namespace HadyFayed\ReactWrapper\Tests\Unit;

use HadyFayed\ReactWrapper\Tests\Fixtures\Livewire\ReactWidgetHarness;
use HadyFayed\ReactWrapper\Tests\TestCase;
use HadyFayed\ReactWrapper\Widgets\ReactWidget;

class ReactWidgetTest extends TestCase
{
    public function test_component_props_merge_widget_data_user_props_and_polling_configuration(): void
    {
        $widget = (new ReactWidgetHarness)
            ->withComponent('SalesChart')
            ->props(['period' => 'week'])
            ->filters(['region' => 'eu'])
            ->theme('dark')
            ->height(420)
            ->polling('10s');

        $props = $widget->getComponentProps();

        $this->assertSame('SalesChart', $widget->getComponentName());
        $this->assertSame('week', $props['period']);
        $this->assertSame(['region' => 'eu'], $props['filters']);
        $this->assertSame('dark', $props['theme']);
        $this->assertSame(420, $props['height']);
        $this->assertTrue($props['polling']);
        $this->assertSame('10s', $props['pollingInterval']);
        $this->assertSame(['series' => [1, 2, 3], 'source' => 'test-widget'], $props['data']);
    }

    public function test_live_and_debounce_are_exposed_in_widget_props_and_view_data(): void
    {
        $widget = ReactWidget::component('LiveChart')->live()->debounce(450);

        $props = $widget->getComponentProps();
        $viewData = $this->invoke($widget, 'getViewData');

        $this->assertTrue($props['reactive']);
        $this->assertSame(450, $props['debounceMs']);
        $this->assertTrue($viewData['reactive']);
        $this->assertSame(450, $viewData['debounceMs']);
    }

    public function test_polling_can_be_disabled_and_view_data_keeps_the_default_deferred_mode(): void
    {
        $widget = ReactWidget::component('StaticChart')->polling(false);
        $viewData = $this->invoke($widget, 'getViewData');

        $this->assertFalse($viewData['polling']);
        $this->assertSame('5s', $viewData['pollingInterval']);
        $this->assertFalse($viewData['reactive']);
        $this->assertSame(300, $viewData['debounceMs']);
    }

    private function invoke(object $target, string $method): mixed
    {
        $reflection = new \ReflectionMethod($target, $method);
        $reflection->setAccessible(true);

        return $reflection->invoke($target);
    }
}
