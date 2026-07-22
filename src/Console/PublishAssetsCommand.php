<?php

namespace HadyFayed\ReactWrapper\Console;

use Filament\Support\Assets\Js;
use HadyFayed\ReactWrapper\ReactWrapperServiceProvider;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class PublishAssetsCommand extends Command
{
    protected $signature = 'filament-react:assets
                           {--force : Replace the previously published runtime}';

    protected $description = 'Publish the prebuilt React Wrapper runtime';

    public function handle(): int
    {
        $source = ReactWrapperServiceProvider::getComposerAssetPath();

        if (! File::isFile($source)) {
            $this->error('The prebuilt React Wrapper runtime is missing from the package.');
            $this->line('This is a package build error; reinstall the package or report it upstream.');

            return self::FAILURE;
        }

        $asset = Js::make(
            ReactWrapperServiceProvider::FILAMENT_ASSET_ID,
            $source,
        )->package(ReactWrapperServiceProvider::FILAMENT_ASSET_PACKAGE);

        $destination = $asset->getPublicPath();

        if (File::exists($destination) && ! $this->option('force')) {
            $this->warn('The runtime is already published. Use --force to refresh it.');

            return self::SUCCESS;
        }

        File::ensureDirectoryExists(dirname($destination));
        File::copy($source, $destination);

        $this->info("Published React Wrapper runtime to {$destination}");

        return self::SUCCESS;
    }
}
