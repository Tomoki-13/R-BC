import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
//TODO: ディレクトリ分けして整理する

// .envファイルの読み込み（存在しない場合は無視）
dotenv.config();

export interface TargetUpdate {
  nameWithOwner: string;
  oldVersion: string;
  newVersion: string;
}

// 統計情報記録用のインターフェース
interface CloneStats {
  library: string;
  repository: string;
  oldVersion: string;
  newVersion: string;
  failureCount: number;
  successCount: number;
}

// 実行環境の設定
const WORK_DIR = process.cwd();
const ALL_REPOS_DIR = path.join(WORK_DIR, '../alldataset_clients');
const JSON_FILE = path.join(WORK_DIR, '../datasets', 'test_result.json');

// トークン設定（.envから取得、なければ空文字にして非公開リポジトリ以外をクローン）
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const USE_GITHUB_TOKEN = GITHUB_TOKEN.length > 0;

// スリープ関数の定義（サーバー負荷軽減・API制限回避用）
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function extractUpdatesFromResults(testResults: any[]): TargetUpdate[] {
  const updatesMap = new Map<string, TargetUpdate>();
  const libClientMap = new Map<string, Map<string, any[]>>();

  // ライブラリ -> クライアント -> テスト結果の階層によるデータ整理
  for (const record of testResults) {
    const lib = record.L__nameWithOwner;
    const client = record.S__nameWithOwner;

    if (!libClientMap.has(lib)) libClientMap.set(lib, new Map());
    const clientMap = libClientMap.get(lib)!;

    if (!clientMap.has(client)) clientMap.set(client, []);
    clientMap.get(client)!.push(record);
  }

  // アップデートペアの自動抽出
  for (const [lib, clientMap] of libClientMap.entries()) {
    for (const [client, records] of clientMap.entries()) {
      const versions = [...new Set(records.map(r => r.L__version))].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
      );

      // 同一クライアントでの2つ以上のバージョン存在確認
      if (versions.length >= 2) {
        // 隣接するバージョンのペア（前後の差が1つ）を確認
        for (let i = 0; i < versions.length - 1; i++) {
          const oldV = versions[i];
          const newV = versions[i + 1];

          // 古い方のバージョンでsuccessとなっているレコードが存在するか確認
          const hasOldSuccess = records.some(r => r.L__version === oldV && r.state === 'success');

          if (hasOldSuccess) {
            const key = `${lib}_${oldV}_${newV}`;
            if (!updatesMap.has(key)) {
              updatesMap.set(key, { nameWithOwner: lib, oldVersion: oldV, newVersion: newV });
            }
          }
        }
      }
    }
  }
  return Array.from(updatesMap.values());
}

/**
 * 指定ディレクトリへのリポジトリクローンとチェックアウトの実行
 */
async function cloneRepos(repos: any[], targetDir: string) {
  if (repos.length === 0) return;

  for (const repo of repos) {
    const nameWithOwner = repo.S__nameWithOwner;
    const commitId = repo.S__commit_id;
    const cloneTargetDir = path.join(targetDir, nameWithOwner);
    const ownerDir = path.join(targetDir, nameWithOwner.split('/')[0]);

    // クローン先にディレクトリが存在し、かつ空でない場合はスキップ
    if (fs.existsSync(cloneTargetDir) && fs.readdirSync(cloneTargetDir).length > 0) {
      console.log(`Directory ${cloneTargetDir} is not empty. Skipping clone for ${nameWithOwner}.`);
      continue;
    }

    console.log(`Cloning ${nameWithOwner} into ${targetDir}...`);

    // クローンURLの切り替え
    const cloneUrl = USE_GITHUB_TOKEN
      ? `https://x-access-token:${GITHUB_TOKEN}@github.com/${nameWithOwner}.git`
      : `https://github.com/${nameWithOwner}.git`;

    try {
      if (!fs.existsSync(ownerDir)) {
        fs.mkdirSync(ownerDir, { recursive: true });
      }

      execSync(`git clone ${cloneUrl} "${cloneTargetDir}"`, { stdio: 'ignore' });

      const repoPath = path.join(targetDir, nameWithOwner);
      if (fs.existsSync(path.join(repoPath, 'package-lock.json'))) {
        fs.rmSync(path.join(repoPath, 'package-lock.json'), { force: true });
      }
      if (fs.existsSync(path.join(repoPath, 'node_modules'))) {
        fs.rmSync(path.join(repoPath, 'node_modules'), { recursive: true, force: true });
      }

      console.log(`Checking out commit ${commitId} ...`);
      execSync(`git checkout ${commitId}`, { stdio: 'ignore', cwd: repoPath });
      execSync(`git clean -fdx`, { stdio: 'ignore', cwd: repoPath });

      console.log(`Successfully checked out ${nameWithOwner}.`);
    } catch (error) {
      console.error(`ERROR: Failed to clone or checkout ${nameWithOwner}.`);
      if (fs.existsSync(cloneTargetDir)) {
        fs.rmSync(cloneTargetDir, { recursive: true, force: true });
      }
    }

    await sleep(2000);
  }
}

