# Security Policy

## Reporting a vulnerability

Please **do not** open a public issue for a security vulnerability. Instead, use GitHub's [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing/privately-reporting-a-security-vulnerability) for this repository (Security tab → "Report a vulnerability").

If that's not available, open a regular issue asking to be contacted privately, without details of the vulnerability itself.

## Scope

This extension writes to and reads from a shared file (`~/.claude/vscode-usage-bridge.json` by default) and, during setup, edits `~/.claude/settings.json`. Reports involving unexpected file access, path handling, or the way the bridge script wraps an existing `statusLine` command are all in scope.
