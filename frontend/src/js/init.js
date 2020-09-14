/* global $, d3, window, alert*/
'use strict';

/**
 * Initilaize svg and listerners for buttons etc.
 * @author Eren Cakmak eren.cakmak@uni-konstanz.de
 */

import {
  getNodes,
  setFilteredNodes,
  setClusterBool,
  searchIntervalTree,
} from './data.js';
import {
  changeVis,
  defaultHierarchy,
  drawHierarchy,
  changeGraphType,
  addSnapshot,
  timeSpan,
  getHierarchyHeight,
  setMaxLevels,
  setMaxCells,
} from './hierarchy.js';
import { drwaQueryPlot } from './query_plot.js';

let filteredNodes = [];

/**
 * Initilaize the responsive SVGs in the overview and details div
 */
export function initSVGs() {
  _appendResponsiveSVG('#hierarchy-vis');
  _moveSpinner();
}

/**
 * Append responsive SVGs to the selector div
 * @param {selector} selector of the div to which the svg should be added
 */
function _appendResponsiveSVG(selector) {
  const elm = $(selector)
    .parent()
    .parent();
  const width = parseInt(elm.width());
  const height = parseInt(elm.height()) * 0.95;

  const svg = d3
    .select(selector)
    .append('div')
    .classed('svg-container', true)
    .append('svg')
    .attr('preserveAspectRatio', 'xMinYMin meet')
    .attr('viewBox', '0 0 ' + width + ' ' + height + '')
    .classed('svg-content-responsive', true);

  /* depends on svg ratio, for  1240/1900 = 0.65 so padding-bottom = 65% */
  const percentage = Math.ceil((height / width) * 100);
  $(selector).append(
    $(
      '<style>' +
        selector +
        '::after {padding-top: ' +
        percentage +
        '%;display: block;content: "";}</style> '
    )
  );

  _appendTextBackgroundFilter(svg);
}

/**
 * Append a defs filter for the text background color in the svg
 * @param {Object} svg Object
 */
function _appendTextBackgroundFilter(svg) {
  // append def to the svg this will be used as a background filter for text svg
  const filter = svg
    .append('defs')
    .append('filter')
    .attr('id', 'svg-text-background')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', 1)
    .attr('height', 1);
  filter.append('feFlood').attr('flood-color', 'white');
  filter.append('feComposite').attr('in', 'SourceGraphic');
}

/**
 * Initialize the toolbar
 */
export function initToolbar() {
  // listener for add and remove level buttons
  $('#button-remove-hierarchy').click(function() {
    defaultHierarchy();
  });
  // Visualization buttons
  $('#radio-vis-buttons :input').change(function() {
    changeVis();
  });
  // init the matrix and edges listener
  $('#matrix-order').on('change', function() {
    drawHierarchy();
  });
  $('#nodes-option').on('change', function() {
    drawHierarchy();
  });

  _initSettingsModal();

  // init the graph metric selection and legend
  $('#graph-metrics').on('change', function() {
    drawHierarchy();
  });
  const legendWidth = 130;
  const legendHeight = 40;
  d3.select('#graph-metric-legend')
    .append('svg')
    .attr('id', 'svg-graph-legend')
    .attr('width', legendWidth)
    .attr('height', legendHeight);

  // init graph type on change
  $('.summary-graph').click(function() {
    const sel = $(this).attr('graph-type');
    changeGraphType(sel);
  });
  // get the promise for the nodes
  getNodes().then(function(nodes) {
    const nodesOptions = nodes
      .map(function(d) {
        return '<option id="' + d[0] + '">' + d[1] + '</option>';
      })
      .join();
    // update the filter in the toolbar
    $('#nodes-filter')
      .append(nodesOptions)
      .selectpicker('refresh')
      .selectpicker('selectAll');

    /**
     * On click listener for the nodes filter option
     */
    $('#nodes-filter').on('change', function() {
      filteredNodes = $.map($(this).find('option:selected'), function(o) {
        return o['id'];
      });
    });
  });
  // submit button for filtering
  $('#button-update-data').click(function() {
    setFilteredNodes(filteredNodes);
  });

  // modal on open listenter
  $('#similarity-search-modal').on('shown.bs.modal', function() {
    // check if levels options is empty if so add levels
    if ($('#levels-filter option').length === 0) {
      const height = getHierarchyHeight();
      const arr = Array.from({ length: height - 1 }, (_, i) => i + 2);

      const levelsOptions = arr
        .map(function(d) {
          return '<option value="' + d + '">Level ' + d + '</option>';
        })
        .join();
      // update the filter in the toolbar
      $('#levels-filter')
        .append(levelsOptions)
        .selectpicker('refresh')
        .selectpicker('selectAll');
    }

    drwaQueryPlot();
  });

  // time submit button for the position
  $('#submit-time').click(function() {
    // parse the values and check if they are in the correct range
    const start = new Date($('#start-time').val());
    const end = new Date($('#end-time').val());
    const interval = timeSpan().map(function(d) {
      return new Date(d);
    });
    if (
      start >= interval[0] &&
      start <= interval[1] &&
      end >= interval[0] &&
      end <= interval[1] &&
      start < end
    ) {
      searchIntervalTree(start, end).then(function(data) {
        addSnapshot(data['level'], data['pos']);
      });
    } else {
      alert(
        'The dates are not in the interval of: ' +
          interval[0] +
          ' -- ' +
          interval[1]
      );
    }
  });

  // clustering button
  $('#button-cluster').click(function() {
    const bool = !$(this).hasClass('active');
    setClusterBool(bool);
  });
}

/**
 * Filter the node in the nodes filter bar
 * @param {selector} node node
 */
export function filterNode(nodeName) {
  const sel = $('#nodes-filter');
  // reset if all selected
  if (!sel.find('option:not(:selected)').length) {
    sel.selectpicker('deselectAll');
  }
  // get selected values and add the clicked node to it
  let selVals = sel.selectpicker('val');
  if (Array.isArray(nodeName)) {
    selVals = selVals.concat(nodeName);
  } else {
    selVals.push(nodeName);
  }
  sel.selectpicker('val', selVals).selectpicker('refresh');

  // change the filtered data
  filteredNodes = $.map(sel.find('option:selected'), function(o) {
    return o['id'];
  });
}

/**
 * Initilaize the settings modal
 */
function _initSettingsModal() {
  $('#collapse-level-input').change(function() {
    setMaxLevels($(this).val());
  });

  $('#collapse-cell-input').change(function() {
    setMaxCells($(this).val());
  });
}

/**
 * Move the spinner to the end of the div
 */
function _moveSpinner() {
  $('#spinner').appendTo($('#spinner').parent());
}

// zoom limit stop revert behvaior
window.onwheel = function() {
  return false;
};

// init bootstrap tooltips
$(function() {
  $('[data-toggle="tooltip"]').tooltip();
});
