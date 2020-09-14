/* global $, d3, alert*/

/**
 * Ajax queries for getting the data from the backend
 * @author Eren Cakmak eren.cakmak@uni-konstanz.de
 */

import { initHierarchy, updateHierarchyData } from './hierarchy.js';
import { initToolbar } from './init.js';

// DOM Selector
const selSpinner = '#spinner';

// let selectedNodes = []; // Array of the node ids which should be displayed
const url = 'http://127.0.0.1:8000/';
const JSONAPI_MIMETYPE = 'application/vnd.api+json';

let clusterBool = false;

/**
 * Load the dynamic graph data
 */
export function loadMetaData() {
  // let dataSetPercentile = [];
  $.ajax({
    url: url + 'hierarchy_meta',
    dataType: 'json',
    type: 'GET',
    contentType: 'application/json; charset=utf-8',
    headers: {
      Accept: JSONAPI_MIMETYPE,
    },
    success: function(data) {
      // initialize the toolbar
      initToolbar();
      // initialize the hierarchy
      initHierarchy(data);
    },
    error: function(request) {
      alert('Hierarchy meta data could not be loaded!' + request.responseText);
    },
  });
}

/**
 * Return the snapshot between
 * @param  {Number} level Level of snapshot
 * @param  {Number} pos Positions of the snapshot
 * @param  {String} graphType Graph type
 * @return {Promise} Return promise
 */
export function getGraphData(level, pos, graphType) {
  // show spinner again
  $(selSpinner).show();
  const tmpURL =
    url +
    'graph?level=' +
    level +
    '&num=' +
    pos +
    '&graph_type=' +
    graphType +
    '&k=' +
    Math.pow(2, level - 1) +
    '&cluster=' +
    clusterBool;
  return d3.json(tmpURL);
}

/**
 * Check if there is a cell of level with the position
 * @param  {Number} level Level of snapshot
 * @param  {Number} pos Positions of the snapshot
 * @return {Promise} Return promise
 */
export function checkGraphData(level, pos) {
  const tmpURL = url + 'check_graph?level=' + level + '&num=' + pos;
  return d3.json(tmpURL);
}

/**
 * Get the time series data between the two
 * @param {String} start first date
 * @param {End} end end date
 * @return {Promise} promise to get the data
 */
export function getTimeSeries(start, end) {
  return $.ajax({
    url: url + 'timeseries',
    type: 'GET',
    dataType: 'json',
    contentType: 'application/json; charset=utf-8',
    headers: {
      Accept: JSONAPI_MIMETYPE,
    },
    data: {
      start_dateTime: start,
      end_dateTime: end,
    },
  });
}

/**
 * Get the nodes with ids
 * @return {Promise} Return promise
 */
export function getNodes() {
  return $.ajax({
    url: url + 'get_all_nodes',
    type: 'GET',
    dataType: 'json',
    contentType: 'application/json; charset=utf-8',
    headers: {
      Accept: JSONAPI_MIMETYPE,
    },
  });
}

/**
 * get the k-nearest neigbors for all levels
 * @param  {Array} embeddings embedding of the search
 * @param  {Array} levels array of levels which are to be searched
 * @param  {Number} k k - nearest neighbors
 * @return {Promise} Return promise
 */
export function searchAllLevels(embeddings, levels, k) {
  return $.ajax({
    url: url + 'search_all_levels',
    type: 'GET',
    dataType: 'json',
    contentType: 'application/json; charset=utf-8',
    headers: {
      Accept: JSONAPI_MIMETYPE,
    },
    data: {
      embedding: JSON.stringify(embeddings),
      levels: JSON.stringify(levels),
      k: k,
    },
  });
}

/**
 * Set the selected nodes needed for filtering
 * @param  {Array} ids    String Array of ids
 */
export function setFilteredNodes(ids) {
  $.ajax({
    url: url + 'filter_nodes',
    type: 'POST',
    dataType: 'json',
    contentType: 'application/json; charset=utf-8',
    headers: {
      Accept: JSONAPI_MIMETYPE,
    },
    data: JSON.stringify(ids),
    success: function() {
      updateHierarchyData();
    },
  });
}

/**
 * Returns a list of graphs
 * @param  {Number} level Level of snapshot
 * @param  {Number} pos Positions of the snapshot
 * @return {Promise} Return promise
 */
export function getAnimationData(level, pos) {
  // show spinner again
  $(selSpinner).show();
  const tmpURL = url + 'animation_data?level=' + level + '&num=' + pos;
  return d3.json(tmpURL);
}

/**
 * Search the intervall tree to get the best fitting interval
 * @param {String} start first date
 * @param {End} end end date
 * @return {Promise} Return promise
 */
export function searchIntervalTree(start, end) {
  return $.ajax({
    url: url + 'intervall_tree',
    type: 'GET',
    dataType: 'json',
    contentType: 'application/json; charset=utf-8',
    headers: {
      Accept: JSONAPI_MIMETYPE,
    },
    data: {
      start_dateTime: start.toUTCString(),
      end_dateTime: end.toUTCString(),
    },
  });
}

/**
 * SETTER AND GETTER
 */

/**
 * Set the clustering bool to true false
 * @param {Boolean} tmp new boolean
 */
export function setClusterBool(tmp) {
  clusterBool = tmp;
  updateHierarchyData();
}
