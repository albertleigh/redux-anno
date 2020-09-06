/**
 * Topological sorting function
 *
 * @param {Array} edges
 * @returns {Array}
 */

type Edges = Array<[string, string]>;

function toposort(nodes: string[], edges: Edges): string[] {
  let cursor = nodes.length,
    i = cursor;
  const sorted = new Array(cursor),
    visited: Record<number, boolean> = {},
    // Better data structures make algorithm much faster.
    outgoingEdges = makeOutgoingEdges(edges),
    nodesHash = makeNodesHash(nodes);

  // check for unknown nodes
  edges.forEach(function (edge) {
    if (!nodesHash.has(edge[0]) || !nodesHash.has(edge[1])) {
      throw new Error('Unknown node. There is an unknown node in the supplied edges.');
    }
  });

  while (i--) {
    if (!visited[i]) visit(nodes[i], i, new Set());
  }

  return sorted;

  function visit(node: string, i: number, predecessors: Set<string>) {
    if (predecessors.has(node)) {
      let nodeRep;
      try {
        nodeRep = ', node was:' + JSON.stringify(node);
      } catch (e) {
        nodeRep = '';
      }
      throw new Error('Cyclic dependency' + nodeRep);
    }

    if (!nodesHash.has(node)) {
      throw new Error(
        'Found unknown node. Make sure to provided all involved nodes. Unknown node: ' + JSON.stringify(node)
      );
    }

    if (visited[i]) return;
    visited[i] = true;

    let outgoing: any = outgoingEdges.get(node) || new Set();
    outgoing = Array.from(outgoing);

    if ((i = outgoing.length)) {
      predecessors.add(node);
      do {
        const child = outgoing[--i];
        visit(child, nodesHash.get(child)!, predecessors);
      } while (i);
      predecessors.delete(node);
    }

    sorted[--cursor] = node;
  }
}

function uniqueNodes(arr: Edges): string[] {
  const res = new Set<string>();
  for (let i = 0, len = arr.length; i < len; i++) {
    const edge = arr[i];
    res.add(edge[0]);
    res.add(edge[1]);
  }
  return Array.from(res);
}

function makeOutgoingEdges(arr: Edges): Map<string, Set<string>> {
  const edges = new Map<string, Set<string>>();
  for (let i = 0, len = arr.length; i < len; i++) {
    const edge = arr[i];
    if (!edges.has(edge[0])) edges.set(edge[0], new Set());
    if (!edges.has(edge[1])) edges.set(edge[1], new Set());
    edges.get(edge[0])!.add(edge[1]);
  }
  return edges;
}

function makeNodesHash(arr: string[]): Map<string, number> {
  const res = new Map();
  for (let i = 0, len = arr.length; i < len; i++) {
    res.set(arr[i], i);
  }
  return res;
}

export const array = toposort;

export default function (edges: Edges): string[] {
  return toposort(uniqueNodes(edges), edges);
}
