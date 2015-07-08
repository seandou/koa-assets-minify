
/**
 * Module dependencies.
 */

var resolve = require('path').resolve;
var assert = require('assert');
var debug = require('debug')('koa-static');
var send = require('koa-send');

module.exports = function(root, opts) {
  opts = opts || {};

  assert(root, 'root directory is required to serve files');

  // options
  debug('static "%s" %j', root, opts);
  opts.root = resolve(root);
  opts.index = opts.index || 'index.html';

  return function *serve(next) {
    // yield (function() {
    //   return function (done) {
    //     setTimeout(done, 2000)
    //   }
    // })();

    // yield next;

    if (this.method == 'HEAD' || this.method == 'GET') {
      if (yield send(this, this.path, opts)) return;
    }
    
    yield* next;
  };
}
