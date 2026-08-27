# コントリビューションガイド / Contributing

Usage Bar for Claude Code への貢献を検討いただきありがとうございます。日本語・英語どちらでのIssue/PRも歓迎します。

Thanks for considering a contribution to Usage Bar for Claude Code. Issues and PRs are welcome in either Japanese or English.

## 開発環境セットアップ / Development setup

依存関係のインストール、テストの実行、実際のVS Codeウィンドウでの起動（`F5`）方法は [`README.md`](../README.md) の「テストについて / Testing」セクションを参照してください。コントリビューター向けの特別なセットアップはありません。

See the "テストについて / Testing" section of [`README.md`](../README.md) for how to install dependencies, run the test suite, and launch the extension in a real VS Code window (`F5`). There's no separate setup process for contributors.

## ブランチとコミット / Branching and commits

- ベースブランチは `main` です。短命なブランチ（`feat/...`, `fix/...`, `docs/...`）で作業し、`main`への直pushではなくPRを開いてください。
  Base branch is `main`. Work in a short-lived branch (`feat/...`, `fix/...`, `docs/...`) and open a pull request rather than pushing directly to `main`.
- コミット件名は [Conventional Commits](https://www.conventionalcommits.org/) を推奨します。`type`/`scope`は英語、説明は日本語のあと英語を併記してください（例: `docs(readme): 使い方セクションを追加 / add usage section`）。`git log` や将来のchangelog生成が読みやすくなります。現時点でCIによる強制はありません。
  [Conventional Commits](https://www.conventionalcommits.org/) are preferred for commit subjects. Use English for `type`/`scope`, and follow the Japanese description with an English one (e.g. `docs(readme): 使い方セクションを追加 / add usage section`) — it keeps `git log` and future changelog generation readable. Not strictly enforced by CI today.
- PRは焦点を絞ってください。関連のないクリーンアップは別PRにしてください。
  Keep PRs focused; unrelated cleanup can be its own PR.

## PRを開く前に / Before opening a PR

- `npm test`（typecheck + lint + unit tests）がローカルで通ること — CIも同じチェックを実行します。
  `npm test` (typecheck + lint + unit tests) must pass locally — CI runs the same checks.
- 文書化された設計判断（`docs/DESIGN.md` 4章）を変更する場合は同ファイルを、利用者に影響する変更は`CHANGELOG.md`の`[Unreleased]`を更新してください。
  Update `docs/DESIGN.md` if you're changing a documented design decision (section 4), and `CHANGELOG.md` under `[Unreleased]` for any user-facing change.
- 現時点ではDCO（サインオフ）は必須ではありません。
  No DCO / sign-off is required at this stage of the project.

## バグ報告・機能要望 / Reporting bugs / requesting features

Issueテンプレートを使ってください。すぐに対応できるだけの情報（Claude Codeのバージョン、VS Codeのバージョン、OS、再現手順）を聞くようにしています。

Use the issue templates — they ask for just enough detail (Claude Code version, VS Code version, OS, steps to reproduce) to act on a report quickly.

## セキュリティissue / Security issues

セキュリティ脆弱性は公開Issueに書かないでください — [`SECURITY.md`](SECURITY.md) を参照してください。

Please do not open a public issue for a security vulnerability — see [`SECURITY.md`](SECURITY.md).

## ライセンス / License

貢献いただいたコードは、本プロジェクトの [MITライセンス](../LICENSE) の下でライセンスされることに同意したものとみなされます。

By contributing, you agree that your contributions are licensed under this project's [MIT License](../LICENSE).

## 最後に / One more thing

このプロジェクトはソロ開発で、毎日確認しているわけではないので、レビューはのんびりお待ちいただけると助かります。しばらく反応がなければ、Issue/PRで軽く催促してもらって大丈夫です。いつか自分がこのプロジェクトから離れる可能性もゼロではないので、その場合はぜひフォークしてください。

This is a solo project and I don't check in on it every day, so please be patient waiting for a review — a friendly ping on the issue/PR after a while is completely fine. And there's a non-zero chance I disappear on this project one day; if that happens, forks are always welcome.
