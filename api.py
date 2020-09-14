# -*- coding: utf-8 -*-
"""
API - for querying the data 
"""

# Author: Eren Cakmak <eren.cakmak@uni-konstanz.de>
#
# License: MIT

import logging

from flask import Blueprint, Response, jsonify, request
import networkx as nx
from networkx.readwrite import json_graph
import json
from distutils.util import strtobool

import model

backend_api = Blueprint('api', __name__)

logger = logging.getLogger(__name__)


@backend_api.route("/hierarchy_meta")
def get_hierarchy_meta():
    """Return meta data of the whole hierachy
    """
    return jsonify(model.hierarchy.get_hierarchy_meta())


@backend_api.route("/graph")
def get_graph():
    """Return a specifc single snapshot
    """
    # level as a n int
    level = int(request.args.get('level'))
    # the num snapshot in the level
    num = int(request.args.get('num'))
    #   graph_type : type of the union, disjoint, intersection
    graph_type = request.args.get('graph_type')
    # k for disjoint and intersection
    k = int(request.args.get('k', -1))
    # get the cluster boolean
    cluster = strtobool(request.args.get('cluster'))

    if not isinstance(level, int) or not isinstance(
            num, int) or not graph_type or not isinstance(k, int):
        return jsonify({})

    if k > 0:
        G = model.hierarchy.get_snapshot(level, num, graph_type, k, cluster)
    else:
        G = model.hierarchy.get_snapshot(level, num, graph_type, cluster)

    if (G):
        return json_graph.node_link_data(G)
    return {}


@backend_api.route("/intervall_tree")
def get_intervall_tree():
    """Return return the interval tree information
    """
    # get the start and end date
    start = request.args.get('start_dateTime')
    end = request.args.get('end_dateTime')

    result = model.hierarchy.get_interval_tree(start, end)
    return jsonify(result)


@backend_api.route("/timeseries")
def get_timeseries():
    """Return time series data over time for a interval
    """
    # get the start and end date
    start = request.args.get('start_dateTime')
    end = request.args.get('end_dateTime')

    result = model.hierarchy.get_timeseries(start, end)
    return jsonify(result)


@backend_api.route("/get_all_nodes")
def get_all_nodes():
    """Return all nodes of the hierarchy - reuqired for filtering
    """
    return jsonify(model.hierarchy.get_nodes())


@backend_api.route("/filter_nodes", methods=['POST'])
def filter_nodes():
    """set the filter nodes for the hierarchy
    """
    node_ids = json.loads(request.get_data())
    model.hierarchy.filter_nodes(list(map(int, node_ids)))
    return {}


@backend_api.route("/check_graph")
def check_graph():
    """Returns true if there is a specific snapshot 
    """
    # level as a n int
    level = int(request.args.get('level'))
    # the num snapshot in the level
    num = int(request.args.get('num'))

    if not isinstance(level, int) or not isinstance(num, int):
        return jsonify(False)

    return jsonify(model.hierarchy.check_snapshot(level, num))


@backend_api.route("/search_all_levels")
def search_all_levels():
    """Knn search on all levels return k nearest neighbors
    """
    embedding = json.loads(request.args.get('embedding'))
    levels = list(map(int, json.loads(request.args.get('levels'))))
    k = int(request.args.get('k'))
    
    result = model.hierarchy.getAllNearestNeighbors(embedding, levels, k)
    return jsonify(result)


@backend_api.route("/animation_data")
def get_animation_data():
    """Returns a list of graphs for the animatino of grpahs
    """
    # level as a n int
    level = int(request.args.get('level'))
    # the num snapshot in the level
    num = int(request.args.get('num'))

    if not isinstance(level, int) or not isinstance(
            num, int) :
        return jsonify({})

    graphs = model.hierarchy.get_animation_data(level, num)

    if len(graphs):
        result = []
        for G in graphs:
            if (G):
                result.append(json_graph.node_link_data(G))
        return jsonify(result)
    return {}
