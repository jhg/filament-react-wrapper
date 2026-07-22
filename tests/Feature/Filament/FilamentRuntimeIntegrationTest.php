<?php

namespace HadyFayed\ReactWrapper\Tests\Feature\Filament;

use HadyFayed\ReactWrapper\Tests\Fixtures\Livewire\ReactFieldHarness;
use HadyFayed\ReactWrapper\Tests\Fixtures\Livewire\ReactWidgetHarness;
use HadyFayed\ReactWrapper\Tests\TestCase;
use Livewire\Livewire;

class FilamentRuntimeIntegrationTest extends TestCase
{
    public function test_a_real_livewire_form_renders_a_react_field_with_the_full_state_path(): void
    {
        $test = Livewire::test(ReactFieldHarness::class);
        $html = $test->html();
        $container = $this->reactContainer($html, 'IntegrationControlledEditor');

        $this->assertSame('data.content', $container->getAttribute('data-react-state-path'));
        $this->assertTrue($container->hasAttribute('wire:ignore'));

        $props = json_decode(
            html_entity_decode($container->getAttribute('data-react-props'), ENT_QUOTES | ENT_HTML5),
            true,
            512,
            JSON_THROW_ON_ERROR,
        );

        $this->assertSame('initial value', $props['value']);
        $this->assertSame('data.content', $container->getAttribute('data-react-state-path'));
        $this->assertSame([], $props['errors']);
    }

    public function test_the_real_livewire_update_and_save_round_trip_uses_the_react_state_path(): void
    {
        Livewire::test(ReactFieldHarness::class)
            ->set('data.content', 'edited by React')
            ->assertSet('data.content', 'edited by React')
            ->call('save')
            ->assertSet('saved', true)
            ->assertSee('edited by React');
    }

    public function test_filament_validation_is_exposed_in_react_props(): void
    {
        $test = Livewire::test(ReactFieldHarness::class)
            ->set('data.content', '')
            ->call('save')
            ->assertHasErrors(['data.content']);

        $container = $this->reactContainer($test->html(), 'IntegrationControlledEditor');
        $props = json_decode(
            html_entity_decode($container->getAttribute('data-react-props'), ENT_QUOTES | ENT_HTML5),
            true,
            512,
            JSON_THROW_ON_ERROR,
        );

        $this->assertNotEmpty($props['errors']);
    }

    public function test_a_real_react_widget_renders_polling_and_dispatches_its_refresh_payload(): void
    {
        $test = Livewire::test(ReactWidgetHarness::class);
        $html = $test->html();

        $this->assertStringContainsString('data-react-component="IntegrationDashboard"', $html);
        $this->assertStringContainsString('data-polling="true"', $html);
        $this->assertStringContainsString('data-polling-interval="2s"', $html);
        $this->assertStringContainsString('test-widget', $html);

        $test
            ->call('refresh')
            ->assertDispatched('widget-refreshed', function (string $name, array $params): bool {
                return $name === 'widget-refreshed'
                    && $params['widgetId'] !== null
                    && $params['containerId'] !== ''
                    && $params['data']['source'] === 'test-widget';
            });
    }

    private function reactContainer(string $html, string $component): \DOMElement
    {
        $document = new \DOMDocument;
        $document->loadHTML('<?xml encoding="UTF-8">'.$html, LIBXML_NOERROR | LIBXML_NOWARNING);
        $xpath = new \DOMXPath($document);
        $nodes = $xpath->query(sprintf('//*[@data-react-component="%s"]', $component));

        $this->assertNotFalse($nodes);
        $this->assertCount(1, $nodes);

        /** @var \DOMElement $container */
        $container = $nodes->item(0);

        return $container;
    }
}
