var path = require('path');
var fs = require('fs');
var koaStatic = require('koa-static');
var compressAssets = require('./compress');
var htmlTags = require('./html-tags');

/**
 * serve assets and compress js/css
 *
 * @param {Object} server    koa app object
 * @param {String} rootPath  root path of your web app
 * @param {Object} options   koa-assets-minify module options
 */
module.exports = function assetsMinify(server, rootPath, options) {
  // complete options
  var defaults = {
    assetsPath: 'assets',
    tempPath: 'tmp',
    maxBuffer: 2000 * 1024,
    maxAge: 24* 3600 * 1000,
    baseUrl: '',
    
    compression: false,
    js: {},
    css: {}
  };

  options = options || defaults;
  options.assetsPath = options.assetsPath || defaults.assetsPath;
  options.tempPath = options.tempPath || defaults.tempPath;
  options.maxBuffer = options.maxBuffer || defaults.maxBuffer;
  options.maxAge = options.maxAge || defaults.maxAge;
  options.baseUrl = options.baseUrl || defaults.baseUrl;

  // use koa static to serve the assets
  var assetsPath = path.join(rootPath, options.assetsPath);
  var tempAssetsPath = path.join(rootPath, options.tempPath, 'assets');

  server.use(koaStatic(tempAssetsPath, { maxage: options.maxAge }));

  if (!options.compression) {
    server.use(koaStatic(assetsPath, { maxage: options.maxAge }));
  }  

  // compress assets
  if (options.compression) {
    compressAssets(rootPath, options);
  }

  // set assets which will be used in views
  server.use(function* (next) {
    var ctx = this.state;
    var assets = {
      js: {},
      css: {}
    };

    if (options.compression) {
      var tempAssetsJson = path.join(rootPath, options.tempPath, 'assets.json');
      if (fs.existsSync(tempAssetsJson)) {
        // read assets.json
        assets = JSON.parse(fs.readFileSync(tempAssetsJson, 'utf8'));
      }
    } else {
      assets.js = options.js;
      assets.css = options.css;
    }

    ctx.assets = htmlTags(assets, options.baseUrl);

    yield next;
  });
};