(async () => {
  if (!fs.existsSync(JSON_FILE)) {
    console.error(`Error: ${JSON_FILE} not found.`);
    return;
  }

  const rawData = fs.readFileSync(JSON_FILE, 'utf-8');
  const testResults: any[] = JSON.parse(rawData);

  let targetUpdates = extractUpdatesFromResults(testResults);

  console.log(`Targets found: ${targetUpdates.length}`);

  if (targetUpdates.length === 0) {
    console.log("No valid updates found.");
    return;
  }

  // 出力先ルートディレクトリの作成
  if (!fs.existsSync(ALL_REPOS_DIR)) {
    fs.mkdirSync(ALL_REPOS_DIR, { recursive: true });
  }

  // CSV出力用データの配列
  const cloneStatsList: CloneStats[] = [];
  const excludedStatsList: (CloneStats & { id: number })[] = [];
  let excludedIdCounter = 1;

  for (const update of targetUpdates) {
    console.log(`\n--- Processing: ${update.nameWithOwner} (Old: ${update.oldVersion}, New: ${update.newVersion}) ---`);

    const libRecords = testResults.filter(r => r.L__nameWithOwner === update.nameWithOwner);

    // runnerに渡すlibNameとしてのL__npm_pkgの取得
    const libName = libRecords[0].L__npm_pkg;
    const cleanVersion = update.newVersion.replace(/[^a-zA-Z0-9]/g, '');

    // 出力ディレクトリ構成 (alldataset_clients/ライブラリ名/整形済バージョン/状態)
    const updateBaseDir = path.join(ALL_REPOS_DIR, libName, cleanVersion);
    const successDir = path.join(updateBaseDir, 'success');
    const failureDir = path.join(updateBaseDir, 'failure');

    // クライアントごとのグループ化
    const clientsGrouped = new Map<string, any[]>();
    for (const record of libRecords) {
      if (!clientsGrouped.has(record.S__nameWithOwner)) clientsGrouped.set(record.S__nameWithOwner, []);
      clientsGrouped.get(record.S__nameWithOwner)!.push(record);
    }

    const targetFailureRepos = [];
    const targetSuccessRepos = [];

    // 抽出条件: 古いバージョンでテスト成功、かつ新しいバージョンが存在するクライアントの抽出
    for (const [client, records] of clientsGrouped.entries()) {
      const hasOldSuccess = records.some(r => r.L__version === update.oldVersion && r.state === "success");
      const newVersionRecord = records.find(r => r.L__version === update.newVersion);

      if (hasOldSuccess && newVersionRecord) {
        if (newVersionRecord.state === 'failure') {
          targetFailureRepos.push(newVersionRecord);
        } else if (newVersionRecord.state === 'success') {
          targetSuccessRepos.push(newVersionRecord);
        }
      }
    }

    if (targetFailureRepos.length === 0 || targetSuccessRepos.length === 0) {
      console.log(`Skipping clone: Missing required clients for ${libName} ${cleanVersion} (failure: ${targetFailureRepos.length}, success: ${targetSuccessRepos.length}).`);
      excludedStatsList.push({
        id: excludedIdCounter++,
        library: libName,
        repository: update.nameWithOwner,
        oldVersion: update.oldVersion,
        newVersion: update.newVersion,
        failureCount: targetFailureRepos.length,
        successCount: targetSuccessRepos.length
      });
      continue;
    }

    // 両方のクライアントが存在する場合のみディレクトリを作成
    fs.mkdirSync(successDir, { recursive: true });
    fs.mkdirSync(failureDir, { recursive: true });

    await cloneRepos(targetFailureRepos, failureDir);
    await cloneRepos(targetSuccessRepos, successDir);

    // 隠しファイル（.DS_Store等）を除外して実際のクローン成功数をカウント
    const failureCount = fs.existsSync(failureDir) ? fs.readdirSync(failureDir).filter(f => !f.startsWith('.')).reduce((acc, owner) => acc + fs.readdirSync(path.join(failureDir, owner)).filter(f => !f.startsWith('.')).length, 0) : 0;
    const successCount = fs.existsSync(successDir) ? fs.readdirSync(successDir).filter(f => !f.startsWith('.')).reduce((acc, owner) => acc + fs.readdirSync(path.join(successDir, owner)).filter(f => !f.startsWith('.')).length, 0) : 0;

    // クローン失敗に伴う空ディレクトリの削除
    if (failureCount === 0 && fs.existsSync(failureDir)) {
      fs.rmSync(failureDir, { recursive: true, force: true });
    }
    if (successCount === 0 && fs.existsSync(successDir)) {
      fs.rmSync(successDir, { recursive: true, force: true });
    }

    // ネットワークエラー等のクローン失敗により、結果的にどちらかが0件になってしまった場合の事後チェックと削除
    if (failureCount === 0 || successCount === 0) {
      if (fs.existsSync(updateBaseDir)) {
        fs.rmSync(updateBaseDir, { recursive: true, force: true });
      }

      const libDir = path.join(ALL_REPOS_DIR, libName);
      if (fs.existsSync(libDir) && fs.readdirSync(libDir).length === 0) {
        fs.rmSync(libDir, { recursive: true, force: true });
      }

      console.log(`Clone failed for some repositories. Cleaned up ${libName} ${cleanVersion} (failure: ${failureCount}, success: ${successCount}).`);

      excludedStatsList.push({
        id: excludedIdCounter++,
        library: libName,
        repository: update.nameWithOwner,
        oldVersion: update.oldVersion,
        newVersion: update.newVersion,
        failureCount: failureCount,
        successCount: successCount
      });
    } else {
      console.log(`Successfully prepared both failure and success environments for ${libName} ${cleanVersion}.`);

      // 成功したペアの統計データを記録
      cloneStatsList.push({
        library: libName,
        repository: update.nameWithOwner,
        oldVersion: update.oldVersion,
        newVersion: update.newVersion,
        failureCount: failureCount,
        successCount: successCount
      });
    }
  }

  console.log("\nAll clone processes completed.");
  console.log(`Output directory: ${ALL_REPOS_DIR}`);

  // 統計情報のCSV出力
  if (cloneStatsList.length > 0 || excludedStatsList.length > 0) {
    const baseCsvDir = path.join(WORK_DIR, '../output/clonedata');
    const now = new Date();
    const dateStr = now.toISOString().replace(/T/, '_').replace(/:/g, '').split('.')[0];
    const csvDir = path.join(baseCsvDir, dateStr);

    if (!fs.existsSync(csvDir)) {
      fs.mkdirSync(csvDir, { recursive: true });
    }

    // ペア成立分のCSV出力
    if (cloneStatsList.length > 0) {
      const csvPath = path.join(csvDir, 'clone_summary.csv');
      const csvHeader = 'Library,Repository,OldVersion,NewVersion,FailureClientCount,SuccessClientCount\n';
      const csvRows = cloneStatsList.map(stats =>
        `${stats.library},${stats.repository},${stats.oldVersion},${stats.newVersion},${stats.failureCount},${stats.successCount}`
      ).join('\n');

      fs.writeFileSync(csvPath, csvHeader + csvRows, 'utf-8');
      console.log(`\nCSV Report generated: ${csvPath}`);
    }

    // クライアント不足により除外された分のCSV出力
    if (excludedStatsList.length > 0) {
      const excludedCsvPath = path.join(csvDir, 'excluded_summary.csv');
      const excludedCsvHeader = 'ID,Library,Repository,OldVersion,NewVersion,FailureClientCount,SuccessClientCount\n';
      const excludedCsvRows = excludedStatsList.map(stats =>
        `${stats.id},${stats.library},${stats.repository},${stats.oldVersion},${stats.newVersion},${stats.failureCount},${stats.successCount}`
      ).join('\n');

      fs.writeFileSync(excludedCsvPath, excludedCsvHeader + excludedCsvRows, 'utf-8');
      console.log(`Excluded CSV Report generated: ${excludedCsvPath}`);
    }
  } else {
    console.log("\nNo data to generate CSV reports.");
  }
})();