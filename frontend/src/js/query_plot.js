/* global d3, $, alert*/
'use strict';

/**
 * Class for the query plot in the similarity search modal
 * Again a singleton pattern
 * @author Eren Cakmak eren.cakmak@uni-konstanz.de
 */
import { getLevels, timeSpan, selectedHierarchy } from './hierarchy.js';
import { searchAllLevels } from './data.js';

// DOM Selector
const sel = '#similarity-search-vis';
const selOrdering = '#query-plot-order';
const selLevels = '#levels-filter';
const selKNN = '#k-nearest-neighbor-range';
const selSearchButton = '#similarity-search-button';
const selUpdateButton = '#similarity-update-button';
const selTooltip = '#tooltip-search-modal';

const margin = {
  top: 20,
  right: 20,
  bottom: 20,
  left: 60,
};
const dateTime = d3.timeParse('%a, %d %b %Y %H:%M:%S GMT');
const dateFormat = d3.timeFormat('%x %I%p');
const visited = {};
let similarity;
let selectedSnapshot = [];
let selectedKNN = [];

/**
 * Draw the query plot - gets the data first
 * Then draws the plot and afterwards
 */
export function drwaQueryPlot() {
  // remove the old stuff
  d3.select(sel)
    .selectAll('*')
    .remove();
  // get the reqiured data
  const time = timeSpan().map(function(d) {
    return dateTime(d);
  });
  const levels = getLevels();

  // visualized cells data
  const visualized = {};
  Object.values(levels).forEach(function(l) {
    const visTmp = l['class'].getVisualizedTime();
    if (visTmp.length) {
      visualized[l['level']] = visTmp;
    }
  });

  let width = 1400;
  let height = 700;

  const svg = d3
    .select(sel)
    .append('svg')
    .attr('viewBox', '0 0 ' + width + ' ' + height + '');

  width = width - margin['left'] - margin['right'];
  height = height - margin['bottom'] - margin['top'];

  // append g group with margins
  const group = svg
    .append('g')
    .attr(
      'transform',
      'translate(' + margin['left'] + ', ' + margin['top'] + ')'
    );

  // zoom stuff
  group
    .append('defs')
    .append('clipPath')
    .attr('id', 'clip-query-zoom')
    .append('rect')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', width)
    .attr('height', height)
    .attr('fill', '#fff');

  // add the zoom group to the svg
  const zoomGroup = group
    .append('g')
    .attr('class', 'query-zoom-group')
    .attr('clip-path', 'url(#clip-query-zoom)');

  const zoom = d3
    .zoom()
    .scaleExtent([1, 10])
    .translateExtent([
      [0, 0],
      [width, height],
    ])
    .extent([
      [0, 0],
      [width, height],
    ])
    .on('zoom', function() {
      // semantic zoom implemented
      const transform = d3.event.transform;

      const xNewScale = transform.rescaleX(xScale);
      xAxis.scale(xNewScale);
      gAxis.call(xAxis);

      g.selectAll('.level-line-visited')
        .attr('x1', function(d) {
          return xNewScale(d['time1']);
        })
        .attr('x2', function(d) {
          return xNewScale(d['time2']);
        });

      g.selectAll('.level-line-visualized')
        .attr('x1', function(d) {
          return xNewScale(d['time1']);
        })
        .attr('x2', function(d) {
          return xNewScale(d['time2']);
        });

      g.selectAll('.circle-nearest-neigbors').attr('cx', function(d) {
        return (
          (xNewScale(dateTime(d['time1'])) + xNewScale(dateTime(d['time2']))) /
          2
        );
      });
      g.selectAll('.circle-selected').attr('cx', function(d) {
        return (xNewScale(d['time1']) + xNewScale(d['time2'])) / 2;
      });
    });

  zoomGroup
    .append('rect')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', width)
    .attr('height', height)
    .attr('class', 'query-zoom-rect')
    .style('fill', '#fff')
    .call(zoom);

  // margin to the zoom area
  const smallMargin = 5;

  width = width - 2 * smallMargin;
  height = height - 2 * smallMargin;

  const xScale = d3
    .scaleTime()
    .domain(time)
    .rangeRound([0, width]);

  const yScale = d3
    .scalePoint()
    .domain(_getLayout(levels))
    .rangeRound([0, height])
    .padding(1);

  const g = zoomGroup
    .append('g')
    .attr('transform', 'translate(' + smallMargin + ',0)');

  // append axis
  const xAxis = d3.axisTop(xScale).ticks(10);
  const gAxis = group
    .append('g')
    .attr('id', 'query-x-axis')
    .call(xAxis);

  redraw();

  /**
   * Draw the query plot - update functionality
   */
  function redraw() {
    // update the layout ordering
    yScale.domain(_getLayout(levels));

    group.select('#query-y-axis').remove();
    // add y axis
    group
      .append('g')
      .attr('id', 'query-y-axis')
      .call(
        d3.axisLeft(yScale).tickFormat(function(d) {
          return 'Level ' + d;
        })
      );

    const levelGroups = g
      .selectAll('.level-groups')
      .data(Object.values(levels));
    // ENTER MERGE the links group
    const levelGroupsEnter = levelGroups
      .enter()
      .append('g')
      .merge(levelGroups)
      .attr('class', 'level-groups')
      .attr('id', function(d) {
        return 'level-group-' + d['level'];
      })
      .attr('text-anchor', 'end')
      .style('font', '10px sans-serif');

    levelGroupsEnter
      .transition()
      .delay(function(d, i) {
        return i * 10;
      })
      .attr('transform', function(d) {
        return 'translate(0,' + yScale(d['level']) + ')';
      });

    // enter lines
    const lines = levelGroupsEnter.selectAll('.level-line').data(function(d) {
      return [d];
    });

    // ENTER MERGE the nodes
    lines
      .enter()
      .append('line')
      .merge(lines)
      .attr('class', function(d) {
        return 'level-line level-' + d['level'];
      })
      .attr('x1', xScale(time[0]))
      .attr('x2', xScale(time[1]));

    lines.exit().remove();

    // visited time spans
    g.selectAll('.level-line-visited').remove();

    for (let [l, value] of Object.entries(visited)) {
      g.select('#level-group-' + l)
        .selectAll('.level-line-visited')
        .data(value)
        .enter()
        .append('line')
        .attr('class', 'level-line-visited')
        .attr('x1', function(d) {
          return xScale(d['time1']);
        })
        .attr('x2', function(d) {
          return xScale(d['time2']);
        });
    }

    // active snapshots
    g.selectAll('.level-line-visualized').remove();

    for (let [l, value] of Object.entries(visualized)) {
      g.select('#level-group-' + l)
        .selectAll('.level-line-visualized')
        .data(value)
        .enter()
        .append('line')
        .attr('class', 'level-line-visualized')
        .attr('x1', function(d) {
          return xScale(d['time1']);
        })
        .attr('x2', function(d) {
          return xScale(d['time2']);
        });
    }

    const circleStartEnd = levelGroupsEnter
      .selectAll('.circle-start-end')
      .data(function(d) {
        return [d, d];
      });

    circleStartEnd
      .enter()
      .append('circle')
      .merge(circleStartEnd)
      .attr('class', function(d) {
        return 'circle-start-end level-circle-' + d['level'];
      })
      .attr('index', function(d, i) {
        return i;
      })
      .attr('cx', function(d, i) {
        return xScale(time[i]);
      })
      .attr('r', 5);

    circleStartEnd.exit().remove();

    // append selected rect
    if (selectedSnapshot.length) {
      g.select('#level-group-' + selectedSnapshot[0]['level'])
        .selectAll('.circle-selected')
        .data(selectedSnapshot)
        .enter()
        .append('circle')
        .attr('class', 'circle-selected')
        .attr('cx', function(d) {
          return (xScale(d['time1']) + xScale(d['time2'])) / 2;
        })
        .attr('r', 8);
    }
    // EXIT the links group
    levelGroups.exit().remove();

    // raise the found similarities
    g.selectAll('.circle-nearest-neigbors').raise();
    g.selectAll('.circle-selected').raise();
  }

  /**
   * Order the levels by the selected metric
   */
  function _getLayout(levels) {
    const selected = $(selOrdering + ' option:selected').attr('metric');
    const sortLevel = Object.values(levels);
    let compare;

    if (selected === 'order-level') {
      compare = function oName(d1, d2) {
        const a = d1['level'];
        const b = d2['level'];
        if (a < b) return 1;
        if (a > b) return -1;
        return 0;
      };
    } else if (selected === 'order-visited') {
      compare = function oName(d1, d2) {
        const a = d1['level'] in visited ? visited[d1['level']].length : 0;
        const b = d2['level'] in visited ? visited[d2['level']].length : 0;
        if (a < b) return 1;
        if (a > b) return -1;
        return 0;
      };
    } else if (selected === 'order-visualized') {
      compare = function oName(d1, d2) {
        const a =
          d1['level'] in visualized ? visualized[d1['level']].length : 0;
        const b =
          d2['level'] in visualized ? visualized[d2['level']].length : 0;
        if (a < b) return 1;
        if (a > b) return -1;
        return 0;
      };
    } else if (selected === 'order-similarity' && similarity) {
      compare = function oName(d1, d2) {
        const a =
          d1['level'] in similarity
            ? d3.min(similarity[d1['level']], function(obj) {
                return obj['distance'];
              })
            : 128;
        const b =
          d2['level'] in similarity
            ? d3.min(similarity[d2['level']], function(obj) {
                return obj['distance'];
              })
            : 128;
        if (a < b) return -1;
        if (a > b) return 1;
        return 0;
      };
    }

    return sortLevel.sort(compare).map(function(l) {
      return l['level'];
    });
  }

  $(selOrdering).off();
  $(selOrdering).on('change', function() {
    redraw();
  });

  // k nearest neigbor search stuff here
  $(selSearchButton).off();
  $(selSearchButton).on('click', function() {
    if (selectedSnapshot.length === 0) {
      alert('You have to select a snapshot view first.');
      return;
    }
    const levels = $(selLevels).val();
    const k = $(selKNN).val();
    const promise = searchAllLevels(
      selectedSnapshot[0]['embeddings'],
      levels,
      k
    );
    promise.then(function(data) {
      // store the data in similarity for reordering
      similarity = data;
      // reset selected knn
      selectedKNN = [];

      // scale for opacity
      const maxDistance = d3.max(Object.values(data), function(d) {
        return d3.max(d, function(obj) {
          return obj['distance'];
        });
      });
      const opacityScale = d3
        .scaleLinear()
        .domain([0, maxDistance])
        .range([1, 0.5]);

      g.selectAll('.circle-nearest-neigbors').remove();

      for (let [l, value] of Object.entries(data)) {
        g.select('#level-group-' + l)
          .selectAll('.circle-nearest-neigbors')
          .data(value)
          .enter()
          .append('circle')
          .attr('class', 'circle-nearest-neigbors')
          .attr('cx', function(d) {
            return (
              (xScale(dateTime(d['time1'])) + xScale(dateTime(d['time2']))) / 2
            );
          })
          .attr('opacity', function(d) {
            return opacityScale(d['distance']);
          })
          .attr('r', 8)
          .on('mouseout', function() {
            d3.selectAll(selTooltip).style('display', 'none');
          })
          .on('mouseover', function(d) {
            let xPosition = d3.event.x;
            let yPosition = d3.event.y + 20;

            d3.select(selTooltip)
              .style('display', 'inline-block')
              .style('left', xPosition + 'px')
              .style('top', yPosition + 'px')
              .style('font-size', '1.2em')
              .html(
                'Distance: ' +
                  d['distance'] +
                  '<br />' +
                  'Graph-type: ' +
                  d['graph_type'] +
                  '<br />' +
                  dateFormat(dateTime(d['time1'])) +
                  '-' +
                  dateFormat(dateTime(d['time2']))
              );
          })
          .on('click', function(d) {
            d3.select(this).classed('highlight', true);
            selectedKNN.push(d);
          });
      }
    });
  });

  // update the hierarchy with the selection
  $(selUpdateButton).off();
  $(selUpdateButton).on('click', function() {
    selectedHierarchy(selectedKNN);
  });
}

/**
 * add visited level
 * @param {String} start first date
 * @param {End} end end date
 */
export function addVisited(level, start, end) {
  if (level in visited) {
    visited[level].push({
      time1: dateTime(start),
      time2: dateTime(end),
    });
  } else {
    visited[level] = [
      {
        time1: dateTime(start),
        time2: dateTime(end),
      },
    ];
  }
}

/**
 * Add snapshot to the selected list for knn
 * @param {Number} level level of the snapshot
 * @param {Date} start first date
 * @param {Date} end end date
 * @param {Number} pos position of the snapshot on the level
 * @param {String} graphType union, disjoint, etc.
 * @param {Array} embeddings Array of floats (embedding)
 */
export function setSelectedSnapshot(
  level,
  start,
  end,
  pos,
  graphType,
  embeddings
) {
  selectedSnapshot = [
    {
      level: level,
      time1: dateTime(start),
      time2: dateTime(end),
      position: pos,
      graphType: graphType,
      embeddings: embeddings,
    },
  ];
}
