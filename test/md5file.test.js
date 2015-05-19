var path = require('path');
var md5 = require('./../lib/md5file');

describe('md5file', function() {

  it('should return md5 of file', function(done) {
    var testFile = path.join(__dirname, 'data', 'a');
    md5(testFile, function(hash) {
      hash.should.be.eql('9195d0beb2a889e1be05ed6bb1954837');
      done();
    });
  });

});
