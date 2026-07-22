<?php

namespace HadyFayed\ReactWrapper\Tests\Fixtures\Livewire;

use HadyFayed\ReactWrapper\Widgets\ReactWidget;
use Illuminate\Support\MessageBag;
use Illuminate\Contracts\View\View;

class ReactWidgetHarness extends ReactWidget
{
    public function __construct()
    {
        parent::__construct();

        $this->withComponent('IntegrationDashboard')->polling('2s');
    }

    public function getData(): array
    {
        return [
            'series' => [1, 2, 3],
            'source' => 'test-widget',
        ];
    }

    public function render(): View
    {
        if (! $this->getErrorBag() instanceof MessageBag) {
            $this->setErrorBag(new MessageBag);
        }

        return parent::render();
    }

    public function getHeading(): ?string
    {
        return 'Integration widget';
    }
}
