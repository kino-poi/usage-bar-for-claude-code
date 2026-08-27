import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bridgeScript = path.join(__dirname, '..', 'resources', 'bridge-statusline.js');

function freshFakeHome() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'usage-bar-home-'));
  fs.mkdirSync(path.join(dir, '.claude'), { recursive: true });
  return dir;
}

function runBridge(input, { fakeHome, sharedFilePath, extraEnv } = {}) {
  const home = fakeHome ?? freshFakeHome();
  const env = {
    ...process.env,
    HOME: home,
    USERPROFILE: home,
    ...(sharedFilePath ? { CLAUDE_USAGE_BRIDGE_PATH: sharedFilePath } : { CLAUDE_USAGE_BRIDGE_PATH: '' }),
    ...extraEnv,
  };
  const result = spawnSync(process.execPath, [bridgeScript], {
    input: typeof input === 'string' ? input : JSON.stringify(input),
    encoding: 'utf8',
    env,
  });
  return { ...result, home };
}

function defaultSharedFilePath(home) {
  return path.join(home, '.claude', 'vscode-usage-bridge.json');
}

test('writes rate_limits to the shared file and prints a fallback status line', () => {
  const input = {
    model: { display_name: 'Claude' },
    rate_limits: {
      five_hour: { used_percentage: 23.5, resets_at: 1738425600 },
      seven_day: { used_percentage: 41.2, resets_at: 1738857600 },
    },
  };
  const { status, stdout, home } = runBridge(input);
  assert.equal(status, 0);

  const written = JSON.parse(fs.readFileSync(defaultSharedFilePath(home), 'utf8'));
  assert.equal(written.five_hour.used_percentage, 23.5);
  assert.equal(written.seven_day.used_percentage, 41.2);
  assert.ok(written.updated_at);

  assert.match(stdout, /5h 24%/);
  assert.match(stdout, /7d 41%/);
});

test('missing rate_limits keeps the previously written values', () => {
  const home = freshFakeHome();
  const first = {
    rate_limits: {
      five_hour: { used_percentage: 10, resets_at: 111 },
      seven_day: { used_percentage: 20, resets_at: 222 },
    },
  };
  runBridge(first, { fakeHome: home });

  const second = { rate_limits: {} };
  const { status } = runBridge(second, { fakeHome: home });
  assert.equal(status, 0);

  const written = JSON.parse(fs.readFileSync(defaultSharedFilePath(home), 'utf8'));
  assert.equal(written.five_hour.used_percentage, 10);
  assert.equal(written.seven_day.used_percentage, 20);
});

test('honors CLAUDE_USAGE_BRIDGE_PATH override', () => {
  const home = freshFakeHome();
  const customPath = path.join(home, 'custom-bridge.json');
  const input = { rate_limits: { five_hour: { used_percentage: 5, resets_at: 1 } } };
  runBridge(input, { fakeHome: home, sharedFilePath: customPath });

  const written = JSON.parse(fs.readFileSync(customPath, 'utf8'));
  assert.equal(written.five_hour.used_percentage, 5);
});

test('wraps a pre-existing statusLine command and forwards its stdout unchanged', () => {
  const home = freshFakeHome();
  const echoScript = path.join(home, 'echo-statusline.js');
  fs.writeFileSync(
    echoScript,
    "process.stdout.write('ORIGINAL:' + require('fs').readFileSync(0, 'utf8').length);\n",
  );
  fs.writeFileSync(
    path.join(home, '.claude', 'vscode-usage-bridge.config.json'),
    JSON.stringify({ wrappedCommand: `node "${echoScript}"` }),
  );

  const input = { rate_limits: { five_hour: { used_percentage: 1, resets_at: 1 } } };
  const raw = JSON.stringify(input);
  const { stdout, status } = runBridge(raw, { fakeHome: home });

  assert.equal(status, 0);
  assert.equal(stdout, `ORIGINAL:${raw.length}`);

  const written = JSON.parse(fs.readFileSync(defaultSharedFilePath(home), 'utf8'));
  assert.equal(written.five_hour.used_percentage, 1);
});

test('invalid JSON on stdin is passed through unchanged and the shared file is left alone', () => {
  const home = freshFakeHome();
  const raw = 'not json at all';
  const { stdout, status } = runBridge(raw, { fakeHome: home });
  assert.equal(status, 0);
  assert.equal(stdout, raw);
  assert.equal(fs.existsSync(defaultSharedFilePath(home)), false);
});
