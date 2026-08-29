# Usage Bar for Claude Code

Claude Codeの **5時間セッション** / **週間(7日)** のレート制限使用率を、VS Codeのステータスバーに常時表示するVS Code拡張機能です。

A VS Code extension that shows Claude Code's **5-hour session** / **weekly (7-day)** rate limit usage in the status bar at all times.

表示する数値はClaude Code の `statusLine` フックが受け取るサーバー側の `rate_limits`（Claude公式アプリと同じ値）をそのまま使います。独自の推定・計算は行いません。

The numbers shown are the server-side `rate_limits` that Claude Code's `statusLine` hook receives — the same values the official Claude apps show. No independent estimation or calculation is done.

> 本拡張機能はAnthropic公式の拡張機能ではありません。「Claude」はAnthropicの商標であり、本拡張機能は非公式の連携ツールです（詳細は「商標について」参照）。
>
> This extension is not an official Anthropic extension. "Claude" is a trademark of Anthropic; this is an unofficial community integration (see "商標について / Trademark notice" below).

**スコープ外 / Out of scope**: Usage Credits（追加購入クレジット残高）の可視化。現時点でClaude Code/AnthropicがCLI・APIどちらにも公開フィールドを持たないため未実装です。

Visualizing Usage Credits (purchased top-up credit balance) — neither Claude Code's CLI nor Anthropic's API currently exposes a field for this, so it isn't implemented.

詳細な設計・意思決定の背景は [`docs/DESIGN.md`](docs/DESIGN.md)（日本語）を参照してください。

For the detailed design and the rationale behind design decisions, see [`docs/DESIGN.md`](docs/DESIGN.md) (Japanese only).

---

## 仕組み / How it works

```
Claude Code CLI
  └─ statusLineフック実行のたびにJSONをstdin経由でブリッジスクリプトへ渡す
       ~/.claude/vscode-usage-bridge-statusline.js
         └─ rate_limits を抽出し、共有ファイルへアトミックに書き出す
              ~/.claude/vscode-usage-bridge.json
                └─ VS Code拡張機能がファイル変更を検知し、ステータスバーを更新
```

```
Claude Code CLI
  └─ Each time the statusLine hook runs, it pipes JSON to the bridge script via stdin
       ~/.claude/vscode-usage-bridge-statusline.js
         └─ Extracts rate_limits and writes it atomically to a shared file
              ~/.claude/vscode-usage-bridge.json
                └─ The VS Code extension watches the file and updates the status bar
```

Claude Codeのセッションが動いていない間は共有ファイルは更新されません。その場合、最後に分かっていた値が残り、一定時間（デフォルト30分、設定変更可）更新がないと `$(warning)` アイコンで「データが古い可能性」を示します。

The shared file is not updated while no Claude Code session is running. In that case, the last known value stays displayed; once it hasn't been updated for a configurable amount of time (30 minutes by default), a `$(warning)` icon marks the data as possibly stale.

---

## セットアップ手順 / Setup

1. 拡張機能をインストールする。 / Install the extension.
2. 初回起動時に「Claude Code の statusLine にレート制限情報を渡すブリッジスクリプトを設定しますか？」という確認ダイアログが表示されるので、「今すぐ設定」を選ぶ。
   On first activation, a confirmation dialog asks whether to set up the bridge script that feeds rate-limit info into Claude Code's `statusLine`. Choose "今すぐ設定" (Set up now).
   - このダイアログは初回のみ表示されます。「後で」を選んだ・閉じた場合は、コマンドパレットから **`Usage Bar: Setup Claude Code Bridge`** をいつでも実行できます。
     This dialog only appears once. If you chose "後で" (Later) or dismissed it, you can run **`Usage Bar: Setup Claude Code Bridge`** from the Command Palette at any time.
   - 設定内容: `resources/bridge-statusline.js` を `~/.claude/vscode-usage-bridge-statusline.js` にコピーし、`~/.claude/settings.json` の `statusLine.command` をこのスクリプトに向けます。
     What it does: copies `resources/bridge-statusline.js` to `~/.claude/vscode-usage-bridge-statusline.js` and points `statusLine.command` in `~/.claude/settings.json` at it.
   - **既にstatusLineをカスタマイズ済みの場合**: 上書きではなく、既存のコマンドを `~/.claude/vscode-usage-bridge.config.json` の `wrappedCommand` として退避し、ブリッジスクリプトがそのコマンドを毎回呼び出してstdoutをそのまま転送します（＝ターミナルの既存表示は壊れません）。書き換え前の `settings.json` は `settings.json.bak` として保存されます。
     **If you already customized `statusLine`**: instead of overwriting it, your existing command is preserved as `wrappedCommand` in `~/.claude/vscode-usage-bridge.config.json`; the bridge script calls it on every run and forwards its stdout as-is (your terminal output keeps working). The pre-existing `settings.json` is backed up as `settings.json.bak`.
