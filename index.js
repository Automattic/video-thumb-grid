var spawn = require('child_process').spawn;
var PixelStack = require('pixel-stack');
var JPEGStream = require('jpeg-stream');
var time = require('timecodeutils');
var picha = require('picha');
var Image = picha.Image;
var encode = picha.encodeJpeg;
var decode = picha.decodeJpeg;
var debug = require('debug')('video-thumb-grid');

module.exports = Grid;

function Grid(input, fn){
  if (!(this instanceof Grid)) return new Grid(input, fn);

  // input stream
  this._input = input;

  // config
  this._count = 100;
  this._interval = 1;
  this._quality = 70;
  this._vquality = 1;
  this._width = 192;
  this._height = 144;
  this._start = 0;
  this._rows = null;
  this._cmd = 'ffmpeg';

  this._parser = new JPEGStream;
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
  if (!this._rows) {
    return Math.ceil(Math.sqrt(this.count()));
  } else {
    return this._rows;
  }
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
  argv.push('-i', 'pipe:0');

  // seek
  argv.push('-ss', time.secondsToTC(this.start()));

  // format
  argv.push('-f', 'image2');

  // resize and crop
  var w = this.width();
  var h = this.height();
  var vf =  'fps=1/' + this.interval() + ",scale='max(" + w + ',a*'
    + h + ")':'max(" + h + ',' + w + "/a)',crop=" + w + ':' + h;
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

  var stack = new PixelStack(total_w, total_h);
  stack.fill([255,255,255]);

  var x = 0, y = 0;

  debug('running ffmpeg with "%s"', args.join(' '));
  this.proc = spawn(this.cmd(), args);
  this._input.pipe(this.proc.stdin);

  this.proc.stdout
  .pipe(this._parser)
  .on('data', function(buf) {
    // grid is full
    if (y >= total_h) return;

    // decode
    debug('decoding jpeg thumb');
    decode(buf, function(err, img){
      if (err) return fn(err);
      debug('adding buffer');

      // add thumb
      stack.push(img.data, width, height, x, y);

      // calculate next x/y
      if (x + self.width() >= total_w) {
        x = 0;
        y += height;
      } else {
        x += width;
      }
    });
  });

  this.proc.stderr.on('data', function(data){
    debug('stderr %s', data);
  });

  this.proc.stdin.once('error', onerror);
  this.proc.stdout.once('error', onerror);
  this.proc.once('error', onerror);

  this.proc.stdout.on('end', function(){
    debug('stdout end');

    self._input.unpipe();
    self.proc.stdin.destroy();

    if (self._error) return debug('errored');
    if (self._aborted) return debug('aborted');
    if (self._parser.jpeg) return fn(new Error('JPEG end was expected.'));
    if (0 == self._parser.count) return fn(new Error('No JPEGs.'));

    var image = new Image({
      width: total_w,
      height: total_h,
      data: stack.buffer(),
      pixel: 'rgb'
    });

    debug('jpeg encode');
    encode(image, { quality: self.quality() }, fn);
  });

  this.proc.on('exit', function(code) {
    debug('proc exit (%d)', code);
  });

  function onerror(err){
    debug('error %s', err.stack);
    if (self._aborted) return debug('aborted');
    self._error = true;
    fn(err);
  }

  return this;
};

Grid.prototype.abort = function(){
  debug('aborting');
  this._aborted = true;
  this.proc.kill('SIGHUP');
  return this;
};
