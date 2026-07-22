<?php

namespace HadyFayed\ReactWrapper\Tests;

use HadyFayed\ReactWrapper\ReactWrapperServiceProvider;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\ViewErrorBag;
use Orchestra\Testbench\TestCase as Orchestra;

class TestCase extends Orchestra
{
    protected function setUp(): void
    {
        parent::setUp();

        Factory::guessFactoryNamesUsing(
            fn (string $modelName) => 'HadyFayed\\ReactWrapper\\Database\\Factories\\'.class_basename($modelName).'Factory'
        );
    }

    protected function getPackageProviders($app)
    {
        return array_values(array_filter([
            \Filament\Support\SupportServiceProvider::class,
            \Filament\FilamentServiceProvider::class,
            \Filament\Actions\ActionsServiceProvider::class,
            \Filament\Forms\FormsServiceProvider::class,
            \Filament\Schemas\SchemasServiceProvider::class,
            \Filament\Widgets\WidgetsServiceProvider::class,
            \Livewire\LivewireServiceProvider::class,
            ReactWrapperServiceProvider::class,
        ], 'class_exists'));
    }

    protected function getPackageAliases($app)
    {
        return [];
    }

    protected function defineEnvironment($app)
    {
        $app['view']->addNamespace('react-wrapper-tests', __DIR__.'/Fixtures/views');
        $app['view']->share('errors', new ViewErrorBag);
        $app['config']->set('app.key', 'base64:'.base64_encode(str_repeat('a', 32)));
    }

    public function getEnvironmentSetUp($app)
    {
        config()->set('database.default', 'testing');

        /*
        $migration = include __DIR__.'/../database/migrations/create_react_wrapper_table.php.stub';
        $migration->up();
        */
    }
}
