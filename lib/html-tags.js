var _ = require('lodash');

/**
 * turn assets paths to html tags
 * 
 * @param {Object} assets
 */
module.exports = function(assets, baseUrl) {
  var htmlTags = {
    js: {},
    css: {}
  };

  _.forEach(assets.js, function(jsAssets, group) {
    if (typeof jsAssets == 'string') {
      htmlTags.js[group] = '<script src="' + baseUrl + jsAssets + '"></script>';
    } else if (Array.isArray(jsAssets)) {
      var items = [];
      _.forEach(jsAssets, function(item) {
        items.push('<script src="' + baseUrl + item + '"></script>');
      });
      htmlTags.js[group] = items.join("\n    ");
    }
  });

  _.forEach(assets.css, function(cssAssets, group) {
    if (typeof cssAssets == 'string') {
      htmlTags.css[group] = '<link type="text/css" rel="stylesheet" href="' + baseUrl + cssAssets + '" media="all" />';
    } else if (Array.isArray(cssAssets)) {
      var items = [];
      _.forEach(cssAssets, function(item) {
        items.push('<link type="text/css" rel="stylesheet" href="' + baseUrl + item + '" media="all" />');
      });
      htmlTags.css[group] = items.join("\n    ");
    }
  });

  return htmlTags;
};