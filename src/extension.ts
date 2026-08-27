import * as vscode from 'vscode';
import { BridgeData, getPollIntervalMs, getStaleAfterMs, getThresholds, isAutoSetupEnabled, resolveSharedFilePath } from './config';
import { UsageStatusBar } from './statusBar';
import { SharedFileWatcher } from './fileWatcher';
import { performBridgeSetup, promptFirstRunSetupIfNeeded } from './bridgeSetup';

let watcher: SharedFileWatcher | undefined;
let statusBar: UsageStatusBar | undefined;
let latestData: BridgeData | null = null;

function bridgeScriptResourcePath(context: vscode.ExtensionContext): string {
  return vscode.Uri.joinPath(context.extensionUri, 'resources', 'bridge-statusline.js').fsPath;
}

function startWatcher(): void {
  watcher?.dispose();
  const filePath = resolveSharedFilePath();
  watcher = new SharedFileWatcher(filePath, getPollIntervalMs(), (data) => {
    latestData = data;
    statusBar?.update(data, getThresholds(), getStaleAfterMs());
  });
  watcher.start();
}

export function activate(context: vscode.ExtensionContext): void {
  statusBar = new UsageStatusBar(context);
  startWatcher();

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('usageBar.sharedFilePath') || e.affectsConfiguration('usageBar.pollIntervalSeconds')) {
        startWatcher();
        return;
      }
      if (
        e.affectsConfiguration('usageBar.warningThreshold') ||
        e.affectsConfiguration('usageBar.criticalThreshold') ||
        e.affectsConfiguration('usageBar.staleAfterMinutes')
      ) {
        statusBar?.update(latestData, getThresholds(), getStaleAfterMs());
      }
    }),
    vscode.commands.registerCommand('usage-bar.showDetails', () => {
      void statusBar?.showDetailsQuickPick(resolveSharedFilePath());
    }),
    vscode.commands.registerCommand('usage-bar.setupBridge', () => {
      const result = performBridgeSetup(bridgeScriptResourcePath(context));
      void vscode.window.showInformationMessage(result.message);
    }),
  );

  void promptFirstRunSetupIfNeeded(context, bridgeScriptResourcePath(context), isAutoSetupEnabled());
}

export function deactivate(): void {
  watcher?.dispose();
  watcher = undefined;
  statusBar?.dispose();
  statusBar = undefined;
}
