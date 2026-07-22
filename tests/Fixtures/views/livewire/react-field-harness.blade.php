<div>
    {{ $this->form }}

    <button type="button" wire:click="save">Save</button>

    @if($saved)
        <output data-testid="saved">{{ json_encode($savedData) }}</output>
    @endif
</div>
