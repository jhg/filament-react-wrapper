<?php

namespace HadyFayed\ReactWrapper\Console;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class ComponentCommand extends Command
{
    protected $signature = 'filament-react:component 
                           {name : The name of the component}
                           {--category=general : Component category}
                           {--lazy : Make component lazy-loaded}
                           {--widget : Generate as a Filament widget}
                           {--field : Generate as a Filament form field}
                           {--force : Force creation}';

    protected $description = 'Generate a new React component for Filament';

    public function handle()
    {
        $name = $this->argument('name');
        $category = $this->option('category');
        $lazy = $this->option('lazy');
        $widget = $this->option('widget');
        $field = $this->option('field');

        $this->info("🎯 Creating React component: {$name}");

        // Create the React component
        $this->createReactComponent($name, $category, $lazy);

        // Create widget if requested
        if ($widget) {
            $this->createWidget($name);
        }

        // Create field if requested
        if ($field) {
            $this->createField($name);
        }

        $this->info("✅ Component {$name} created successfully!");
        $this->showUsageExample($name, $widget, $field);

        return 0;
    }

    private function createReactComponent(string $name, string $category, bool $lazy)
    {
        $componentDir = resource_path('js/components');
        File::makeDirectory($componentDir, 0755, true);

        $componentFile = "{$componentDir}/{$name}.tsx";

        if (File::exists($componentFile) && !$this->option('force')) {
            $this->error("Component {$name} already exists. Use --force to overwrite.");
            return;
        }

        $lazyDecorator = $lazy ? 'lazy: true, ' : '';
        $componentTemplate = <<<TSX
import React from 'react';
import { Component } from '@react-wrapper';
import { useFilamentState, useFilamentBridge } from '@react-wrapper';

interface {$name}Props {
    title?: string;
    // Add your props here
}

@Component('{$name}', { {$lazyDecorator}category: '{$category}' })
export const {$name}: React.FC<{$name}Props> = ({ title = 'Default Title' }) => {
    const { \$filament } = useFilamentBridge();
    const [data, setData] = useFilamentState('{$name}.data', {});

    const handleAction = async () => {
        try {
            const result = await \$filament.call('handle{$name}Action', data);
            console.log('Action result:', result);
        } catch (error) {
            console.error('Action failed:', error);
        }
    };

    return (
        <div className="p-4 border rounded-lg">
            <h3 className="text-lg font-semibold mb-4">{title}</h3>
            
            <div className="space-y-4">
                <p className="text-gray-600">
                    This is your new {$name} component.
                </p>
                
                <button
                    onClick={handleAction}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    Action Button
                </button>
            </div>
        </div>
    );
};

export default {$name};
TSX;

        File::put($componentFile, $componentTemplate);
        $this->info("   ✅ React component created: {$componentFile}");
    }

    private function createWidget(string $name)
    {
        $widgetDir = app_path('Filament/Widgets');
        File::makeDirectory($widgetDir, 0755, true);

        $widgetFile = "{$widgetDir}/{$name}Widget.php";

        if (File::exists($widgetFile) && !$this->option('force')) {
            $this->error("Widget {$name}Widget already exists. Use --force to overwrite.");
            return;
        }

        $widgetTemplate = <<<PHP
<?php

namespace App\\Filament\\Widgets;

use HadyFayed\\ReactWrapper\\Widgets\\ReactWidget;

class {$name}Widget extends ReactWidget
{
    public function __construct()
    {
        parent::__construct();
        \$this->withComponent('{$name}');
    }

    public function getData(): array
    {
        return [
            'title' => 'Widget Title',
            // Add your data here
        ];
    }

}
PHP;

        File::put($widgetFile, $widgetTemplate);
        $this->info("   ✅ Widget created: {$widgetFile}");
    }

    private function createField(string $name)
    {
        $fieldDir = app_path('Filament/Components');
        File::makeDirectory($fieldDir, 0755, true);

        $fieldFile = "{$fieldDir}/{$name}Field.php";

        if (File::exists($fieldFile) && !$this->option('force')) {
            $this->error("Field {$name}Field already exists. Use --force to overwrite.");
            return;
        }

        $fieldTemplate = <<<PHP
<?php

namespace App\\Filament\\Components;

use HadyFayed\\ReactWrapper\\Forms\\Components\\ReactField;

class {$name}Field extends ReactField
{
    public static function make(?string \$name = null): static
    {
        return parent::make(\$name)->component('{$name}');
    }

    public function getComponentProps(): array
    {
        return array_merge(parent::getComponentProps(), [
            'title' => 'Field Title',
            // Add your props here
        ]);
    }
}
PHP;

        File::put($fieldFile, $fieldTemplate);
        $this->info("   ✅ Field created: {$fieldFile}");
    }

    private function showUsageExample(string $name, bool $widget, bool $field)
    {
        $this->info('📖 Usage examples:');
        
        // React component usage
        $this->line("React component usage:");
        $this->line("import { {$name} } from './components/{$name}';");
        $this->line("// Component is auto-registered via decorator");
        $this->line('');

        // Widget usage
        if ($widget) {
            $this->line("Widget usage in Filament:");
            $this->line("// Add to your dashboard or resource:");
            $this->line("protected function getHeaderWidgets(): array");
            $this->line("{");
            $this->line("    return [");
            $this->line("        App\\Filament\\Widgets\\{$name}Widget::class,");
            $this->line("    ];");
            $this->line("}");
            $this->line('');
        }

        // Field usage
        if ($field) {
            $this->line("Form field usage:");
            $this->line("use App\\Filament\\Components\\{$name}Field;");
            $this->line('');
            $this->line("{$name}Field::make('field_name')");
            $this->line("    ->reactive()");
            $this->line("    ->lazy(),");
            $this->line('');
        }

        // Direct mounting
        $this->line("Direct mounting:");
        $this->line("FilamentReact.mountIsland('#my-container', '{$name}', { title: 'My Title' });");
    }
}
