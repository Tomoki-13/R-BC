import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const SANDBOX_DIR = path.resolve(__dirname, '../sandbox');

/**
 * sandbox に指定バージョンのライブラリをインストールする。
 * sandbox/package.json を書き換えて npm install を実行する。
 */
export function installVersion(libName: string, version: string): void {
  const pkgPath = path.join(SANDBOX_DIR, 'package.json');
  const pkg = {
    name: 'rbc-sandbox',
    version: '0.1.0',
    private: true,
    dependencies: { [libName]: version }
  };
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
  console.log(`  [install] ${libName}@${version}`);
  execSync('npm install --prefer-offline --no-audit --no-fund', {
    cwd: SANDBOX_DIR,
    stdio: 'pipe'
  });
}

/**
 * sandbox にインストール済みのライブラリバージョンを返す。
 * インストール前または取得失敗時は null を返す。
 */
export function getInstalledVersion(libName: string): string | null {
  try {
    const pkgPath = path.join(SANDBOX_DIR, 'node_modules', libName, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    return pkg.version ?? null;
  } catch {
    return null;
  }
}
