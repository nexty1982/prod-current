import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs/promises';
import svgr from '@svgr/rollup';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
    mode: 'development', // Force development mode for this environment
    base: '/', // Ensure assets are loaded from root
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
        minify: false, // Disable minification for development
        sourcemap: true, // Enable source maps for debugging
        commonjsOptions: {
            include: [/react-csv/, /node_modules/],
        },
        rollupOptions: {
            external: [],
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom'],
                    csv: ['react-csv'],
                },
            },
        },
    },    server: {
        host: '0.0.0.0',
        port: 5174,
        https: false,
        proxy: {
            '/api': {
                target: 'http://localhost:3002',
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
                target: 'http://localhost:3002',
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
