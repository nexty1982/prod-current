// vite.config.ts (DEV)
import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import fsp from 'fs/promises'
import fs from 'node:fs'
import path from 'node:path'
import svgr from '@svgr/rollup'

function devAccessLogger(): Plugin {
  const logPath = path.resolve(process.cwd(), process.env.VITE_DEV_ACCESS_LOG ?? 'dev-file-access.log')
  let seen = new Set<string>()

  const append = (line: string) => {
    try { fs.appendFileSync(logPath, line) } catch {}
  }

  return {
    name: 'dev-access-logger',
    apply: 'serve',

    // Inject client script to log SPA route changes and API calls
    transformIndexHtml(html) {
      const code = `
      <script>
      (function(){
        function post(payload){
          try{
            var data = JSON.stringify(Object.assign({ ts: new Date().toISOString() }, payload));
            if (navigator.sendBeacon) {
              navigator.sendBeacon('/__devlog', new Blob([data], {type:'application/json'}));
            } else {
              fetch('/__devlog', {method:'POST', headers:{'Content-Type':'application/json'}, body:data, keepalive:true});
            }
          }catch(e){}
        }
        function routeLog(){ post({ type:'route', url: location.pathname + location.search + location.hash }); }
        window.addEventListener('load', routeLog);
        window.addEventListener('popstate', routeLog);
        ['pushState','replaceState'].forEach(function(k){
          var orig = history[k];
          history[k] = function(){ var r = orig.apply(this, arguments); try{ routeLog(); }catch(_){} return r; };
        });
        var ofetch = window.fetch;
        window.fetch = function(input, init){
          try {
            var url = (typeof input === 'string') ? input : (input && input.url);
            var method = (init && init.method) || 'GET';
            if (url && (url.startsWith('/api') || url.startsWith('/images'))) post({ type:'api', method: method, url: url });
          } catch(_){}
          return ofetch.apply(this, arguments);
        };
        var oopen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url){
          try {
            if (typeof url === 'string' && (url.startsWith('/api') || url.startsWith('/images'))) post({ type:'api', method: method || 'GET', url: url });
          } catch(_){}
          return oopen.apply(this, arguments);
        };
      })();
      </script>`;
      return html.replace('</head>', code + '\n</head>');
    },

    configureServer(server) {
      // New page header on HTML navigations
      server.middlewares.use((req, _res, next) => {
        const accept = typeof req.headers['accept'] === 'string' ? req.headers['accept'] : ''
        if (accept.includes('text/html')) {
          seen.clear()
          const url = req.url || '/'
          append(`\n=== PAGE ${req.method} ${url} @ ${new Date().toISOString()} ===\n`)
        }
        next()
      })

      // Endpoint to receive client logs (routes + API calls)
      server.middlewares.use('/__devlog', (req, res) => {
        const chunks: Buffer[] = []
        req.on('data', (c) => chunks.push(c))
        req.on('end', () => {
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
            if (body && body.type === 'route' && body.url) {
              append(`ROUTE  ${body.url}\n`)
            } else if (body && body.type === 'api' && body.url) {
              append(`API    ${body.method || 'GET'} ${body.url}\n`)
            }
          } catch {}
          res.statusCode = 204
          res.end()
        })
      })

      // Server-side hits to /api and /images
      server.middlewares.use((req, _res, next) => {
        const url = req.url || ''
        if (url.startsWith('/api') || url.startsWith('/images')) {
          append(`SRVREQ ${req.method} ${url}\n`)
        }
        next()
      })
    },

    // Log each served source module once per page
    transform(_code, id) {
      const cleanId = id.split('?')[0]
      const isNodeMod = cleanId.includes('/node_modules/')
      const isVirtual = cleanId.startsWith('\0') || cleanId.includes('/@vite/')
      const looksSource = /\.(tsx?|jsx?|vue|svelte|css|scss|sass|less|styl|postcss)$/.test(cleanId)
      const inSrc = cleanId.includes(`${path.sep}src${path.sep}`) || cleanId.includes('/src/')
      if (!isNodeMod && !isVirtual && looksSource && inSrc && !seen.has(cleanId)) {
        const abs = path.isAbsolute(cleanId) ? cleanId : path.resolve(process.cwd(), cleanId)
        append(abs + '\n')
        seen.add(cleanId)
      }
      return null
    },
  }
}

export default defineConfig(({ mode }) => ({
  base: '/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      src: resolve(__dirname, 'src'),
      // Grid2 aliases for MUI v7 compatibility
      '@mui/material/Grid2': resolve(__dirname, 'src/mui/Grid2'),
      '@mui/material/Unstable_Grid2': resolve(__dirname, 'src/mui/Grid2'),
    },
  },
  esbuild: {
    loader: 'tsx',
    include: [/src\/.*\.tsx?$/], // ← fixed
    exclude: [],
  },
  optimizeDeps: {
    include: [],
    force: false,
    esbuildOptions: {
      plugins: [
        {
          name: 'load-js-files-as-tsx',
          setup(build) {
            build.onLoad(
              { filter: /[\\/]src[\\/].*\.js$/ }, // ← cross-platform
              async (args) => ({
                loader: 'tsx',
                contents: await fsp.readFile(args.path, 'utf8'),
              })
            )
          },
        },
      ],
    },
  },

  plugins: [
    devAccessLogger(),
    svgr(),
    react(),
  ],

  build: {
    minify: mode === 'production',
    sourcemap: true,
    target: mode === 'production' ? 'es2015' : 'esnext',
    commonjsOptions: { include: [/node_modules/] },
    rollupOptions: {
      external: [],
      output: {
        manualChunks: mode === 'production' ? { vendor: ['react', 'react-dom'] } : undefined,
      },
    },
  },

  server: {
    host: '0.0.0.0',
    port: 5174,
    https: false,
    hmr: { overlay: true, port: 5175 },
    watch: { usePolling: true, interval: 100 },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err) => console.log('Proxy error:', err))
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('Proxying request:', req.method, req.url, '→', proxyReq.getHeader('host'))
          })
        },
      },
      '/images': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err) => console.log('Proxy error:', err))
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('Proxying image request:', req.method, req.url, '→', proxyReq.getHeader('host'))
          })
        },
      },
    },
  },

  preview: { port: 5174, host: '0.0.0.0' },
}))

