import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import esbuild from 'esbuild';

// Bundles src/config.ts and src/statusBar.ts with `vscode` aliased to a local
// stub (test/stubs/vscode.cjs) so their pure helper functions can be
// exercised with plain `node --test`, without needing a full VS Code
// extension host (@vscode/test-electron requires downloading VS Code itself
// over the network; that scaffold lives separately in extension.test.ts).

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const stubPath = path.join(__dirname, 'stubs', 'vscode.cjs');
const require = createRequire(import.meta.url);

function bundleForTest(entryRelPath) {
  const outfile = path.join(
    os.tmpdir(),
    `usage-bar-test-${path.basename(entryRelPath, '.ts')}-${process.pid}-${Date.now()}.cjs`,
  );
  esbuild.buildSync({
    entryPoints: [path.join(repoRoot, entryRelPath)],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile,
    alias: { vscode: stubPath },
  });
  const mod = require(outfile);
  fs.rmSync(outfile, { force: true });
  return mod;
}

const configMod = bundleForTest('src/config.ts');
const statusBarMod = bundleForTest('src/statusBar.ts');

test('resolveSharedFilePathFrom: extension setting wins over env var', () => {
  assert.equal(configMod.resolveSharedFilePathFrom('/custom/path.json', '/env/path.json'), '/custom/path.json');
});

test('resolveSharedFilePathFrom: falls back to env var when setting is empty', () => {
  assert.equal(configMod.resolveSharedFilePathFrom('', '/env/path.json'), '/env/path.json');
  assert.equal(configMod.resolveSharedFilePathFrom(undefined, '/env/path.json'), '/env/path.json');
});

test('resolveSharedFilePathFrom: falls back to ~/.claude default', () => {
  const result = configMod.resolveSharedFilePathFrom(undefined, undefined);
  assert.ok(result.includes('.claude'));
  assert.ok(result.endsWith('vscode-usage-bridge.json'));
});

test('classifyUsage: normal / warning / critical / unknown', () => {
  const thresholds = { warning: 80, critical: 95 };
  assert.equal(statusBarMod.classifyUsage(10, thresholds), 'normal');
  assert.equal(statusBarMod.classifyUsage(80, thresholds), 'warning');
  assert.equal(statusBarMod.classifyUsage(95, thresholds), 'critical');
  assert.equal(statusBarMod.classifyUsage(null, thresholds), 'unknown');
  assert.equal(statusBarMod.classifyUsage(undefined, thresholds), 'unknown');
});

test('isStale: missing/unparseable timestamps count as stale, fresh does not', () => {
  const now = Date.parse('2026-08-26T12:00:00Z');
  const staleAfterMs = 30 * 60 * 1000;
  assert.equal(statusBarMod.isStale(null, staleAfterMs, now), true);
  assert.equal(statusBarMod.isStale('not-a-date', staleAfterMs, now), true);
  assert.equal(statusBarMod.isStale(new Date(now - 5 * 60 * 1000).toISOString(), staleAfterMs, now), false);
  assert.equal(statusBarMod.isStale(new Date(now - 60 * 60 * 1000).toISOString(), staleAfterMs, now), true);
});

test('formatWindowText: rounds the percentage, or falls back to N/A', () => {
  assert.equal(
    statusBarMod.formatWindowText('$(clock)', '5h', { used_percentage: 23.5, resets_at: 1738425600 }),
    '$(clock) 5h 24%',
  );
  assert.equal(statusBarMod.formatWindowText('$(clock)', '5h', null), '$(circle-slash) 5h N/A');
  assert.equal(statusBarMod.formatWindowText('$(clock)', '5h', undefined), '$(circle-slash) 5h N/A');
});

test('severityMarker: emoji per level, none for normal/unknown', () => {
  assert.equal(statusBarMod.severityMarker('critical'), '🔴');
  assert.equal(statusBarMod.severityMarker('warning'), '🟡');
  assert.equal(statusBarMod.severityMarker('normal'), '');
  assert.equal(statusBarMod.severityMarker('unknown'), '');
});

test('formatSegment: appends the per-window marker independently of the other window', () => {
  const thresholds = { warning: 10, critical: 40 };
  // A critical 7d must not hide a merely-warning 5h: each segment carries its own marker.
  assert.equal(
    statusBarMod.formatSegment('$(clock)', '5h', { used_percentage: 15, resets_at: 1 }, thresholds),
    '$(clock) 5h 15% 🟡',
  );
  assert.equal(
    statusBarMod.formatSegment('$(calendar)', '7d', { used_percentage: 55, resets_at: 1 }, thresholds),
    '$(calendar) 7d 55% 🔴',
  );
  assert.equal(
    statusBarMod.formatSegment('$(clock)', '5h', { used_percentage: 1, resets_at: 1 }, thresholds),
    '$(clock) 5h 1%',
  );
});
