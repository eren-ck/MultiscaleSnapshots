/* global $, document*/

/**
 * Document ready function
 * @author Eren Cakmak eren.cakmak@uni-konstanz.de
 */

import 'bootstrap/dist/css/bootstrap.min.css';
import '../css/style.css';
import 'bootstrap';
import 'bootstrap-select/js/bootstrap-select';
import 'bootstrap-select/dist/css/bootstrap-select.css';
import '../../../static/materialdesignicons.min.css';
// import '@mdi/font/scss/materialdesignicons.scss';

import { initSVGs } from './init.js';

import { loadMetaData } from './data.js';

$(document).ready(function() {
  initSVGs();
  loadMetaData();
});
