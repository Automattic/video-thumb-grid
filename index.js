var spawn = require('child_process').spawn;
var JPEGStream = require('jpeg-stream');
var JPEGStack = require('jpeg').FixedJpegStack;
var time = require('timecodeutils');
var decode = require('picha').decodeJpeg;
var debug = require('debug')('video-thumb-grid');

module.exports = Grid;

function Grid(input, fn){
  if (!(this instanceof Grid)) return new Grid(input, fn);

  // input stream
  this._input = input;

  // config
  this._count = 100;
  this._interval = 5;
  this._quality = 70;
  this._vquality = 1;
  this._width = 192;
  this._height = 144;
  this._start = 0;
  this._rows = Math.ceil(Math.sqrt(this._count));
  this._cmd = 'ffmpeg';

  this.parser = new JPEGStream;
}

Grid.prototype.start = function(v){
  if (arguments.length) {
    this._start = v;
    return this;
  }
  return this._start;
};

Grid.prototype.quality = function(v){
  if (arguments.length) {
    this._quality = v;
    return this;
  }
  return this._quality;
};

Grid.prototype.vquality = function(v){
  if (arguments.length) {
    this._vquality = v;
    return this;
  }
  return this._vquality;
};

Grid.prototype.width = function(v){
  if (arguments.length) {
    this._width = v;
    return this;
  }
  return this._width;
};

Grid.prototype.height = function(v){
  if (arguments.length) {
    this._height = v;
    return this;
  }
  return this._height;
};

Grid.prototype.count = function(v){
  if (arguments.length) {
    this._count = v;
    return this;
  }
  return this._count;
};

Grid.prototype.rows = function(v){
  if (arguments.length) {
    this._rows = v;
    return this;
  }
  return this._rows;
};

Grid.prototype.interval = function(v){
  if (arguments.length) {
    this._interval = v;
    return this;
  }
  return this._interval;
};

Grid.prototype.cmd = function(v){
  if (arguments.length) {
    this._cmd = v;
    return this;
  }
  return this._cmd;
};

Grid.prototype.args = function(){
  var argv = [];

  // input stream
  argv.push('-i', this._input);

  // seek
  argv.push('-ss', time.secondsToTC(this.start()));

  // format
  argv.push('-f', 'image2');

  // resize and crop
  var vf =  'fps=1/' + this.interval() + ",scale='max(" + this.width()
    + ',a*' + this.height() + ")':'max(" + this.height() + ','
    + this.width() + "/a)',crop=" + this.width() + ':' + this.height();
  argv.push('-vf', vf);

  // number of frames
  argv.push('-vframes', this.count());

  // quality of the frames
  argv.push('-q', this.vquality());

  // ensure streaming output
  argv.push('-updatefirst', 1);

  // stdout
  argv.push('-');

  return argv;
};

Grid.prototype.render = function(fn){
  var self = this;
  var args = this.args();
  var width = this.width();
  var height = this.height();

  var total_w = width * Math.ceil(this.count() / this.rows());
  var total_h = height * this.rows();
  debug('result jpeg size %dx%d', total_w, total_h);

  var jpeg = new JPEGStack(total_w, total_h, 'rgb');
  jpeg.setQuality(this.quality());

  var x = 0, y = 0;

  debug('running ffmpeg with "%s"', args.join(' '));
  this.proc = spawn(this.cmd(), args);
  this.proc.stdout
  .pipe(this.parser)
  .on('data', function(buf) {
    // grid is full
    if (y >= total_h) return;

    // decode
    debug('decoding jpeg thumb');
    decode(buf, function(err, img){
      if (err) return fn(err);
      debug('adding buffer');

      // add thumb
      jpeg.push(img.data, x, y, width, height);

      // calculate next x/y
      if (x + self.width() >= total_w) {
        x = 0;
        y += height;
      } else {
        x += width;
      }
    });
  });

  this.proc.once('error', function(err){
    debug('error %s', err.stack);
    if (self._aborted) return debug('aborted');
    self._error = true;
    fn(err);
  });

  this.proc.stdout.on('end', function() {
    debug('stdout end');
    if (self._error) return debug('errored');
    if (self._aborted) return debug('aborted');
    if (self.parser.jpeg) return fn(new Error('JPEG end was expected.'));
    if (0 == self.parser.count) return fn(new Error('No JPEGs.'));
    debug('jpeg encode');
    jpeg.encode(function(buf){
      fn(null, buf);
    });
  });

  return this;
};

Grid.prototype.abort = function(){
  debug('aborting');
  this._aborted = true;
  this.proc.kill('SIGHUP');
  return this;
};
