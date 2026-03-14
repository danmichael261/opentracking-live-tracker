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

/** Create the tracked runner divIcon */
function createRunnerIcon(L: any) {
  return L.divIcon({
    className: 'runner-marker',
    html: `<div style="
      background: #e53e3e;
      color: #fff;
      border-radius: 50%;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 26px;
      border: 4px solid #fff;
      box-shadow: 0 0 0 3px #e53e3e, 0 4px 12px rgba(0,0,0,0.5);
    ">🏃</div>`,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
}

export const RaceMap: React.FC<RaceMapProps> = ({ status, event }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const cpMarkersRef = useRef<any[]>([]);
  const routeRef = useRef<any>(null);
  const runnerDotsRef = useRef<any[]>([]);

  const getCenter = (): [number, number] => {
    if (status.lat !== 0 || status.lon !== 0) return [status.lat, status.lon];
    if (status.checkpoints.length > 0) return [status.checkpoints[0].la, status.checkpoints[0].lo];
    return [54.5, -2.5]; // UK default
  };

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

    // Tracked runner marker — large red circle with 🏃 emoji
    if (status.lat !== 0 || status.lon !== 0) {
      markerRef.current = L.marker([status.lat, status.lon], {
        icon: createRunnerIcon(L),
        zIndexOffset: 10000,
      }).addTo(map);
      markerRef.current.bindTooltip(status.runnerName, {
        permanent: true,
        direction: 'top',
        offset: [0, -28],
        className: 'tracked-runner-tooltip',
      });
    }

    // Fit bounds to checkpoints + runner
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

  // Update tracked runner position when data refreshes
  useEffect(() => {
    if (!mapInstance.current) return;
    if (status.lat === 0 && status.lon === 0) return;

    if (markerRef.current) {
      markerRef.current.setLatLng([status.lat, status.lon]);
    } else {
      markerRef.current = L.marker([status.lat, status.lon], {
        icon: createRunnerIcon(L),
        zIndexOffset: 10000,
      }).addTo(mapInstance.current);
      markerRef.current.bindTooltip(status.runnerName, {
        permanent: true,
        direction: 'top',
        offset: [0, -28],
        className: 'tracked-runner-tooltip',
      });
    }

    mapInstance.current.panTo([status.lat, status.lon], { animate: true });
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
        // Skip the tracked runner — they have the 🏃 icon
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

    // Re-add tracked runner marker to ensure it's on top of all dots
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current.addTo(mapInstance.current);
    }
  }, [status]);

  return <div ref={mapRef} style={{ width: '100%', height: '100%', minHeight: '300px' }} />;
};
