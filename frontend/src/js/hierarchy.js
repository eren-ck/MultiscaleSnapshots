/* global d3, $*/
'use strict';

/**
 * Oranize the hierarchy in the overview visualization
 * This a a singleton pattern
 * @author Eren Cakmak eren.cakmak@uni-konstanz.de
 */

import { Level } from './level.js';

import {
  initTimeline,
  TIMELINE_HEIGHT,
  removeHoverTimeline,
} from './timeline.js';
import {
  HIERARCHY_INDICATOR_WIDTH,
  initHIndicator,
  getActiveLevels,
  resetActiveLevels,
  addActiveLevel,
} from './hierarchy_indicator.js';

// DOM Selector
const selHierarchy = '#hierarchy-vis svg';
const selAutoCollapse = '#auto-collapse-checkbox';

const ABSTRACT_HEIGHT = 32; // height of an abstract level in pixel
// the variables for the hierarchy
let svg;
let g;
let height;
let width;
const margin = {
  top: 5,
  right: 20,
  bottom: 10,
  left: 10,
  gap: 4,
};

let hierarchy = {};

// auto-collapse standard parameters
let maxLevels = 6;
let maxCells = 6;

/**
 * Initilaize the hierarchy
 */
export function initHierarchy(data) {
  hierarchy = data;
  // get the svg data
  svg = d3.select(selHierarchy);
  // regex for floats
  const floatValues = /[+-]?([0-9]*[.])?[0-9]+/;
  height =
    +svg.style('height').match(floatValues)[0] -
    margin['bottom'] -
    margin['top'] -
    TIMELINE_HEIGHT;
  width =
    +svg.style('width').match(floatValues)[0] -
    margin['left'] -
    margin['right'] -
    HIERARCHY_INDICATOR_WIDTH;
  // append g group with margins
  g = svg
    .append('g')
    .attr(
      'transform',
      'translate(' + margin.left + ', ' + (margin.top + TIMELINE_HEIGHT) + ')'
    );

  // initialize the context timeline
  initTimeline(svg, width, hierarchy['time_1'], hierarchy['time_2']);
  initHIndicator(svg, width, height, hierarchy);

  width = width - 15; // this is a fix for overlap with the right context bar
  height = height - 5;

  // append the first levels
  defaultHierarchy();
}
/**
 * Draw the default hierarchy
 */
export function defaultHierarchy() {
  g.selectAll('.level').remove();

  // set the root levels as drawn
  Object.keys(hierarchy['levels']).forEach(function(key) {
    let level = hierarchy['levels'][key];
    level['class'] = new Level(
      g,
      key,
      hierarchy['time_steps'],
      width,
      level['window_size'],
      level['overlap']
    );
  });
  resetActiveLevels([String(hierarchy['height'])]);
  // draw hierarchy
  drawHierarchy();
}

/**
 * Draw and update the hierarchy
 */
export function drawHierarchy() {
  // remove the hover highlights for the timeline
  removeHoverTimeline();

  // get the active levels from the hierarchy indicator
  const activeLevels = getActiveLevels();
  Object.keys(hierarchy['levels']).forEach(function(key) {
    if (activeLevels.includes(key)) {
      hierarchy['levels'][key]['class']['visualize'] = true;
    } else {
      hierarchy['levels'][key]['class']['visualize'] = false;
    }
  });

  const heightNormalLevel = _getHeightLevel();
  const heightAbstractLevel = ABSTRACT_HEIGHT;

  // iterate and draw hierarhcy using the hierarch object
  let y = 0;
  for (let i = hierarchy['height']; i >= 2; i--) {
    const level = hierarchy['levels'][i]['class'];
    if (level['visualize']) {
      // level.checkIfAbstract();
      level['y'] = y;
      // set and append the height of the level
      if (level['abstract']) {
        level['height'] = heightAbstractLevel - margin['gap'];
        y = y + heightAbstractLevel;
      } else {
        level['height'] = heightNormalLevel - margin['gap'];
        y = y + heightNormalLevel;
      }
    }
    // draw the level
    level.draw();
  }

  // auto collapse
  if ($(selAutoCollapse).is(':checked')) {
    hierarchyAutoCollapse();
  }
}

/**
 * Visualize the selected snapshots
 * @param {Array} snapshots array of selected snapshots to draw
 */
export function selectedHierarchy(snapshots) {
  const selectedLevels = [
    ...new Set(
      snapshots.map(function(d) {
        return d['level'] + '';
      })
    ),
  ];
  resetActiveLevels(selectedLevels);

  selectedLevels.forEach(function(level) {
    hierarchy['levels'][level]['class'].hideCells();
  });

  drawHierarchy();
  // set the root levels as drawn
  snapshots.forEach(function(snap) {
    const l = hierarchy['levels'][snap['level']]['class'];
    // add the level and chagne type to graph type
    l.addCell(snap['position'], snap['graph_type']);
  });
}
/**
 * Add snapshot to the hierasrchy
 * @param {Number} level to the level
 * @param {Number} pos snapshot of position
 */
