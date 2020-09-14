/* global d3,$*/
'use strict';

/**
 * Draw matrix in a hierarchy cell
 * @author Eren Cakmak eren.cakmak@uni-konstanz.de
 */

import { margin } from '../cell.js';
import { filterNode } from '../init.js';

// DOM Selector
const sel = '#matrix-order';
const selCluster = '#button-cluster';

/**
 * Draw the static a graph
 */
export function drawMatrix() {
  const that = this;
  const marginMatrix = {
    left: 10,
    right: 10,
    bottom: 10,
    top: 10,
  };

  const width =
    this._width - marginMatrix['left'] - marginMatrix['right'] - margin;
  const height =
    this._height - marginMatrix['top'] - marginMatrix['bottom'] - margin;

  const clusterBool = $(selCluster).hasClass('active');

  // define the zoom function for the matrix visualization
  // define the zoom for the group
  const zoom = d3
    .zoom()
    .scaleExtent([1, 8])
    .translateExtent([
      [0, 0],
      [width, height],
    ])
    .extent([
      [0, 0],
      [width, height],
    ])
    .on('zoom', function() {
      that._g.attr('transform', d3.event.transform);
    });

  this._zoom.call(zoom);

  // as the links do not have the coordinates of ndoes
  let nodeNames = {};
  this._data['nodes'].forEach(function(d) {
    // check if clustered
    if (clusterBool) {
      d['name'] = Array.isArray(d['name'])
        ? d['name'].slice(0, 2).join(', ')
        : d['name'];
    }
    nodeNames[d['id']] = d['name'];
  });

  // get the layout of columns and rows
  const matrixNodeData = _getLayout(this._data['nodes']);

  // node ids needed for the scale and axis
  const nodeIds = matrixNodeData.map(function(d) {
    return d['id'];
  });

  // first and last id needed for the scales
  const firstId = matrixNodeData[0]['id'];
  const lastId = matrixNodeData[matrixNodeData.length - 1]['id'];

  // create the dataset based on the edge dataset
  const matrixEdgeData = this._data['links']
    .map(function(l) {
      return [
        {
          source: l['source'],
          target: l['target'],
          sentiment: l['sentiment'],
          sourceName: nodeNames[l['source']],
          targetName: nodeNames[l['target']],
        },
        {
          source: l['target'],
          target: l['source'],
          sentiment: l['sentiment'],
          sourceName: nodeNames[l['target']],
          targetName: nodeNames[l['source']],
        },
      ];
    })
    .flat();

  // node height and width
  let nodeWidth = width / nodeIds.length;
  let nodeHeight = height / nodeIds.length;
  // scales
  const xScale = d3
    .scaleBand()
    .range([0, width - nodeWidth])
    .paddingInner(1)
    .align(0)
    .domain(nodeIds);

  const yScale = d3
    .scaleBand()
    .range([0, height - nodeHeight])
    .paddingInner(1)
    .align(0)
    .domain(nodeIds);

  // JOIN the matrix svg group
  const matrixGroup = this._g.selectAll('#matrix-group').data([matrixEdgeData]);
  // ENTER MERGE the matrix group
  const matrixGroupEnter = matrixGroup
    .enter()
    .append('g')
    .merge(matrixGroup)
    .attr('id', 'matrix-group')
    .attr(
      'transform',
      'translate(' + marginMatrix['left'] + ',' + marginMatrix['top'] + ')'
    );
  // EXIT the matrix group
  matrixGroup.exit().remove();

  // JOIN the rows and cols group
  const matrixTableGroup = matrixGroupEnter
    .selectAll('#matrix-table-group')
    .data([matrixNodeData]);
  // ENTER MERGE the table group
  const matrixTableGroupEnter = matrixTableGroup
    .enter()
    .append('g')
    .merge(matrixTableGroup)
    .attr('id', 'matrix-table-group');
  // EXIT the matrix group
  matrixTableGroup.exit().remove();

  // append rows
  // JOIN rows
  const matrixRows = matrixTableGroupEnter
    .selectAll('.matrix-row')
    .data(function(d) {
      return d;
    });

  // ENTER MERGE the rows
  matrixRows
    .enter()
    .append('rect')
    .merge(matrixRows)
    .attr('class', function(d) {
      return 'matrix-row matrix-' + d['id'];
    })
    .attr('width', xScale(lastId) + nodeWidth)
    .attr('height', nodeHeight)
    .transition()
    .delay(function(d, i) {
      return i * 10;
    })
    .attr('x', xScale(firstId))
    .attr('y', function(d) {
      return yScale(d['id']) - yScale(firstId);
    });

  // EXIT ROWS
  matrixRows.exit().remove();

  // JOIN cols
  const matrixCols = matrixTableGroupEnter
    .selectAll('.matrix-col')
    .data(function(d) {
      return d;
    });

  // ENTER MERGE the rects
  matrixCols
    .enter()
    .append('rect')
    .merge(matrixCols)
    .attr('class', function(d) {
      return 'matrix-col matrix-' + d['id'];
    })
    .attr('width', nodeWidth)
    .attr('height', yScale(lastId) + nodeHeight)
    .transition()
    .delay(function(d, i) {
      return i * 10;
    })
    .attr('x', function(d) {
      return xScale(d['id']);
    })
    .attr('y', yScale(firstId));

  // EXIT ROWS
  matrixCols.exit().remove();

  // JOIN the matrix rects with the data
  const matrixRects = matrixGroupEnter
    .selectAll('.matrix-cell')
    .data(function(d) {
      return d;
    });

  // ENTER MERGE the rects
  matrixRects
    .enter()
    .append('rect')
    .merge(matrixRects)
    .filter(function(d) {
      return d && d['source'] && d['target'];
    })
    .attr('class', function(d) {
      return 'matrix-cell s-' + d['source'] + ' t-' + d['target'];
    })
    .attr('stroke-width', function(d) {
      return d['is_cluster'] ? '2px' : '1px';
    })
    .attr('width', nodeWidth)
    .attr('height', nodeHeight)
    .on('mouseover', nodeMouseOver)
    .on('mouseout', nodeMouseOut)
    .on('click', function(d) {
      filterNode(d['sourceName']);
      filterNode(d['targetName']);
    })
    .transition()
    .delay(function(d, i) {
      return i * 10;
    })
    .attr('x', function(d) {
      return xScale(d['source']);
    })
    .attr('y', function(d) {
      return yScale(d['target']);
    })
    .style('fill', function(d) {
      return d['sentiment'] > 0 ? '#4e79a7' : '#e15759';
    });

  // EXIT rects
  matrixRects.exit().remove();

  /**
   * Compute layout of nodes in matrix
   * @param  {Array} nodes    Array of nodes
   * @return {Object} Sorted nodes.
   */
  function _getLayout(nodes) {
    const selected = $(sel + ' option:selected').attr('metric');
    let compare;

    if (selected === 'order-degree') {
      compare = function oName(d1, d2) {
        const a = d1['degree'];
        const b = d2['degree'];
        if (a < b) return 1;
        if (a > b) return -1;
        return 0;
      };
    } else if (selected === 'clustering') {
      compare = function oName(d1, d2) {
        const a = d1['clustering'];
        const b = d2['clustering'];
        if (a < b) return 1;
        if (a > b) return -1;
        return 0;
      };
    } else if (selected === 'degree_centrality') {
      compare = function oName(d1, d2) {
        const a = d1['degree_centrality'];
        const b = d2['degree_centrality'];
        if (a < b) return 1;
        if (a > b) return -1;
        return 0;
      };
    } else if (selected === 'cluster_size') {
      compare = function oName(d1, d2) {
        const a = d1['cluster_size'];
        const b = d2['cluster_size'];
        if (a < b) return -1;
        if (a > b) return 1;
        return 0;
      };
    } else {
      compare = function oName(d1, d2) {
        const a = d1['name'];
        const b = d2['name'];
        if (a < b) return -1;
        if (a > b) return 1;
        return 0;
      };
    }

    return nodes.sort(compare);
  }

  /**
   * Mouse over a cell in the matrix
   * @param {Object} d  edge
   */
  function nodeMouseOver(d) {
    const parent = this.parentNode;
    // fade all other nodes and links
    d3.selectAll('.matrix-row').classed('faded', true);
    d3.selectAll('.matrix-col').classed('faded', true);
    d3.selectAll('.matrix-cell').classed('faded', true);

    // highlighting rows and cols
    d3.selectAll('.matrix-row.matrix-' + d['target'])
      .classed('highlighted', true)
      .raise();
    d3.selectAll('.matrix-col.matrix-' + d['source'])
      .classed('highlighted', true)
      .raise();
    // highlight and rescale cells
    d3.selectAll('.matrix-cell.s-' + d['source'])
      .classed('highlighted', true)
      .raise();

    d3.selectAll('.matrix-cell.t-' + d['target'])
      .classed('highlighted', true)
      .raise();

    // add text labels to the cells
    that._g
      .selectAll('.matrix-cell.s-' + d['source'])
      .nodes()
      .map(function(p) {
        return d3.select(p);
      })
      .forEach(function(cell) {
        d3.select(parent)
          .append('text')
          .attr('dy', '.35em')
          .text(nodeNames[cell.datum()['target']])
          // eslint-disable-next-line max-len
          .attr('x', parseInt(cell.attr('x')) + parseInt(cell.attr('width')))
          .attr(
            'y',
            parseInt(cell.attr('y')) + parseInt(cell.attr('height')) / 2
          );
      });
    that._g
      .selectAll('.matrix-cell.t-' + d['target'])
      .nodes()
      .map(function(p) {
        return d3.select(p);
      })
      .forEach(function(cell) {
        d3.select(parent)
          .append('text')
          .attr('dy', '.35em')
          .text(nodeNames[cell.datum()['source']])
          .attr('x', parseInt(cell.attr('x')))
          .attr('y', parseInt(cell.attr('y')) - 10);
      });
  }

  /**
   * Mouse out over a cell in the matrix
   * @param {Object} d edge
   */
  function nodeMouseOut(d) {
    // fade in all other nodes and links
    d3.selectAll('.matrix-row').classed('faded', false);
    d3.selectAll('.matrix-col').classed('faded', false);
    d3.selectAll('.matrix-cell').classed('faded', false);
    // remove highlighting
    d3.selectAll('.matrix-row.matrix-' + d['target'])
      .classed('highlighted', false)
      .raise();
    d3.selectAll('.matrix-col.matrix-' + d['source'])
      .classed('highlighted', false)
      .raise();
    // highlight and rescale cells
    d3.selectAll('.matrix-cell.s-' + d['source'])
      .classed('highlighted', false)
      .raise();
    d3.selectAll('.matrix-cell.t-' + d['target'])
      .classed('highlighted', false)
      .raise();

    // remove text
    d3.select(this.parentNode)
      .selectAll('text')
      .remove();
  }
}
