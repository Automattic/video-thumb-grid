var spawn = require('child_process').spawn;
var PixelStack = require('pixel-stack');
var JPEGStream = require('jpeg-stream');
var time = require('timecodeutils');
var picha = require('picha');
var Image = picha.Image;
var encode = picha.encodeJpeg;
var decode = picha.decodeJpeg;
var debugFfmpeg = require('debug')('video-thumb-grid-ffmpeg');
var debugInfo = require('debug')('video-thumb-grid-info');
var util = require('util');

module.exports = Grid;

function Grid(input, fn){
  this.gridStart = process.hrtime();

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
  this._debugprefix = '';

  this._parser = new JPEGStream;

  this.ffmpegStart = null;
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

Grid.prototype.debugprefix = function(v){
  if (arguments.length) {
    this._debugprefix = v + ': ';
    return this;
  }
  return this._debugprefix;
};

Grid.prototype.args = function(){
  var argv = [];

  // seek
  if (this.start() > 0) argv.push('-ss', time.secondsToTC(this.start()));

  argv.push('-analyzeduration', '100M');
  argv.push('-probesize', '100M');

  // input stream
  argv.push('-i', this._path || 'pipe:0');

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

  // limit threads
  argv.push('-threads', 2);

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
  this.debug(util.format('result jpeg size %dx%d', total_w, total_h), 'info');

  var stack = new PixelStack(total_w, total_h);
  var x = 0, y = 0;

  this.debug(util.format('running ffmpeg with "%s"', args.join(' ')), 'info');
  this.ffmpegStart = process.hrtime();
  this.proc = spawn(this.cmd(), args);

  this._procTimer = setTimeout(function () {
    console.error('%s: Killing after 60 seconds', self._debugprefix);
    self._timeout = true;
    self.abort();
  }, 60000);

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
    self.debug('decoding jpeg thumb', 'info');
    decoding++;
    decode(buf, function(err, img){
      if (err) return fn(err);
      self.debug('adding buffer', 'info');
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
      self.debug(util.format('%d pending decoding', decoding), 'info');
      // let the `decode` handler call `complete`
      total = decoding;
    } else if (total) {
      var count = self.count();
      self.debug(util.format('%d expected, but got %d', count, count - total), 'info');
      complete();
    }
  });

  this.proc.stderr.on('data', function(data){
    self.debug(util.format('stderr %s', data), 'ffmpeg');
  });

  this.proc.stdin.on('error', function(err){
    if ('EPIPE' == err.code) {
      self.debug('ignore EPIPE', 'ffmpeg');
    } else if ('ECONNRESET' == err.code) {
      self.debug('ignore ECONNRESET', 'ffmpeg');
    } else {
      onerror(err);
    }
  });

  this.proc.stdout.on('error', onerror);
  this.proc.stderr.on('error', onerror);
  this.proc.on('error', onerror);

  this.proc.stdout.on('end', function(){
    self.debug('stdout end', 'info');
  });

  this.proc.on('exit', function(code) {
    var ffmpegEnd = process.hrtime(self.ffmpegStart);
    self.debug(util.format('ffmpeg execution time: %ds %dms', ffmpegEnd[0], ffmpegEnd[1]/1000000), 'ffmpeg');

    self.debug(util.format('proc exit (%d)', code), 'ffmpeg');
  });

  function complete(){
    if (self._stream) self._stream.unpipe(self.proc);
    if (self._error) return self.debug('errored', 'info');
    if (self._timeout) return fn(new Error('ffmpeg took too long.'));
    if (self._procTimer) clearTimeout(self._procTimer);
    if (self._aborted) return self.debug('aborted', 'info');
    if (self._parser.jpeg) return fn(new Error('JPEG end was expected.'));
    if (0 == self._parser.count) return fn(new Error('No JPEGs.'));

    var image = new Image({
      width: total_w,
      height: total_h,
      data: stack.buffer(),
      pixel: 'rgb',
      stride: total_w * 3
    });

    self.debug('jpeg encode', 'info');
    encode(image, { quality: self.quality() }, fn);

    var gridEnd = process.hrtime(self.gridStart);
    self.debug(util.format('grid execution time: %ds %dms', gridEnd[0], gridEnd[1]/1000000), 'info');
  }


  function onerror(err){
    console.error('error %s', err.stack);
    if (self._aborted) return self.debug('aborted', 'info');
    if (self._error) return self.debug('errored', 'info');
    self._error = true;
    fn(err);
  }

  return this;
};

Grid.prototype.abort = function(){
  this.debug('aborting', 'info');
  this._aborted = true;
  if (this._stream) this._stream.unpipe(this.proc);
  this.proc.kill('SIGHUP');
  return this;
};

Grid.prototype.debug = function(message, type) {
  if ('ffmpeg' == type)
    debugFfmpeg('%s%s', this._debugprefix, message);
  else
    debugInfo('%s%s', this._debugprefix, message);
}

function empty(){}
