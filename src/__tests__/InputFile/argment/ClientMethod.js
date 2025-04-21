//クライアントが定義した関数の引数が入る場合
var globby = require('globby');

function handlePaths(files, excludePatterns, globOptions) {
    // convert pinkie-promise to Bluebird promise
    files = Promise.resolve(globby(files.concat(excludePatterns), globOptions));
}
module.exports = (args) => {
  debug('args: %o', args)
  const filenames = globby.sync(args)
  debug('filenames: %o', filenames)
  return filenames.map((filename) => {
    const config = require(path.resolve(filename))
    config.filename = filename
    config.id = config.id || filename
    return config
  })
}

async function annotatedFiles(
  { dirPath } /* : Options */
) /* : Promise<string[]> */ {
  const jsFiles = await globby(['**/*.{mjs,js,jsx}'], {
    cwd: dirPath,
    dot: false,
    ignore,
    nodir: true,
  });
  const result = [];
  for (const jsFile of jsFiles) {
    const contents = await promisify(readFile)(
      path.join(dirPath, jsFile),
      'utf8'
    );
    if (FLOW_REGEXP.test(contents)) {
      result.push(jsFile);
    }
  }
  return result;
}

function getFiles (glob, globOpts = {}) {
  const opts = Object.assign({
    nodir: true
  }, globOpts);
  return globby(glob, opts);
}