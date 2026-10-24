import { AnimatePresence, motion } from 'framer-motion';
import { lineFor } from '../data/guide.js';
import { speakable } from '../../shared/speech.js';
import { SpeakButton } from './Speech.jsx';

function Avatar() {
  return (
    <svg className="drt__avatar" viewBox="0 0 44 44" aria-hidden="true">
      <circle cx="22" cy="18" r="14" fill="#F2C230" />
      <path d="M8 18a14 14 0 0 1 28 0" fill="none" stroke="#14263A" strokeWidth="1.4" />
      <path d="M15 6.5c2 3 2 20 0 24M29 6.5c-2 3-2 20 0 24M22 4v28" stroke="#14263A" strokeWidth="1.1" fill="none" opacity=".55" />
      <path d="M13 29l4 7h10l4-7" fill="none" stroke="#14263A" strokeWidth="1.4" />
      <rect x="17" y="35" width="10" height="6" rx="1" fill="#8A6A4F" stroke="#14263A" strokeWidth="1.2" />
      <text x="22" y="22" textAnchor="middle" className="drt__t">T</text>
    </svg>
  );
}

export default function Guide({ route, hidden, onClose }) {
  const line = lineFor(route);
  const key = `${route.kind}:${route.id || ''}`;
  return (
    <AnimatePresence>
      {!hidden && (
        <motion.div
          key="drt"
          className="drt"
          role="status"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
        >
          <Avatar />
          <div className="drt__bubble">
            <button type="button" className="drt__close" onClick={onClose} aria-label="收起 Dr. T 的導覽">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>
            <p className="drt__who">Dr. T 導覽</p>
            <motion.p key={key} className="drt__line" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>{line}</motion.p>
            <SpeakButton id={`drt:${key}`} segments={[{ id: route.id || 'sea', part: 'drt', text: speakable(line) }]} label="唸給我聽" title="Dr. T 的導覽" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
