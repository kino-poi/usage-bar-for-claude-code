> **ドキュメントID:** docs/DESIGN.md
> **ステータス:** 有効
> **最終更新:** 2026-08-28
> **関連:** [README.md](../README.md), [CHANGELOG.md](../CHANGELOG.md)

# Usage Bar for Claude Code — 設計書

このリポジトリの実装がどう組み立てられているか、そしてなぜその形になったかを記録する保守文書。導入方法・使い方はREADME.mdを参照。要件定義（初期の指示書）は`tmp/SPEC.md`にあるが、これはgitignore対象のスクラッチ資料であり、実装完了後の正となるのは本書。

---

## 1. 目的・スコープ

Claude Codeの5時間セッション／週間(7日)のレート制限使用率（`rate_limits.five_hour` / `rate_limits.seven_day`、Claude公式アプリと同じサーバー値）を、VS Codeのステータスバーに常時表示する。独自の推定・計算は行わない。

**スコープ外**: Usage Credits（追加購入クレジット残高）の可視化。Claude Code/AnthropicがCLI・APIのどちらにも公開フィールドを持たないため実装不可能。

---

## 2. アーキテクチャ

```
[Claude Code CLI]
   │ セッションイベントごとにJSONをstdin経由で渡す（statusLineフック）
   ▼
[resources/bridge-statusline.js]  (Node.js、依存ゼロ)
   │ rate_limits.five_hour / seven_day を抽出
   │ 一時ファイル→renameでアトミックに共有ファイルへ書き出す
   │ 既存のstatusLineコマンドがあれば同じstdinで呼び出し、stdoutをそのまま転送
   ▼
[~/.claude/vscode-usage-bridge.json]  ← 共有ファイル
   │ fs.watch（親ディレクトリ）＋ 安全網ポーリングで検知
   ▼
[src/fileWatcher.ts] → [src/extension.ts] → [src/statusBar.ts]
   │ StatusBarItem 1個のテキスト・ツールチップを更新
   ▼
[VS Codeステータスバー]
```

主要モジュール:
- `src/config.ts`: 設定読み書き・共有ファイルパス解決（設定 > `CLAUDE_USAGE_BRIDGE_PATH`環境変数 > デフォルト）
- `src/fileWatcher.ts`: 共有ファイルの変更検知（`SharedFileWatcher`）
- `src/statusBar.ts`: ステータスバー表示ロジック（`UsageStatusBar`、および純粋関数群）
- `src/bridgeSetup.ts`: `~/.claude/settings.json`への自動セットアップ（初回のみ確認ダイアログ）
- `src/extension.ts`: `activate()`/`deactivate()`、上記の配線
- `resources/bridge-statusline.js`: Claude Code側に配置されるブリッジ本体

---

## 3. データモデル

`src/config.ts`で定義（実装が正なので型注釈はそちらを参照。ここでは形のみ）:

```ts
interface RateLimitWindow {
  used_percentage: number;   // 0-100
  resets_at: number;         // Unixエポック秒
}

interface BridgeData {       // ~/.claude/vscode-usage-bridge.json の内容
  updated_at: string;        // ISO8601
  five_hour: RateLimitWindow | null;
  seven_day: RateLimitWindow | null;
}
```

`five_hour`/`seven_day`はそれぞれ独立に欠損しうる（無料プラン、APIキー利用、セッション開始直後など）。ブリッジスクリプトは欠損時に共有ファイルの前回値を保持する（下記4.6）。

---

## 4. 主要な設計判断

実装中に決めた事項を、背景・検討した選択肢・決定・根拠・影響の形で記録する。

### 4.1 StatusBarItemは1個に統合する（2個ではない）

- **Status:** 確定（一度2個構成で実装し、実運用で問題が出たため1個に変更した）
- **Background:** VS Codeのステータスバーは、同じ配置（左/右）にある**全拡張機能**のアイテムを`priority`だけでまとめてソートする。自拡張機能内の複数アイテムが隣接する保証はない。
- **Options Considered:**
  1. 5h/7dで2個のStatusBarItemに分ける（独立した背景色・ツールチップを持てる）
  2. 1個のStatusBarItemにまとめる（`$(clock) 5h NN%  $(calendar) 7d NN%`）
- **Decision:** 2で確定。
- **Rationale:** 実際に2個構成で運用したところ、他拡張機能（例: Live Serverの「Go Live」ボタン）のアイテムが`priority`の並び順でちょうど間に入り込み、表示が分断される実害が確認された。priority値をどれだけ離しても、別の拡張機能が偶然その間の値を使えば同じ問題が再発するため、根本的な解決にはならない。1個のアイテムに統合すれば構造的にこの問題が起こり得ない。
- **Consequences:** 1個のアイテムはVS Code APIとして単一の`backgroundColor`しか持てないため、「5h/7dそれぞれの深刻度」を背景色だけで独立に表現できなくなる（→4.2で対処）。

### 4.2 深刻度は背景色でなく絵文字マーカーで表現する

