import { memo } from 'react';
import { ISLANDS, districtsOf, get, streetsOf, techsOf, techsOnStreet } from '../data/world.js';

/**
 * Names on the chart. Each label is a real button (tap it instead of the small 3D object);
 * the 3D scene positions them every frame and hides the ones that would overlap.
 */
function labelsFor(view) {
  const out = [];
  const island = (x, prio, small = false) => out.push({
    id: x.id, kind: small ? 'island-far' : 'island', name: x.islandZh, sub: small ? null : `${districtsOf(x.id).length} 區`, prio,
  });
  const district = (d, prio, kind = 'district') => {
    const n = techsOf(d.id).length;
    out.push({ id: d.id, kind, name: `${d.nameZh}區`, sub: kind === 'district' ? (n ? `${n} 項技術` : `${d.topics.length} 個主題`) : null, prio });
  };
  if (view.level === 'sea') {
    ISLANDS.forEach((x) => island(x, 10));
  } else if (view.level === 'island') {
    districtsOf(view.id).forEach((d) => district(d, 10));
    ISLANDS.filter((x) => x.id !== view.id).forEach((x) => island(x, 3, true));
  } else if (view.level === 'district') {
    const d = get(view.id);
    district(d, 9, 'here');
    const streets = streetsOf(d.id);
    if (streets.length) {
      streets.forEach((s) => out.push({ id: s.id, kind: 'street', name: `${s.nameZh}街`, sub: `${techsOnStreet(s.id).length} 項`, prio: 10, colour: s.colour }));
    } else {
      d.topics.forEach((t) => out.push({ id: t.id, kind: 'topic', name: t.short, prio: 8 }));
    }
    districtsOf(d.domain).filter((x) => x.id !== d.id).forEach((x) => district(x, 6, 'near'));
    ISLANDS.filter((x) => x.id !== d.domain).forEach((x) => island(x, 2, true));
  } else if (view.level === 'street') {
    const s = get(view.id);
    techsOnStreet(s.id).forEach((t) => out.push({ id: t.id, kind: 'tech', name: t.nameZh, prio: 10, colour: s.colour }));
    out.push({ id: s.id, kind: 'here', name: `${s.nameZh}街`, prio: 9, colour: s.colour });
    streetsOf(s.district).filter((x) => x.id !== s.id).forEach((x) => out.push({ id: x.id, kind: 'near', name: `${x.nameZh}街`, prio: 6, colour: x.colour }));
    district(get(s.district), 5, 'near');
  }
  return out;
}

function Labels({ view, world, go, selected, hovered }) {
  const items = labelsFor(view);
  return (
    <div className="labels" aria-label="海圖上的地名">
      {items.map((l) => (
        <button
          key={`${view.level}:${view.id}:${l.id}`}
          ref={(el) => world?.registerLabel(l.id, el)}
          type="button"
          data-priority={l.prio}
          className={`lbl lbl--${l.kind}${selected === l.id ? ' is-selected' : ''}${hovered === l.id ? ' is-hover' : ''}`}
          onClick={() => go(l.id)}
          style={{ opacity: 0 }}
        >
          {l.colour && <i className="lbl__dot" style={{ background: l.colour }} aria-hidden="true" />}
          <span className="lbl__name">{l.name}</span>
          {l.sub && <span className="lbl__sub">{l.sub}</span>}
        </button>
      ))}
    </div>
  );
}

export default memo(Labels);
