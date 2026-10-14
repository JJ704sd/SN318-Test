import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import dns from 'node:dns/promises';
import https from 'node:https';
import { X509Certificate } from 'node:crypto';

const hostname = 'nuxt.example.invalid';
const origin = `https://${hostname}:5173`;
const certFile = './recipes/pcs-front-local/certificates/nuxt.example.invalid.cer';
const outputFile = process.argv.includes('--before')
  ? './recipes/pcs-front-local/https-before.json'
  : './recipes/pcs-front-local/https-after.json';
const signals = [];
function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.setTimeout(15000, () => req.destroy(new Error('Request timed out')));
    req.on('error', reject);
  });
}
try {
  const address = await dns.lookup(hostname);
  signals.push({ check: 'hosts', address: address.address });
  assert.equal(address.address, '127.0.0.1', 'The project hostname must resolve to the local development server');
  const certificate = new X509Certificate(await fs.readFile(certFile));
  assert.equal(certificate.checkHost(hostname), hostname, 'Certificate must match the project hostname');
  assert.equal(certificate.ca, false, 'The development certificate must be a server leaf');
  const ca = certificate.toString();
  const page = await request(origin, { ca });
  assert.equal(page.status, 200);
  assert.match(page.body, /@vite\/client/);
  const runtime = JSON.parse((await request(`${origin}/env.js`, { ca })).body);
  const config = JSON.parse((await request(`${origin}/config.js`, { ca })).body)[runtime.env];
  assert.equal(runtime.env, 'dev');
  assert.equal(config.useMockAuth, false);
  signals.push({ check: 'local-https', status: page.status, environment: runtime.env, useMockAuth: config.useMockAuth });
  const auth = await request(`${config.bffHost}/auth/session`, { headers: { Origin: origin } });
  const envelope = JSON.parse(auth.body);
  assert.equal(auth.status, 200);
  assert.equal(envelope.contract_version, 1);
  assert.equal(envelope.code, 0);
  assert.equal(auth.headers['access-control-allow-origin'], origin);
  assert.equal(auth.headers['access-control-allow-credentials'], 'true');
  signals.push({ check: 'auth-origin-and-contract', status: auth.status, code: envelope.code, authenticated: envelope.data.authenticated });
  await fs.writeFile(outputFile, JSON.stringify({ passed: true, signals }, null, 2));
  console.log(JSON.stringify({ passed: true, signals }));
} catch (error) {
  const result = { passed: false, signals, error: error.message, code: error.code ?? null };
  await fs.writeFile(outputFile, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
  process.exitCode = 1;
}
