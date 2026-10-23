import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import World from './scene/World.js';
import { COUNTS, ISLANDS, districtsOf } from './data/world.js';
import { routeTo, useRoute, viewOf } from './state/route.js';
import Labels from './components/Labels.jsx';
import Panel from './components/Panel.jsx';
import Guide from './components/Guide.jsx';
import TopBar from './components/TopBar.jsx';
import { DirectoryDialog, SearchDialog } from './components/Dialogs.jsx';

function useMedia(query) {
  const [on, setOn] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const fn = () => setOn(m.matches);
    m.addEventListener('change', fn);
    return () => m.removeEventListener('change', fn);
  }, [query]);
  return on;
}

/** The chart's legend: one swatch per island, and how much is on the chart. */
function Legend({ go }) {
  return (
    <aside className="legend" aria-label="圖例">
      <h2>圖例</h2>
      <ul>
        {ISLANDS.map((x) => (
          <li key={x.id}>
            <button type="button" onClick={() => go(x.id)}>
              <i style={{ background: x.land }} aria-hidden="true" />
              <span>{x.islandZh}</span>
              <small>{districtsOf(x.id).length} 區</small>
            </button>
          </li>
        ))}
      </ul>
      <p className="legend__scale">
        {COUNTS.districts} 個區，{COUNTS.topics} 個研發主題，{COUNTS.techs} 項關鍵技術，{COUNTS.projects} 項科技專案
      </p>
    </aside>
  );
}

export default function App() {
  const [route, go] = useRoute();
  const host = useRef(null);
  const panelRef = useRef(null);
  const [world, setWorld] = useState(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [sheet, setSheet] = useState('half'); // phones: 'peek' | 'half' | 'full'
  const [dialog, setDialog] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [guideHidden, setGuideHidden] = useState(false);
  const narrow = useMedia('(max-width: 820px)');
  const view = viewOf(route);
  const panelId = route.kind === 'sea' ? null : route.id;
  const routeKey = `${route.kind}:${route.id || ''}`;

  // navigating to where you already are re-opens the panel
  const navigate = useCallback((id) => {
    const next = routeTo(id);
    if (next.kind === route.kind && next.id === route.id) {
      setPanelOpen(true);
      setSheet((v) => (v === 'peek' ? 'half' : v));
      return;
    }
    go(next);
  }, [go, route.kind, route.id]);
  const navRef = useRef(navigate);
  navRef.current = navigate;

  useEffect(() => {
    const w = new World(host.current, {
      onPick: (id) => (id === 'drt' ? setGuideHidden((h) => !h) : navRef.current(id)),
      onHover: setHovered,
    });
    setWorld(w);
    window.__island = w; // for debugging in the console
    return () => w.dispose();
  }, []);

  useEffect(() => { setPanelOpen(true); setGuideHidden(false); setSheet((v) => (v === 'full' ? 'full' : 'half')); }, [routeKey]);
  // the panel's space is taken away from the chart, so what you are looking at stays visible
  const showPanel = panelOpen && Boolean(panelId);
  useEffect(() => {
    if (!world) return undefined;
    const apply = () => {
      const el = panelRef.current;
      const top = document.querySelector('.top')?.offsetHeight || 0;
      if (narrow && showPanel && sheet === 'full') return; // reading full screen: leave the chart as it was
      if (!showPanel || !el) { world.setInset({ right: 0, bottom: 0, top }); return; }
      if (narrow) world.setInset({ right: 0, bottom: el.offsetHeight + 12, top });
      else world.setInset({ right: el.offsetWidth + 24, bottom: 0, top });
    };
    apply();
    const ro = new ResizeObserver(apply);
    if (panelRef.current) ro.observe(panelRef.current);
    const t = setTimeout(apply, 350);
    return () => { ro.disconnect(); clearTimeout(t); };
  }, [world, showPanel, narrow, sheet, routeKey]);

  useEffect(() => { world?.setView(view); }, [world, view.level, view.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { world?.setSelected(panelId); }, [world, panelId]);

  // after the inset changes, frame the view again so it fits the space that is left
  useEffect(() => {
    if (!world) return undefined;
    const t = setTimeout(() => world.setView(view, { force: true, duration: 0.8 }), 360);
    return () => clearTimeout(t);
  }, [world, showPanel, narrow, sheet]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e) => {
      if (dialog || e.target.closest?.('input, textarea')) return;
      if (e.key === '/') { e.preventDefault(); setDialog('search'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialog]);

  const guideHide = guideHidden || (narrow && showPanel && sheet !== 'peek');

  return (
    <div className={`app${narrow ? ' is-narrow' : ''}`}>
      <div className="chart" ref={host}>
        <Labels view={view} world={world} go={navigate} selected={panelId} hovered={hovered} />
      </div>
      <TopBar route={route} go={navigate} onSearch={() => setDialog('search')} onDirectory={() => setDialog('dir')} />
      {route.kind === 'sea' && !narrow && <Legend go={navigate} />}
      <Guide route={route} hidden={guideHide} onClose={() => setGuideHidden(true)} />
      <Panel
        id={panelId}
        go={navigate}
        open={showPanel}
        sheet={narrow ? sheet : 'half'}
        narrow={narrow}
        onClose={() => setPanelOpen(false)}
        onSheet={setSheet}
        panelRef={panelRef}
      />
      {!showPanel && panelId && (
        <button type="button" className="reopen" onClick={() => { setPanelOpen(true); setSheet('half'); }}>打開說明</button>
      )}
      <AnimatePresence>
        {dialog === 'search' && <SearchDialog key="s" onClose={() => setDialog(null)} go={navigate} />}
        {dialog === 'dir' && <DirectoryDialog key="d" onClose={() => setDialog(null)} go={navigate} />}
      </AnimatePresence>
    </div>
  );
}
