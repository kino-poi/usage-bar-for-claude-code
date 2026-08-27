import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';

export const CONFIG_SECTION = 'usageBar';

export interface RateLimitWindow {
  used_percentage: number;
  /** Unix epoch seconds. */
  resets_at: number;
}

/** Shape of ~/.claude/vscode-usage-bridge.json, written by resources/bridge-statusline.js. */
export interface BridgeData {
  updated_at: string;
  five_hour: RateLimitWindow | null;
  seven_day: RateLimitWindow | null;
}

export interface Thresholds {
  warning: number;
  critical: number;
}

const DEFAULT_SHARED_FILE_NAME = 'vscode-usage-bridge.json';

export function defaultSharedFilePath(): string {
  return path.join(os.homedir(), '.claude', DEFAULT_SHARED_FILE_NAME);
}

/**
 * Pure priority resolution, kept free of the `vscode` import so it can be
 * unit-tested outside the extension host. Order: extension setting > env var > default.
 */
export function resolveSharedFilePathFrom(configuredValue: string | undefined, envValue: string | undefined): string {
  const configured = (configuredValue ?? '').trim();
  if (configured) {
    return configured;
  }
  const fromEnv = (envValue ?? '').trim();
  if (fromEnv) {
    return fromEnv;
  }
  return defaultSharedFilePath();
}

export function resolveSharedFilePath(): string {
  const configured = vscode.workspace.getConfiguration(CONFIG_SECTION).get<string>('sharedFilePath', '');
  return resolveSharedFilePathFrom(configured, process.env.CLAUDE_USAGE_BRIDGE_PATH);
}

export function getThresholds(): Thresholds {
  const cfg = vscode.workspace.getConfiguration(CONFIG_SECTION);
  return {
    warning: cfg.get<number>('warningThreshold', 80),
    critical: cfg.get<number>('criticalThreshold', 95),
  };
}

export function getPollIntervalMs(): number {
  const cfg = vscode.workspace.getConfiguration(CONFIG_SECTION);
  const seconds = cfg.get<number>('pollIntervalSeconds', 5);
  return Math.max(1, seconds) * 1000;
}

export function getStaleAfterMs(): number {
  const cfg = vscode.workspace.getConfiguration(CONFIG_SECTION);
  const minutes = cfg.get<number>('staleAfterMinutes', 30);
  return Math.max(1, minutes) * 60 * 1000;
}

export function isAutoSetupEnabled(): boolean {
  return vscode.workspace.getConfiguration(CONFIG_SECTION).get<boolean>('autoSetupBridge', true);
}
