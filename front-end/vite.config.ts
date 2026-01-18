import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs/promises';
import svgr from '@svgr/rollup';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
    base: '/', // Ensure assets are loaded from root
    cacheDir: 'node_modules/.vite', // Enable build cache
    resolve: {
        alias: [
            { find: '@', replacement: resolve(__dirname, 'src') },
            { find: 'src', replacement: resolve(__dirname, 'src') },
            { find: '@mui/material/Grid2', replacement: '@/components/compat/Grid2' },
        ],
    },
    esbuild: {
        loader: 'tsx',
        include: [/src\/.*\.tsx?$/],
        exclude: [
            // Test files
            /\.(test|spec)\.(ts|tsx|js|jsx)$/,
            // Demo and example files
            /\/demo\//,
            /\/demos\//,
            /\/examples\//,
            /\/sample-page\//,
            // Archive directories
            /\/archive\//,
            // Legacy code (if not used)
            /\/legacy\//,
            // Documentation
            /\/docs\//,
            /\.md$/,
        ],
    },
    optimizeDeps: {
        include: [
            // React ecosystem
            'react',
            'react-dom',
            'react-router-dom',
            // Drag and drop
            '@hello-pangea/dnd',
            // Common utilities (MUI removed - let it bundle naturally to avoid dependency issues)
            'axios',
            'lodash',
            'date-fns',
            'dayjs',
        ],
        exclude: [
            // Exclude large unused packages from pre-bundling
            '@faker-js/faker', // Only used in dev/mocks
        ],
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
        sourcemap: true, // Enable sourcemaps for debugging circular dependencies
        target: mode === 'production' ? 'es2015' : 'esnext', // Use modern JS in dev
        cssCodeSplit: true, // Enable CSS code splitting to handle AG Grid CSS properly
        // Enable incremental builds - only rebuild changed files
        emptyOutDir: false, // Don't empty dist on each build (allows incremental)
        commonjsOptions: {
            include: [/node_modules/],
            transformMixedEsModules: true,
        },
        rollupOptions: {
            external: [],
            output: {
                // Use simpler, safer chunking strategy
                // Only split React - let Vite handle the rest automatically
                // This prevents breaking MUI's internal dependencies
                manualChunks: mode === 'production' ? {
                    'vendor-react': ['react', 'react-dom', 'react-router-dom'],
                } : undefined, // No chunking in dev for faster builds
                // Ensure CSS files are handled correctly
                assetFileNames: (assetInfo) => {
                    if (assetInfo.name && assetInfo.name.endsWith('.css')) {
                        return 'assets/[name]-[hash][extname]';
                    }
                    return 'assets/[name]-[hash][extname]';
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
                target: 'http://127.0.0.1:3001',
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
