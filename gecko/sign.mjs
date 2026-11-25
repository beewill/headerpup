// Signs the built extension (gecko/dist/) as an unlisted AMO add-on.
// Reads AMO_JWT_ISSUER / AMO_JWT_SECRET from the environment or from .env.
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const envFile = resolve(root, '.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

const { AMO_JWT_ISSUER: key, AMO_JWT_SECRET: secret } = process.env;
if (!key || !secret) {
  console.error('Set AMO_JWT_ISSUER and AMO_JWT_SECRET in the environment or in .env');
  process.exit(1);
}

const bin = resolve(root, 'node_modules/web-ext/bin/web-ext.js');
const result = spawnSync(
  process.execPath,
  [
    bin,
    'sign',
    '--source-dir', resolve(here, 'dist'),
    '--artifacts-dir', resolve(here, 'web-ext-artifacts'),
    '--channel', 'unlisted',
    '--api-key', key,
    '--api-secret', secret,
  ],
  { stdio: 'inherit' },
);
process.exit(result.status ?? 1);
