/* global d3, $*/
'use strict';

/**
 * Extract and compute graph metrics
 * @author Eren Cakmak eren.cakmak@uni-konstanz.de
 */

const metricsData = {};
const sel = '#graph-metrics';
const selLegend = '#svg-graph-legend';
const colorScheme = d3.scaleLinear().range(['#f7fbff', '#9ecae1']);

/**
 * Adds the metric to the metricsData object
 * @param {Number} level Level of the snapshot
 * @param {Number} pos position of the snapshot
 * @param {String} metric Metric
 */
export function addMetric(level, pos, metric) {
  const sel = 'L' + level + pos;
  metricsData[sel] = metric;
}

/**
 * Returns the color of the cell
 * @param {Number} value object with all data of the cell
 * @return {String} color of a cell
 */
export function getCellColor(value) {
  let color = '#fff';
  const selected = $(sel + ' option:selected').attr('metric');
  // if else for the different opitions
  if (selected !== '') {
    const data = Object.values(metricsData).map(function(d) {
      return d[selected];
    });
    colorScheme.domain(d3.extent(data));
    color = colorScheme(value[selected]);
  }
  _updateLegend();
  return color;
}

/**
 * Update the legend of the graph metrics
 */
function _updateLegend() {
  const svgLegend = d3.select(selLegend);
  // vars for the legend
  const legendSwatchWidth = 40;
  const legendSwatchHeight = 20;

  // the color legend
  const legend = svgLegend.selectAll('rect.legend').data(function() {
    if ($(sel + ' option:selected').attr('metric') !== '') {
      return colorScheme.range();
    } else {
      return [];
    }
  });

  // ENTER - legend
  legend
    .enter()
    .append('rect')
    .attr('class', 'legend')
    .attr('width', legendSwatchWidth)
    .attr('height', legendSwatchHeight)
    .attr('y', 0)
    .attr('x', function(d, i) {
      return i * legendSwatchWidth + 'px';
    })
    .style('fill', function(d) {
      return d;
    });

  // EXIT - legend
  legend.exit().remove();

  // DATA JOIN
  // color legend text
  const legendText = svgLegend.selectAll('text.legend-text').data(function() {
    if ($(sel + ' option:selected').attr('metric') !== '') {
      return colorScheme.domain();
    } else {
      return [];
    }
  });

  // ENTER - legend text
  legendText
    .enter()
    .append('text')
    .attr('class', 'legend-text')
    .attr('y', 2 * legendSwatchHeight)
    .attr('x', function(d, i) {
      return i * legendSwatchWidth + 3 + 'px';
    })
    .merge(legendText)
    .text(function(d) {
      if (parseFloat(d) > 10) {
        return parseFloat(d).toFixed(0);
      }
      return parseFloat(d).toFixed(4);
    });

  // EXIT - legend text
  legendText.exit().remove();
}
