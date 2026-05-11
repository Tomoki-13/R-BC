# r-bc(research backward compatibility)

このプロジェクトは、ライブラリのアップデート前後でのテスト結果をもとに、該当するクライアントリポジトリを自動でクローンし、AST（抽象構文木）を用いて関数・メソッドの利用パターンを抽出・検出するツールです。

## 前提条件 (Prerequisites)

- Node.js (v16以上推奨)
- Git
- TypeScript実行環境 (`ts-node` 等)

## 環境変数の設定

GitHubのAPI制限を回避するため、また非公開リポジトリをクローンするために、GitHubの Personal Access Token (PAT) を設定することを推奨します。

1. プロジェクトルートに `.env` ファイルを作成します。
2. `.env.sample` を参考に、自身のトークンを設定してください。

```env
# .env
# GitHubのPersonal Access Token (PAT) を設定します。
GITHUB_TOKEN=your_github_token_here
```

## ディレクトリ構成

処理を実行すると、以下のようなディレクトリ構成が生成されます。

```text
├── allrepos2/               # クローンされたクライアントリポジトリ群
│    └── [LibraryName]/
│         └── [Version]/
│              ├── failure/  # テストが失敗したリポジトリ
│              └── success/  # テストが成功したリポジトリ
├── datasets/
│    └── test_result.json    # 元となるデータセット
├── output/
│    ├── clonedata/          # クローン結果の集計CSV
│    └── type-method/        # パターン抽出・検出結果 (日付ごとに保存)
├── scripts/
│    ├── clone_clients.ts    # クローン実行用スクリプト
│    └── index_advance.ts    # パターン抽出・検出実行用スクリプト

```

## 実行手順

全体の処理は大きく分けて **「1. リポジトリのクローン」** と **「2. パターンの抽出・検出」** の2ステップに分かれています。

### Step 1. 対象リポジトリの自動クローン

`test_result.json` を読み込み、アップデートの前後で比較可能なクライアント（古いバージョンで成功し、新しいバージョンが存在するもの）を `allrepos2/` 配下にクローンします。

**実行コマンド:**

```bash
npx ts-node scripts/clone_clients.ts

```

* **処理内容:**
* 条件を満たすペアを抽出し、`success` / `failure` のディレクトリに分けてクローンします。
* 軽量化のため、クローン後に `package-lock.json` や `node_modules` を削除し、指定のコミットIDへチェックアウトします。
* GitHubへの負荷軽減のため、クローンごとに数秒のインターバル（sleep）を挟みます。
* どちらかのクライアントが存在しなかった無効なペアは自動的に削除されます。


* **出力結果:**
* クローンが完了すると、`output/clonedata/` 配下に結果をまとめたCSVファイル（成立したペアと、除外されたペアの2種類）が出力されます。


### Step 2. パターン生成と検出の実行

クローンされたリポジトリのソースコードをAST解析し、関数の利用パターンの抽出と、他リポジトリでの利用パターンのマッチング（検出）を行います。

**実行コマンド:**

```bash
npx ts-node scripts/index_advance.ts

```

* **処理内容:**
* `test_result.json` から再度対象ライブラリとバージョンを読み解き、`allrepos2/` 内の `failure` ディレクトリから「どう使われているか」の利用パターン（AST）を作成します (`createPattern`)。
* そのパターンを元に、`success` ディレクトリのリポジトリに対してパターンの検出（マッチング）を行います (`support_detectByPattern`)。


* **出力結果:**
* `output/type-method/[日付]/[ライブラリ名_バージョン]/` 配下に JSON 形式で抽出パターンとマッチ結果が出力されます。



## 出力データの見方

* **`output/clonedata/clone_summary_YYYYMMDD_HHMMSS.csv`**:
正常にクローンでき、ペアとして成立したライブラリ、バージョン、およびそれぞれのクライアント数を確認できます。
* **`output/clonedata/excluded_summary_YYYYMMDD_HHMMSS.csv`**:
クローンできなかった、または条件に満たず除外されたライブラリとバージョンのリストです。
* **`output/type-method/.../matchResults.json`**:
どのクライアントでどのパターンが何回出現したかの詳細なAST解析結果です。


### ポイント
* 実行コマンドのパス（`scripts/clone_clients.ts`など）は、実際のプロジェクトのファイル配置場所に合わせて適宜書き換えてください。
* 開発用（uuid絞り込み）のコメントアウトについても触れており、今後全データを回す際につまずかないように配慮しています。
* `.env.sample` の説明も `README.md` に直接組み込んであります。
### 安定版の提供
scripts/clone_dataset.sh -> src/setup.ts -> index_full_method.ts　の順で実行してください！
コミットID:46cafe749faebdbc6a76988246a1d6282d79f052
