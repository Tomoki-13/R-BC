import fs from "fs";
import { exec } from 'child_process';
import path from 'path';
import { promisify } from 'util';
import * as dotenv from 'dotenv';
import output_json from './output_json';

// .envファイルを読み込む設定
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const execAsync = promisify(exec);
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 指定されたGitHubリポジトリの特定コミットをクローンします。
 * @param repo - クローンするリポジトリ（形式: "user/repo"）
 * @param clone_dir - クローン先ディレクトリのベースパス
 * @param commit - チェックアウトするコミットのハッシュ
 */
export const cloneRepoWithCommit = async (repo: string, clone_dir: string, commit: string): Promise<string | null> => {
  const token = process.env.GITHUB_ACCESS_TOKEN;

  // トークンがある場合は認証情報付きのURLを、ない場合は通常のURLを使用
  const repoUrl = token
    ? `https://x-access-token:${token}@github.com/${repo}.git`
    : `https://github.com/${repo}.git`;

  // user/repo 形式であることを確認し分割
  const match = repo.match(/^([^/]+)\/([^/]+)$/);
  if (!match) {
    console.error(`無効なリポジトリ形式です。'user/repo'の形式で指定してください: ${repo}`);
    return null;
  }

  const userName = match[1];
  const repoName = match[2];

  // ディレクトリ階層: output/user/repo
  const userDir = path.join(clone_dir, userName);
  const repoDir = path.join(userDir, repoName);

  // ユーザーディレクトリがなければ作成
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }

  if (fs.existsSync(repoDir)) {
    console.warn(`指定されたリポジトリのディレクトリは既に存在します: ${repoDir}`);
    return repoDir;
  }

  try {
    const cloneCommand = `git clone ${repoUrl} ${repoDir}`;
    await execAsync(cloneCommand);
    await sleep(1000);

    const checkoutCommand = `git checkout ${commit}`;
    await execAsync(checkoutCommand, { cwd: repoDir });

    console.log(`クローンとチェックアウトが正常に完了しました: ${repo} (commit: ${commit})`);
    return repoDir;

  } catch (error) {
    console.error(`リポジトリのクローンまたはチェックアウト中にエラーが発生しました: ${repo}`, error);
    if (fs.existsSync(repoDir)) {
      fs.rmSync(repoDir, { recursive: true, force: true });
      console.log(`エラーのためディレクトリを削除しました: ${repoDir}`);
    }
    return null;
  }
};