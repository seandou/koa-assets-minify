var path = require('path');
var fs = require('fs');
var koaStatic = require('./koa-static');
var Compressor = require('./compressor');
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
  options.rootPath = rootPath;

  var compressor = new Compressor(options);

  if (options.compression) {
    server.use(compressor.assets());

    compressor.prepare(function() {
      compressor.run(function(err) {
        if (err) {
          console.trace(err);
        }

        console.log('Assets compression finished!');
      });
    });
  } else {
    server.use(koaStatic(assetsPath, { maxage: options.maxAge }));
  }

  // set assets which will be used in views
  server.use(function* (next) {
    var ctx = this.state;
    var assets;

    if (options.compression) {
      assets = yield compressor.loadAssetsJsonFile();
    } else {
      assets.js = options.js;
      assets.css = options.css;
    }

    ctx.assets = htmlTags(assets, options.baseUrl);

    yield next;
  });
};