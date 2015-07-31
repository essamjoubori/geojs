geo.gui.domWidget = function (arg) {
  'use strict';
  if (!(this instanceof geo.gui.domWidget)) {
    return new geo.gui.domWidget(arg);
  }

  geo.gui.widget.call(this, arg);

  var m_this = this,
      m_default_canvas = 'div';

  this._createCanvas = function () {
    m_this.canvas(document.createElement(m_this.args.el || m_default_canvas));
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Appends a child to the widget
   * The widget determines how to append itself to a parent, the parent can either
   * be another widget, or the UI Layer.
   */
  ////////////////////////////////////////////////////////////////////////////
  this._appendChild = function () {
    m_this.parentCanvas().appendChild(m_this.canvas());
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Initializes DOM Widget.
   * Sets the canvas for the widget, does parent/child relationship management,
   * appends it to it's parent and handles any positioning logic.
   */
  ////////////////////////////////////////////////////////////////////////////
  this._init = function (arg) {
    arg = arg || {};
    m_this.args = arg;
    m_this.args.sticky = arg.sticky || false;
    m_this.args.positionType = arg.positionType || 'viewport';

    if (arg.hasOwnProperty('parent') && arg.parent instanceof geo.gui.widget) {
      arg.parent.addChild(m_this);
    }

    m_this._createCanvas();
    m_this._appendChild();

    m_this.canvas().addEventListener('mousedown', function (e) {
      e.stopPropagation();
    });

    this.reposition();
  };

  return this;
};

inherit(geo.gui.domWidget, geo.gui.widget);

geo.registerWidget('dom', 'dom', geo.gui.domWidget);