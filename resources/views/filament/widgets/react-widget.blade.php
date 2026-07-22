@php
    $componentName = $componentName ?? '';
    $componentProps = $componentProps ?? [];
    $containerId = $containerId ?? '';
    $height = $height ?? 300;
    $isLazy = $lazy ?? true;
    $polling = $polling ?? false;
    $pollingInterval = $pollingInterval ?? '5s';
@endphp

<x-filament-widgets::widget class="react-widget">
    <x-filament::section>
        @if($getHeading())
            <x-slot name="heading">{{ $getHeading() }}</x-slot>
        @endif

        @if($getDescription())
            <x-slot name="description">{{ $getDescription() }}</x-slot>
        @endif

        <div
            id="{{ $containerId }}"
            data-react-component="{{ $componentName }}"
            data-react-props="{{ json_encode($componentProps) }}"
            data-lazy="{{ $isLazy ? 'true' : 'false' }}"
            data-polling="{{ $polling ? 'true' : 'false' }}"
            data-polling-interval="{{ $pollingInterval }}"
            class="react-widget-container"
            style="min-height: {{ $height }}px;"
            wire:ignore
        >
            @if($isLazy)
                <div class="react-widget-loading">
                    <div class="react-widget-loading-content">
                        <div class="react-widget-spinner" aria-hidden="true"></div>
                        <span>Loading {{ $componentName }}...</span>
                    </div>
                </div>
            @endif
        </div>

        @if(!$isLazy || app()->environment('local'))
            <script>{!! $script ?? '' !!}</script>
        @endif
    </x-filament::section>
</x-filament-widgets::widget>

@push('styles')
<style>
    .react-widget-container {
        position: relative;
        overflow: hidden;
        border-radius: 0.5rem;
        background: var(--fi-body-bg, transparent);
    }

    .react-widget-loading {
        position: absolute;
        inset: 0;
        z-index: 10;
        background: rgb(255 255 255 / 75%);
    }

    .react-widget-loading-content {
        display: flex;
        height: 100%;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        padding: 2rem 0;
        color: rgb(75 85 99);
        font-size: 0.875rem;
    }

    .react-widget-spinner {
        width: 2rem;
        height: 2rem;
        border: 2px solid transparent;
        border-bottom-color: rgb(37 99 235);
        border-radius: 9999px;
        animation: react-wrapper-spin 1s linear infinite;
    }

    .react-widget .fi-section-content {
        padding: 0;
    }

    .react-widget-container > div {
        height: 100%;
    }

    @keyframes react-wrapper-spin {
        to { transform: rotate(360deg); }
    }
</style>
@endpush
