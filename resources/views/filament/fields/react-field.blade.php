@php
    $componentName = $getComponentName();
    $componentProps = $getComponentProps();
    $containerId = $getContainerId();
    $height = $getHeight();
    $isLazy = $componentProps['lazy'] ?? true;
@endphp

<x-dynamic-component :component="$getFieldWrapperView()" :field="$field">
    <div 
        id="{{ $containerId }}"
        data-react-component="{{ $componentName }}"
        data-react-props="{{ json_encode($componentProps) }}"
        data-lazy="{{ $isLazy ? 'true' : 'false' }}"
        class="react-field-container"
        style="min-height: {{ $height }}px;"
        wire:ignore
    >
        @if($isLazy)
            <div class="react-field-loading">
                <div class="flex items-center justify-center h-full">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    <span class="ml-2 text-sm text-gray-600 dark:text-gray-400">
                        Loading {{ $componentName }}...
                    </span>
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

@push('scripts')
<script>
    document.addEventListener('DOMContentLoaded', function() {
        const container = document.getElementById(@js($containerId));
        
        if (!container) return;
        
        // Enhanced error handling
        container.addEventListener('react-error', function(event) {
            console.error('React Field Error:', event.detail);
            const errorMessage = event.detail?.message || event.detail?.error || 'Unknown error';

            const errorDiv = document.createElement('div');
            errorDiv.className = 'bg-red-50 border border-red-200 rounded-md p-4 mt-2';
            errorDiv.innerHTML = `
                <div class="flex">
                    <div class="flex-shrink-0">
                        <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                        </svg>
                    </div>
                    <div class="ml-3">
                        <h3 class="text-sm font-medium text-red-800">
                            React Component Error
                        </h3>
                        <div class="mt-2 text-sm text-red-700">
                            <p>Failed to load component: {{ $componentName }}</p>
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
            console.log('React Field Loaded:', @js($componentName));
            
            // Remove loading indicator
            const loading = container.querySelector('.react-field-loading');
            if (loading) {
                loading.remove();
            }
        });
        
        // Data update handler for reactive fields
        @if($reactive ?? true)
        container.addEventListener('react-data-changed', function(event) {
            const data = event.detail;
            
            // Update Livewire component state
            if (window.Livewire && data.fieldName) {
                @this.set(data.fieldName, data.value);
            }
        });
        @endif
        
        // Validation handler
        container.addEventListener('react-validation-error', function(event) {
            const errors = event.detail.errors || [];
            
            // Update field validation state
            if (window.Livewire && errors.length > 0) {
                @this.addError(@js($getName()), errors[0]);
            }
        });
    });
</script>
@endpush

@push('styles')
<style>
    .react-field-container {
        @apply relative overflow-hidden rounded-lg border border-gray-300 dark:border-gray-600;
        background: var(--filament-body-bg);
    }
    
    .react-field-loading {
        @apply absolute inset-0 bg-white dark:bg-gray-800 bg-opacity-75 z-10;
    }
    
    @if($resizable ?? false)
    .react-field-container {
        resize: vertical;
    }
    @endif
    
    @if($fullscreen ?? false)
    .react-field-container.fullscreen {
        @apply fixed inset-0 z-50 max-w-none max-h-none;
    }
    @endif
</style>
@endpush
