'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { IssueCluster } from '@/lib/types';

interface CivicMapLeafletProps {
  clusters: IssueCluster[];
  isLoading?: boolean;
  onMarkerClick: (cluster: IssueCluster) => void;
}

function markerColorByRisk(level: IssueCluster['risk_level']): string {
  switch (level) {
    case 'critical':
      return '#dc2626';
    case 'very_high':
      return '#ea580c';
    case 'high':
      return '#eab308';
    case 'low':
      return '#16a34a';
    default:
      return '#64748b';
  }
}

function zoneColorByHighestRisk(level?: IssueCluster['risk_level']): string {
  if (!level) return '#16a34a';
  if (level === 'high' || level === 'very_high' || level === 'critical') return '#dc2626';
  if (level === 'low') return '#eab308';
  return '#16a34a';
}

function riskRank(level?: IssueCluster['risk_level']): number {
  switch (level) {
    case 'critical':
      return 4;
    case 'very_high':
      return 3;
    case 'high':
      return 2;
    case 'low':
      return 1;
    default:
      return 0;
  }
}

declare global {
  interface Window {
    google?: any;
  }
}

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.google?.maps) return Promise.resolve();

  const scriptId = 'google-maps-js-sdk';
  const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
  if (existing) {
    if (existing.dataset.loaded === 'true') {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Maps SDK.')));
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load Google Maps SDK.'));
    document.head.appendChild(script);
  });
}

async function getGoogleMapsConstructors() {
  if (typeof window === 'undefined' || !window.google?.maps) {
    throw new Error('Google Maps SDK is not loaded.');
  }

  const maps = window.google.maps;
  const hasCoreClasses = maps.Map && maps.Circle && maps.InfoWindow && maps.LatLngBounds;
  if (hasCoreClasses) {
    return {
      Map: maps.Map,
      Circle: maps.Circle,
      InfoWindow: maps.InfoWindow,
      LatLngBounds: maps.LatLngBounds,
    };
  }

  if (typeof maps.importLibrary === 'function') {
    const mapsLib = (await maps.importLibrary('maps')) as {
      Map?: any;
      Circle?: any;
      InfoWindow?: any;
      LatLngBounds?: any;
    };
    return {
      Map: mapsLib.Map || maps.Map,
      Circle: mapsLib.Circle || maps.Circle,
      InfoWindow: mapsLib.InfoWindow || maps.InfoWindow,
      LatLngBounds: mapsLib.LatLngBounds || maps.LatLngBounds,
    };
  }

  throw new Error('Google Maps classes are unavailable.');
}

async function waitForGoogleMapsReady(timeoutMs = 10000, intervalMs = 120) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const ctors = await getGoogleMapsConstructors();
      if (ctors.Map && ctors.Circle && ctors.InfoWindow && ctors.LatLngBounds) {
        return ctors;
      }
    } catch {
      // Continue polling until timeout.
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error('Google Maps classes are not available yet.');
}

