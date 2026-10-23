import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ISLANDS, districtsOf, search, streetsOf, techsOnStreet } from '../data/world.js';

const KIND_ZH = { island: '島', district: '區', topic: '研發主題', tech: '技術' };

function Dialog({ title, onClose, children, wide = false }) {
  const closeRef = useRef(null);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); onClose(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <motion.div className="scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div
        className={`dialog${wide ? ' dialog--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 10, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
      >
        <header className="dialog__head">
          <h2 className="dialog__title">{title}</h2>
          <button ref={closeRef} type="button" className="icon-btn" onClick={onClose} aria-label={`關閉${title}`}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </header>
        {children}
      </motion.div>
    </motion.div>
  );
}

export function SearchDialog({ onClose, go }) {
  const [q, setQ] = useState('');
  const results = useMemo(() => search(q), [q]);
  const input = useRef(null);
  useEffect(() => { input.current?.focus(); }, []);
  const pick = (id) => { onClose(); go(id); };
  return (
    <Dialog title="搜尋" onClose={onClose}>
      <form className="search" onSubmit={(e) => { e.preventDefault(); if (results[0]) pick(results[0].id); }}>
        <label htmlFor="q" className="sr-only">搜尋島、區、技術或研發主題</label>
        <input id="q" ref={input} type="search" value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="例如：數位雙生、氫能、電動車" autoComplete="off" enterKeyHint="search" />
      </form>
      <div className="search__body">
        {q.trim() && !results.length && <p className="search__empty">找不到「{q.trim()}」。換個詞試試，例如「AI」或「半導體」。</p>}
        {!q.trim() && (
          <div className="search__hints">
            <p>試試這些：</p>
            {['數位雙生', '機器人', '6G', '電動車', '氫能', '醫療器材', '碳化矽', '紡織'].map((w) => (
              <button key={w} type="button" className="chip" onClick={() => setQ(w)}>{w}</button>
            ))}
          </div>
        )}
        <ul className="results">
          {results.map((r) => (
            <li key={r.id}>
              <button type="button" className="go" onClick={() => pick(r.id)}>
                <span className="go__name">{r.kind === 'district' ? `${r.name}區` : r.name}</span>
                <span className="go__note">{KIND_ZH[r.kind]}</span>
                <span className="go__sub">{r.sub}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Dialog>
  );
}

export function DirectoryDialog({ onClose, go }) {
  const pick = (id) => { onClose(); go(id); };
  return (
    <Dialog title="目錄：所有的島與區" onClose={onClose} wide>
      <div className="dir">
        {ISLANDS.map((isl) => (
          <section key={isl.id} className="dir__island">
            <h3>
              <i style={{ background: isl.land }} aria-hidden="true" />
              <button type="button" onClick={() => pick(isl.id)}>{isl.islandZh}</button>
            </h3>
            <ul>
              {districtsOf(isl.id).map((d) => (
                <li key={d.id}>
                  <button type="button" className="dir__district" onClick={() => pick(d.id)}>{d.nameZh}區</button>
                  {streetsOf(d.id).length > 0 ? (
                    <ul className="dir__techs">
                      {streetsOf(d.id).map((s) => (
                        <li key={s.id}>
                          <button type="button" className="dir__street" onClick={() => pick(s.id)}>{s.nameZh}街</button>
                          {techsOnStreet(s.id).map((t) => (
                            <button key={t.id} type="button" className="link" onClick={() => pick(t.id)}>{t.nameZh}</button>
                          ))}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="dir__meta">{d.topics.length} 個研發主題，{d.projects?.length || 0} 項科技專案</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Dialog>
  );
}
