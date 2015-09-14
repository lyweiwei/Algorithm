import _ from 'lodash';

function trimString(s) { return s.trim(); }

function getEdgeName(nodeFrom, nodeTo) {
  return _([nodeFrom, nodeTo]).map(trimString).join(' -> ');
}

function getEdgeNames(nodeA, nodeB) {
  return [
    getEdgeName(nodeA, nodeB),
    getEdgeName(nodeB, nodeA),
  ];
}

export class Graph {
  constructor(options) {
    this.nodes = {};
    this.edges = [];

    if (options) {
      if (_.isArray(options.nodes)) {
        _.forEach(options.nodes, this.addNode.bind(this));
      } else if (_.isObject(options.edges)) {
        _.forEach(options.nodes, (value, nodeName) => {
          this.addNode(nodeName, value);
        });
      }

      if (_.isArray(options.edges)) {
        _.forEach(options.edges, this.addEdge.bind(this));
      } else if (_.isObject(options.edges)) {
        _.forEach(options.edges, (value, edgeName) => {
          this.addEdge(edgeName, value);
        });
      }
    }
  }

  addNode(node, value) {
    this.nodes[node] = {
      value: value,
      adjacent: {}
    };
    return this;
  }

  ensureNode(node, value) {
    !this.nodes[node] && this.addNode(node, value);
    return this;
  }

  getNodeValue(node) {
    return _.result(this.nodes, [node, 'value']);
  }

  addEdge(...args) {
    let nodeA, nodeB, value;

    if (args[0].match('->')) {
      let nodes = _.map(arguments[0].split('->'), trimString);
      nodeA = nodes[0];
      nodeB = nodes[1];
      value = args[1];
    } else if (args.length > 1) {
      nodeA = args[0];
      nodeB = args[1];
      value = args[2];
    } else {
      throw new Error('incorrect edge specification');
    }

    return this._addEdge(nodeA, nodeB, value);
  }

  _addEdge(nodeA, nodeB, value) {
    this.ensureNode(nodeA).ensureNode(nodeB);
    let edge = {
      nodeA: nodeA,
      nodeB: nodeB,
      value: value
    };
    this.nodes[nodeA].adjacent[nodeB] = edge;
    this.nodes[nodeB].adjacent[nodeA] = edge;
    this.edges.push(edge);
    return this;
  }

  getEdgeValue(nodeA, nodeB) {
    return _.result(this.nodes, [nodeA, 'adjacent', nodeB, 'value']);
  }

  adjacent(nodeA, nodeB) {
    return !!this.nodes[nodeA].adjacent[nodeB];
  }

  iterateAdjacent(node, cb) {
    _.forEach(this.nodes[node].adjacent, function(edge, nodeTarget) {
      cb(nodeTarget, edge.value);
    });
  }

  _normalizeSearchOptions(options) {
    options = _.defaults({}, options, {
      visitNode: _.noop,
      visitEdge: _.noop,
      willFollowEdge: 'IfTowardUnvisitedNode'
    });

    let edgeVisited = {};
    let nodeVisited = {};
    let visitNode = options.visitNode;
    let visitEdge = options.visitEdge;

    options.visitNode = function (node, value) {
      visitNode(node, value);
      nodeVisited[node] = true;
    };

    options.nodeVisited = function (node) {
      // console.log(node);
      // console.log(nodeVisited[node]);
      return !!nodeVisited[node];
    };

    options.visitEdge = function (nodeFrom, nodeTo, value) {
      visitEdge(nodeFrom, nodeTo, value);
      _.forEach(getEdgeNames(nodeFrom, nodeTo), function (name) {
        edgeVisited[name] = true;
      });
    };

    options.edgeVisited = function (nodeFrom, nodeTo) {
      return !!edgeVisited[getEdgeName(nodeFrom, nodeTo)];
    };

    if (options.willFollowEdge === 'IfTowardUnvisitedNode') {
      options.willFollowEdge = function (nodeFrom, nodeTo, opt) {
        return !opt.nodeVisited(nodeTo);
      };
    } else if (options.willFollowEdge === 'IfUnvisited'){
      options.willFollowEdge = function (nodeFrom, nodeTo, opt) {
        return !opt.edgeVisited(nodeFrom, nodeTo);
      };
    }

    return options;
  }

  dfs(node, options) {
    options = this._normalizeSearchOptions(options);
    this._dfs(node, options);
  }

  _dfs(node, options) {
    options.onEnterNode && options.onEnterNode(node);
    options.visitNode(node, this.getNodeValue(node));
    this.iterateAdjacent(node, (nodeTarget, value) => {
      if (options.willFollowEdge(node, nodeTarget, {
        value: value,
        nodeVisited: options.nodeVisited,
        edgeVisited: options.edgeVisited
      })) {
        options.visitEdge(node, nodeTarget, value);
        this._dfs(nodeTarget, options);
      }
    });
    options.onLeaveNode && options.onLeaveNode(node);
  }

  bfs(node, options) {
    options = this._normalizeSearchOptions(options);
    this._bfs(node, options);
  }

  _bfs(node, options) {
    let q = [ node ];
    options.visitNode(node, this.getNodeValue(node));
    while (!_.isEmpty(q)) {
      let n = q.shift();
      this.iterateAdjacent(n, (nodeTarget, value) => {
        if (options.willFollowEdge(n, nodeTarget, {
          value: value,
          nodeVisited: options.nodeVisited,
          edgeVisited: options.edgeVisited
        })) {
          options.visitEdge(n, nodeTarget, value);
          options.visitNode(nodeTarget, this.getNodeValue(nodeTarget));
          q.push(nodeTarget);
        }
      });
    }
  }

}
