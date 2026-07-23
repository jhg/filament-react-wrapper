@php
    $componentName = $getComponentName();
    $componentProps = $getComponentProps();
    $containerId = $getContainerId();
    $height = $getHeight();
    $isLazy = $componentProps['lazy'] ?? true;
    $isReactive = $componentProps['reactive'] ?? false;
    $debounceMs = $componentProps['debounceMs'] ?? 300;
@endphp

<x-dynamic-component :component="$getFieldWrapperView()" :field="$field">
    <div
        id="{{ $containerId }}"
        data-react-component="{{ $componentName }}"
        data-react-props="{{ json_encode($componentProps, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT) }}"
        data-react-state-path="{{ $getStatePath() }}"
        data-react-reactive="{{ $isReactive ? 'true' : 'false' }}"
        data-react-debounce="{{ $debounceMs }}"
        data-lazy="{{ $isLazy ? 'true' : 'false' }}"
        class="react-field-container"
        style="min-height: {{ $height }}px;"
        wire:ignore
    >
        @if($isLazy)
            <div class="react-field-loading">
                <div class="react-field-loading-content">
                    <div class="react-field-spinner" aria-hidden="true"></div>
                    <span>Loading {{ $componentName }}...</span>
                </div>
            </div>
        @endif
    </div>

    @if(!$isLazy || app()->environment('local'))
        <script>
            {!! $generateFieldScript() !!}
        </script>
    @endif
</x-dynamic-component>

@push('styles')
<style>
    .react-field-container {
        position: relative;
        overflow: hidden;
        border: 1px solid rgb(209 213 219);
        border-radius: 0.5rem;
        background: var(--fi-body-bg, transparent);
    }

    .react-field-loading {
        position: absolute;
        inset: 0;
        z-index: 10;
        background: rgb(255 255 255 / 75%);
    }

    .react-field-loading-content {
        display: flex;
        height: 100%;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        color: rgb(75 85 99);
        font-size: 0.875rem;
    }

    .react-field-spinner {
        width: 2rem;
        height: 2rem;
        border: 2px solid transparent;
        border-bottom-color: rgb(37 99 235);
        border-radius: 9999px;
        animation: react-wrapper-spin 1s linear infinite;
    }

    @keyframes react-wrapper-spin {
        to { transform: rotate(360deg); }
    }

    @if($resizable ?? false)
    .react-field-container {
        resize: vertical;
    }
    @endif

    @if($fullscreen ?? false)
    .react-field-container.fullscreen {
        position: fixed;
        inset: 0;
        z-index: 50;
        max-width: none;
        max-height: none;
    }
    @endif
</style>
@endpush
