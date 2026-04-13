export interface City {
  id: number;
  x: number;
  y: number;
  lat: number;
  lng: number;
  name?: string;
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

// Helper: Haversine distance (Kilometers)
export function calculateDistance(cityA: City, cityB: City): number {
  const R = 6371; // Earth radius in km
  const dLat = (cityB.lat - cityA.lat) * Math.PI / 180;
  const dLng = (cityB.lng - cityA.lng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(cityA.lat * Math.PI / 180) * Math.cos(cityB.lat * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Generate random cities within a bounded area
export function generateRandomCities(numCities: number, width: number, height: number): City[] {
  const cities: City[] = [];
  const padding = 40;

  // New York central area default
  const baseLat = 40.7128;
  const baseLng = -74.0060;

  for (let i = 0; i < numCities; i++) {
    cities.push({
      id: i,
      x: padding + Math.random() * (width - padding * 2),
      y: padding + Math.random() * (height - padding * 2),
      lat: baseLat + (Math.random() - 0.5) * 0.1,
      lng: baseLng + (Math.random() - 0.5) * 0.1,
      name: `City ${i}`
    });
  }
  return cities;
}

// Build adjacency matrix for a set of cities (uses Haversine real distance)
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
