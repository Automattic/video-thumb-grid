
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
