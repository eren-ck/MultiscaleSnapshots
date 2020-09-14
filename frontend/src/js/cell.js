/* global d3, $*/

/**
 * Class for the cells in the hierarchy
 * @author Eren Cakmak eren.cakmak@uni-konstanz.de
 */

import { drawStaticGraph } from './vis/graph.js';
import { drawAnimation } from './vis/animation.js';
import { drawMatrix } from './vis/matrix.js';
import { drawTimeline } from './vis/linechart.js';
import { addTimeLineHover } from './timeline.js';
import { drawHierarchy, removeFromHierarchy } from './hierarchy.js';
import { getGraphData, getAnimationData } from './data.js';
import { addMetric, getCellColor } from './graph_metrics.js';
import { addVisited, setSelectedSnapshot } from './query_plot.js';

// DOM Selector
const selSpinner = '#spinner';

export const margin = 5;
const dateTime = d3.timeParse('%a, %d %b %Y %H:%M:%S GMT');
const dateFormat = d3.timeFormat('%x %I%p');

/**
 * Cell is an class which holds all functions and references to all other
 * visualizaton classes. The class is used in the hierarchy view
 * @constructor
 */
export class Cell {
  /**
   * Constructor for the level class
   * @param {svg} g svg group to add the level
   * @param {number} level Level in which the cell is
   * @param {number} pos  position of the cell from right
   * @param {String} graphType  graphtype of the cell
   */
  constructor(g, level, pos, graphType = 'union') {
    // svg group
    this._svg = g;
    // set the level
    this._level = level;
    // position number
    this._position = pos;
    // set abstract value to false
    this._visualize = false;
    // set abstract value to false
    this._abstract = false;
    // get visualization type
    this._visualization = $('input[name="radio-vis-buttons"]:checked').attr(
      'data'
    );
    // OPTIONS ARE
    this._animation = false;
    // animation index
    this._timeIndex = 0;
    // standard type is union
    this._graphType = graphType;
    // get the data from the backend for the cell
    this._data;
    this._animationData;
  }

  /**
   * Draw the cell
   */
  draw() {
    let that = this;
    // add the level group to the svg if not defined
    // faster than enter update exit
    if (this._group === undefined) {
      this.initCell();
    } else {
      this.updateCell();
    }

    // first time data loading
    // load the data and draw
    if (typeof this._data === 'undefined') {
      getGraphData(this._level, this._position, this._graphType).then(function(
        data
      ) {
        that._data = data;
        if (Object.keys(that._data).length === 0) {
          that.redraw();
        } else {
          that._start = that._data['graph']['time'][0];
          that._end = that._data['graph']['time'][1];
          addMetric(
            that._level,
            that._position,
            that._data['graph']['metrics']
          );
          that.redraw();
          // add to visited
          addVisited(that._level, that._start, that._end);
          // update cell color
          that.colorCell();

          // hide the spinner again
          $(selSpinner).hide();
        }
      });
    } else {
      this.redraw();
    }
  }

  /**
   * Visualize the cell
   */
  redraw() {
    let that = this;
    // if data is empty return;
    if (
      Object.keys(this._data).length === 0 ||
      this._data['nodes'].length === 0
    ) {
      // remove other elements
      this._removeAll();

      this._group.selectAll('.cell-empty-text').remove();
      // cell is empty
      this._group
        .append('text')
        .attr('class', 'cell-empty-text')
        .attr('x', this._width / 2)
        .attr('y', this._height / 2)
        .text('No data.');
      this.colorWhite();
      return;
    } else {
      // remove empty text
      this._group.selectAll('.cell-empty-text').remove();
      // update the texts
      this._timeText
        .select('#time-1')
        .text(dateFormat(dateTime(this._start)) + '-');
      this._timeText.select('#time-2').text(dateFormat(dateTime(this._end)));

      this._timeText
        .select('#graph-type-text')
        .text('Graph: ' + this._graphType);
    }

    // if not abstract draw the hierarchy
    if (!this._abstract) {
      // show the buttons
      this._group.selectAll('.cell-hide').classed('hide', false);

      if (this._visualization === 'graph') {
        this._animation = false;
        this.drawStaticGraph();
      } else if (this._visualization === 'animation') {
        //  get the animation data as an array of graphs
        if (typeof this._animationData === 'undefined') {
          getAnimationData(this._level, this._position).then(function(data) {
            that._animationData = data;
            that.drawAnimation();
          });
        } else {
          this.drawAnimation();
        }
      } else if (this._visualization === 'matrix') {
        this._animation = false;
        this.drawMatrix();
      } else if (this._visualization === 'timeline') {
        this._animation = false;
        this.drawTimeline();
      }
      // add the to the timeline hover
      addTimeLineHover(
        this._level,
        this._position,
        dateTime(this._start),
        dateTime(this._end)
      );
    } else {
      // remove if abstract visualization
      this._removeAll();
      // hide some buttons
      this._group.selectAll('.cell-hide').classed('hide', true);
    }
    $(selSpinner).hide();
  }

