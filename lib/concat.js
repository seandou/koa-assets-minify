/**
 * concat multi files to one
 *
 * @param {Array} files
 * @param {String} destination
 * @param {Function} cb
 */

module.exports = function concat(files, destination, cb) {
  var async = require('async');

  async.waterfall([
    async.apply(read, files),
    async.apply(write, destination)
  ], cb);
};

var write = function(destination, buffers, cb) {
  require('fs')
    .writeFile(
      destination,
      Buffer.concat(buffers),
      cb
    );
};

var read = function(files, cb) {
  require('async')
    .mapSeries(
      files,
      readFile,
      cb
  );

  function readFile(file, cb) {
    require('fs')
      .readFile(file, cb)
  }
};