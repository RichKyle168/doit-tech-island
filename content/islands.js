/**
 * 產業技術島 — one island per industry domain, one district per chapter.
 *
 *   島 (island)    an industry domain of the 產業技術篇 (半導體及光電、資通訊、機械…)
 *   區 (district)  a chapter of that domain (先進製程與封裝、機器人…)
 *   主題 (topic)   the research stories listed under the chapter in the table of contents
 *   技術 (tech)    key technologies — the 17 stars of the 機器人 system in technologies.js
 *
 * Districts whose id matches a system in technologies.js inherit that system's texts
 * (summary, description, whyItMatters, industryValue, taiwan); the fields below add to them.
 * Every text is { t, type, refs } exactly as in technologies.js:
 *   SOURCE  = written from the passage in refs     DERIVED = the island's own wording or grouping
 * A missing field is shown as「資料持續建構中」.
 */

const S = (t, ...refs) => ({ t, type: 'SOURCE', refs });
const D = (t, ...refs) => ({ t, type: 'DERIVED', refs });

/** Topics come from the table of contents: "lead　rest" → a short label (lead) and the full title. */
const topics = (ref, ...titles) => titles.map((title) => {
  const [lead, ...rest] = title.split('　');
  return { t: [lead, ...rest].join('　'), short: lead, type: 'SOURCE', refs: [ref] };
});
/** Research projects: "name／executing units". */
const projects = (ref, ...rows) => rows.map((row) => {
  const cut = row.lastIndexOf('／'); // a name may contain ／ itself (釹／鏑…)
  return { t: row.slice(0, cut), by: row.slice(cut + 1), type: 'SOURCE', refs: [ref] };
});

// ─────────────────────────────────────────────────────────────── islands
// at: centre of the island on the chart (world units, x → east, z → south)
export const DOMAINS = [
  {
    id: 'semi', nameZh: '半導體及光電', nameEn: 'Semiconductors & Optoelectronics', roman: '貳',
    land: '#8E8FC4', at: [-60, -50],
    tagline: D('晶片的製程與封裝、新材料、製造設備，到用光傳輸資料的矽光子，以及顯示面板。', 'topics-adv', 'topics-cs', 'topics-eq', 'topics-siph', 'topics-disp'),
    chapters: ['sys-adv-process', 'sys-compound', 'sys-semi-equip', 'sys-siph', 'sys-display'],
  },
  {
    id: 'ict', nameZh: '資通訊', nameEn: 'Information & Communications', roman: '參',
    land: '#5FB3A1', at: [58, -56],
    tagline: D('讓萬物連上網的行動通訊、讓產業更聰明的 AI，以及虛實融合的人機互動。', 'topics-mob', 'topics-ai', 'topics-hmi'),
    chapters: ['sys-mobile', 'ict-ai', 'ict-hmi'],
  },
  {
    id: 'mech', nameZh: '機械', nameEn: 'Machinery', roman: '肆',
    land: '#D1A35A', at: [0, 4],
    tagline: D('被稱為工業之母的工具機、會看會想的機器人，以及把它們串起來的智慧製造。', 'tool-mother', 'topics-tool', 'topics-robot', 'topics-smfg'),
    chapters: ['machine-tool', 'robot', 'smart-mfg'],
  },
  {
    id: 'trans', nameZh: '運輸', nameEn: 'Transportation', roman: '伍',
    land: '#7C8DA6', at: [66, 34],
    tagline: D('智慧電動車，以及在陸地、天空與海上自主移動的無人載具。', 'topics-ev', 'uv-types'),
    chapters: ['trans-ev', 'trans-uv'],
  },
  {
    id: 'bio', nameZh: '生醫', nameEn: 'Biomedicine', roman: '陸',
    land: '#8CC56E', at: [-72, 18],
    tagline: D('新藥、醫療器材，以及每天吃進嘴裡的食品與生物資源。', 'topics-drug', 'topics-med', 'topics-food'),
    chapters: ['bio-drug', 'bio-device', 'bio-food'],
  },
  {
    id: 'mat', nameZh: '材化', nameEn: 'Materials & Chemicals', roman: '柒',
    land: '#D9A6A0', at: [-30, 70],
    tagline: D('自主的關鍵材料、資源循環再利用，以及高階纖維與紡織。', 'topics-mat', 'topics-tex'),
    chapters: ['sys-materials', 'mat-textile'],
  },
  {
    id: 'nz', nameZh: '淨零科技', nameEn: 'Net-Zero Technologies', roman: '捌',
    land: '#4FA36B', at: [30, 78],
    tagline: D('氫能應用，以及半導體、電子、石化、鋼鐵、金屬、紡織等產業的減碳技術。', 'topics-h2', 'dc-focus'),
    chapters: ['nz-hydrogen', 'nz-decarb'],
  },
];