export function addSnapshot(level, pos) {
  addActiveLevel(level);
  Object.values(hierarchy['levels']).forEach(function(l) {
    if (l['level'] === level) {
      l['class'].addCell(pos);
    }
  });

  drawHierarchy();
}

/**
 * Change the visualization of the whole hierarchy
 */
export function changeVis() {
  Object.values(hierarchy['levels']).forEach(function(level) {
    if (level['class']['visualize']) {
      level['class'].changeVis();
    }
  });
}

/**
 * Change the visualization of the whole hierarchy
 * @param {String} graphType the graph type to change all the individual cells
 */
export function changeGraphType(graphType) {
  Object.values(hierarchy['levels']).forEach(function(level) {
    if (level['class']['visualize']) {
      level['class'].changeGraphType(graphType);
    }
  });
}

/**
 * The visualized data has changed
 */
export function updateHierarchyData() {
  Object.values(hierarchy['levels']).forEach(function(level) {
    level['class'].resetData();
  });
}

/**
 * Remove a cell of level l and position p
 */
export function removeFromHierarchy(l, p) {
  const level = hierarchy['levels'][l]['class'];
  level.removeCell(p);
}

/**
 * Return the levels data
 */
export function getLevels() {
  return hierarchy['levels'];
}

/**
 * Return duration of the whole dynamic graph
 */
export function timeSpan() {
  return [hierarchy['time_1'], hierarchy['time_2']];
}

/**
 * Auto collapse some levels if required
 */
export function hierarchyAutoCollapse() {
  // auto collapse some cells
  setTimeout(function() {
    // get the number of visualized levels which are not abstract
    const visLevels = Object.values(hierarchy['levels']).reduce(
      (n, l) => n + (l['class']['visualize'] && !l['class']['abstract']),
      0
    );

    // abstract levels
    if (visLevels > maxLevels) {
      // abstract the highest level
      let maxLevel = 0; // the max level
      Object.values(hierarchy['levels']).forEach(function(level) {
        if (level['class']['visualize'] && !level['class']['abstract']) {
          maxLevel = level['level'] > maxLevel ? level['level'] : maxLevel;
        }
      });
      hierarchy['levels'][maxLevel]['class']['abstract'] = true;
      hierarchy['levels'][maxLevel]['class'].hideCells();

      drawHierarchy();
    }
    // this still has some errors
    // const PERCENTAGE = 0.9
    // iterate hiearchy until depth -1
    // for (let i = 0; i < Object.keys(hierarchy).length - 1; i++) {
    //   const level = hierarchy['level-' + i];
    //   const levelCells = level['collapseData'];
    // iterate the following levels
    // if (levelCells.length) {
    //   for (let j = i + 1; j < Object.keys(hierarchy).length; j++) {
    //     // get the all active time steps of some next level
    //     const nextLevel = hierarchy['level-' + j];
    //     const nextLevelCells = nextLevel['collapseData'];
    //     const nextLevelTimeSteps = [].concat(
    //       ...nextLevelCells.map(function(cell) {
    //         return cell['data']['timeInstances'];
    //       })
    //     );
    //     // check if there is a high overlap
    //     // if true make the higher level abstract
    //     levelCells.forEach(function(cell) {
    //       // high level cell
    //       const timeInstances = cell['data']['timeInstances'];
    //       // disjoint elements between time instances and next level time steps
    //       const intersection = timeInstances.filter((element) =>
    //         nextLevelTimeSteps.includes(element)
    //       );
    //       const p = intersection.length / timeInstances.length;
    //       if (p > PERCENTAGE) {
    //         cell['abstract'] = true;
    //         collapsed = true;
    //       }
    //     });
    //   }
    // }
    // }
  }, 3000);
}

/**
 * Compute the height for an normal level
 * @return {Number} get the level height
 */
function _getHeightLevel() {
  // get number of normal (not abstract) levels
  let numVisualizeLevels = 0;
  let numAbstractLevels = 0;
  Object.keys(hierarchy['levels']).forEach(function(key) {
    let d = hierarchy['levels'][key]['class'];
    if (d['visualize'] === true) {
      numVisualizeLevels = numVisualizeLevels + 1;
      if (d['abstract'] === true) {
        numAbstractLevels = numAbstractLevels + 1;
      }
    }
  });

  // remove the height of the normal levels
  return (
    (height - numAbstractLevels * ABSTRACT_HEIGHT) /
    (numVisualizeLevels - numAbstractLevels)
  );
}

/**
 * Return the height of the hierarchy
 * @return {Number} get the level height
 */
export function getHierarchyHeight() {
  return hierarchy['height'];
}

/**
 * Sets the max value for the parameters of auto-collaps
 * @param {number} max
 */
export function setMaxLevels(max) {
  maxLevels = max;
}

/**
 * Sets the max value for the parameters of auto-collaps
 * @param {number} max
 */
export function setMaxCells(max) {
  maxCells = max;
}

/**
 * Get the max value for the parameters of auto-collaps
 */
export function getMaxCells() {
  return maxCells;
}
