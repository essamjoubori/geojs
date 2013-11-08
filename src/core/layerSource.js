//////////////////////////////////////////////////////////////////////////////
/**
 * @module ogs.geo
 */

/*jslint devel: true, forin: true, newcap: true, plusplus: true*/
/*jslint white: true, indent: 2*/

/*global geoModule, ogs, inherit, $, HTMLCanvasElement, Image*/
/*global vglModule, document*/
//////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////
/**
 * layerSource provides data to a layer
 */
//////////////////////////////////////////////////////////////////////////////
geoModule.layerSource = function(id, name, path) {
  'use strict';

   /** @private */
  var m_requestDataMTime = vglModule.timestamp(),
      m_id = id,
      m_name = name,
      m_path = path;

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Return layer source modified time
   *
   * @returns {*}
   */
  ////////////////////////////////////////////////////////////////////////////
  this.requestDataMTime = function() {
      return m_requestDataMTime;
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Update the layer source MTime
   */
  ////////////////////////////////////////////////////////////////////////////
  this.requestDataMTimeModified = function() {
      // TODO Check for caller here
      m_requestDataMTime.modified();
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Return id of the layer source
   *
   * @returns {string}
   */
  ////////////////////////////////////////////////////////////////////////////
  this.id = function() {
    return m_id;
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Set id of the layer source
   */
  ////////////////////////////////////////////////////////////////////////////
  this.setId = function(id) {
    if (id !== null && m_id !== id) {
      m_id = id;
      this.modified();
      return true;
    }
    return false;
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Return name of the layer source
   *
   * @returns {string}
   */
  ////////////////////////////////////////////////////////////////////////////
  this.name = function() {
    return m_name;
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Set name of the layer source
   */
  ////////////////////////////////////////////////////////////////////////////
  this.setName = function(name) {
    if (name !== null && m_name !== name) {
      m_name = name;
      this.modified();
      return true;
    }

    return false;
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Return path of the raw data source
   *
   * @returns {string}
   */
  ////////////////////////////////////////////////////////////////////////////
  this.path = function() {
    return m_path;
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Set path of the raw data source
   */
  ////////////////////////////////////////////////////////////////////////////
  this.setPath = function(path) {
    if (path !== null && m_path !== path) {
      m_path = path;
      this.modified();
      return true;
    }
    return false;
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Should be implemented by a concrete class
   */
  ////////////////////////////////////////////////////////////////////////////
  this.init = function() {
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Should be implemented by a concrete class
   */
  ////////////////////////////////////////////////////////////////////////////
  this.destroy = function() {
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Should be implemented by a concrete class
   */
  ////////////////////////////////////////////////////////////////////////////
  this.getData = function(time) {
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Should be implemented by a concrete class
   */
  ////////////////////////////////////////////////////////////////////////////
  this.getMetaData = function() {
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Should be implemented by a concrete class
   */
  ////////////////////////////////////////////////////////////////////////////
  this.getTimeRange = function(varname) {
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Should be implemented by a concrete class
   */
  ////////////////////////////////////////////////////////////////////////////
  this.getSpatialRange = function(varname) {
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Should be implemented by a concrete class
   */
    ////////////////////////////////////////////////////////////////////////////
  this.getScalarRange = function(varname) {
  };
};

inherit(geoModule.layerSource, vglModule.object);
