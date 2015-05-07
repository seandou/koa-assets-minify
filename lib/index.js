module.exports = function(opts) {
  var options = opts || {};

  return function *assets(next) {
    yield *next;
  }

};