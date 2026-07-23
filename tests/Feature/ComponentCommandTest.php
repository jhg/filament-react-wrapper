<?php

namespace HadyFayed\ReactWrapper\Tests\Feature;

use HadyFayed\ReactWrapper\Tests\TestCase;
use Illuminate\Support\Facades\File;

class ComponentCommandTest extends TestCase
{
    public function test_field_generation_uses_the_controlled_field_stub(): void
    {
        $basePath = sys_get_temp_dir().'/filament-react-wrapper-'.uniqid('', true);
        File::ensureDirectoryExists($basePath.'/resources/js/components', 0755);
        $originalBasePath = app()->basePath();

        app()->setBasePath($basePath);

        try {
            $this->artisan('filament-react:component', [
                'name' => 'GeneratedField',
                '--field' => true,
            ])->assertExitCode(0);

            $component = File::get($basePath.'/resources/js/components/GeneratedField.tsx');

            $this->assertStringContainsString("import { useReactField, type ReactFieldProps }", $component);
            $this->assertStringContainsString('useReactField(props)', $component);
            $this->assertStringNotContainsString('@Component(', $component);
            $this->assertStringNotContainsString('useFilamentBridge', $component);
        } finally {
            app()->setBasePath($originalBasePath);
            File::deleteDirectory($basePath);
        }
    }
}