3. Claude Codeのワークスペースで **Workspace Trust** を承認する（`statusLine` はシェルコマンド実行のため、信頼されていないワークスペースでは動作しません）。
   Approve **Workspace Trust** in Claude Code's workspace (`statusLine` runs a shell command, so it won't run in an untrusted workspace).
4. Claude Codeでセッションを開始・操作すると、数秒〜十数秒でVS Codeのステータスバー右側に使用率が表示されます。
   Start or use a Claude Code session; the usage percentage appears on the right side of VS Code's status bar within a few to ~10 seconds.

手動でセットアップする場合は、`resources/bridge-statusline.js` を任意の場所に配置し、`~/.claude/settings.json` に以下のように設定してください（既存のstatusLineがある場合は上記のラップ方式を参考に手動でマージしてください）。

To set this up manually, place `resources/bridge-statusline.js` anywhere and configure `~/.claude/settings.json` as below (if you already have a `statusLine`, merge it manually using the same wrapping approach described above).

```jsonc
{
  "statusLine": {
    "type": "command",
    "command": "node \"/path/to/vscode-usage-bridge-statusline.js\""
  }
}
```

---

## 使い方 / Usage

- ステータスバー右側に1つのアイテムとして表示されます: `$(clock) 5h NN%  $(calendar) 7d NN%`
  Shown as a single status bar item on the right: `$(clock) 5h NN%  $(calendar) 7d NN%`
- 使用率がしきい値を超えると、**5h・7dそれぞれ独立に** 🟡（警告）/ 🔴（危険）の絵文字マーカーが付きます（例: `$(clock) 5h 15% 🟡  $(calendar) 7d 55% 🔴`）。デフォルト: 80%以上で🟡、95%以上で🔴。`usageBar.warningThreshold` / `usageBar.criticalThreshold` で変更可能
  When usage crosses a threshold, **each of 5h and 7d independently** gets a 🟡 (warning) / 🔴 (critical) emoji marker (e.g. `$(clock) 5h 15% 🟡  $(calendar) 7d 55% 🔴`). Defaults: 🟡 at 80%+, 🔴 at 95%+. Configurable via `usageBar.warningThreshold` / `usageBar.criticalThreshold`.
  - アイテム全体の背景色（黄色/赤色）は使用していません。VS CodeのStatusBarItem APIは1アイテムに1色しか設定できず「片方だけ危険」を背景色だけでは表現できないため、上記の絵文字マーカーのみで個々のウィンドウの状態を表します
    The item's overall background color (yellow/red) is intentionally not used. VS Code's StatusBarItem API only supports one color per item, which can't represent "only one window is critical" — so the emoji markers above are the sole indicator for each window's state.
- アイテムをクリックすると、詳細（実数値・リセット時刻のローカル時間・最終更新時刻・共有ファイルのパス）をクイックピックで表示します
  Clicking the item shows a Quick Pick with details: exact percentages, reset time in local time, last-updated time, and the shared file path.
