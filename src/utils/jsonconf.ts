import * as fs from 'fs';
import * as path from 'path';

export const jsonconf=(repoPath: string): boolean  =>{
  let returnJudge:boolean = true;

  if (!repoPath) {
    console.error('path error');
    process.exit(1);
  }

  const packageJsonPath = findPackageJson(repoPath);
  if (packageJsonPath) {
    const testStatus = checkTestScript(packageJsonPath);
    if (testStatus === 'standard') {
      console.log('code style:' + packageJsonPath);
      returnJudge = false;
    } else if (testStatus === 'client') {
      console.log('client test' + packageJsonPath);
    } else if (testStatus === 'no test') {
      console.log('no test' + packageJsonPath);
      returnJudge = false;
    }
  } else {
    console.log('no package.json');
    returnJudge = false;
  }
  return returnJudge;
}

const findPackageJson=(dir: string): string | null =>{
  const filePath = path.join(dir, 'package.json');
  if(fs.existsSync(filePath)) {
    return filePath;
  }
  const parentDir = path.dirname(dir);
  if(parentDir === dir) {
    return null;
  }
  return findPackageJson(parentDir);
}

const checkTestScript=(packageJsonPath: string): string | false =>{
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  if(packageJson.scripts && packageJson.scripts.test) {
    const testScript = packageJson.scripts.test.toLowerCase();
    if(testScript.includes('standard') || testScript.includes('eslint')) {
      return 'standard';
    }
    if(testScript.includes('no test')) {
      return 'no test';
    }
    return 'client';
  }
  return 'no test';
}