export default function CivicMapLeaflet({
  clusters,
  isLoading = false,
  onMarkerClick,
}: CivicMapLeafletProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const mapsApiRef = useRef<{
    Map: any;
    Circle: any;
    InfoWindow: any;
    LatLngBounds: any;
  } | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  const pincodeZones = useMemo(() => {
    const grouped = new Map<
      string,
      {
        pincode: string;
        latitudeTotal: number;
        longitudeTotal: number;
        complaintCount: number;
        clusters: IssueCluster[];
        highestRisk?: IssueCluster['risk_level'];
      }
    >();

    for (const cluster of clusters) {
      const existing = grouped.get(cluster.pincode);
      if (!existing) {
        grouped.set(cluster.pincode, {
          pincode: cluster.pincode,
          latitudeTotal: cluster.latitude * cluster.complaint_count,
          longitudeTotal: cluster.longitude * cluster.complaint_count,
          complaintCount: cluster.complaint_count,
          clusters: [cluster],
          highestRisk: cluster.risk_level,
        });
        continue;
      }

      existing.latitudeTotal += cluster.latitude * cluster.complaint_count;
      existing.longitudeTotal += cluster.longitude * cluster.complaint_count;
      existing.complaintCount += cluster.complaint_count;
      existing.clusters.push(cluster);
      if (riskRank(cluster.risk_level) > riskRank(existing.highestRisk)) {
        existing.highestRisk = cluster.risk_level;
      }
    }

    return Array.from(grouped.values()).map((zone) => {
      const topCluster =
        [...zone.clusters].sort((a, b) => b.complaint_count - a.complaint_count)[0] ?? zone.clusters[0];
      return {
        ...zone,
        latitude: zone.latitudeTotal / Math.max(1, zone.complaintCount),
        longitude: zone.longitudeTotal / Math.max(1, zone.complaintCount),
        topCluster,
      };
    });
  }, [clusters]);

  const mapCenter: [number, number] =
    pincodeZones.length > 0
      ? [
          pincodeZones.reduce((sum, zone) => sum + zone.latitude, 0) / pincodeZones.length,
          pincodeZones.reduce((sum, zone) => sum + zone.longitude, 0) / pincodeZones.length,
        ]
      : [28.6139, 77.209];

  useEffect(() => {
    let cancelled = false;

    if (!googleMapsKey) {
      setMapError('Google Maps API key is missing. Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local.');
      return;
    }

    loadGoogleMapsScript(googleMapsKey)
      .then(async () => {
        if (cancelled || !mapRef.current) return;
        const {
          Map: MapCtor,
          Circle: CircleCtor,
          InfoWindow: InfoWindowCtor,
          LatLngBounds: LatLngBoundsCtor,
        } = await waitForGoogleMapsReady();

        if (!MapCtor || !CircleCtor || !InfoWindowCtor || !LatLngBoundsCtor) {
          setMapError('Google Maps classes are not available yet.');
          return;
        }

        mapsApiRef.current = {
          Map: MapCtor,
          Circle: CircleCtor,
          InfoWindow: InfoWindowCtor,
          LatLngBounds: LatLngBoundsCtor,
        };
        mapInstanceRef.current = new MapCtor(mapRef.current, {
          center: { lat: mapCenter[0], lng: mapCenter[1] },
          zoom: 11,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });
        // Force a stable first paint when map container size settles.
        requestAnimationFrame(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setCenter({ lat: mapCenter[0], lng: mapCenter[1] });
          }
        });
        setIsMapReady(true);
        setMapError(null);
      })
      .catch((error) => {
        if (!cancelled) {
          setMapError(error instanceof Error ? error.message : 'Unable to initialize Google Maps.');
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleMapsKey]);

  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current || !mapsApiRef.current) return;

    overlaysRef.current.forEach((overlay) => {
      if (overlay?.setMap) overlay.setMap(null);
    });
    overlaysRef.current = [];

    const { Circle, InfoWindow, LatLngBounds } = mapsApiRef.current;
    const map = mapInstanceRef.current;
    const bounds = new LatLngBounds();
    const infoWindow = new InfoWindow();

    pincodeZones.forEach((zone) => {
      const center = { lat: zone.latitude, lng: zone.longitude };
      bounds.extend(center);

      const zoneCircle = new Circle({
        map,
        center,
        radius: Math.max(300, zone.complaintCount * 35),
        strokeColor: zoneColorByHighestRisk(zone.highestRisk),
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillColor: zoneColorByHighestRisk(zone.highestRisk),
        fillOpacity: 0.2,
      });
      zoneCircle.addListener('click', () => {
        const content = `
          <div style="font-size:13px;line-height:1.5">
            <div style="font-weight:600">Pincode ${zone.pincode}</div>
            <div>Risk Zone: ${zone.highestRisk ? zone.highestRisk.replace('_', ' ') : 'less / none'}</div>
            <div>Total Complaints: ${zone.complaintCount}</div>
            <div>Clusters: ${zone.clusters.length}</div>
            <div>Top Issue: ${zone.topCluster?.issue_type ?? 'N/A'}</div>
          </div>
        `;
        infoWindow.setContent(content);
        infoWindow.setPosition(center);
        infoWindow.open(map);
        onMarkerClick(zone.topCluster);
      });
      overlaysRef.current.push(zoneCircle);
    });

    clusters.forEach((cluster) => {
      const position = { lat: cluster.latitude, lng: cluster.longitude };
      const clusterDot = new Circle({
        map,
        center: position,
        radius: 70,
        strokeColor: '#ffffff',
        strokeOpacity: 1,
        strokeWeight: 1.5,
        fillColor: markerColorByRisk(cluster.risk_level),
        fillOpacity: 0.95,
      });
      clusterDot.addListener('click', () => onMarkerClick(cluster));
      overlaysRef.current.push(clusterDot);
    });

    if (pincodeZones.length > 1) {
      map.fitBounds(bounds);
    } else if (pincodeZones.length === 1) {
      map.setCenter({ lat: pincodeZones[0].latitude, lng: pincodeZones[0].longitude });
      map.setZoom(13);
    } else {
      map.setCenter({ lat: mapCenter[0], lng: mapCenter[1] });
      map.setZoom(11);
    }
  }, [clusters, isMapReady, mapCenter, onMarkerClick, pincodeZones]);

  return (
    <Card className="border-slate-200 bg-white overflow-hidden">
      <CardContent className="p-0">
        <div className="relative w-full h-80 border border-slate-200 rounded-lg overflow-hidden bg-slate-100">
          {isLoading && (
            <div className="absolute inset-0 z-[500] flex items-center justify-center bg-white/80">
              <div className="flex items-center gap-2 text-slate-700">
                <Spinner className="w-4 h-4" />
                Loading map data...
              </div>
            </div>
          )}

          <div ref={mapRef} className="h-full w-full z-10" />

          {mapError && (
            <div className="absolute inset-0 z-[550] flex items-center justify-center bg-white/85 px-6 text-center">
              <p className="text-sm text-red-700">{mapError}</p>
            </div>
          )}

          <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
            <Badge variant="secondary" className="bg-white/90 text-slate-700">
              {clusters.length} Clusters
            </Badge>
            <Badge variant="secondary" className="bg-red-100 text-red-800 border border-red-200">
              High: Red
            </Badge>
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border border-yellow-200">
              Low: Yellow
            </Badge>
            <Badge variant="secondary" className="bg-green-100 text-green-800 border border-green-200">
              Less/None: Green
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
