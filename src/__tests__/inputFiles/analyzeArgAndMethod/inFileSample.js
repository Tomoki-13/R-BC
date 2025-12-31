// 8.0.0の例
var globby = require('globby')
function detectRepoTestFiles(dir, options) {
    options = Object.assign({
        cwd: dir,
        ignore: 'node_modules/**',  // Ignore node_modules
        nodir: true,                // Only return files
        nocase: true,               // Case insensitive
        silent: true,               // Do not print warnings
        strict: false,              // Do not crash on the first error
    }, options);

    return globby([
        '**/{test,spec}?(s)/**/*',            // Conventional test dirs (including deep)
        '**/*[._-]{test,spec}?(s).*',         // Suffix-style test files (foo-test.*, foo.test.*, foo_test.*)
        '**/{test,spec}?(s).*',               // Conventional root test files
        '**/_?(_){test,spec}?(s)?(_)_/**/*',  // React/Jest style test files
    ], options)
    .then((files) => files.map((file) => path.join(dir, file)));
}