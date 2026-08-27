import * as fs from 'fs';
import * as path from 'path';
import { BridgeData } from './config';

export type FileWatcherCallback = (data: BridgeData | null) => void;

/**
 * Watches the shared bridge file for changes. Combines fs.watch (on the parent
 * directory, so we still catch the temp-file-then-rename atomic write) with a
 * low-frequency polling safety net, since fs.watch reliability is not guaranteed
 * on all platforms/network drives (see docs/DESIGN.md section 4.4).
 */
export class SharedFileWatcher {
  private fsWatcher: fs.FSWatcher | null = null;
  private pollTimer: NodeJS.Timeout | null = null;
  private lastMtimeMs = 0;
  private disposed = false;

  constructor(
    private readonly filePath: string,
    private readonly pollIntervalMs: number,
    private readonly onUpdate: FileWatcherCallback,
  ) {}

  start(): void {
    this.readAndNotify();
    this.watchDirectory();
    this.pollTimer = setInterval(() => this.checkForChange(), this.pollIntervalMs);
  }

  private watchDirectory(): void {
    const dir = path.dirname(this.filePath);
    const targetName = path.basename(this.filePath);
    try {
      this.fsWatcher = fs.watch(dir, (_eventType, filename) => {
        if (!filename || filename === targetName) {
          this.readAndNotify();
        }
      });
      this.fsWatcher.on('error', () => {
        // Polling timer below still covers us if the watcher dies.
        this.fsWatcher?.close();
        this.fsWatcher = null;
      });
    } catch {
      // Directory may not exist yet (bridge script never ran), or fs.watch is
      // unsupported here; the polling timer is the fallback in that case too.
      this.fsWatcher = null;
    }
  }

  private checkForChange(): void {
    fs.stat(this.filePath, (err, stat) => {
      if (err) {
        if (this.lastMtimeMs !== 0) {
          this.lastMtimeMs = 0;
          this.onUpdate(null);
        }
        return;
      }
      if (stat.mtimeMs !== this.lastMtimeMs) {
        this.readAndNotify();
      }
    });
  }

  private readAndNotify(): void {
    fs.readFile(this.filePath, 'utf8', (err, contents) => {
      if (err) {
        this.lastMtimeMs = 0;
        this.onUpdate(null);
        return;
      }
      fs.stat(this.filePath, (statErr, stat) => {
        if (!statErr) {
          this.lastMtimeMs = stat.mtimeMs;
        }
      });

      const parsed = this.tryParse(contents);
      if (parsed === undefined) {
        // Might have been read mid tmp-file-rename; one short retry before giving up.
        setTimeout(() => {
          fs.readFile(this.filePath, 'utf8', (err2, contents2) => {
            if (err2) {
              return;
            }
            const retryParsed = this.tryParse(contents2);
            if (retryParsed !== undefined) {
              this.onUpdate(retryParsed);
            }
          });
        }, 50);
        return;
      }
      this.onUpdate(parsed);
    });
  }

  private tryParse(contents: string): BridgeData | null | undefined {
    try {
      return JSON.parse(contents) as BridgeData;
    } catch {
      return undefined;
    }
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.fsWatcher?.close();
    this.fsWatcher = null;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }
}
