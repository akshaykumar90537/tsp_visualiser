import React from 'react';
import { City, TraceEvent } from '../types';

interface GraphCanvasProps {
  cities: City[];
  currentEvent: TraceEvent | null;
  bestPath: number[] | null;
  width: number;
  height: number;
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({ cities, currentEvent, bestPath, width, height }) => {
  // Renders the graph

  return (
    <svg width={width} height={height} className="w-full h-full overflow-visible">
      {/* Background static edges (grayed out) could go here if N is small, but maybe too clustered */}
      
      {/* 1. Best Path (Green) */}
      {bestPath && bestPath.length > 1 && (
        <g className="best-path">
          {bestPath.map((cityId, idx) => {
            if (idx === bestPath.length - 1) return null;
            const nextCityId = bestPath[idx + 1];
            const cityA = cities.find(c => c.id === cityId);
            const cityB = cities.find(c => c.id === nextCityId);
            if (!cityA || !cityB) return null;

            return (
              <line
                key={`best-edge-${cityId}-${nextCityId}`}
                x1={cityA.x} y1={cityA.y}
                x2={cityB.x} y2={cityB.y}
                stroke="#10b981" // emerald-500
                strokeWidth={4}
                className="transition-all duration-300"
                strokeLinecap="round"
              />
            );
          })}
        </g>
      )}

      {/* 2. Current Animating Path (Yellow/Blue/Red depending on event) */}
      {currentEvent && currentEvent.path && currentEvent.path.length > 1 && currentEvent.type !== 'DONE' && (
        <g className="current-path">
          {currentEvent.path.map((cityId, idx) => {
            if (idx === currentEvent.path.length - 1) return null;
            const nextCityId = currentEvent.path[idx + 1];
            const cityA = cities.find(c => c.id === cityId);
            const cityB = cities.find(c => c.id === nextCityId);
            if (!cityA || !cityB) return null;

            let isPruned = currentEvent.type === 'PRUNE' && idx === currentEvent.path.length - 2;
            let strokeColor = isPruned ? '#ef4444' : '#eab308'; // red-500 : yellow-500
            let strokeWidth = isPruned ? 3 : 3;

            return (
              <line
                key={`curr-edge-${cityId}-${nextCityId}-${idx}`}
                x1={cityA.x} y1={cityA.y}
                x2={cityB.x} y2={cityB.y}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeDasharray={isPruned ? "8,8" : "none"}
                className="transition-all duration-200"
                strokeLinecap="round"
              />
            );
          })}
        </g>
      )}

      {/* 3. Cities (Nodes) */}
      {cities.map((city) => {
        let isCurrent = false;
        let isStart = false;

        if (currentEvent && currentEvent.path && currentEvent.path.length > 0) {
            isCurrent = currentEvent.path[currentEvent.path.length - 1] === city.id && currentEvent.type !== 'DONE';
            isStart = currentEvent.path[0] === city.id;
        }

        return (
          <g key={`city-${city.id}`} transform={`translate(${city.x}, ${city.y})`} className="transition-all duration-300 z-10 transition-transform">
            <circle
              r={12}
              fill={isCurrent ? '#3b82f6' : isStart ? '#8b5cf6' : '#1e293b'} // blue-500 : violet-500 : slate-800
              stroke={isCurrent ? '#fff' : '#475569'}
              strokeWidth={3}
              className="drop-shadow-lg transition-colors duration-200"
            />
            <text
              dy={5}
              fill="#f8fafc"
              fontSize={12}
              fontWeight="bold"
              textAnchor="middle"
              className="pointer-events-none"
            >
              {city.id}
            </text>
          </g>
        );
      })}
    </svg>
  );
};
