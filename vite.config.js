import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

// Standalone Vite config for React Wrapper package
export default defineConfig({
    define: {
        '__REACT_WRAPPER_RUNTIME_MODE__': JSON.stringify('vite'),
    },
    plugins: [
        // React plugin for compilation and Fast Refresh
        react({
            include: "**/*.{jsx,tsx}"
        }),
        
        // TypeScript definitions
        dts({
            insertTypesEntry: true,
            outputDir: 'dist/react-wrapper/types',
            tsConfigFilePath: 'tsconfig.json'
        }),
    ],
    build: {
        lib: {
            entry: {
                'index': resolve(__dirname, 'resources/js/index.tsx'),
            },
            formats: ['es'],
            fileName: (format, entryName) => `${entryName}.${format}.js`,
        },
        rollupOptions: {
            external: ['react', 'react-dom'],
            output: {
                globals: {
                    react: 'React',
                    'react-dom': 'ReactDOM'
                },
                manualChunks: {
                    'component-system': ['./resources/js/components/ReactComponentRegistry.tsx']
                },
                chunkFileNames: 'chunks/[name]-[hash].js',
                minifyInternalExports: true
            }
        },
        outDir: 'dist/react-wrapper',
        sourcemap: true,
        target: 'esnext',
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: !process.env.VITE_DEBUG,
                drop_debugger: !process.env.VITE_DEBUG
            }
        },
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'resources/js'),
        },
    },
});
