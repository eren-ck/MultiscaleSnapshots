# -*- coding: utf-8 -*-
"""
model - the multiscale temporal aggregation implementation with the hierarchy 
        levels, and snapshots
"""

# Author: Eren Cakmak <eren.cakmak@uni-konstanz.de>
#
# License: MIT

import pickle
import datetime
from collections import Counter
import math
import networkx as nx
from networkx.algorithms.community import greedy_modularity_communities
import numpy as np
from sklearn.neighbors import NearestNeighbors
from intervaltree import Interval, IntervalTree

hierarchy = None
num_summary_graphs = 3  # number of summary graphs

interval_tree = IntervalTree() # one interval tree interval search queries

def load_data(graph_file_path, graph_embeddings_path):
    """Load the graph data with the vectors.

        Keyword arguments:
        graph_file_path -- path to the graph file
        graph_embeddings_path -- path to the graph embeddings
    """
    global hierarchy
    with open(graph_file_path, 'rb') as f:
        graphs = pickle.load(f)
    with open(graph_embeddings_path, 'rb') as f:
        embeddings = pickle.load(f)

    hierarchy = Hierarchy(graphs, embeddings)
    print('Data loading done.')


class Hierarchy:
    def __init__(self, graphs, embeddings):
        """Initialize the hierarchy from a list of graphs.

            Keyword arguments:
            graphs -- list of networkX graphs 
            embeddings -- all the embeddings
        """
        self.graphs = graphs
        self.levels = {}
        self.height = 1

        self.embeddings = embeddings['embeddings']
        keys = np.array(embeddings['keys'])

        window = 2
        while window < len(self.graphs):
            self.height = self.height + 1
            # get the embeddings for the level
            level_vectors = self.embeddings[np.flatnonzero(
                np.core.defchararray.find(keys,
                                          str(self.height) + '_') != -1)]

            # window size
            window = int(math.pow(2, (self.height - 1)))
            self.levels[self.height] = Level(self.graphs, self.height,
                                             level_vectors)

        self.nodes_list = None
        self.filter_node_ids = []

    def __repr__(self):
        return str(self.levels)

    def __str__(self):
        return str(self.levels)

    def get_hierarchy_meta(self):
        """Return the hierarchy meta data as a dict
        """
        level_dict = {}
        for key, l in self.levels.items():
            level_dict[l.level] = {
                'level': l.level,
                'window_size': l.window_size,
                'overlap': l.overlap
            }

        # time
        time1 = datetime.datetime.combine(
            self.graphs[0].graph['time'][0],
            datetime.time(self.graphs[0].graph['time'][1].item()))
        time2 = datetime.datetime.combine(
            self.graphs[-1].graph['time'][0],
            datetime.time(self.graphs[-1].graph['time'][1].item()))
        return {
            'height': self.height,
            'time_steps': len(self.graphs),
            'levels': level_dict,
            'time_1': time1,
            'time_2': time2
        }

    def get_snapshot(self, level, num, graph_type, k=None, cluster=False):
        """Return the snapshot (level,num) of type of graph 
        """
        if level > self.height:
            print('Hierarchy height overflow')
            return None
        level = self.levels[level]
        return level.get_snapshot(num, graph_type, k, cluster,
                                  self.filter_node_ids)

    def get_timeseries(self, start, end):
        """Return graphs between start and end
        """
        start = datetime.datetime.strptime(start, '%a, %d %b %Y %H:%M:%S GMT')
        end = datetime.datetime.strptime(end, '%a, %d %b %Y %H:%M:%S GMT')
        result = []

        # get all graphs
        for G in self.graphs:
            t = datetime.datetime.combine(
                G.graph['time'][0], datetime.time(G.graph['time'][1].item()))
            if start <= t <= end:
                result.append({
                    'date':
                    t,
                    'number_of_nodes':
                    nx.number_of_nodes(G),
                    'number_of_edges':
                    nx.number_of_edges(G),
                    'number_connected_components':
                    nx.number_connected_components(G),
                    'density':
                    nx.density(G),
                    'average_clustering':
                    nx.average_clustering(G),
                    'transitivity':
                    nx.transitivity(G)
                })
        return result

    def get_nodes(self):
        """Return all nodes of the graph
        """
        if not self.nodes_list:
            s = set()
            for G in self.graphs:
                s.update(list(G.nodes(data='name', default='')))
            self.nodes_list = list(s)

        return self.nodes_list

    def filter_nodes(self, node_ids):
        """Set fillter for the hierarchy get data stuff
        """
        self.filter_node_ids = node_ids

    def check_snapshot(
            self,
            level,
            num,
    ):
        """Return bool if level contains an element at position num
        """
        if level > self.height:
            return False
        level = self.levels[level]
        return level.check_snapshot(num)

    def getAllNearestNeighbors(self, embedding, levels, k):
        """The k-nearest neigbors for all levels to the vector embedding
        """
        vec = np.array([embedding])
        # result
        result = {}
        for key, l in self.levels.items():
            if key in levels:
                # check how many embeddings are there
                if k > len(l.embeddings):
                    k = len(l.embeddings)
                # sklearn nearest neigbors kball
                nbrs = NearestNeighbors(n_neighbors=k,
                                        algorithm='ball_tree').fit(l.embeddings)
                neigh = nbrs.kneighbors(vec)

                # iterate over the results of the knn
                for i, index in enumerate(neigh[1][0]):
                    pos = int(math.floor(index / num_summary_graphs))
                    types = ['union', 'disjoint', 'intersection']
                    graph_type = types[index % num_summary_graphs]
                    # get more features if possible and append to results
                    if pos < len(l.snapshots):
                        start = l.snapshots[pos].time1
                        end = l.snapshots[pos].time2
                        n = {
                            'level': l.level,
                            'position': pos,
                            'graph_type': graph_type,
                            'distance': neigh[0][0][i],
                            'time1': start,
                            'time2': end
                        }
                        if key in result:
                            result[key].append(n)
                        else:
                            result[key] = [n]
        return result

    def get_animation_data(self, level, num):
        """Return the animation data list of graphs
        """
        if level > self.height:
            print('Hierarchy height overflow')
            return None
        level = self.levels[level]
        return level.get_animation_data(num, self.filter_node_ids)

    def get_interval_tree(self, start, end):
        """Return the correct interval in the intervall tree
        """
        start = datetime.datetime.strptime(start, '%a, %d %b %Y %H:%M:%S GMT')
        end = datetime.datetime.strptime(end, '%a, %d %b %Y %H:%M:%S GMT')

        indx1 = None
        indx2 = None
        # get indices of the dates of the graphs
        for idx, G in enumerate(self.graphs):
            t = datetime.datetime.combine(
                G.graph['time'][0], datetime.time(G.graph['time'][1].item()))
            if start <= t and indx1 is None:
                indx1 = idx
            if end <= t and indx2 is None:
                indx2 = idx - 1

        # query the interval tree and get the longest period
        query_result = sorted(interval_tree.envelop(indx1, indx2))
        longest = None
        period = 1

        for interval in query_result:
            if period < abs(interval.end - interval.begin):
                period = abs(interval.end - interval.begin)
                longest = interval.data

        return {'level': longest.level, 'pos': longest.num}


