/**
 * Where the visitor is, kept in the address (#/district/robot …) so the back button,
 * reloads and shared links all work.
 */
import { useCallback, useEffect, useState } from 'react';
import { get } from '../data/world.js';

const KINDS = new Set(['island', 'district', 'street', 'tech', 'topic']);

export function parseHash(hash) {
  const [, kind, raw] = (hash || '').replace(/^#/, '').split('/');
  const id = raw ? decodeURIComponent(raw) : '';
  if (KINDS.has(kind) && get(id)?.kind === kind) return { kind, id };
  return { kind: 'sea' };
}

export const hrefOf = (route) => (route.kind === 'sea' ? '#/' : `#/${route.kind}/${encodeURIComponent(route.id)}`);

/** What the camera frames for a route: a tech is seen on its street, a topic in its district. */
export function viewOf(route) {
  if (route.kind === 'sea') return { level: 'sea' };
  if (route.kind === 'tech') return { level: 'street', id: get(route.id).street };
  if (route.kind === 'topic') return { level: 'district', id: get(route.id).district };
  return { level: route.kind, id: route.id };
}

/** One step up from a route. */
export function parentOf(route) {
  const x = route.kind === 'sea' ? null : get(route.id);
  if (!x) return { kind: 'sea' };
  if (x.kind === 'island') return { kind: 'sea' };
  if (x.kind === 'district') return { kind: 'island', id: x.domain };
  if (x.kind === 'street' || x.kind === 'topic') return { kind: 'district', id: x.district };
  if (x.kind === 'tech') return { kind: 'street', id: x.street };
  return { kind: 'sea' };
}

export const routeTo = (id) => (!id ? { kind: 'sea' } : { kind: get(id)?.kind || 'sea', id });

export function useRoute() {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const on = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const go = useCallback((target) => {
    const r = typeof target === 'string' ? routeTo(target) : target;
    const href = hrefOf(r);
    if (window.location.hash !== href) window.location.hash = href;
    else setRoute(r);
  }, []);
  return [route, go];
}
