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
  if ('string' == typeof input) {
    this._path = input;
  } else if (input.pipe) {
    this._stream = input;
  } else {
    throw new Error('String or Stream input expected');
  }

  // config
  this._count = 100;
  this._interval = 1;
  this._quality = 50;
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
  argv.push('-i', this._path || 'pipe:0');

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
  fn = fn || empty;

  var self = this;
  var args = this.args();
  var width = this.width();
  var height = this.height();

  var total_w = width * Math.ceil(this.count() / this.rows());
  var total_h = height * this.rows();
  debug('result jpeg size %dx%d', total_w, total_h);

  var stack = new PixelStack(total_w, total_h);
  var x = 0, y = 0;

  debug('running ffmpeg with "%s"', args.join(' '));
  this.proc = spawn(this.cmd(), args);

  if (this._stream) {
    this._stream.pipe(this.proc.stdin);
  }

  var count = 0;
  var decoding = 0;
  var total = this.count();

  this.proc.stdout
  .pipe(this._parser)
  .on('data', function(buf) {
    // sometimes lingering `data` events
    // are produced even after `unpipe` is called
    if (!total || 0 == total - decoding) return;

    var push_x = x;
    var push_y = y;

    // decode
    debug('decoding jpeg thumb');
    decoding++;
    decode(buf, function(err, img){
      if (err) return fn(err);
      debug('adding buffer');
      stack.push(img.data, img.width, img.height, push_x, push_y, img.stride);
      --decoding;
      --total || complete();
    });

    if (x + width >= total_w) {
      x = 0;
      y += height;
    } else {
      x += width;
    }
  })
  .on('end', function(){
    if (decoding) {
      debug('%d pending decoding', decoding);
      // let the `decode` handler call `complete`
      total = decoding;
    } else if (total) {
      var count = self.count();
      debug('%d expected, but got %d', count, count - total);
      complete();
    }
  });

  this.proc.stderr.on('data', function(data){
    debug('stderr %s', data);
  });

  this.proc.stdin.on('error', function(err){
    if ('EPIPE' == err.code) {
      debug('ignore EPIPE');
    } else if ('ECONNRESET' == err.code) {
      debug('ignore ECONNRESET');
    } else {
      onerror(err);
    }
  });

  this.proc.stdout.on('error', onerror);
  this.proc.stderr.on('error', onerror);
  this.proc.on('error', onerror);

  this.proc.stdout.on('end', function(){
    debug('stdout end');
  });

  this.proc.on('exit', function(code) {
    debug('proc exit (%d)', code);
  });

  function complete(){
    self._stream.unpipe(self.proc);

    if (self._stream) self._stream.unpipe(self.proc);
    if (self._error) return debug('errored');
    if (self._aborted) return debug('aborted');
    if (self._parser.jpeg) return fn(new Error('JPEG end was expected.'));
    if (0 == self._parser.count) return fn(new Error('No JPEGs.'));

    var image = new Image({
      width: total_w,
      height: total_h,
      data: stack.buffer(),
      pixel: 'rgb',
      stride: total_w * 3
    });

    debug('jpeg encode');
    encode(image, { quality: self.quality() }, fn);
  }


  function onerror(err){
    debug('error %s', err.stack);
    if (self._aborted) return debug('aborted');
    if (self._error) return debug('ignored');
    self._error = true;
    fn(err);
  }

  return this;
};

Grid.prototype.abort = function(){
  debug('aborting');
  this._aborted = true;
  if (this._stream) this._stream.unpipe(this.proc);
  this.proc.kill('SIGHUP');
  return this;
};

function empty(){}
