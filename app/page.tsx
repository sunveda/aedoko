'use client';

import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { cardinalDirection, rankAeds, type AedRecord, type RankedAed } from '@/lib/aed';
import { localeNames, messages, normalizeLocale, type Locale } from './i18n';

type CoverageRow = { municipalityCode: string; nameJa: string; status: 'validated' | 'partial' | 'missing'; recordCount: number };
type Dataset = { snapshotAt: string; recordCount: number; records: AedRecord[] };
type Coverage = { municipalityCount: number; sourcedMunicipalityCount: number; validatedMunicipalityCount: number; municipalities: CoverageRow[] };
type AppState = 'idle' | 'loading' | 'results' | 'error';
type DeviceOrientationWithCompass = DeviceOrientationEvent & { webkitCompassHeading?: number };

const DEMO_POSITION = { latitude: 35.6655, longitude: 139.7708 };
const FOUNDATION_MAP = 'https://www.qqzaidanmap.jp/';
const CITY_SUBMISSION_FORM = 'https://github.com/sunveda/aedoko/issues/new?template=city-submission.yml';
const FEEDBACK_FORM = 'https://github.com/sunveda/aedoko/issues/new?template=feedback.yml';
const AedMapPanel = lazy(() => import('./map-panel'));

function ProtectedHeartMark() {
  return (
    <svg className="protect-mark" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <path className="protect-mark__shield" d="M32 3 56 12v17c0 15-9.6 25.8-24 32C17.6 54.8 8 44 8 29V12L32 3Z" />
      <path className="protect-mark__heart" d="M32 50 18.6 37.6C7.9 27.7 21.5 13.6 32 24.8c10.5-11.2 24.1 2.9 13.4 12.8L32 50Z" />
    </svg>
  );
}

function formatDistance(meters: number, locale: Locale) {
  const formatter = new Intl.NumberFormat(locale === 'ja-x-easy' ? 'ja' : locale, { maximumFractionDigits: meters < 1000 ? 0 : 1 });
  return meters < 1000 ? `${formatter.format(meters)} m` : `${formatter.format(meters / 1000)} km`;
}