- データ未取得・パース失敗時は `$(circle-slash) 5h N/A  $(circle-slash) 7d N/A` のように表示されます
  Shown as `$(circle-slash) 5h N/A  $(circle-slash) 7d N/A` when no data has been read yet, or parsing failed.

## 設定項目 / Settings

| 設定キー / Key | デフォルト / Default | 説明 / Description |
|---|---|---|
| `usageBar.sharedFilePath` | `""`（未指定 / unset） | 共有ファイルのパス。空の場合は環境変数 `CLAUDE_USAGE_BRIDGE_PATH`、それも無ければ `~/.claude/vscode-usage-bridge.json` を使用 / Path to the shared file. If empty, falls back to the `CLAUDE_USAGE_BRIDGE_PATH` env var, then to `~/.claude/vscode-usage-bridge.json` |
| `usageBar.warningThreshold` | `80` | 警告マーカー(🟡)に切り替える使用率(%) / Usage % that switches on the warning (🟡) marker |
| `usageBar.criticalThreshold` | `95` | 危険マーカー(🔴)に切り替える使用率(%) / Usage % that switches on the critical (🔴) marker |
| `usageBar.pollIntervalSeconds` | `5` | `fs.watch` が効かない環境向けの安全網ポーリング間隔(秒) / Fallback polling interval (seconds) for when `fs.watch` isn't reliable |
| `usageBar.staleAfterMinutes` | `30` | この時間以上更新がないと「データが古い可能性」を示す / Marks data as possibly stale after this many minutes without an update |
| `usageBar.autoSetupBridge` | `true` | 初回起動時にブリッジの自動セットアップを提案するかどうか / Whether to offer automatic bridge setup on first activation |

共有ファイルのパスをVS Code側の設定で変更した場合、Claude Code側のブリッジスクリプトにも同じパスを認識させる必要があります。ブリッジスクリプトは環境変数 `CLAUDE_USAGE_BRIDGE_PATH` のみを見るため、シェルの起動設定（`.bashrc`等）でその環境変数を同じ値にエクスポートしてください。

If you change the shared file path on the VS Code side, the bridge script on the Claude Code side needs to know about it too. The bridge script only looks at the `CLAUDE_USAGE_BRIDGE_PATH` env var, so export that variable with the same value in your shell startup file (e.g. `.bashrc`).

---

## 既知の制約・前提条件 / Known limitations

技術的な背景は [`docs/DESIGN.md`](docs/DESIGN.md)（日本語）5章も参照してください。

See [`docs/DESIGN.md`](docs/DESIGN.md) (Japanese only) section 5 for the technical background.

1. **Workspace Trust**: `statusLine` はシェルコマンドを実行するため、Claude Code側でワークスペースの信頼を承認していないと動作しません。
   `statusLine` runs a shell command, so it won't work unless Workspace Trust is approved on the Claude Code side.
2. **セッション非起動時は値が更新されません** / **Values don't update while no session is running**: Claude Codeが起動していない・セッションが動いていない間、共有ファイルは更新されず、最後に分かっていた値が表示され続けます。`usageBar.staleAfterMinutes` を超えて更新がない場合は「データが古い可能性」を示すインジケーター（`$(warning)`）が付与されます。
   While Claude Code isn't running / no session is active, the shared file isn't updated and the last known value keeps showing. Past `usageBar.staleAfterMinutes` without an update, a `$(warning)` "possibly stale" indicator is added.
3. **既存の `statusLine` カスタマイズ** / **Pre-existing `statusLine` customization**: セットアップ時に既存コマンドをラップして保持するため、通常はターミナル側の表示は壊れません。ただし複雑な `statusLine` 実装（環境変数やcwdに強く依存するもの等）では想定外の挙動になる可能性があるため、セットアップ後は一度ターミナル上の表示も確認してください。
   Setup wraps and preserves your existing command, so terminal output normally keeps working. But a complex `statusLine` implementation (heavily dependent on env vars or cwd, etc.) might behave unexpectedly — check the terminal output once after setup.
