# Usage Bar for Claude Code

Claude Codeの **5時間セッション** / **週間(7日)** のレート制限使用率を、VS Codeのステータスバーに常時表示するVS Code拡張機能です。

表示する数値はClaude Code の `statusLine` フックが受け取るサーバー側の `rate_limits`（Claude公式アプリと同じ値）をそのまま使います。独自の推定・計算は行いません。

> 本拡張機能はAnthropic公式の拡張機能ではありません。「Claude」はAnthropicの商標であり、本拡張機能は非公式の連携ツールです（詳細は「商標について」参照）。

**スコープ外**: Usage Credits（追加購入クレジット残高）の可視化。現時点でClaude Code/AnthropicがCLI・APIどちらにも公開フィールドを持たないため未実装です。

詳細な設計・意思決定の背景は [`docs/DESIGN.md`](docs/DESIGN.md) を参照してください。

---

## 仕組み

```
Claude Code CLI
  └─ statusLineフック実行のたびにJSONをstdin経由でブリッジスクリプトへ渡す
       ~/.claude/vscode-usage-bridge-statusline.js
         └─ rate_limits を抽出し、共有ファイルへアトミックに書き出す
              ~/.claude/vscode-usage-bridge.json
                └─ VS Code拡張機能がファイル変更を検知し、ステータスバーを更新
```

Claude Codeのセッションが動いていない間は共有ファイルは更新されません。その場合、最後に分かっていた値が残り、一定時間（デフォルト30分、設定変更可）更新がないと `$(warning)` アイコンで「データが古い可能性」を示します。

---

## セットアップ手順

1. 拡張機能をインストールする。
2. 初回起動時に「Claude Code の statusLine にレート制限情報を渡すブリッジスクリプトを設定しますか？」という確認ダイアログが表示されるので、「今すぐ設定」を選ぶ。
   - このダイアログは初回のみ表示されます。「後で」を選んだ・閉じた場合は、コマンドパレットから **`Usage Bar: Setup Claude Code Bridge`** をいつでも実行できます。
   - 設定内容: `resources/bridge-statusline.js` を `~/.claude/vscode-usage-bridge-statusline.js` にコピーし、`~/.claude/settings.json` の `statusLine.command` をこのスクリプトに向けます。
   - **既にstatusLineをカスタマイズ済みの場合**: 上書きではなく、既存のコマンドを `~/.claude/vscode-usage-bridge.config.json` の `wrappedCommand` として退避し、ブリッジスクリプトがそのコマンドを毎回呼び出してstdoutをそのまま転送します（＝ターミナルの既存表示は壊れません）。書き換え前の `settings.json` は `settings.json.bak` として保存されます。
3. Claude Codeのワークスペースで **Workspace Trust** を承認する（`statusLine` はシェルコマンド実行のため、信頼されていないワークスペースでは動作しません）。
4. Claude Codeでセッションを開始・操作すると、数秒〜十数秒でVS Codeのステータスバー右側に使用率が表示されます。

手動でセットアップする場合は、`resources/bridge-statusline.js` を任意の場所に配置し、`~/.claude/settings.json` に以下のように設定してください（既存のstatusLineがある場合は上記のラップ方式を参考に手動でマージしてください）。

```jsonc
{
  "statusLine": {
    "type": "command",
    "command": "node \"/path/to/vscode-usage-bridge-statusline.js\""
  }
}
```

---

## 使い方

- ステータスバー右側に1つのアイテムとして表示されます: `$(clock) 5h NN%  $(calendar) 7d NN%`
- 使用率がしきい値を超えると、**5h・7dそれぞれ独立に** 🟡（警告）/ 🔴（危険）の絵文字マーカーが付きます（例: `$(clock) 5h 15% 🟡  $(calendar) 7d 55% 🔴`）。デフォルト: 80%以上で🟡、95%以上で🔴。`usageBar.warningThreshold` / `usageBar.criticalThreshold` で変更可能
  - アイテム全体の背景色（黄色/赤色）は使用していません。VS CodeのStatusBarItem APIは1アイテムに1色しか設定できず「片方だけ危険」を背景色だけでは表現できないため、上記の絵文字マーカーのみで個々のウィンドウの状態を表します
- アイテムをクリックすると、詳細（実数値・リセット時刻のローカル時間・最終更新時刻・共有ファイルのパス）をクイックピックで表示します
- データ未取得・パース失敗時は `$(circle-slash) 5h N/A  $(circle-slash) 7d N/A` のように表示されます

## 設定項目

| 設定キー | デフォルト | 説明 |
|---|---|---|
| `usageBar.sharedFilePath` | `""`（未指定） | 共有ファイルのパス。空の場合は環境変数 `CLAUDE_USAGE_BRIDGE_PATH`、それも無ければ `~/.claude/vscode-usage-bridge.json` を使用 |
| `usageBar.warningThreshold` | `80` | 警告色（黄）に切り替える使用率(%) |
| `usageBar.criticalThreshold` | `95` | 危険色（赤）に切り替える使用率(%) |
| `usageBar.pollIntervalSeconds` | `5` | `fs.watch` が効かない環境向けの安全網ポーリング間隔(秒) |
| `usageBar.staleAfterMinutes` | `30` | この時間以上更新がないと「データが古い可能性」を示す |
| `usageBar.autoSetupBridge` | `true` | 初回起動時にブリッジの自動セットアップを提案するかどうか |

