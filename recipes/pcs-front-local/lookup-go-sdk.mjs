import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
const npmPath = 'C:/Program Files/nodejs/node_modules/npm';
const require = createRequire(`${npmPath}/package.json`);
const Config = require('@npmcli/config');
const { definitions, flatten, nerfDarts, shorthands } = require('@npmcli/config/lib/definitions');
const config = new Config({ npmPath, definitions, flatten, nerfDarts, shorthands,
  argv: [process.execPath, 'npm'], cwd: './pcs-front', warn: false });
await config.load();
const registry = config.get('@baiyun:registry') || config.get('registry');
const origin = new URL(registry).origin;
if (origin !== 'https://registry.example.invalid') throw new Error('Unexpected SDK registry origin');
const credentials = config.getCredentialsByURI(registry);
if (!credentials.token) throw new Error('No SDK registry token available');
const response = await fetch(`${origin}/api/v1/packages/npm-package?limit=100&page=1`, {
  headers: { Authorization: `token ${credentials.token}` }, signal: AbortSignal.timeout(20000) });
if (!response.ok) { console.log(JSON.stringify({ status: response.status })); process.exit(1); }
const packages = await response.json();
console.log(JSON.stringify({ count: packages.length, matches: packages.filter(p =>
  /auth.*go|go.*auth/i.test(p.name)).map(({name,type,version}) => ({name,type,version})) }));
if (process.argv.includes('--download')) {
  const sdkPath = '/api/packages/npm-package/go/localhost/authcenter/auth-center-go/@v/v0.2.2.zip';
  const archive = await fetch(`${origin}${sdkPath}`, {
    headers: { Authorization: `token ${credentials.token}` }, signal: AbortSignal.timeout(30000) });
  if (!archive.ok) { console.log(JSON.stringify({ downloadStatus: archive.status })); process.exit(1); }
  const bytes = Buffer.from(await archive.arrayBuffer());
  const destination = './recipes/pcs-front-local/sdk-packages/auth-center-go-v0.2.2.zip';
  await writeFile(destination, bytes);
  console.log(JSON.stringify({ sdkVersion: 'v0.2.2', bytes: bytes.length, destination }));
}
