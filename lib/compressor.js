var path = require('path');
var fs = require('fs');
var crypto = require('crypto');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var exec = require('child_process').exec;

var _ = require('lodash');
var mkdirp = require('mkdirp');
var del = require('del');
var send = require('koa-send');

var concat = require('./concat');
var md5 = require('./md5file');

var Compressor = function(options) {
  this.assetsPath = path.join(options.rootPath, options.assetsPath);
  this.tempAssetsPath = path.join(options.rootPath, options.tempPath, 'assets');
  this.tempAssetsJson = path.join(options.rootPath, options.tempPath, 'assets.json');

  this.compression = options.compression;
  this.maxAge = options.maxAge;
  this.maxBuffer = options.maxBuffer;

  this.jsGroupAssets = options.js;
  this.cssGroupAssets = options.css;

  this.assetsJson = {};
  this.assetsJsonMTime = 0;
  this.statusNum = {
    'init': 0,
    'prepared': 1,
    'processing': 2,
    'finished': 3
  };

  this.init();
};

util.inherits(Compressor, EventEmitter);

Compressor.prototype.init = function(status) {
  this.setStatus('init');

  mkdirp.sync(path.join(this.tempAssetsPath, 'js'));
  mkdirp.sync(path.join(this.tempAssetsPath, 'css'));
};

Compressor.prototype.setStatus = function(status) {
  this.status = status;
  this.emit(status);
};

Compressor.prototype.getStatusNum = function() {
  return this.statusNum[this.status];
};

Compressor.prototype.prepare = function(done) {
  var self = this;
  var tasks = [];
  var filesHash = {};

  var getFileHash = function(file) {
    return function(cb) {
      if (filesHash[file]) return cb(null);
      
      md5(path.join(self.assetsPath, file), function(hash) {
        filesHash[file] = hash;
        cb(null);
      });
    };
  };

  _.forEach(this.jsGroupAssets, function(jsAssets) {
    _.forEach(jsAssets, function(file) {
      tasks.push(getFileHash(file));
    });
  });

  _.forEach(this.cssGroupAssets, function(cssAssets) {
    _.forEach(cssAssets, function(file) {
      tasks.push(getFileHash(file));
    });
  });

  require('async').parallel(tasks, function() {
    self.buildAssetsJsonFile(filesHash);
    self.setStatus('prepared');
    done();
  });
};

Compressor.prototype.loadAssetsJsonFile = function* () {
  var self = this;

  yield (function() {
    return function (done) {
      if (self.getStatusNum() == 0) {
        self.on('prepared', done);
      } else {
        done();        
      }        
    }
  })();

  if (!fs.existsSync(this.tempAssetsJson)) {
    return self.assetsJson;
  }

  var stat = fs.statSync(this.tempAssetsJson);
  if (stat.mtime != self.assetsJsonMTime) {
    self.assetsJson = JSON.parse(fs.readFileSync(this.tempAssetsJson, 'utf8'));
    self.assetsJsonMTime = stat.mtime;
  }

  return self.assetsJson;
};

Compressor.prototype.buildAssetsJsonFile = function(filesHash) {
  var assetsJson = {
    js: {},
    css: {}
  };

  var assetsHash = function(assets) {
    var arr = [];

    _.forEach(assets, function(file) {
      if (filesHash[file]) {
        arr.push(filesHash[file]);
      }
    });

    return crypto.createHash('md5').update(arr.join('-')).digest('hex');
  };

  _.forEach(this.jsGroupAssets, function(jsAssets, group) {
    assetsJson.js[group] = 'js/' + group + '-' + assetsHash(jsAssets) + '.js';
  });

  _.forEach(this.cssGroupAssets, function(cssAssets, group) {
    assetsJson.css[group] = 'css/' + group + '-' + assetsHash(cssAssets) + '.css';
  });

  this.assetsJson = assetsJson;

  fs.writeFileSync(this.tempAssetsJson, JSON.stringify(assetsJson), 'utf8');  
};

Compressor.prototype.run = function(done) {
  var self = this;

  self.setStatus('processing');

  var npmBinPath = path.join(path.dirname(__dirname), 'node_modules', '.bin');
  var uglifyBin = path.join(npmBinPath, 'uglifyjs');
  var cleancssBin = path.join(npmBinPath, 'cleancss');

  var tasks = [];

  var completePaths = function(paths) {
    var newPaths = [];

    if (!Array.isArray(paths)) {
      return newPaths;
    }

    paths.forEach(function(p) {
      newPaths.push(path.join(self.assetsPath, p));
    });

    return newPaths;
  };

  var compressJsGroup = function(group, jsAssets, cb) {
    var inputFiles = completePaths(jsAssets);
    var outputFile = path.join(self.tempAssetsPath, self.assetsJson.js[group]);

    if (fs.existsSync(outputFile)) {
      return cb(null);
    }    

    var cmd = [
      uglifyBin,
      inputFiles.join(' '),
      '-o ' + outputFile
    ].join(' ');

    exec(cmd, {maxBuffer: self.maxBuffer}, function(err, stdout, stderr) {
      cb(err);
    });   
  };

  var compressCssGroup = function(group, cssAssets, cb) {
    var inputFiles = completePaths(cssAssets);
    var outputFile = path.join(self.tempAssetsPath, self.assetsJson.css[group]);

    if (fs.existsSync(outputFile)) {
      return cb(null);
    }    

    concat(inputFiles, outputFile, function() {
      var cmd = [
        cleancssBin,
        outputFile,
        '-o ' + outputFile
      ].join(' ');

      exec(cmd, {maxBuffer: self.maxBuffer}, function(err, stdout, stderr) {
        cb(err);
      });
    });
  };  

  _.forEach(self.jsGroupAssets, function(jsAssets, group) {
    tasks.push(function(cb) {
      compressJsGroup(group, jsAssets, cb);
    });
  });

  _.forEach(self.cssGroupAssets, function(cssAssets, group) {
    tasks.push(function(cb) {
      compressCssGroup(group, cssAssets, cb);
    });
  });

  // run tasks and store assets json data
  require('async').parallel(tasks, function(err) {
    self.setStatus('finished');
    done(err);
  });
};

Compressor.prototype.isFinished = function() {
  return (this.status === 'finished');
};

Compressor.prototype.assets = function() {
  var self = this;
  var opts = {
    root: path.resolve(self.tempAssetsPath),
    index: 'index.html',
    maxage: self.maxAge
  };  

  return function* (next) {
    if (this.method != 'HEAD' && this.method != 'GET') {
      return yield* next;
    }

    if (!this.path.match(/^\/js\/.*\.js$/) && !this.path.match(/^\/css\/.*\.css$/)) {
      return yield* next;
    }

    // if (self.isFinished() && fs.existsSync(path.join(self.tempAssetsPath, this.path))) {
    //   return yield send(this, this.path, opts);
    // }

    yield (function() {
      return function (done) {
        if (self.isFinished()) {
          done();
        } else {
          self.on('finished', done);
        }        
      }
    })();

    yield send(this, this.path, opts);
  }
};

module.exports = Compressor;