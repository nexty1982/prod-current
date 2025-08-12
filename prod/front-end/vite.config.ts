import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs/promises';
import svgr from '@svgr/rollup';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
    base: '/', // Ensure assets are loaded from root
    root: resolve(__dirname, 'front-end'),
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
            'src': resolve(__dirname, 'src'),
        },
    },
    esbuild: {
        loader: 'tsx',
        include: [/src\/.*\.tsx?$/, /node_modules\/react-csv\/.*\.jsx?$/],
        exclude: [],
    },
    optimizeDeps: {
        include: ['react-csv'],
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
        minify: mode === 'production', // Only minify in production
        sourcemap: true, // Enable source maps for debugging
        target: mode === 'production' ? 'es2015' : 'esnext', // Use modern JS in dev
        commonjsOptions: {
            include: [/react-csv/, /node_modules/],
        },
        rollupOptions: {
            external: [],
            output: {
                manualChunks: mode === 'production' ? {
                    vendor: ['react', 'react-dom'],
                    csv: ['react-csv'],
                } : undefined, // No chunking in dev for faster builds
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
}));
