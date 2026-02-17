import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';

// Read version from package.json
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
const baseVersion = packageJson.version || '1.0.0';

// Generate a unique build hash for cache-busting version checks
const buildHash = crypto.randomBytes(8).toString('hex');
const gitSha = (() => { try { return execSync('git rev-parse --short HEAD').toString().trim(); } catch { return 'unknown'; } })();
const buildTime = new Date().toISOString();

// Vite plugin: write build-info.json into dist/ after build
function buildInfoPlugin() {
    return {
        name: 'build-info',
        closeBundle() {
            const info = { hash: buildHash, version: baseVersion, gitSha, buildTime };
            const outDir = resolve(__dirname, 'dist');
            if (fs.existsSync(outDir)) {
                fs.writeFileSync(resolve(outDir, 'build-info.json'), JSON.stringify(info));
                console.log(`[build-info] wrote dist/build-info.json  hash=${buildHash}`);
            }
        },
    };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    // Append -dev suffix in development mode
    const version = mode === 'development' ? `${baseVersion}-dev` : baseVersion;

    return {
    base: '/', // Ensure assets are loaded from root
    define: {
        'import.meta.env.VITE_APP_VERSION': JSON.stringify(version),
        'import.meta.env.VITE_GIT_SHA': JSON.stringify(
            mode === 'development' ? 'dev' : execSync('git rev-parse --short HEAD').toString().trim()
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
        include: [
            'react',
            'react-dom',
            'react-router-dom',
            '@mui/material',
            '@mui/icons-material',
            '@emotion/react',
            '@emotion/styled',
            'lodash',
            'axios',
            '@tanstack/react-query'
        ],
        exclude: [],
        force: false,
        esbuildOptions: {
            target: 'es2020',
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
    // Cache directory - put it in local temp for better performance on network shares
    cacheDir: mode === 'development' ? 'node_modules/.vite' : '.vite',



    plugins: [
        svgr({
            svgrOptions: {
                exportType: 'named',
                namedExport: 'ReactComponent',
            },
            // Only transform SVGs with ?react suffix, let plain imports return URLs
        }),
        react(),
        buildInfoPlugin(),
    ],
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
        port: 5174,
        https: false,
        strictPort: false,
        // Optimize for network shares
        preTransformRequests: true,
        sourcemapIgnoreList: () => true,
        hmr: {
            overlay: true,
            protocol: 'ws',
            host: '192.168.1.239',
            clientPort: 5174,
            timeout: 30000, // Increase timeout for slower networks
        },
        watch: {
            usePolling: false,
            ignored: [
                '**/node_modules/**',
                '**/.git/**',
                '**/dist/**',
                '**/.vite/**',
                '**/coverage/**'
            ],
        },
        fs: {
            strict: false,
            allow: ['..'],
            // Cache file reads for better performance
            cachedChecks: true,
        },
        proxy: {
            '/api': {
                target: 'http://localhost:3001',
                changeOrigin: true,
                secure: false,
                ws: true,
                timeout: 30000,
                configure: (proxy) => {
                    proxy.on('error', (err, _req, _res) => {
                        console.error('API Proxy error:', err.message);
                    });
                }
            },
            '/images': {
                target: 'http://localhost:3001',
                changeOrigin: true,
                secure: false,
                timeout: 30000,
                configure: (proxy) => {
                    proxy.on('error', (err, _req, _res) => {
                        console.error('Image Proxy error:', err.message);
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
