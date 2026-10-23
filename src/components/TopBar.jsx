import { get } from '../data/world.js';
import { parentOf } from '../state/route.js';

/** The trail from the open sea down to where the visitor is. */
function trail(route) {
  const out = [{ id: null, name: '群島' }];
  const x = route.kind === 'sea' ? null : get(route.id);
  if (!x) return out;
  const push = (y) => {
    if (!y) return;
    if (y.kind === 'island') out.push({ id: y.id, name: y.islandZh });
    if (y.kind === 'district') out.push({ id: y.id, name: `${y.nameZh}區` });
    if (y.kind === 'street') out.push({ id: y.id, name: `${y.nameZh}街` });
    if (y.kind === 'tech') out.push({ id: y.id, name: y.nameZh });
    if (y.kind === 'topic') out.push({ id: y.id, name: '研發主題' });
  };
  const chain = [];
  let y = x;
  while (y) {
    chain.unshift(y);
    y = y.kind === 'island' ? null : y.kind === 'district' ? get(y.domain) : get(y.street || y.district);
  }
  chain.forEach(push);
  return out;
}

const Icon = ({ d }) => <svg viewBox="0 0 24 24" aria-hidden="true"><path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;

export default function TopBar({ route, go, onSearch, onDirectory }) {
  const steps = trail(route);
  const up = parentOf(route);
  return (
    <header className="top">
      <div className="top__row">
        <button type="button" className="brand" onClick={() => go(null)} aria-label="產業技術島：回到群島">
          <svg className="brand__mark" viewBox="0 0 40 40" aria-hidden="true">
            <path d="M20 4l13.9 8v16L20 36 6.1 28V12z" fill="#D1A35A" stroke="#14263A" strokeWidth="1.5" />
            <path d="M6.1 12L20 20l13.9-8M20 20v16" fill="none" stroke="#14263A" strokeWidth="1.2" opacity=".5" />
            <path d="M2 31c4-2 8 2 12 0s8 2 12 0 8 2 12 0" fill="none" stroke="#0E4F5C" strokeWidth="1.6" />
          </svg>
          <span className="brand__text">
            <strong>產業技術島</strong>
            <small>DOIT Tech Island</small>
          </span>
        </button>
        <div className="top__actions">
          <button type="button" className="tool" onClick={onSearch}>
            <Icon d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15zM16 16l5 5" /><span>搜尋</span>
          </button>
          <button type="button" className="tool" onClick={onDirectory}>
            <Icon d="M4 6h16M4 12h16M4 18h10" /><span>目錄</span>
          </button>
        </div>
      </div>
      {route.kind !== 'sea' && (
        <nav className="trail" aria-label="目前位置">
          <button type="button" className="trail__up" onClick={() => go(up.kind === 'sea' ? null : up.id)} aria-label="回上一層">
            <Icon d="M15 5l-7 7 7 7" /><span>上一層</span>
          </button>
          <ol>
            {steps.map((s, i) => (
              <li key={s.id || 'sea'}>
                {i < steps.length - 1
                  ? <button type="button" onClick={() => go(s.id)}>{s.name}</button>
                  : <span aria-current="location">{s.name}</span>}
              </li>
            ))}
          </ol>
        </nav>
      )}
    </header>
  );
}
