var path = require('path');
var fs = require('fs');
var crypto = require('crypto');
var _ = require('lodash');
var mkdirp = require('mkdirp');
var del = require('del');
var exec = require('child_process').exec;

var concat = require('./concat');

/**
 * compress assets with uglifyjs/cleancss
 *
 * @param {String} rootPath  root path of your web app
 * @param {Object} options   koa-assets-minify module options
 */
module.exports = function compressAssets(rootPath, options) {
  var npmBinPath = path.join(path.dirname(__dirname), 'node_modules', '.bin');
  var uglifyBin = path.join(npmBinPath, 'uglifyjs');
  var cleancssBin = path.join(npmBinPath, 'cleancss');

  var assetsPath = path.join(rootPath, options.assetsPath);
  var tempAssetsPath = path.join(rootPath, options.tempPath, 'assets');

  // prepare directories
  mkdirp.sync(path.join(tempAssetsPath, 'js'));
  mkdirp.sync(path.join(tempAssetsPath, 'css'));
  del.sync(path.join(tempAssetsPath, 'js', '*.js'));
  del.sync(path.join(tempAssetsPath, 'css', '*.css'));  

  // temp assets data which is stored in {tempPath}/assets.json
  var assetsJson = {
    js: {},
    css: {}
  };

  var tasks = [];
  // js
  _.forEach(options.js, function(jsAssets, group) {
    tasks.push(function(cb) {
      var hash = crypto.randomBytes(8).toString('hex');
      var minifiedJs = 'js/' + group + '-' + hash + '.js';
      assetsJson.js[group] = minifiedJs;

      var inputFiles = completePaths(jsAssets, assetsPath);
      var outputFile = path.join(tempAssetsPath, minifiedJs);

      var cmd = [
        uglifyBin,
        inputFiles.join(' '),
        '-o ' + outputFile
      ].join(' ');

      exec(cmd, {maxBuffer: options.maxBuffer}, function(err, stdout, stderr) {
        cb(err);
      });
    });
  });

  // css
  _.forEach(options.css, function(cssAssets, group) {
    tasks.push(function(cb) {
      var hash = crypto.randomBytes(8).toString('hex');
      var minifiedCss = 'css/' + group + '-' + hash + '.css';
      assetsJson.css[group] = minifiedCss;

      var inputFiles = completePaths(cssAssets, assetsPath);
      var outputFile = path.join(tempAssetsPath, minifiedCss);

      concat(inputFiles, outputFile, function() {
        var cmd = [
          cleancssBin,
          outputFile,
          '-o ' + outputFile
        ].join(' ');

        exec(cmd, {maxBuffer: options.maxBuffer}, function(err, stdout, stderr) {
          cb(err);
        });
      });

    });
  });

  // run tasks and store assets json data
  require('async').parallel(tasks, function(err) {
    if (err) {
      console.error(err);
    }
    
    var tempAssetsJson = path.join(rootPath, options.tempPath, 'assets.json');
    fs.writeFileSync(tempAssetsJson, JSON.stringify(assetsJson), 'utf8');
  });
};

/**
 * complete relative paths to full paths
 *
 * @param {Array} paths
 * @param {String} base
 */
var completePaths = function(paths, base) {
  var newPaths = [];

  if (!Array.isArray(paths)) {
    return newPaths;
  }

  paths.forEach(function(p) {
    newPaths.push(path.join(base, p));
  });

  return newPaths;
};