  /**
   * Initialize the cell with all parts
   */
  initCell() {
    const that = this;
    // svg group first level above the zoom group
    this._group = this._svg
      .append('g')
      .attr('class', 'cell')
      .attr('id', 'cell-' + this._position)
      .attr(
        'transform',
        'translate(' + (this._x + margin) + ', ' + margin + ')'
      )
      // MOUSE over for the timeline hover functionality
      .on('mouseover', function() {
        // hover the timeline
        d3.select('#timeline-hover-' + that._level + '-' + that._position)
          .raise()
          .classed('highlight', true);
      })
      .on('mouseout', function() {
        d3.selectAll('.timeline-hover').classed('highlight', false);
      });

    // background rect for the cell - needed for nice border
    this._groupRect = this._group
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', this._width - 2 * margin)
      .attr('height', this._height - 2 * margin)
      .attr('class', 'cell-rect');

    // add a a clipping path around the group
    this._clip = this._group
      .append('defs')
      .append('clipPath')
      .attr('id', 'clip-' + this._level + '-' + this._position)
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', this._width - 2 * margin)
      .attr('height', this._height - 2 * margin);

    // add the zoom group to the svg
    this._zoom = this._group
      .append('g')
      .attr('class', 'cell-zoom-group')
      .attr(
        'clip-path',
        'url(#clip-' + this._level + '-' + this._position + ')'
      );

    // the group to which the vis content is added
    this._g = this._zoom.append('g');

    // append zoom rectangle to the zoom group
    // a rectangle to active the zoom every where in the group
    this._zoomRect = this._g
      .append('rect')
      .attr('class', 'cell-zoom-group-rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', this._width - 2 * margin)
      .attr('height', this._height - 2 * margin);

    // add buttons to the cell
    this.addButtons();
  }

  /**
   * Update the cell group elements
   */
  updateCell() {
    //
    this._group
      .transition()
      .delay(this._position)
      .attr(
        'transform',
        'translate(' + (this._x + margin) + ', ' + margin + ')'
      );

    this._groupRect
      .transition()
      .delay(this._position)
      .attr('width', this._width - 2 * margin)
      .attr('height', this._height - 2 * margin);

    this._clip
      .attr('width', this._width - 2 * margin)
      .attr('height', this._height - 2 * margin);

    this._zoomRect
      .attr('width', this._width - 2 * margin)
      .attr('height', this._height - 2 * margin);

    this._group
      .select('.vis-buttons')
      .attr('transform', 'translate(' + (this._width - 25) + ',0) scale(0.66)');
  }

  /**
   * Animation of a Graph
   */
  play() {
    if (this._animation) {
      const that = this;
      this._timeIndex = (this._timeIndex + 1) % this._animationData.length;
      this.redraw();
      this.sliderUpdate();
      setTimeout(function() {
        // Something you want delayed.
        that.play();
      }, 1000);
    }
  }

