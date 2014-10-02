var grid = require('..');
var join = require('path').join;
var exec = require('child_process').exec;
var write = require('fs').writeFileSync;

var file = grid('sample.mov');
file.count(64);
file.interval(1);
file.render(function(err, buf){
  var out = join(__dirname, 'grid.jpg');
  write(out, buf);
  exec('open ' + out, function(err){
    if (err) return console.log('Grid written to ' + out);
  });
});
