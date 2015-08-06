// Test geo.imageTile

/*global describe, it, expect, geo*/
describe('geo.imageTile', function () {
  'use strict';

  it('loading a single image', function (done) {
    var tile = geo.imageTile({
      index: {x: 0, y: 0},
      size: {x: 256, y: 256},
      url: '/data/tiles/0/0/0.png'
    });

    tile.then(function () {
      expect(!!tile.image).toBe(true);
      done();
    });
  });
});
