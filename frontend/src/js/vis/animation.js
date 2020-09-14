/* global d3,$ */
'use strict';

/**
 * Draw static Graph in a hiearchy cell
 * @author Eren Cakmak eren.cakmak@uni-konstanz.de
 */

import { margin } from '../cell.js';
import { filterNode } from '../init.js';

// DOM Selector
const selNodeMetric = '#nodes-option option:selected';
const selPlayButton = '#play-button';
const selTimeSlider = '#time-slider';

/**
 * Draw the static a Graph
 */
export function drawAnimation() {
  const that = this;

  const data = this._animationData[this._timeIndex];
  // required for link positioning
  // as the links do not have the coordinates of ndoes
  let positions = {};
  data['nodes'].forEach(function(d) {
    positions[d['id']] = d['coord'];
  });

  // define the zoom function for the static graph
  // define the zoom for the group
  const zoom = d3
    .zoom()
    .scaleExtent([1, 8])
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
      d3.extent(data['nodes'], function(d) {
        return d['coord'][0];
      })
    )
    .range([2 * margin, this._width - 4 * margin]);

  const yScale = d3
    .scaleLinear()
    .domain(
      d3.extent(data['nodes'], function(d) {
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
    const nodeData = Object.values(data['nodes']).map(function(d) {
      return d[selectedNodeMetric];
    });
    nodeScale.domain(d3.extent(nodeData));
  }

  // append the links
  // JOIN - group for the links
  const linksGroup = this._g.selectAll('.links').data([data['links']]);
  // ENTER MERGE the links group
  const linksGroupEnter = linksGroup
    .enter()
    .append('g')
    .merge(linksGroup)
    .attr('class', 'links');
  // EXIT the links group
  linksGroup.exit().remove();

  // nodes
  // append the nodes
  // JOIN the nodes group
  const nodesGroup = this._g.selectAll('.nodes').data([data['nodes']]);
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
            return d2['name'];
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
            return d2['name'];
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
      .text(d['name'])
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
        return d2['name'];
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
        return d2['name'];
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

  const leftMargin = 300;

  // if there is no play button add it
  if (this._g.select(selPlayButton).empty()) {
    that._animation = false; // the animation does not start automatically
    const cellPlay = 'M3,5V19L11,12M13,19H16V5H13M18,5V19H21V5';
    const cellPlayGroup = this._g
      .append('g')
      .attr('class', 'cell-buttons play-button')
      .attr('id', 'play-button')
      // change size of svg to 16px-16px
      .on('click', function() {
        that._animation = !that._animation;
        that.play();
      })
      .attr('transform', 'translate(' + leftMargin + ',10)');
    cellPlayGroup
      .append('rect')
      .attr('class', 'button-rect')
      .attr('x', 24)
      .attr('y', 0)
      .attr('width', 24)
      .attr('height', 24);
    cellPlayGroup
      .append('path')
      .attr('class', 'cell-play-icon')
      // translate to the second position
      .attr('transform', 'translate(24,0)')
      .attr('d', cellPlay);
  }
  // if there is not time slider add  it
  if (this._g.select(selTimeSlider).empty()) {
    const sliderMargin = 50;
    const sliderG = this._g
      .append('g')
      .attr('class', 'slider-holder')
      .attr('id', 'time-slider')
      .attr('transform', 'translate(' + sliderMargin + ',0)');
    // Append the slider
    const sliderWidth = this._width - leftMargin - 2 * sliderMargin;

    const svg = sliderG
      .append('g')
      .attr('width', sliderWidth + 30)
      .attr('height', 50);

    const x = d3
      .scaleLinear()
      .domain([0, this._animationData.length - 1])
      .range([0, sliderWidth])
      .clamp(true);
    const xMin = x(0);
    const xMax = x(this._animationData.length - 1);

    const slider = svg
      .append('g')
      .attr('class', 'slider')
      .attr('transform', 'translate(' + leftMargin + ',20)');

    slider
      .append('line')
      .attr('class', 'track')
      .attr('x1', 10 + x.range()[0])
      .attr('x2', 10 + x.range()[1]);

    const rect = slider
      .append('rect', '.track-overlay')
      .attr('class', 'handle')
      .attr('y', -8)
      .attr('x', x(that._timeIndex))
      .attr('rx', 3)
      .attr('height', 16)
      .attr('width', 20)
      .on('mouseover', function() {
        slider
          .append('text')
          .text(that._animationData[that._timeIndex]['graph']['time'])
          .style('font-size', '1em')
          .attr('x', 0)
          .attr('y', 25);
      })
      .on('mouseout', function() {
        slider.selectAll('text').remove();
      })
      .call(
        d3
          .drag()
          .on('start', function() {
            d3.select(this)
              .raise()
              .classed('active', true);
            that._animation = false;
          })
          .on('drag', function() {
            let x1 = d3.event.x;
            if (x1 > xMax) {
              x1 = xMax;
            } else if (x1 < xMin) {
              x1 = xMin;
            }
            d3.select(this).attr('x', x1);

            const newValue = Math.round(x.invert(d3.event.x));
            if (that._timeIndex !== newValue) {
              // update the slider
              that._timeIndex = newValue;
              slider
                .select('text')
                .text(that._animationData[that._timeIndex]['graph']['time'])
                .attr('y', 25);
              //  udpate the node link diagram
              that.drawAnimation();
            }
          })
          .on('end', function() {
            d3.select(this)
              .raise()
              .classed('active', false);
          })
      );

    // slider update for animation
    this.sliderUpdate = function() {
      rect
        .attr('x', x(that._timeIndex))
        .transition()
        .delay(50);
    };
  }
}
