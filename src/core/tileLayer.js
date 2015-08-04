(function () {
  'use strict';

  //////////////////////////////////////////////////////////////////////////////
  /**
   * This method defines a tileLayer, which is an abstract class defining a
   * layer divided into tiles of arbitrary data.  Notably, this class provides
   * the core functionality of the osmLayer, but hooks exist to render tiles
   * dynamically from vector data, or to display arbitrary grids of images
   * in a custom coordinate system.  When multiple zoom levels are present
   * in a given dataset, this class assumes that the space occupied by
   * tile (i, j) at level z is covered by a 2x2 grid of tiles at zoom
   * level z + 1:
   *
   *   (2i, 2j),     (2i, 2j + 1)
   *   (2i + 1, 2j), (2i + 1, 2j + 1)
   *
   * The higher level tile set should represent a 2x increase in resolution.
   *
   * Although not currently supported, this class is intended to extend to
   * 3D grids of tiles as well where 1 tile is covered by a 2x2x2 grid of
   * tiles at the next level.  The tiles are assumed to be rectangular,
   * identically sized, and aligned with x/y axis of the underlying
   * coordinate system.  The local coordinate system is in pixels relative
   * to zoom level 0.
   *
   * @class
   * @extends geo.featureLayer
   * @param {Object?} options
   * @param {Number} [options.minLevel=0]    The minimum zoom level available
   * @param {Number} [options.maxLevel=18]   The maximum zoom level available
   * @param {Number} [options.tileOverlap=0] Number of pixels of overlap between tiles
   * @param {Number} [options.tileWidth=256] The tile width as displayed without overlap
   * @param {Number} [options.tileHeigh=256] The tile height as displayed without overlap
   * @param {Number} [options.cacheSize=200] The maximum number of tiles to cache
   * @param {Bool}   [options.wrapX=true]    Wrap in the x-direction
   * @param {Bool}   [options.wrapY=false]   Wrap in the y-direction
   * @param {function} [options.url=null]
   *   A function taking the current tile indices and returning a URL or jquery
   *   ajax config to be passed to the {geo.tile} constructor.
   *   Example:
   *     (x, y, z) => "http://example.com/z/y/x.png"
   * @returns {geo.tileLayer}
   */
  //////////////////////////////////////////////////////////////////////////////
  geo.tileLayer = function (options) {
    if (!(this instanceof geo.tileLayer)) {
      return new geo.tileLayer(options);
    }
    geo.featureLayer.call(this, options);
    $.extend(options || {}, geo.tileLayer.defaults);

    // copy the options into a private variable
    this._options = $.extend(true, {}, options);

    // initialize the object that keeps track of actively drawn tiles
    this._active = {};

    // initialize the in memory tile cache
    this._cache = new geo.tileCache({size: options.cacheSize});
    return this;
  };

  geo.tileLayer.prototype = {
    /**
     * Readonly accessor to the options object
     */
    get options() {
      return $.extend(true, {}, this._options);
    },

    /**
     * Readonly accessor to the tile cache object.
     */
    get cache() {
      return this._cache;
    },

    /**
     * Readonly accessor to the active tile mapping.  This is an object containing
     * all currently drawn tiles (hash(tile) => tile).
     */
    get active() {
      return $.extend({}, this._active); // copy on output
    },

    /**
     * Tile scaling factor relative to zoom level 0.
     * The default implementation just returns a memoized
     * version of `1 / Math.pow(2, z - 1)`.
     * @param {Number} level A zoom level
     * @returns {Number} The size of a pixel at level z relative to level 0
     */
    scaleAtZoom: function (level) {
      var scale = [], i;
      for (i = 0; i < this._options.maxLevel; i += 1) {
        scale.push[i] = 1 / Math.pow(2, i - 1);
      }
      this.scaleAtZoom = function (z) {
        return scale[z];
      };
      return this.scaleAtZoom(level);
    },

    /**
     * Returns the tile indices at the given point for the given zoom level.
     * @param {Object} point The coordinates in pixels
     * @param {Number} point.x
     * @param {Number} point.y
     * @returns {Object} The tile indices
     */
    tileAtPoint: function (point) {
      return {
        x: Math.floor(point.x / this._options.tileWidth),
        y: Math.floor(point.y / this._options.tileHeight)
      };
    },

    /**
     * Returns an instantiated tile object with the given indices.  This
     * method always returns a new tile object.  Use `_getTileCached`
     * to use the caching layer.
     * @param {Object} index The tile index
     * @param {Number} index.x
     * @param {Number} index.y
     * @param {Number} index.level
     * @returns {geo.tile}
     */
    _getTile: function (index) {
      return new geo.tile({
        index: index,
        size: {x: this._options.tileWidth, y: this._options.tileHeight},
        url: this._options.url(index)
      });
    },

    /**
     * Returns an instantiated tile object with the given indices.  This
     * method is similar to `_getTile`, but checks the cache before
     * generating a new tile.
     * @param {Object} index The tile index
     * @param {Number} index.x
     * @param {Number} index.y
     * @param {Number} index.level
     * @returns {geo.tile}
     */
    _getTileCached: function (index) {
      var tile = this.cache.get(this.cache.hash(index));
      if (tile === null) {
        tile = this._getTile(index);
        this.cache.add(tile);
      }
      return tile;
    },

    /**
     * Returns a list of tiles necessary to fill the screen at the given
     * zoom level, center point, and viewport size.  The list is optionally
     * ordered by loading priority (center tiles first).
     *
     * @protected
     * @param {Number} level The zoom level
     * @param {Object} center The center point in pixels
     * @param {Number} center.x
     * @param {Number} center.y
     * @param {Object} size The viewport size in pixels
     * @param {Number} size.width
     * @param {Number} size.height
     * @param {Boolean} sorted Return a sorted list
     * @returns {geo.tile[]} An array of tile objects
     */
    _getTiles: function (level, center, size, sorted) {
      var iCenter, i, j, tiles = [], index, nTilesLevel,
          start, end;

      // indices of the center tile
      iCenter = this.tileAtPoint(center, level);

      // get the tile range to fetch
      start = this.tileAtPoint({
        x: center.x - size.x / 2,
        y: center.y - size.y / 2
      }, level);
      end = this.tileAtPoint({
        x: center.x + size.x / 2,
        y: center.y + size.y / 2
      }, level);

      // total number of tiles existing at this level
      nTilesLevel = Math.pow(2, level);

      // loop over the tile range
      index = {level: level};
      for (i = start.x; i < end.x; i += 1) {
        if (this._options.wrapX && i < 0) {
          // mod(i, nTilesLevel)
          index.x = ((i % nTilesLevel) + nTilesLevel) % nTilesLevel;
        } else {
          index.x = i;
        }
        for (j = start.y; i < end.y; j += 1) {
          if (this._options.wrapY && j < 0) {
            // mod(j, nTilesLevel)
            index.y = ((j % nTilesLevel) + nTilesLevel) % nTilesLevel;
          } else {
            index.y = j;
          }

          tiles.push(this._getTileCached(index));
        }
      }

      if (sorted) {
        tiles.sort(this._loadMetric(iCenter));
      }
      return tiles;
    },

    /**
     * Prefetches tiles up to a given zoom level around a given bounding box.
     *
     * @param {Number} level The zoom level
     * @param {Object} center The center point in pixels
     * @param {Number} center.x
     * @param {Number} center.y
     * @param {Object} size The viewport size in pixels
     * @param {Number} size.width
     * @param {Number} size.height
     * @returns {$.Deferred} resolves when all of the tiles are fetched
     */
    prefetch: function (level, center, size) {
      var tiles = [], l, c, s, scale;
      for (l = this._options.minLevel; l <= level; l += 1) {
        scale = Math.pow(2, l - level);
        c = {x: center.x * scale, y: center.y * scale};
        s = {x: size.x * scale, y: size.y * scale};
        Array.prototype.push.apply(tiles, this._getTiles(l, c, s, false));
      }
      return $.when.prototype.apply($,
        tiles.sort(this._loadMetric(center))
          .map(function (tile) {
            return tile.fetch().defer;
          })
      );
    },

    /**
     * This method returns a metric that determines tile loading order.  The
     * default implementation prioritizes tiles that are closer to the center,
     * or at a lower zoom level.
     * @protected
     * @param {index1} center   The center tile
     * @param {Number} center.x
     * @param {Number} center.y
     * @returns {function} A function accepted by Array.prototype.sort
     */
    _loadMetric: function (center) {
      return function (a, b) {
        var a0, b0, dx, dy, cx, cy, scale;

        // shortcut if zoom level differs
        if (a.level !== b.level) {
          return b.level - a.level;
        }

        // compute the center coordinates relative to a.level
        scale = Math.pow(2, a.level - center.level);
        cx = center.x * scale;
        cy = center.y * scale;

        // calculate distances to the center squared
        dx = a.x - cx;
        dy = a.y - cy;
        a0 = dx * dx + dy * dy;

        dx = b.x - cx;
        dy = b.y - cy;
        b0 = dx * dx + dy * dy;

        // return negative if a < b, or positive if a > b
        return a - b;
      };
    },

    /**
     * Convert a coordinate from layer to map coordinate systems.
     * @param {Object} coord
     * @param {Number} coord.x The offset in pixels (level 0) from the left edge
     * @param {Number} coord.y The offset in pixels (level 0) from the bottom edge
     */
    fromLocal: function (coord) {
      return {
        x: (this._options.maxX - this._options.minX) * coord.x / this._options.tileWidth,
        y: (this._options.maxY - this._options.minY) * coord.y / this._options.tileHeight
      };
    },

    /**
     * Convert a coordinate from map to layer coordinate systems.
     * @param {Object} coord
     * @param {Number} coord.x The offset in map units from the left edge
     * @param {Number} coord.y The offset in map units from the bottom edge
     */
    toLocal: function (coord) {
      return {
        x: this.tileWidth * coord.x / (this.maxX - this.minX),
        y: this.tileHeight * coord.y / (this.maxY - this.minY)
      };
    },

    /**
     * Draw the given tile on the active canvas.  Can be overridden in derived classes
     * to draw the tile within a renderer's context.
     * @param {geo.tile} tile The tile to draw
     */
    draw: function (tile) {
      var hash = tile.toString();

      if (hash.hasOwnProperty(this._active)) {
        // the tile is already drawn, remove it
        this.remove(tile);
      }

      // add the tile to the active cache
      this._active[tile.toString()] = tile;
    },

    /**
     * Remove the given tile from the canvas.
     * @param {geo.tile|string} tile The tile (or hash) to remove
     * @returns {geo.tile} the tile removed from the active layer
     */
    remove: function (tile) {
      tile = tile.toString();
      var value = this._active[tile];
      delete this._active[tile];
      return value;
    },

    /**
     * Remove all active tiles from the canvas.
     * @returns {geo.tile[]} The array of tiles removed
     */
    clear: function () {
      var tiles = [], tile;

      // ignoring the warning here because this is a privately
      // controlled object with simple keys
      for (tile in this._active) {  // jshint ignore: line
        tiles.push(this.remove(tile));
      }

      return tiles;
    },

    /**
     * Reset the layer to the initial state, clearing the canvas
     * and resetting the tile cache.
     * @returns {this} Chainable
     */
    reset: function () {
      this.clear();
      this._cache.clear();
    }
  };

  /**
   * This object contains the default options used to initialize the tileLayer.
   */
  geo.tileLayer.defaults = {
    minLevel: 0,
    maxLevel: 18,
    tileOverlap: 0,
    tileWidth: 256,
    tileHeight: 256,
    wrapX: true,
    wrapY: false,
    url: null,
    minX: 0,
    maxX: 255,
    minY: 0,
    maxY: 255,
    cacheSize: 200
  };

  inherit(geo.tileLayer, geo.featureLayer);
})();
