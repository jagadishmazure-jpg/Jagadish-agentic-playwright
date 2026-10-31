// Runs both promptfoo configs offline and writes out/results.json and out/results-bare.json.
// Telemetry, sharing and update checks are off, and promptfoo's own state goes to out/.promptfoo.
// Failed test cases are expected (some fixtures break rules on purpose), so they do not change the
// exit code; scripts/promptfoo_summary.py --check is the gate. Errors (exit 1) still fail.
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, 'out');
mkdirSync(out, { recursive: true });
const env = {
  ...process.env,
  PROMPTFOO_DISABLE_TELEMETRY: '1',
  PROMPTFOO_DISABLE_SHARING: '1',
  PROMPTFOO_DISABLE_UPDATE: '1',
  PROMPTFOO_DISABLE_REMOTE_GENERATION: 'true',
  PROMPTFOO_CONFIG_DIR: join(out, '.promptfoo'),
  PROMPTFOO_FAILED_TEST_EXIT_CODE: '0',
};
const bin = join(here, 'node_modules', '.bin', process.platform === 'win32' ? 'promptfoo.cmd' : 'promptfoo');
for (const [config, file] of [['promptfooconfig.yaml', 'results.json'], ['promptfooconfig.bare.yaml', 'results-bare.json']]) {
  const r = spawnSync(bin, ['eval', '-c', config, '-o', join('out', file), '--no-cache', '--no-write', '--no-table'], { cwd: here, env, stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
