import { AnimatePresence, motion } from 'framer-motion';
import { COUNTS, districtsOf, get, streetsOf, techsOf, techsOnStreet } from '../data/world.js';
import { speakable } from '../../shared/speech.js';
import { SpeakButton } from './Speech.jsx';

/** What Dr. T says, for wherever the visitor is. */
export function lineFor(route) {
  const x = route.kind === 'sea' ? null : get(route.id);
  if (!x) {
    return `歡迎來到產業技術島！海上有 ${COUNTS.islands} 座島，每一座島是一個產業領域，島上的每一區是一個研發方向。點一座島，靠岸看看。`;
  }
  if (x.kind === 'island') {
    const ds = districtsOf(x.id);
    return `這裡是${x.islandZh}，島上有 ${ds.length} 個區：${ds.map((d) => d.nameZh).join('、')}。點一個區，看看它在研發什麼。`;
  }
  if (x.kind === 'district') {
    const streets = streetsOf(x.id);
    if (streets.length) return `${x.nameZh}區有 ${streets.length} 條街、${techsOf(x.id).length} 項關鍵技術，每一座小亭子是一項技術。點一條街，走進去看看。`;
    return `${x.nameZh}區有 ${x.topics.length} 個研發主題，每一棟房子是一個主題。說明欄的「朗讀」按鈕，可以唸給你聽。`;
  }
  if (x.kind === 'street') {
    const ts = techsOnStreet(x.id);
    return `${x.nameZh}街有 ${ts.length} 項技術：${ts.map((t) => t.nameZh).join('、')}。點一座亭子，看完整說明。`;
  }
  if (x.kind === 'tech') return `這是「${x.nameZh}」。每一段說明都有朗讀按鈕；最下面的「資料來源」可以看原文。`;
  if (x.kind === 'topic') return `這個研發主題的完整內容還在整理中，可以先看看${get(x.district).nameZh}區的說明。`;
  return '';
}

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
            <SpeakButton id={`drt:${key}`} segments={[{ part: 'drt', text: speakable(line) }]} label="唸給我聽" title="Dr. T 的導覽" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
