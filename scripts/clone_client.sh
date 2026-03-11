#!/bin/bash
# 配列で管理するライブラリ名とバージョン
# 形式: "ライブラリ名 古いバージョン 新しいバージョン"
LIBRARIES=(
    "kelektiv/node-uuid 7.0.3 8.0.0-beta.0"
    "kelektiv/node-uuid 3.4.0 7.0.0-beta.0"
    "sindresorhus/globby 8.0.0 8.0.1"
    "sindresorhus/meow 3.6.0 4.0.0"
    "sindresorhus/globby 6.1.0 7.0.0"
    "mafintosh/pump 1.0.3 2.0.0"
    "sindresorhus/globby 7.1.1 8.0.0"
    "gulpjs/vinyl 1.2.0 2.0.0"
)

# トークンを使用するかどうか
#   false : 公開リポジトリのみ（トークン不要）
#   true  : うまく行かない場合（.env に GITHUB_TOKEN が必要）
USE_GITHUB_TOKEN=false

# WORK_DIR=に作業ディレクトリのフルパスを設定してください
WORK_DIR=""

# クローンしたリポジトリを格納するディレクトリ
ALL_REPOS_DIR="$WORK_DIR/allrepos"

# クローン対象リポジトリ情報を記録した JSON ファイル
JSON_FILE="$WORK_DIR/datasets/test_result.json"

# allrepos ディレクトリが存在する場合は処理を中断
if [ -d "$ALL_REPOS_DIR" ]; then
  echo "Error: Directory '$ALL_REPOS_DIR' already exists. Aborting."
  exit 1
else
  echo "Directory '$ALL_REPOS_DIR' not found. Creating..."
  mkdir -p "$ALL_REPOS_DIR"
  echo "Directory created."
fi

ENV_FILE="$WORK_DIR/.env"

if [ -f "$ENV_FILE" ]; then
  echo "Loading environment variables from $ENV_FILE..."
  set -a
  source "$ENV_FILE"
  set +a
else
  echo "Warning: .env file not found."
  echo "     (This is fine if only using public repositories.)"
fi

# USE_GITHUB_TOKEN=true なのに GITHUB_TOKEN が未設定の場合は即終了
if [ "$USE_GITHUB_TOKEN" = true ] && [ -z "$GITHUB_TOKEN" ]; then
  echo "Error: USE_GITHUB_TOKEN is true but GITHUB_TOKEN is not set."
  echo "     Please add GITHUB_TOKEN=xxxxx to your .env file."
  exit 1
fi

cd "$WORK_DIR" || exit 1

for entry in "${LIBRARIES[@]}"; do
  read -r LIBRARY_NAME OLD_VERSION NEW_VERSION <<< "$entry"
 echo "--- Processing: $LIBRARY_NAME (Old: $OLD_VERSION, New: $NEW_VERSION) ---"

  LIBRARY_SHORT_NAME=$(echo "$LIBRARY_NAME" | cut -d'/' -f2)
  CLEAN_NEW_VERSION=$(echo "$NEW_VERSION" | sed 's/[^a-zA-Z0-9]//g')

  SUCCESS_DIR="repos_${LIBRARY_SHORT_NAME}_${CLEAN_NEW_VERSION}_success"
  FAILURE_DIR="repos_${LIBRARY_SHORT_NAME}_${CLEAN_NEW_VERSION}_failure"

  cd "$ALL_REPOS_DIR" || exit 1

  # 既にクローン済みの場合はスキップ
  if [ -d "$SUCCESS_DIR" ] || [ -d "$FAILURE_DIR" ]; then
      echo "Warning: Directories already exist. Skipping."
      continue
  fi

  mkdir -p "$SUCCESS_DIR"
  mkdir -p "$FAILURE_DIR"

  # jq を使って JSON から対象リポジトリ情報を抽出
  REPOS_DATA=$(jq -c --arg lib "$LIBRARY_NAME" --arg old_v "$OLD_VERSION" --arg new_v "$NEW_VERSION" '
    [ .[] | select(.L__nameWithOwner == $lib) ]
    | group_by(.S__nameWithOwner)
    | map(
        (
          (map(select(.L__version == $old_v and .state == "success")) | length > 0) and
          (map(select(.L__version == $new_v)) | length > 0)
        ) as $is_target
        | if $is_target then 
          map(select(.L__version == $new_v)) | .[0]
        else 
          empty 
        end
    )
    | .[]
  ' "$JSON_FILE")

  # 対象が見つからない場合
  if [ -z "$REPOS_DATA" ]; then
    echo "Warning: No repositories found matching the criteria."
    rmdir "$SUCCESS_DIR" "$FAILURE_DIR" 2>/dev/null
    continue
  fi

  # 状態別に分割
  FAILED_REPOS=$(echo "$REPOS_DATA" | jq -c 'select(.state == "failure")')
  SUCCESS_REPOS=$(echo "$REPOS_DATA" | jq -c 'select(.state == "success")')

  # リポジトリをクローンする関数
  clone_repos() {
    local repos_json=$1
    local target_dir=$2
    
    if [ -z "$repos_json" ]; then
      echo "No repositories to clone for $target_dir."
      rmdir "$ALL_REPOS_DIR/$target_dir" 2>/dev/null
      return
    fi

    cd "$ALL_REPOS_DIR/$target_dir" || return

    echo "$repos_json" | jq -r '"\(.S__nameWithOwner) \(.S__commit_id)"' | while read -r nameWithOwner commitId; do
      
      echo "Cloning $nameWithOwner into $target_dir..."

      # --- クローンURLを切り替え ---
      if [ "$USE_GITHUB_TOKEN" = true ]; then
        CLONE_URL="https://x-access-token:$GITHUB_TOKEN@github.com/$nameWithOwner.git"
      else
        CLONE_URL="https://github.com/$nameWithOwner.git"
      fi
      
      if git clone "$CLONE_URL" "$nameWithOwner"; then
        cd "$nameWithOwner" || continue
        echo "Checking out commit $commitId ..."
        
        # node_modules や lock ファイルを削除（軽量化と衝突防止）
        [ -f "package-lock.json" ] && rm -f package-lock.json
        [ -d "node_modules" ] && rm -rf node_modules

        if git checkout "$commitId"; then
          git clean -fdx
          echo "Successfully checked out $nameWithOwner."
        else
          echo "Failed to checkout commit $commitId for $nameWithOwner."
          cd ..
          rm -rf "$nameWithOwner"
        fi
        # 元のディレクトリに戻る
        cd "$ALL_REPOS_DIR/$target_dir" || exit 1
      else
        echo "ERROR: Failed to clone $nameWithOwner. Repository may be private or deleted."
      fi
    done
  }

  # 成功・失敗状態ごとにクローン
  clone_repos "$FAILED_REPOS" "$FAILURE_DIR"
  clone_repos "$SUCCESS_REPOS" "$SUCCESS_DIR"

  echo "Cloning and checkout completed for $LIBRARY_NAME $NEW_VERSION."
done

echo "All processes completed."
echo "Output directory: $ALL_REPOS_DIR"