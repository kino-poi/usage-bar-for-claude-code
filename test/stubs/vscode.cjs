'use strict';

/*
 * Minimal stand-in for the `vscode` module, used only so that src/config.ts
 * and src/statusBar.ts can be bundled and their pure helper functions
 * exercised by `node --test` outside of a real VS Code extension host (which
 * @vscode/test-electron would require network access to download).
 */

class ThemeColor {
  constructor(id) {
    this.id = id;
  }
}

const StatusBarAlignment = { Left: 1, Right: 2 };

function makeConfiguration() {
  return {
    get(_key, defaultValue) {
      return defaultValue;
    },
  };
}

module.exports = {
  ThemeColor,
  StatusBarAlignment,
  workspace: {
    getConfiguration: () => makeConfiguration(),
    onDidChangeConfiguration: () => ({ dispose() {} }),
  },
  window: {
    createStatusBarItem: () => ({
      show() {},
      dispose() {},
    }),
    showInformationMessage: async () => undefined,
    showQuickPick: async () => undefined,
  },
  commands: {
    registerCommand: () => ({ dispose() {} }),
  },
  Uri: {
    joinPath: (base, ...segments) => ({ fsPath: [base.fsPath || base, ...segments].join('/') }),
  },
};