class Level:
    def __init__(self, graphs, level, embeddings):
        """Initialize a level from from a list of graphs.

            Keyword arguments:
            graphs -- list of networkX graphs 
            level -- number for the level used to create window size 
            embeddings -- embeddings of the level
        """
        self.graphs = graphs
        self.level = level
        self.window_size = int(math.pow(2, (level - 1)))
        self.overlap = int(self.window_size / 2)
        self.embeddings = embeddings

        # initialize the snapshots
        if self.window_size < 1:
            raise ValueError('Window size of level below 1')
        if self.overlap > 0:
            self.snapshots = []

            # split the numpy array in n-sized chuncks
            snap_vectors = []
            for i in range(0, len(self.embeddings), num_summary_graphs):
                snap_vectors.append(self.embeddings[i:i + num_summary_graphs])

            indx = 0

            if len(self.graphs) > self.window_size:
                for i in range(0, len(self.graphs), self.overlap):
                    self.snapshots.append(
                        Snapshot(self.graphs, i, i + self.window_size,
                                 snap_vectors[indx], self.level, indx))
                    indx = indx + 1
            else:
                self.snapshots.append(
                    Snapshot(self.graphs, 0, self.window_size,
                             snap_vectors[indx], self.level, indx))
        else:
            self.snapshots = self.graphs

    def __repr__(self):
        return 'Level: ' + str(self.level) + ' - ' + str(
            self.window_size) + ' - ' + str(self.overlap)

    def __str__(self):
        return 'Level: ' + str(self.level) + ' - ' + str(
            self.window_size) + ' - ' + str(self.overlap)

    def get_snapshot(self,
                     num,
                     graph_type,
                     k=None,
                     cluster=False,
                     filter_node_ids=[]):
        """Return the snapshot (num) of type of graph 
        """
        if num > len(self.snapshots):
            print('Snapshot number is bigger than level')
            return None
        return self.snapshots[num].get_snapshot(graph_type, k, cluster,
                                                filter_node_ids)

    def check_snapshot(self, num):
        """Return true if the snapshot is in the level 
        """
        if num < 0 or num >= len(self.snapshots):
            return False
        return True

    def get_animation_data(self, num, filter_node_ids=[]):
        """Return the list of snapshots (num) of type of graph 
        """
        if num > len(self.snapshots):
            print('Snapshot number is bigger than level')
            return None
        return self.snapshots[num].get_animation_data(filter_node_ids)


