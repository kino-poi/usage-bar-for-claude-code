import * as vscode from 'vscode';
import { BridgeData, RateLimitWindow, Thresholds } from './config';

export type UsageLevel = 'unknown' | 'normal' | 'warning' | 'critical';

/** Pure: percentage -> severity level, given the configured thresholds. */
export function classifyUsage(percentage: number | null | undefined, thresholds: Thresholds): UsageLevel {
  if (percentage === null || percentage === undefined || Number.isNaN(percentage)) {
    return 'unknown';
  }
  if (percentage >= thresholds.critical) {
    return 'critical';
  }
  if (percentage >= thresholds.warning) {
    return 'warning';
  }
  return 'normal';
}

/** Pure: is the last update older than staleAfterMs? Missing/unparseable timestamps count as stale. */
export function isStale(updatedAtIso: string | null | undefined, staleAfterMs: number, now: number = Date.now()): boolean {
  if (!updatedAtIso) {
    return true;
  }
  const t = Date.parse(updatedAtIso);
  if (Number.isNaN(t)) {
    return true;
  }
  return now - t > staleAfterMs;
}

/** Pure: status bar item label. `$(circle-slash) ... N/A` fallback per SPEC 3.3. */
export function formatWindowText(icon: string, label: string, win: RateLimitWindow | null | undefined): string {
  if (!win || typeof win.used_percentage !== 'number' || Number.isNaN(win.used_percentage)) {
    return `$(circle-slash) ${label} N/A`;
  }
  return `${icon} ${label} ${Math.round(win.used_percentage)}%`;
}

/** Pure: resets_at (unix seconds) -> local time string for tooltips. */
export function formatResetLocal(resetsAtEpochSeconds: number | null | undefined): string {
  if (typeof resetsAtEpochSeconds !== 'number' || Number.isNaN(resetsAtEpochSeconds)) {
    return '不明';
  }
  return new Date(resetsAtEpochSeconds * 1000).toLocaleString();
}

/**
 * Pure: per-window severity marker. StatusBarItem.color/backgroundColor apply
 * to the whole item, not a substring, so a single combined item has no API
 * for coloring "5h" and "7d" differently. Colored-circle emoji render in
 * their own fixed color regardless of the item's text color, so they're used
 * here as the per-segment severity indicator instead (see UsageStatusBar).
 */
export function severityMarker(level: UsageLevel): string {
  if (level === 'critical') {
    return '🔴';
  }
  if (level === 'warning') {
    return '🟡';
  }
  return '';
}

/** Pure: one status bar segment, e.g. `$(clock) 5h 96% 🔴`. */
export function formatSegment(
  icon: string,
  label: string,
  win: RateLimitWindow | null | undefined,
  thresholds: Thresholds,
): string {
  const base = formatWindowText(icon, label, win);
  const marker = severityMarker(classifyUsage(win?.used_percentage, thresholds));
  return marker ? `${base} ${marker}` : base;
}

/**
 * A single combined StatusBarItem for 5h + 7d, not two separate ones. Two
 * items were tried first (see docs/DESIGN.md section 4.1) but VS Code interleaves
 * status bar items from *all* extensions by priority within the same
 * alignment group, so a third-party item (e.g. Live Server's "Go Live"
 * button) can land between our two items and visually split them apart.
 * A single item can't be split by anything else. Each window still needs its
 * own visible severity though (a single critical 7d must not hide a
 * merely-warning 5h), so each segment gets its own emoji marker
 * (severityMarker/formatSegment) instead of relying on backgroundColor,
 * which can only apply to the item as a whole.
 */
export class UsageStatusBar {
  private readonly item: vscode.StatusBarItem;
  private lastData: BridgeData | null = null;

  constructor(context: vscode.ExtensionContext) {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.item.name = 'Usage Bar: Claude Code usage';
    this.item.command = 'usage-bar.showDetails';
    this.item.text = `${formatWindowText('$(clock)', '5h', null)}  ${formatWindowText('$(calendar)', '7d', null)}`;
    this.item.show();
    context.subscriptions.push(this.item);
  }

  update(data: BridgeData | null, thresholds: Thresholds, staleAfterMs: number): void {
    this.lastData = data;
    const fiveHour = data?.five_hour ?? null;
    const sevenDay = data?.seven_day ?? null;
    const stale = isStale(data?.updated_at ?? null, staleAfterMs);
    const staleMarker = stale && (fiveHour || sevenDay) ? '$(warning) ' : '';

    this.item.text =
      staleMarker + `${formatSegment('$(clock)', '5h', fiveHour, thresholds)}  ${formatSegment('$(calendar)', '7d', sevenDay, thresholds)}`;
    this.item.tooltip = this.buildTooltip(fiveHour, sevenDay, stale);
  }

  private buildTooltip(fiveHour: RateLimitWindow | null, sevenDay: RateLimitWindow | null, stale: boolean): string {
    const lines: string[] = [this.tooltipLine('5時間セッション', fiveHour), this.tooltipLine('週間(7日)', sevenDay)];
    if (this.lastData?.updated_at) {
      lines.push(`最終更新: ${new Date(this.lastData.updated_at).toLocaleString()}`);
    }
    if (stale) {
      lines.push('⚠ しばらく更新がありません（Claude Codeセッションが起動していない可能性があります）');
    }
    return lines.join('\n');
  }

  private tooltipLine(label: string, win: RateLimitWindow | null): string {
    if (!win) {
      return `${label}: データなし（rate_limits未取得、または対象プランでない可能性）`;
    }
    return `${label} 使用率: ${Math.round(win.used_percentage)}% / リセット: ${formatResetLocal(win.resets_at)}`;
  }

  async showDetailsQuickPick(sharedFilePath: string): Promise<void> {
    const data = this.lastData;
    const items: vscode.QuickPickItem[] = [];

    if (!data) {
      items.push({
        label: '$(circle-slash) 使用量データがありません',
        detail: 'Claude Code側のstatusLineブリッジが未設定か、まだセッションが開始されていません。',
      });
    } else {
      items.push(this.detailItem('$(clock) 5時間セッション', data.five_hour));
      items.push(this.detailItem('$(calendar) 週間(7日)', data.seven_day));
      items.push({
        label: '$(history) 最終更新',
        detail: new Date(data.updated_at).toLocaleString(),
      });
    }
    items.push({
      label: '$(file) 共有ファイル',
      detail: sharedFilePath,
    });
    items.push({
      label: '$(gear) ブリッジを再セットアップ',
      detail: 'コマンド: Usage Bar: Setup Claude Code Bridge',
    });

    await vscode.window.showQuickPick(items, {
      title: 'Usage Bar for Claude Code',
      placeHolder: 'Claude Codeの使用量詳細',
    });
  }

  private detailItem(label: string, win: RateLimitWindow | null): vscode.QuickPickItem {
    if (!win) {
      return { label, detail: 'N/A' };
    }
    return {
      label,
      detail: `${Math.round(win.used_percentage)}% 使用 / リセット: ${formatResetLocal(win.resets_at)}`,
    };
  }

  dispose(): void {
    this.item.dispose();
  }
}
