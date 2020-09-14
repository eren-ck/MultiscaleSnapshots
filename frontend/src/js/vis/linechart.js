/* global d3*/
'use strict';

/**
 * Draw a line chart as a timeline visualization
 * @author Eren Cakmak eren.cakmak@uni-konstanz.de
 */

import { getTimeSeries } from '../data.js';

// DOM Selector
const selTooltip = '#tooltip-line-chart';

/**
 * Draw the a time line visualization as a linechart
 */
export function drawTimeline() {
  // defintion of the elements in the line chart
  const that = this;
  const margin = { top: 80, right: 220, bottom: 80, left: 80 };

  const width = this._width - margin['left'] - margin['right'];
  const height = this._height - margin['top'] - margin['bottom'];
  const dateTime = d3.timeParse('%a, %d %b %Y %H:%M:%S GMT');
  const dateFormat = d3.timeFormat('%x %I%p');

  const keys = [
    'average_clustering',
    'density',
    'number_of_nodes',
    'number_of_edges',
    'number_connected_components',
    'transitivity',
  ];
  const color = d3
    .scaleOrdinal()
    .domain(keys)
    .range([
      '#2D4057',
      '#7C8DA4',
      '#B7433D',
      '#2E7576',
      '#EE811D',
      '#af7aa1',
      '#ff9da7',
      '#9c755f',
      '#bab0ab',
    ]);
  let maxValue = 1;
  const lineData = [];

  let promise = getTimeSeries(this._start, this._end);

  promise.then(function(data) {
    that._removeAll();

    keys.forEach(function(key, i) {
      lineData.push({
        key: key,
        values: [],
      });
      data.forEach(function(d) {
        lineData[i]['values'].push({
          date: dateTime(d['date']),
          value: d[key],
        });
        maxValue = maxValue > d[key] ? maxValue : d[key];
      });
    });

    // x and y scale
    const xScale = d3
      .scaleTime()
      .domain(
        d3.extent(data, function(d) {
          return dateTime(d['date']);
        })
      )
      .range([0, width]);

    const yScale = d3
      .scaleLinear()
      .domain([0, maxValue])
      .range([height, 0]);

    const g = that._g
      .attr('id', 'linechart')
      .append('g')
      .attr(
        'transform',
        'translate(' + margin['left'] + ',' + margin['top'] + ')'
      );

    var xAxis = d3
      .axisBottom(xScale)
      .ticks(6)
      .tickFormat(dateFormat)
      .tickSizeOuter(12)
      .tickSizeInner(12);

    var yAxis = d3
      .axisLeft(yScale)
      .ticks(10, 's')
      .tickSize(-width);

    g.append('g')
      .attr('class', 'x axis')
      .attr('transform', 'translate(0, ' + height + ')')
      .call(xAxis)
      .call((g) => {
        g.selectAll('line').attr('stroke', '#A9A9A9');
        g.select('.domain').attr('stroke', '#A9A9A9');
      });

    g.append('g')
      .attr('class', 'y axis')
      .call(yAxis)
      .call((g) => {
        g.selectAll('text')
          .style('text-anchor', 'middle')
          .attr('x', -12)
          .attr('fill', '#A9A9A9');

        g.selectAll('line')
          .attr('stroke', '#A9A9A9')
          .attr('stroke-width', 0.7)
          .attr('opacity', 0.3);

        g.select('.domain').remove();
      });

    // CREATE LEGEND //
    var svgLegend = g
      .append('g')
      .attr('class', 'gLegend')
      .attr('transform', 'translate(' + (width + 20) + ',' + 0 + ')');

    var legend = svgLegend
      .selectAll('.legend')
      .data(keys)
      .enter()
      .append('g')
      .attr('class', 'legend')
      .attr('transform', function(d, i) {
        return 'translate(0,' + i * 20 + ')';
      });

    legend
      .append('circle')
      .attr('class', 'legend-node')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', 8)
      .style('fill', (d) => color(d));

    legend
      .append('text')
      .attr('class', 'legend-text')
      .attr('x', 8 * 2)
      .attr('y', 8 / 2)
      .style('fill', '#A9A9A9')
      .style('font-size', 12)
      .text((d) => d);

    // line generator
    const line = d3
      .line()
      .x(function(d) {
        return xScale(d['date']);
      })
      .y(function(d) {
        return yScale(d['value']);
      })
      .curve(d3.curveLinear);

    const series = g
      .selectAll('.line-g')
      .data(lineData)
      .enter()
      .append('g')
      .attr('class', 'line-g');

    series
      .append('path')
      .attr('class', 'line-chart-line')
      .attr('stroke', function(d) {
        return color(d['key']);
      })
      .attr('d', function(d) {
        return line(d['values']);
      });

    // TOOLTIP STUFF Upcoming
    const mouseG = g.append('g').attr('class', 'mouse-over-effects');

    mouseG
      .append('path')
      .attr('class', 'mouse-line')
      .style('opacity', '0');

    var mousePerLine = mouseG
      .selectAll('.mouse-per-line')
      .data(lineData)
      .enter()
      .append('g')
      .attr('class', 'mouse-per-line')
      .attr('key', function(d) {
        return d['key'];
      });

    mousePerLine
      .append('circle')
      .attr('r', 5)
      .style('fill', function(d) {
        return color(d['key']);
      })
      .style('opacity', '0');

    mouseG
      .append('svg:rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'none')
      .attr('pointer-events', 'all')
      .on('mouseout', function() {
        // on mouse out hide line, circles and text
        g.select('.mouse-line').style('opacity', '0');
        g.selectAll('.mouse-per-line circle').style('opacity', '0');
        g.selectAll('.mouse-per-line text').style('opacity', '0');
        d3.selectAll(selTooltip).style('display', 'none');
      })
      .on('mouseover', function() {
        // on mouse in show line, circles and text
        g.select('.mouse-line').style('opacity', '1');
        g.selectAll('.mouse-per-line circle').style('opacity', '1');
        d3.selectAll(selTooltip).style('display', 'block');
      })
      .on('mousemove', function() {
        const tooltipText = {};
        // update tooltip content, line, circles and text when mouse moves
        var mouse = d3.mouse(this);

        g.selectAll('.mouse-per-line').attr('transform', function(d) {
          var xDate = xScale.invert(mouse[0]);
          var bisect = d3.bisector(function(d) {
            return d['date'];
          }).left;
          var idx = bisect(d['values'], xDate);

          g.select('.mouse-line').attr('d', function() {
            var data = 'M' + xScale(d['values'][idx]['date']) + ',' + height;
            data += ' ' + xScale(d['values'][idx]['date']) + ',' + 0;
            return data;
          });
          // save the text stuff for the tooltip
          tooltipText['date'] = d['values'][idx]['date'];
          tooltipText[d3.select(this).attr('key')] = d['values'][idx]['value'];
          return (
            'translate(' +
            xScale(d['values'][idx]['date']) +
            ',' +
            yScale(d['values'][idx]['value']) +
            ')'
          );
        });

        let xPosition = d3.event.pageX + 20;
        let yPosition = d3.event.pageY + 20;

        d3.select(selTooltip)
          .style('display', 'inline-block')
          .style('left', xPosition + 'px')
          .style('top', yPosition + 'px')
          .style('font-size', '1.2em')
          .html(dateFormat(tooltipText['date']))
          .selectAll()
          .data(keys)
          .enter()
          .append('div')
          .style('color', function(key) {
            return color(key);
          })
          .style('font-size', '0.8em')
          .html(function(key) {
            return key + ': ' + tooltipText[key];
          });
      });
  });
}
