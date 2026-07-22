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
            <x-slot name="heading">
                {{ $getHeading() }}
            </x-slot>
        @endif
        
        @if($getDescription())
            <x-slot name="description">
                {{ $getDescription() }}
            </x-slot>
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
                    <div class="flex flex-col items-center justify-center h-full py-8">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-4"></div>
                        <span class="text-sm text-gray-600 dark:text-gray-400">
                            Loading {{ $componentName }}...
                        </span>
                    </div>
                </div>
            @endif
        </div>
    </x-filament::section>
    
    @if(!$isLazy || app()->environment('local'))
        <script>
            {!! $script ?? '' !!}
        </script>
    @endif
</x-filament-widgets::widget>

@push('scripts')
<script>
    document.addEventListener('DOMContentLoaded', function() {
        const container = document.getElementById(@js($containerId));
        const componentName = @js($componentName);
        
        if (!container) return;
        
        // Enhanced error handling
        container.addEventListener('react-error', function(event) {
            console.error('React Widget Error:', event.detail);
            const errorMessage = event.detail?.message || event.detail?.error || 'Unknown error';

            const errorDiv = document.createElement('div');
            errorDiv.className = 'bg-red-50 border border-red-200 rounded-md p-4';
            errorDiv.innerHTML = `
                <div class="flex">
                    <div class="flex-shrink-0">
                        <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                        </svg>
                    </div>
                    <div class="ml-3">
                        <h3 class="text-sm font-medium text-red-800">
                            Widget Error
                        </h3>
                        <div class="mt-2 text-sm text-red-700">
                            <p>Failed to load widget: ${componentName}</p>
                            <p class="react-error-message text-xs mt-1"></p>
                        </div>
                    </div>
                </div>
            `;
            errorDiv.querySelector('.react-error-message')?.append(document.createTextNode(String(errorMessage)));
            
            container.appendChild(errorDiv);
        });
        
        // Success handler
        container.addEventListener('react-loaded', function(event) {
            console.log('React Widget Loaded:', @js($componentName));
            
            // Remove loading indicator
            const loading = container.querySelector('.react-widget-loading');
            if (loading) {
                loading.remove();
            }
        });
        
        @if($polling)
        // Polling handler
        let pollingInterval;
        
        function startPolling() {
            if (pollingInterval) clearInterval(pollingInterval);
            
            const interval = @js($pollingInterval);
            const ms = interval.endsWith('s') ? 
                parseInt(interval) * 1000 : 
                parseInt(interval);
            
            pollingInterval = setInterval(() => {
                // Refresh widget data
                if (window.Livewire) {
                    @this.call('refresh');
                }
                
                // Notify React component
                container.dispatchEvent(new CustomEvent('widget-poll', {
                    detail: { interval: ms }
                }));
            }, ms);
        }
        
        // Start polling when component loads
        container.addEventListener('react-loaded', startPolling);
        
        // Stop polling when component unmounts
        container.addEventListener('react-unmount', function() {
            if (pollingInterval) {
                clearInterval(pollingInterval);
                pollingInterval = null;
            }
        });
        @endif
        
        // Widget refresh handler
        window.addEventListener('widget-refreshed', function(event) {
            if (event.detail.containerId === @js($containerId)) {
                container.dispatchEvent(new CustomEvent('widget-data-updated', {
                    detail: event.detail.data
                }));
            }
        });
        
        // Reactive updates
        @if($reactive ?? true)
        container.addEventListener('react-data-changed', function(event) {
            const data = event.detail;
            
            // Update widget state
            if (window.Livewire && data.property) {
                @this.set(data.property, data.value);
            }
        });
        @endif
    });
</script>
@endpush

@push('styles')
<style>
    .react-widget-container {
        @apply relative overflow-hidden rounded-lg;
        background: var(--filament-body-bg);
    }
    
    .react-widget-loading {
        @apply absolute inset-0 bg-white dark:bg-gray-800 bg-opacity-75 z-10;
    }
    
    .react-widget .fi-section-content {
        @apply p-0;
    }
    
    .react-widget-container > div {
        @apply h-full;
    }
</style>
@endpush
