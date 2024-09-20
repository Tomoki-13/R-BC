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
            //console.log('code style:' + packageJsonPath);
            returnJudge = false;
        } else if (testStatus === 'client') {
            //console.log('client test' + packageJsonPath);
        } else if (testStatus === 'no test') {
            //console.log('no test' + packageJsonPath);
            returnJudge = false;
        } else if(testStatus === 'no scripts'){
            //console.log('no script' + packageJsonPath);
            returnJudge = false;
        }
    } else {
        //console.log('no package.json');
        returnJudge = false;
    }
    return returnJudge;
}

export const jsonconfStr =(repoPath: string): string  =>{

    if (!repoPath) {
        console.error('path error');
        process.exit(1);
    }

    const packageJsonPath = findPackageJson(repoPath);
    if (packageJsonPath) {
        const testStatus = checkTestScript(packageJsonPath);
        if(testStatus){
            return testStatus;
        }
    } else {
        //console.log('no package.json');
        return 'noPackage.json';
    }
    return 'noPackage.json';
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

const checkTestScript=(packageJsonPath: string): string|undefined=>{
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    if(packageJson.scripts && packageJson.scripts.test) {
        const testScript = packageJson.scripts.test.toLowerCase();
        //console.log('testScript:'+testScript);
        if(!testScript.includes('&&') && (testScript.includes('standard') || testScript.includes('eslint'))) {
            //console.log('testScript:'+testScript);
            return 'standard';
        }
        if(testScript.includes('no test')) {
            //console.log('testScript:'+testScript);
            return 'no test';
        }
        return 'client';
    }else{
        //console.log('testScript:');
        return 'no scripts';
    }
}