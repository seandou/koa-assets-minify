var crypto = require('crypto');
var fs = require('fs');

module.exports = function(file, cb) {
  if (!fs.existsSync(file)) {
    cb('d41d8cd98f00b204e9800998ecf8427e');
  }

  var rs = fs.createReadStream(file);
  var hash = crypto.createHash('md5');
  rs.on('data', hash.update.bind(hash));

  rs.on('end', function () {
    cb(hash.digest('hex'));
  });
};
