
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

- `count` (`Number`) number of thumbnails to generate
- `interval` (`Number`) how many seconds to wait between thumbs
- `start` (Number) seek to the given number of seconds (defaults to `0`)

## Requirements

- `ffmpeg` must be installed an available in `$PATH`
- `libjpeg` needs to be installed for the `node-jpeg` dependency to build