共有ファイルのパスをVS Code側の設定で変更した場合、Claude Code側のブリッジスクリプトにも同じパスを認識させる必要があります。ブリッジスクリプトは環境変数 `CLAUDE_USAGE_BRIDGE_PATH` のみを見るため、シェルの起動設定（`.bashrc`等）でその環境変数を同じ値にエクスポートしてください。

---

## 既知の制約・前提条件

技術的な背景は [`docs/DESIGN.md`](docs/DESIGN.md) 5章も参照してください。

1. **Workspace Trust**: `statusLine` はシェルコマンドを実行するため、Claude Code側でワークスペースの信頼を承認していないと動作しません。
2. **セッション非起動時は値が更新されません**: Claude Codeが起動していない・セッションが動いていない間、共有ファイルは更新されず、最後に分かっていた値が表示され続けます。`usageBar.staleAfterMinutes` を超えて更新がない場合は「データが古い可能性」を示すインジケーター（`$(warning)`）が付与されます。
3. **既存の `statusLine` カスタマイズ**: セットアップ時に既存コマンドをラップして保持するため、通常はターミナル側の表示は壊れません。ただし複雑な `statusLine` 実装（環境変数やcwdに強く依存するもの等）では想定外の挙動になる可能性があるため、セットアップ後は一度ターミナル上の表示も確認してください。
4. **`rate_limits` が存在しないケース**: 無料プラン、APIキー利用、セッション開始直後などでは `rate_limits` 自体、または `five_hour`/`seven_day` のいずれかが欠損することがあります。ブリッジスクリプトは欠損時に前回値を保持し、拡張機能側は取得済みの値がなければ `N/A` 表示にフォールバックします。
5. **Windows対応**: Claude Code側の `statusLine` はGit Bash経由・PowerShell経由のどちらでも実行され得ます。ブリッジスクリプトはNode.js標準機能のみで書かれており（jq等の外部依存なし）、生成する `statusLine.command` はフォワードスラッシュ区切りのパスを使用します。
6. **Claude Codeのバージョン差異**: バージョンによって `rate_limits` フィールドの有無が変わる可能性があります。ブリッジスクリプト・拡張機能側とも欠損を前提としたフォールバック処理を行っています。

---

## テストについて

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm run compile     # esbuildでdist/extension.jsを生成
npm run test:unit   # node:testで純粋関数 + bridge-statusline.jsの実挙動を検証
npm test            # 上記 typecheck / lint / test:unit をまとめて実行
```

`test/extension.test.ts` は `@vscode/test-electron` を使う統合テストの雛形です。実行にはVS Code本体をネットワーク経由でダウンロードする必要があるため、オフライン/サンドボックス環境では実行していません。ローカルで実行する場合は [`@vscode/test-electron`のREADME](https://github.com/microsoft/vscode-test) を参考に `test/runTest.ts` ランチャーを追加し、`npm run test:integration` のようなスクリプトから起動してください。

### 実際にVS Code上で動かして確認する（F5デバッグ）

自動テストではUIやClaude Codeとの実連携までは検証できないため、最終的には実際にVS Code上で動かして確認してください。

1. このリポジトリのフォルダをVS Codeで開く（`code .`）
2. 初回のみ `npm install` を実行（未実施の場合）
3. **F5** を押す（または「実行とデバッグ」パネルから `Run Extension` を選択）
   - `.vscode/launch.json` の `Run Extension` 構成が、ビルド用タスク `.vscode/tasks.json`（`npm run watch`、esbuildのウォッチビルド）を自動的に先に実行し、完了を待ってから新しいVS Codeウィンドウ（Extension Development Host）を起動します
   - 以降 `src/` や `resources/` を編集して保存すると、そのウィンドウでウィンドウリロード（`Ctrl+R` / `Cmd+R`）するだけで変更が反映されます
4. 開いた新しいウィンドウのステータスバー右側に `$(circle-slash) 5h N/A` / `$(circle-slash) 7d N/A`（未セットアップ状態）が表示されていることを確認する
5. コマンドパレットから `Usage Bar: Setup Claude Code Bridge` を実行し、実際にClaude Codeセッションを動かして、数値が追従するかを確認する
   - すぐに試したい場合は、ブリッジを経由せず共有ファイルを直接書き換えても動作確認できます:
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

最終的な動作確認は、実際のVS Code + 実際のClaude Codeセッションを動かしながら数値が追従するかを手動で確認することを推奨します。

---

## 商標について

「Claude」「Anthropic」はAnthropic, PBCの商標です。本拡張機能は非公式のコミュニティツールであり、Anthropicによる承認・提携を受けたものではありません。拡張機能名・アイコンとも公式のClaude/Anthropicブランドを流用しないようにしています。

## アイコンについて

`package.json` に `icon` フィールドは設定していません（`icon.png` は未作成）。Marketplace公開前に、商標に配慮した独自の128x128アイコンを用意し `icon.png` として追加のうえ `package.json` に `"icon": "icon.png"` を設定してください。`resources/icons/` も同様の理由で未使用です（ステータスバー表示はVS Code標準のcodicon `$(clock)` / `$(calendar)` / `$(warning)` / `$(circle-slash)` のみで構成しています）。

## ライセンス

MIT. `LICENSE` を参照してください。
