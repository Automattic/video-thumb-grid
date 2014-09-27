
var fs = require('fs');
var fs = require('fs');
var grid = require('..');
var join = require('path').join;
var exec = require('child_process').exec;

grid(fs.createReadStream(join(__dirname, 'sample.mov')), {
  count: 100,
  interval: 1.2,
  width: 64,
  height: 48
}, function(err, buf){
  var output = join(process.cwd(), 'result.jpg');
  fs.writeFileSync(output, buf);
  exec('open ' + output, function(err){
    if (err) return console.log('grid written to: ' + output);
  });
});
