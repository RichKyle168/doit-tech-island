import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { DOCUMENT, sourcesFor } from '../data/world.js';

/**
 * Sources stay in the data (every text keeps its type and refs) but out of the reading flow:
 * one quiet link at the end of a panel opens the passages the page was written from.
 */
const SourceCtx = createContext(null);

export function SourceProvider({ children }) {
  const [open, setOpen] = useState(null); // { refs, title }
  const openSource = useCallback((payload) => setOpen(payload), []);
  const value = useMemo(() => ({ openSource }), [openSource]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setOpen(null); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open]);

  return (
    <SourceCtx.Provider value={value}>
      {children}
      {createPortal(
        <AnimatePresence>
          {open && <SourcePanel key="src" {...open} onClose={() => setOpen(null)} />}
        </AnimatePresence>,
        document.body,
      )}
    </SourceCtx.Provider>
  );
}

const useSource = () => useContext(SourceCtx);
const pageLabel = (s) => (typeof s.page === 'number' ? `p.${s.page}` : `目錄 ${s.page}`);

function SourcePanel({ refs, title, onClose }) {
  const closeRef = useRef(null);
  const items = useMemo(() => sourcesFor(refs), [refs]);
  useEffect(() => { closeRef.current?.focus(); }, []);

  return (
    <motion.div className="scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.aside
        className="dialog src"
        role="dialog"
        aria-modal="true"
        aria-label="資料來源"
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 12, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
      >
        <header className="dialog__head">
          <div>
            <h2 className="dialog__title">資料來源</h2>
            {title && <p className="dialog__sub">{title}</p>}
          </div>
          <button ref={closeRef} type="button" className="icon-btn" onClick={onClose} aria-label="關閉資料來源">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </header>
        <ol className="src__list">
          {items.map((s) => (
            <li key={s.id} className="src__item">
              <p className="src__label">{s.label}</p>
              <blockquote className={`src__quote${s.kind === 'quote' ? '' : ' src__quote--cells'}`}>
                {s.excerpt.split('｜').map((part, i) => <span key={i}>{part}</span>)}
              </blockquote>
              <p className="src__where">{s.section}<span>{pageLabel(s)}</span></p>
            </li>
          ))}
        </ol>
        <footer className="src__foot">
          摘錄自《{DOCUMENT.title}》，{DOCUMENT.publisher}，{DOCUMENT.published}。
          摘錄是原文；島上的說明文字依原文改寫，或由產業技術島整理歸納。
        </footer>
      </motion.aside>
    </motion.div>
  );
}

/** A text field. null →「資料持續建構中」. */
export function Text({ value, as: Tag = 'p', className = '' }) {
  if (!value) return <Tag className={`pending ${className}`}>資料持續建構中</Tag>;
  return <Tag className={className}>{value.t}</Tag>;
}

/** Opens the source dialog for a list of source ids. */
export function SourceButton({ refs, title }) {
  const { openSource } = useSource();
  if (!refs.length) return null;
  return (
    <button type="button" className="link link--quiet" onClick={() => openSource({ refs, title })}>
      資料來源（{refs.length}）
    </button>
  );
}
