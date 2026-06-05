import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const SANDBOX_DIR = path.resolve(__dirname, '../sandbox');
const SCRIPT_PATH = path.join(SANDBOX_DIR, '_test_script.js');

/**
 * スクリプト文字列を sandbox で実行し、成否と stderr を返す。
 * タイムアウトは 10 秒。
 */
export function runScript(script: string): { passed: boolean; error?: string } {
  fs.writeFileSync(SCRIPT_PATH, script, 'utf-8');
  try {
    execSync(`node ${SCRIPT_PATH}`, {
      cwd: SANDBOX_DIR,
      timeout: 10_000,
      stdio: 'pipe'
    });
    return { passed: true };
  } catch (e: unknown) {
    const err = e as { stderr?: Buffer; message?: string };
    return {
      passed: false,
      error: err.stderr?.toString().trim() || err.message || 'unknown error'
    };
  } finally {
    if (fs.existsSync(SCRIPT_PATH)) fs.unlinkSync(SCRIPT_PATH);
  }
}
