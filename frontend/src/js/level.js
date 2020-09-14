/* global $,d3*/
'use strict';

/**
 * Class for the level in the hierarchy
 * @author Eren Cakmak eren.cakmak@uni-konstanz.de
 */

import { Cell } from './cell.js';
import { drawHierarchy, getMaxCells } from './hierarchy.js';
import { checkGraphData } from './data.js';

const ABSTRACT_WIDTH = 32; // width of an abstract cell in px
const dateTime = d3.timeParse('%a, %d %b %Y %H:%M:%S GMT');

const selAutoCollapse = '#auto-collapse-checkbox';

/**
 * Level is an class which holds all functions
 * The class is used in the hierarchy view
 */
export class Level {
  /**
   * Constructor for the level class
   * @param {svg} g  svg group to add the level
   * @param {number} level  height if the level
   * @param {number} numGraphs  number of graphs
   * @param {number} width  Width of the level
   * @param {number} window_size  Window size of the level
   * @param {number} overlap   Overlap size
   */
  constructor(g, level, numGraphs, width, window_size, overlap) {
    // svg group
    this._svg = g;
    // level number
    this._level = level;
    // number of snapshots
    this._numCells = Math.ceil(numGraphs / overlap);
    // width of the level
    this._width = width;
    // default height
    this._height = 0;
    // window size
    this._window_size = window_size;
    // overlap
    this._overlap = overlap;
    // draw default is false
    this._visualize = false;
    // abstract default is false
    this._abstract = false;
    // set the y position default is zero
    this._y = 0;
    // the cells on the specific level
    this._cells = {};
    // changed variable - if true draw all children again
    this._changed = false;

    // initialize the level
    this._g = this._svg
      .append('g')
      .attr('class', 'level hidden')
      .attr('id', 'level-' + this._level)
      .attr('transform', 'translate(0,' + this._y + ')');
    // add the background rectangle
    this._rect = this._g
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', this._width)
      .attr('height', this._height)
      .attr('class', 'level-rect');
    // add buttons
    this.addButtons();
  }

  /**
   * Draw the level elements
   */
  draw() {
    // update the group
    this._g.attr('transform', 'translate(0,' + this._y + ')');
    // update the background rectangle
    this._rect.attr('height', this._height);

    if (this._visualize) {
      this._g.classed('hidden', false);
      // if cells is empty
      if (Object.keys(this._cells).length === 0) {
        this._cells[0] = new Cell(this._g, this._level, 0);
        this._cells[0]['visualize'] = true;
      }
      // redraw cells
      this.drawCells();
    } else {
      this._g.classed('hidden', true);
    }
  }

  /**
   * Draw the children cells of the level
   * only called if something changed on the data side
   * e.g. abstract button
   */
  drawCells() {
    // the new cell widths for normal cells and abstract cells
    const cellWidth = this._getWidthCell();
    const cellWidthAbstract = this._getWidthAbstractCell();
    let x = 0;

    // if undefined the computation of the cell width
    // so stop the draw mechanism right now
    if (cellWidth === undefined) {
      return;
    }

    // get the cell positions sorted
    let cellsPos = Object.keys(this._cells)
      .map(Number)
      .sort(function(a, b) {
        return a - b;
      });

    for (let i = 0; i < cellsPos.length; i++) {
      if (this._cells[cellsPos[i]]['visualize']) {
        // the cell for the itaeration
        const cell = this._cells[cellsPos[i]];
        // set cell values
        cell['height'] = this._height;
        cell['width'] = cell['abstract'] ? cellWidthAbstract : cellWidth;
        // set x and y position
        cell['x'] = x;
        x = x + cell['width'];
        // draw the level
        cell.draw();
      }
    }
    // color the cells
    for (let i = 0; i < cellsPos.length; i++) {
      if (this._cells[cellsPos[i]]['visualize']) {
        const cell = this._cells[cellsPos[i]];
        // draw the level
        cell.colorCell();
      }
    }
    // update buttons
    this.updateButtons();

    // collapse cells if required
    // auto collapse
    if ($(selAutoCollapse).is(':checked')) {
      const maxCell = getMaxCells();
      this.autoCollapseCells(maxCell);
    }
  }

  /**
   * Add a cell of level n with position num
   * @param {number} position  position of the snapshot
   * @param {String} graphType  Graph Type of the snapshot
   */
  addCell(position, graphType = 'union') {
    this._cells[position] = new Cell(this._g, this._level, position, graphType);
    this._cells[position]['visualize'] = true;
    this.draw();
  }

