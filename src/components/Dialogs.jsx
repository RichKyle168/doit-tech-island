import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ISLANDS, districtsOf, search, streetsOf, techsOnStreet } from '../data/world.js';
import { RATES, SAMPLE, getSettings, setSettings, voices } from '../speech/engine.js';
import { useSpeech } from './Speech.jsx';

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

/** Choose the reading voice and speed; every choice plays a short sample right away. */
export function VoiceDialog({ onClose }) {
  const { mode, play, stop, playing } = useSpeech();
  const [, refresh] = useState(0);
  const list = voices();
  const current = getSettings();
  const sample = () => play('sample', [{ id: 'drt', part: 'sample', text: SAMPLE }]);
  const choose = (patch) => { setSettings(patch); refresh((n) => n + 1); sample(); };
  useEffect(() => () => stop(), [stop]);
  return (
    <Dialog title="朗讀的聲音" onClose={onClose}>
      <div className="voice">
        {!mode && <p className="search__empty">這台裝置沒有可以朗讀國語的聲音。</p>}
        {mode && !list.some((v) => v.gender === 'male' && !v.note.includes('舊式')) && (
          <p className="voice__hint">這台裝置沒有自然的國語男聲，所以先用女聲朗讀。</p>
        )}
        {mode && (
          <>
            <fieldset className="voice__group">
              <legend>語速</legend>
              <div className="voice__rates">
                {RATES.map((r) => (
                  <button key={r.id} type="button" className={`voice__rate${current.rate === r.id ? ' is-on' : ''}`}
                    aria-pressed={current.rate === r.id} onClick={() => choose({ rate: r.id })}>{r.label}</button>
                ))}
              </div>
            </fieldset>
            <fieldset className="voice__group">
              <legend>聲音（點一下就會試聽）</legend>
              <ul className="voice__list">
                {list.map((v, i) => (
                  <li key={v.id}>
                    <button type="button" className={`voice__item${current.voice === v.id ? ' is-on' : ''}`}
                      aria-pressed={current.voice === v.id} onClick={() => choose({ voice: v.id })}>
                      <span className="voice__name">{v.label}{i === 0 && <em>建議</em>}</span>
                      <span className="voice__note">{v.note}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </fieldset>
            <div className="voice__foot">
              <button type="button" className={`speak speak--wide${playing?.key === 'sample' ? ' is-active' : ''}`}
                onClick={() => (playing?.key === 'sample' ? stop() : sample())}>
                {playing?.key === 'sample' ? '停止試聽' : '再聽一次'}
              </button>
              <p>聲音來自這台手機或電腦。在 iPhone 的「設定 › 輔助使用 › 朗讀內容 › 聲音」下載「增強版」國語聲音，聽起來會更自然。</p>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}
