import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Laravel-ready build configuration.
//
// This is the Composer-distributed runtime. It deliberately bundles React and
// ReactDOM so an application can use the package without installing Node or
// loading executable JavaScript from a third-party CDN.
export default defineConfig({
    plugins: [
        react({
            include: "**/*.{jsx,tsx}",
        })
    ],
    build: {
        rollupOptions: {
            input: resolve(__dirname, 'resources/js/index.tsx'),
            output: {
                // Create Laravel-friendly filenames
                entryFileNames: 'js/react-wrapper.js',
                chunkFileNames: 'js/chunks/[name]-[hash].js',
                assetFileNames: 'assets/[name]-[hash][extname]',
                format: 'umd',
                name: 'ReactWrapper',
            }
        },
        outDir: 'dist/laravel',
        sourcemap: false,
        minify: 'terser',
        target: 'es2020'
    },
    define: {
        'process.env.NODE_ENV': JSON.stringify('production')
    }
});
