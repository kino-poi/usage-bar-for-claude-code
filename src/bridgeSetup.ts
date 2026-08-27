import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const BRIDGE_SCRIPT_FILENAME = 'vscode-usage-bridge-statusline.js';
const WRAPPED_COMMAND_CONFIG_FILENAME = 'vscode-usage-bridge.config.json';
const HAS_PROMPTED_KEY = 'usageBar.hasPromptedBridgeSetup';

interface ClaudeStatusLineConfig {
  type?: string;
  command?: string;
  padding?: number;
  [key: string]: unknown;
}

interface ClaudeSettings {
  statusLine?: ClaudeStatusLineConfig;
  [key: string]: unknown;
}

function claudeDir(): string {
  return path.join(os.homedir(), '.claude');
}

function settingsPath(): string {
  return path.join(claudeDir(), 'settings.json');
}

export function bridgeScriptDestPath(): string {
  return path.join(claudeDir(), BRIDGE_SCRIPT_FILENAME);
}

function wrappedCommandConfigPath(): string {
  return path.join(claudeDir(), WRAPPED_COMMAND_CONFIG_FILENAME);
}

function readJsonFileSafe<T>(filePath: string, fallback: T): T {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Forward slashes even on Windows: Claude Code's statusLine may run via Git Bash or PowerShell. */
function buildBridgeCommand(): string {
  const scriptPath = bridgeScriptDestPath().split(path.sep).join('/');
  return `node "${scriptPath}"`;
}

export function isBridgeConfigured(): boolean {
  const settings = readJsonFileSafe<ClaudeSettings>(settingsPath(), {});
  const command = settings.statusLine?.command;
  return typeof command === 'string' && command.includes(BRIDGE_SCRIPT_FILENAME);
}

export interface SetupResult {
  ok: boolean;
  message: string;
}

/**
 * Copies the bridge script into ~/.claude and points Claude Code's statusLine
 * at it. If the user already had a different statusLine command configured,
 * that command is preserved in a side config file so the bridge script can
 * wrap/forward to it (see resources/bridge-statusline.js) instead of
 * clobbering the user's existing customization (docs/DESIGN.md section 4.5).
 */
export function performBridgeSetup(extensionResourceScriptPath: string): SetupResult {
  try {
    fs.mkdirSync(claudeDir(), { recursive: true });

    fs.copyFileSync(extensionResourceScriptPath, bridgeScriptDestPath());

    const settings = readJsonFileSafe<ClaudeSettings>(settingsPath(), {});
    const alreadyOurs =
      typeof settings.statusLine?.command === 'string' && settings.statusLine.command.includes(BRIDGE_SCRIPT_FILENAME);

    if (!alreadyOurs) {
      const existingCommand = settings.statusLine?.command;
      if (typeof existingCommand === 'string' && existingCommand.trim()) {
        fs.writeFileSync(
          wrappedCommandConfigPath(),
          JSON.stringify({ wrappedCommand: existingCommand }, null, 2),
          'utf8',
        );
      }

      if (fs.existsSync(settingsPath())) {
        fs.copyFileSync(settingsPath(), `${settingsPath()}.bak`);
      }

      settings.statusLine = {
        ...settings.statusLine,
        type: 'command',
        command: buildBridgeCommand(),
        padding: settings.statusLine?.padding ?? 0,
      };
      fs.writeFileSync(settingsPath(), JSON.stringify(settings, null, 2), 'utf8');
    }

    return {
      ok: true,
      message: 'Usage Bar: Claude Code の statusLine ブリッジを設定しました（~/.claude/settings.json）。',
    };
  } catch (err) {
    return {
      ok: false,
      message: `Usage Bar: ブリッジのセットアップに失敗しました: ${(err as Error).message}`,
    };
  }
}

/**
 * Shown at most once (tracked in globalState), regardless of the user's answer,
 * so we never nag on every activation (docs/DESIGN.md section 4.5).
 */
export async function promptFirstRunSetupIfNeeded(
  context: vscode.ExtensionContext,
  extensionResourceScriptPath: string,
  autoSetupEnabled: boolean,
): Promise<void> {
  if (context.globalState.get<boolean>(HAS_PROMPTED_KEY)) {
    return;
  }
  if (!autoSetupEnabled || isBridgeConfigured()) {
    await context.globalState.update(HAS_PROMPTED_KEY, true);
    return;
  }

  await context.globalState.update(HAS_PROMPTED_KEY, true);
  const choice = await vscode.window.showInformationMessage(
    'Usage Bar for Claude Code: Claude Code の statusLine にレート制限情報を渡すブリッジスクリプトを設定しますか？（既存のstatusLine設定があればラップして保持します）',
    '今すぐ設定',
    '後で',
  );
  if (choice === '今すぐ設定') {
    const result = performBridgeSetup(extensionResourceScriptPath);
    void vscode.window.showInformationMessage(result.message);
  }
}
