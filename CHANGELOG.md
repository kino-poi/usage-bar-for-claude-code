# Changelog

このファイルにはプロジェクトの全notable変更を記録します。
All notable changes to this project are documented in this file.

形式は [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) に準拠し、
バージョニングは [Semantic Versioning](https://semver.org/) に従います。
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.1] - 2026-08-29

### Added

- READMEにステータスバーのスクリーンショット（通常時・警告/危険マーカー表示時）を追加。
- READMEのセットアップ手順に、拡張機能のインストール方法（拡張機能ビュー検索・
  拡張機能ID指定のCLIインストール・Marketplaceページ直接）を具体的に記載。

## [0.1.0] - 2026-08-29

### Added

- Claude Codeの5時間/7日レート制限使用率を表示するステータスバーアイテム
  （`$(clock) 5h NN%  $(calendar) 7d NN%`）。`statusLine`フックの`rate_limits`を
  ブリッジスクリプト＋共有JSONファイル経由で取得する。
- ファイル監視（ポーリングをフォールバックとして併用）によるリアルタイム更新。
- Claude Code側`statusLine`ブリッジのガイド付き・オプトインセットアップ。既存の
  `statusLine`コマンドは置き換えず、ラップして保持する。
- 5h/7dそれぞれ独立の深刻度マーカー（🟡警告 / 🔴危険）。単一の背景色を使わない
  理由は[`docs/DESIGN.md`](docs/DESIGN.md) 4章を参照。
- 共有ファイルのパス・閾値・ポーリング間隔・古いデータ判定・自動セットアップの
  オンオフを設定できる`usageBar.*`設定群。

[Unreleased]: https://github.com/kino-poi/usage-bar-for-claude-code/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/kino-poi/usage-bar-for-claude-code/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/kino-poi/usage-bar-for-claude-code/releases/tag/v0.1.0
