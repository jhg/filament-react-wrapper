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
        $this->createReactComponent($name, $category, $widget, $field);

        // Create widget if requested
        if ($widget) {
            $this->createWidget($name);
        }

        // Create field if requested
        if ($field) {
            $this->createField($name);
        }

        $this->info("✅ Component {$name} created successfully!");
        $this->showUsageExample($name, $widget, $field, $lazy);

        return 0;
    }

    private function createReactComponent(
        string $name,
        string $category,
        bool $widget,
        bool $field,
    ): void
    {
        $componentDir = resource_path('js/components');
        File::ensureDirectoryExists($componentDir, 0755);

        $componentFile = "{$componentDir}/{$name}.tsx";

        if (File::exists($componentFile) && !$this->option('force')) {
            $this->error("Component {$name} already exists. Use --force to overwrite.");
            return;
        }

        $stub = $field
            ? 'component-field.tsx.stub'
            : ($widget ? 'component-widget.tsx.stub' : 'component-display.tsx.stub');
        $stubPath = __DIR__.'/../../resources/stubs/'.$stub;
        $componentTemplate = str_replace(
            ['{{ name }}', '{{ category }}'],
            [$name, $category],
            File::get($stubPath),
        );

        File::put($componentFile, $componentTemplate);
        $this->info("   ✅ React component created: {$componentFile}");
    }

    private function createWidget(string $name)
    {
        $widgetDir = app_path('Filament/Widgets');
        File::ensureDirectoryExists($widgetDir, 0755);

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
        File::ensureDirectoryExists($fieldDir, 0755);

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

    private function showUsageExample(string $name, bool $widget, bool $field, bool $lazy): void
    {
        $this->info('📖 Usage examples:');
        
        // React component usage and registration
        $this->line("React component usage:");
        $this->line("import {$name} from './components/{$name}';");
        if ($lazy) {
            $this->line("import { registerLazyComponent } from '@react-wrapper';");
            $this->line("registerLazyComponent('{$name}', () => import('./components/{$name}'));");
        } else {
            $this->line("import { defineComponents } from '@react-wrapper';");
            $this->line("defineComponents({ {$name} });");
        }
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
            $this->line("use HadyFayed\\ReactWrapper\\Forms\\Components\\ReactField;");
            $this->line('');
            $this->line("ReactField::make('field_name')");
            $this->line("    ->component('{$name}'),");
            $this->line("// Optional live server updates: ->reactive()->debounce(500)");
            $this->line('');
        }

        // Direct mounting
        $this->line("Direct mounting:");
        $this->line("FilamentReact.mountIsland('#my-container', '{$name}', { title: 'My Title' });");
    }
}
