import { Graph, TraceEvent } from '../types';
import { nearestNeighbor } from './greedy';

interface BBNode {
  path: number[];
  matrix: number[][];
  bound: number;
  level: number;
  vertex: number;
}

const copyMatrix = (m: number[][]) => m.map(row => [...row]);

function reduceMatrix(matrix: number[][]): number {
  const n = matrix.length;
  let reductionCost = 0;

  // Reduce rows
  for (let i = 0; i < n; i++) {
    let min = Infinity;
    for (let j = 0; j < n; j++) {
      if (matrix[i][j] < min) min = matrix[i][j];
    }
    if (min !== Infinity && min > 0) {
      reductionCost += min;
      for (let j = 0; j < n; j++) {
        if (matrix[i][j] !== Infinity) matrix[i][j] -= min;
      }
    }
  }

  // Reduce columns
  for (let j = 0; j < n; j++) {
    let min = Infinity;
    for (let i = 0; i < n; i++) {
      if (matrix[i][j] < min) min = matrix[i][j];
    }
    if (min !== Infinity && min > 0) {
      reductionCost += min;
      for (let i = 0; i < n; i++) {
        if (matrix[i][j] !== Infinity) matrix[i][j] -= min;
      }
    }
  }

  return reductionCost;
}

export function* branchAndBound(graph: Graph, startCity = 0): Generator<TraceEvent> {
  const n = graph.cities.length;
  if (n <= 1) {
      yield { type: 'DONE', path: n === 1 ? [0, 0] : [], cost: 0, bestCost: 0, bestPath: n === 1 ? [0, 0] : [] };
      return;
  }

  // Get initial upper bound from Greedy
  let bestCost = Infinity;
  let bestPath: number[] = [];
  const greedyGen = nearestNeighbor(graph, startCity);
  let greedyRes = greedyGen.next();
  while (!greedyRes.done) {
      if (greedyRes.value.type === 'DONE') {
          bestCost = greedyRes.value.cost!;
          bestPath = greedyRes.value.path!;
      }
      greedyRes = greedyGen.next();
  }

  const initialMatrix = copyMatrix(graph.matrix);
  // Set diagonals to Infinity
  for (let i = 0; i < n; i++) initialMatrix[i][i] = Infinity;

  const initialBound = reduceMatrix(initialMatrix);

  let pq: BBNode[] = [];
  pq.push({
    path: [startCity],
    matrix: initialMatrix,
    bound: initialBound,
    level: 0,
    vertex: startCity
  });

  while (pq.length > 0) {
    // Pop node with smallest bound
    pq.sort((a, b) => a.bound - b.bound);
    const curr = pq.shift()!;

    yield {
      type: 'VISIT',
      path: [...curr.path],
      bestCost,
      bestPath: [...bestPath],
      cost: curr.bound,
      pruneReason: `Evaluating node. Bound: ${curr.bound.toFixed(2)}`
    };

    if (curr.bound >= bestCost) {
      yield {
        type: 'PRUNE',
        path: [...curr.path],
        bestCost,
        pruneReason: `Pruned! Bound ${curr.bound.toFixed(2)} >= Best ${bestCost.toFixed(2)}`
      };
      continue;
    }

    if (curr.level === n - 1) {
      // Reached a full path, return to start
      // Let's compute actual cost mathematically just to be safe
      let actualCost = 0;
      const fullPath = [...curr.path, startCity];
      for (let i = 0; i < n; i++) {
          actualCost += graph.matrix[fullPath[i]][fullPath[i+1]];
      }

      if (actualCost < bestCost) {
        bestCost = actualCost;
        bestPath = fullPath;
        yield {
          type: 'UPDATE_BEST',
          path: fullPath,
          cost: actualCost,
          bestCost,
          bestPath: fullPath,
          pruneReason: `New Best Cost Found: ${bestCost.toFixed(2)}`
        };
      }
      continue;
    }

    // Branch to unvisited nodes
    for (let i = 0; i < n; i++) {
        if (!curr.path.includes(i)) {
             // Create child node
             const childMatrix = copyMatrix(curr.matrix);
             
             // Set outgoing from curr and incoming to i as Infinity
             for (let j = 0; j < n; j++) {
                 childMatrix[curr.vertex][j] = Infinity;
                 childMatrix[j][i] = Infinity;
             }
             // Set back edge to Infinity
             childMatrix[i][startCity] = Infinity;

             const reduceCost = reduceMatrix(childMatrix);
             const childBound = curr.bound + curr.matrix[curr.vertex][i] + reduceCost;

             if (childBound < bestCost) {
                 pq.push({
                     path: [...curr.path, i],
                     matrix: childMatrix,
                     bound: childBound,
                     level: curr.level + 1,
                     vertex: i
                 });
             } else {
                 yield {
                     type: 'PRUNE',
                     path: [...curr.path, i],
                     bestCost,
                     pruneReason: `Child bound ${childBound.toFixed(2)} >= Best ${bestCost.toFixed(2)}`
                 };
             }
        }
    }
  }

  yield {
      type: 'DONE',
      path: bestPath,
      bestPath,
      bestCost,
      cost: bestCost
  };
}
