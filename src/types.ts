export interface City {
  id: number;
  x: number;
  y: number;
}

export interface Graph {
  cities: City[];
  matrix: number[][];
}

export type EventType = 'VISIT' | 'PRUNE' | 'UPDATE_BEST' | 'DONE';

export interface TraceEvent {
  type: EventType;
  path: number[];       // The current partial or full path being explored
  cost?: number;        // The cost of the current path
  bestCost?: number;    // The current known upper bound / best cost
  bestPath?: number[];  // The current best path
  pruneReason?: string; // Information for UI (e.g. "Lower bound 120 > Best 100")
}

// Helper to calculate Euclidean distance
export function calculateDistance(cityA: City, cityB: City): number {
  const dx = cityA.x - cityB.x;
  const dy = cityA.y - cityB.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Generate random cities within a bounded area
export function generateRandomCities(numCities: number, width: number, height: number): City[] {
  const cities: City[] = [];
  // Keep some padding from edges
  const padding = 40;
  for (let i = 0; i < numCities; i++) {
    cities.push({
      id: i,
      x: padding + Math.random() * (width - padding * 2),
      y: padding + Math.random() * (height - padding * 2)
    });
  }
  return cities;
}

// Build adjacency matrix for a set of cities
export function buildDistanceMatrix(cities: City[]): number[][] {
  const n = cities.length;
  const matrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        matrix[i][j] = calculateDistance(cities[i], cities[j]);
      }
    }
  }
  return matrix;
}
