
var spawn = require('child_process');

module.exports = Grid;

function Grid(input, opts, fn){
  if ('function' == typeof opts) {
    fn = opts;
    opts = {};
  }

  opts = opts || {};

  this.count = opts.count || 100;
  this.interval = opts.interval || 5;
  this.quality = opts.quality || 75;
  this.vquality = opts.vquality || 1;
  this.width = opts.width || 64;
  this.height = opts.height;
  this.start = opts.start || 0;

  var count = opts;
  var ffmpeg = spawn(ffmpeg);
}
