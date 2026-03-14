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
          coords.push([lat, lon]);
        }
      }
    }
  }
  return coords;
}

export const RaceMap: React.FC<RaceMapProps> = ({ status, event }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const trackedMarkerRef = useRef<any>(null);
  const trackedLabelRef = useRef<any>(null);
  const trackedPulseRef = useRef<any>(null);
  const cpMarkersRef = useRef<any[]>([]);
  const routeRef = useRef<any>(null);
  const runnerDotsRef = useRef<any[]>([]);

  const getCenter = (): [number, number] => {
    if (status.lat !== 0 || status.lon !== 0) return [status.lat, status.lon];
    if (status.checkpoints.length > 0) return [status.checkpoints[0].la, status.checkpoints[0].lo];
    return [54.5, -2.5]; // UK default
  };

  const isValidCoord = (lat: number, lon: number) =>
    !isNaN(lat) && !isNaN(lon) && !(lat === 0 && lon === 0);

  // Initialize map (runs once)
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

    // Tracked runner marker — large red circle + pulsing ring + name label
    if (isValidCoord(status.lat, status.lon)) {
      // Outer pulsing ring (larger, semi-transparent)
      trackedPulseRef.current = L.circleMarker([status.lat, status.lon], {
        radius: 18,
        color: '#dc2626',
        weight: 3,
        opacity: 0.5,
        fillColor: '#dc2626',
        fillOpacity: 0.15,
        pane: 'markerPane',
      }).addTo(map);

      // Inner solid circle (the main marker)
      trackedMarkerRef.current = L.circleMarker([status.lat, status.lon], {
        radius: 11,
        color: '#fff',
        weight: 3,
        fillColor: '#dc2626',
        fillOpacity: 1,
        pane: 'markerPane',
      }).addTo(map);

      // Name label above the marker
      trackedLabelRef.current = L.marker([status.lat, status.lon], {
        icon: L.divIcon({
          className: '',
          html: `<div style="background:#dc2626;color:#fff;padding:2px 8px;border-radius:10px;font-size:12px;font-weight:bold;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.4);border:2px solid #fff;">🏃 ${status.runnerName}</div>`,
          iconSize: [0, 0],
          iconAnchor: [0, 35],
        }),
        zIndexOffset: 10000,
        interactive: false,
      }).addTo(map);

      // Popup on tracked marker
      trackedMarkerRef.current.bindPopup(`
        <div style="font-size:13px;line-height:1.6;min-width:140px;">
          <strong>🏃 ${status.runnerName}</strong><br/>
          🏷 Bib #${status.bibNumber}<br/>
          ⏱ ${status.elapsedTime || 'N/A'}<br/>
          📍 ${status.runner?.lc || 'N/A'}<br/>
          💨 ${status.runner?.sp ? status.runner.sp + ' km/h' : 'N/A'}
        </div>
      `);
    }

    // Fit bounds to checkpoints + runner
    const allPoints: [number, number][] = status.checkpoints.map((cp) => [cp.la, cp.lo]);
    if (isValidCoord(status.lat, status.lon)) allPoints.push([status.lat, status.lon]);
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

          const routeBounds = routeRef.current.getBounds();
          const cpBounds = L.latLngBounds(
            status.checkpoints.map((cp: any) => [cp.la, cp.lo])
          );
          const combined = routeBounds.extend(cpBounds);
          if (isValidCoord(status.lat, status.lon)) {
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

  // Update tracked runner position when data refreshes
  useEffect(() => {
    if (!mapInstance.current) return;
    if (!isValidCoord(status.lat, status.lon)) return;

    const pos: [number, number] = [status.lat, status.lon];

    if (trackedMarkerRef.current) {
      trackedMarkerRef.current.setLatLng(pos);
    } else {
      trackedMarkerRef.current = L.circleMarker(pos, {
        radius: 11,
        color: '#fff',
        weight: 3,
        fillColor: '#dc2626',
        fillOpacity: 1,
        pane: 'markerPane',
      }).addTo(mapInstance.current);
    }

    if (trackedPulseRef.current) {
      trackedPulseRef.current.setLatLng(pos);
    } else {
      trackedPulseRef.current = L.circleMarker(pos, {
        radius: 18,
        color: '#dc2626',
        weight: 3,
        opacity: 0.5,
        fillColor: '#dc2626',
        fillOpacity: 0.15,
        pane: 'markerPane',
      }).addTo(mapInstance.current);
    }

    if (trackedLabelRef.current) {
      trackedLabelRef.current.setLatLng(pos);
    } else {
      trackedLabelRef.current = L.marker(pos, {
        icon: L.divIcon({
          className: '',
          html: `<div style="background:#dc2626;color:#fff;padding:2px 8px;border-radius:10px;font-size:12px;font-weight:bold;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.4);border:2px solid #fff;">🏃 ${status.runnerName}</div>`,
          iconSize: [0, 0],
          iconAnchor: [0, 35],
        }),
        zIndexOffset: 10000,
        interactive: false,
      }).addTo(mapInstance.current);
    }

    mapInstance.current.panTo(pos, { animate: true });
  }, [status.lat, status.lon]);

  // Update all runner dots on each data refresh
  useEffect(() => {
    if (!mapInstance.current || !status.allClasses) return;

    // Clear existing runner dots
    runnerDotsRef.current.forEach((m) => m.remove());
    runnerDotsRef.current = [];

    for (const cls of status.allClasses) {
      const isFemale = cls.classname.toLowerCase().includes('female');
      const dotColor = isFemale ? '#ec4899' : '#3b82f6'; // pink for female, blue for male

      for (const runner of cls.teams) {
        // Skip the tracked runner — they have the red marker
        if (runner.r === status.bibNumber) continue;

        const [latStr, lonStr] = (runner.ll || '').split(',');
        const lat = parseFloat(latStr);
        const lon = parseFloat(lonStr);
        if (isNaN(lat) || isNaN(lon) || (lat === 0 && lon === 0)) continue;

        const dot = L.circleMarker([lat, lon], {
          radius: 7,
          color: '#fff',
          weight: 1.5,
          fillColor: dotColor,
          fillOpacity: 0.85,
        }).addTo(mapInstance.current);

        // Popup with runner details on tap/click
        const checkpoint = runner.lc || 'N/A';
        const time = runner.t || 'N/A';
        const speed = runner.sp ? `${runner.sp} km/h` : 'N/A';
        const ageGroup = runner.ag || runner.g || 'N/A';
        const finStatus = runner.fin === 1 ? '<br/>🏁 <strong>Finished</strong>' : '';

        dot.bindPopup(`
          <div style="font-size:13px;line-height:1.6;min-width:140px;">
            <strong>${runner.n}</strong><br/>
            🏷 Bib #${runner.r}<br/>
            📍 ${checkpoint}<br/>
            ⏱ ${time}<br/>
            👤 ${ageGroup}<br/>
            💨 ${speed}${finStatus}
          </div>
        `);

        runnerDotsRef.current.push(dot);
      }
    }
  }, [status.allClasses]);

  return (
    <div
      ref={mapRef}
      className="w-full rounded-xl overflow-hidden shadow-lg"
      style={{ height: '350px' }}
    />
  );
};
