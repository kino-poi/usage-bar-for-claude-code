#!/usr/bin/env node
'use strict';

/*
 * Claude Code statusLine bridge for "Usage Bar for Claude Code".
 *
 * Reads the JSON Claude Code passes on stdin (see docs/DESIGN.md section 2),
 * extracts rate_limits.five_hour / seven_day, and writes them to a shared
 * file that the VS Code extension watches. If the user already had a
 * statusLine command configured, this script wraps it (see
 * ~/.claude/vscode-usage-bridge.config.json, written by the extension's
 * setup step) so the original terminal statusLine output keeps working
 * unchanged (docs/DESIGN.md section 4.5) instead of being replaced.
 *
 * No npm dependencies: plain Node.js built-ins only, so this runs the same
 * way whether Claude Code invokes it via Git Bash or PowerShell on Windows.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

function claudeDir() {
  return path.join(os.homedir(), '.claude');
}

function sharedFilePath() {
  const fromEnv = process.env.CLAUDE_USAGE_BRIDGE_PATH;
  if (fromEnv && fromEnv.trim()) {
    return fromEnv.trim();
  }
  return path.join(claudeDir(), 'vscode-usage-bridge.json');
}

function wrappedCommandConfigPath() {
  return path.join(claudeDir(), 'vscode-usage-bridge.config.json');
}

function readStdinSync() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function writeAtomic(filePath, contents) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmpPath = path.join(dir, `.${path.basename(filePath)}.${process.pid}.tmp`);
  fs.writeFileSync(tmpPath, contents, 'utf8');
  fs.renameSync(tmpPath, filePath);
}

function normalizeWindow(win) {
  if (!win || typeof win.used_percentage !== 'number') {
    return undefined;
  }
  return {
    used_percentage: win.used_percentage,
    resets_at: typeof win.resets_at === 'number' ? win.resets_at : null,
  };
}

/**
 * Missing fields keep the previously known value instead of flashing to N/A:
 * rate_limits (or one of its sub-windows) legitimately disappears for a beat
 * around session start, or is absent entirely on non-Pro/Max plans and API-key
 * usage (see docs/DESIGN.md section 4.6 for why this keeps the previous value
 * instead of writing null).
 */
function updateSharedFile(input) {
  const target = sharedFilePath();
  const previous = readJsonSafe(target) || {};
  const rateLimits = (input && input.rate_limits) || {};

  const fiveHour = normalizeWindow(rateLimits.five_hour) || previous.five_hour || null;
  const sevenDay = normalizeWindow(rateLimits.seven_day) || previous.seven_day || null;

  const data = {
    updated_at: new Date().toISOString(),
    five_hour: fiveHour,
    seven_day: sevenDay,
  };

  try {
    writeAtomic(target, JSON.stringify(data, null, 2));
  } catch (err) {
    process.stderr.write(`usage-bar bridge: failed to write shared file: ${err && err.message}\n`);
  }
}

function fallbackStatusLine(input) {
  const model = (input && input.model && (input.model.display_name || input.model.id)) || '';
  const rateLimits = (input && input.rate_limits) || {};
  const fiveHour =
    rateLimits.five_hour && typeof rateLimits.five_hour.used_percentage === 'number'
      ? `${Math.round(rateLimits.five_hour.used_percentage)}%`
      : 'N/A';
  const sevenDay =
    rateLimits.seven_day && typeof rateLimits.seven_day.used_percentage === 'number'
      ? `${Math.round(rateLimits.seven_day.used_percentage)}%`
      : 'N/A';
  const modelPart = model ? `${model} | ` : '';
  return `${modelPart}5h ${fiveHour}  7d ${sevenDay}`;
}

/** Runs the pre-existing statusLine command (if any) with the same stdin and forwards its stdout as-is. */
function forwardToWrappedCommand(rawStdin) {
  const config = readJsonSafe(wrappedCommandConfigPath());
  const wrappedCommand = config && typeof config.wrappedCommand === 'string' ? config.wrappedCommand.trim() : '';
  if (!wrappedCommand) {
    return null;
  }
  const result = spawnSync(wrappedCommand, {
    shell: true,
    input: rawStdin,
    encoding: 'utf8',
    timeout: 3000,
  });
  if (result.error || typeof result.stdout !== 'string') {
    const reason = result.error ? result.error.message : `exit code ${result.status}`;
    process.stderr.write(`usage-bar bridge: wrapped statusLine command failed: ${reason}\n`);
    return null;
  }
  return result.stdout;
}

function main() {
  const raw = readStdinSync();

  let input = null;
  try {
    input = raw.trim() ? JSON.parse(raw) : null;
  } catch {
    // Not JSON (or empty): leave the shared file untouched and pass input
    // through unchanged so we never break whatever was working before.
    process.stdout.write(raw);
    return;
  }

  updateSharedFile(input);

  const forwarded = forwardToWrappedCommand(raw);
  if (forwarded !== null) {
    process.stdout.write(forwarded);
    return;
  }

  process.stdout.write(fallbackStatusLine(input));
}

main();