4. **`rate_limits` が存在しないケース** / **When `rate_limits` is absent**: 無料プラン、APIキー利用、セッション開始直後などでは `rate_limits` 自体、または `five_hour`/`seven_day` のいずれかが欠損することがあります。ブリッジスクリプトは欠損時に前回値を保持し、拡張機能側は取得済みの値がなければ `N/A` 表示にフォールバックします。
   On free plans, with API-key usage, or right after a session starts, `rate_limits` itself — or `five_hour`/`seven_day` individually — can be missing. The bridge script keeps the previous value when a field is missing, and the extension falls back to `N/A` if no value has ever been received.
5. **Windows対応** / **Windows support**: Claude Code側の `statusLine` はGit Bash経由・PowerShell経由のどちらでも実行され得ます。ブリッジスクリプトはNode.js標準機能のみで書かれており（jq等の外部依存なし）、生成する `statusLine.command` はフォワードスラッシュ区切りのパスを使用します。
   Claude Code's `statusLine` may run via either Git Bash or PowerShell. The bridge script uses only Node.js built-ins (no external dependency like `jq`), and the `statusLine.command` it generates uses forward-slash paths.
6. **Claude Codeのバージョン差異** / **Claude Code version differences**: バージョンによって `rate_limits` フィールドの有無が変わる可能性があります。ブリッジスクリプト・拡張機能側とも欠損を前提としたフォールバック処理を行っています。
   Whether the `rate_limits` field exists can vary by Claude Code version. Both the bridge script and the extension are built to gracefully fall back when it's missing.

---

