/**
 * What Dr. T says, for wherever the visitor is. Shared by the page and the voice function,
 * so the natural voice reads exactly the line on screen.
 */
import { COUNTS, districtsOf, get, streetsOf, techsOf, techsOnStreet } from './world.js';

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