function formatDate(value: string | null | undefined, locale: Locale) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value.slice(0, 10);
  return new Intl.DateTimeFormat(locale === 'ja-x-easy' ? 'ja' : locale, { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
}

export default function Home() {
  const [locale, setLocale] = useState<Locale>('ja-x-easy');
  const [languageOpen, setLanguageOpen] = useState(false);
  const [coverageOpen, setCoverageOpen] = useState(false);
  const [state, setState] = useState<AppState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [coverage, setCoverage] = useState<Coverage | null>(null);
  const [results, setResults] = useState<RankedAed[]>([]);
  const [isDemo, setIsDemo] = useState(false);
  const [heading, setHeading] = useState<number | null>(null);
  const [compassEnabled, setCompassEnabled] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const mapButtonRef = useRef<HTMLButtonElement>(null);
  const t = useMemo(() => messages(locale), [locale]);

  useEffect(() => {
    const query = normalizeLocale(new URLSearchParams(window.location.search).get('lang'));
    const saved = normalizeLocale(window.localStorage.getItem('aed-door-arrow-locale'));
    const browser = navigator.languages.map(normalizeLocale).find(Boolean) as Locale | undefined;
    const chosen = query || saved || browser || 'ja-x-easy';
    const timer = window.setTimeout(() => setLocale(chosen), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => { document.documentElement.lang = locale === 'ja-x-easy' ? 'ja' : locale; }, [locale]);

  useEffect(() => {
    const updateHeading = (event: Event) => {
      const orientation = event as DeviceOrientationWithCompass;
      const next = orientation.webkitCompassHeading ?? (orientation.alpha == null ? null : (360 - orientation.alpha) % 360);
      if (next != null) setHeading(next);
    };
    if (compassEnabled) {
      window.addEventListener('deviceorientationabsolute', updateHeading, true);
      window.addEventListener('deviceorientation', updateHeading, true);
    }
    return () => {
      window.removeEventListener('deviceorientationabsolute', updateHeading, true);
      window.removeEventListener('deviceorientation', updateHeading, true);
    };
  }, [compassEnabled]);

  const chooseLocale = (next: Locale) => {
    setLocale(next);
    window.localStorage.setItem('aed-door-arrow-locale', next);
    setLanguageOpen(false);
  };

  const loadSnapshot = async () => {
    if (dataset && coverage) return { data: dataset, coverageData: coverage };
    const [dataResponse, coverageResponse] = await Promise.all([fetch('./data/aed-tokyo.v1.json'), fetch('./data/aed-tokyo-coverage.v1.json')]);
    if (!dataResponse.ok || !coverageResponse.ok) throw new Error(t.loadError);
    const data = await dataResponse.json() as Dataset;
    const coverageData = await coverageResponse.json() as Coverage;
    setDataset(data);
    setCoverage(coverageData);
    return { data, coverageData };
  };

  const showResults = async (latitude: number, longitude: number, demo: boolean) => {
    try {
      const { data } = await loadSnapshot();
      setResults(rankAeds(data.records, latitude, longitude));
      setIsDemo(demo);
      setState('results');
    } catch {
      setErrorMessage(t.loadError);
      setState('error');
    }
  };

  const useLocation = async () => {
    setState('loading');
    setErrorMessage('');
    try { await loadSnapshot(); } catch { setErrorMessage(t.loadError); setState('error'); return; }
    if (!navigator.geolocation) { setErrorMessage(t.locationError); setState('error'); return; }
    navigator.geolocation.getCurrentPosition(
      (position) => showResults(position.coords.latitude, position.coords.longitude, false),
      (error) => { setErrorMessage(error.code === error.PERMISSION_DENIED ? t.locationDenied : t.locationError); setState('error'); },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 },
    );
  };

  const useDemo = () => { setState('loading'); void showResults(DEMO_POSITION.latitude, DEMO_POSITION.longitude, true); };

  const enableCompass = async () => {
    const orientation = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<'granted' | 'denied'> };
    if (orientation.requestPermission) {
      const permission = await orientation.requestPermission();
      if (permission !== 'granted') return;
    }
    setCompassEnabled(true);
  };

  const primary = results[0];
  const arrowRotation = primary ? primary.bearing - (heading ?? 0) : 0;
  const likelyCoverageGap = primary ? primary.distanceMeters > 20_000 : false;
  const sourcedCount = coverage?.sourcedMunicipalityCount ?? 33;
  const validCount = coverage?.validatedMunicipalityCount ?? 26;
  const closeMap = () => {
    setMapOpen(false);
    window.requestAnimationFrame(() => mapButtonRef.current?.focus());
  };

  return (
    <main className="app-shell">
      <a className="site-return" href="https://sunveda.tech/" aria-label="Return to the SunVeda Technologies main website">
        <span aria-hidden="true">←</span>
        <span>SunVeda Technologies</span>
      </a>
      <header className="topbar">
        <button className="brand brand-button" type="button" onClick={() => setState('idle')} aria-label="AEDoko home">
          <ProtectedHeartMark /><span>AEDoko</span>
        </button>
        <button className="language-button" type="button" aria-expanded={languageOpen} onClick={() => setLanguageOpen(!languageOpen)}>
          <span aria-hidden="true">文</span> {localeNames[locale]} <span aria-hidden="true">⌄</span>
        </button>
      </header>

      <section className="emergency-strip" aria-label={t.emergency}>
        <div><p className="eyebrow">{t.emergency}</p><h1>{t.callFirst}</h1><p>{t.cpr}</p></div>
        <a className="call-button" href="tel:119"><span aria-hidden="true">☎</span><span><small>{t.call}</small>119</span></a>
      </section>

      <nav className="map-access-bar" aria-label={t.viewMap}>
        <button className="map-action" ref={mapButtonRef} type="button" onClick={() => setMapOpen(true)}><span aria-hidden="true">⌖</span><span>{t.viewMap}<small>{t.viewMapHint}</small></span><span aria-hidden="true">→</span></button>
      </nav>

      {state === 'idle' && (
        <section className="finder" id="top">
          <div className="finder-copy"><p className="step-label">01 / {t.findLabel}</p><h2>{t.findTitle}</h2><p className="lede">{t.findBody}</p></div>
          <div className="arrow-stage" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="north">N</div><div className="find-pointer hero-pointer" /><div className="pulse-dot" /></div>
          <div className="actions">
            <button className="primary-action" type="button" onClick={useLocation}><span className="location-icon" aria-hidden="true">◎</span><span>{t.useLocation}<small>{t.privacy}</small></span><span aria-hidden="true">→</span></button>
          </div>
        </section>
      )}

      {state === 'loading' && <section className="state-panel" role="status" aria-live="polite"><div className="loader" aria-hidden="true" /><h2>{t.locating}</h2><p>{t.loadingData}</p></section>}

      {state === 'error' && <section className="state-panel" role="alert"><span className="state-symbol" aria-hidden="true">!</span><h2>{errorMessage}</h2><div className="state-actions"><button className="dark-button" type="button" onClick={useLocation}>{t.useLocation}</button><button className="line-button" type="button" onClick={useDemo}>{t.demo}</button></div></section>}

      {state === 'results' && primary && !likelyCoverageGap && (
        <section className="results-view" aria-live="polite">
          <div className="result-hero">
            <div className="result-heading"><p className="step-label">02 / {isDemo ? t.demoLabel : t.liveLabel}</p><h2>{t.nearest}</h2><div className="distance"><strong>{formatDistance(primary.distanceMeters, locale)}</strong><span>{t.straightLine}</span></div></div>
            <div className="result-arrow-wrap">
              <div className="bearing-label">{heading == null ? t.northUp : t.compass}<br/><strong>{Math.round(primary.bearing)}° {cardinalDirection(primary.bearing)}</strong></div>
              <div className="result-arrow" style={{ transform: `rotate(${arrowRotation}deg)` }} aria-label={`${t.bearing} ${Math.round(primary.bearing)} degrees ${cardinalDirection(primary.bearing)}`}><div className="find-pointer" /></div>
              <div className="you-dot"><span />YOU</div>
            </div>
            <article className="primary-card">
              <div className={`availability ${primary.explicit24Hours ? 'available-open' : ''}`}><span />{primary.explicit24Hours ? t.open24 : t.accessUnknown}</div>
              <p className="official-label">{t.officialListing}</p><h3 lang="ja">{primary.nameJa}</h3><p className="address" lang="ja">{primary.addressJa}</p>
              {primary.placementJa && <div className="placement"><small>{t.placement}</small><p lang="ja">{primary.placementJa}</p></div>}
              <a className="route-button" href={`https://www.google.com/maps/dir/?api=1&destination=${primary.latitude},${primary.longitude}&travelmode=walking`} target="_blank" rel="noreferrer"><span>{t.route}<small>{t.routeLeaves}</small></span><span aria-hidden="true">↗</span></a>
            </article>
          </div>

          <div className="result-controls">
            {heading == null && <button className="compass-button" type="button" onClick={enableCompass}><span aria-hidden="true">✦</span> {t.compass}</button>}
            <p>{t.changeWarning}</p>
          </div>

          <div className="candidates-section">
            <h3>{t.candidates}</h3>
            <div className="candidate-grid">{results.slice(1).map((candidate, index) => (
              <article className="candidate-card" key={candidate.id}>
                <div className="candidate-number">0{index + 2}</div><div><div className={`availability ${candidate.explicit24Hours ? 'available-open' : ''}`}><span />{candidate.explicit24Hours ? t.open24 : t.accessUnknown}</div><h4 lang="ja">{candidate.nameJa}</h4><p lang="ja">{candidate.addressJa}</p><strong>{formatDistance(candidate.distanceMeters, locale)}</strong> <small>{t.straightLine}</small></div>
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${candidate.latitude},${candidate.longitude}&travelmode=walking`} target="_blank" rel="noreferrer" aria-label={`${t.route}: ${candidate.nameJa}`}>↗</a>
              </article>
            ))}</div>
          </div>

          <aside className="source-card"><div><small>{t.source}</small><strong>{primary.source.publisher}</strong><a href={primary.source.datasetUrl} target="_blank" rel="noreferrer">{primary.source.datasetTitle} ↗</a></div><div><small>{t.snapshot}</small><strong>{formatDate(dataset?.snapshotAt, locale)}</strong><span>{primary.source.license}</span></div></aside>
          <button className="back-button" type="button" onClick={() => setState('idle')}>← {t.back}</button>
        </section>
      )}

      {state === 'results' && likelyCoverageGap && (
        <section className="state-panel gap-panel" role="status"><span className="state-symbol" aria-hidden="true">?</span><h2>{t.noLocalData}</h2><p>{t.varies}</p><a className="dark-button" href={FOUNDATION_MAP} target="_blank" rel="noreferrer">{t.nationwideMap} ↗</a><button className="line-button" type="button" onClick={() => setCoverageOpen(true)}>{t.coverage}</button></section>
      )}

      <section className="trust-row" aria-label="Pilot details"><div><span className="status-dot" /> <strong>{t.pilot}</strong></div><p>{t.varies}</p><p><strong>{sourcedCount} / 62</strong> {t.sourced}</p><p><strong>{validCount}</strong> {t.validated}</p></section>
      <section className="community-panel" aria-labelledby="community-title">
        <div className="community-copy"><p className="step-label">03 / COMMUNITY</p><h2 id="community-title">{t.communityTitle}</h2><p>{t.communityBody}</p></div>
        <div className="community-actions">
          <a className="community-action community-action-primary" href={CITY_SUBMISSION_FORM} target="_blank" rel="noreferrer"><span><strong>{t.addCity}</strong><small>{t.addCityHint}</small></span><span aria-hidden="true">↗</span></a>
          <a className="community-action" href={FEEDBACK_FORM} target="_blank" rel="noreferrer"><span><strong>{t.giveFeedback}</strong><small>{t.feedbackHint}</small></span><span aria-hidden="true">↗</span></a>
        </div>
      </section>
      <footer><p>{t.arrowWarning}</p><button type="button" onClick={() => setCoverageOpen(true)}>{t.coverage}</button></footer>

      {mapOpen && <Suspense fallback={<section className="map-panel" role="dialog" aria-modal="true" aria-label={t.mapTitle}><div className="map-panel__state" role="status"><span className="loader" aria-hidden="true" /><strong>{t.mapLoading}</strong></div></section>}><AedMapPanel onClose={closeMap} labels={{ title: t.mapTitle, subtitle: t.mapSubtitle, loading: t.mapLoading, close: t.close, center: t.mapCenter, showAll: t.mapShowAll, privacy: t.mapPrivacy, locateError: t.mapLocateError, loadError: t.mapLoadError, retry: t.mapRetry, listed: t.records, placement: t.placement, open24: t.open24, accessUnknown: t.accessUnknown, route: t.route }} /></Suspense>}

      {languageOpen && <div className="language-popover" role="dialog" aria-label={t.language}><div className="popover-head"><strong>{t.language}</strong><button type="button" onClick={() => setLanguageOpen(false)} aria-label={t.close}>×</button></div><div className="language-grid">{(Object.keys(localeNames) as Locale[]).map((key) => <button className={key === locale ? 'selected' : ''} type="button" key={key} lang={key === 'ja-x-easy' ? 'ja' : key} onClick={() => chooseLocale(key)}>{localeNames[key]}</button>)}</div><p>{t.reviewPending}</p></div>}

      {coverageOpen && <div className="modal-backdrop" role="presentation" onMouseDown={() => setCoverageOpen(false)}><section className="coverage-panel" id="coverage" role="dialog" aria-modal="true" aria-label={t.coverage} onMouseDown={(event) => event.stopPropagation()}><div className="coverage-head"><div><p className="step-label">TOKYO PILOT</p><h2>{t.coverage}</h2><p>{coverage?.validatedMunicipalityCount ?? 26} / 62 {t.validated} · {dataset?.recordCount ?? 4880} {t.records}</p></div><button type="button" onClick={() => setCoverageOpen(false)} aria-label={t.close}>×</button></div><div className="coverage-list">{coverage?.municipalities.map((row) => <div className="coverage-row" key={row.municipalityCode}><span className={`coverage-state ${row.status}`} aria-hidden="true"/><strong lang="ja">{row.nameJa}</strong><span>{row.recordCount ? `${row.recordCount} ${t.records}` : t.noLocalData}</span></div>) ?? <p>{t.loadingData}</p>}</div><div className="coverage-foot"><p>{t.varies}</p><a href={FOUNDATION_MAP} target="_blank" rel="noreferrer">{t.nationwideMap} ↗</a></div></section></div>}
    </main>
  );
}
