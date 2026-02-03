import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs/promises';
import { execSync } from 'child_process';
import svgr from '@svgr/rollup';

// Read version from package.json
const packageJson = JSON.parse(require('fs').readFileSync('./package.json', 'utf-8'));
const baseVersion = packageJson.version || '1.0.0';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    // Append -dev suffix in development mode
    const version = mode === 'development' ? `${baseVersion}-dev` : baseVersion;

    return {
    base: '/', // Ensure assets are loaded from root
    define: {
        'import.meta.env.VITE_APP_VERSION': JSON.stringify(version),
        'import.meta.env.VITE_GIT_SHA': JSON.stringify(
            execSync('git rev-parse --short HEAD').toString().trim()
        ),
        'import.meta.env.VITE_BUILD_TIME': JSON.stringify(new Date().toISOString()),
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
            'src': resolve(__dirname, 'src'),
        },
    },
    esbuild: {
        loader: 'tsx',
        include: [/src\/.*\.tsx?$/],
        exclude: [],
    },
    optimizeDeps: {
        include: [],
        force: false, // Don't force pre-bundling in dev
        esbuildOptions: {
            plugins: [
                {
                    name: 'load-js-files-as-tsx',
                    setup(build) {
                        build.onLoad(
                            { filter: /src\\.*\.js$/ },
                            async (args) => ({
                                loader: 'tsx',
                                contents: await fs.readFile(args.path, 'utf8'),
                            })
                        );
                    },
                },
            ],
        },
    },



    // plugins: [react(),svgr({
    //   exportAsDefault: true
    // })],

    plugins: [svgr(), react()],
    build: {
        minify: 'esbuild', // esbuild minifier is ~20-40x faster than terser
        sourcemap: false, // Disable sourcemaps for faster builds (saves ~30% build time)
        target: 'es2020', // Modern browsers — avoids costly ES2015 downleveling
        cssMinify: 'esbuild',
        commonjsOptions: {
            include: [/node_modules/],
        },
        rollupOptions: {
            external: [],
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom', 'react-router-dom'],
                    mui: ['@mui/material', '@mui/icons-material'],
                    aggrid: ['ag-grid-community', 'ag-grid-react'],
                },
            },
        },
    }, server: {
        host: '0.0.0.0',
        port: 5174, // Development server on 5174
        https: false,
        hmr: {
            overlay: true, // Show error overlay in browser
            port: 5175, // HMR on separate port to avoid conflicts
        },
        watch: {
            usePolling: true, // Better file watching on some systems
            interval: 100, // Faster polling for changes
        },
        proxy: {
            '/api': {
                target: 'http://localhost:3001',
                changeOrigin: true,
                secure: false,
                configure: (proxy) => {
                    proxy.on('error', (err, _req, _res) => {
                        console.log('Proxy error:', err);
                    });
                    proxy.on('proxyReq', (proxyReq, req, _res) => {
                        console.log('Proxying request:', req.method, req.url, '→', proxyReq.getHeader('host'));
                    });
                }
            },
            '/images': {
                target: 'http://localhost:3001',
                changeOrigin: true,
                secure: false,
                configure: (proxy) => {
                    proxy.on('error', (err, _req, _res) => {
                        console.log('Proxy error:', err);
                    });
                    proxy.on('proxyReq', (proxyReq, req, _res) => {
                        console.log('Proxying image request:', req.method, req.url, '→', proxyReq.getHeader('host'));
                    });
                }
            }
        }
    },
    preview: {
        port: 5174,
        host: '0.0.0.0'
    },
}});
