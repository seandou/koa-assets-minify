var _ = require('lodash');

/**
 * turn assets paths to html tags
 * 
 * @param {Object} assets
 */
module.exports = function(assets) {
  var htmlTags = {
    js: {},
    css: {}
  };

  _.forEach(assets.js, function(jsAssets, group) {
    if (typeof jsAssets == 'string') {
      htmlTags.js[group] = '<script src="' + jsAssets + '"></script>';
    } else if (Array.isArray(jsAssets)) {
      var items = [];
      _.forEach(jsAssets, function(item) {
        items.push('<script src="' + item + '"></script>');
      });
      htmlTags.js[group] = items.join("\n    ");
    }
  });

  _.forEach(assets.css, function(cssAssets, group) {
    if (typeof cssAssets == 'string') {
      htmlTags.css[group] = '<link rel="stylesheet" href="' + cssAssets + '" media="all" />';
    } else if (Array.isArray(cssAssets)) {
      var items = [];
      _.forEach(cssAssets, function(item) {
        items.push('<link rel="stylesheet" href="' + item + '" media="all" />');
      });
      htmlTags.css[group] = items.join("\n    ");
    }
  });

  return htmlTags;
};