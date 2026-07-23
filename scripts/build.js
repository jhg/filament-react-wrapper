#!/usr/bin/env node

/**
 * Advanced build script for React Wrapper
 * Handles multiple build targets, optimization, and validation
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class BuildManager {
  constructor() {
    this.startTime = performance.now();
    this.buildTargets = ['es', 'laravel', 'umd'];
    this.isProduction = process.env.NODE_ENV === 'production';
    this.verbose = process.argv.includes('--verbose');
    this.skipTests = process.argv.includes('--skip-tests');
    this.skipLinting = process.argv.includes('--skip-lint');
    this.buildTarget = this.getBuildTarget();
  }

  getBuildTarget() {
    const targetFlag = process.argv.find(arg => arg.startsWith('--target='));
    return targetFlag ? targetFlag.split('=')[1] : 'all';
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '📦',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      debug: '🔍'
    }[level];

    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  exec(command, options = {}) {
    if (this.verbose) {
      this.log(`Executing: ${command}`, 'debug');
    }

    try {
      const result = execSync(command, {
        stdio: this.verbose ? 'inherit' : 'pipe',
        encoding: 'utf8',
        ...options
      });
      return result;
    } catch (error) {
      this.log(`Command failed: ${command}`, 'error');
      this.log(error.message, 'error');
      process.exit(1);
    }
  }

  async validateEnvironment() {
    this.log('Validating build environment...');

    // Check Node.js version
    const nodeVersion = process.version;
    const minNodeVersion = '16.0.0';
    
    if (!this.isVersionValid(nodeVersion.slice(1), minNodeVersion)) {
      throw new Error(`Node.js ${minNodeVersion} or higher is required. Current: ${nodeVersion}`);
    }

    // Check if all required tools are installed
    const requiredTools = ['npm', 'npx'];
    
    for (const tool of requiredTools) {
      try {
        this.exec(`which ${tool}`, { stdio: 'pipe' });
      } catch {
        throw new Error(`Required tool not found: ${tool}`);
      }
    }

    // Check if package.json exists and is valid
    if (!fs.existsSync('package.json')) {
      throw new Error('package.json not found');
    }

    try {
      JSON.parse(fs.readFileSync('package.json', 'utf8'));
    } catch {
      throw new Error('Invalid package.json');
    }

    this.log('Environment validation completed', 'success');
  }

  isVersionValid(current, minimum) {
    const currentParts = current.split('.').map(Number);
    const minimumParts = minimum.split('.').map(Number);

    for (let i = 0; i < Math.max(currentParts.length, minimumParts.length); i++) {
      const currentPart = currentParts[i] || 0;
      const minimumPart = minimumParts[i] || 0;

      if (currentPart > minimumPart) return true;
      if (currentPart < minimumPart) return false;
    }

    return true;
  }

  async runPreBuildChecks() {
    this.log('Running pre-build checks...');

    if (!this.skipLinting) {
      this.log('Running ESLint...');
      this.exec('npm run lint');
      this.log('Linting completed', 'success');
    }

    if (!this.skipTests) {
      this.log('Running tests...');
      this.exec('npm run test');
      this.log('Tests completed', 'success');
    }

    this.log('TypeScript check...');
    this.exec('npm run typecheck');
    this.log('TypeScript check completed', 'success');

    this.log('Pre-build checks completed', 'success');
  }

  async cleanBuildDirectory() {
    this.log('Cleaning build directory...');
    
    const buildDirs = ['dist'];
    
    for (const dir of buildDirs) {
      if (fs.existsSync(dir)) {
        this.exec(`rm -rf ${dir}`);
        this.log(`Removed ${dir}`, 'debug');
      }
    }

    this.log('Build directory cleaned', 'success');
  }

  async buildESModule() {
    this.log('Building ES Module...');
    this.exec('vite build --mode production');
    this.log('ES Module build completed', 'success');
  }

  async buildLaravelAssets() {
    this.log('Building Laravel assets...');
    this.exec('vite build --config vite.laravel.config.js --mode production');
    this.copyLaravelComposerAsset();
    this.log('Laravel assets build completed', 'success');
  }

  copyLaravelComposerAsset() {
    const source = 'dist/laravel/js/react-wrapper.js';
    const target = 'resources/vendor/react-wrapper.js';

    if (!fs.existsSync(source)) {
      throw new Error(`Laravel bundle missing: ${source}`);
    }

    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
    this.log(`Copied ${source} to ${target}`, 'debug');
  }

  async buildUMD() {
    this.log('Building UMD bundle...');
    
    // Create UMD-specific Vite config
    const umdConfig = `
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  define: {
    '__REACT_WRAPPER_RUNTIME_MODE__': JSON.stringify('vite'),
  },
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, 'resources/js/index.tsx'),
      name: 'ReactWrapper',
      fileName: 'react-wrapper',
      formats: ['umd']
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        }
      }
    },
    outDir: 'dist/umd'
  }
});`;

    fs.writeFileSync('vite.umd.config.js', umdConfig);
    
    try {
      this.exec('vite build --config vite.umd.config.js --mode production');
      this.log('UMD build completed', 'success');
    } finally {
      // Clean up temporary config
      if (fs.existsSync('vite.umd.config.js')) {
        fs.unlinkSync('vite.umd.config.js');
      }
    }
  }


  async generateTypes() {
    this.log('Generating TypeScript declarations...');
    this.exec('npx tsc --emitDeclarationOnly --outDir dist/types');
    this.log('TypeScript declarations generated', 'success');
  }

  async optimizeBuild() {
    this.log('Optimizing build...');

    // Analyze bundle size
    if (fs.existsSync('dist/react-wrapper/index.es.js')) {
      const stats = fs.statSync('dist/react-wrapper/index.es.js');
      const sizeKB = (stats.size / 1024).toFixed(2);
      this.log(`ES bundle size: ${sizeKB} KB`);

      // Warn if bundle is too large
      if (stats.size > 1024 * 1024) { // 1MB
        this.log('Bundle size exceeds 1MB, consider code splitting', 'warning');
      }
    }

    // Copy additional assets
    this.copyAssets();

    this.log('Build optimization completed', 'success');
  }

  copyAssets() {
    const assetsToCopy = [
      { from: 'README.md', to: 'dist/README.md' },
      { from: 'LICENSE', to: 'dist/LICENSE' },
      { from: 'package.json', to: 'dist/package.json' },
      { from: 'config', to: 'dist/config', isDirectory: true }
    ];

    for (const asset of assetsToCopy) {
      if (fs.existsSync(asset.from)) {
        if (asset.isDirectory) {
          this.exec(`cp -r ${asset.from} ${asset.to}`);
        } else {
          const distDir = path.dirname(asset.to);
          if (!fs.existsSync(distDir)) {
            fs.mkdirSync(distDir, { recursive: true });
          }
          this.exec(`cp ${asset.from} ${asset.to}`);
        }
        this.log(`Copied ${asset.from} to ${asset.to}`, 'debug');
      }
    }
  }

  async validateBuild() {
    this.log('Validating build output...');

    const requiredFiles = [];
    
    // Target-specific validation
    if (this.buildTarget === 'all' || this.buildTarget === 'es') {
      requiredFiles.push('dist/react-wrapper/index.es.js', 'dist/react-wrapper/types/index.d.ts');
    }
    
    if (this.buildTarget === 'all' || this.buildTarget === 'laravel') {
      requiredFiles.push(
        'dist/laravel/js/react-wrapper.js',
        'resources/vendor/react-wrapper.js',
      );
    }
    
    if (this.buildTarget === 'all' || this.buildTarget === 'umd') {
      // With package.json `type: module`, Vite emits the UMD bundle as CJS
      // (`.umd.cjs`) so Node does not interpret it as an ES module.
      requiredFiles.push('dist/umd/react-wrapper.umd.cjs');
    }
    
    // Always check for package.json
    requiredFiles.push('dist/package.json');

    for (const file of requiredFiles) {
      if (!fs.existsSync(file)) {
        throw new Error(`Required build output missing: ${file}`);
      }
    }

    // Check if ES module can be imported
    if (this.buildTarget === 'all' || this.buildTarget === 'es') {
      try {
        // Skip require validation for ES modules due to CommonJS/ESM compatibility issues
        // this.exec('node -e "require(\'./dist/index.es.js\')"', { stdio: 'pipe' });
        this.log('ES module validation skipped (CommonJS/ESM compatibility)', 'debug');
      } catch {
        this.log('ES module validation failed', 'warning');
      }
    }

    this.log('Build validation completed', 'success');
  }

  async generateBuildReport() {
    const endTime = performance.now();
    const buildTime = ((endTime - this.startTime) / 1000).toFixed(2);

    const report = {
      timestamp: new Date().toISOString(),
      buildTime: `${buildTime}s`,
      target: this.buildTarget,
      environment: {
        node: process.version,
        npm: this.exec('npm --version', { stdio: 'pipe' }).trim(),
        platform: process.platform
      },
      files: this.getBuildFilesList(),
      success: true
    };

    fs.writeFileSync('dist/build-report.json', JSON.stringify(report, null, 2));
    
    this.log(`Build completed in ${buildTime}s`, 'success');
    this.log(`Build report saved to dist/build-report.json`, 'debug');
  }

  getBuildFilesList() {
    const files = [];
    
    if (fs.existsSync('dist')) {
      const walkDir = (dir, prefix = '') => {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const relativePath = path.join(prefix, item);
          
          if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath, relativePath);
          } else {
            const stats = fs.statSync(fullPath);
            files.push({
              path: relativePath,
              size: stats.size,
              sizeKB: (stats.size / 1024).toFixed(2)
            });
          }
        }
      };
      
      walkDir('dist');
    }
    
    return files;
  }

  async run() {
    try {
      this.log('Starting React Wrapper build process...');

      await this.validateEnvironment();
      await this.runPreBuildChecks();
      await this.cleanBuildDirectory();

      // Build based on target
      if (this.buildTarget === 'all' || this.buildTarget === 'es') {
        await this.buildESModule();
      }

      if (this.buildTarget === 'all' || this.buildTarget === 'laravel') {
        await this.buildLaravelAssets();
      }

      if (this.buildTarget === 'all' || this.buildTarget === 'umd') {
        await this.buildUMD();
      }


      await this.generateTypes();
      await this.optimizeBuild();
      await this.validateBuild();
      await this.generateBuildReport();

    } catch (error) {
      this.log(`Build failed: ${error.message}`, 'error');
      
      // Create failure report
      const failureReport = {
        timestamp: new Date().toISOString(),
        error: error.message,
        stack: error.stack,
        target: this.buildTarget,
        success: false
      };
      
      if (!fs.existsSync('dist')) {
        fs.mkdirSync('dist', { recursive: true });
      }
      
      fs.writeFileSync('dist/build-report.json', JSON.stringify(failureReport, null, 2));
      
      process.exit(1);
    }
  }
}

// Run the build manager
if (import.meta.url === `file://${process.argv[1]}`) {
  const buildManager = new BuildManager();
  buildManager.run().catch(console.error);
}

export default BuildManager;
