import path from 'node:path';
import { pathToFileURL } from 'node:url';
const root = './pcs-front';
const { createServer } = await import(pathToFileURL(path.join(root, 'node_modules/vite/dist/node/index.js')).href);
const server = await createServer({
  root,
  configFile: path.join(root, 'vite.config.ts'),
  cacheDir: path.join(root, 'node_modules/.vite-local'),
  server: { host: '127.0.0.1', port: 5173, strictPort: true, open: false },
});
await server.listen();
server.printUrls();
console.log('pcs-front dev local frontend: http://127.0.0.1:5173/ (repository Mock authentication mode)');
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    await server.close();
    process.exit(0);
  });
}