- **Status:** 確定（一度は「深刻な方の色で背景色を決定」する実装をしたが、後に絵文字マーカー方式へ変更し、背景色自体を廃止した）
- **Background:** 4.1で1個のStatusBarItemに統合した結果、`StatusBarItem.backgroundColor`はアイテム全体にしか適用できない。「5hは警告(80%以上)・7dは危険(95%以上)」のように片方だけ深刻な場合、深刻な方の色だけを採用すると、もう片方の警告状態が背景色に埋もれて見えなくなる。
- **Options Considered:**
  1. アイテム全体の背景色を「5h/7dのうち深刻な方」で決定する
  2. 5h/7dそれぞれに絵文字マーカー（🟡=警告 / 🔴=危険）を独立に付与する。背景色は使わない
- **Decision:** 2で確定。
- **Rationale:** VS CodeのStatusBarItem APIには文字列の一部だけを別色にする手段がない。一方、絵文字グリフ（🟡🔴）はOS/フォントの色つき絵文字として描画され、アイテムの文字色設定とは独立して常に固定色で表示される。これを使えば1個のアイテムのまま、5h/7dそれぞれの状態を独立に可視化できる。
- **Consequences:** ステータスバー全体の背景色による「一目でわかる警告感」は失われるが、実際に片方だけが深刻なケースを正しく表現できることを優先した。

### 4.3 警告/危険の閾値デフォルトは80% / 95%

- **Status:** 確定
- **Background:** SPEC本文が例示していた数値。
- **Decision:** `usageBar.warningThreshold`=80、`usageBar.criticalThreshold`=95をデフォルトとし、ユーザー設定で変更可能にする。
- **Rationale:** SPEC本文の例をそのまま採用。恣意的な独自基準を持ち込まない。

### 4.4 共有ファイルの監視は `fs.watch` ＋ 安全網ポーリングの併用

- **Status:** 確定
- **Background:** `fs.watch`はWindows/ネットワークドライブ等で信頼性が低いケースがある一方、ポーリングのみだと検知が遅延する。
- **Options Considered:** ①`fs.watch`のみ、②ポーリングのみ、③両方併用
- **Decision:** ③。親ディレクトリを`fs.watch`しつつ、`usageBar.pollIntervalSeconds`（デフォルト5秒）で`mtimeMs`比較による安全網ポーリングを並走させる（`src/fileWatcher.ts`の`SharedFileWatcher`）。
- **Rationale:** `fs.watch`だけに依存すると環境によって更新が反映されないリスクがあり、ポーリングだけだと不必要に遅い。両方使えばどちらの弱点も補える。

### 4.5 ブリッジスクリプトは拡張機能が自動セットアップし、既存statusLineをラップする

- **Status:** 確定
- **Background:** Claude Codeの`statusLine`はユーザーが既にカスタマイズ済みの可能性があり、単純に上書きするとターミナル側の表示が壊れる。また`~/.claude/settings.json`の書き換えは強い権限行使になる。
- **Decision:** 初回activate時のみ確認ダイアログを出し（`context.globalState`で1回だけ）、承認時のみ`~/.claude/settings.json`を書き換える。既存の`statusLine.command`があれば`~/.claude/vscode-usage-bridge.config.json`に`wrappedCommand`として退避し、ブリッジスクリプトが毎回そのコマンドを同じstdinで呼び出してstdoutをそのまま転送する。書き換え前の`settings.json`は`.bak`として保存する。
- **Rationale:** ユーザーの既存カスタマイズを壊さないことを最優先しつつ、手動セットアップの手間を減らす。強い権限行使は明示的な同意を経てから行う。

### 4.6 rate_limitsの欠損時は前回値を保持する

- **Status:** 確定
- **Background:** `rate_limits`自体、または`five_hour`/`seven_day`のいずれかが「存在しない場合がある」（Pro/Maxサブスクリプションのユーザーのみ出現、セッション開始直後は未出現）。
- **Options Considered:** ①欠損時はnullのまま書き出す、②欠損時は共有ファイルの前回値を保持する
- **Decision:** ②。`resources/bridge-statusline.js`が共有ファイルを読み直し、新しい値がある方だけ更新する。
- **Rationale:** ①だと、値が一瞬でも欠損するたびにステータスバーが`N/A`にちらつく。UXとして前回値を保持する方が実用的。

---

## 5. 既知の制約の技術的背景

利用者向けの要約はREADME「既知の制約・前提条件」を参照。ここでは背景のみ補足する。

- **Workspace Trust**: `statusLine`はシェルコマンド実行のため、Claude Code側がワークスペースを信頼していないと動作しない。拡張機能側で検知・介入する手段はない。
- **セッション非起動時は値が更新されない**: ブリッジスクリプトはClaude Codeのイベント発火時にしか実行されないため、セッションが動いていない間は共有ファイルへの書き込みが発生しない。`usageBar.staleAfterMinutes`（デフォルト30分）はこの「更新が止まっている状態」をUI上で示すための閾値であり、実際にデータが古いかどうかを能動的に検知しているわけではない。
- **Claude Codeのバージョン差異**: `rate_limits`フィールドの有無はClaude Code側の実装に依存する。拡張機能・ブリッジスクリプトのどちらも欠損を前提としたフォールバックを行うことで、バージョン差異を吸収する。

---

## 改訂履歴

| 日付 | 変更内容 |
|---|---|
| 2026-08-28 | 新規作成。`tmp/SPEC.md`（旧`docs/SPEC.md`）に代わる保守文書として、実装済みの設計・意思決定を記録。 |