  /**
   * Remove the cell
   * @param {number} position  position of the snapshot
   */
  removeCell(position) {
    delete this._cells[position];
    drawHierarchy();
  }

  /**
   * Check if the level is abstract if it is - all children cells are abstract
   * set it to abstract
   */
  checkIfAbstract() {
    let bool = true;
    Object.values(this._cells).forEach(function(cell) {
      if (!cell.abstract) {
        bool = false;
      }
    });
    this._abstract = bool;
  }

  /**
   * Add svg buttons to the level
   * e.g. abstract button
   */
  addButtons() {
    const that = this;

    // unfold button - needed in order to make the level abstract
    const levelUnfold =
      'M12,18.17L8.83,15L7.42,16.41L12,21L16.59,16.41L15.17,15M12,5.83L15.17,' +
      '9L16.58,7.59L12,3L7.41,7.59L8.83,9L12,5.83Z';

    const unfoldGroup = this._g
      .append('g')
      .attr('class', 'level-unfold-group')
      // change size of svg to 16px-16px
      .attr(
        'transform',
        'translate(' + -10 + ',' + this._height / 2 + ') scale(0.66)'
      )
      .on('click', function() {
        // set abstract value
        that.abstract = !that._abstract;
        drawHierarchy();
      });

    unfoldGroup
      .append('rect')
      .attr('class', 'level-unfold-group-rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 24)
      .attr('height', 24);

    unfoldGroup
      .append('path')
      .attr('class', 'level-unfold-group-icon')
      .attr('d', levelUnfold);

    const addCellButtons = this._g
      .append('g')
      .attr('class', 'add-cell-buttons')
      .attr('transform', 'translate(0,' + this._height / 2 + ') ');

    // add left cell
    const cellLeft = 'M20,9V15H12V19.84L4.16,12L12,4.16V9H20Z';
    const addLeftGroup = addCellButtons
      .append('g')
      .attr('class', 'cell-button add-left-group')
      .attr('transform', 'translate(' + -10 + ', 0) scale(0.66)')
      .on('click', function() {
        // get the min position and minus 1
        const minPos = d3.min(Object.values(that._cells), function(cell) {
          return cell.position;
        });
        const promise = checkGraphData(that._level, minPos - 1);
        promise.then(function(bool) {
          if (bool) {
            that.addCell(minPos - 1);
          }
        });
      });

    addLeftGroup
      .append('rect')
      .attr('class', 'button-rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 24)
      .attr('height', 24);

    addLeftGroup
      .append('path')
      .attr('class', 'left-icon')
      .attr('d', cellLeft);

    // add right cell
    const cellRight = 'M4,15V9H12V4.16L19.84,12L12,19.84V15H4Z';
    const addRightGroup = addCellButtons
      .append('g')
      .attr('class', 'cell-button add-right-group')
      .on('click', function() {
        const maxPos = d3.max(Object.values(that._cells), function(cell) {
          return cell.position;
        });
        const promise = checkGraphData(that._level, maxPos + 1);
        promise.then(function(bool) {
          if (bool) {
            that.addCell(maxPos + 1);
          }
        });
      });

    addRightGroup
      .append('rect')
      .attr('class', 'button-rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 24)
      .attr('height', 24);

    addRightGroup
      .append('path')
      .attr('class', 'right-icon')
      .attr('d', cellRight);
  }

  updateButtons() {
    const h = this._height / 2;
    this._g
      .select('.level-unfold-group')
      .attr('transform', 'translate(' + -10 + ',' + h + ') scale(0.66)');

    if (this._abstract) {
      this._g.select('.add-cell-buttons').classed('hidden', true);
    } else {
      this._g.select('.add-cell-buttons').classed('hidden', false);
      // d3 raise and update left and right buttons
      d3.selectAll('.add-cell-buttons').raise();
      const h2 = h + 20;
      this._g
        .select('.add-cell-buttons')
        .attr('transform', 'translate(0,' + h2 + ')');

      const w = this._width - 16;
      this._g
        .select('.add-right-group')
        .attr('transform', 'translate(' + w + ',0) scale(0.66)');
    }
  }

  /**
   * Change the visualization of all cells if necessary
   */
  changeVis() {
    Object.values(this._cells).forEach(function(cell) {
      const newVis = $('input[name="radio-vis-buttons"]:checked').attr('data');
      if (cell.vis !== newVis) {
        cell.vis = newVis;
        cell.draw();
      }
    });
  }

  /**
   * Change the displayed graph type of all cells
   */
  changeGraphType(graphType) {
    Object.values(this._cells).forEach(function(cell) {
      if (cell.graphType !== graphType) {
        cell.graphType = graphType;
        if (cell['visualize']) {
          cell.draw();
        }
      }
    });
  }

  /**
   * reset the data of the whole level
   */
  resetData() {
    Object.values(this._cells).forEach(function(cell) {
      cell.resetData();
    });
  }

  /**
   * reset the data of the whole level
   */
  getVisualizedTime() {
    const result = [];
    Object.values(this._cells).forEach(function(cell) {
      if (cell.visualize) {
        result.push({ time1: dateTime(cell.start), time2: dateTime(cell.end) });
      }
    });
    return result;
  }

  /**
   * Change the visualization of all cells if necessary
   */
  hideCells() {
    Object.values(this._cells).forEach(function(cell) {
      cell.abstract = true;
    });
  }

  /**
   * Compute the width for an normal cell
   * @param {Number} maxCell max number of visualized cells per level
   */
  autoCollapseCells(maxCell) {
    let that = this;
    setTimeout(function() {
      // how many cells are visualized
      const visCells = Object.values(that._cells).reduce(
        (n, cell) => n + (cell['visualize'] && !cell['abstract']),
        0
      );

      // check each level and how many cells and collapse
      // easier version of the previous matching process
      if (visCells > maxCell) {
        // abstract the highest level
        let tmpBool = true; // the max level
        Object.values(that._cells).forEach(function(cell) {
          if (cell['visualize'] && !cell['abstract'] && tmpBool) {
            cell.abstract = true;
            tmpBool = false;
            that.draw();
          }
        });
      }
    }, 3000);
  }

  /**
   * Compute the width for an normal cell
   * @return {number} width of the cell.
   */
  _getWidthCell() {
    const numCells = Object.entries(this._cells).length;
    let numAbstractCells = 0;
    for (let cell of Object.values(this._cells)) {
      if (cell['abstract'] === true) {
        numAbstractCells = numAbstractCells + 1;
      }
    }
    // set the level above as abstract if all cells are abstract
    if (numCells === numAbstractCells) {
      this._abstract = true;
      return this._width / numCells;
    }
    // return the width of the cells
    return (
      (this._width - numAbstractCells * ABSTRACT_WIDTH) /
      (numCells - numAbstractCells)
    );
  }

  /**
   * Compute the width for an (abstract) cell
   * @return {number} width for an abstrac cell
   */
  _getWidthAbstractCell() {
    const numCells = Object.entries(this._cells).length;
    let numAbstractCells = 0;
    for (let cell of Object.values(this._cells)) {
      if (cell['abstract'] === true) {
        numAbstractCells = numAbstractCells + 1;
      }
    }
    if (numCells === numAbstractCells) {
      // if use whole width for the abstract cells
      return this._width / numCells;
    }
    return ABSTRACT_WIDTH;
  }

  /**
   * SETTER AND GETTER
   */

  /**
   * Set the height of the level
   * @param {number} height
   */
  set height(height) {
    this._height = height;
  }

  /**
   * Get the height of the level
   */
  get height() {
    return this._height;
  }

  /**
   * Set the y position of the level
   * @param {number} d
   */
  set y(d) {
    this._y = d;
  }

  /**
   * Get the Y position of the level
   */
  get y() {
    return this._y;
  }

  /**
   * Set the abstract
   * @param {Boolean} d
   */
  set abstract(d) {
    this._abstract = d;
    // set all child levels also
    Object.values(this._cells).forEach(function(cell) {
      cell.abstract = d;
    });
  }

  /**
   * Get the abstract boolean
   */
  get abstract() {
    return this._abstract;
  }

  /**
   * Set the visulization
   * @param {Boolean} d
   */
  set visualize(d) {
    this._visualize = d;
  }

  /**
   * Get the visulization value
   */
  get visualize() {
    return this._visualize;
  }

  /**
   * Get the level value (number)
   */
  get level() {
    return this._level;
  }

  /**
   * Get the changed boolean
   */
  get changed() {
    return this._changed;
  }

  /**
   * Set the changed boolean
   * @param {Boolean} d
   */
  set changed(d) {
    this._changed = d;
  }

  /**
   * Return the data of the underlying cells
   */
  get data() {
    return Object.values(this._cells).map(function(cell) {
      return cell['data'];
    });
  }

  /**
   * Return the start number
   */
  get start() {
    return this._start;
  }

  /**
   * Return the end number
   */
  get end() {
    return this._end;
  }
}
