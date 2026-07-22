<?php

namespace HadyFayed\ReactWrapper\Console;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Process;

class InstallCommand extends Command
{
    protected $signature = 'filament-react:install
                           {--dev : Install for development}
                           {--zustand : Use Zustand for state management}
                           {--demo : Install demo components}
                           {--force : Force installation}
                           {--no-auto-assets : Do not add the Composer asset refresh hook}';

    protected $description = 'Install Filament React Wrapper with enhanced features';

    public function handle()
    {
        $this->info('🚀 Installing Filament React Wrapper...');

        $development = $this->option('dev') || $this->option('zustand') || $this->option('demo');

        if (! $this->publishConfiguration()) {
            return 1;
        }

        if ($development) {
            if (! File::exists(base_path('package.json'))) {
                $this->error('package.json not found. Development mode requires the application Vite setup.');
                return 1;
            }

            $this->configureAssetMode('vite');

            if (! $this->installJSDependencies()) {
                return 1;
            }

            $this->publishDeveloperAssets();
            $this->configureVite();
            $this->setupTypeScript();

            if ($this->option('demo')) {
                $this->createDemoComponents();
            }
        } else {
            $this->info('📦 Using the prebuilt Composer runtime; no Node.js or NPM is required.');

            if ($this->call('filament-react:assets', ['--force' => true]) !== 0) {
                return 1;
            }

            if (! $this->option('no-auto-assets')) {
                $this->configureComposerAssetRefresh();
            }
        }

        // Setup Filament integration
        $this->setupFilamentIntegration();

        $this->info('✅ Filament React Wrapper installed successfully!');
        $this->showNextSteps($development);

        return 0;
    }

    private function installJSDependencies(): bool
    {
        $this->info('📦 Installing JavaScript dependencies...');

        $declaredDependencies = $this->getDeclaredJavaScriptDependencies();
        $runtimeDependencies = [];
        $developmentDependencies = [];

        // Do not run `npm install react` blindly: that can upgrade an
        // application from React 18 to a different major version. Preserve
        // versions already selected by the application and only add the
        // package's tested baseline when React is missing.
        if (! isset($declaredDependencies['react'])) {
            $runtimeDependencies[] = 'react@'.$this->getCompatibleReactConstraint($declaredDependencies['react-dom'] ?? null);
        }

        if (! isset($declaredDependencies['react-dom'])) {
            $runtimeDependencies[] = 'react-dom@'.$this->getCompatibleReactConstraint($declaredDependencies['react'] ?? null);
        }

        foreach ([
            '@types/react',
            '@types/react-dom',
            '@vitejs/plugin-react',
            'laravel-vite-plugin',
        ] as $dependency) {
            if (! isset($declaredDependencies[$dependency])) {
                $developmentDependencies[] = $dependency;
            }
        }

        if ($this->option('zustand')) {
            if (! isset($declaredDependencies['zustand'])) {
                $runtimeDependencies[] = 'zustand';
            }

            $this->info('   • Adding Zustand for state management');
        }

        $this->warnIfReactVersionsNeedAttention($declaredDependencies);

        if (empty($runtimeDependencies) && empty($developmentDependencies)) {
            $this->info('   ✅ Existing JavaScript dependency versions were preserved');

            return true;
        }

        $result = null;

        if (! empty($runtimeDependencies)) {
            $result = Process::run('npm install ' . implode(' ', $runtimeDependencies));
        }

        if (($result === null || $result->successful()) && ! empty($developmentDependencies)) {
            $result = Process::run('npm install --save-dev ' . implode(' ', $developmentDependencies));
        }

        if ($result !== null && ! $result->successful()) {
            $this->error('Failed to install JavaScript dependencies');
            $this->error($result->errorOutput());
            return false;
        }

        $this->info('   ✅ JavaScript dependencies installed');

        return true;
    }

    private function getDeclaredJavaScriptDependencies(): array
    {
        $packageJson = json_decode(File::get(base_path('package.json')), true);

        if (! is_array($packageJson)) {
            return [];
        }

        $dependencies = [];

        foreach (['dependencies', 'devDependencies', 'peerDependencies'] as $section) {
            foreach (($packageJson[$section] ?? []) as $name => $version) {
                $dependencies[$name] = $version;
            }
        }

        return $dependencies;
    }

    private function getCompatibleReactConstraint(?string $existingConstraint): string
    {
        if ($existingConstraint && preg_match('/(?:^|[^0-9])([0-9]+)(?:\.|$)/', $existingConstraint, $matches)) {
            return '^'.$matches[1].'.0.0';
        }

        return '^18.3.1';
    }

    private function warnIfReactVersionsNeedAttention(array $dependencies): void
    {
        $react = $dependencies['react'] ?? null;
        $reactDom = $dependencies['react-dom'] ?? null;

        if ($react && ! preg_match('/(?:^|[^0-9])18(?:\.|$)/', (string) $react)) {
            $this->warn("   ⚠️  Existing React constraint [{$react}] was preserved. The tested package baseline is React 18.");
        }

        if ($reactDom && ! preg_match('/(?:^|[^0-9])18(?:\.|$)/', (string) $reactDom)) {
            $this->warn("   ⚠️  Existing React DOM constraint [{$reactDom}] was preserved. Keep React and React DOM on compatible versions.");
        }

        if ($react && $reactDom && (string) $react !== (string) $reactDom) {
            $this->warn('   ⚠️  React and React DOM use different package constraints; verify that their installed major versions match.');
        }
    }

