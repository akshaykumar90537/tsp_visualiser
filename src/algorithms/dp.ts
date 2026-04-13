import { Graph, TraceEvent } from '../types';

export function* dynamicProgramming(graph: Graph, startCity = 0): Generator<TraceEvent> {
  const n = graph.cities.length;
  if (n <= 1) {
    yield { type: 'DONE', path: n === 1 ? [0, 0] : [], cost: 0, bestCost: 0, bestPath: n === 1 ? [0, 0] : [] };
    return;
  }

  // To avoid blocking, we yield progress events.
  // dp[mask][i] = min cost to visit subset defined by 'mask', ending at city 'i'
  const dp: number[][] = Array(1 << n).fill(0).map(() => Array(n).fill(Infinity));
  const parent: number[][] = Array(1 << n).fill(0).map(() => Array(n).fill(-1));

  // Initialize: start from startCity
  dp[1 << startCity][startCity] = 0;

  // Iterate over subset sizes
  for (let size = 2; size <= n; size++) {
    // Generate all subsets of length 'size' containing 'startCity'
    // To visualize, we'll yield once per subset size start
    yield {
      type: 'VISIT',
      path: [startCity],
      pruneReason: `Evaluating subsets of size ${size}`,
    };

    for (let mask = 0; mask < (1 << n); mask++) {
      // mask must contain startCity and have exactly 'size' bits set
      if (!(mask & (1 << startCity))) continue;
      
      let bits = 0;
      for (let j = 0; j < n; j++) {
        if (mask & (1 << j)) bits++;
      }
      if (bits !== size) continue;

      // For this subset, try ending at each city 'u' in the subset (except startCity)
      for (let u = 0; u < n; u++) {
        if (u === startCity || !(mask & (1 << u))) continue;

        let prevMask = mask ^ (1 << u);
        let minCost = Infinity;
        let bestPrevNode = -1;

        // Find best previous node 'v'
        for (let v = 0; v < n; v++) {
          if (v === u || !(prevMask & (1 << v))) continue;
          
          let cost = dp[prevMask][v] + graph.matrix[v][u];
          if (cost < minCost) {
            minCost = cost;
            bestPrevNode = v;
          }
        }

        dp[mask][u] = minCost;
        parent[mask][u] = bestPrevNode;
      }
    }
  }

  // Find optimal return to startCity
  let minPathCost = Infinity;
  let lastNode = -1;
  const fullMask = (1 << n) - 1;

  for (let u = 0; u < n; u++) {
    if (u === startCity) continue;
    let cost = dp[fullMask][u] + graph.matrix[u][startCity];
    if (cost < minPathCost) {
      minPathCost = cost;
      lastNode = u;
    }
  }

  // Backtrack to build path
  const bestPath: number[] = [startCity];
  let currentMask = fullMask;
  let curr = lastNode;

  while (curr !== -1 && curr !== startCity) {
    bestPath.push(curr);
    const nextNode = parent[currentMask][curr];
    currentMask = currentMask ^ (1 << curr);
    curr = nextNode;
  }
  
  bestPath.reverse();
  bestPath.push(startCity); // return to start

  yield {
    type: 'DONE',
    path: bestPath,
    cost: minPathCost,
    bestCost: minPathCost,
    bestPath: bestPath
  };
}
