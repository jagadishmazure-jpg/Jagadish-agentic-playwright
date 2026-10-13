// Measures flakiness by running a slice of the suite many times with retries off.
//   node scripts/measure_flakiness.mjs [repeat=20] [path=tests/agent-app] [out=evidence/flakiness.json]
// A test is "flaky" here if it both passed and failed across the repeats.
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const repeat = Number(process.argv[2] ?? 20);
const target = process.argv[3] ?? 'tests/agent-app';
const out = process.argv[4] ?? 'evidence/flakiness.json';
const args = ['playwright', 'test', '--project=chromium', target, `--repeat-each=${repeat}`, '--retries=0', '--reporter=json'];
let raw;
try {
  raw = execFileSync('npx', args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, env: { ...process.env, CI: '' } });
} catch (e) {
  raw = e.stdout; // failures still produce a JSON report
}
const report = JSON.parse(raw);
const perTest = new Map();
const walk = (suite) => {
  for (const s of suite.suites ?? []) walk(s);
  for (const spec of suite.specs ?? []) {
    for (const t of spec.tests) {
      if (t.projectName !== 'chromium' || !spec.file.includes(target.replace(/^tests\//, ''))) continue;
      const key = `${spec.file} > ${spec.title}`;
      const r = perTest.get(key) ?? { runs: 0, passed: 0, failed: 0, durations: [] };
      for (const res of t.results) {
        r.runs += 1;
        r.durations.push(res.duration);
        if (res.status === 'passed') r.passed += 1;
        else r.failed += 1;
      }
      perTest.set(key, r);
    }
  }
};
for (const s of report.suites) walk(s);
const tests = [...perTest.entries()].map(([name, r]) => ({
  name,
  runs: r.runs,
  passed: r.passed,
  failed: r.failed,
  p95_ms: r.durations.sort((a, b) => a - b)[Math.floor(0.95 * (r.durations.length - 1))],
}));
const summary = {
  target,
  repeat_each: repeat,
  retries: 0,
  tests: tests.length,
  executions: tests.reduce((a, t) => a + t.runs, 0),
  failed_executions: tests.reduce((a, t) => a + t.failed, 0),
  flaky_tests: tests.filter((t) => t.passed > 0 && t.failed > 0).map((t) => t.name),
  always_failing: tests.filter((t) => t.passed === 0).map((t) => t.name),
  wall_seconds: Math.round(report.stats.duration / 1000),
  per_test: tests,
};
mkdirSync('evidence', { recursive: true });
writeFileSync(out, JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({ ...summary, per_test: undefined }, null, 2));