## テストについて / Testing

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm run compile     # esbuildでdist/extension.jsを生成 / bundles dist/extension.js with esbuild
npm run test:unit   # node:testで純粋関数 + bridge-statusline.jsの実挙動を検証 / node:test for pure functions + bridge-statusline.js's actual behavior
npm test            # 上記 typecheck / lint / test:unit をまとめて実行 / runs typecheck / lint / test:unit together
```

`test/extension.test.ts` は `@vscode/test-electron` を使う統合テストの雛形です。実行にはVS Code本体をネットワーク経由でダウンロードする必要があるため、オフライン/サンドボックス環境では実行していません。ローカルで実行する場合は [`@vscode/test-electron`のREADME](https://github.com/microsoft/vscode-test) を参考に `test/runTest.ts` ランチャーを追加し、`npm run test:integration` のようなスクリプトから起動してください。

`test/extension.test.ts` is an integration-test scaffold using `@vscode/test-electron`. Running it requires downloading a real VS Code binary over the network, so it isn't run in offline/sandboxed environments. To run it locally, add a `test/runTest.ts` launcher per the [`@vscode/test-electron` README](https://github.com/microsoft/vscode-test) and invoke it from a script such as `npm run test:integration`.

### 実際にVS Code上で動かして確認する（F5デバッグ） / Running it in a real VS Code window (F5 debugging)

自動テストではUIやClaude Codeとの実連携までは検証できないため、最終的には実際にVS Code上で動かして確認してください。

Automated tests can't verify the UI or actual Claude Code integration, so a real VS Code run is the final check.

1. このリポジトリのフォルダをVS Codeで開く（`code .`） / Open this repo folder in VS Code (`code .`)
2. 初回のみ `npm install` を実行（未実施の場合） / Run `npm install` once, if you haven't
3. **F5** を押す（または「実行とデバッグ」パネルから `Run Extension` を選択） / Press **F5** (or select `Run Extension` in the Run and Debug panel)
   - `.vscode/launch.json` の `Run Extension` 構成が、ビルド用タスク `.vscode/tasks.json`（`npm run watch`、esbuildのウォッチビルド）を自動的に先に実行し、完了を待ってから新しいVS Codeウィンドウ（Extension Development Host）を起動します
     The `Run Extension` config in `.vscode/launch.json` automatically runs the build task in `.vscode/tasks.json` first (`npm run watch`, an esbuild watch build), waits for it to finish, and then launches a new VS Code window (Extension Development Host).
   - 以降 `src/` や `resources/` を編集して保存すると、そのウィンドウでウィンドウリロード（`Ctrl+R` / `Cmd+R`）するだけで変更が反映されます
     After that, editing and saving files in `src/` or `resources/` takes effect after reloading that window (`Ctrl+R` / `Cmd+R`).
4. 開いた新しいウィンドウのステータスバー右側に `$(circle-slash) 5h N/A  $(circle-slash) 7d N/A`（未セットアップ状態）が表示されていることを確認する
   Confirm the new window's status bar shows `$(circle-slash) 5h N/A  $(circle-slash) 7d N/A` (the not-yet-set-up state) on the right.
5. コマンドパレットから `Usage Bar: Setup Claude Code Bridge` を実行し、実際にClaude Codeセッションを動かして、数値が追従するかを確認する
   Run `Usage Bar: Setup Claude Code Bridge` from the Command Palette, then run an actual Claude Code session and confirm the numbers follow along.
   - すぐに試したい場合は、ブリッジを経由せず共有ファイルを直接書き換えても動作確認できます:
     For a quicker check, you can also write the shared file directly, bypassing the bridge:
     ```bash
     mkdir -p ~/.claude
     cat > ~/.claude/vscode-usage-bridge.json <<'EOF'
     {
       "updated_at": "2026-08-26T10:30:00Z",
       "five_hour": { "used_percentage": 23.5, "resets_at": 1798425600 },
       "seven_day": { "used_percentage": 91.2, "resets_at": 1798857600 }
     }
     EOF
     ```
     保存後、数秒以内（`usageBar.pollIntervalSeconds`のデフォルト5秒以内）にステータスバーへ反映されるはずです
     It should show up in the status bar within a few seconds of saving (within the default `usageBar.pollIntervalSeconds` of 5).

最終的な動作確認は、実際のVS Code + 実際のClaude Codeセッションを動かしながら数値が追従するかを手動で確認することを推奨します。

For a final check, we recommend manually confirming that the numbers follow along while running a real VS Code window against a real Claude Code session.

---

## 商標について / Trademark notice

「Claude」「Anthropic」はAnthropic, PBCの商標です。本拡張機能は非公式のコミュニティツールであり、Anthropicによる承認・提携を受けたものではありません。拡張機能名・アイコンとも公式のClaude/Anthropicブランドを流用しないようにしています。

"Claude" and "Anthropic" are trademarks of Anthropic, PBC. This extension is an unofficial community tool, not endorsed by or affiliated with Anthropic. Neither the extension's name nor its icon reuses official Claude/Anthropic branding.

## アイコンについて / About the icon

`icon.png`（128x128、リポジトリルート）を独自デザインで用意し、`package.json` の `icon` フィールドに設定済みです。Anthropic/Claudeの公式ブランドカラー・ロゴ形状は使用していません。元のベクター版は `resources/icon.svg` にあります。`resources/icons/` は未使用です（ステータスバー表示はVS Code標準のcodicon `$(clock)` / `$(calendar)` / `$(warning)` / `$(circle-slash)` のみで構成しています）。

The `package.json` doesn't set an `icon` field yet (`icon.png` hasn't been created). Before publishing to the Marketplace, add a trademark-conscious original 128x128 `icon.png` and set `"icon": "icon.png"` in `package.json`. `resources/icons/` is unused for the same reason — the status bar display is built entirely from VS Code's built-in codicons (`$(clock)` / `$(calendar)` / `$(warning)` / `$(circle-slash)`).

## ライセンス / License

MIT. `LICENSE` を参照してください。日本語の参考訳は [`LICENSE.ja.md`](LICENSE.ja.md)（非拘束）にあります。

MIT. See `LICENSE`. A non-binding Japanese reference translation is available at [`LICENSE.ja.md`](LICENSE.ja.md).