// ─────────────────────────────────────────────────────────────── districts
// landmark: which model stands in the middle of the district (src/scene/landmarks.js)
export const CHAPTERS = [
  // ── 半導體及光電
  {
    id: 'sys-adv-process', domain: 'semi', ordinal: '第一章', nameZh: '先進製程與封裝', nameEn: 'Advanced Process & Packaging', landmark: 'chipStack',
    summary: S('先進製程與封裝技術，已成為驅動全球半導體產業轉型升級的關鍵力量，應用涵蓋高效能運算、AI、自駕車、高速通訊、量子運算等領域。', 'adv-overview'),
    whyItMatters: S('摩爾定律逐步逼近物理極限：前端製程除了持續微縮，也必須搭配先進封裝，晶片效能才能持續提升。', 'adv-moore'),
    focus: S('2.5D 封裝利用中介層整合多顆晶片；3D 堆疊則透過矽穿孔（TSV）強化垂直連接，大幅縮短資料傳輸距離。', 'adv-stacking'),
    topics: topics('topics-adv', '建構系統級應用方案　邁向AI晶片新時代', '打造HPC共用設計資源　加速IC設計業邁向先進製程', '半導體異質封裝來襲　EDA迎來挑戰與機會'),
    projects: projects('adv-projects', '低延遲AI Chiplet整合發展計畫／工研院', '智動化協同設計EDA前瞻技術開發計畫／工研院', '先進晶片產業前瞻技術發展計畫／工研院'),
  },
  {
    id: 'sys-compound', domain: 'semi', ordinal: '第二章', nameZh: '化合物半導體', nameEn: 'Compound Semiconductors', landmark: 'crystals',
    summary: S('化合物半導體主要用在光學元件、高頻與高功率元件，例如 AI 伺服器光纖通訊的紅外線收發裝置，以及手機、基地台的射頻功率放大器。', 'cs-overview'),
    whyItMatters: S('應用需求朝高電壓移轉，碳化矽（SiC）與氮化鎵（GaN）成為業界關注的核心；碳化矽元件能快速切換、耐高溫、耐高電壓。', 'cs-sic'),
    focus: S('開發耐壓 1,700 伏特的 SiC 元件，兼顧高耐壓與低損耗，因應電動車與伺服器資料中心的需求；並以超快雷射開發 8 吋 SiC 晶錠切割設備。', 'cs-measures'),
    topics: topics('topics-cs', '化合物半導體創新應用　實現高效能解決方案', '化合物半導體關鍵材料開發　驅動產業升級與自主供應', '智造驅動×在地整合　開啟碳化矽產業生態系新紀元'),
    projects: projects('cs-projects', '化合物半導體元件關鍵技術計畫／工研院', '化合物半導體晶錠切割設備關鍵技術計畫／工研院', '化合物半導體材料關鍵技術計畫／工研院、金屬中心', '化合物半導體元件系統整合應用與場域驗證計畫／工研院'),
  },
  {
    id: 'sys-semi-equip', domain: 'semi', ordinal: '第三章', nameZh: '半導體設備', nameEn: 'Semiconductor Equipment', landmark: 'fab',
    summary: S('半導體設備是影響我國技術發展的關鍵產業；政府依循「五大信賴產業」擴大支持設備產業，加強供應鏈在地化。', 'eq-overview'),
    whyItMatters: S('設備自主扎根，能強化國內關鍵模組的研發能量，並帶動國內機械加工與零組件產業聚落形成。', 'eq-cluster'),
    focus: S('先進封裝朝小晶片立體堆疊與異質整合發展，帶動沉積、蝕刻、微影、清洗、平坦化、鍵合等設備的精度與效率需求，也推動奈米級量檢測設備開發。', 'eq-packaging'),
    topics: topics('topics-eq', '啟動晶片創新基地　臺灣技術躍升新動能', '首創大視野奈米級AI檢測技術　突破奈米級檢測挑戰！', '關鍵模組自主化　打造臺灣晶片製造後盾'),
    projects: projects('eq-projects', '先進半導體與次微米感測晶片Infra建置計畫／工研院', '先進半導體關鍵模組開發及設備加值共創計畫／工研院、金屬中心', '下世代封裝製程奈米級全方位感測技術開發計畫／工研院'),
  },
  {
    id: 'sys-siph', domain: 'semi', ordinal: '第四章', nameZh: '矽光子／量子科技', nameEn: 'Silicon Photonics & Quantum', landmark: 'lighthouse',
    summary: S('用光訊號在晶片之間通訊，比電子訊號快得多，可以降低大量資料傳輸造成的延遲。', 'siph-light'),
    whyItMatters: S('資料中心傳統光收發模組的傳輸速率已面臨瓶頸；若不改善，訊號延遲、功率消耗與營運成本上升都將無可避免。', 'siph-bottleneck'),
    focus: S('矽光子製程的課題在於光波導設計、低成本自動化量產，以及關鍵元件「雷射光源」的開發。', 'siph-issues'),
    topics: topics('topics-siph', '因應AI需求　發展矽光子技術', '量子控制與讀取關鍵模組　技術自主化'),
    projects: projects('siph-projects', '高效低耗資料傳輸模組關鍵技術開發與系統應用計畫／工研院', '量子科技關鍵元件及電路模組開發計畫／工研院'),
  },
  {
    id: 'sys-display', domain: 'semi', ordinal: '第五章', nameZh: '面板科技', nameEn: 'Display Technology', landmark: 'panels',
    summary: S('顯示科技是資通訊產品人機互動的重要介面：手機、筆電、電視、穿戴裝置、AR 與頭戴裝置都少不了它。', 'disp-overview'),
    whyItMatters: S('新興顯示科技與應用的發展，也將帶動更多半導體、物聯網與 5G 元件的需求。', 'disp-demand'),
    focus: S('以 Micro LED 與軟性顯示為重點：發展曲面、異形、高解析、低功耗的顯示元件，並以軟性觸覺回饋元件，讓 VR 與 AR 的觸感更真實。', 'disp-measures'),
    topics: topics('topics-disp', '開發捲軸式顯示技術　拓展無限應用場域', '發展觸覺回饋高擬真技術　增強遠距智慧生活體驗'),
    projects: projects('disp-projects', '無光罩柔性低耗能材料與製程技術計畫／工研院', '軟性複合式觸覺回饋技術與應用開發計畫／工研院'),
  },

  // ── 資通訊
  {
    id: 'sys-mobile', domain: 'ict', ordinal: '第一章', nameZh: '次世代行動通訊', nameEn: 'Next-Gen Mobile Communications', landmark: 'antenna',
    summary: S('2024 年全球 5G 連線數已超過 23 億個；國際標準組織 3GPP 於 2025 年 3 月啟動 6G 標準制定，預定 2029 年完成、2030 年商用。', 'mob-overview'),
    whyItMatters: S('2024 年，行政院已將次世代通訊列為「五大信賴產業」之一。', 'mob-trusted'),
    focus: S('精進 5G-Advanced，發展 6G 產業技術與通訊關鍵晶片、低軌衛星地面終端與射頻前端核心技術，以及次太赫茲材料。', 'mob-focus'),
    topics: topics('topics-mob', '緊隨3GPP標準研發行動網路　高質化躍升行動通訊產業', '建立6G新興技術　及AI原生基地台關鍵晶片', '全頻段通訊材料解決方案　迎接寬頻通訊感測融合新應用', '建立自主低軌衛星關鍵技術　加速產業地面設備供應鏈布局'),
    projects: projects('mob-projects', '次世代開放架構行動通訊產業技術躍升計畫／工研院、資策會', '晶片驅動6G通訊產業技術開發計畫／工研院、資策會', '6G產業關鍵技術先期研發計畫／工研院、資策會', '次太赫茲關鍵材料與應用技術開發計畫／工研院', '低軌衛星地面通訊設備射頻前端核心技術開發計畫／工研院', '低軌衛星地面終端通訊系統技術開發計畫／工研院'),
  },
  {
    id: 'ict-ai', domain: 'ict', ordinal: '第二章', landmark: 'datacenter',
    whyItMatters: S('政府建立 AI 應用驗證場域，涵蓋製造、醫療、農業、交通、能源等產業，推動 AI 從研發走向實際商用。', 'ai-field'),
    focus: S('研發重點之一是異質運算架構：整合 CPU、GPU、NPU 與 FPGA，依應用需求靈活分配運算資源，提升效能並降低能耗。', 'ai-hetero'),
    topics: topics('topics-ai', '臺灣智慧系統整合製造平台　發展自主AI系統強化技術實力', '讓AI更懂產業　推動產業轉型創新'),
    projects: projects('ai-projects', '晶片暨系統整合服務平台計畫／工研院', '人工智慧創新服務應用與關鍵技術計畫／工研院、資策會'),
  },
  {
    id: 'ict-hmi', domain: 'ict', ordinal: '第三章', landmark: 'dome',
    whyItMatters: S('未來的人機互動更注重使用者體驗，各種整合虛實的創新應用，將快速擴散到百工百業。', 'hmi-spread'),
    focus: S('開發具突破性的智慧互動介面與次世代感知技術，滿足混合實境（MR）系統的硬體需求。', 'hmi-focus'),
    topics: topics('topics-hmi', '建構產業數位雙生AI關鍵技術　打造虛實整合人機協作平台', 'AI技術助攻　運動科技產業躍升'),
    projects: projects('hmi-projects', '數位雙生關鍵技術研發與驗證／工研院、資策會', '新興運動科技創新技術發展與服務應用研發計畫／工研院、資策會、自行車中心'),
  },

  // ── 機械
  {
    id: 'machine-tool', domain: 'mech', ordinal: '第一章', landmark: 'cnc',
    topics: topics('topics-tool', 'AI助攻精度與應用難題　重塑五軸工具機品級定位', '以數位雙生協作技術　實現工具機低碳智慧製造', '國產工具機升級關鍵　AI智慧零組件與可靠度雙軸驅動', '加工參數最適化推薦　表面品質穩定升級'),
    projects: projects('tool-projects', '五軸工具機空間精度及切削性能提升計畫／工研院', '綠智能工具機關鍵技術開發計畫／工研院', '工具機智慧零組件關鍵技術開發應用暨性能驗證計畫／精機中心', '工具機智動系統強健生產優化關鍵技術開發及環境建構計畫／精機中心'),
  },
  {
    id: 'robot', domain: 'mech', ordinal: '第二章', landmark: 'robotArm',
    topics: topics('topics-robot', '機器人結合AI　智慧製造落地關鍵', '創新晶片驅動精準農業模組　暨智慧農工AI協作技術'),
    projects: projects('robot-projects', '機器人2.0+諧作化智造系統開發及應用計畫／工研院、精機中心', '晶片驅動精準農業之晶片創新與關鍵模組研發計畫／工研院', '農工智慧轉型關鍵協作與示範計畫／工研院'),
  },
  {
    id: 'smart-mfg', domain: 'mech', ordinal: '第三章', landmark: 'factory',
    topics: topics('topics-smfg', 'AI＋生成式AI落地深化　催生智慧工廠應用不再淺談', 'AI模組於金屬製造跨域應用　提升生產效率與永續發展', '以AI建構跨國產線遠距服務　打造強韌製造生態鏈', '推動高階模組應用AI之願景　打造臺灣信賴產業群', '熱處理與表面工程技術升級　推動模具產業低碳化', '開發高速低損耗傳輸線　推動網通應用線纜國產化'),
    projects: projects('smfg-projects', '智慧工廠AI加值與數位系統開發計畫／工研院、紡織所、金屬中心', '自適應人工智慧生產決策技術計畫／資策會、金屬中心', '虛實整合智慧製造產線數位內容生成計畫／工研院、紡織所', '智慧加工模組基礎技術開發計畫／工研院', '超臨界精密元件成型技術開發計畫／工研院', '模具產業鏈減碳暨關鍵技術開發計畫／金屬中心'),
  },

  // ── 運輸
  {
    id: 'trans-ev', domain: 'trans', ordinal: '第一章', nameZh: '智慧車輛', nameEn: 'Smart Vehicles', landmark: 'ev',
    summary: S('智慧與綠能車輛已是各國主要發展目標；我國要加速智慧電動車關鍵零件的自主開發，自主供應並打進國際供應鏈。', 'ev-overview'),
    whyItMatters: S('協助具發展潛力的關鍵系統與零組件廠商，轉型升級為整車廠的 Tier1 供應商。', 'ev-tier1'),
    focus: S('投入智慧載具動力電池、電動車底盤、智慧電動輔助自行車等關鍵技術，目標是進入整車廠供應鏈。', 'ev-focus'),
    topics: topics('topics-ev', '智慧電動車AI技術躍升　開啟全球智慧移動新世代', '建立電動車關鍵系統技術　規劃發展電控新架構整合技術', '最佳化電動車智慧充電　推動AI加值服務升級', '突破電動載具續航極限　關鍵電解質啟動固態電池革命'),
    projects: projects('ev-projects', '智慧車輛關鍵技術與自動駕駛系統開發計畫／車輛中心、工研院、中科院、金屬中心', '低碳車輛與跨域系統節能優化之關鍵技術／工研院、金屬中心、車輛中心', 'AI智慧充電與電能調度技術／工研院、金屬中心、中科院', '電動載具固態電池與模組開發計畫／工研院'),
  },
  {
    id: 'trans-uv', domain: 'trans', ordinal: '第二章', landmark: 'drone',
    description: S('無人載具依運作場域分成陸、空、海三類：陸地有自駕車、自主移動機器人與無人地面載具；天空有無人機與垂直起降載人飛行器；海上有自主航行船舶、無人水面與水下載具。', 'uv-types'),
    whyItMatters: S('政府於 2018 年通過《無人載具科技創新實驗條例》，鼓勵在開放且安全的場域中，試驗無人載具的技術、服務與營運模式。', 'uv-law'),
    topics: topics('topics-uv', '軟體定義無線電(SDR)　建構下世代3D行動通訊', '打造無人機飛行核心　推動整機智慧升級', '中空碳纖複材構件製造創新　加速無人載具產業升級', 'AI領航智慧船舶　海上航行新視界', '讓AI上車　打造臺灣電輔自行車智慧生態圈'),
    projects: projects('uv-projects', '無人機通訊用軟體定義無線電平台開發計畫／工研院', '無人載具中空複材構件開發與驗證計畫／金屬中心', '無人機飛行系統國產自主關鍵技術開發計畫／工研院、金屬中心', '智能船舶輔助航行關鍵技術開發計畫／船舶中心', '智能化電輔自行車整合應用及檢測環境建構計畫／自行車中心'),
  },

  // ── 生醫
  {
    id: 'bio-drug', domain: 'bio', ordinal: '第一章', nameZh: '新藥', nameEn: 'New Drugs', landmark: 'pharma',
    summary: S('新藥是針對特定疾病或患者族群研發的創新藥物，具備治療效益，並能實現精準醫療。', 'drug-overview'),
    whyItMatters: S('一顆新藥從啟動研發到獲准上市，平均要花 10~15 年。', 'drug-years'),
    focus: S('新藥涵蓋小分子藥物、核酸藥物、生物藥品與細胞治療產品；並在研發的各個環節導入智慧科技與數據科學，加速新藥研發。', 'drug-types'),
    topics: topics('topics-drug', 'AI助陣！　強強聯手智慧新藥開發', '加速細胞製劑發展　建立關鍵原料與製程技術', '非侵入式眼滴劑技術　聚焦老年乾式黃斑部病變治療'),
    projects: projects('drug-projects', '核酸藥物關鍵技術引進暨研發建置計畫／生技中心、工研院、資策會、國衛院、藥技中心', '先進核酸藥物及製劑技術開發計畫／生技中心、工研院、資策會', '細胞生物製劑產品與關鍵原料開發驗證計畫／工研院、生技中心、食品所', '建置生醫韌性產業鏈自主關鍵技術開發計畫／工研院、生技中心'),
  },
  {
    id: 'bio-device', domain: 'bio', ordinal: '第二章', nameZh: '醫療器材', nameEn: 'Medical Devices', landmark: 'clinic',
    summary: S('因應高齡化社會的健康照護需求，政府以「精準健康」與「全齡照護」為主軸，推動醫療器材的自主創新與高值化。', 'med-overview'),
    whyItMatters: S('結合穿戴裝置與 AI 平台，推動個人化的預防照護與健康回饋，從醫院延伸到家中。', 'med-home'),
    focus: S('以 AI 為核心，帶動醫材的感測、判讀與治療模式升級；例如以 AI 輔助影像辨識與導航，提升椎間盤與神經系統手術的精準度與即時性。', 'med-ai'),
    topics: topics('topics-med', '智慧醫材引領臨床精準診療', '開發醫材關鍵表面處理技術　加速高值化金屬醫材創新', '晶片驅動生醫創新應用　實踐精準健康產業轉型', '數位療法　推動心理健康創新方法', '突破距離限制　無邊界智慧健康照護'),
    projects: projects('med-projects', '次世代醫療器材關鍵技術開發與應用計畫／金屬中心、工研院', '醫療器材CDMO關鍵製程開發計畫／金屬中心', '生醫晶片前瞻技術及系統開發計畫／工研院、國衛院、金屬中心、塑膠中心、資策會', '全齡健康之創新治療產品開發驗證計畫／工研院、金屬中心、國衛院、紡織所', '銀髮高齡健康科技整合與服務驗證計畫／金屬中心', '高齡照護模式應用與驗證計畫／金屬中心'),
  },
  {
    id: 'bio-food', domain: 'bio', ordinal: '第三章', nameZh: '食品及生物資源', nameEn: 'Food & Bioresources', landmark: 'greenhouse',
    summary: S('食品與生物資源是民生根基：從上游原料、加工、物流到餐飲，關聯國內超過新臺幣 3 兆元的經濟規模。', 'food-overview'),
    whyItMatters: S('食品正呈現新的價值：潔淨成分、風味升級，以及高齡與個人化的精準需求。', 'food-values'),
    focus: S('挖掘各式植物與微生物的產業新價值；並以 AI、機械手臂與系統製程，打造高效、省工、可遠端操控的食品機械與系統服務。', 'food-focus'),
    topics: topics('topics-food', '替代食品　探索未來飲食的可能性', '強化高值生物資源　實踐健康臺灣', '食品智慧製造系統　跨域整合創新', '從傳統到創新　茶香AI智造引領未來市場', '香辛料智慧殺菌　安心食用香氣足'),
    projects: projects('food-projects', '連續式茶香萃取與茶飲製造系統創新計畫／食品所、金屬中心、精機中心、自行車中心', '粉粒體加值應用與電漿殺菌系統創新計畫／食品所', '生物資源之營運優化與加值應用計畫／食品所', '創新食材功能改質與應用技術開發計畫／食品所', '食品智慧製造系統創新應用計畫／食品所'),
  },

  // ── 材化
  {
    id: 'sys-materials', domain: 'mat', ordinal: '第一章', landmark: 'silos',
    summary: S('協助石化、金屬、紡織等材料產業研發綠色材料、推動再生資源高值化，讓產業從線性經濟轉向資源永續的循環經濟。', 'mat-overview'),
    whyItMatters: S('以循環經濟，作為抵禦國際碳關稅與非關稅壁壘的產業升級策略。', 'mat-tariff'),
    focus: S('發展民生物資、航太／國防、綠電等必要且不易取得的關鍵材料，例如高階碳纖與複材、航太與石化設備用的高溫材料。', 'mat-focus'),
    topics: topics('topics-mat', '發動機高溫複合材料與製程技術　提升產業自主能量', '創新金屬廢水吸附材料　引領減廢與循環高值新應用', '綠色回收科技業固態磨料　再生為高價值原物料', '功率半導體封裝材料　氮化矽', '生質循環替代蛋白生產　提高國內產業韌性', '布局航太自主關鍵技術　驅動次世代產業升級', '廢棄資源物再循環　推動金屬產業永續發展'),
    projects: projects('mat-projects', '產業自主特用材料開發及應用計畫／工研院、中科院、紡織所、金屬中心、鞋技中心、印研中心、塑膠中心', '產業減廢與循環高值製程技術開發計畫／工研院、印研中心、中科院', '固態磨料高值循環技術開發計畫／工研院', '先進封裝產業氮化矽循環材料開發計畫／工研院', '金屬產業低碳再生材料暨高值應用開發計畫／金屬中心', '開發生產替代蛋白質之生質材料轉化技術計畫／食品所、工研院', '航太產業關鍵材料及核心製程國產自主整合開發計畫／金屬中心'),
  },
  {
    id: 'mat-textile', domain: 'mat', ordinal: '第二章', nameZh: '紡織科技', nameEn: 'Textile Technology', landmark: 'spools',
    summary: S('目標鎖定高階纖維與紡織品，以「永續化」與「產業AI化」帶動「高階化」的技術升級。', 'tex-overview'),
    whyItMatters: S('結合臺灣在永續與機能紡織品的市場定位，為民生關鍵產業創造新的利基。', 'tex-niche'),
    focus: S('三大核心技術群：高階纖維材料（高強度聚芳酯纖維）、高階紡織布料（菌絲纖維皮革）、高階紡織應用（健身運動紡織品）。', 'tex-focus'),
    topics: topics('topics-tex', '高階纖維跨域技術　開創紡織產業全球藍海競爭力', '高階纖維製品功效性檢驗　把關紡織品品質、穿得更安心！'),
    projects: projects('tex-projects', '高階纖維產業跨域技術躍昇計畫／紡織所、鞋技中心、印研中心、塑膠中心、紡拓會', '高階纖維製品功效性檢驗系統建構計畫／紡織所、鞋技中心、印研中心、塑膠中心'),
  },

  // ── 淨零科技
  {
    id: 'nz-hydrogen', domain: 'nz', ordinal: '第一章', nameZh: '氫能應用', nameEn: 'Hydrogen Applications', landmark: 'hydrogen',
    summary: S('氫能是我國淨零轉型 12 項關鍵戰略之一，將成為重要的減碳燃料，也是去碳電力的重要一環。', 'h2-overview'),
    whyItMatters: S('讓高碳排的工業降低碳排，使我國產業跟上世界淨零排放的趨勢、減少衝擊。', 'h2-industry'),
    focus: S('建立從氫的輸送儲存到燃燒應用的整體方案：解決輸儲金屬材料的氫脆問題，以混氫／純氫燃燒取代部分天然氣；並開發續航力長、補充能量快的氫能載具。', 'h2-focus'),
    topics: topics('topics-h2', '混氫燃燒達成低碳排新里程', '開發車用氫燃料電池與三電系統　車輛載具結合淨零科技'),
    projects: projects('h2-projects', '氫能與低碳燃燒工業應用暨高壓氫輸儲關鍵技術開發計畫／金屬中心、工研院', '氫能移動載具之燃料電池系統開發計畫／工研院、金屬中心、車輛中心'),
  },
  {
    id: 'nz-decarb', domain: 'nz', ordinal: '第二章', nameZh: '產業減碳技術', nameEn: 'Industrial Decarbonisation', landmark: 'turbines',
    summary: S('2023 年我國溫室氣體總排放量為 2.79 億公噸二氧化碳當量，其中能源部門占 90.7%，工業製程及產品使用部門占 7.2%。', 'dc-emissions'),
    whyItMatters: S('國際供應鏈要求低碳材料；以回收再利用生產的「低碳材料」，是我國廠商維持競爭力的重要技術。', 'dc-materials'),
    focus: S('透過 11 項法人科專，開發半導體、電子、石化、鋼鐵、金屬、紡織等產業的減碳技術，降低製程排碳，並供應廠商所需的低碳材料。', 'dc-focus'),
    topics: topics('topics-dc', '協助半導體產業邁向淨零轉型', 'AI驅動高值低碳材料創新　領航電子產業邁向淨零未來', '節能與智慧並進　探索AI文生圖節能晶片新架構', 'AI引領淨零時代　促進臺灣PCB供應鏈減碳升級', '開發低碳電子結構簡化技術　加速車用面板之低碳轉型', 'AI技術強化化工生產　促進智慧化轉型', '鋼鐵塑型製程設備效能升級　提升減碳效益', '鋁切屑循環再生　推動鋁加工產業淨零減碳', '回收紡織品重塑再生　兼顧減碳與價值創造', '低成本電解製氫技術　加速產業淨零減碳升級發展', '稀土金屬握在手　高效馬達任我走'),
    projects: projects('dc-projects', '半導體產業低碳製造技術計畫／工研院、金屬中心', '輕量化運算半導體節能晶片設計技術計畫／工研院', '半導體低碳製程與創新電子材料低碳設計技術計畫／工研院', '石化產業鏈淨零碳排創新材料及製程技術計畫／工研院', '鋁加工產業低碳再生暨應用技術開發／金屬中心、自行車中心、工研院', '鋼鐵產業低碳排反應與製程技術開發計畫／工研院', '綠色電子感知與高密度基板低碳製程技術計畫／工研院、資策會', '低碳電子結構簡化模組材料與製程技術計畫／工研院', '永續性紡織品產業鏈減碳技術開發計畫／紡織所', '碳循環關鍵技術開發計畫／工研院', '釹／鏑稀土原料自主化關鍵技術與應用開發計畫／工研院'),
  },
];
