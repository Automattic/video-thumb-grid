
# video-thumb-grid

Generates a sprite grid of video thumbnails using `ffmpeg`.

## How to use

```js
var fs = require('fs');
var thumbs = require('video-thumb-grid');
var input = fs.createReadStream('video.mov');

thumbs(input, {
  count: 100,
  interval: 4,
  start: 0
}, function(err, buf){
  if (err) throw err;
  fs.writeFileSync('grid.jpg', buf);
});
```

## API

### Grid(Stream input, Object options, Function callback)

Invokes the grid thumbnail generation process for the given
`input` stream.

Options:

- `count` (`Number`) number of thumbnails to generate. Defaults to `100`.
- `interval` (`Number`) how many seconds to wait between thumbs.
  Defaults to `100`.
- `start` (Number) seek to the given number of seconds. Defaults to `0`.
- `width` (Number) width of individual thumb image. Defaults to `64`.
- `height` (Number) width of individual thumb image. Defaults to `48`.
- `quality` (Number) quality of resulting JPEG. Defaults to `70`.
- `vquality` (Number) quality of frames returned by `ffmpeg`. This
  corresponds to the `q:v` option, which takes a value from `1` (highest)
  to `31` (lowest). Defaults to `1`.

Notes:

- If the `interval` and `start` combination can't possibly meet `count`
  due to the length of the video, the grid will be populated with empty
  spaces.

## Requirements

- `ffmpeg` must be installed an available in `$PATH`
- `libjpeg` needs to be installed for the `node-jpeg` dependency to build