  /**
   * Add svg buttons to the cell
   * e.g. abstract button
   */
  addButtons() {
    const that = this;
    // the group for all buttons
    const buttonsGroupLeft = this._group
      .append('g')
      .attr('class', 'cell-buttons')
      // change size of svg icons to 16px-16px
      .attr('transform', 'translate(0,0) scale(0.66)');

    // unfold button - needed in order to make the cell abstract
    const cellUnfold =
      'M18.17,12L15,8.83L16.41,7.41L21,12L16.41,16.58L15,15.17L18.17,12M5.83,' +
      '12L9,15.17L7.59,16.59L3,12L7.59,7.42L9,8.83L5.83,12Z';
    const unfoldGroup = buttonsGroupLeft
      .append('g')
      .attr('class', 'cell-button unfold-group')
      .on('click', function() {
        // set abstract value
        that._abstract = !that._abstract;
        drawHierarchy();
      });

    unfoldGroup
      .append('rect')
      .attr('class', 'button-rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 24)
      .attr('height', 24);

    unfoldGroup
      .append('path')
      .attr('class', 'unfold-icon')
      .attr('d', cellUnfold);

    // remove select button
    const cellSelect =
      'M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z';
    const selectGroup = buttonsGroupLeft
      .append('g')
      .attr('class', 'cell-button cell-hide select-group')
      .attr('transform', 'translate(24,0)')
      .on('click', function() {
        setSelectedSnapshot(
          that._level,
          that._start,
          that._end,
          that._position,
          that._graphType,
          that._data['graph']['embeddings']
        );
      });

    selectGroup
      .append('rect')
      .attr('class', 'button-rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 24)
      .attr('height', 24);

    selectGroup
      .append('path')
      .attr('class', 'select-icon')
      .attr('d', cellSelect);

    // remove cell button
    const cellRemove =
      'M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z';
    const removeGroup = buttonsGroupLeft
      .append('g')
      .attr('class', 'cell-button cell-hide remove-group')
      .attr('transform', 'translate(48,0)')
      .on('click', function() {
        that._group.remove();
        // that._removeAll();
        removeFromHierarchy(that._level, that._position);
      });

    removeGroup
      .append('rect')
      .attr('class', 'button-rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 24)
      .attr('height', 24);

    removeGroup
      .append('path')
      .attr('class', 'remove-icon')
      .attr('d', cellRemove);

    // add summary graph type icons
    const cellUnion =
      'M9,5C10.04,5 11.06,5.24 12,5.68C12.94,5.24 13.96,5 15,5A7,7 0 0,1 22,12A7,7 0 0,1 15,19C13.96,19 12.94,18.76 12,18.32C11.06,18.76 10.04,19 9,19A7,7 0 0,1 2,12A7,7 0 0,1 9,5M8.5,12C8.5,13.87 9.29,15.56 10.56,16.75L11.56,16.29C10.31,15.29 9.5,13.74 9.5,12C9.5,10.26 10.31,8.71 11.56,7.71L10.56,7.25C9.29,8.44 8.5,10.13 8.5,12M15.5,12C15.5,10.13 14.71,8.44 13.44,7.25L12.44,7.71C13.69,8.71 14.5,10.26 14.5,12C14.5,13.74 13.69,15.29 12.44,16.29L13.44,16.75C14.71,15.56 15.5,13.87 15.5,12Z';
    const unionGroup = buttonsGroupLeft
      .append('g')
      .attr('class', 'cell-button cell-hide unfold-group')
      .attr('transform', 'translate(72,0)')
      .on('click', function() {
        if (that._graphType !== 'union') {
          that._data = undefined;
          that._graphType = 'union';
          that.draw();
        }
      });

    unionGroup
      .append('rect')
      .attr('class', 'button-rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 24)
      .attr('height', 24);

    unionGroup
      .append('path')
      .attr('class', 'union-icon')
      .attr('d', cellUnion);

    const cellIntersection =
      'M9,5A7,7 0 0,0 2,12A7,7 0 0,0 9,19C10.04,19 11.06,18.76 12,18.32C12.94,18.76 13.96,19 15,19A7,7 0 0,0 22,12A7,7 0 0,0 15,5C13.96,5 12.94,5.24 12,5.68C11.06,5.24 10.04,5 9,5M9,7C9.34,7 9.67,7.03 10,7.1C8.72,8.41 8,10.17 8,12C8,13.83 8.72,15.59 10,16.89C9.67,16.96 9.34,17 9,17A5,5 0 0,1 4,12A5,5 0 0,1 9,7M15,7A5,5 0 0,1 20,12A5,5 0 0,1 15,17C14.66,17 14.33,16.97 14,16.9C15.28,15.59 16,13.83 16,12C16,10.17 15.28,8.41 14,7.11C14.33,7.04 14.66,7 15,7Z';
    const intersectionGroup = buttonsGroupLeft
      .append('g')
      .attr('class', 'cell-button cell-hide intersection-group')
      .attr('transform', 'translate(96,0)')
      .on('click', function() {
        if (that._graphType !== 'intersection') {
          that._data = undefined;
          that._graphType = 'intersection';
          that.draw();
        }
      });

    intersectionGroup
      .append('rect')
      .attr('class', 'button-rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 24)
      .attr('height', 24);

    intersectionGroup
      .append('path')
      .attr('class', 'intersection-icon')
      .attr('d', cellIntersection);

    const cellDisjoint =
      'M9,5C10.04,5 11.06,5.24 12,5.68C12.94,5.24 13.96,5 15,5A7,7 0 0,1 22,12A7,7 0 0,1 15,19C13.96,19 12.94,18.76 12,18.32C11.06,18.76 10.04,19 9,19A7,7 0 0,1 2,12A7,7 0 0,1 9,5M9,12C9,14.22 10.21,16.16 12,17.2C13.79,16.16 15,14.22 15,12C15,9.78 13.79,7.84 12,6.8C10.21,7.84 9,9.78 9,12Z';
    const disjointGroup = buttonsGroupLeft
      .append('g')
      .attr('class', 'cell-button cell-hide disjoint-group')
      .attr('transform', 'translate(120,0)')
      .on('click', function() {
        if (that._graphType !== 'disjoint') {
          that._data = undefined;
          that._graphType = 'disjoint';
          that.draw();
        }
      });

    disjointGroup
      .append('rect')
      .attr('class', 'button-rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 24)
      .attr('height', 24);

    disjointGroup
      .append('path')
      .attr('class', 'disjoint-icon')
      .attr('d', cellDisjoint);

    // The text information below the buttons
    this._timeText = buttonsGroupLeft
      .append('g')
      .attr('class', 'cell-buttons cell-hide cell-text-group')
      .attr('transform', 'translate(0,25)');

    this._timeText
      .append('text')
      .attr('class', 'cell-text')
      .attr('id', 'time-1')
      .attr('x', 0)
      .attr('y', 20);

    this._timeText
      .append('text')
      .attr('class', 'cell-text')
      .attr('id', 'time-2')
      .attr('x', 0)
      .attr('y', 40);

    this._timeText
      .append('text')
      .attr('class', 'cell-text')
      .attr('id', 'graph-type-text')
      .attr('x', 0)
      .attr('y', 60);
    // visualization buttons on the right side
    const buttonsGroupRight = this._group
      .append('g')
      .attr('class', 'cell-buttons cell-hide vis-buttons')
      // change size of svg icons to 16px-16px
      .attr('transform', 'translate(' + (this._width - 25) + ',0) scale(0.66)');

    // unfold button - needed in order to make the cell abstract
    const cellGraph =
      'M4,9C5.31,9 6.42,9.83 6.83,11H17.17C17.58,9.83 18.69,9 20,9A3,3 0 0,' +
      '1 23,12A3,3 0 0,1 20,15C18.69,15 17.58,14.17 17.17,13H6.83C6.42,14.17 ' +
      '5.31,15 4,15A3,3 0 0,1 1,12A3,3 0 0,1 4,9Z';
    const graphGroup = buttonsGroupRight
      .append('g')
      .attr('class', 'cell-button graph-group')
      .on('click', function() {
        if (that._visualization !== 'graph') {
          that._removeAll();
          that._visualization = 'graph';
          that.draw();
        }
      });

    graphGroup
      .append('rect')
      .attr('class', 'button-rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 24)
      .attr('height', 24);

    graphGroup
      .append('path')
      .attr('id', 'graph-icon')
      .attr('d', cellGraph);

    // add the open animation button
    const cellAnimation =
      'M4,2H14V4H4V14H2V4C2,2.89 2.89,2 4,2M8,6H18V8H8V18H6V8C6,6.89 6.89,' +
      '6 8,6M12,10H20C21.11,10 22,10.89 22,12V20C22,21.11 21.11,22 20,22H12C10' +
      '.89,22 10,21.11 10,20V12C10,10.89 10.89,10 12,10M14,12V20L20,16L14,12Z';
    const animationGroup = buttonsGroupRight
      .append('g')
      .attr('class', 'cell-button animation-group')
      // change size of svg to 16px-16px
      .on('click', function() {
        if (that._visualization !== 'animation') {
          that._removeAll();
          that._visualization = 'animation';
          that.draw();
        }
      });

    animationGroup
      .append('rect')
      .attr('class', 'button-rect')
      .attr('x', 0)
      .attr('y', 24)
      .attr('width', 24)
      .attr('height', 24);

    animationGroup
      .append('path')
      .attr('class', 'animation-icon')
      // translate to the second position
      .attr('transform', 'translate(0,24)')
      .attr('d', cellAnimation);

    // add the open hierarchy button
    const cellMatrix = 'M3,3H21V21H3V3M5,5V12H12V19H19V12H12V5H5Z';
    const matrixGroup = buttonsGroupRight
      .append('g')
      .attr('class', 'cell-button matrix-group')
      // change size of svg to 16px-16px
      .on('click', function() {
        if (that._visualization !== 'matrix') {
          that._removeAll();
          that._visualization = 'matrix';
          that.draw();
        }
      });

    matrixGroup
      .append('rect')
      .attr('class', 'button-rect')
      .attr('x', 0)
      .attr('y', 48)
      .attr('width', 24)
      .attr('height', 24);

    matrixGroup
      .append('path')
      .attr('class', 'matrix-icon')
      // translate to the second position
      .attr('transform', 'translate(0,48)')
      .attr('d', cellMatrix);

    // add the open hierarchy button
    const cellTimeline =
      'M16,11.78L20.24,4.45L21.97,5.45L16.74,14.5L10.23,10.75L5.46,' +
      '19H22V21H2V3H4V17.54L9.5,8L16,11.78Z';
    const timelineGroup = buttonsGroupRight
      .append('g')
      .attr('class', 'cell-button timeline-group')
      // change size of svg to 16px-16px
      .on('click', function() {
        if (that._visualization !== 'timeline') {
          that._removeAll();
          that._visualization = 'timeline';
          that.draw();
        }
      });

    timelineGroup
      .append('rect')
      .attr('class', 'button-rect')
      .attr('x', 0)
      .attr('y', 72)
      .attr('width', 24)
      .attr('height', 24);

    timelineGroup
      .append('path')
      .attr('class', 'timeline-icon')
      // translate to the second position
      .attr('transform', 'translate(0,72)')
      .attr('d', cellTimeline);
  }

  /**
   * Color the cell white
   */
  colorWhite() {
    this._groupRect.attr('fill', '#fff');
    this._zoomRect.attr('fill', '#fff');
  }

  /**
   * Set the height of the cell
   * @param {number} height
   */
  colorCell() {
    if (
      typeof this._data !== 'undefined' &&
      this._data['graph'] &&
      this._data['graph']['metrics']
    ) {
      let color = getCellColor(this._data['graph']['metrics']);
      this._groupRect.attr('fill', color);
      this._zoomRect.attr('fill', color);
    } else {
      this.colorWhite();
    }
  }
  /**
   * Reset the data of the level
   */
  resetData() {
    this._data = undefined;
    if (this._visualize) {
      this.draw();
    }
  }

  /**
   * remove if abstract visualization
   */
  _removeAll() {
    this._g.selectAll('*').remove();
  }

  /**
   * SETTER AND GETTER
   */

  /**
   * Set the height of the cell
   * @param {number} height
   */
  set height(height) {
    this._height = height;
  }

  /**
   * Get the height of the cell
   */
  get height() {
    return this._height;
  }

  /**
   * Set the width of the cell
   * @param {number} width
   */
  set width(width) {
    this._width = width;
  }

  /**
   * Get the width of the cell
   */
  get width() {
    return this._width;
  }

  /**
   * Set the x position of the cell
   * @param {number} d
   */
  set x(d) {
    this._x = d;
  }

  /**
   * Get the X position of the cell
   */
  get x() {
    return this._x;
  }

  /**
   * Get the position
   */
  get position() {
    return this._position;
  }

  /**
   * Set the abstract value of the cell
   * @param {Boolean} d
   */
  set abstract(d) {
    this._abstract = d;
  }

  /**
   * Get the abstract value for the cell
   */
  get abstract() {
    return this._abstract;
  }

  /**
   * Set the visualize value of the cell
   * @param {Boolean} d
   */
  set visualize(d) {
    this._visualize = d;
  }

  /**
   * Get the visualize value for the cell
   */
  get visualize() {
    return this._visualize;
  }
  /**
   * Set the graph type of the cell deletes also the old data
   * @param {String} graphType
   */
  set graphType(graphType) {
    this._graphType = graphType;
    this._data = undefined;
  }

  /**
   * Get the visualize value for the cell
   */
  get graphType() {
    return this._graphType;
  }

  /**
   * Get the start time instance
   */
  get start() {
    return this._start;
  }

  /**
   * Get the end time instance
   */
  get end() {
    return this._end;
  }

  /**
   * Get the visualization type
   */
  get vis() {
    return this._visualization;
  }

  /**
   * Set the visualization type
   * @param {Object} d
   */
  set vis(d) {
    this._removeAll();
    this._visualization = d;
  }
}

/**
 * External functions for drawing the visualizations in the cell
 * This is done to split the cell class file into multiple files
 */
Cell.prototype.drawStaticGraph = drawStaticGraph;
Cell.prototype.drawAnimation = drawAnimation;
Cell.prototype.drawMatrix = drawMatrix;
Cell.prototype.drawTimeline = drawTimeline;
