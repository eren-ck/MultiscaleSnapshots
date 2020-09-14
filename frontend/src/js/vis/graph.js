/* global d3, $*/
'use strict';

/**
 * Draw static graph in a hiearchy cell
 * @author Eren Cakmak eren.cakmak@uni-konstanz.de
 */

import { margin } from '../cell.js';
import { filterNode } from '../init.js';

// DOM Selector
const selNodeMetric = '#nodes-option option:selected';

/**
 * Draw the static a graph
 */
export function drawStaticGraph() {
  let that = this;
  // required for link positioning
  // as the links do not have the coordinates of ndoes
  let positions = {};
  this._data['nodes'].forEach(function(d) {
    positions[d['id']] = d['coord'];
  });

  // define the zoom function for the static graph
  // define the zoom for the group
  const zoom = d3
    .zoom()
    .scaleExtent([1, 20])
    .translateExtent([
      [0, 0],
      [this._width - 2 * margin, this._height - 2 * margin],
    ])
    .extent([
      [0, 0],
      [this._width - 2 * margin, this._height - 2 * margin],
    ])
    .on('zoom', function() {
      zoomXScale = d3.event.transform.rescaleX(xScale);
      zoomYScale = d3.event.transform.rescaleY(yScale);

      // semantic zoom
      nodesEnter
        .attr('cx', function(d) {
          return zoomXScale(d['coord'][0]);
        })
        .attr('cy', function(d) {
          return zoomYScale(d['coord'][1]);
        });
      linksEnter
        .attr('x1', function(d) {
          return zoomXScale(positions[d['source']][0]);
        })
        .attr('y1', function(d) {
          return zoomYScale(positions[d['source']][1]);
        })
        .attr('x2', function(d) {
          return zoomXScale(positions[d['target']][0]);
        })
        .attr('y2', function(d) {
          return zoomYScale(positions[d['target']][1]);
        });
    });

  this._zoom.call(zoom);

  // get min max of the positions
  // define the scales
  const xScale = d3
    .scaleLinear()
    .domain(
      d3.extent(this._data['nodes'], function(d) {
        return d['coord'][0];
      })
    )
    .range([2 * margin, this._width - 4 * margin]);

  const yScale = d3
    .scaleLinear()
    .domain(
      d3.extent(this._data['nodes'], function(d) {
        return d['coord'][1];
      })
    )
    .range([2 * margin, this._height - 4 * margin]);

  // zoom scale - needed for semantic zoom
  let zoomXScale = xScale;
  let zoomYScale = yScale;

  // set the scaler for the nodes
  const nodeScale = d3.scaleLinear().range([2, 8]);
  const selectedNodeMetric = $(selNodeMetric).attr('metric');
  if (selectedNodeMetric !== '') {
    const nodeData = Object.values(this._data['nodes']).map(function(d) {
      return d[selectedNodeMetric];
    });
    nodeScale.domain(d3.extent(nodeData));
  }

  // append the links
  // JOIN - group for the links
  const linksGroup = this._g.selectAll('.links').data([this._data['links']]);
  // ENTER MERGE the links group
  const linksGroupEnter = linksGroup
    .enter()
    .append('g')
    .merge(linksGroup)
    .attr('class', 'links');
  // EXIT the links group
  linksGroup.exit().remove();

  // append the nodes
  // JOIN the nodes group
  const nodesGroup = this._g.selectAll('.nodes').data([this._data['nodes']]);
  // ENTER MERGE the nodes group
  const nodesGroupEnter = nodesGroup
    .enter()
    .append('g')
    .merge(nodesGroup)
    .attr('class', 'nodes');
  // EXIT the nodes group
  nodesGroup.exit().remove();

  // JOIN the nodes with the data
  const nodes = nodesGroupEnter.selectAll('circle').data(function(d) {
    return d;
  });

  // ENTER MERGE the nodes
  const nodesEnter = nodes
    .enter()
    .append('circle')
    .merge(nodes)
    .attr('class', function(d) {
      return 'node node-' + d['id'];
    })
    .attr('r', function(d) {
      if (selectedNodeMetric !== '' && d[selectedNodeMetric]) {
        return nodeScale(d[selectedNodeMetric]);
      }
      return 5;
    })
    .attr('stroke', function(d) {
      return d['is_cluster'] ? '#000' : '#202020';
    })
    .attr('stroke-width', function(d) {
      return d['is_cluster'] ? '2px' : '1px';
    })
    .attr('node-weight', function() {
      return d3.select(this).attr('r');
    })
    .attr('cx', function(d) {
      return zoomXScale(d['coord'][0]);
    })
    .attr('cy', function(d) {
      return zoomYScale(d['coord'][1]);
    })
    .on('mouseover', nodeMouseOver)
    .on('mouseout', nodeMouseOut)
    .on('click', function(d) {
      filterNode(d['name']);
    })
    .call(
      d3
        .drag()
        .on('start', function() {
          d3.select(this).classed('fixed', true);
        })
        .on('drag', function(d) {
          d3.select(this)
            .attr('cx', d3.event.x)
            .attr('cy', d3.event.y);

          linksGroupEnter.selectAll('.link.link-' + d['id']).each(function(l) {
            if (l['source'] === d['id']) {
              d3.select(this)
                .attr('x1', d3.event.x)
                .attr('y1', d3.event.y);
            } else {
              d3.select(this)
                .attr('x2', d3.event.x)
                .attr('y2', d3.event.y);
            }
          });
        })
        .on('end', function(d) {
          d3.select(this).classed('fixed', false);

          // update node positions and links mapping
          d['coord'] = [
            zoomXScale.invert(d3.event.x),
            zoomYScale.invert(d3.event.y),
          ];
          positions[d['id']] = d['coord'];
        })
    );

  // EXIT nodes
  nodes.exit().remove();

  // JOIN the links with the data
  const links = linksGroupEnter.selectAll('line').data(function(d) {
    return d;
  });

  // ENTER MERGE the links
  const linksEnter = links
    .enter()
    .append('line')
    .merge(links)
    .attr('class', function(d) {
      return 'link link-' + d['source'] + ' link-' + d['target'];
    })
    .attr('stroke', function(d) {
      return d['sentiment'] > 0 ? '#4e79a7' : '#e15759';
    })
    .attr('x1', function(d) {
      return zoomXScale(positions[d['source']][0]);
    })
    .attr('y1', function(d) {
      return zoomYScale(positions[d['source']][1]);
    })
    .attr('x2', function(d) {
      return zoomXScale(positions[d['target']][0]);
    })
    .attr('y2', function(d) {
      return zoomYScale(positions[d['target']][1]);
    })
    .on('mouseover', edgeMouseOver)
    .on('mouseout', edgeMouseOut);
  // EXIT links
  links.exit().remove();

  /**
   * Mouse over a node in the graph
   * @param {Object} d node
   */
  function nodeMouseOver(d) {
    const tooltipShift = 25;
    // fade all other nodes and links
    d3.selectAll('.node').classed('faded', true);
    d3.selectAll('.link').classed('faded', true);

    // highlight and add label
    d3.selectAll('.node.node-' + d['id'])
      .classed('hovered', true)
      .classed('faded', false)
      .transition()
      .duration(500)
      .attr('r', 10);

    // get links and highlight links and nodes
    d3.selectAll('.link.link-' + d['id']).each(function(l) {
      // for each link highlight the link and source and target node
      d3.select(this).classed('highlighted', true);
      if (l['source'] === d['id']) {
        d3.selectAll('.node.node-' + l['target']).classed('highlighted', true);
        // add text boxes to the linked nodes
        const node = that._g.select('.node.node-' + l['target']);
        node
          .select(function() {
            return this.parentNode;
          })
          .append('text')
          .text(function(d2) {
            return Array.isArray(d2['name'])
              ? d2['name'].slice(0, 2)
              : d2['name'];
          })
          .style('font-size', '1em')
          .attr('x', function(d2) {
            return zoomXScale(d2['coord'][0]) + -tooltipShift;
          })
          .attr('y', function(d2) {
            return zoomYScale(d2['coord'][1]) + -tooltipShift;
          });
      } else {
        d3.selectAll('.node.node-' + l['source']).classed('highlighted', true);
        // add text boxes to the linked nodes
        const node = that._g.select('.node.node-' + l['source']);
        node
          .select(function() {
            return this.parentNode;
          })
          .append('text')
          .style('font-size', '1em')
          .text(function(d2) {
            return Array.isArray(d2['name'])
              ? d2['name'].slice(0, 2)
              : d2['name'];
          })
          .attr('x', function(d2) {
            return zoomXScale(d2['coord'][0]) + tooltipShift;
          })
          .attr('y', function(d2) {
            return zoomYScale(d2['coord'][1]) + tooltipShift;
          });
      }
    });

    // add text tooltip
    d3.select(this.parentNode)
      .append('text')
      .attr('dy', '.35em')
      .text(Array.isArray(d['name']) ? d['name'].slice(0, 2) : d['name'])
      .attr('x', zoomXScale(d['coord'][0]) + tooltipShift / 2)
      .attr('y', zoomYScale(d['coord'][1]) + tooltipShift / 2);
  }

  /**
   * Mouse out over a node in the graph
   * @param {Object} d node
   */
  function nodeMouseOut(d) {
    // fade in all other nodes and links
    d3.selectAll('.node')
      .classed('faded', false)
      .classed('highlighted', false);
    d3.selectAll('.link')
      .classed('faded', false)
      .classed('highlighted', false);

    // remove highlight and remove label
    d3.selectAll('.node.node-' + d['id'])
      .classed('hovered', false)
      .transition()
      .duration(500)
      .attr('r', function() {
        return d3.select(this).attr('node-weight');
      });

    // remove text tooltip
    d3.select(this.parentNode)
      .selectAll('text')
      .remove();
  }

  /**
   * Mouse over a edge in the graph
   * @param {Object} d edge
   */
  function edgeMouseOver(d) {
    const tooltipShift = 25;
    // fade all other nodes and links
    d3.selectAll('.node').classed('faded', true);
    d3.selectAll('.link').classed('faded', true);

    // highlight and add label to all links between the two labels
    d3.selectAll('.link.link-' + d['source'] + '.link-' + d['target']).classed(
      'faded',
      false
    );

    // add text tooltip
    const tpX = zoomXScale(
      (positions[d['source']][0] + positions[d['target']][0]) / 2
    );
    const tpY = zoomYScale(
      (positions[d['source']][1] + positions[d['target']][1]) / 2
    );
    d3.select(this.parentNode)
      .append('text')
      .attr('dy', '.35em')
      .text(d['time'])
      .attr('x', tpX + tooltipShift)
      .attr('y', tpY + tooltipShift);

    // highlight nodes
    // source
    d3.selectAll('.node.node-' + d['source'])
      .classed('hovered', true)
      .classed('faded', false)
      .transition()
      .duration(300)
      .attr('r', 10);
    d3.selectAll('.node.node-' + d['target'])
      .classed('hovered', true)
      .classed('faded', false)
      .transition()
      .duration(300)
      .attr('r', 10);
    // append two texts
    let node = that._g.select('.node.node-' + d['source']);
    node
      .select(function() {
        return this.parentNode;
      })
      .append('text')
      .style('font-size', '1em')
      .text(function(d2) {
        return Array.isArray(d2['name']) ? d2['name'].slice(0, 2) : d2['name'];
      })
      .attr('x', function(d2) {
        return zoomXScale(d2['coord'][0]) - tooltipShift;
      })
      .attr('y', function(d2) {
        return zoomYScale(d2['coord'][1]) - tooltipShift;
      });
    node = that._g.select('.node.node-' + d['target']);
    node
      .select(function() {
        return this.parentNode;
      })
      .append('text')
      .style('font-size', '1em')
      .text(function(d2) {
        return Array.isArray(d2['name']) ? d2['name'].slice(0, 2) : d2['name'];
      })
      .attr('x', function(d2) {
        return zoomXScale(d2['coord'][0]) + tooltipShift;
      })
      .attr('y', function(d2) {
        return zoomYScale(d2['coord'][1]) + tooltipShift;
      });
  }
  /**
   * Mouse out over a edge in the graph
   * @param {Object} d edge
   */
  function edgeMouseOut(d) {
    d3.selectAll('.node')
      .classed('faded', false)
      .classed('highlighted', false);
    d3.selectAll('.link')
      .classed('faded', false)
      .classed('highlighted', false);

    d3.selectAll('.node.node-' + d['source'])
      .classed('hovered', false)
      .transition()
      .duration(300)
      .attr('r', function() {
        return d3.select(this).attr('node-weight');
      });

    d3.selectAll('.node.node-' + d['target'])
      .classed('hovered', false)
      .transition()
      .duration(300)
      .attr('r', function() {
        return d3.select(this).attr('node-weight');
      });

    // remove text tooltip
    d3.select(this.parentNode)
      .selectAll('text')
      .remove();
    // remove text tooltip
    d3.select('.nodes')
      .selectAll('text')
      .remove();
  }
}
