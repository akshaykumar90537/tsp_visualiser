import { Graph, TraceEvent } from '../types';

export function* nearestNeighbor(graph: Graph, startCity = 0): Generator<TraceEvent> {
  const n = graph.cities.length;
  // Handle edge case of tiny graphs
  if (n === 0) return;
  if (n === 1) {
    yield { type: 'DONE', path: [0, 0], cost: 0, bestCost: 0, bestPath: [0, 0] };
    return;
  }

  const visited = new Set<number>();
  const path: number[] = [startCity];
  visited.add(startCity);
  
  let currentCity = startCity;
  let totalCost = 0;

  yield {
    type: 'VISIT',
    path: [...path],
    cost: totalCost
  };

  while (visited.size < n) {
    let nearest = -1;
    let minDistance = Infinity;

    for (let i = 0; i < n; i++) {
      if (!visited.has(i)) {
        const dist = graph.matrix[currentCity][i];
        if (dist < minDistance) {
          minDistance = dist;
          nearest = i;
        }
      }
    }

    visited.add(nearest);
    path.push(nearest);
    totalCost += minDistance;
    currentCity = nearest;

    yield {
      type: 'VISIT',
      path: [...path],
      cost: totalCost
    };
  }

  // Return to start to complete the tour
  totalCost += graph.matrix[currentCity][startCity];
  path.push(startCity);

  yield {
    type: 'DONE',
    path: [...path],
    cost: totalCost,
    bestCost: totalCost,
    bestPath: [...path]
  };
}
