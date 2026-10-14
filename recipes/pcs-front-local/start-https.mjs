import path from 'node:path';
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const root = './pcs-front';
const certificateRoot = './recipes/pcs-front-local/certificates/private';
const { createServer, loadConfigFromFile } = await import(
  pathToFileURL(path.join(root, 'node_modules/vite/dist/node/index.js')).href
);
const loaded = await loadConfigFromFile(
  { command: 'serve', mode: 'development', isSsrBuild: false, isPreview: false },
  path.join(root, 'vite.config.ts'), root,
);
if (!loaded) throw new Error('Project Vite configuration could not be loaded');

async function applicationPlugins(items) {
  const result = [];
  for (const item of items ?? []) {
    const plugin = await item;
    if (Array.isArray(plugin)) result.push(...await applicationPlugins(plugin));
    // Use the hostname-specific Windows server certificate instead of the plugin's generic certificate.
    else if (plugin && plugin.name !== 'vite:basic-ssl') result.push(plugin);
  }
  return result;
}

const server = await createServer({
  ...loaded.config,
  root, configFile: false, mode: 'development',
  cacheDir: path.join(root, 'node_modules/.vite-local'),
  plugins: [
    {
      name: 'pcs-local-dev-environment', enforce: 'pre',
      configureServer(vite) {
        vite.middlewares.use((request, response, next) => {
          const requestPath = new URL(request.url ?? '/', 'https://localhost:5173').pathname;
          if (requestPath !== '/env.js') return next();
          response.setHeader('Content-Type', 'application/json; charset=utf-8');
          response.setHeader('Cache-Control', 'no-store');
          response.end(JSON.stringify({ env: 'dev' }));
        });
      },
    },
    ...await applicationPlugins(loaded.config.plugins),
  ],
  server: {
    ...loaded.config.server,
    host: '127.0.0.1', port: 5173, strictPort: true, open: false,
    allowedHosts: ['nuxt.example.invalid'],
    https: {
      pfx: await fs.readFile(path.join(certificateRoot, 'nuxt.example.invalid.pfx')),
      passphrase: (await fs.readFile(path.join(certificateRoot, 'pfx-password.txt'), 'utf8')).trim(),
      minVersion: 'TLSv1.2',
    },
  },
});
await server.listen();
console.log('pcs-front HTTPS development: https://localhost:5173 (real SSO authentication)');
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => { await server.close(); process.exit(0); });
}