    private function configureVite()
    {
        $this->info('⚙️  Configuring Vite...');

        $viteConfig = <<<'JS'
import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.js'],
            refresh: true,
        }),
        react({
            include: "**/*.{jsx,tsx}",
        }),
    ],
    resolve: {
        alias: {
            '@': '/resources/js',
            '@react-wrapper': '/resources/js/react-wrapper',
        },
    },
});
JS;

        $vitePath = base_path('vite.config.js');
        if (File::exists($vitePath) && !$this->option('force')) {
            $this->warn('   ℹ️  vite.config.js already exists; leaving it unchanged. Add the alias shown in the documentation.');
            return;
        }

        File::put($vitePath, $viteConfig);
        $this->info('   ✅ Vite configured with React support and @react-wrapper alias');
    }

    private function setupTypeScript()
    {
        $this->info('📝 Setting up TypeScript...');

        $tsConfig = [
            'compilerOptions' => [
                'target' => 'ES2020',
                'lib' => ['DOM', 'DOM.Iterable', 'ES6'],
                'allowJs' => true,
                'skipLibCheck' => true,
                'esModuleInterop' => true,
                'allowSyntheticDefaultImports' => true,
                'strict' => true,
                'forceConsistentCasingInFileNames' => true,
                'module' => 'ESNext',
                'moduleResolution' => 'node',
                'resolveJsonModule' => true,
                'isolatedModules' => true,
                'noEmit' => true,
                'jsx' => 'react-jsx',
                'baseUrl' => '.',
                'paths' => [
                    '@/*' => ['./resources/js/*'],
                    '@react-wrapper' => ['./resources/js/react-wrapper/index.tsx'],
                ],
            ],
            'include' => [
                'resources/js/**/*',
                'resources/**/*.tsx',
                'resources/**/*.ts'
            ],
            'exclude' => [
                'node_modules'
            ]
        ];

        $tsConfigPath = base_path('tsconfig.json');
        if (File::exists($tsConfigPath) && !$this->option('force')) {
            $this->warn('   ℹ️  tsconfig.json already exists; leaving it unchanged.');
            return;
        }

        File::put($tsConfigPath, json_encode($tsConfig, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        $this->info('   ✅ TypeScript configuration created');
    }

    private function createDemoComponents()
    {
        $this->info('🎯 Creating demo components...');

        // Create demo directory
        $demoDir = resource_path('js/components/demo');
        File::makeDirectory($demoDir, 0755, true);

        // Simple Counter component
        $counterComponent = <<<'TSX'
import React from 'react';
import { Component } from '@react-wrapper';
import { useFilamentState } from '@react-wrapper';

interface CounterProps {
    initialCount?: number;
}

@Component('Counter', { category: 'demo', lazy: false })
export const Counter: React.FC<CounterProps> = ({ initialCount = 0 }) => {
    const [count, setCount] = useFilamentState('counter.value', initialCount);

    return (
        <div className="p-4 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Demo Counter</h3>
            <p className="text-gray-600 mb-4">Current count: {count}</p>
            <div className="space-x-2">
                <button
                    onClick={() => setCount(count - 1)}
                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                >
                    -
                </button>
                <button
                    onClick={() => setCount(count + 1)}
                    className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                >
                    +
                </button>
                <button
                    onClick={() => setCount(0)}
                    className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                    Reset
                </button>
            </div>
        </div>
    );
};

export default Counter;
TSX;

        File::put($demoDir . '/Counter.tsx', $counterComponent);

        // User Card component
        $userCardComponent = <<<'TSX'
import React from 'react';
import { Component } from '@react-wrapper';
import { useFilamentBridge } from '@react-wrapper';

interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
}

interface UserCardProps {
    user: User;
    showActions?: boolean;
}

@Component('UserCard', { category: 'demo', lazy: false })
export const UserCard: React.FC<UserCardProps> = ({ user, showActions = true }) => {
    const { $filament } = useFilamentBridge();

    const handleEdit = async () => {
        try {
            await $filament.call('editUser', user.id);
        } catch (error) {
            console.error('Failed to edit user:', error);
        }
    };

    const handleDelete = async () => {
        if (confirm('Are you sure you want to delete this user?')) {
            try {
                await $filament.call('deleteUser', user.id);
            } catch (error) {
                console.error('Failed to delete user:', error);
            }
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center space-x-4">
                {user.avatar && (
                    <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-12 h-12 rounded-full"
                    />
                )}
                <div>
                    <h3 className="text-lg font-semibold">{user.name}</h3>
                    <p className="text-gray-600">{user.email}</p>
                </div>
            </div>
            
            {showActions && (
                <div className="mt-4 flex space-x-2">
                    <button
                        onClick={handleEdit}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        Edit
                    </button>
                    <button
                        onClick={handleDelete}
                        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                        Delete
                    </button>
                </div>
            )}
        </div>
    );
};

export default UserCard;
TSX;

        File::put($demoDir . '/UserCard.tsx', $userCardComponent);

        $this->info('   ✅ Demo components created');
    }

    private function publishConfiguration(): bool
    {
        $this->info('📋 Publishing configuration...');

        $result = $this->call('vendor:publish', [
            '--provider' => 'HadyFayed\\ReactWrapper\\ReactWrapperServiceProvider',
            '--tag' => 'react-wrapper-config',
            '--force' => $this->option('force')
        ]);

        $this->info('   ✅ Configuration published');

        return $result === 0;
    }

    private function publishDeveloperAssets(): void
    {
        $this->info('📚 Publishing React source for development...');

        $this->call('vendor:publish', [
            '--provider' => 'HadyFayed\\ReactWrapper\\ReactWrapperServiceProvider',
            '--tag' => 'react-wrapper-assets',
            '--force' => $this->option('force'),
        ]);

        $this->call('vendor:publish', [
            '--provider' => 'HadyFayed\\ReactWrapper\\ReactWrapperServiceProvider',
            '--tag' => 'react-wrapper-bootstrap',
            '--force' => $this->option('force'),
        ]);

        $this->info('   ✅ React source and bootstrap published');
    }

    private function configureAssetMode(string $mode): void
    {
        $envPath = base_path('.env');

        if (! File::exists($envPath)) {
            $this->warn('   ℹ️  .env not found; set REACT_WRAPPER_ASSET_MODE='.$mode.' manually.');
            return;
        }

        $contents = File::get($envPath);
        $line = 'REACT_WRAPPER_ASSET_MODE='.$mode;

        if (preg_match('/^REACT_WRAPPER_ASSET_MODE=.*$/m', $contents)) {
            if (! $this->option('force') && ! preg_match('/^REACT_WRAPPER_ASSET_MODE='.$mode.'$/m', $contents)) {
                $this->warn('   ℹ️  Existing REACT_WRAPPER_ASSET_MODE was preserved; set it to '.$mode.' for this installation.');
                return;
            }

            $contents = preg_replace('/^REACT_WRAPPER_ASSET_MODE=.*$/m', $line, $contents);
        } else {
            $contents = rtrim($contents).PHP_EOL.$line.PHP_EOL;
        }

        File::put($envPath, $contents);
        $this->info('   ✅ Asset mode set to '.$mode);
    }

    private function configureComposerAssetRefresh(): void
    {
        $composerPath = base_path('composer.json');

        if (! File::exists($composerPath)) {
            $this->warn('   ℹ️  composer.json not found; asset refresh hook was not added.');
            return;
        }

        $composer = json_decode(File::get($composerPath), true);

        if (! is_array($composer)) {
            $this->warn('   ℹ️  composer.json is invalid; asset refresh hook was not added.');
            return;
        }

        $script = '@php artisan filament-react:assets --force';
        $scripts = $composer['scripts'] ?? [];

        if (! is_array($scripts)) {
            $this->warn('   ℹ️  Existing Composer scripts were not changed.');
            return;
        }

        $postAutoloadDump = $scripts['post-autoload-dump'] ?? [];

        if (is_string($postAutoloadDump)) {
            $postAutoloadDump = [$postAutoloadDump];
        }

        if (! is_array($postAutoloadDump)) {
            $this->warn('   ℹ️  Existing post-autoload-dump scripts were not changed.');
            return;
        }

        if (! in_array($script, $postAutoloadDump, true)) {
            $postAutoloadDump[] = $script;
            $scripts['post-autoload-dump'] = array_values($postAutoloadDump);
            $composer['scripts'] = $scripts;

            File::put(
                $composerPath,
                json_encode($composer, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES).PHP_EOL,
            );
        }

        $this->info('   ✅ Composer will refresh the runtime after dependency updates');
    }

    private function setupFilamentIntegration()
    {
        $this->info('🎨 Setting up Filament integration...');

        $this->info('   ℹ️  No Filament panel plugin or manual render hook is required.');
        $this->info('   ✅ Filament integration ready');
    }

    private function showNextSteps(bool $development)
    {
        $this->info('🎉 Next steps:');

        if ($development) {
            $this->line('1. Import ./bootstrap-react from your application Vite entrypoint');
            $this->line('2. Run: npm run dev');
            $this->line('3. Create your first component with: php artisan filament-react:component MyComponent');

            if ($this->option('demo')) {
                $this->line('4. Check out the demo components in resources/js/components/demo/');
            }
        } else {
            $this->line('1. The prebuilt runtime is already available in Filament panels.');
            $this->line('2. No NPM installation or Vite configuration is required.');
            $this->line('3. For custom React components, rerun with --dev.');
        }
        
        $this->line('');
        $this->info('📖 Documentation: https://github.com/hadyfayed/filament-react-wrapper');
    }
}
