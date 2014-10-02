var fs = require('fs');
var join = require('path').join;
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var JPEGStream = require('jpeg-stream');
var parser = new JPEGStream;
var JpegLib = require('jpeg');
var timecodeutils = require('timecodeutils');
var JpegJS = require('jpeg-js');

module.exports = Grid;

function Grid(input, opts, fn){
  if (!(this instanceof Grid)) {
    return new Grid(input, opts, fn);
  }

  if ('function' == typeof opts) {
    fn = opts;
    opts = {};
  }

  opts = opts || {};

  // TODO - make sure our opts are ints
  this.count = opts.count || 100;
  this.interval = opts.interval || 5;
  this.quality = opts.quality || 70;
  this.vquality = opts.vquality || 1;
  this.width = opts.width || 192;
  this.height = opts.height || 144;
  this.start = opts.start || 0;
  this.next_x = 0;
  this.next_y = 0;
  this.rows = opts.rows || Math.ceil(Math.sqrt(this.count));
  this.jpeg_w = this.width * Math.ceil(this.count / this.rows);
  this.jpeg_h = this.height * this.rows;

  var jpegStack = new JpegLib.FixedJpegStack(this.jpeg_w, this.jpeg_h, 'rgba');

  var ffmpeg = spawn('ffmpeg', [
    '-i',
    input,
    '-ss',
    timecodeutils.secondsToTC(this.start),
    '-f',
    'image2',
    '-vf',
    'fps=1/' + this.interval + ",scale='max(" + this.width + ',a*' + this.height + ")':'max(" + this.height + ',' + this.width + "/a)',crop=" + this.width + ':' + this.height,
    '-q',
    this.vquality,
    '-vframes',
    this.count,
    '-updatefirst',
    '1',
    '-'
  ]);

  var grid = this;
  ffmpeg.stdout.pipe(parser).on('data', function(buf) {
    // Grid is full. Don't try to push another jpeg or FixedJpegStack will throw an error
    if ( grid.next_y >= grid.jpeg_h ) {
      return;
    }

    jpegStack.push(JpegJS.decode(buf).data, grid.next_x, grid.next_y, grid.width, grid.height);
    if ( grid.next_x + grid.width >= grid.jpeg_w ) {
      grid.next_x = 0;
      grid.next_y += grid.height;
    } else {
      grid.next_x += grid.width;
    }
  });

  ffmpeg.stdout.on('end', function() {
    if (parser.jpeg) {
      throw new Error('JPEG end was expected.');
    }

    var output = join(process.cwd(), 'result.jpg');
    fs.writeFileSync(output, jpegStack.encodeSync());
    exec('open ' + output, function(err) {
      if (err) {
        return console.log('Grid written to ' + output);
      }
    });
  });
}
