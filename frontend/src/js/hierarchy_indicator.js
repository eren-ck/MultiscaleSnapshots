/* global d3, event*/
'use strict';

import { drawHierarchy } from './hierarchy';

/**
 * Hierarchy on indicator on the right side with additional information and
 * mouse over stuff
 * Context visulization to keep track of the hierarchy
 * @author Eren Cakmak eren.cakmak@uni-konstanz.de
 */

// DOM Selector
const selTooltip = '#tooltip';

export const HIERARCHY_INDICATOR_WIDTH = 15;

const margin = {
  top: 25,
  right: 2,
  bottom: 20,
  left: 0,
};
let g;
let activeLevels = [];

/**
 * Initialize the graph visualization
 * @param {object} svg  - svg to append the timeline vis
 * @param {number} x  position
 * @param {number} height  height of the g
 * @param {Object} hierarchy  the displayed hierarchy
 */
export function initHIndicator(svg, x, height, hierarchy) {
  g = svg
    .append('g')
    .attr('id', 'hierarchy-indicator-group')
    .attr(
      'transform',
      'translate(' + (x + margin.left) + ', ' + margin.top + ')'
    );

  const rectHeight = (height - margin.bottom) / hierarchy['height'];
  // creates and array from [height, ..., 1]
  const data = Array.from(
    { length: hierarchy['height'] - 1 },
    (v, k) => hierarchy['height'] - k
  );
  // mouse over info
  const levels = hierarchy['levels'];

  const yScale = d3
    .scaleLinear()
    .domain([hierarchy['height'], 2])
    .range([0, height - margin.bottom - rectHeight]);

  g.selectAll('h-indicator')
    .data(data)
    .enter()
    .append('rect')
    .attr('class', 'h-indicator')
    .attr('id', function(d) {
      return 'h-indicator-' + d;
    })
    .attr('x', 0)
    .attr('y', function(d) {
      return yScale(d);
    })
    .attr('width', HIERARCHY_INDICATOR_WIDTH - margin.right)
    .attr('height', rectHeight)
    // additional attributes for mouse over
    .attr('level', function(d) {
      return levels[d] ? levels[d]['level'] : '1';
    })
    .attr('window_size', function(d) {
      return levels[d] ? levels[d]['window_size'] : '1';
    })
    .attr('overlap', function(d) {
      return levels[d] ? levels[d]['overlap'] : '0';
    })
    .on('mouseover', function() {
      d3.select(selTooltip)
        .style('left', x - 200 + 'px')
        .style('top', event.pageY + 'px')
        .classed('hidden', false)
        .select('p')
        .html(
          'Level:' +
            d3.select(this).attr('level') +
            '<br />  Window-size: ' +
            d3.select(this).attr('window_size') +
            '<br />  Overlap: ' +
            d3.select(this).attr('overlap')
        );
    })
    .on('mouseout', function() {
      d3.select(selTooltip).classed('hidden', true);
    })
    .on('click', function() {
      if (d3.select(this).classed('active')) {
        removeActiveLevels(d3.select(this).attr('level'));
      } else {
        addActiveLevel(d3.select(this).attr('level'));
      }
      drawHierarchy();
    });
}

/**
 * Highlight the levels of the indicator
 * @param {Number} level - number of level to highlight
 */
export function addActiveLevel(level) {
  level = String(level);
  activeLevels.push(level);
  // set active again
  activeLevels.forEach(function(d) {
    g.select('#h-indicator-' + d).classed('active', true);
  });
}

/**
 * Remove the levels of the indicator
 * @param {Number} level - number of level to highlight
 */
export function removeActiveLevels(level) {
  // remove the highlighting
  g.selectAll('.h-indicator').classed('active', false);
  activeLevels = activeLevels.filter(function(item) {
    return item !== level;
  });
  // set active again
  activeLevels.forEach(function(d) {
    g.select('#h-indicator-' + d).classed('active', true);
  });
}

/**
 * the active levels
 */
export function getActiveLevels() {
  return activeLevels;
}

/**
 * Reset active levels
 * @param {Array} levels - array of active levels
 */
export function resetActiveLevels(levels) {
  g.selectAll('.h-indicator').classed('active', false);

  activeLevels = levels;

  activeLevels.forEach(function(d) {
    g.select('#h-indicator-' + d).classed('active', true);
  });
}
