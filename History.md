
0.3.0 / 2016-01-21
==================

  * Double the size, which should allow us to determine codecs for even more videos.

0.2.9 / 2016-01-21
==================

  * bump `debug`
  * Bump `picha` since it no longer installs.

0.2.8 / 2015-07-09
==================

  * Add back the timer that was removed in 77035dd2c35a266ecedbe42b07d8195c4d2b7f09. Simple solution is to `clearTimeout`.
  * set `analyzeduration` and `probesize` so `ffmpeg` can find the codec parameters with more videos

0.2.7 / 2015-07-08
==================

  * Remove timeout. It holds up the process when it does complete. Would need to be improved if added back.
  * Only unpipe if there is a stream, which is done in the next line.

0.2.6 / 2015-07-03
==================

  * `self` not `this`

0.2.5 / 2015-07-03
==================

  * Limit threads to 2
  * Document `debugprefix` and `debug`

0.2.4 / 2015-07-02
==================

  * Add a timeout for `ffmpeg` so it does not run too long.
  * Better separation of general "info" debug, debug from `ffmpeg`, and `console.error` for real errors.
  * Introduce a debugprefix which is useful when running on a server accepting many requests.
  * Added image

0.2.3 / 2015-05-27
==================

  * When the seek value comes before the input stream, it fails with a seek value of 0. Only set a seek value if there is one.

0.2.2 / 2015-05-26
==================

  * Swap the order of `-i` and `-ss`. When used as an input option (before -i), seeks in this input file to position. When used as an output option (before an output filename), decodes but discards input until the timestamps reach position. This is slower, but more accurate.
  * Add timer debugs to see how long grid and ffmpeg take.

0.2.1 / 2015-02-19
==================

  * package: bump `picha` to remove `buffertools` dep

0.2.0 / 2014-10-14
==================

 * tweak example to default to previously-problematic width
 * added support for stride, fixing problems with certain widths
 * handle async decoding, out-of-order decoding better, and decoding that takes longer than the stream

0.1.1 / 2014-10-04
==================

 * changed default quality to 50
 * fix requirement on README

0.1.0 / 2014-10-04
==================

 * initial release