class Snapshot:
    def __init__(self, graphs, indx1, indx2, embeddings, level, num):
        """Initialize snapshot from a list of graphs.

            Keyword arguments:
            graphs -- list of networkX graphs 
            indx1 -- first index in the overall graph list
            indx2 -- last index in the overall graph list
            embeddings -- embeddings of the snap with num_summary_graphs graphs 
                          The order is [union_graph, disjoin_graph, intersection_graph)
            level - required for interval tree
            num - required for interval tree
        """
        self.graphs = graphs[indx1:indx2]
        self.indx1 = indx1
        self.indx2 = indx2
        self.embeddings = embeddings
        self.level = level
        self.num = num
        self.time1 = datetime.datetime.combine(
            self.graphs[0].graph['time'][0],
            datetime.time(self.graphs[0].graph['time'][1].item()))
        self.time2 = datetime.datetime.combine(
            self.graphs[-1].graph['time'][0],
            datetime.time(self.graphs[-1].graph['time'][1].item()))
        self.duration = self.time2 - self.time1
        # store the snapshot union graph for the snapshot - saves time
        # As the graph does not have to be recomputed - important for root for exampel
        self.union_g = None

        # occurences of nodes over time in a dict
        nodes = []
        for g in self.graphs:
            nodes.append(g.nodes)
        # get number of occurences
        self.node_occ = Counter(x for xs in nodes for x in set(xs))

        # add to interval graph
        interval_tree[self.indx1:self.indx2] = self

    def __repr__(self):
        return 'Snapshot: ' + str(self.time1) + ' - ' + str(self.time2)

    def __str__(self):
        return 'Snapshot: ' + str(self.time1) + ' - ' + str(self.time2)

    def union_graph(self):
        # if already computed just return
        if not self.union_g:
            G = nx.Graph()
            for graph in self.graphs:
                G.add_nodes_from(graph.nodes(data=True))
                G.add_edges_from(graph.edges(data=True))

            G.graph['time'] = [self.time1, self.time2]
            # return embedding as graph attribute
            G.graph['embeddings'] = self.embeddings[0].tolist()
            self.union_g = G

        #filter the union graph
        if len(self.filter_node_ids):
            G = self.union_g.subgraph(self.filter_node_ids)
        else:
            G = self.union_g
        return G

    def disjoint_graph(self, num):
        """Return intersection graph .

            Keyword arguments:
            num -- number of occurences in the sequence of graphs required to be in the disjoint graph (below the number)
        """
        # filter out all occurence values below 1 and return nodes
        nodes_dict = {
            x: self.node_occ[x]
            for x in self.node_occ if self.node_occ[x] <= num
        }
        # union graph
        union_g = self.union_graph()

        # return the subgraph matching all the nodes dict
        G = union_g.subgraph([*nodes_dict])
        # return embedding as graph attribute
        G.graph['embeddings'] = self.embeddings[1].tolist()
        G.graph['time'] = [self.time1, self.time2]
        return G

    def intersection_graph(self, num):
        """Return intersection graph .

            Keyword arguments:
            num -- number of occurences in the sequence of graphs required to be in the intersection graph 
        """
        nodes_dict = {
            x: self.node_occ[x]
            for x in self.node_occ if self.node_occ[x] >= 2
        }
        # union graph
        union_g = self.union_graph()

        # return the subgraph matching all the nodes dict
        G = union_g.subgraph([*nodes_dict])
        G.graph['embeddings'] = self.embeddings[2].tolist()
        G.graph['time'] = [self.time1, self.time2]
        return G

    def get_summaries(self, num):
        """Return all graph summaries in a list.

            Keyword arguments:
            num -- number of occurences in, please see intersection, and disjoint methods 
        """
        return [
            self.union_graph(),
            self.disjoint_graph(num),
            self.intersection_graph(num)
        ]

    def get_snapshot(self,
                     graph_type,
                     k=None,
                     cluster=False,
                     filter_node_ids=[]):
        """Return the snapshot of type of graph. 
        k defines the number of times the nodes has to appear 
        """
        # update the filter
        self.filter_node_ids = filter_node_ids

        if graph_type not in ['union', 'disjoint', 'intersection']:
            print('Graph type is not defined')
            return None

        if k and k <= 0:
            print('The number k is not correctly defined')
            return None

        if graph_type == 'union':
            G = self.union_graph()
        elif graph_type == 'disjoint':
            G = self.disjoint_graph(k)
        elif graph_type == 'intersection':
            G = self.intersection_graph(k)
        else:
            print('Graph type not known.')
            return None

        # do the clustering
        if cluster and len(G.nodes) > 100:
            # H will be the new graph with meta nodes
            H = nx.Graph()
            H.graph = G.graph
            # coompute
            partition = greedy_modularity_communities(G, weight='sentiment')

            B = nx.quotient_graph(G,
                                  partition,
                                  create_using=nx.MultiGraph,
                                  relabel=True)
            # iterate over the node groups
            for i, meta_node in enumerate(B.nodes()):
                G_tmp = B.nodes[meta_node]['graph']
                ids = list(G_tmp)
                names = list(
                    dict(G_tmp.nodes(data='name', default='')).values())
                # coordinates mean
                coord = list(
                    dict(G_tmp.nodes(data='coord', default='')).values())
                coord = [float(sum(l)) / len(l) for l in zip(*coord)]
                H.add_node(i,
                           ids=ids,
                           name=names,
                           coord=coord,
                           is_cluster=True,
                           cluster_size=len(ids))
            # iterate over the groups
            for u, v, d in B.edges(data=True):
                H.add_edge(u,
                           v,
                           sentiment=d['sentiment'],
                           time=d['time'],
                           is_cluster=True)
            # replace G with H
            G = H
        # compute metrics
        metrics = {}
        metrics['number_of_nodes'] = nx.number_of_nodes(G)
        if metrics['number_of_nodes']:
            metrics['number_of_edges'] = nx.number_of_edges(G)
            metrics['size'] = G.size()
            metrics['density'] = nx.density(G)
            metrics['average_clustering'] = nx.average_clustering(G)
            metrics['transitivity'] = nx.transitivity(G)
            G.graph['metrics'] = metrics

            # compute node attributes
            nx.set_node_attributes(G, nx.clustering(G), 'clustering')
            nx.set_node_attributes(G, nx.degree_centrality(G),
                                   'degree_centrality')
            nx.set_node_attributes(G, dict(G.degree()), 'degree')

        return G

    def get_animation_data(self, filter_node_ids=[]):
        """Returns the list of snapshots with filtering
        """
        self.filter_node_ids = filter_node_ids

        #filter the graphs
        graphs = []
        for H in self.graphs:
            # a little hack - requires more memory - easier to handle
            G = nx.Graph()
            G.add_nodes_from(H.nodes(data=True))
            G.add_edges_from(H.edges(data=True))

            G.graph['time'] = datetime.datetime.combine(
                H.graph['time'][0], datetime.time(H.graph['time'][1].item()))

            if len(self.filter_node_ids):
                graphs.append(G.subgraph(self.filter_node_ids))
            else:
                graphs.append(G)

        return graphs