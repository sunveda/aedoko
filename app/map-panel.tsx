'use client';

import { useEffect, useRef, useState } from 'react';
import type { FeatureCollection, Point } from 'geojson';
import type { GeoJSONSource, Map as MapLibreMap, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { AedRecord } from '@/lib/aed';

type Dataset = { recordCount: number; records: AedRecord[] };
type MapProperties = {
  id: string;
  name: string;
  address: string;
  placement: string;
  open24: number;
  latitude: number;
  longitude: number;
};

export type MapLabels = {
  title: string;
  subtitle: string;
  loading: string;
  close: string;
  center: string;
  showAll: string;
  privacy: string;
  locateError: string;
  loadError: string;
  retry: string;
  listed: string;
  placement: string;
  open24: string;
  accessUnknown: string;
  route: string;
};

type Props = { labels: MapLabels; onClose: () => void };

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const TOKYO_BOUNDS: [[number, number], [number, number]] = [[138.2, 35.05], [140.35, 36.2]];

function createPopupContent(properties: MapProperties, labels: MapLabels) {
  const card = document.createElement('article');
  card.className = 'aed-map-popup';

  const status = document.createElement('p');
  status.className = `aed-map-popup__status${properties.open24 ? ' is-open' : ''}`;
  status.textContent = properties.open24 ? labels.open24 : labels.accessUnknown;

  const title = document.createElement('h3');
  title.lang = 'ja';
  title.textContent = properties.name;

  const address = document.createElement('p');
  address.lang = 'ja';
  address.textContent = properties.address;

  card.append(status, title, address);

  if (properties.placement) {
    const placement = document.createElement('p');
    placement.className = 'aed-map-popup__placement';
    placement.lang = 'ja';
    placement.textContent = `${labels.placement}: ${properties.placement}`;
    card.append(placement);
  }

  const route = document.createElement('a');
  route.href = `https://www.google.com/maps/dir/?api=1&destination=${properties.latitude},${properties.longitude}&travelmode=walking`;
  route.target = '_blank';
  route.rel = 'noreferrer';
  route.textContent = `${labels.route} ↗`;
  card.append(route);

  return card;
}

export default function AedMapPanel({ labels, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [locateError, setLocateError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [recordCount, setRecordCount] = useState(0);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    let map: MapLibreMap | null = null;
    let mapReady = false;

    const loadMap = async () => {
      try {
        const [maplibregl, response] = await Promise.all([
          import('maplibre-gl'),
          fetch('./data/aed-tokyo.v1.json'),
        ]);
        if (!response.ok) throw new Error('AED data unavailable');
        const dataset = await response.json() as Dataset;
        if (cancelled || !containerRef.current) return;

        const data: FeatureCollection<Point, MapProperties> = {
          type: 'FeatureCollection',
          features: dataset.records.map((record) => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [record.longitude, record.latitude] },
            properties: {
              id: record.id,
              name: record.nameJa,
              address: record.addressJa,
              placement: record.placementJa || '',
              open24: record.explicit24Hours ? 1 : 0,
              latitude: record.latitude,
              longitude: record.longitude,
            },
          })),
        };

        map = new maplibregl.Map({
          container: containerRef.current,
          style: MAP_STYLE,
          bounds: TOKYO_BOUNDS,
          fitBoundsOptions: { padding: 54, maxZoom: 10.5, duration: 0 },
          attributionControl: true,
        });
        mapRef.current = map;
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

        map.on('load', () => {
          if (!map || cancelled) return;
          map.addSource('aeds', {
            type: 'geojson',
            data,
            cluster: true,
            clusterMaxZoom: 15,
            clusterRadius: 48,
          });
          map.addLayer({
            id: 'aed-clusters',
            type: 'circle',
            source: 'aeds',
            filter: ['has', 'point_count'],
            paint: {
              'circle-color': ['step', ['get', 'point_count'], '#287c68', 100, '#112b2c', 750, '#e83b2f'],
              'circle-radius': ['step', ['get', 'point_count'], 18, 100, 24, 750, 31],
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 2,
            },
          });
          map.addLayer({
            id: 'aed-cluster-count',
            type: 'symbol',
            source: 'aeds',
            filter: ['has', 'point_count'],
            layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12 },
            paint: { 'text-color': '#ffffff' },
          });
          map.addLayer({
            id: 'aed-points',
            type: 'circle',
            source: 'aeds',
            filter: ['!', ['has', 'point_count']],
            paint: {
              'circle-color': '#e83b2f',
              'circle-radius': 7,
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 2,
            },
          });

          map.on('click', 'aed-clusters', async (event) => {
            if (!map) return;
            const feature = map.queryRenderedFeatures(event.point, { layers: ['aed-clusters'] })[0];
            const clusterId = Number(feature?.properties?.cluster_id);
            if (!feature || !Number.isFinite(clusterId) || feature.geometry.type !== 'Point') return;
            const source = map.getSource('aeds') as GeoJSONSource;
            const zoom = await source.getClusterExpansionZoom(clusterId);
            map.easeTo({ center: feature.geometry.coordinates as [number, number], zoom });
          });

          map.on('click', 'aed-points', (event) => {
            if (!map || !event.features?.[0] || event.features[0].geometry.type !== 'Point') return;
            const feature = event.features[0];
            const properties = feature.properties as MapProperties;
            new maplibregl.Popup({ closeButton: true, maxWidth: '320px', offset: 12 })
              .setLngLat(feature.geometry.coordinates as [number, number])
              .setDOMContent(createPopupContent(properties, labels))
              .addTo(map);
          });

          for (const layer of ['aed-clusters', 'aed-points']) {
            map.on('mouseenter', layer, () => { if (map) map.getCanvas().style.cursor = 'pointer'; });
            map.on('mouseleave', layer, () => { if (map) map.getCanvas().style.cursor = ''; });
          }

          setRecordCount(dataset.recordCount || dataset.records.length);
          mapReady = true;
          setStatus('ready');
        });
        map.on('error', (event) => {
          if (!cancelled && !mapReady && !event.error?.message?.includes('sprite')) setStatus('error');
        });
      } catch {
        if (!cancelled) setStatus('error');
      }
    };

    void loadMap();
    return () => {
      cancelled = true;
      markerRef.current?.remove();
      markerRef.current = null;
      map?.remove();
      mapRef.current = null;
    };
  }, [labels, reloadKey]);

  const showAll = () => mapRef.current?.fitBounds(TOKYO_BOUNDS, { padding: 54, maxZoom: 10.5 });

  const centerOnUser = async () => {
    setLocateError('');
    if (!navigator.geolocation || !mapRef.current) { setLocateError(labels.locateError); return; }
    const maplibregl = await import('maplibre-gl');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (!mapRef.current) return;
        markerRef.current?.remove();
        markerRef.current = new maplibregl.Marker({ color: '#112b2c' }).setLngLat([coords.longitude, coords.latitude]).addTo(mapRef.current);
        mapRef.current.flyTo({ center: [coords.longitude, coords.latitude], zoom: 14 });
      },
      () => setLocateError(labels.locateError),
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 },
    );
  };

  return (
    <section className="map-panel" role="dialog" aria-modal="true" aria-labelledby="aed-map-title">
      <header className="map-panel__header">
        <div><p className="step-label">TOKYO / {recordCount ? `${recordCount.toLocaleString()} ${labels.listed}` : labels.loading}</p><h2 id="aed-map-title">{labels.title}</h2><p>{labels.subtitle}</p></div>
        <div className="map-panel__actions">
          <button type="button" onClick={showAll} disabled={status !== 'ready'}>{labels.showAll}</button>
          <button type="button" onClick={() => void centerOnUser()} disabled={status !== 'ready'}>◎ {labels.center}</button>
          <button className="map-panel__close" ref={closeRef} type="button" onClick={onClose} aria-label={labels.close}>×</button>
        </div>
      </header>
      <div className="map-panel__notice"><span>{labels.privacy}</span>{locateError && <strong role="alert">{locateError}</strong>}</div>
      <div className="map-panel__canvas" ref={containerRef} aria-label={labels.title} />
      {status === 'loading' && <div className="map-panel__state" role="status"><span className="loader" aria-hidden="true" /><strong>{labels.loading}</strong></div>}
      {status === 'error' && <div className="map-panel__state" role="alert"><span className="state-symbol" aria-hidden="true">!</span><strong>{labels.loadError}</strong><button className="dark-button" type="button" onClick={() => { setStatus('loading'); setReloadKey((value) => value + 1); }}>{labels.retry}</button></div>}
    </section>
  );
}
