import * as assert from 'assert';
import * as vscode from 'vscode';

/*
 * Integration scaffold using @vscode/test-electron (see docs/DESIGN.md section 2
 * for the module layout this exercises).
 * This downloads a real VS Code binary to run against, so it is NOT executed
 * in sandboxed/offline environments (see README.md "テストについて"). Run it
 * locally with network access via: node ./node_modules/@vscode/test-electron/...
 * (see the standard @vscode/test-electron README for the runTests() launcher
 * script, typically `test/runTest.ts` invoked by `npm run test:integration`).
 */
suite('Usage Bar for Claude Code', () => {
  test('activates without throwing', async () => {
    const ext = vscode.extensions.getExtension('yourname.usage-bar-for-claude-code');
    assert.ok(ext, 'extension should be discoverable by id');
    await ext?.activate();
    assert.ok(ext?.isActive);
  });

  test('registers its commands', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('usage-bar.showDetails'));
    assert.ok(commands.includes('usage-bar.setupBridge'));
  });
});
