import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  RELATION_LABEL, spokenName, districtLinks, districtsOf, get, islandOf, refsOf, streetsOf, techLinks, techsOf, techsOnStreet,
} from '../data/world.js';
import { DISTRICT_PARTS, TECH_PARTS } from '../../shared/speech.js';
import { SourceButton, Text } from './Source.jsx';
import { SpeakButton, fieldSegments, pageSegments, readingPart, useSpeech } from './Speech.jsx';

const filled = (v) => (Array.isArray(v) ? v.length > 0 : Boolean(v));

function Section({ label, action = null, reading = false, children }) {
  return (
    <section className={`sec${reading ? ' is-reading' : ''}`}>
      <div className="sec__head"><h3>{label}</h3>{action}</div>
      {children}
    </section>
  );
}

function Lead({ item, part = 'summary', label = '簡介' }) {
  const { playing } = useSpeech();
  const reading = readingPart(playing, item.id) === part;
  return (
    <div className={`lead${reading ? ' is-reading' : ''}`}>
      <div className="sec__head sec__head--lead">
        <h3>{label}</h3>
        <SpeakButton id={`${part}:${item.id}`} segments={fieldSegments(item, part)} title={label} />
      </div>
      <Text value={item[part]} className="lead__text" />
    </div>
  );
}

/** The fields of a page in reading order, each with its own read-aloud button. */
function Fields({ item, parts, skip = [] }) {
  const { playing } = useSpeech();
  const reading = readingPart(playing, item.id);
  return parts.filter(([key, label]) => label && !skip.includes(key) && filled(item[key])).map(([key, label]) => {
    const v = item[key];
    return (
      <Section key={key} label={label} reading={reading === key}
        action={<SpeakButton id={`${key}:${item.id}`} segments={fieldSegments(item, key)} title={label} />}>
        {Array.isArray(v) ? <ul className="bullets">{v.map((a) => <li key={a.t}>{a.t}</li>)}</ul> : <Text value={v} />}
      </Section>
    );
  });
}

function Pending({ item, parts }) {
  const missing = parts.filter(([key, label]) => label && !filled(item[key])).map(([, label]) => label);
  if (!missing.length) return null;
  return <p className="pending-note"><span className="pending">資料持續建構中</span>{missing.join('、')}</p>;
}

