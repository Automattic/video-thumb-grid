
# video-thumb-grid

Generates a sprite grid of video thumbnails using `ffmpeg`.

## How to use

```js
var fs = require('fs');
var thumbs = require('video-thumb-grid');
var grid = thumbs(fs.createReadStream('video.mov'));
grid.count(100);
grid.interval(4);
grid.start(0);
grid.render(function(err, buf){
  if (err) throw err;
  fs.writeFileSync('grid.jpg', buf);
});
```

## API

### Grid(Stream input)

Constructs a new `Grid` with the given `input` `Readable` stream.

### Grid(String input)

Constructs a new `Grid` with the given `input` fs path.

### Grid#count()

Returns the number of thumbnails to generate. Defaults to `100`.

### Grid#count(Number count)

- Sets the number of thumbnails to generate to `count`.
- Returns the `Grid` instance object.

### Grid#rows()

Returns the number of rows in the grid. Defaults to the creating a
"square" by calculating the square root of `count`.

### Grid#rows(Number count)

- Sets the number of thumbnails to generate to `count`.
- Returns the `Grid` instance object.

### Grid#interval()

Returns how many seconds to wait between thumbs. Defaults to `1`.

### Grid#interval(Number int)

- Sets how many seconds to wait between thumbs to `int`.
- Returns the `Grid` instance object.

### Grid#start()

Returns the number of seconds at which we start capturing thumbs.
Defaults to `0`.

### Grid#start(Number secs)

- Sets how many seconds to seek to.
- Returns the grid instance object.

### Grid#width()

Returns the width of each individual thumb in the grid.
Defaults to `192`.

### Grid#width(Number w)

- Sets width of each individual thumb to `w`.
- Returns the `Grid` instance object.

### Grid#height()

Returns the height of each individual thumb in the grid.
Defaults to `144`.

### Grid#height(Number h)

- Sets height of each individual thumb to `h`.
- Returns the `Grid` instance object.

### Grid#quality()

Returns the quality of the resulting JPEG. Defaults to `50`.

### Grid#quality(Number q)

- Sets the quality of the resulting JPEG to `q`.
- Returns the `Grid` instance object.

### Grid#vquality()

Returns the quality of frames returned by `ffmpeg`. This corresponds to
the `q` option, which takes a value from `1` (highest) to `31` (lowest).
Defaults to `1`.

### Grid#vquality(Number q)

- Sets the `ffmpeg` video quality.
- Returns the `Grid` instance object.

### Grid#render(Function fn)

- Triggers the thumbnailing process
- Calls `fn` with `err, buf`, `buf` being the resulting JPEG grid.
- Can be aborted by calling `Grid#abort`.
- Returns the `Grid` instance object.

### Grid#abort

- Aborts the `ffmpeg` process, if ongoing, or the grid composition.
- Returns the `Grid` instance object.

### Grid#cmd()

Returns the program that will be called. Defaults to `ffmpeg`.

### Grid#cmd(String cmd)

- Sets the program that will be run to `cmd`.
- Returns the `Grid` instance object.

### Grid#proc

- Property that holds the `ffmpeg` `ChildProcess`.

## Notes:

- If the `interval` and `start` combination can't possibly meet `count`
  due to the length of the video, the grid will be populated with empty
  spaces.

## Requirements

- `ffmpeg` must be installed an available in `$PATH`
- `libjpeg` needs to be installed for the [picha](https://github.com/jhs67/picha) dependency to build

## Authors

- Nick Momrik ([@nickmomrik](https://github.com/nickmomrik))
- Guillermo Rauch ([@guille](https://github.com/guille))

## License

MIT – Copyright (c) 2014 Automattic, Inc.
