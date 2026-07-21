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
                           {--force : Force installation}';

    protected $description = 'Install Filament React Wrapper with enhanced features';

    public function handle()
    {
        $this->info('🚀 Installing Filament React Wrapper...');

        // Check if package.json exists
        if (!File::exists(base_path('package.json'))) {
            $this->error('package.json not found. Please run in a Laravel project with Vite.');
            return 1;
        }

        // Install JavaScript dependencies
        $this->installJSDependencies();

        // Configure Vite
        $this->configureVite();

        // Setup TypeScript
        $this->setupTypeScript();

        // Create demo components if requested
        if ($this->option('demo')) {
            $this->createDemoComponents();
        }

        // Publish configuration
        $this->publishConfiguration();

        // Setup Filament integration
        $this->setupFilamentIntegration();

        $this->info('✅ Filament React Wrapper installed successfully!');
        $this->showNextSteps();

        return 0;
    }

    private function installJSDependencies()
    {
        $this->info('📦 Installing JavaScript dependencies...');

        $dependencies = [
            'react',
            'react-dom',
            '@types/react',
            '@types/react-dom',
            '@vitejs/plugin-react'
        ];

        if ($this->option('zustand')) {
            $dependencies[] = 'zustand';
            $this->info('   • Adding Zustand for state management');
        }

        $command = 'npm install ' . implode(' ', $dependencies);
        
        if ($this->option('dev')) {
            $command .= ' --save-dev';
        }

        $result = Process::run($command);
        
        if (!$result->successful()) {
            $this->error('Failed to install JavaScript dependencies');
            $this->error($result->errorOutput());
            return;
        }

        $this->info('   ✅ JavaScript dependencies installed');
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
        },
    },
});
JS;

        File::put(base_path('vite.config.js'), $viteConfig);
        $this->info('   ✅ Vite configured with React support');
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
                'jsx' => 'react-jsx'
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

        File::put(base_path('tsconfig.json'), json_encode($tsConfig, JSON_PRETTY_PRINT));
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

    private function publishConfiguration()
    {
        $this->info('📋 Publishing configuration...');

        $this->call('vendor:publish', [
            '--provider' => 'HadyFayed\\ReactWrapper\\ReactWrapperServiceProvider',
            '--tag' => 'config',
            '--force' => $this->option('force')
        ]);

        $this->info('   ✅ Configuration published');
    }

    private function setupFilamentIntegration()
    {
        $this->info('🎨 Setting up Filament integration...');

        // Add Filament hook for React refresh in development
        $hookCode = <<<'PHP'
// Add to your FilamentServiceProvider or AppServiceProvider
if (app()->environment('local')) {
    FilamentView::registerRenderHook(
        name: PanelsRenderHook::HEAD_START,
        hook: fn() => app(Vite::class)->reactRefresh(),
    );
}
PHP;

        $this->info('   ℹ️  Add this code to your service provider:');
        $this->line($hookCode);
        $this->info('   ✅ Filament integration ready');
    }

    private function showNextSteps()
    {
        $this->info('🎉 Next steps:');
        $this->line('1. Add the Filament hook to your service provider');
        $this->line('2. Run: npm run dev');
        $this->line('3. Create your first component with: php artisan filament-react:component MyComponent');
        
        if ($this->option('demo')) {
            $this->line('4. Check out the demo components in resources/js/components/demo/');
        }
        
        $this->line('');
        $this->info('📖 Documentation: https://github.com/hadyfayed/filament-react-wrapper');
    }
}