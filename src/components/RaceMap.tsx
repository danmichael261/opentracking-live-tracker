import React, { useEffect, useRef } from 'react';
import { TrackerStatus } from '../types';
import { fetchRoute } from '../utils/api';

declare const L: any;

interface RaceMapProps {
  status: TrackerStatus;
  event: string;
}

/** Parse KML text and extract route coordinates as [lat, lng] pairs */
function parseKML(kmlText: string): [number, number][] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(kmlText, 'text/xml');
  const coords: [number, number][] = [];

  // Find all <coordinates> elements (handles namespaced KML)
  const coordElements = doc.getElementsByTagName('coordinates');
  for (let i = 0; i < coordElements.length; i++) {
    const text = coordElements[i].textContent || '';
    const points = text.trim().split(/\s+/);
    for (const point of points) {
      const parts = point.split(',');
      if (parts.length >= 2) {
        const lon = parseFloat(parts[0]);
        const lat = parseFloat(parts[1]);
        if (!isNaN(lat) && !isNaN(lon)) {
          coords.push([lat, lon]); // Leaflet uses [lat, lng]
        }
      }
    }
  }
  return coords;
}

export const RaceMap: React.FC<RaceMapProps> = ({ status, event }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const cpMarkersRef = useRef<any[]>([]);
  const routeRef = useRef<any>(null);

  // Determine initial center: runner position or first checkpoint
  const getCenter = (): [number, number] => {
    if (status.lat !== 0 || status.lon !== 0) return [status.lat, status.lon];
    if (status.checkpoints.length > 0) return [status.checkpoints[0].la, status.checkpoints[0].lo];
    return [54.5, -2.5]; // UK default
  };

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const center = getCenter();
    const map = L.map(mapRef.current, {
      center,
      zoom: 13,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    mapInstance.current = map;

    // Checkpoint markers
    status.checkpoints.forEach((cp) => {
      const label = cp.n === 'Start' ? 'S'
        : cp.n === 'Finish' ? 'F'
        : cp.n.replace(/checkpoint\s*/i, '').trim();

      const icon = L.divIcon({
        className: 'custom-cp-icon',
        html: `<div style="background:${cp.c || '#666'};color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.4);">${label}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      const m = L.marker([cp.la, cp.lo], { icon }).addTo(map);
      m.bindTooltip(cp.n, { direction: 'top', offset: [0, -16] });
      cpMarkersRef.current.push(m);
    });

    // Runner marker (only if we have coordinates)
    if (status.lat !== 0 || status.lon !== 0) {
      const runnerIcon = L.divIcon({
        className: 'runner-marker',
        html: `<div style="background:#2196F3;color:#fff;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:bold;border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,0.5);">🏃</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });
      markerRef.current = L.marker([status.lat, status.lon], { icon: runnerIcon }).addTo(map);
      markerRef.current.bindTooltip(status.runnerName, {
        permanent: true,
        direction: 'top',
        offset: [0, -20],
      });
    }

    // Initial fit bounds to checkpoints + runner
    const allPoints: [number, number][] = status.checkpoints.map((cp) => [cp.la, cp.lo]);
    if (status.lat !== 0 || status.lon !== 0) allPoints.push([status.lat, status.lon]);
    if (allPoints.length > 1) {
      map.fitBounds(allPoints, { padding: [30, 30] });
    }

    // Fetch and overlay KML race route
    fetchRoute(event)
      .then((kmlText) => {
        const routeCoords = parseKML(kmlText);
        if (routeCoords.length > 0 && mapInstance.current) {
          routeRef.current = L.polyline(routeCoords, {
            color: '#f59e0b',
            weight: 4,
            opacity: 0.8,
            dashArray: null,
            lineJoin: 'round',
          }).addTo(mapInstance.current);

          // Re-fit bounds to include route
          const routeBounds = routeRef.current.getBounds();
          const cpBounds = L.latLngBounds(
            status.checkpoints.map((cp: any) => [cp.la, cp.lo])
          );
          const combined = routeBounds.extend(cpBounds);
          if (status.lat !== 0 || status.lon !== 0) {
            combined.extend([status.lat, status.lon]);
          }
          mapInstance.current.fitBounds(combined, { padding: [30, 30] });
        }
      })
      .catch(() => {
        // KML not available for this event — silently continue without route
      });

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Update runner position when data refreshes
  useEffect(() => {
    if (!mapInstance.current) return;
    if (status.lat === 0 && status.lon === 0) return;

    if (markerRef.current) {
      markerRef.current.setLatLng([status.lat, status.lon]);
    } else {
      // Create marker if it didn't exist on init
      const runnerIcon = L.divIcon({
        className: 'runner-marker',
        html: `<div style="background:#2196F3;color:#fff;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:bold;border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,0.5);">🏃</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });
      markerRef.current = L.marker([status.lat, status.lon], { icon: runnerIcon }).addTo(mapInstance.current);
      markerRef.current.bindTooltip(status.runnerName, {
        permanent: true,
        direction: 'top',
        offset: [0, -20],
      });
    }

    mapInstance.current.panTo([status.lat, status.lon], { animate: true });
  }, [status.lat, status.lon]);

  return <div ref={mapRef} style={{ width: '100%', height: '100%', minHeight: '300px' }} />;
};
