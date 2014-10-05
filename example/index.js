var fs = require('fs');
var grid = require('..');
var join = require('path').join;
var exec = require('child_process').exec;

var input = fs.createReadStream(join(__dirname, 'sample.mp4'));
var file = grid(input);
file.count(49);
file.width(240);
file.height(200);
file.render(function(err, buf){
  if (err) throw err;
  var out = join(__dirname, 'grid.jpg');
  fs.writeFileSync(out, buf);
  exec('open ' + out, function(err){
    if (err) return console.log('Grid written to ' + out);
  });
});
