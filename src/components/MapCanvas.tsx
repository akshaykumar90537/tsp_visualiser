import React, { useEffect, useRef } from 'react';
import { City, TraceEvent } from '../types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leaflet icon loading issue in modern bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapCanvasProps {
  cities: City[];
  currentEvent: TraceEvent | null;
  bestPath: number[] | null;
  onMapClick?: (lat: number, lng: number) => void;
}

export const MapCanvas: React.FC<MapCanvasProps> = ({ cities, currentEvent, bestPath, onMapClick }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const polylineRef = useRef<L.Polyline | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    const map = L.map(mapRef.current).setView([20.5937, 78.9629], 4); // Default to India initially
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    leafletMap.current = map;

    return () => {
      map.remove();
      leafletMap.current = null;
    };
  }, []);

  // Handle map click
  useEffect(() => {
    const map = leafletMap.current;
    if (!map || !onMapClick) return;

    const handleMapClickEvent = (e: L.LeafletMouseEvent) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    };

    map.on('click', handleMapClickEvent);
    return () => {
      map.off('click', handleMapClickEvent);
    };
  }, [onMapClick]);

  // Update Markers and Polyline and fitBounds
  useEffect(() => {
    const map = leafletMap.current;
    if (!map) return;

    // Remove old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Add new markers
    cities.forEach(city => {
      const marker = L.marker([city.lat, city.lng]).addTo(map);
      const nameNode = city.name ? `<strong>${city.name}</strong><br/>` : `<strong>City ${city.id}</strong><br/>`;
      marker.bindPopup(`
         <div style="text-align: center;">
            ${nameNode}
            <span style="font-size: 0.75rem; color: #9ca3af; font-family: monospace;">
              ${city.lat.toFixed(4)}, ${city.lng.toFixed(4)}
            </span>
         </div>
      `);
      markersRef.current.push(marker);
    });

    if (cities.length > 0) {
      if (cities.length === 1) {
         map.setView([cities[0].lat, cities[0].lng], 8);
      } else {
         const bounds = L.latLngBounds(cities.map(c => [c.lat, c.lng]));
         map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
      }
    }

    // Remove old polyline
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    // Add new polyline
    if (bestPath && bestPath.length > 0) {
      const latlngs: [number, number][] = bestPath.map(cityId => {
        const city = cities.find(c => c.id === cityId);
        return city ? [city.lat, city.lng] as [number, number] : null;
      }).filter(Boolean) as [number, number][];

      if (latlngs.length > 0) {
         polylineRef.current = L.polyline(latlngs, { color: '#10b981', weight: 4, opacity: 0.8 }).addTo(map);
      }
    }
  }, [cities, bestPath]);

  return <div ref={mapRef} style={{ width: '100%', height: '100%', borderRadius: '1rem', zIndex: 1 }} />;
};
