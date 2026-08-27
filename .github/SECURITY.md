# セキュリティポリシー / Security Policy

## 脆弱性の報告 / Reporting a vulnerability

セキュリティ脆弱性は**公開Issueに書かないでください**。代わりに、このリポジトリのGitHub [Private Vulnerability Reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing/privately-reporting-a-security-vulnerability)（Securityタブ → "Report a vulnerability"）を使用してください。

Please **do not** open a public issue for a security vulnerability. Instead, use GitHub's [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing/privately-reporting-a-security-vulnerability) for this repository (Security tab → "Report a vulnerability").

それが使えない場合は、脆弱性の詳細を書かずに「非公開で連絡したい」旨だけの通常Issueを開いてください。

If that's not available, open a regular issue asking to be contacted privately, without details of the vulnerability itself.

## 対応について / Response

このプロジェクトはソロ開発のため、確認・修正はベストエフォートになりますが、報告は必ず確認します。

This is a solo project, so triage and fixes are best-effort, but every report will be reviewed.

## 対象範囲 / Scope

本拡張機能は共有ファイル（デフォルト `~/.claude/vscode-usage-bridge.json`）の読み書きを行い、セットアップ時には `~/.claude/settings.json` を編集します。想定外のファイルアクセス、パス処理、既存の`statusLine`コマンドをラップする方式に関する報告は対象範囲内です。

This extension writes to and reads from a shared file (`~/.claude/vscode-usage-bridge.json` by default) and, during setup, edits `~/.claude/settings.json`. Reports involving unexpected file access, path handling, or the way the bridge script wraps an existing `statusLine` command are all in scope.