function GoList({ items, go }) {
  return (
    <ul className="golist">
      {items.map((x) => (
        <li key={x.id}>
          <button type="button" className="go" onClick={() => go(x.id)}>
            <span className="go__name">{x.name}</span>
            {x.note && <span className="go__note">{x.note}</span>}
            {x.sub && <span className="go__sub">{x.sub}</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}

const districtNote = (d) => {
  const n = techsOf(d.id).length;
  return n ? `${n} 項技術` : `${d.topics.length} 個研發主題`;
};

// ───────────────────────────────────────────── island
function IslandBody({ island, go }) {
  const districts = districtsOf(island.id);
  const routes = districts.flatMap((d) => districtLinks(d.id).map((l) => ({ ...l, from: d })))
    .filter((l) => get(l.other).domain !== island.id);
  return (
    <>
      <Lead item={island} part="tagline" label="這座島" />
      <Section label={`島上的 ${districts.length} 個區`}>
        <GoList go={go} items={districts.map((d) => ({ id: d.id, name: `${d.nameZh}區`, note: districtNote(d), sub: d.summary?.t }))} />
      </Section>
      {routes.length > 0 && (
        <Section label="海路：和其他島相連的技術">
          <GoList go={go} items={routes.map((l) => ({
            id: l.other,
            name: `${l.from.nameZh} ⇄ ${get(l.other).nameZh}`,
            note: islandOf(get(l.other)).islandZh,
            sub: l.links.map((x) => get(x.tech).nameZh).join('、'),
          }))} />
        </Section>
      )}
    </>
  );
}

// ───────────────────────────────────────────── district
function DistrictBody({ district, go }) {
  const { playing } = useSpeech();
  const reading = readingPart(playing, district.id);
  const streets = streetsOf(district.id);
  const techs = techsOf(district.id);
  const links = districtLinks(district.id);
  return (
    <>
      <Lead item={district} />
      <Fields item={district} parts={DISTRICT_PARTS} skip={['topics', 'projects']} />
      {streets.length > 0 && (
        <Section label={`${streets.length} 條街、${techs.length} 項關鍵技術`}>
          {streets.map((s) => (
            <div key={s.id} className="street">
              <button type="button" className="street__name" onClick={() => go(s.id)}>
                <i style={{ background: s.colour }} aria-hidden="true" />{s.nameZh}街
              </button>
              <span className="street__techs">
                {techsOnStreet(s.id).map((t) => (
                  <button key={t.id} type="button" className="link" onClick={() => go(t.id)}>{t.nameZh}</button>
                ))}
              </span>
            </div>
          ))}
        </Section>
      )}
      <Section label="研發主題" reading={reading === 'topics'}
        action={<SpeakButton id={`topics:${district.id}`} segments={fieldSegments(district, 'topics')} title="研發主題" />}>
        {district.topics.length ? (
          <GoList go={go} items={district.topics.map((t) => ({ id: t.id, name: t.t.replace(/　/g, ' ') }))} />
        ) : <p className="pending">資料持續建構中</p>}
      </Section>
      <Section label={`科技專案（${district.projects?.length || 0}）`} reading={reading === 'projects'}
        action={<SpeakButton id={`projects:${district.id}`} segments={fieldSegments(district, 'projects')} title="科技專案" />}>
        {filled(district.projects) ? (
          <ul className="projects">
            {district.projects.map((p) => <li key={p.t}><span>{p.t}</span><small>{p.by}</small></li>)}
          </ul>
        ) : <p className="pending">資料持續建構中</p>}
      </Section>
      {links.length > 0 && (
        <Section label="和其他區相連">
          <GoList go={go} items={links.map((l) => ({
            id: l.other,
            name: `${get(l.other).nameZh}區`,
            note: islandOf(get(l.other)).islandZh,
            sub: l.links.map((x) => `${get(x.tech).nameZh}：${x.label}`).join('；'),
          }))} />
        </Section>
      )}
      <Pending item={district} parts={DISTRICT_PARTS.filter(([k]) => ['summary', 'whyItMatters', 'focus'].includes(k))} />
    </>
  );
}

// ───────────────────────────────────────────── street
function StreetBody({ street, go }) {
  const techs = techsOnStreet(street.id);
  return (
    <>
      <Lead item={street} label="這條街" />
      <Section label={`${techs.length} 項技術`}>
        <GoList go={go} items={techs.map((t) => ({ id: t.id, name: t.nameZh, sub: t.summary?.t }))} />
      </Section>
    </>
  );
}

// ───────────────────────────────────────────── technology
function TechBody({ tech, go }) {
  const links = techLinks(tech.id);
  const peers = links.filter((l) => get(l.other).kind === 'tech');
  const places = links.filter((l) => get(l.other).kind === 'district');
  return (
    <>
      <Lead item={tech} />
      <Fields item={tech} parts={TECH_PARTS} />
      {peers.length > 0 && (
        <Section label="相關的技術">
          <GoList go={go} items={peers.map((l) => ({ id: l.other, name: get(l.other).nameZh, note: RELATION_LABEL[l.relation], sub: l.label }))} />
        </Section>
      )}
      {places.length > 0 && (
        <Section label="也連到其他區">
          <GoList go={go} items={places.map((l) => ({ id: l.other, name: `${get(l.other).nameZh}區`, note: islandOf(get(l.other)).islandZh, sub: l.label }))} />
        </Section>
      )}
      <Pending item={tech} parts={TECH_PARTS} />
    </>
  );
}

// ───────────────────────────────────────────── topic
function TopicBody({ topic, go }) {
  const district = get(topic.district);
  const others = district.topics.filter((t) => t.id !== topic.id);
  return (
    <>
      <p className="pending-note"><span className="pending">資料持續建構中</span>這個研發主題的完整說明會陸續匯入。</p>
      <Section label="所在的區">
        <GoList go={go} items={[{ id: district.id, name: `${district.nameZh}區`, note: islandOf(district).islandZh, sub: district.summary?.t }]} />
      </Section>
      {others.length > 0 && (
        <Section label="同一區的其他主題">
          <GoList go={go} items={others.map((t) => ({ id: t.id, name: t.t.replace(/　/g, ' ') }))} />
        </Section>
      )}
    </>
  );
}

const PARTS = { district: DISTRICT_PARTS, tech: TECH_PARTS, island: [['tagline', null]], street: [['summary', null]] };

function kicker(x) {
  if (x.kind === 'island') return x.nameEn;
  if (x.kind === 'district') return islandOf(x).islandZh;
  if (x.kind === 'street') return `${get(x.district).nameZh}區`;
  if (x.kind === 'tech') return `${get(x.district).nameZh}區 › ${get(x.street).nameZh}街`;
  if (x.kind === 'topic') return `${get(x.district).nameZh}區 › 研發主題`;
  return '';
}

const titleOf = spokenName;

export { titleOf };

export default function Panel({ id, go, open, sheet, narrow, onClose, onSheet, onVoice, panelRef }) {
  const collapsed = sheet === 'peek';
  const { stop, playing, mode } = useSpeech();
  const scroller = useRef(null);
  const item = id ? get(id) : null;
  useEffect(() => { scroller.current?.scrollTo({ top: 0 }); }, [id]);
  useEffect(() => () => stop(), [id, stop]); // a reading ends when its page closes

  const parts = item && PARTS[item.kind];
  const name = item ? titleOf(item) : '';
  const speakItem = item && (item.kind === 'district' || item.kind === 'tech') ? { ...item, nameZh: name } : null;

  return (
    <AnimatePresence>
      {open && item && (
        <motion.aside
          key="panel"
          ref={panelRef}
          className={`panel is-${sheet}`}
          aria-label={`${name}的說明`}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30, transition: { duration: 0.18 } }}
          transition={{ type: 'spring', stiffness: 300, damping: 32 }}
        >
          <header className="panel__head">
            <button type="button" className="panel__grip" onClick={() => onSheet(collapsed ? 'half' : 'peek')} aria-expanded={!collapsed}
              aria-label={collapsed ? '展開說明' : '收合說明，看海圖'}>
              <span aria-hidden="true" />
            </button>
            <div className="panel__titles">
              <p className="panel__kicker">{kicker(item)}</p>
              <h2 className={`panel__name${readingPart(playing, item.id) === 'name' ? ' is-reading' : ''}`}>{name}</h2>
              {item.nameEn && item.kind !== 'island' && <p className="panel__en">{item.nameEn}</p>}
              {narrow && (
                <button type="button" className="panel__size" onClick={() => onSheet(sheet === 'full' ? 'half' : 'full')}>
                  {sheet === 'full' ? '縮小，看海圖' : sheet === 'peek' ? '展開說明' : '放大閱讀'}
                </button>
              )}
            </div>
            <button type="button" className="icon-btn panel__close" onClick={onClose} aria-label="關閉說明">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>
          </header>
          <div className="panel__scroll" ref={scroller} hidden={collapsed}>
            <motion.div key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
              {(speakItem || mode) && (
                <div className="panel__tools">
                  {speakItem && <SpeakButton id={`all:${item.id}`} segments={pageSegments(speakItem, parts)} label="朗讀全文" title={name} wide />}
                  {mode && <button type="button" className="link panel__voice" onClick={onVoice}>換聲音、調語速</button>}
                </div>
              )}
              {item.kind === 'island' && <IslandBody island={item} go={go} />}
              {item.kind === 'district' && <DistrictBody district={item} go={go} />}
              {item.kind === 'street' && <StreetBody street={item} go={go} />}
              {item.kind === 'tech' && <TechBody tech={item} go={go} />}
              {item.kind === 'topic' && <TopicBody topic={item} go={go} />}
              <footer className="panel__foot">
                <SourceButton refs={refsOf(item)} title={name} />
              </footer>
            </motion.div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
