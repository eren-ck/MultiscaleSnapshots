/* global d3*/
'use strict';

/**
 * Timeline vis above the hierarchy
 * Context visulization in order to keep track of the time intervals
 * @author Eren Cakmak eren.cakmak@uni-konstanz.de
 */

export const TIMELINE_HEIGHT = 25;

const margin = {
  top: 5,
  right: 5,
  bottom: 5,
  left: 5,
};
let g;
let timeScale;
var dateTime = d3.timeParse('%a, %d %b %Y %H:%M:%S GMT');
let dateFormat = d3.timeFormat('%b %Y');

/**
 * Initialize the timeline visualization
 * @param {object} svg  - svg to append the timeline vis
 * @param {number} width  width of the svg
 * @param {Date} start  Beginning of the first graph
 * @param {Date} end  End date of the graph
 */
export function initTimeline(svg, width, start, end) {
  g = svg
    .append('g')
    .attr('transform', 'translate(' + margin.left + ', ' + 0 + ')')
    .attr('id', 'timeline-group');

  start = dateTime(start);
  end = dateTime(end);

  // append first text for the
  const leftText = g
    .append('text')
    .attr('dy', '.35em')
    .text(dateFormat(start))
    .attr('x', 0)
    .attr('y', TIMELINE_HEIGHT / 2);

  const rightText = g
    .append('text')
    .attr('dy', '.35em')
    .text(dateFormat(end))
    .attr('x', function() {
      return width - this.getComputedTextLength() + margin.right;
    })
    .attr('y', TIMELINE_HEIGHT / 2);

  const x = leftText.node().getComputedTextLength() + 5;
  const timelineWidth = width - rightText.node().getComputedTextLength() - x;
  const timelineHeight = TIMELINE_HEIGHT - margin.top - margin.bottom;

  // append timeline bar
  g.append('rect')
    .attr('x', x)
    .attr('y', margin.top)
    .attr('width', timelineWidth)
    .attr('height', timelineHeight)
    .attr('class', 'timeline');

  // define the xScale
  timeScale = d3
    .scaleLinear()
    .domain([start, end])
    .range([x, x + timelineWidth]);
}

/**
 * Add an time interval to the svg with the level position, start end also for highlight later
 * @param {String} level level of the cell
 * @param {Number} position  position of the cell
 * @param {number} start of the cell
 * @param {number} end of the cell
 */
export function addTimeLineHover(level, position, start, end) {
  const timelineHeight = TIMELINE_HEIGHT - margin.top - margin.bottom;
  // append the hover time line
  g.append('rect')
    .attr('class', 'timeline-hover')
    .attr('id', 'timeline-hover-' + level + '-' + position)
    .attr('x', timeScale(start))
    .attr('width', timeScale(end) - timeScale(start))
    .attr('y', margin.top)
    .attr('height', timelineHeight);
}
/**
 * Removes the hover time line
 */
export function removeHoverTimeline() {
  g.selectAll('.timeline-hover').remove();
}
