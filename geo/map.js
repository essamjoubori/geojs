//////////////////////////////////////////////////////////////////////////////
/**
 * @module ogs.geo
 */

/*jslint devel: true, forin: true, newcap: true, plusplus: true, white: true, indent: 2*/
/*global geoModule, ogs, inherit, $, HTMLCanvasElement, Image, vglModule, document*/
//////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////
/**
 * Map options object specification
 */
//////////////////////////////////////////////////////////////////////////////
geoModule.mapOptions = {
  zoom: 0,
  center: geoModule.latlng(0.0, 0.0),
  projection: "mercator",
  country_boundaries: true,
  state_boundaries: false,
};

//////////////////////////////////////////////////////////////////////////////
/**
 * Create a new instance of class map
 *
 * @class Creates a new map inside of the given HTML container (Typically DIV)
 * @returns {geoModule.map}
 */
//////////////////////////////////////////////////////////////////////////////
geoModule.map = function(node, options) {
  "use strict";
  if (!(this instanceof geoModule.map)) {
    return new geoModule.map(node, options);
  }
  ogs.vgl.object.call(this);

  /** @private */
  var m_that = this,
      m_node = node,
      m_initialized = false,
      m_options = options,
      m_layers = {},
      m_activeLayer = null,
      m_featureCollection = geoModule.featureCollection(),
      m_renderTime = ogs.vgl.timestamp(),
      m_lastPrepareToRenderingTime = ogs.vgl.timestamp(),
      m_interactorStyle = null,
      m_viewer = null,
      m_renderer = null,
      m_updateRequest = null,
      m_prepareForRenderRequest = null;

  m_renderTime.modified();

  if (!options.center) {
    m_options.center = geoModule.latlng(0.0, 0.0);
  }

  if (options.zoom === undefined) {
    m_options.zoom = 10;
  }

  if (!options.source) {
    console.log("[error] Map requires valid source for the context");
    return null;
  }

  // Initialize
  m_interactorStyle = geoModule.mapInteractorStyle();
  m_viewer = ogs.vgl.viewer(m_node);
  m_viewer.setInteractorStyle(m_interactorStyle);
  m_viewer.init();
  m_viewer.renderWindow().resize($(m_node).width(), $(m_node).height());
  m_renderer = m_viewer.renderWindow().activeRenderer();

  m_prepareForRenderRequest =
    geoModule.prepareForRenderRequest(m_viewer, m_featureCollection);
  m_updateRequest = geoModule.updateRequest(null, m_options, m_viewer, m_node);

  $(m_prepareForRenderRequest).on(geoModule.command.requestPredrawEvent,
    function(event) {
      m_that.predraw();
      m_that.redraw();
  });
  $(m_updateRequest).on(geoModule.command.requestPredrawEvent,
    function(event) {
      m_that.predraw();
      m_that.redraw();
  });

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Update view based on the zoom
   */
  ////////////////////////////////////////////////////////////////////////////
  function updateViewZoom(useCurrent) {
    m_interactorStyle.zoom(m_options, useCurrent);
  }

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Compute zoom level based on the camera distance
   */
  ////////////////////////////////////////////////////////////////////////////
  function updateZoom() {
    var camera = m_renderer.camera();

    if (camera.position()[2] < Number.MAX_VALUE) {
      m_options.zoom = 1;
    }
    if (camera.position()[2] < 200) {
      m_options.zoom = 2;
    }
    if (camera.position()[2] < 100) {
      m_options.zoom = 3;
    }
    if (camera.position()[2] < 50) {
      m_options.zoom = 4;
    }
    if (camera.position()[2] < 25) {
      m_options.zoom = 5;
    }
    if (camera.position()[2] < 15) {
      m_options.zoom = 6;
    }
    if (camera.position()[2] < 5) {
      m_options.zoom = 7;
    }

    console.log('zoom, position ', m_options.zoom, camera.position()[2]);

    m_that.update(m_updateRequest);
  }

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Initialize the scene
   */
  ////////////////////////////////////////////////////////////////////////////
  function initScene() {
    updateViewZoom();
    m_initialized = true;
  }

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Initialize the scene (if not initialized) and then render the map
   */
  ////////////////////////////////////////////////////////////////////////////
  function draw() {
    if (m_initialized === false) {
      initScene();
    }
    m_viewer.render();
  }

  $(m_interactorStyle).on(ogs.geo.command.updateViewZoomEvent, updateZoom);
  $(m_interactorStyle).on(ogs.vgl.command.leftButtonPressEvent, draw);
  $(m_interactorStyle).on(ogs.vgl.command.middleButtonPressEvent, draw);
  $(m_interactorStyle).on(ogs.vgl.command.rightButtonPressEvent, draw);
  $(this).on(geoModule.command.updateEvent, draw);

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Get map options
   */
  ////////////////////////////////////////////////////////////////////////////
  this.options = function() {
    return m_options;
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Get the zoom level of the map
   *
   * @returns {Number}
   */
  ////////////////////////////////////////////////////////////////////////////
  this.zoom = function() {
    return m_options.zoom;
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Set zoom level of the map
   *
   * @param val [0-17]
   */
  ////////////////////////////////////////////////////////////////////////////
  this.setZoom = function(val) {
    if (val !== m_options.zoom) {
      m_options.zoom = val;
      $(this).trigger(geoModule.command.updateViewZoomEvent);
      return true;
    }

    return false;
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Add layer to the map
   *
   * @method addLayer
   * @param {geo.layer} layer to be added to the map
   * @return {Boolean}
   */
  ////////////////////////////////////////////////////////////////////////////
  this.addLayer = function(layer) {
    if (layer !== null) {
      // TODO Check if the layer already exists
      if (!layer.binNumber() || layer.binNumber() === -1) {
        layer.setBinNumber(Object.keys(m_layers).length);
      }

      m_layers[layer.name()] = layer;
      this.predraw();
      this.modified();

      $(this).trigger({
        type: geoModule.command.addLayerEvent,
        layer: layer
      });
      return true;
    }
    return false;
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Remove layer from the map
   *
   * @method removeLayer
   * @param {geo.layer} layer that should be removed from the map
   * @return {Boolean}
   */
  ////////////////////////////////////////////////////////////////////////////
  this.removeLayer = function(layer) {
    if (layer !== null && typeof layer !== 'undefined') {
      m_renderer.removeActor(layer.feature());
      this.modified();
      $(this).trigger({
        type: geoModule.command.removeLayerEvent,
        layer: layer
      });
      return true;
    }

    return false;
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Toggle visibility of a layer
   *
   *  @method toggleLayer
   *  @param {geo.layer} layer
   *  @returns {Boolean}
   */
  ////////////////////////////////////////////////////////////////////////////
  this.toggleLayer = function(layer) {
    if (layer !== null && typeof layer !== 'undefined') {
      layer.setVisible(!layer.visible());
      this.modified();
      $(this).trigger({
        type: geoModule.command.toggleLayerEvent,
        layer: layer
      });
      return true;
    }

    return false;
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Return current or active layer
   *
   * @returns {geo.layer}
   */
  ////////////////////////////////////////////////////////////////////////////
  this.activeLayer = function() {
    return m_activeLayer;
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Make a layer current or active for operations
   *
   * @method selectLayer
   * @param {geo.layer} layer
   * @returns {Boolean}
   *
   */
  ////////////////////////////////////////////////////////////////////////////
  this.selectLayer = function(layer) {
    if (typeof layer !== 'undefined' && m_activeLayer !== layer) {
      m_activeLayer = layer;
      this.modified();
      if (layer !== null) {
        $(this).trigger({
          type: geoModule.command.selectLayerEvent,
          layer: layer
        });
      } else {
        $(this).trigger({
          type: geoModule.command.unselectLayerEvent,
          layer: layer
        });
      }
      return true;
    }

    return false;
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Find layer by layer id
   *
   * @method findLayerById
   * @param {String} layerId
   * @returns {geo.layer}
   */
  ////////////////////////////////////////////////////////////////////////////
  this.findLayerById = function(layerId) {
    if (m_layers.hasOwnProperty(layerId)) {
      return m_layers[layerId];
    }
    return null;
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Manually force to render map
   */
  ////////////////////////////////////////////////////////////////////////////
  this.redraw = function() {
    m_viewer.render();
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Resize map
   *
   * @param {Number} width
   * @param {Number} height
   */
  ////////////////////////////////////////////////////////////////////////////
  this.resize = function(width, height) {
    m_viewer.renderWindow().resize(width, height);
    $(this).trigger({
      type: geoModule.command.resizeEvent,
      width: width,
      height: height
    });
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Toggle country boundaries
   *
   * @returns {Boolean}
   */
  ////////////////////////////////////////////////////////////////////////////
  this.toggleCountryBoundaries = function() {
    var layer, reader, geoms;
    layer = this.findLayerById('country-boundaries');
    if (layer !== null) {
      layer.setVisible(!layer.visible());
      return layer.visible();
    } else {
      // Load countries data first
      reader = ogs.vgl.geojsonReader();
      geoms = reader.readGJObject(ogs.geo.countries);
      // @todo if opacity is on layer, solid color should be too
      layer = ogs.geo.featureLayer({
        "opacity": 1,
        "showAttribution": 1,
        "visible": 1
      }, ogs.geo.multiGeometryFeature(geoms, [1.0,0.5, 0.0]));

      layer.setName('country-boundaries');
      // Use a very high bin number to always draw it last
      layer.setBinNumber(10000);
      this.addLayer(layer);
      return layer.visible();
    }
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Toggle us state boundaries
   *
   * @returns {Boolean}
   */
  ////////////////////////////////////////////////////////////////////////////
  this.toggleStateBoundaries = function() {
    // @todo Implement this
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Update layers
   */
  ////////////////////////////////////////////////////////////////////////////
  this.update = function() {
    // For now update all layers. In the future, we should be
    // able to perform updates based on the layer type
    var layerName = null;
    for (layerName in m_layers) {
      if (m_layers.hasOwnProperty(layerName)) {
        m_layers[layerName].update(m_updateRequest);
      }
    }
  }

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Prepare map for rendering
   */
  ////////////////////////////////////////////////////////////////////////////
  this.predraw = function() {
    var i = 0,
        layerName = 0,
        expiredFreatures = null,
        sortedActors = [];

    m_featureCollection.resetAll();

    for (layerName in m_layers) {
      if (m_layers.hasOwnProperty(layerName)) {
        m_layers[layerName].predraw(m_prepareForRenderRequest);
      }
    }

    if (m_featureCollection.getMTime() >
        m_lastPrepareToRenderingTime.getMTime()) {

      // Remove expired features from the renderer
      for (layerName in m_layers) {
        if (m_featureCollection.expiredFeatures(layerName).length === 0) {
          continue;
        }
        m_renderer.removeActors(
          m_featureCollection.expiredFeatures(layerName));
      }

      // Add new actors (Will do sorting by bin and then material later)
      for (layerName in m_layers) {
        m_renderer.addActors(m_featureCollection.newFeatures(layerName));
      }

      m_lastPrepareToRenderingTime.modified();
    }
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Animate layers of a map
   */
  ////////////////////////////////////////////////////////////////////////////
  this.animate = function(timeRange, layers) {
    if (!timeRange) {
      console.log('[error] Invalid time range');
      return;
    }

    if (timeRange.length < 2) {
      console.log('[error] Invalid time range. Requires atleast begin and end time');
      return;
    }

    var that = this,
        currentTime = timeRange[0],
        endTime = timeRange[timeRange.length - 1],
        index = -1;

    if (timeRange.length > 2) {
      index = 0;
    }

    // Update every 2 ms. Updating every ms might be too much.
    var intervalId = setInterval(frame, 2);
    function frame() {
      var i = 0;
      if (index < 0) {
        ++currentTime;
      } else {
        ++index;
        currentTime = timeRange[index];
      }

      if (currentTime > endTime || index > timeRange.length) {
        clearInterval(intervalId);
      } else {
        for (i = 0; i < layers.length; ++i) {
          layers[i].update(ogs.geo.updateRequest(currentTime));
        }
        $(this).trigger({
          type: geoModule.command.animateEvent,
          currentTime: currentTime,
          endTime: endTime
        });
        that.predraw();
        that.redraw();
      }
    }
  };

  document.onmousedown = m_viewer.handleMouseDown;
  document.onmouseup = m_viewer.handleMouseUp;
  document.onmousemove = m_viewer.handleMouseMove;
  document.oncontextmenu = m_viewer.handleContextMenu;
  HTMLCanvasElement.prototype.relMouseCoords = m_viewer.relMouseCoords;

  // Create map layer
  var mapLayer = geoModule.openStreetMapLayer();
  mapLayer.update(m_updateRequest);
  mapLayer.predraw(m_prepareForRenderRequest);
  this.addLayer(mapLayer);

  // Check if need to show country boundaries
  if (m_options.country_boundaries === true) {
    this.toggleCountryBoundaries();
  }

  return this;
};

inherit(geoModule.map, ogs.vgl.object);
