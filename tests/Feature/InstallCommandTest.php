<?php

namespace HadyFayed\ReactWrapper\Tests\Feature;

use HadyFayed\ReactWrapper\Console\InstallCommand;
use HadyFayed\ReactWrapper\Tests\TestCase;
use Illuminate\Console\OutputStyle;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Process;
use Symfony\Component\Console\Input\ArrayInput;
use Symfony\Component\Console\Output\NullOutput;

class InstallCommandTest extends TestCase
{
    private string $originalBasePath;
    private string $temporaryBasePath;

    protected function setUp(): void
    {
        parent::setUp();

        $this->originalBasePath = base_path();
        $this->temporaryBasePath = sys_get_temp_dir().'/react-wrapper-install-'.uniqid('', true);
        File::makeDirectory($this->temporaryBasePath, 0755, true);
        app()->setBasePath($this->temporaryBasePath);
    }

    protected function tearDown(): void
    {
        app()->setBasePath($this->originalBasePath);
        File::deleteDirectory($this->temporaryBasePath);

        parent::tearDown();
    }

    public function test_dev_configuration_writes_vite_and_typescript_files_and_respects_force(): void
    {
        $command = $this->command();

        $this->invoke($command, 'configureVite');
        $this->invoke($command, 'setupTypeScript');

        $vitePath = base_path('vite.config.js');
        $tsConfigPath = base_path('tsconfig.json');

        $this->assertFileExists($vitePath);
        $this->assertFileExists($tsConfigPath);
        $this->assertStringContainsString("'@react-wrapper'", File::get($vitePath));
        $this->assertSame('ES2020', json_decode(File::get($tsConfigPath), true)['compilerOptions']['target']);

        File::put($vitePath, 'existing vite config');
        File::put($tsConfigPath, '{"existing":true}');

        $this->invoke($command, 'configureVite');
        $this->invoke($command, 'setupTypeScript');

        $this->assertSame('existing vite config', File::get($vitePath));
        $this->assertSame('{"existing":true}', File::get($tsConfigPath));

        $forcedCommand = $this->command(force: true);
        $this->invoke($forcedCommand, 'configureVite');
        $this->invoke($forcedCommand, 'setupTypeScript');

        $this->assertStringContainsString('defineConfig', File::get($vitePath));
        $this->assertSame('ES2020', json_decode(File::get($tsConfigPath), true)['compilerOptions']['target']);
    }

    public function test_asset_mode_updates_env_only_when_allowed(): void
    {
        File::put(base_path('.env'), "APP_KEY=testing\nREACT_WRAPPER_ASSET_MODE=prebuilt\n");

        $this->invoke($this->command(), 'configureAssetMode', 'vite');
        $this->assertStringContainsString('REACT_WRAPPER_ASSET_MODE=prebuilt', File::get(base_path('.env')));

        $this->invoke($this->command(force: true), 'configureAssetMode', 'vite');
        $this->assertStringContainsString('REACT_WRAPPER_ASSET_MODE=vite', File::get(base_path('.env')));

        File::delete(base_path('.env'));
        $this->invoke($this->command(force: true), 'configureAssetMode', 'vite');
        $this->assertFileDoesNotExist(base_path('.env'));
    }

    public function test_composer_asset_refresh_hook_is_valid_and_idempotent(): void
    {
        File::put(base_path('composer.json'), json_encode([
            'name' => 'acme/example',
            'scripts' => [
                'post-autoload-dump' => ['@php artisan migrate'],
                'test' => 'phpunit',
            ],
        ], JSON_PRETTY_PRINT));

        $command = $this->command();
        $this->invoke($command, 'configureComposerAssetRefresh');
        $this->invoke($command, 'configureComposerAssetRefresh');

        $composer = json_decode(File::get(base_path('composer.json')), true, 512, JSON_THROW_ON_ERROR);
        $scripts = $composer['scripts'];

        $this->assertSame(['@php artisan migrate', '@php artisan filament-react:assets --force'], $scripts['post-autoload-dump']);
        $this->assertSame('phpunit', $scripts['test']);
        $this->assertCount(1, array_filter(
            $scripts['post-autoload-dump'],
            fn (string $script): bool => $script === '@php artisan filament-react:assets --force',
        ));
    }

    public function test_dependency_install_preserves_existing_versions_and_adds_missing_packages(): void
    {
        File::put(base_path('package.json'), json_encode([
            'dependencies' => [
                'react' => '^19.0.0',
                'react-dom' => '^19.0.0',
                'zustand' => '^5.0.0',
            ],
            'devDependencies' => [
                '@types/react' => '^19.0.0',
                '@types/react-dom' => '^19.0.0',
                '@vitejs/plugin-react' => '^4.0.0',
                'laravel-vite-plugin' => '^1.0.0',
            ],
        ], JSON_PRETTY_PRINT));

        Process::fake();
        $this->assertTrue($this->invoke($this->command(), 'installJSDependencies'));
        Process::assertNothingRan();

        File::put(base_path('package.json'), json_encode([
            'dependencies' => ['react-dom' => '^19.2.0'],
        ], JSON_PRETTY_PRINT));

        $command = $this->command(zustand: true);
        $this->assertTrue($this->invoke($command, 'installJSDependencies'));

        Process::assertRan('npm install --no-audit --no-fund react@^19.0.0 zustand');
        Process::assertRan('npm install --save-dev --no-audit --no-fund @types/react @types/react-dom @vitejs/plugin-react laravel-vite-plugin');
    }

    public function test_demo_installation_creates_plain_react_components(): void
    {
        $this->invoke($this->command(), 'createDemoComponents');

        $counter = File::get(resource_path('js/components/demo/Counter.tsx'));
        $userCard = File::get(resource_path('js/components/demo/UserCard.tsx'));

        $this->assertStringContainsString('useState', $counter);
        $this->assertStringContainsString('export default UserCard', $userCard);
        $this->assertStringNotContainsString('@Component(', $counter.$userCard);
        $this->assertStringNotContainsString('useFilamentBridge', $counter.$userCard);
    }

    private function command(bool $force = false, bool $zustand = false): InstallCommand
    {
        $command = new InstallCommand;
        $input = new ArrayInput(array_filter([
            '--force' => $force,
            '--zustand' => $zustand,
        ]), $command->getDefinition());

        $command->setInput($input);
        $command->setOutput(new OutputStyle($input, new NullOutput));

        return $command;
    }

    private function invoke(object $target, string $method, mixed ...$arguments): mixed
    {
        $reflection = new \ReflectionMethod($target, $method);
        $reflection->setAccessible(true);

        return $reflection->invoke($target, ...$arguments);
    }
}
