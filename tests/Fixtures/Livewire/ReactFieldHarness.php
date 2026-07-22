<?php

namespace HadyFayed\ReactWrapper\Tests\Fixtures\Livewire;

use Filament\Forms\Components\TextInput;
use Filament\Forms\Concerns\InteractsWithForms;
use Filament\Forms\Contracts\HasForms;
use HadyFayed\ReactWrapper\Forms\Components\ReactField;
use Illuminate\Support\MessageBag;
use Livewire\Component;

class ReactFieldHarness extends Component implements HasForms
{
    use InteractsWithForms;

    public array $data = [
        'content' => 'initial value',
        'title' => 'Harness',
    ];

    public bool $saved = false;

    public array $savedData = [];

    public function mount(): void
    {
        $this->setErrorBag(new MessageBag);
    }

    protected function getFormSchema(): array
    {
        return [
            ReactField::make('content')
                ->component('IntegrationControlledEditor')
                ->required(),
            TextInput::make('title'),
        ];
    }

    protected function getFormStatePath(): ?string
    {
        return 'data';
    }

    public function save(): void
    {
        $this->validate();

        $this->savedData = $this->form->getState();
        $this->saved = true;
    }

    public function render()
    {
        $errorBag = $this->getErrorBag();
        if (! $errorBag instanceof MessageBag) {
            $this->setErrorBag(new MessageBag);
        }

        return view('react-wrapper-tests::livewire.react-field-harness');
    }
}
