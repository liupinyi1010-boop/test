/* 師傅說 ShifuSay — 語音直出估價單 */
(function () {
  "use strict";

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const fmt = (n) => Math.round(Number(n) || 0).toLocaleString("zh-TW");
  const money = (n) => "NT$ " + fmt(n);
  const uid = () => "r" + Math.random().toString(36).slice(2, 9);
  const TAX_RATE = 0.05;
  const BRAND_ZH = "師傅說";
  const TRADES = ["carpentry", "plumbing_electrical", "painting"];
  const EXTRA_ALIASES = [
    { spoken: ["米知", "米突", "米吐", "米嘟"], standard: "公尺", code: null, note: "長度單位 m" },
    { spoken: ["紅毛土", "紅毛塗"], standard: "水泥", code: null, note: "台語 âng-mn̂g-thôo" }
  ];
  const UNITS = ["平方公尺", "公尺", "公分", "公釐", "台尺", "坪", "尺", "呎", "寸", "分", "處", "口", "迴", "盞", "顆", "座", "樘", "式", "工", "個", "組", "只", "台", "屋", "米知", "米突", "米"];
  const CN_D = { "零": 0, "〇": 0, "一": 1, "二": 2, "兩": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9 };
  const NUM = "([0-9]+(?:\\.[0-9]+)?|[零〇一二兩三四五六七八九十百千萬點]+)";
  const DIG = "([0-9]|[一二兩三四五六七八九])";
  const NOT_AFTER = "(?![0-9零〇一二兩三四五六七八九十百個組盞樘處只座口坪米公顆條])";
  const RE_CHI = new RegExp(`${NUM}台?尺${DIG}寸?(?:${DIG}分)?${NOT_AFTER}`, "g");
  const RE_CUN = new RegExp(`${NUM}寸(?:${DIG}分)?`, "g");
  const RE_FOOT = new RegExp(`${NUM}台?尺(?!${DIG}|半|寸)`, "g");
  const RE_HALF = new RegExp(`${NUM}台?尺半`, "g");
  const META_FIELDS = [
    { k: "customer", label: "客戶名稱", type: "text", placeholder: "例如 王先生" },
    { k: "phone", label: "電話", type: "text", placeholder: "例如 0912-345-678", inputmode: "tel" },
    { k: "address", label: "地址", type: "text", placeholder: "例如 高雄市左營區…" },
    { k: "region", label: "區域", type: "select", options: ["", "都會", "偏遠"] },
    { k: "building", label: "建築形式", type: "select", options: ["", "公寓", "大樓", "透天", "廠辦", "其他"] },
    { k: "floor", label: "樓層", type: "text", placeholder: "例如 5樓", inputmode: "numeric" }
  ];

  const RULES = [
    { re: /平釘.{0,6}天花|平頂.{0,6}天花|平釘天花板/, code: "W-101" },
    { re: /造型.{0,6}天花/, code: "W-102" },
    { re: /流明.{0,6}天花/, code: "W-103" },
    { re: /燈溝|間接照明/, code: "W-104" },
    { re: /窗簾盒/, code: "W-105" },
    { re: /維修孔/, code: "W-106" },
    { re: /木作隔間|木作輕隔間|輕隔間/, code: "W-201" },
    { re: /木作衣櫃|衣櫃/, code: "W-305" },
    { re: /吊櫃/, code: "W-304" },
    { re: /展示櫃|書櫃/, code: "W-307" },
    { re: /矮櫃|電視櫃/, code: "W-303" },
    { re: /鞋櫃/, code: "W-306" },
    { re: /高櫃/, code: "W-301" },
    { re: /系統衣櫃/, code: "W-401" },
    { re: /木作房門|房門/, code: "W-501" },
    { re: /拉門|穀倉門/, code: "W-503" },
    { re: /踢腳/, code: "W-703" },
    { re: /超耐磨/, code: "W-601" },
    { re: /海島型/, code: "W-602" },
    { re: /三底五度/, code: "A-103" },
    { re: /一底二度/, code: "A-101" },
    { re: /二底三度|乳膠漆/, code: "A-102" },
    { re: /天花板.{0,6}乳膠|乳膠.{0,6}天花/, code: "A-105" },
    { re: /全面批土|全批土/, code: "A-104" },
    { re: /跳色/, code: "A-108" },
    { re: /壁癌/, code: "A-404" },
    { re: /油漆保護|保護工程/, code: "A-001" },
    { re: /220\s*V\s*迴路|220\s*V|220伏特|冷氣迴路|專用迴路/, code: "E-005" },
    { re: /110\s*V|110伏特|新增迴路/, code: "E-003" },
    { re: /延伸.{0,6}插座|新增插座|加插座/, code: "E-002" },
    { re: /插座.{0,4}更換|開關面板/, code: "E-001" },
    { re: /配電箱/, code: "E-006" },
    { re: /漏電/, code: "E-007" },
    { re: /嵌燈/, code: "E-009" },
    { re: /燈具安裝|裝燈/, code: "E-008" },
    { re: /全室電線重拉|重拉電線/, code: "E-013" },
    { re: /馬桶/, code: "P-005" },
    { re: /面盆|浴櫃安裝/, code: "P-006" },
    { re: /水龍頭/, code: "P-007" },
    { re: /熱水器/, code: "P-008" },
    { re: /排水管/, code: "P-003" },
    { re: /熱水.{0,4}給水|熱水管/, code: "P-002" },
    { re: /冷水.{0,4}給水|給水管/, code: "P-001" },
    { re: /設備移位/, code: "P-004" },
    { re: /全室水電/, code: "P-011" },
    { re: /打牆|打壁|敲牆|開槽|鑿壁/, code: "P-013" }
  ];

  const state = {
    catalog: {},
    terms: { terms: [] },
    ready: false,
    raw: "",
    rawOriginal: "",
    correctionHits: [],
    corrections: [],
    normalized: "",
    hits: [],
    items: [],
    tax: true,
    source: "idle",
    meta: { customer: "", phone: "", address: "", region: "", building: "", floor: "" },
    show: { customer: false, phone: false, address: false, region: false, building: false, floor: false },
    rewritten: "",
    rec: null,
    aiHandler: null,
    speechCtorOverride: undefined
  };
  let TERM_MAP = null, TERM_RE = null;
  const DEFAULT_USER_CORRECTIONS = [
    { from: "瓶數", to: "坪數", priority: 1, note: "使用者確認" },
    { from: "全是", to: "全室", priority: 2, note: "使用者確認" },
    { from: "平定天花", to: "平釘天花", priority: 3, note: "使用者確認" },
    { from: "平町天花", to: "平釘天花", priority: 3, note: "使用者確認" },
    { from: "平頂天花", to: "平釘天花", priority: 3, note: "使用者確認" },
    { from: "瓶釘天花", to: "平釘天花", priority: 3, note: "使用者確認" },
    { from: "平訂天花", to: "平釘天花", priority: 3, note: "使用者確認" },
    { from: "平丁天花", to: "平釘天花", priority: 3, note: "使用者確認" },
    { from: "系統高貴", to: "系統高櫃", priority: 4, note: "使用者確認" },
    { from: "回路", to: "迴路", priority: 5, note: "使用者確認" }
  ];
  function correctionList() {
    const list = (state.corrections && state.corrections.length) ? state.corrections : DEFAULT_USER_CORRECTIONS;
    return list
      .filter((c) => c && String(c.from || "").trim() && String(c.to || "").trim() && String(c.from) !== String(c.to))
      .slice()
      .sort((a, b) => String(b.from).length - String(a.from).length || (Number(a.priority) || 0) - (Number(b.priority) || 0));
  }
  function applyUserCorrections(text) {
    const src = String(text || "");
    const rules = correctionList();
    const hits = [];
    if (!src || !rules.length) return { text: src, hits };
    const map = new Map();
    const keys = [];
    for (const c of rules) {
      const fr = String(c.from);
      if (map.has(fr)) continue;
      map.set(fr, c);
      keys.push(fr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    }
    const re = new RegExp(keys.join("|"), "g");
    const out = src.replace(re, (m) => {
      const c = map.get(m);
      if (!c) return m;
      const to = String(c.to);
      if (m === to) return m;
      hits.push({ from: m, to: to });
      return to;
    });
    return { text: out, hits };
  }
  function formatCorrectionRules() {
    return correctionList().map((c) => String(c.from) + " → " + String(c.to)).join("\n");
  }
  const CEILING_TYPO_RE = /瓶釘天花|平(?:定|頂|町|訂|丁|挺|廳|釘)?天花/g;
  function fixCeilingTerms(text) {
    let s = String(text || "");
    s = s.replace(CEILING_TYPO_RE, "平釘天花");
    s = s.replace(/平[\u4e00-\u9fff]{0,2}釘[\u4e00-\u9fff]{0,2}天花/g, "平釘天花");
    s = s.replace(/(?:需|要)?安釘了?天花/g, "平釘天花");
    s = s.replace(/釘了天花/g, "平釘天花");
    return s;
  }
  function fixAsrTradeTerms(text) {
    let s = String(text || "");
    // 坎／崁 是嵌燈的常見聽寫；呎在數字後當作尺；參邊櫃近音為側邊櫃（裝修口頭常見，不是修邊櫃）
    s = s.replace(/[坎崁]燈/g, "嵌燈");
    s = s.replace(/[參参]邊櫃/g, "側邊櫃");
    s = s.replace(/([0-9]+(?:\.[0-9]+)?|[零〇一二兩三四五六七八九十百千萬]+)\s*呎/g, "$1尺");
    return s;
  }
  function fixPingUnit(text) {
    let s = String(text || "");
    const num = "([0-9]+(?:\\.[0-9]+)?|[零〇一二兩三四五六七八九十百千萬]+)";
    s = s.replace(new RegExp(num + "\\s*瓶(?![子裝蓋罐口])", "g"), function (_, n) { return n + "坪"; });
    s = s.replace(/瓶數/g, "坪數");
    return s;
  }
  const CN_NUM_TOKEN = "[零〇一二兩三四五六七八九十百千萬點]+";
  function arabicizeSpeechNumbers(text) {
    let s = String(text || "");
    const unitPat = UNITS.slice().sort(function (a, b) { return b.length - a.length; })
      .map(function (u) { return u.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }).join("|");
    const afterUnit = new RegExp("((?:每|一|1)\\s*(?:" + unitPat + ")\\s*)(" + CN_NUM_TOKEN + ")", "g");
    s = s.replace(afterUnit, function (m, pre, n) {
      const v = parseNumber(n);
      return v != null && v >= 100 ? (pre + fmtChi(v)) : m;
    });
    const priceRe = new RegExp("(" + CN_NUM_TOKEN + ")(?=\\s*(?:元|塊錢|塊))", "g");
    s = s.replace(priceRe, function (m) {
      const v = parseNumber(m);
      return v != null && v >= 100 ? fmtChi(v) : m;
    });
    const unitRe = new RegExp("(" + CN_NUM_TOKEN + "|[0-9]+(?:\\.[0-9]+)?)\\s*(" + unitPat + ")", "g");
    s = s.replace(unitRe, function (m, n, u, offset) {
      const after = s.slice(offset + m.length, offset + m.length + 16);
      const rest = after.match(/^\s*([0-9]+(?:\.[0-9]+)?|[零〇一二兩三四五六七八九十百千萬點]+)/);
      if (rest && parseNumber(rest[1]) >= 100 && /^(一|1|每)$/.test(String(n))) return m;
      if (/^[0-9]+(?:\.[0-9]+)?$/.test(n)) {
        return fmtChi(parseFloat(n)) + " " + u;
      }
      const v = parseNumber(n);
      return v != null ? (fmtChi(v) + " " + u) : m;
    });
    return s;
  }
  const L1_TERMS = [
    "平釘天花", "平釘天花板", "嵌燈", "側邊櫃", "跳色", "系統高櫃", "系統櫃", "迴路",
    "窗簾盒", "木作隔間", "木作輕隔間", "輕隔間", "水電打牆", "全室油漆", "乳膠漆",
    "新增插座", "插座", "踢腳", "天花嵌燈", "全室水電", "全室電線重拉"
  ];
  function l1TermList() {
    const extras = correctionList().map((c) => String(c.to || "").trim()).filter(Boolean);
    const all = L1_TERMS.concat(extras, ["坪", "尺", "組", "迴", "口", "盞", "顆"]);
    const seen = new Set();
    const out = [];
    all.forEach((w) => {
      if (w && !seen.has(w)) { seen.add(w); out.push(w); }
    });
    return out.sort((a, b) => b.length - a.length);
  }
  function collectLockedSpans(text, extraPhrases) {
    const src = String(text || "");
    const phrases = (extraPhrases || []).concat(l1TermList());
    const spans = [];
    const used = [];
    phrases.forEach((ph) => {
      const p = String(ph || "").trim();
      if (p.length < 2) return;
      let from = 0;
      while (from < src.length) {
        const at = src.indexOf(p, from);
        if (at < 0) break;
        const end = at + p.length;
        if (!used.some((u) => !(end <= u.start || at >= u.end))) {
          spans.push({ start: at, end: end, text: p });
          used.push({ start: at, end: end });
        }
        from = at + p.length;
      }
    });
    spans.sort((a, b) => a.start - b.start);
    return spans;
  }
  function spanLocked(spans, start, end) {
    return (spans || []).some((sp) => !(end <= sp.start || start >= sp.end));
  }
  function applySpeechCorrections(text) {
    // L0 使用者校正（最長優先）＞ L1 工程標準詞與單位 ＞ L3 數字／單位。L2 台語同音在 normalizeAnswer。
    const user = applyUserCorrections(text);
    let s = user.text;
    const hits = user.hits.slice();
    const afterCeil = fixCeilingTerms(s);
    if (afterCeil !== s) {
      hits.push({ from: s, to: afterCeil, rule: "ceiling" });
      s = afterCeil;
    }
    const afterPing = fixPingUnit(s);
    if (afterPing !== s) {
      hits.push({ from: s, to: afterPing, rule: "ping" });
      s = afterPing;
    }
    const afterAsr = fixAsrTradeTerms(s);
    if (afterAsr !== s) {
      hits.push({ from: s, to: afterAsr, rule: "asr-trade" });
      s = afterAsr;
    }
    const afterNum = arabicizeSpeechNumbers(s);
    if (afterNum !== s) {
      hits.push({ from: s, to: afterNum, rule: "numeral" });
      s = afterNum;
    }
    const spaced = s.replace(/([一-龥])(\d)/g, "$1 $2");
    if (spaced !== s) s = spaced;
    return { text: s, hits, locked: collectLockedSpans(s, hits.map((h) => String(h.to || "")).filter(Boolean)) };
  }
  function preferredVocabulary(hits) {
    const words = ["平釘天花", "坪", "全室", "系統高櫃", "迴路", "水泥", "公尺"];
    const seen = new Set(words);
    correctionList().forEach(function (c) {
      const to = String(c.to || "").trim();
      if (to && !seen.has(to)) { seen.add(to); words.push(to); }
    });
    (hits || []).forEach(function (h) {
      const to = String(h.to || "").trim();
      if (to && to.length <= 12 && !seen.has(to)) { seen.add(to); words.push(to); }
    });
    return words;
  }
  const PRICE_UNITS = "坪|尺|組|式|米|公尺|口|迴|個|盞|處|樘|工|台|只|座|屋";
  const PRICE_NUM = "([0-9]{1,7}(?:,[0-9]{3})*(?:\\.[0-9]+)?|[零〇一二兩三四五六七八九十百千萬點]+)";
  function looksLikePhoneOrVoltage(text, index, raw) {
    const ctx = String(text || "").slice(Math.max(0, index - 10), index + String(raw || "").length + 10);
    const compact = String(raw || "").replace(/[,\s]/g, "");
    if (/09\d{2}/.test(ctx) || /(?:聯絡|連絡)?(?:電話|市話)/.test(ctx)) return true;
    if (/^0\d{6,}$/.test(compact)) return true;
    if (/(?:220|110)\s*(?:V|v|伏特|伏)|伏特|專用迴路/.test(ctx)) return true;
    const n = parseNumber(compact);
    if (n === 110 || n === 220) return true;
    if (/[路街巷弄號]/.test(ctx) && n != null && n < 10000) return true;
    return false;
  }
  function extractSpokenPrices(text) {
    const src = String(text || "");
    const hits = [];
    function add(index, unitPrice, unit, kind, raw, amount) {
      if (looksLikePhoneOrVoltage(src, index, raw)) return;
      const p = Number(unitPrice) || 0;
      const a = Number(amount) || 0;
      if (kind === "unit") {
        if (!(p >= 100 && p <= 1000000)) return;
      } else if (kind === "total") {
        if (!(a >= 100 && a <= 10000000)) return;
      } else return;
      hits.push({ index: index, unitPrice: p || 0, unit: unit || "", kind: kind, raw: raw, amount: a || 0 });
    }
    const rePer = new RegExp("(?:每|一|1)\\s*(" + PRICE_UNITS + ")\\s*(?:單價\\s*)?" + PRICE_NUM + "\\s*(?:元|塊錢|塊)?", "g");
    const reDan = new RegExp("單價\\s*" + PRICE_NUM + "\\s*(?:元|塊錢|塊)?", "g");
    const rePost = new RegExp(PRICE_NUM + "\\s*(?:元|塊錢|塊)?\\s*(?:一|每|/|1)\\s*(" + PRICE_UNITS + ")", "g");
    const reItemTotal = new RegExp("(?:這項|這一項|這個項目|該項|這筆)(?:的)?(?:金額|價錢|價格|單價)?(?:是|為)?(?:總共|一共|合計|總價|小計)?\\s*" + PRICE_NUM + "\\s*(?:元|塊錢|塊)?", "g");
    const reAfterNameTotal = new RegExp("(?:總共|一共|總價)\\s*" + PRICE_NUM + "\\s*(?:元|塊錢|塊)?", "g");
    let m;
    rePer.lastIndex = 0;
    while ((m = rePer.exec(src))) {
      add(m.index, parseNumber(m[2]), m[1], "unit", m[0], 0);
    }
    reDan.lastIndex = 0;
    while ((m = reDan.exec(src))) {
      add(m.index, parseNumber(m[1]), "", "unit", m[0], 0);
    }
    rePost.lastIndex = 0;
    while ((m = rePost.exec(src))) {
      add(m.index, parseNumber(m[1]), m[2], "unit", m[0], 0);
    }
    reItemTotal.lastIndex = 0;
    while ((m = reItemTotal.exec(src))) {
      add(m.index, 0, "", "total", m[0], parseNumber(m[1]));
    }
    reAfterNameTotal.lastIndex = 0;
    while ((m = reAfterNameTotal.exec(src))) {
      if (hits.some(function (h) { return h.kind === "total" && Math.abs(h.index - m.index) < 8; })) continue;
      const before = src.slice(Math.max(0, m.index - 24), m.index);
      if (/平釘|天花|迴路|乳膠|隔間|衣櫃|櫃|漆|水泥|打牆|開槽|踢腳|插座|燈/.test(before)) {
        add(m.index, 0, "", "total", m[0], parseNumber(m[1]));
      }
    }
    hits.sort(function (a, b) { return a.index - b.index; });
    return hits;
  }
  function itemTextIndex(text, row) {
    const src = String(text || "");
    const keys = [];
    const name = String((row && row.name) || "").replace(/[（(].*$/, "").trim();
    if (name) {
      keys.push(name);
      if (name.length >= 4) keys.push(name.slice(0, 4));
    }
    if (row && row.code === "W-101") keys.push("平釘天花", "平釘天花板", "平釘");
    if (row && row.code === "P-013") keys.push("打牆", "開槽");
    if (row && row.code === "A-102") keys.push("全室油漆", "乳膠漆", "油漆");
    if (row && row.code === "A-108") keys.push("跳色");
    if (row && (row.code === "E-001" || row.code === "E-002")) keys.push("新增插座", "加插座", "插座");
    if (row && row.code === "E-009") keys.push("天花嵌燈", "嵌燈");
    if (row && row.name) {
      ["側邊櫃", "窗簾盒", "木作隔間", "系統高櫃", "迴路"].forEach((k) => {
        if (String(row.name).indexOf(k) >= 0 || String(row.note || "").indexOf(k) >= 0) keys.push(k);
      });
    }
    let best = -1;
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (!k) continue;
      const at = src.indexOf(k);
      if (at >= 0 && (best < 0 || at < best)) best = at;
    }
    return best;
  }
  function attachSpokenPrices(items, text) {
    const list = Array.isArray(items) ? items : [];
    const prices = extractSpokenPrices(text);
    if (!list.length || !prices.length) return list;
    const positions = list.map(function (row) { return itemTextIndex(text, row); });
    list.forEach(function (row, i) {
      const start = positions[i];
      let end = String(text || "").length;
      for (let j = 0; j < positions.length; j++) {
        if (j !== i && positions[j] > (start < 0 ? -1 : start) && positions[j] < end) end = positions[j];
      }
      const cand = prices.filter(function (p) {
        if (list.length === 1) return true;
        if (start < 0) return list.length === 1;
        return p.index >= start && p.index < end + 2;
      });
      if (!cand.length) return;
      const unitHit = cand.find(function (p) {
        return p.kind === "unit" && (!p.unit || !row.unit || unitCanon(p.unit) === unitCanon(row.unit));
      }) || cand.find(function (p) { return p.kind === "unit"; });
      if (unitHit && unitHit.unitPrice > 0) {
        row.unitPrice = unitHit.unitPrice;
        row.spokenPrice = true;
        row.pending = false;
        if (!row.note) row.note = "口述單價";
        return;
      }
      const tot = cand.find(function (p) { return p.kind === "total" && p.amount > 0; });
      const q = Number(row.qty) || 0;
      if (tot && q > 0) {
        row.unitPrice = Math.round(tot.amount / q);
        row.spokenPrice = true;
        row.pending = false;
        if (!row.note) row.note = "口述單價";
      }
    });
    return list;
  }
  const STORE_KEY = "maye-quote-state-v3";
  const PREFS_KEY = "maye-ui-prefs";
  function systemTheme() {
    return "dark";
  }
  function readPrefs() {
    try {
      const p = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
      return {
        theme: "dark",
        font: (p.font === "s" || p.font === "m" || p.font === "l") ? p.font : "m",
        themeLocked: true
      };
    } catch (e) {
      return { theme: "dark", font: "m", themeLocked: true };
    }
  }
  function applyUiPrefs(next, opts) {
    opts = opts || {};
    const cur = readPrefs();
    const theme = "dark";
    const font = (next && (next.font === "s" || next.font === "m" || next.font === "l")) ? next.font : cur.font;
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.setAttribute("data-font", font);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", "#0B0D10");
    document.querySelectorAll("[data-font]").forEach((el) => {
      el.setAttribute("aria-pressed", el.getAttribute("data-font") === font ? "true" : "false");
    });
    if (opts.save) {
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify({ font, theme: "dark" }));
      } catch (e) {}
    }
    scheduleFitBrand();
    return { theme, font, themeLocked: true };
  }
  function scheduleFitBrand() {
    if (scheduleFitBrand._t) cancelAnimationFrame(scheduleFitBrand._t);
    scheduleFitBrand._t = requestAnimationFrame(function () {
      scheduleFitBrand._t = 0;
      fitBrandAndWordmark();
    });
  }
  function textInkRect(el) {
    const empty = { left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 };
    if (!el) return empty;
    const nodes = [];
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    let n;
    while ((n = walk.nextNode())) {
      if (n.nodeValue && n.nodeValue.length) nodes.push(n);
    }
    if (!nodes.length) {
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
    }
    const range = document.createRange();
    let top = Infinity, bottom = -Infinity;
    nodes.forEach((node) => {
      range.selectNodeContents(node);
      const r = range.getBoundingClientRect();
      if (r.height || r.width) {
        if (r.top < top) top = r.top;
        if (r.bottom > bottom) bottom = r.bottom;
      }
    });
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const lastLen = last.nodeValue.length;
    const firstLen = first.nodeValue.length;
    range.setStart(first, 0);
    range.setEnd(first, Math.min(1, firstLen));
    const firstR = range.getBoundingClientRect();
    range.setStart(last, Math.max(0, lastLen - 1));
    range.setEnd(last, lastLen);
    const lastR = range.getBoundingClientRect();
    const left = firstR.width || firstR.height ? firstR.left : 0;
    const right = lastR.width || lastR.height ? lastR.right : left;
    if (!isFinite(top)) {
      top = Math.min(firstR.top, lastR.top);
      bottom = Math.max(firstR.bottom, lastR.bottom);
    }
    return { left, right, top, bottom, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
  }

  function titleGlyphInk(title) {
    const textInk = textInkRect(title);
    const fallback = function () {
      const fs = parseFloat(getComputedStyle(title).fontSize) || 0;
      const box = title.getBoundingClientRect();
      const height = fs ? fs * 0.9 : textInk.height;
      const top = box.top + Math.max(0, (box.height - height) / 2);
      return { left: textInk.left, right: textInk.right, width: textInk.width, top, bottom: top + height, height };
    };
    try {
      const cs = getComputedStyle(title);
      const text = String(title.textContent || "").trim() || "估";
      const ctx = document.createElement("canvas").getContext("2d");
      ctx.font = cs.fontStyle + " " + cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily;
      const m = ctx.measureText(text);
      if (m.actualBoundingBoxAscent == null || m.fontBoundingBoxAscent == null) return fallback();
      const nodes = [];
      const walk = document.createTreeWalker(title, NodeFilter.SHOW_TEXT, null);
      let n;
      while ((n = walk.nextNode())) {
        if (n.nodeValue && n.nodeValue.length) nodes.push(n);
      }
      if (!nodes.length) return fallback();
      const range = document.createRange();
      range.setStart(nodes[0], 0);
      range.setEnd(nodes[0], Math.min(1, nodes[0].nodeValue.length));
      const r = range.getBoundingClientRect();
      const baseline = r.top + m.fontBoundingBoxAscent;
      const top = baseline - m.actualBoundingBoxAscent;
      const bottom = baseline + m.actualBoundingBoxDescent;
      const height = bottom - top;
      if (!(height > 2)) return fallback();
      return { left: textInk.left, right: textInk.right, width: textInk.width, top, bottom, height };
    } catch (e) {
      return fallback();
    }
  }
  function visibleMarkImg(mark) {
    if (!mark) return null;
    const imgs = mark.querySelectorAll("img");
    for (let i = 0; i < imgs.length; i++) {
      const cs = getComputedStyle(imgs[i]);
      if (cs.display !== "none" && cs.visibility !== "hidden") return imgs[i];
    }
    return imgs[0] || null;
  }
  function fitWordmarkToTitle(wm, title) {
    wm.style.letterSpacing = "0px";
    wm.style.marginRight = "0px";
    if (wm.dataset.fitFs) {
      wm.style.fontSize = "";
      delete wm.dataset.fitFs;
    }
    const target = textInkRect(title).width;
    if (!(target > 8)) return;
    const widthAt = function (sp) {
      wm.style.letterSpacing = sp + "px";
      return textInkRect(wm).width;
    };
    function applySpacing() {
      let current = widthAt(0);
      if (current >= target - 0.5 && current <= target * 1.03) {
        wm.style.letterSpacing = "0px";
        return current;
      }
      if (current < target - 0.5) {
        let lo = 0, hi = 2;
        while (widthAt(hi) < target && hi < 24) hi *= 2;
        hi = Math.min(hi, 24);
        for (let i = 0; i < 20; i++) {
          const mid = (lo + hi) / 2;
          if (widthAt(mid) < target) lo = mid;
          else hi = mid;
        }
        const sp = (lo + hi) / 2;
        wm.style.letterSpacing = sp + "px";
        return textInkRect(wm).width;
      }
      return current;
    }
    let finalW = applySpacing();
    if (target && Math.abs(finalW - target) / target > 0.03) {
      const fs = parseFloat(getComputedStyle(wm).fontSize) || 16;
      const root = parseFloat(getComputedStyle(document.documentElement).fontSize) || 20;
      const minFs = 0.7 * root;
      const maxFs = 1.05 * root;
      const scale = target / Math.max(finalW, 1);
      const next = Math.min(maxFs, Math.max(minFs, fs * scale));
      if (Math.abs(next - fs) > 0.2) {
        wm.style.fontSize = next + "px";
        wm.dataset.fitFs = "1";
        finalW = applySpacing();
      }
    }
    const ink = textInkRect(wm);
    const box = wm.getBoundingClientRect();
    const overhang = box.right - ink.right;
    wm.style.marginRight = overhang > 0.25 ? (-overhang) + "px" : "0px";
  }
  function fitBrandAndWordmark() {
    document.querySelectorAll(".brand, .quote-modal-brand").forEach((row) => {
      const mark = row.querySelector(".brand-mark");
      const title = row.querySelector("h1, h2");
      const wm = row.querySelector(".wordmark");
      if (mark && title) {
        const ink = titleGlyphInk(title);
        if (ink.height > 2) {
          const img = visibleMarkImg(mark);
          let aspect = 434 / 512;
          if (img && img.naturalWidth && img.naturalHeight) {
            aspect = img.naturalWidth / img.naturalHeight;
          }
          const h = Math.round(ink.height * 1000) / 1000;
          const w = Math.round(h * aspect * 1000) / 1000;
          mark.style.width = w + "px";
          mark.style.height = h + "px";
          mark.style.flexBasis = w + "px";
          const titleBox = title.getBoundingClientRect();
          const padTop = ink.top - titleBox.top;
          mark.style.marginTop = (Math.round(padTop * 1000) / 1000) + "px";
        }
      }
      if (title && wm) fitWordmarkToTitle(wm, title);
    });
  }
  function toggleTheme() {
    const font = document.documentElement.getAttribute("data-font") || "m";
    applyUiPrefs({ theme: "dark", font }, { save: true });
  }
  function setFontSize(font) {
    applyUiPrefs({ theme: "dark", font }, { save: true });
  }
  function isQuoteModalOpen() {
    const el = $("#quote-modal");
    return !!(el && !el.hidden);
  }
  function isDownloadModalOpen() {
    const el = $("#modal");
    return !!(el && !el.hidden);
  }
  function syncBodyLock() {
    document.body.classList.toggle("modal-open", isDownloadModalOpen() || isQuoteModalOpen());
  }
  let persistTimer = null;
  let sessionBackup = null;
  let modalMode = null;
  let recTimerId = null;
  let recTimerStart = 0;

  function emptyMeta() {
    const m = {};
    META_FIELDS.forEach((f) => { m[f.k] = ""; });
    return m;
  }
  function emptyShow() {
    const m = {};
    META_FIELDS.forEach((f) => { m[f.k] = false; });
    return m;
  }
  function snapshotData() {
    return {
      v: 3,
      raw: state.raw,
      rawOriginal: state.rawOriginal,
      correctionHits: Array.isArray(state.correctionHits) ? state.correctionHits.slice() : [],
      normalized: state.normalized,
      hits: Array.isArray(state.hits) ? state.hits.slice() : [],
      items: (state.items || []).map((r) => Object.assign({}, r)),
      tax: !!state.tax,
      source: state.source,
      meta: Object.assign({}, state.meta),
      show: Object.assign({}, state.show),
      rewritten: state.rewritten,
      speech: ($("#speech") && $("#speech").value) || state.raw || "",
      savedAt: Date.now()
    };
  }
  function persist() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(snapshotData()));
    } catch (e) {}
  }
  function persistSoon() {
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => { persistTimer = null; persist(); }, 250);
  }
  function applySnapshot(d, opts) {
    if (!d) return false;
    if (typeof d.raw === "string") state.raw = d.raw;
    if (typeof d.rawOriginal === "string") state.rawOriginal = d.rawOriginal;
    else if (typeof d.raw === "string" && !state.rawOriginal) state.rawOriginal = d.raw;
    if (Array.isArray(d.correctionHits)) state.correctionHits = d.correctionHits;
    if (typeof d.normalized === "string") state.normalized = d.normalized;
    if (Array.isArray(d.hits)) state.hits = d.hits;
    if (Array.isArray(d.items)) state.items = d.items.map((r) => Object.assign({}, r));
    if (d.tax != null) state.tax = !!d.tax;
    if (typeof d.source === "string") state.source = d.source;
    if (typeof d.rewritten === "string") state.rewritten = d.rewritten;
    const meta = emptyMeta();
    if (d.meta && typeof d.meta === "object") {
      for (const f of META_FIELDS) {
        if (d.meta[f.k] != null) meta[f.k] = String(d.meta[f.k]);
      }
    }
    state.meta = meta;
    const show = emptyShow();
    if (d.show && typeof d.show === "object") {
      for (const f of META_FIELDS) {
        if (d.show[f.k] != null) show[f.k] = !!d.show[f.k];
      }
    }
    state.show = show;
    const ta = $("#speech");
    if (ta) ta.value = (typeof d.speech === "string" ? d.speech : null) || d.raw || ta.value || "";
    const has = !!(state.items.length || state.raw || (ta && ta.value.trim()));
    const q = $("#quote");
    if (q) q.classList.toggle("on", !!(state.items.length || state.raw));
    if (!opts || !opts.silent) renderQuote();
    return has;
  }
  function restoreState() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return false;
      const d = JSON.parse(raw);
      if (!d || (d.v !== 3 && d.v !== "3")) return false;
      return applySnapshot(d);
    } catch (e) {
      return false;
    }
  }
  function hasSessionData() {
    const ta = $("#speech");
    return !!(state.items.length || state.raw || (ta && String(ta.value || "").trim()));
  }
  function clearSession(opts) {
    opts = opts || {};
    state.raw = "";
    state.rawOriginal = "";
    state.correctionHits = [];
    state.normalized = "";
    state.hits = [];
    state.items = [];
    state.tax = true;
    state.source = "idle";
    state.rewritten = "";
    state.meta = emptyMeta();
    state.show = emptyShow();
    const ta = $("#speech");
    if (ta) ta.value = "";
    const q = $("#quote");
    if (q) q.classList.remove("on");
    closeQuoteModal();
    renderQuote();
    renderMeta();
    const tax = $("#tax");
    if (tax) tax.checked = true;
    if (!opts.keepStore) {
      try { localStorage.removeItem(STORE_KEY); } catch (e) {}
    }
    setExportStatus("");
  }

  function digitsOnly(s) {
    return String(s || "").replace(/\D/g, "");
  }
  function compactText(s) {
    return String(s || "").replace(/\s+/g, "");
  }
  function speechHaystack(text) {
    return compactText(String(text || "").normalize("NFKC").replace(/臺/g, "台"));
  }
  function mentionedInSpeech(value, spoken) {
    const v = String(value || "").trim();
    if (!v) return false;
    const src = speechHaystack(spoken);
    const compact = compactText(v);
    if (!src) return false;
    if (src.includes(compact)) return true;
    const vd = digitsOnly(compact);
    const sd = digitsOnly(src);
    if (vd.length >= 8 && sd.includes(vd)) return true;
    const floorM = compact.match(/^([0-9]+|[零〇一二兩三四五六七八九十百]+)\s*樓層?$/);
    if (floorM) {
      const n = parseNumber(floorM[1]);
      if (n != null) {
        const cn = ["零","一","二","三","四","五","六","七","八","九","十"][n] || "";
        if (src.includes(n + "樓") || (cn && src.includes(cn + "樓"))) return true;
        if (n === 2 && src.includes("兩樓")) return true;
      }
    }
    return false;
  }
  function extractPhones(text) {
    const s = String(text || "");
    const mobile = s.match(/09\d{2}[-.\s]?\d{3}[-.\s]?\d{3}/);
    if (mobile) return mobile[0].replace(/[.\s]/g, "-");
    const land = s.match(/(?:聯絡|連絡)?(?:電話|市話)\s*(?:是|為|:|：)?\s*(0[2-8][-.\s]?\d{6,8})/);
    if (land) return land[1].replace(/[.\s]/g, "-");
    return "";
  }
  function extractCustomerLocal(text) {
    const src = String(text || "").normalize("NFKC").replace(/臺/g, "台");
    const out = emptyMeta();
    let m = src.match(/(?:客戶|屋主|業主)(?:姓名|名字)?\s*(?:是|叫|名叫|為|:|：)?\s*([^\s，,。；;的]{2,8}(?:先生|小姐|太太|女士|師傅)?)/);
    if (m) out.customer = m[1].trim();
    if (!out.customer) {
      m = src.match(/([一-龥]{2,4}(?:先生|小姐|太太|女士))/);
      if (m) out.customer = m[1];
    }
    out.phone = extractPhones(src);
    m = src.match(/地\s*址\s*(?:是|在|為|:|：)?\s*([^，,。；;\n]{4,40})/);
    if (m) out.address = m[1].replace(/(?:的)?(?:那邊|這裡|這邊|喔|哦|呀|啊)$/, "").trim()
      .replace(/(?:都會|偏遠|公寓|大樓|透天厝|透天|廠辦)?\s*(?:[0-9一二三四五六七八九十兩]+\s*樓(?:層)?)?$/, "").trim();
    if (!out.address) {
      m = src.match(/((?:[一-龥]{2,3}(?:市|縣))[一-龥]{1,3}(?:區|鄉|鎮|市)[^\s，,。；;]{0,24}(?:路|街|大道)\s*\d+\s*號?(?:之\d+)?)/);
      if (m) out.address = m[1].replace(/\s+/g, "");
    }
    m = src.match(/建築形式\s*(?:是|為|:|：)?\s*(公寓|大樓|透天厝|透天|廠辦|其他)/) || src.match(/(公寓|大樓|透天厝|透天|廠辦)/);
    if (m) out.building = m[1] === "透天厝" ? "透天" : m[1];
    m = src.match(/(?:樓層|住在)\s*([0-9]+|[一二三四五六七八九十兩]+)\s*樓(?!板)/) ||
      src.match(/([0-9]+|[一二三四五六七八九十兩]+)\s*樓(?:層)?(?!板|地板)/);
    if (m) {
      const n = parseNumber(m[1]);
      out.floor = (n != null ? n : m[1]) + "樓";
    }
    if (/偏遠/.test(src)) out.region = "偏遠";
    else if (/都會/.test(src)) out.region = "都會";
    return out;
  }
  function adoptCustomer(aiCust, spoken) {
    const local = extractCustomerLocal(spoken || state.raw);
    const ai = (aiCust && typeof aiCust === "object") ? aiCust : {};
    const next = emptyMeta();
    const show = emptyShow();
    const allowedBuilding = { "公寓": 1, "大樓": 1, "透天": 1, "廠辦": 1, "其他": 1, "透天厝": 1 };
    const allowedRegion = { "都會": 1, "偏遠": 1 };
    for (const f of META_FIELDS) {
      const k = f.k;
      let v = String(ai[k] != null ? ai[k] : "").trim();
      if (v && !mentionedInSpeech(v, spoken || state.raw)) {
        // AI 正規化後可能與口述略有不同，只在完全對不上時改採本機結果
        v = "";
      }
      if (!v) v = String(local[k] || "").trim();
      if (k === "building") {
        if (v === "透天厝") v = "透天";
        if (v && !allowedBuilding[v]) v = "";
      }
      if (k === "region" && v && !allowedRegion[v]) v = "";
      next[k] = v;
      show[k] = !!v;
    }
    state.meta = next;
    state.show = show;
    return next;
  }

  function prefersReducedMotion() {
    try {
      return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch (e) {
      return false;
    }
  }
  function scrollBehavior() {
    return prefersReducedMotion() ? "auto" : "smooth";
  }
  function isLineBrowser() {
    try {
      return /Line\//i.test(navigator.userAgent || "");
    } catch (e) {
      return false;
    }
  }
  function applyLineBrowserHint() {
    const el = $("#line-browser");
    if (!el) return;
    const on = isLineBrowser();
    el.hidden = !on;
    el.classList.toggle("on", on);
  }
  function formatRecTime(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return "已說 " + mm + ":" + ss;
  }
  function stopRecTimer() {
    if (recTimerId) {
      clearInterval(recTimerId);
      recTimerId = null;
    }
    recTimerStart = 0;
    const el = $("#mic-timer");
    if (el) {
      el.hidden = true;
      el.textContent = "";
    }
  }
  function startRecTimer() {
    stopRecTimer();
    recTimerStart = Date.now();
    const el = $("#mic-timer");
    if (!el) return;
    el.hidden = false;
    el.textContent = formatRecTime(0);
    recTimerId = setInterval(() => {
      el.textContent = formatRecTime(Date.now() - recTimerStart);
    }, 250);
  }
  function updateTotalBanner() {
    const nodes = document.querySelectorAll(".total-banner");
    const has = !!(state.items && state.items.length);
    const html = has ? '<span class="tb-lab">這張估價單合計</span><span class="tb-amt">' + money(totals().total) + "</span>" : "";
    nodes.forEach((tb) => { tb.hidden = !has; tb.innerHTML = html; });
  }
  function updateGuidance(mode) {
    const mic = $("#mic");
    const rec = mode === "rec" || (!mode && mic && mic.classList.contains("is-rec"));
    const busy = mode === "busy" || (!mode && mic && mic.classList.contains("is-busy"));
    const quoteOn = !!( $("#quote") && $("#quote").classList.contains("on") && state.items && state.items.length );
    const recBan = $("#rec-banner");
    const busyBan = $("#busy-banner");
    const coachMic = $("#coach-mic");
    const coachLab = $("#coach-mic-lab");
    const ready = $("#ready-badge");
    const coachDl = $("#coach-dl");
    if (recBan) recBan.hidden = !rec;
    if (busyBan) busyBan.hidden = !busy;
    if (coachMic) {
      coachMic.hidden = !!(quoteOn || busy);
      if (coachLab) coachLab.textContent = rec ? "講完再按一次" : "按這裡";
    }
    if (ready) ready.hidden = !quoteOn;
    const readyM = $("#ready-badge-modal");
    if (readyM) readyM.hidden = !quoteOn;
    const qOpen = isQuoteModalOpen();
    const coachView = $("#coach-view");
    if (coachView) coachView.hidden = !(quoteOn && !qOpen && !rec && !busy);
    if (coachDl) coachDl.hidden = !(quoteOn && !qOpen && !rec && !busy);
    const coachDlM = $("#coach-dl-modal");
    if (coachDlM) coachDlM.hidden = !(quoteOn && qOpen && !rec && !busy);
    const hint = $("#mic-hint");
    if (hint) hint.hidden = !!(rec || busy);
  }
  function closeModal() {
    const el = $("#modal");
    if (el) el.hidden = true;
    modalMode = null;
    const box = $("#modal-actions");
    if (box) box.innerHTML = "";
    syncBodyLock();
  }
  function openQuoteModal() {
    if (!state.items.length) return;
    const el = $("#quote-modal");
    if (!el) return;
    renderQuote();
    el.hidden = false;
    el.setAttribute("aria-hidden", "false");
    syncBodyLock();
    updateGuidance();
    const sc = $("#quote-modal-scroll");
    if (sc) sc.scrollTop = 0;
  }
  function closeQuoteModal() {
    const el = $("#quote-modal");
    if (el) {
      el.hidden = true;
      el.setAttribute("aria-hidden", "true");
    }
    syncBodyLock();
    updateGuidance();
  }
  function openModal(cfg) {
    const el = $("#modal");
    if (!el) return;
    modalMode = (cfg && cfg.mode) || "dialog";
    const title = $("#modal-title");
    const desc = $("#modal-desc");
    const box = $("#modal-actions");
    if (title) title.textContent = (cfg && cfg.title) || "";
    if (desc) desc.textContent = (cfg && cfg.desc) || "";
    if (box) {
      box.innerHTML = "";
      (cfg.buttons || []).forEach((b) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = b.cls || "btn";
        if (b.id) btn.id = b.id;
        if (b.icon) {
          const ico = document.createElement("span");
          ico.className = "btn-ico";
          ico.setAttribute("aria-hidden", "true");
          ico.innerHTML = b.icon;
          btn.appendChild(ico);
        }
        const lab = document.createElement("span");
        lab.className = "btn-lab";
        lab.textContent = b.label;
        btn.appendChild(lab);
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          if (typeof b.fn === "function") b.fn();
        });
        box.appendChild(btn);
      });
    }
    el.hidden = false;
    syncBodyLock();
    const first = box && box.querySelector("button");
    if (first) setTimeout(() => first.focus(), 20);
  }
  function openDownloadModal() {
    if (!state.items.length) {
      setExportStatus("還沒有估價單可以下載。", true);
      return;
    }
    setExportStatus("");
    openModal({
      mode: "download",
      title: "下載報價單",
      desc: "請選一種檔案。PDF 方便查看和列印；Excel 方便您自己改數字。",
      buttons: [
        { id: "btn-pdf", label: "下載 PDF（方便查看、列印）", cls: "btn lg sheet-row", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h7l5 5v13H7z"></path><path d="M14 3v5h5"></path></svg>', fn: () => { closeModal(); exportPdf().catch((e) => { console.error(e); setExportStatus("匯出 PDF 失敗，請再試一次。", true); }); } },
        { id: "btn-xlsx", label: "下載 Excel（方便自己改數字）", cls: "btn lg sheet-row", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="14" rx="2"></rect><path d="M4 10h16M4 15h16M10 5v14"></path></svg>', fn: () => { closeModal(); exportXlsx().catch((e) => { console.error(e); setExportStatus("匯出 Excel 失敗，請再試一次。", true); }); } },
        { id: "btn-line", label: "用 LINE 分享", cls: "btn sec lg", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16v9H8l-4 4V6z"></path></svg>', fn: () => { window.open(lineShareUrl(), "_blank", "noopener"); } },
        { id: "btn-modal-cancel", label: "取消", cls: "btn ghost lg", fn: closeModal }
      ]
    });
  }
  function confirmClear() {
    openModal({
      mode: "confirm",
      title: "清除全部資料？",
      desc: "會把剛才講的內容、客戶資料和估價單全部清掉，清掉就不能復原。確定要清除嗎？",
      buttons: [
        { id: "btn-confirm-clear", label: "確定清除", cls: "btn danger lg", fn: () => { closeModal(); clearSession(); setStatus("已清除。請再按下面的大按鈕開始講，或在下面格子打字。"); } },
        { id: "btn-cancel-clear", label: "取消", cls: "btn ghost lg", fn: closeModal }
      ]
    });
  }
  function confirmNewRecording() {
    return new Promise((resolve) => {
      openModal({
        mode: "confirm",
        title: "重新錄音？",
        desc: "重新錄音會取代目前的內容和估價單。確定要重新開始講嗎？",
        buttons: [
          { id: "btn-confirm-rec", label: "確定重新錄音", cls: "btn lg", fn: () => { closeModal(); resolve(true); } },
          { id: "btn-cancel-rec", label: "取消", cls: "btn ghost lg", fn: () => { closeModal(); resolve(false); } }
        ]
      });
    });
  }


  function cnNum(x) {
    x = String(x == null ? "" : x).trim().replace(/,/g, "").replace(/點/g, ".");
    if (!x) return NaN;
    if (/^[0-9]+(?:\.[0-9]+)?$/.test(x)) return parseFloat(x);
    if (x === "半") return 0.5;
    let total = 0, n = 0, d = 0, lastUnit = 1;
    for (const ch of x) {
      if (ch === ".") return NaN;
      if (ch in CN_D) d = CN_D[ch];
      else if (ch === "十" || ch === "百" || ch === "千") {
        const u = ch === "十" ? 10 : ch === "百" ? 100 : 1000;
        n += (d || 1) * u;
        lastUnit = u;
        d = 0;
      } else if (ch === "萬" || ch === "万") {
        n = (n + d) || 1;
        total += n * 10000;
        lastUnit = 10000;
        n = 0;
        d = 0;
      } else if (ch === "億") {
        n = (n + d) || 1;
        total += n * 100000000;
        lastUnit = 100000000;
        n = 0;
        d = 0;
      } else if (ch === "半") {
        d = (d || 0) + 0.5;
      } else {
        return NaN;
      }
    }
    if (d) {
      if (lastUnit >= 10000 && n === 0) d *= lastUnit / 10;
      else if (lastUnit === 1000) d *= 100;
      else if (lastUnit === 100) d *= 10;
    }
    return total + n + d;
  }
  const fmtChi = (v) => String(Math.round(v * 100) / 100);
  function parseNumber(text) {
    const t = String(text || "").trim().replace(/,/g, "");
    if (!t) return null;
    if (/^[0-9]+(?:\.[0-9]+)?$/.test(t)) return parseFloat(t);
    const n = cnNum(t);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  function midPrice(it) {
    if (!it) return 0;
    const lo = it.price_low, hi = it.price_high;
    if (lo == null && hi == null) return 0;
    if (lo == null) return +hi || 0;
    if (hi == null) return +lo || 0;
    return Math.round((lo + hi) / 20) * 10;
  }
  function normSrc(text) {
    let s = String(text || "").normalize("NFKC").replace(/臺/g, "台");
    s = s.replace(/[．.]/g, "。").replace(/!/g, "！").replace(/\?/g, "？").replace(/;/g, "；").replace(/,/g, "，");
    s = s.replace(/[「」『』“”‘’（）()【】\[\]…—–：:]/g, " ");
    s = s.replace(/\r\n|\r/g, "\n");
    return s.replace(/[ \t\u3000]+/g, " ").trim();
  }
  function termWords(t) {
    const w = [...(t.spoken || []), ...(t.asr_variants || []), ...(t.homophones || [])];
    const std = String(t.standard || "").trim();
    if (std && !w.includes(std)) w.push(std);
    return w;
  }
  const termUnsure = (t) => /未定|待師傅確認|請問|請確認/.test(String(t.standard || "") + String(t.note || ""));

  function allTermEntries() {
    return (state.terms.terms || []).concat(EXTRA_ALIASES);
  }
  function termRank(t) {
    if (!t) return 0;
    if (t.code && itemByCode(t.code)) return 4;
    if (t.code) return 3;
    const std = String(t.standard || "");
    if (L1_TERMS.some((w) => std === w || std.indexOf(w) >= 0 || w.indexOf(std) >= 0)) return 3;
    if (termUnsure(t)) return 0;
    return 1;
  }
  function termTable() {
    if (TERM_RE) return;
    TERM_MAP = new Map();
    for (const t of allTermEntries()) {
      if (t.auto === false) continue;
      for (const w of termWords(t)) {
        const k = String(w || "").trim();
        if (k.length < 2) continue;
        if (/^[a-z]{1,3}$/i.test(k) && !/^cm$/i.test(k)) continue;
        if (L1_TERMS.indexOf(k) >= 0 && String(t.standard || "") !== k && !String(t.standard || "").startsWith(k)) continue;
        const prev = TERM_MAP.get(k);
        if (!prev || termRank(t) > termRank(prev)) TERM_MAP.set(k, t);
      }
    }
    const keys = [...TERM_MAP.keys()].sort((a, b) => b.length - a.length)
      .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    TERM_RE = keys.length ? new RegExp(keys.join("|"), "g") : null;
  }
  function normalizeAnswer(text) {
    termTable();
    const hits = [];
    let out = normSrc(text);
    const locked = collectLockedSpans(out);
    if (TERM_RE) out = out.replace(TERM_RE, (m, offset) => {
      const t = TERM_MAP.get(m); if (!t) return m;
      const unsure = termUnsure(t), std = String(t.standard || ""), code = t.code || null;
      if (spanLocked(locked, offset, offset + m.length)) return m;
      if (L1_TERMS.indexOf(m) >= 0) { hits.push({ from: m, to: m, unsure: false, code: code || null, locked: true }); return m; }
      if (std === m) { hits.push({ from: m, to: std, unsure, code }); return m; }
      if (std.startsWith(m)) { if (unsure) hits.push({ from: m, to: std, unsure: true, code }); return m; }
      hits.push({ from: m, to: std, unsure, code }); return std;
    });
    out = out.replace(RE_HALF, (m, a) => { const r = `${fmtChi(cnNum(a) + 0.5)} 尺`; hits.push({ from: m, to: r }); return r; });
    out = out.replace(RE_CHI, (m, a, b, c) => {
      const v = cnNum(a) + cnNum(b) / 10 + (c ? cnNum(c) / 100 : 0);
      const r = `${fmtChi(v)} 尺`; hits.push({ from: m, to: r }); return r;
    });
    out = out.replace(RE_FOOT, (m, a) => {
      const r = `${fmtChi(cnNum(a))} 尺`;
      if (r === m || r === m.replace(/\s/g, "")) return m;
      hits.push({ from: m, to: r }); return r;
    });
    out = out.replace(RE_CUN, (m, a, c) => {
      const v = cnNum(a) / 10 + (c ? cnNum(c) / 100 : 0);
      const r = `${fmtChi(v)} 尺`; hits.push({ from: m, to: r }); return r;
    });
    return { text: out, hits };
  }

  function catalogList() {
    return Object.values(state.catalog);
  }
  function itemByCode(code) {
    return code && state.catalog[code] ? state.catalog[code] : null;
  }
  function lineFromCode(code, qty, unit) {
    const it = itemByCode(code);
    if (!it) return null;
    const q = qty != null && Number(qty) > 0 ? Number(qty) : 1;
    const u = unit || it.unit;
    const price = midPrice(it);
    return {
      id: uid(), code: it.code, name: it.item, qty: q, unit: u,
      unitPrice: price, pending: false, note: "", spokenPrice: false
    };
  }
  function pendingLine(name, qty, unit, note) {
    return {
      id: uid(), code: null, name: name || "未命名項目",
      qty: qty != null && Number(qty) > 0 ? Number(qty) : 1,
      unit: unit || "式", unitPrice: 0, pending: true, note: note || "單價庫沒有對應行情",
      spokenPrice: false
    };
  }
  function lineAmount(row) {
    const q = Number(row.qty) || 0;
    const p = Number(row.unitPrice) || 0;
    return Math.round(q * p);
  }
  function totals() {
    const sub = state.items.reduce((s, r) => s + lineAmount(r), 0);
    const tax = state.tax ? Math.round(sub * TAX_RATE) : 0;
    return { sub, tax, total: sub + tax };
  }

  const UNIT_ALT = { "米": "公尺", "米知": "公尺", "米突": "公尺", "台尺": "尺", "呎": "尺" };
  function unitCanon(u) {
    const t = String(u || "").trim();
    return UNIT_ALT[t] || t;
  }
  const SPEC_UNITS = { "公分": 1, "公釐": 1, "公厘": 1, "厘米": 1 };
  const NAME_CONNECT = /^(再加|還要|另外|然後|以及|還有|接著|而且|並且|并且|跟住|然後要|再來)/;
  const SEGMENT_ALIASES = [
    { re: /平釘天花板|平釘天花/, code: "W-101" },
    { re: /木作輕隔間|木作隔間|輕隔間/, code: "W-201" },
    { re: /系統衣櫃/, code: "W-401" },
    { re: /系統高櫃/, code: "W-301" },
    { re: /系統櫃/, code: "W-402" },
    { re: /鞋櫃/, code: "W-306" },
    { re: /電視展示櫃|展示櫃|開放式書櫃|書櫃/, code: "W-307" },
    { re: /電視矮櫃|矮櫃|電視櫃/, code: "W-303" },
    { re: /窗簾盒/, code: "W-105" },
    { re: /天花嵌燈|嵌燈/, code: "E-009" },
    { re: /跳色/, code: "A-108" },
    { re: /全室油漆|乳膠漆|二底三度/, code: "A-102" },
    { re: /全室電線重拉|重拉電線/, code: "E-013" },
    { re: /全室水電/, code: "P-011" },
    { re: /220\s*V\s*迴路|220\s*V|220伏特|冷氣迴路|專用迴路/, code: "E-005" },
    { re: /110\s*V\s*迴路|110\s*V|110伏特/, code: "E-003" },
    { re: /踢腳/, code: "W-703" },
    { re: /打牆|打壁|敲牆|開槽|鑿壁/, code: "P-013" },
    { re: /延伸.{0,6}插座|新增插座|加插座/, code: "E-002" },
    { re: /插座.{0,4}更換|開關面板/, code: "E-001" },
    { re: /插座/, code: "SOCKET" },
    { re: /油漆/, code: "A-102" },
    { re: /網路迴路|網路線迴路/, pending: "網路迴路" },
    { re: /燈具迴路/, pending: "燈具迴路" },
    { re: /電器櫃/, pending: "電器櫃" },
    { re: /側邊櫃/, pending: "側邊櫃" }
  ];

  function findQtys(text, opts) {
    const src = String(text || "");
    const includeSpec = opts && opts.includeSpec;
    const unitPat = UNITS.slice().sort((a, b) => b.length - a.length)
      .map((u) => u.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
    const re = new RegExp(`${NUM}\\s*(${unitPat})`, "g");
    const out = [];
    let m;
    while ((m = re.exec(src))) {
      const n = parseNumber(m[1]);
      const unit = unitCanon(m[2]);
      if (n == null) continue;
      const spec = !!SPEC_UNITS[unit] || !!SPEC_UNITS[m[2]];
      if (spec && !includeSpec) continue;
      const pre = src.slice(Math.max(0, m.index - 2), m.index);
      const post = src.slice(m.index + m[0].length, m.index + m[0].length + 16);
      const token = String(m[1] || "");
      const isPriceUnit = /(?:^|[每])$/.test(pre) || /^(一|1|每)$/.test(token);
      const postNum = post.match(/^\s*([0-9]{3,}|[零〇一二兩三四五六七八九十百千萬點]+)/);
      const postVal = postNum ? (parseNumber(postNum[1]) || 0) : 0;
      const postAfter = postNum ? post.slice(postNum[0].length) : "";
      if (isPriceUnit && postVal >= 100 && !/^\s*(?:V|伏特|伏)/i.test(postAfter) && postVal !== 110 && postVal !== 220) continue;
      if (/^每$/.test(pre.trim()) || /^每/.test(token)) continue;
      out.push({ qty: n, unit: spec ? unit : (unit || m[2]), index: m.index, raw: m[0], length: m[0].length, spec });
    }
    return out;
  }
  function nearestQty(text, index, preferredUnit) {
    const all = findQtys(text);
    if (!all.length) return { qty: null, unit: preferredUnit || "" };
    const pref = preferredUnit ? unitCanon(preferredUnit) : "";
    let best = null, bestD = 1e9;
    for (const q of all) {
      const d = Math.abs(q.index - index);
      const bonus = pref && q.unit === pref ? -50 : 0;
      if (d + bonus < bestD) { bestD = d + bonus; best = q; }
    }
    if (best && bestD < 40) return best;
    if (all.length === 1) return all[0];
    return best || { qty: null, unit: preferredUnit || "" };
  }

  function cleanName(s) {
    return String(s || "")
      .replace(/[，。、,;；:\s]+/g, " ")
      .replace(/^(要|再|請|幫我|幫忙|然後|以及|還有|接著|而且|並且|并且)\s*/g, "")
      .trim();
  }
  function splitLeadingVerb(s) {
    const t = String(s || "").trim();
    const m = t.match(NAME_CONNECT);
    if (!m) return { rest: t, verb: "" };
    return { verb: m[1], rest: t.slice(m[1].length).trim() };
  }
  function collectSpecs(text) {
    const specs = findQtys(text, { includeSpec: true }).filter((q) => q.spec);
    if (!specs.length) return "";
    return specs.map((q) => q.qty + q.unit).join("、");
  }
  function decideSocket(name, unit) {
    const n = String(name || "");
    const u = unitCanon(unit);
    if (/延伸|新增插座|加插座/.test(n) || u === "口") return "E-002";
    if (/更換|開關面板/.test(n) || u === "組") return "E-001";
    return u === "口" ? "E-002" : "E-001";
  }
  function aliasHits(name) {
    const src = String(name || "");
    const hits = [];
    for (const al of SEGMENT_ALIASES) {
      const re = new RegExp(al.re.source, "g");
      let m;
      while ((m = re.exec(src))) {
        hits.push({
          start: m.index,
          end: m.index + m[0].length,
          text: m[0],
          code: al.code || null,
          pending: al.pending || null,
          len: m[0].length
        });
      }
    }
    hits.sort((a, b) => b.len - a.len || a.start - b.start);
    const used = [];
    for (const h of hits) {
      if (used.some((u) => !(h.end <= u.start || h.start >= u.end))) continue;
      used.push(h);
    }
    used.sort((a, b) => a.start - b.start);
    return used;
  }
  function partsFromName(name, qty, unit, specNote) {
    const src = cleanName(name);
    if (!src) return [];
    const hits = aliasHits(src);
    const out = [];
    if (!hits.length) {
      out.push({ code: null, name: src, qty, unit: unit || "式", pending: true, note: specNote || "單價庫沒有對應行情" });
      return out;
    }
    for (const h of hits) {
      let code = h.code;
      let pendingName = h.pending;
      if (code === "SOCKET") {
        code = decideSocket(src, unit);
        pendingName = null;
      }
      const note = specNote || "";
      if (code && itemByCode(code)) {
        out.push({ code, name: itemByCode(code).item, qty, unit, pending: false, note });
      } else {
        out.push({ code: null, name: pendingName || h.text || src, qty, unit: unit || "式", pending: true, note: note || "單價庫沒有對應行情" });
      }
    }
    // leftover CJK not covered by aliases → 待填, do not invent a price
    let leftover = src;
    for (const h of hits.slice().sort((a, b) => b.start - a.start)) {
      leftover = leftover.slice(0, h.start) + leftover.slice(h.end);
    }
    leftover = leftover.replace(/[0-9]+(?:\.[0-9]+)?/g, " ")
      .replace(/公分|公釐|公厘|厘米|規格/g, " ")
      .replace(/新增|再加|還要|另外|然後|以及|還有|接著|而且|並且|并且|幫我|幫忙|請|要|加|補|做|裝|換|延伸/g, " ")
      .replace(/[，。、,;；:\s]/g, " ").trim();
    leftover = leftover.replace(/^(水電|木工|油漆|工程|牆壁|牆面|地面|客廳|臥室|廚房|廁所|浴室|房間|全室)$/g, "").trim();
    if (/^[\u4e00-\u9fff]{2,}$/.test(leftover)
        && !/^(公分|公釐|厘米|規格|數量|單價)$/.test(leftover)
        && !out.some((p) => (p.name || "").indexOf(leftover) >= 0 || leftover.indexOf((p.pending ? "" : (p.name || ""))) >= 0)) {
      out.push({ code: null, name: leftover, qty: qty, unit: unit || "式", pending: true, note: "單價庫沒有對應行情" });
    }
    return out;
  }
  const CLAUSE_CONNECT_RE = /(?=然後|還要|另外|再加|還有|接著|加上)/;
  const PUNCT_SPLIT_RE = /[。！？；\n]+/;
  function protectPriceTotalJoins(text) {
    return String(text || "").replace(/(元|塊錢|塊)\s*[，、]?\s*(總共|一共|合計|共)/g, "$1 $2");
  }
  function splitClauses(text) {
    const src = protectPriceTotalJoins(text);
    const out = [];
    String(src || "").split(PUNCT_SPLIT_RE).forEach((chunk) => {
      const piece = String(chunk || "").trim();
      if (!piece) return;
      piece.split(CLAUSE_CONNECT_RE).forEach((sub) => {
        const t = String(sub || "").trim();
        if (t) out.push(t);
      });
    });
    return out.length ? out : (String(src || "").trim() ? [String(src).trim()] : []);
  }
  function extractPricedTotals(text) {
    const src = String(text || "");
    const unitPat = UNITS.slice().sort((a, b) => b.length - a.length)
      .map((u) => u.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
    const re = new RegExp(
      "(.+?)(?:一|1|每)\\s*(" + unitPat + ")\\s*" + PRICE_NUM + "\\s*(?:元|塊錢|塊)?\\s*(?:總共|一共|合計|共)\\s*" + NUM + "\\s*(\\2|" + unitPat + ")",
      "g"
    );
    const out = [];
    let m;
    while ((m = re.exec(src))) {
      const name = cleanName(String(m[1] || "").replace(/^(?:然後|還要|另外|再加|還有|接著|加上)\s*/, ""));
      const unit = unitCanon(m[5] || m[2]);
      const qty = parseNumber(m[4]);
      const price = parseNumber(m[3]);
      if (!name || qty == null || qty <= 0) continue;
      out.push({
        start: m.index,
        end: m.index + m[0].length,
        name,
        qty,
        unit,
        unitPrice: price,
        raw: m[0]
      });
    }
    return out;
  }
  function segmentSpeechByQty(text) {

    const src = String(text || "");
    const qtys = findQtys(src);
    const specs = findQtys(src, { includeSpec: true }).filter((q) => q.spec);
    const segs = [];
    let roomArea = null;
    for (let i = 0; i < qtys.length; i++) {
      const q = qtys[i];
      const prevEnd = i === 0 ? 0 : qtys[i - 1].index + qtys[i - 1].length;
      const nextStart = i + 1 < qtys.length ? qtys[i + 1].index : src.length;
      let before = src.slice(prevEnd, q.index);
      let after = src.slice(q.index + q.length, nextStart);
      const split = splitLeadingVerb(after);
      after = split.rest;
      const verbToNext = split.verb;
      const nameBefore = cleanName(before);
      const nameAfter = cleanName(after);
      // 開頭單獨的坪數（例如「30 坪平釘天花 25 坪」）當全室面積，不當第一個工項
      if (i === 0 && !nameBefore && q.unit === "坪" && nameAfter && qtys.length > 1) {
        roomArea = { qty: q.qty, unit: q.unit };
        // 把品名留給下一筆
        if (qtys[i + 1]) {
          /* next iteration will see this trailing name in its 'before' if we don't consume it;
             because after sits between this unit and next qty, next.before would be nameAfter+verb.
             We already split verb; prepend nameAfter to a stash for next. */
        }
        segs.push({ kind: "context", qty: q.qty, unit: q.unit, name: nameAfter, carryName: nameAfter + (verbToNext ? " " + verbToNext : "") });
        continue;
      }
      let name = nameBefore;
      if (i > 0 && segs[segs.length - 1] && segs[segs.length - 1].kind === "context" && segs[segs.length - 1].carryName) {
        const carried = cleanName(segs[segs.length - 1].carryName);
        if (!name) name = carried;
        else if (carried && name.indexOf(carried) < 0) name = cleanName(carried + " " + name);
      }
      // 數量後面的文字：不完整的動詞（新增／加）才把後面第一個工項併進來，其餘留給下一筆
      const nextItemPrefix = /^(新增|加|再加|還要|另外|然後|要|做|裝|補|請)/;
      if (nameAfter && !NAME_CONNECT.test(nameAfter) && !nextItemPrefix.test(nameAfter)) {
        const beforeHits = aliasHits(name);
        const afterHits = aliasHits(nameAfter);
        const incomplete = !name || (beforeHits.length === 0 && /(新增|再加|^加|要|補|做|裝|換|延伸)/.test(name));
        if (incomplete) {
          if (!afterHits.length) {
            name = cleanName((name ? name + " " : "") + nameAfter);
          } else {
            const first = afterHits[0];
            const chunk = String(nameAfter).slice(0, first.end);
            name = cleanName((name ? name + " " : "") + chunk);
          }
        } else if (nameAfter && afterHits.length) {
          // 「三口插座」這種數量緊貼後面品名，且前面是上一項殘句時，數量歸後面
          function unitFits(nm) {
            return partsFromName(nm, 1, q.unit, "").some(function (p) {
              return p.code && itemByCode(p.code) && unitCanon(itemByCode(p.code).unit) === unitCanon(q.unit);
            });
          }
          if (unitFits(nameAfter) && !unitFits(name)) name = nameAfter;
        }
      }
      const specNear = specs.filter((sp) => sp.index >= prevEnd && sp.index <= nextStart)
        .map((sp) => sp.qty + sp.unit).join("、");
      segs.push({ kind: "item", name, qty: q.qty, unit: q.unit, spec: specNear, index: q.index });
    }
    if (roomArea) segs.roomArea = roomArea;
    return segs;

  }
  function mergeSpeechSegs(target, incoming, roomRef) {
    for (const seg of incoming) {
      if (!seg) continue;
      if (seg.kind === "context" && incoming.roomArea && !roomRef.roomArea) {
        roomRef.roomArea = incoming.roomArea;
      }
      target.push(seg);
    }
    if (incoming.roomArea && !roomRef.roomArea) roomRef.roomArea = incoming.roomArea;
  }
  function segmentSpeech(text) {
    const src = String(text || "");
    const clauses = splitClauses(src);
    const segs = [];
    const roomRef = { roomArea: null };
    for (const clause of clauses) {
      const priced = extractPricedTotals(clause);
      if (priced.length) {
        let cursor = 0;
        for (const p of priced) {
          if (p.start > cursor) {
            mergeSpeechSegs(segs, segmentSpeechByQty(clause.slice(cursor, p.start)), roomRef);
          }
          segs.push({ kind: "item", name: p.name, qty: p.qty, unit: p.unit, spec: "", index: p.start, spokenUnitPrice: p.unitPrice });
          cursor = p.end;
        }
        if (cursor < clause.length) {
          mergeSpeechSegs(segs, segmentSpeechByQty(clause.slice(cursor)), roomRef);
        }
      } else {
        mergeSpeechSegs(segs, segmentSpeechByQty(clause), roomRef);
      }
    }
    if (roomRef.roomArea) segs.roomArea = roomRef.roomArea;
    return segs;
  }

  function applySpokenUnitPrice(row, price) {
    const p = Number(price) || 0;
    if (!row || !(p >= 100 && p <= 1000000)) return row;
    row.unitPrice = p;
    row.spokenPrice = true;
    row.pending = false;
    if (!row.note) row.note = "口述單價";
    return row;
  }
  function emitParts(parts, items, usedKeys) {
    for (const p of parts) {
      if (!p || !p.name && !p.code) continue;
      let row;
      if (p.code && itemByCode(p.code) && !p.pending) {
        row = lineFromCode(p.code, p.qty, p.unit);
        if (p.note) row.note = p.note;
      } else {
        row = pendingLine(p.name || "未命名項目", p.qty, p.unit, p.note || "單價庫沒有對應行情");
      }
      if (p.spokenUnitPrice) applySpokenUnitPrice(row, p.spokenUnitPrice);
      const key = (row.code || "") + "|" + row.name + "|" + row.qty + "|" + row.unit;
      if (usedKeys.has(key)) continue;
      usedKeys.add(key);
      items.push(row);
    }
  }

  function localParse(text) {
    const corr = applySpeechCorrections(text || "");
    const norm = normalizeAnswer(corr.text);
    const src = norm.text;
    const items = [];
    const usedKeys = new Set();
    const usedCodesSoft = new Set();
    const segs = segmentSpeech(src);
    const roomArea = segs.roomArea || null;
    for (const seg of segs) {
      if (!seg || seg.kind !== "item") continue;
      let name = seg.name;
      let qty = seg.qty;
      let unit = seg.unit;
      // 全室油漆若沒帶到數量，用開頭的全室坪數
      const parts = partsFromName(name, qty, unit, seg.spec ? ("規格 " + seg.spec) : "");
      if (seg.spokenUnitPrice) parts.forEach((pt) => { pt.spokenUnitPrice = seg.spokenUnitPrice; });
      if (parts.length > 1) {
        const allCabinets = parts.every((p) => /櫃|窗簾/.test(p.name || ""));
        const bare = String(name || "").match(/(?:^|[^0-9])([0-9]+(?:\.[0-9]+)?)(?!\s*(?:坪|尺|呎|組|口|迴|盞|顆|式|個|處|公尺|公分))/);
        if (allCabinets && bare && parts.length >= 2) {
          // 「電器櫃 40側邊櫃 8 尺」：40 沒有單位，不當 8 尺的數量分給前一項
          const earlier = parts.slice(0, -1);
          const last = parts[parts.length - 1];
          last.qty = qty;
          last.unit = unit || last.unit;
          earlier.forEach((p) => {
            p.qty = 1;
            p.unit = "式";
            p.note = (p.note ? p.note + "；" : "") + "口述提及 " + bare[1] + "（單位不明）";
          });
        } else if (!allCabinets) {
          const last = parts[parts.length - 1];
          last.qty = qty;
          last.unit = unit || last.unit;
          for (const p of parts.slice(0, -1)) {
            if ((p.code === "A-102" || /全室油漆|乳膠漆/.test(p.name || "")) && roomArea) {
              p.qty = roomArea.qty;
              p.unit = roomArea.unit;
              if (!p.note) p.note = "依口述全室坪數";
            } else {
              p.qty = p.qty && p !== last ? (p.code && itemByCode(p.code) && itemByCode(p.code).unit === unit ? qty : 1) : p.qty;
              if (!(p.code && itemByCode(p.code) && unitCanon(itemByCode(p.code).unit) === unitCanon(unit))) {
                p.qty = 1;
                p.unit = (p.code && itemByCode(p.code) && itemByCode(p.code).unit) || "式";
              }
            }
          }
        }
      }
      emitParts(parts, items, usedKeys);
      parts.forEach((p) => { if (p.code) usedCodesSoft.add(p.code); });
    }
    // 全室油漆出現但還沒列到數量時，補上全室坪數
    if (roomArea && /全室油漆|全室.{0,4}漆/.test(src) && !items.some((it) => /油漆|乳膠漆/.test(it.name) && it.code === "A-102")) {
      const already = items.some((it) => it.code === "A-102");
      if (!already && /全室油漆/.test(src)) {
        emitParts([{ code: "A-102", name: itemByCode("A-102") && itemByCode("A-102").item, qty: roomArea.qty, unit: roomArea.unit, pending: false, note: "依口述全室坪數" }], items, usedKeys);
        usedCodesSoft.add("A-102");
      }
    }
    // 舊規則後援：沒切到數量的工項（系統高櫃、全室水電、水泥等）
    function take(code, at, unitHint) {
      if (!code || !itemByCode(code)) return;
      if (items.some((it) => it.code === code)) return;
      const it = itemByCode(code);
      const prefer = unitHint || it.unit;
      const q = nearestQty(src, at == null ? src.search(it.item) : at, prefer);
      const unitOk = q && q.unit && prefer && unitCanon(q.unit) === unitCanon(prefer);
      const row = lineFromCode(code, (q.qty > 0 && unitOk) ? q.qty : 1, unitOk ? q.unit : it.unit);
      const key = (row.code || "") + "|" + row.name + "|" + row.qty + "|" + row.unit;
      if (usedKeys.has(key)) return;
      usedKeys.add(key);
      items.push(row);
    }
    for (const h of norm.hits) {
      if (h.code && itemByCode(h.code)) {
        const at = src.indexOf(h.to || h.from || "");
        take(h.code, at >= 0 ? at : 0);
      }
    }
    for (const rule of RULES) {
      const m = src.match(rule.re);
      if (m) take(rule.code, m.index, itemByCode(rule.code) && itemByCode(rule.code).unit);
    }
    if (/水泥/.test(src) && !items.some((it) => /水泥/.test(it.name))) {
      const q = nearestQty(src, src.indexOf("水泥"), "公尺");
      items.push(pendingLine("水泥", q.qty, q.unit || "公尺", "單價庫（水電／木工／油漆）沒有水泥行情"));
    }
    if (!items.length && src) {
      items.push(pendingLine(src.slice(0, 20), 1, "式", "無法對應目錄，請師傅自行修正"));
    }
    attachSpokenPrices(items, src);
    return { text: src, hits: norm.hits, items, local: true, roomArea };
  }

  function catalogForPrompt() {
    return catalogList().map((it) =>
      `${it.code}|${it.item}|${it.unit}|${midPrice(it)}`
    ).join("\n");
  }
  const CORE_STANDARDS = new Set([
    "水泥","公尺","平方公尺","天花板（類型未定）","平釘天花板(矽酸鈣板)",
    "立體造型天花板","流明天花板","踢腳板","乳膠漆一底二度","乳膠漆二底三度",
    "窗簾盒","粉光","磁磚","混凝土／水泥","台尺","批土"
  ]);
  function termVariants(t) {
    return termWords(t);
  }
  function formatTermLine(t) {
    const vars = [];
    const seen = new Set();
    for (const w of termVariants(t)) {
      const k = String(w||"").trim();
      if (!k || k===t.standard || seen.has(k)) continue;
      seen.add(k); vars.push(k);
    }
    const code = t.code ? ("｜目錄 "+t.code) : "";
    return (t.standard||"") + code + (vars.length ? ("｜同音或口頭：" + vars.slice(0, 18).join("、")) : "");
  }
  function selectTermsForPrompt(text) {
    const src = String(text||"");
    const picked = [];
    const used = new Set();
    for (const t of allTermEntries()) {
      const std = String(t.standard||"");
      const isCore = CORE_STANDARDS.has(std) || (t.code && itemByCode(t.code));
      let hit = isCore;
      if (!hit) {
        for (const w of termVariants(t)) {
          const k = String(w||"").trim();
          if (k.length>=2 && src.indexOf(k)>=0) { hit = true; break; }
        }
      }
      if (!hit) continue;
      const key = std + "|" + (t.code||"");
      if (used.has(key)) continue;
      used.add(key);
      picked.push(t);
    }
    return picked;
  }
  function buildPrompt(spoken, normalized, original, hits) {
    const termLines = selectTermsForPrompt((spoken||"")+" "+(normalized||"")).map(formatTermLine);
    const rules = formatCorrectionRules();
    const vocab = preferredVocabulary(hits).join("、");
    return [
      "你是估價助理。請依師傅口述產生估價單品項，並把台語／同音錯字轉寫成國語工項。",
      "【最高優先】以下是師傅確認的語音修正，必須先套用，不得改回或忽略：",
      rules,
      "另外請一併套用這些通用規則：平町天花／平定天花／平頂天花／瓶釘天花等近音都是「平釘天花」；數字後面的「瓶」（如六瓶、8瓶）在施工估價裡是「坪」，瓶數是坪數。中文數字請轉成阿拉伯數字（六坪→6 坪、十二坪→12 坪、兩組→2 組、四千五→4500、三萬五→35000）。",
      "【慣用詞彙】請優先使用以下已修正的專有名詞與單位：" + vocab,
      "本機已先行套用這些規則。下方「師傅口述」是修正後的文字；語音辨識原稿僅供對照。",
      "中文語音辨識常把台語術語聽成同音或近音的錯字，例如把「紅毛土」寫成「洪毛土／紅毛兔／宏毛土」，把「米知」（公尺）寫成「米之／米突／米吐」。請依發音近似度，對照下面的術語表還原成國語標準名稱。術語表沒有的不要臆造新工項或新單價。",
      "只使用下面「單價目錄」裡的工項（水電、木工、油漆）。不得虛構工項。",
      "估價單不要列出工種分類。請自行判斷工種並對到目錄。",
      "數量、單位、材料與工法都要從口述解析並正確填入 name、qty、unit。「米知」「米突」「米之」當公尺。「紅毛土」「洪毛土」「紅毛兔」是水泥。",
      "若師傅有說出單價（例如「一坪四千五」「單價 3800」「每坪三千八百元」「一組二千五」「4500 一坪」），該項目的 unitPrice 必須用口述單價，不要改回目錄行情。若只說某一項的總價（「這項總共三萬」）且能對到該項目，則 unitPrice = 總價÷數量。電話、地址門牌、220V／110V 不是單價。沒有口述單價時，目錄有對應的項目 unitPrice 必須等於目錄行情，pending=false。",
      "目錄沒有對應：name 用標準名稱，unitPrice 必須是 0，pending=true（畫面會標「待填」）。不得虛構單價。目錄沒有的工項（例如電器櫃、側邊櫃、網路迴路、燈具迴路）仍要逐筆列出並標 pending，不得省略，也不得改掛到不相干的目錄項。",
      "長句常沒有標點，請依「品名 + 數量 + 單位」在數量與單位處切段，不要把前一項的數量錯接到下一項。開頭若先出現單獨的坪數（例如「30 坪」後面才是平釘天花 25 坪），那是全室面積，不要當成第一個工項的數量；「全室油漆」若沒另說數量，可用這個全室坪數。",
      "「公分／cm」是規格不是數量。例如「天花嵌燈 9 公分 20 顆」數量是 20 顆（或 20 盞），9 公分寫在 note。數字後面的「呎」當作「尺」。坎燈／崁燈是嵌燈。參邊櫃是側邊櫃。跳色就是跳色，不要改成調色。",
      "若口述有提到客戶資料，一併填入 customer。沒有說到的欄位必須留空白字串，不得虛構姓名、電話、地址、區域、建築形式或樓層。",
      "區域只允許「都會」或「偏遠」。建築形式只允許「公寓」「大樓」「透天」「廠辦」「其他」。樓層寫成「3樓」這種形式即可。",
      "只回一個 JSON 物件，格式：",
      '{"rewritten":"水泥補 2 公尺，平釘天花板 8 坪","items":[{"code":"W-101","name":"平釘天花板(矽酸鈣板)","qty":8,"unit":"坪","unitPrice":4400,"pending":false,"note":""}],"customer":{"customer":"","phone":"","address":"","region":"","building":"","floor":""},"note":""}',
      "rewritten 是給師傅確認的國語轉寫（不要只重複錯字原文）。",
      "單價目錄（代碼|品名|單位|行情）：",
      catalogForPrompt(),
      "台語／同音術語表（本機已先篩過相關條目，並保留核心詞）：",
      termLines.join("\n"),
      "師傅口述（辨識原文，可能含同音錯字）：",
      spoken,
      "本機初步正規化（供參考，仍請依發音判斷）：",
      normalized,
      "語音辨識原稿（未修正，僅供對照，解析請以修正後文字為準）：",
      (original != null && String(original) !== String(spoken) ? String(original) : "（與修正後相同）")
    ].join("\n");
  }
  function adoptAiItems(raw) {
    const list = Array.isArray(raw) ? raw : (raw && raw.items) || [];
    const out = [];
    for (const it of list) {
      if (!it) continue;
      const cat = itemByCode(it.code);
      if (cat) {
        const row = lineFromCode(cat.code, it.qty, it.unit || cat.unit);
        // 先採用目錄行情，口述單價由 attachSpokenPrices 依語音覆寫，避免 AI 虛構單價
        row.unitPrice = midPrice(cat);
        row.pending = false;
        if (it.note) row.note = String(it.note);
        out.push(row);
      } else {
        const name = String(it.name || "未命名項目").trim() || "未命名項目";
        out.push(pendingLine(name, it.qty, it.unit, it.note || "單價庫沒有對應行情"));
      }
    }
    return out;
  }

  function isLongTranscript(text) {
    const s = String(text || "");
    const unitHits = (s.match(/[0-9零〇一二兩三四五六七八九十百千萬]+\s*(?:坪|尺|呎|組|口|迴|盞|顆|式|個|處|公尺)/g) || []).length;
    return s.length >= 80 || unitHits >= 8;
  }
  async function defaultAi(prompt) {
    if (typeof state.aiHandler === "function") return state.aiHandler(prompt);
    const claude = window.claude && typeof window.claude.use === "function" ? window.claude.use("sample") : null;
    const long = isLongTranscript(state.raw || prompt);
    const opts = { modelTier: "quick", max_tokens: 4096, timeoutMs: long ? 60000 : 30000 };
    if (claude && typeof claude.json === "function") return claude.json(prompt, opts);
    throw Object.assign(new Error("no-ai"), { code: "needs_api_key" });
  }
  function itemKey(it) {
    const name = String((it && (it.name || "")) || "").replace(/\s+/g, "");
    return (it && it.code ? String(it.code) : "") + "|" + name;
  }
  function namesOverlap(a, b) {
    const x = String(a || "").replace(/\s+/g, "");
    const y = String(b || "").replace(/\s+/g, "");
    if (!x || !y) return false;
    return x === y || x.indexOf(y) >= 0 || y.indexOf(x) >= 0;
  }
  function mergeMissingLocal(aiItems, localItems) {
    const out = (aiItems || []).slice();
    for (const loc of localItems || []) {
      const hit = out.some((it) => (loc.code && it.code && loc.code === it.code) || namesOverlap(it.name, loc.name));
      if (!hit) out.push(loc);
    }
    return out;
  }
  function fallbackBannerText() {
    const e = state.lastAiError;
    const code = e && e.code;
    const reasons = {
      quota_exceeded: "今日雲端次數已用完",
      rate_limited: "雲端暫時忙碌",
      timeout: "雲端回覆太久",
      invalid_json: "雲端回覆無法整理成估價單",
      empty_completion: "雲端回覆無法整理成估價單",
      upstream_error: "雲端連線沒有成功",
      unavailable: "雲端連線沒有成功",
      origin_rejected: "這個頁面目前用不上雲端分析",
      needs_api_key: "這個頁面目前用不上雲端分析"
    };
    const why = code && reasons[code];
    const head = why ? ("雲端分析沒有成功（" + why + "），") : "雲端分析沒有成功，";
    return head + "已改用本機用語對照產生估價單。還沒對到行情的會標待填。若要修改，請下載 Excel 後自己改。";
  }

  async function generateFromText(text, opts) {
    const original = String(text || "").trim();
    if (!original) throw Object.assign(new Error("empty"), { code: "empty" });
    const corr = applySpeechCorrections(original);
    const raw = corr.text;
    const norm = normalizeAnswer(raw);
    state.rawOriginal = original;
    state.raw = raw;
    state.correctionHits = corr.hits;
    state.normalized = norm.text;
    state.hits = norm.hits;
    const ta = $("#speech");
    if (ta) ta.value = raw;
    const force = opts && opts.forceFallback;
    if (!force) {
      try {
        const data = await defaultAi(buildPrompt(raw, norm.text, original, corr.hits));
        let items = adoptAiItems(data);
        attachSpokenPrices(items, raw);
        const local = localParse(raw);
        if (local && local.items && local.items.length) {
          items = mergeMissingLocal(items, local.items);
        }
        if (items.length) {
          state.lastAiError = null;
          state.items = items;
          state.source = "ai";
          const rw = data && data.rewritten != null ? String(data.rewritten).trim() : "";
          state.rewritten = rw || norm.text;
          adoptCustomer(data && data.customer, raw + " " + original);
          persist();
          return { ok: true, source: "ai", items };
        }
      } catch (e) {
        state.lastAiError = e;
      }
    }
    const local = localParse(raw);
    state.items = local.items;
    state.source = "fallback";
    state.rewritten = local.text || norm.text;
    adoptCustomer(null, raw + " " + original);
    persist();
    return { ok: true, source: "fallback", items: local.items };
  }

  function setStatus(msg, isErr) {
    const el = $("#status");
    if (!el) return;
    el.textContent = msg || "";
    el.classList.toggle("err", !!isErr);
  }
  function setExportStatus(msg, isErr) {
    const el = $("#export-status");
    if (!el) return;
    el.textContent = msg || "";
    el.classList.toggle("err", !!isErr);
  }

  function showView(name) {
    const q = $("#quote");
    if (name === "quote") {
      if (q) q.classList.add("on");
      renderQuote();
      setExportStatus("");
      persist();
      updateGuidance();
      if (q) q.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
      try {
        if (location.hash !== "#quote") history.pushState({ maye: "quote" }, "", "#quote");
      } catch (e) {}
      return;
    }
    closeQuoteModal();
    const top = document.querySelector("header.top") || $("#home");
    if (top && typeof top.scrollIntoView === "function") top.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
    else window.scrollTo(0, 0);
  }

  function isZeroNumericInput(el) {
    if (!el || el.disabled || el.readOnly) return false;
    if (el.tagName !== "INPUT") return false;
    const typ = (el.type || "text").toLowerCase();
    if (!["number", "text", "tel", "search", ""].includes(typ)) return false;
    if (el.dataset && el.dataset.noZeroClear === "1") return false;
    const mode = (el.getAttribute("inputmode") || "").toLowerCase();
    return typ === "number" || mode === "decimal" || mode === "numeric" ||
      /(?:qty|up|price|floor)/i.test(el.className + " " + (el.dataset.f || ""));
  }
  function isZeroishValue(v) {
    const t = String(v ?? "").trim().replace(/,/g, "");
    if (t === "" || t === "-" || t === ".") return false;
    if (!/^[+-]?[0-9]+(?:\.[0-9]+)?$/.test(t)) return false;
    return Number(t) === 0;
  }
  function bindZeroClear(root) {
    (root || document).addEventListener("focusin", (e) => {
      const el = e.target;
      if (!isZeroNumericInput(el)) return;
      if (isZeroishValue(el.value)) {
        el.dataset.prevZero = el.value;
        el.value = "";
      }
    });
    (root || document).addEventListener("focusout", (e) => {
      const el = e.target;
      if (!isZeroNumericInput(el)) return;
      if (el.value === "" && el.dataset.prevZero != null) {
        el.value = el.dataset.prevZero;
      }
      delete el.dataset.prevZero;
      if (el.dataset.sync) syncRowFromInput(el);
    });
  }

  function renderLines() { renderSheet(); }
  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function syncRowFromInput(el) {
    const tr = el.closest("[data-id]");
    if (!tr) return;
    const row = state.items.find((r) => r.id === tr.dataset.id);
    if (!row) return;
    const f = el.dataset.f;
    if (f === "qty" || f === "unitPrice") {
      const n = parseFloat(String(el.value).replace(/,/g, ""));
      row[f] = Number.isFinite(n) ? n : 0;
      if (f === "unitPrice" && row.unitPrice > 0) row.pending = false;
    } else if (f === "name" || f === "unit") {
      row[f] = el.value;
    }
    renderTotals();
    const amt = tr.querySelector(".amt");
    if (amt) amt.textContent = fmt(lineAmount(row));
    persistSoon();
  }
  function renderTotals() { renderSheet(); }
  function renderMeta() { renderSheet(); }
  function setLiveSpeech(text, show) {
    const box = $("#live-speech");
    const lab = $("#live-speech-text");
    if (!box) return;
    if (show) {
      box.hidden = false;
      if (lab) lab.textContent = text ? String(text) : "正在聽您說話…";
    } else {
      box.hidden = true;
      if (lab) lab.textContent = "";
    }
  }
  function renderSpoken() {
    const el = $("#spoken-box");
    if (el) { el.innerHTML = ""; el.hidden = true; }
    const q = $("#quote");
    if (q && q.classList.contains("on")) setLiveSpeech("", false);
  }
  function renderQuote() {
    renderSpoken();
    renderSheet();
    const isFb = state.source === "fallback";
    const banText = isFb ? fallbackBannerText() : "";
    document.querySelectorAll("#fallback-banner, #fallback-banner-modal").forEach((ban) => {
      ban.classList.toggle("on", isFb);
      if (isFb && banText) ban.textContent = banText;
    });
    updateTotalBanner();
    updateGuidance();
    const taxTxt = state.tax ? "已含 5% 營業稅。" : "未加營業稅。";
    const note = $("#tax-note");
    if (note) note.textContent = taxTxt + "若要改數量或單價，請下載 Excel 自己改。點預覽可以看完整報價單。";
    const noteM = $("#tax-note-modal");
    if (noteM) noteM.textContent = taxTxt + "若要改數量或單價，請下載 Excel 自己改。預覽可以用手指左右滑，或兩指放大。";
  }

  function visibleMetaLines() {
    const labels = Object.fromEntries(META_FIELDS.map((f) => [f.k, f.label]));
    const lines = [];
    for (const f of META_FIELDS) {
      if (!state.show[f.k]) continue;
      const v = String(state.meta[f.k] || "").trim();
      if (!v) continue;
      lines.push(labels[f.k] + "：" + v);
    }
    return lines;
  }
  function quoteSheetHtml() {
    const t = totals();
    const meta = visibleMetaLines().map((l) => `<div class="qs-meta-line">${esc(l)}</div>`).join("");
    const rows = state.items.map((row, i) => {
      const pending = !!row.pending;
      const spoken = !!row.spokenPrice;
      const price = pending && !(Number(row.unitPrice) > 0) ? "待填" : fmt(row.unitPrice);
      return `<tr>
        <td class="num">${i + 1}</td>
        <td class="name">${esc(row.name)}${pending ? '<span class="qs-pending">待填</span>' : ""}${spoken ? '<span class="qs-spoken">口述單價</span>' : ""}</td>
        <td class="num">${esc(row.qty)}</td>
        <td>${esc(row.unit)}</td>
        <td class="num">${price}</td>
        <td class="num">${fmt(lineAmount(row))}</td>
      </tr>`;
    }).join("");
    return `<header class="qs-head">${BRAND_ZH}</header>
      <div class="qs-body">
        ${meta ? `<div class="qs-meta">${meta}</div>` : ""}
        <table class="qs-table">
          <thead>
            <tr>
              <th class="num">項次</th>
              <th>項目</th>
              <th class="num">數量</th>
              <th>單位</th>
              <th class="num">單價</th>
              <th class="num">複價</th>
            </tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="6">還沒有項目，請回到上方再說一次或打字後產生估價單。</td></tr>'}</tbody>
        </table>
        <div class="qs-totals">
          <div><span>小計</span><span>${fmt(t.sub)}</span></div>
          ${state.tax ? `<div><span>營業稅 5%</span><span>${fmt(t.tax)}</span></div>` : `<div><span>營業稅</span><span>未加</span></div>`}
          <div class="grand"><span>合計</span><span>${fmt(t.total)}</span></div>
        </div>
        <p class="qs-foot">單價依市場行情，可再自行調整。沒有行情者標示待填。</p>
      </div>`;
  }
  function renderSheet() {
    const html = quoteSheetHtml();
    document.querySelectorAll(".quote-sheet").forEach((box) => { box.innerHTML = html; });
  }
  function exportText() {
    const t = totals();
    const lines = [BRAND_ZH, ""];
    if (state.raw || state.rawOriginal) {
      lines.push("辨識原文：" + (state.raw || state.rawOriginal));
      if (state.rawOriginal && state.raw && state.rawOriginal !== state.raw) {
        lines.push("語音原稿：" + state.rawOriginal);
      }
      lines.push("轉寫國語：" + (state.rewritten || state.normalized || ""));
      lines.push("");
    }
    const meta = visibleMetaLines();
    if (meta.length) { lines.push(...meta, ""); }
    lines.push("品名\t數量\t單位\t單價\t複價");
    for (const r of state.items) {
      const tag = (r.pending ? "（待填）" : "") + (r.spokenPrice ? "（口述單價）" : "");
      lines.push([r.name + tag, r.qty, r.unit, r.unitPrice, lineAmount(r)].join("\t"));
    }
    lines.push("");
    lines.push("小計\t" + t.sub);
    if (state.tax) lines.push("營業稅 5%\t" + t.tax);
    lines.push("合計\t" + t.total);
    lines.push("");
    lines.push("單價依市場行情，可再自行調整。沒有行情者標示待填。如需修改，請下載 Excel 後自行調整。");
    return lines.join("\n");
  }
  function lineShareUrl() {
    return "https://line.me/R/share?text=" + encodeURIComponent(exportText());
  }

  async function copyText() {
    const text = exportText();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text; document.body.appendChild(ta); ta.select();
        document.execCommand("copy"); ta.remove();
      }
      setExportStatus("已複製估價單文字。");
      return text;
    } catch (e) {
      setExportStatus("複製失敗，請改用手動選取。", true);
      throw e;
    }
  }

  async function loadExcelJS() {
    if (window.ExcelJS) return window.ExcelJS;
    await new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "exceljs.min.js?v=4.7";
      s.onload = res; s.onerror = () => rej(new Error("exceljs"));
      document.head.appendChild(s);
    });
    if (!window.ExcelJS) throw new Error("exceljs");
    return window.ExcelJS;
  }
  function saveBlob(name, blob) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }
  function exportName(ext) {
    const n = (state.meta.customer || "未命名").replace(/[\\/:*?"<>|\s]+/g, "").slice(0, 20) || "未命名";
    const d = new Date();
    const ds = d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
    return `${BRAND_ZH}_${n}_${ds}.${ext}`;
  }
  async function exportXlsx() {
    const ExcelJS = await loadExcelJS();
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("估價單");
    const t = totals();
    let r = 1;
    ws.getCell(r, 1).value = BRAND_ZH; ws.getCell(r, 1).font = { bold: true, size: 16 }; r++;
    for (const line of visibleMetaLines()) { ws.getCell(r, 1).value = line; r++; }
    r++;
    const headers = ["項次", "品名", "數量", "單位", "單價", "複價", "備註"];
    headers.forEach((h, i) => { const c = ws.getCell(r, i + 1); c.value = h; c.font = { bold: true }; });
    r++;
    const firstData = r;
    state.items.forEach((row, i) => {
      ws.getCell(r, 1).value = i + 1;
      ws.getCell(r, 2).value = row.name + (row.pending ? "（待填）" : "") + (row.spokenPrice ? "（口述單價）" : "");
      ws.getCell(r, 3).value = Number(row.qty) || 0;
      ws.getCell(r, 4).value = row.unit;
      ws.getCell(r, 5).value = Number(row.unitPrice) || 0;
      ws.getCell(r, 6).value = { formula: "C" + r + "*E" + r, result: lineAmount(row) };
      ws.getCell(r, 3).numFmt = "0.##";
      ws.getCell(r, 5).numFmt = "#,##0";
      ws.getCell(r, 6).numFmt = "#,##0";
      ws.getCell(r, 7).value = row.note || (row.spokenPrice ? "口述單價" : "");
      r++;
    });
    const lastData = Math.max(firstData, r - 1);
    r++;
    const subRow = r;
    const sumRef = "F" + firstData + ":F" + lastData;
    ws.getCell(r, 5).value = "小計"; ws.getCell(r, 5).font = { bold: true };
    ws.getCell(r, 6).value = { formula: "SUM(" + sumRef + ")", result: t.sub };
    ws.getCell(r, 6).numFmt = "#,##0";
    r++;
    let taxRow = 0;
    if (state.tax) {
      taxRow = r;
      ws.getCell(r, 5).value = "營業稅 5%";
      ws.getCell(r, 6).value = { formula: "ROUND(F" + subRow + "*0.05,0)", result: t.tax };
      ws.getCell(r, 6).numFmt = "#,##0";
      r++;
    }
    ws.getCell(r, 5).value = "合計"; ws.getCell(r, 5).font = { bold: true };
    ws.getCell(r, 6).value = { formula: taxRow ? ("F" + subRow + "+F" + taxRow) : ("F" + subRow), result: t.total };
    ws.getCell(r, 6).numFmt = "#,##0";
    ws.getCell(r, 6).font = { bold: true, size: 14 };
    r += 2;
    ws.getCell(r, 1).value = "單價依市場行情，可再自行調整。沒有行情者標示待填。在 Excel 裡改數量或單價，複價、小計、營業稅與合計會自動重算。";
    ws.mergeCells(r, 1, r, 7);
    ws.columns = [{ width: 8 }, { width: 28 }, { width: 10 }, { width: 10 }, { width: 12 }, { width: 12 }, { width: 24 }];
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveBlob(exportName("xlsx"), blob);
    setExportStatus("已匯出 Excel。");
    return blob;
  }

  function printHtml() { return quoteSheetHtml(); }
  function crc32(buf) {
    let c = ~0;
    const tbl = crc32.tbl || (crc32.tbl = (function () {
      const t = new Uint32Array(256);
      for (let n = 0; n < 256; n++) {
        let k = n;
        for (let i = 0; i < 8; i++) k = k & 1 ? 0xedb88320 ^ (k >>> 1) : k >>> 1;
        t[n] = k;
      }
      return t;
    })());
    for (let i = 0; i < buf.length; i++) c = tbl[(c ^ buf[i]) & 255] ^ (c >>> 8);
    return ~c >>> 0;
  }
  function deflateRaw(data) {
    // stored (uncompressed) deflate blocks — valid zlib-compatible when wrapped; here raw for PNG
    const chunks = [];
    let i = 0;
    while (i < data.length) {
      const n = Math.min(0xffff, data.length - i);
      const last = (i + n >= data.length) ? 1 : 0;
      const block = new Uint8Array(5 + n);
      block[0] = last;
      block[1] = n & 255; block[2] = (n >> 8) & 255;
      const inv = 0xffff - n;
      block[3] = inv & 255; block[4] = (inv >> 8) & 255;
      block.set(data.subarray(i, i + n), 5);
      chunks.push(block);
      i += n;
    }
    const len = chunks.reduce((s, c) => s + c.length, 0);
    const out = new Uint8Array(len);
    let o = 0;
    for (const c of chunks) { out.set(c, o); o += c.length; }
    return out;
  }
  function pngFromCanvas(canvas) {
    const w = canvas.width, h = canvas.height;
    const ctx = canvas.getContext("2d");
    const img = ctx.getImageData(0, 0, w, h).data;
    const raw = new Uint8Array((w * 4 + 1) * h);
    for (let y = 0; y < h; y++) {
      raw[y * (w * 4 + 1)] = 0;
      raw.set(img.subarray(y * w * 4, (y + 1) * w * 4), y * (w * 4 + 1) + 1);
    }
    const comp = deflateRaw(raw);
    function chunk(type, data) {
      const t = Array.from(type).map((c) => c.charCodeAt(0));
      const out = new Uint8Array(12 + data.length);
      const dv = new DataView(out.buffer);
      dv.setUint32(0, data.length);
      out[4] = t[0]; out[5] = t[1]; out[6] = t[2]; out[7] = t[3];
      out.set(data, 8);
      const crcSrc = out.subarray(4, 8 + data.length);
      dv.setUint32(8 + data.length, crc32(crcSrc));
      return out;
    }
    const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    const ihdr = new Uint8Array(13);
    const dv = new DataView(ihdr.buffer);
    dv.setUint32(0, w); dv.setUint32(4, h); ihdr[8] = 8; ihdr[9] = 6;
    const parts = [sig, chunk("IHDR", ihdr), chunk("IDAT", comp), chunk("IEND", new Uint8Array(0))];
    const len = parts.reduce((s, p) => s + p.length, 0);
    const png = new Uint8Array(len);
    let o = 0; for (const p of parts) { png.set(p, o); o += p.length; }
    return png;
  }
  function pdfFromPngs(pngs, pageW, pageH) {
    // Minimal PDF with image XObjects. Use Flate stored streams already in PNG? We'll embed PNG as-is is hard.
    // Instead wrap uncompressed RGB? Simpler: embed PNG bytes using a DCT? 
    // Use PDF with device-less XObject by converting to raw? Too heavy.
    // We'll build a simple PDF that uses /Image with Flate decoded pixel data... skip,
    // and use data URLs via a print window as primary, plus a real PDF if toBlob works.
    // Fallback implemented in exportPdf.
    return null;
  }
  async function canvasPages() {
    const W = 1240, H = 1754; // ~150 dpi A4
    const pages = [];
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    const t = totals();
    function newPage() {
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#638280"; ctx.fillRect(0, 0, W, 90);
      ctx.fillStyle = "#fff"; ctx.font = "700 44px 'Noto Sans TC', sans-serif";
      ctx.fillText(BRAND_ZH, 56, 62);
      return 130;
    }
    let y = newPage();
    ctx.fillStyle = "#1c2a28";
    ctx.font = "400 28px 'Noto Sans TC', sans-serif";
    for (const line of visibleMetaLines()) {
      ctx.fillText(line, 56, y); y += 40;
    }
    if (visibleMetaLines().length) y += 10;
    const cols = [56, 130, 620, 760, 900, 1040];
    const heads = ["項次", "品名", "數量", "單位", "單價", "複價"];
    ctx.font = "700 24px 'Noto Sans TC', sans-serif";
    ctx.fillStyle = "#4a5c59";
    heads.forEach((h, i) => ctx.fillText(h, cols[i], y));
    y += 16; ctx.strokeStyle = "#d5dedc"; ctx.beginPath(); ctx.moveTo(56, y); ctx.lineTo(1184, y); ctx.stroke();
    y += 36;
    ctx.fillStyle = "#1c2a28"; ctx.font = "400 26px 'Noto Sans TC', sans-serif";
    function flush() {
      const c = document.createElement("canvas");
      c.width = W; c.height = H;
      c.getContext("2d").drawImage(canvas, 0, 0);
      pages.push(c);
    }
    state.items.forEach((row, i) => {
      if (y > H - 200) { flush(); y = newPage(); }
      const name = row.name + (row.pending ? "（待填）" : "") + (row.spokenPrice ? "（口述單價）" : "");
      ctx.fillText(String(i + 1), cols[0], y);
      ctx.fillText(name.slice(0, 16), cols[1], y);
      ctx.fillText(String(row.qty), cols[2], y);
      ctx.fillText(String(row.unit), cols[3], y);
      ctx.fillText(fmt(row.unitPrice), cols[4], y);
      ctx.fillText(fmt(lineAmount(row)), cols[5], y);
      y += 42;
    });
    y += 20;
    ctx.font = "700 28px 'Noto Sans TC', sans-serif";
    ctx.fillText("小計  " + fmt(t.sub), 800, y); y += 40;
    if (state.tax) { ctx.fillText("營業稅 5%  " + fmt(t.tax), 800, y); y += 40; }
    ctx.font = "800 34px 'Noto Sans TC', sans-serif";
    ctx.fillStyle = "#2f4543";
    ctx.fillText("合計  " + fmt(t.total), 800, y);
    flush();
    return pages;
  }
  function pngToPdf(pngs, wPt, hPt) {
    // Embed each PNG as a PDF XObject using /Filter /FlateDecode is messy.
    // Use a well-known approach: PDF with image as JPEG if we can.
    // We'll construct PDF 1.4 with XObject Image, ColorSpace /DeviceRGB, 8bit, raw? too big.
    // Simpler reliable path: open print sheet. Also try toBlob png zip download? User asked PDF.
    // Implement a tiny PDF with one /Image for JPEG:
    return null;
  }
  async function canvasToJpeg(canvas, q) {
    const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", q || 0.85));
    const buf = new Uint8Array(await blob.arrayBuffer());
    return buf;
  }
  function pdfFromJpegs(jpegs, w, h) {
    // Build a multi-page PDF embedding DCTDecode JPEG
    const objs = [];
    function add(s, bin) {
      objs.push({ s, bin: bin || null });
      return objs.length;
    }
    const kids = [];
    const imgIds = [];
    jpegs.forEach((jpg, i) => {
      const imgNo = add("", jpg); // placeholder, fill later
      imgIds.push(imgNo);
      const pageNo = add("");
      kids.push(pageNo);
    });
    // We'll reconstruct properly with offsets
    const enc = (s) => new TextEncoder().encode(s);
    const parts = [];
    const offsets = [0];
    const push = (u8) => { parts.push(u8); };
    // We'll compute later
    const pieces = [];
    const catalogId = 1, pagesId = 2;
    let nextId = 3;
    const pageIds = [];
    const contentIds = [];
    const imageIds = [];
    jpegs.forEach(() => {
      imageIds.push(nextId++);
      contentIds.push(nextId++);
      pageIds.push(nextId++);
    });
    function objStr(id, body) { return `${id} 0 obj\n${body}\nendobj\n`; }
    let body = "%PDF-1.4\n";
    const bins = [];
    function rec(str, raw) {
      bins.push({ str, raw: raw || null });
    }
    rec(objStr(catalogId, `<< /Type /Catalog /Pages ${pagesId} 0 R >>`));
    rec(objStr(pagesId, `<< /Type /Pages /Count ${jpegs.length} /Kids [${pageIds.map((id) => id + " 0 R").join(" ")}] >>`));
    jpegs.forEach((jpg, i) => {
      const iid = imageIds[i], cid = contentIds[i], pid = pageIds[i];
      rec(objStr(iid, `<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`), jpg);
      rec("\nendstream\nendobj\n");
      const stream = `q ${w} 0 0 ${h} 0 0 cm /Im${i} Do Q`;
      rec(objStr(cid, `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`));
      rec(objStr(pid, `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im${i} ${iid} 0 R >> >> /Contents ${cid} 0 R >>`));
    });
    // assemble with xref
    const chunks = [enc("%PDF-1.4\n")];
    const offs = [0];
    let pos = chunks[0].length;
    const objStarts = [0];
    let cur = "";
    function flushText(t) {
      const u = enc(t);
      chunks.push(u); offs.push(pos); pos += u.length;
    }
    // rebuild cleanly
    const outChunks = [enc("%PDF-1.4\n")];
    let p = outChunks[0].length;
    const xref = [0];
    function write(u8) { outChunks.push(u8); p += u8.length; }
    function writeStr(s) { write(enc(s)); }
    function startObj() { xref.push(p); }
    startObj(); // dummy for obj 0 later
    xref[0] = p; // will reset
    const x = [0];
    function objBegin() { x.push(p); }
    // obj 1 catalog
    objBegin(); writeStr(objStr(1, `<< /Type /Catalog /Pages 2 0 R >>`));
    objBegin(); writeStr(objStr(2, `<< /Type /Pages /Count ${jpegs.length} /Kids [${pageIds.map((id) => id + " 0 R").join(" ")}] >>`));
    jpegs.forEach((jpg, i) => {
      const iid = imageIds[i], cid = contentIds[i], pid = pageIds[i];
      objBegin();
      writeStr(`${iid} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`);
      write(jpg);
      writeStr("\nendstream\nendobj\n");
      const stream = `q ${595.28} 0 0 ${841.89} 0 0 cm /Im${i} Do Q`;
      objBegin(); writeStr(`${cid} 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`);
      objBegin(); writeStr(`${pid} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im${i} ${iid} 0 R >> >> /Contents ${cid} 0 R >>\nendobj\n`);
    });
    const xrefPos = p;
    let xt = `xref\n0 ${x.length + 1}\n`;
    xt += "0000000000 65535 f \n";
    for (const off of x) xt += String(off).padStart(10, "0") + " 00000 n \n";
    xt += `trailer\n<< /Size ${x.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
    writeStr(xt);
    const total = outChunks.reduce((s, c) => s + c.length, 0);
    const out = new Uint8Array(total);
    let o = 0; for (const c of outChunks) { out.set(c, o); o += c.length; }
    return out;
  }
  async function exportPdf() {
    const sheet = $("#print-sheet");
    if (sheet) sheet.innerHTML = printHtml();
    try {
      if (document.fonts && document.fonts.load) {
        try { await document.fonts.load("700 16px 'Noto Sans TC'"); } catch (e) {}
      }
      const pages = await canvasPages();
      const w = pages[0].width, h = pages[0].height;
      const jpegs = [];
      for (const c of pages) jpegs.push(await canvasToJpeg(c, 0.88));
      const pdf = pdfFromJpegs(jpegs, w, h);
      const blob = new Blob([pdf], { type: "application/pdf" });
      saveBlob(exportName("pdf"), blob);
      setExportStatus("已匯出 PDF。");
      return blob;
    } catch (e) {
      console.error(e);
      window.print();
      setExportStatus("已開啟列印，請選擇「儲存為 PDF」。", true);
      return null;
    }
  }

  function micUI(mode) {
    const btn = $("#mic"), lab = $("#mic-lab"), hint = $("#mic-hint");
    if (!btn) return;
    btn.classList.toggle("is-rec", mode === "rec");
    btn.classList.toggle("is-busy", mode === "busy");
    btn.setAttribute("aria-pressed", mode === "rec" ? "true" : "false");
    if (mode === "rec") {
      if (lab) lab.textContent = "講完了";
      btn.setAttribute("aria-label", "講完了，產生估價單");
      if (hint) hint.textContent = "正在聽您說話。講完再按一次這個大按鈕。";
      startRecTimer();
      setLiveSpeech(($("#speech") && $("#speech").value) || "正在聽您說話…", true);
    } else if (mode === "busy") {
      if (lab) lab.textContent = "正在處理";
      btn.setAttribute("aria-label", "正在產生估價單");
      if (hint) hint.textContent = "正在幫您做估價單，請稍候。";
      stopRecTimer();
      setLiveSpeech("", false);
    } else {
      if (lab) lab.textContent = "按這裡開始講";
      btn.setAttribute("aria-label", "按這裡開始講");
      if (hint) hint.textContent = "先按一下開始，講完再按一次";
      stopRecTimer();
      setLiveSpeech("", false);
    }
    updateGuidance(mode);
  }

  function speechCtor() {
    if (state.speechCtorOverride !== undefined) return state.speechCtorOverride;
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }
  function speechSupported() { return !!speechCtor(); }
  function applySpeechSupportUI() {
    const ok = speechSupported();
    const ban = $("#speech-unavail");
    const mic = $("#mic");
    if (ban) {
      ban.hidden = ok;
      ban.classList.toggle("on", !ok);
    }
    if (mic) {
      mic.disabled = !ok;
      if (!ok) mic.setAttribute("aria-disabled", "true");
      else mic.removeAttribute("aria-disabled");
    }
    applyLineBrowserHint();
    if (!ok) setStatus("請改用下面的格子打字。", true);
  }
  function setSpeechSupported(on) {
    if (on === false) state.speechCtorOverride = null;
    else if (on === true) state.speechCtorOverride = undefined;
    applySpeechSupportUI();
    return speechSupported();
  }
  function installSpeechMock(opts) {
    opts = opts || {};
    if (opts.supported === false) {
      state.speechCtorOverride = null;
      applySpeechSupportUI();
      return;
    }
    const text = String(opts.transcript || "");
    function MockRec() {
      this.lang = "";
      this.continuous = false;
      this.interimResults = false;
      this._timer = null;
    }
    MockRec.prototype.start = function () {
      const self = this;
      const fire = (full, isFinal) => {
        const ev = {
          resultIndex: 0,
          results: [ Object.assign([{ transcript: full, confidence: 0.9 }], { isFinal: isFinal, length: 1 }) ]
        };
        ev.results.length = 1;
        if (typeof self.onresult === "function") self.onresult(ev);
      };
      const mid = text.slice(0, Math.max(1, Math.ceil(text.length * 0.45)));
      setTimeout(() => fire(mid, false), 10);
      // keep listening until stop(); also store last final-ready text
      self._pending = text;
    };
    MockRec.prototype.stop = function () {
      const self = this;
      const full = self._pending || text;
      const ev = {
        resultIndex: 0,
        results: [ Object.assign([{ transcript: full, confidence: 0.95 }], { isFinal: true, length: 1 }) ]
      };
      ev.results.length = 1;
      if (typeof self.onresult === "function") self.onresult(ev);
      setTimeout(() => { if (typeof self.onend === "function") self.onend(); }, 10);
    };
    MockRec.prototype.abort = function () {
      if (typeof this.onend === "function") this.onend();
    };
    state.speechCtorOverride = MockRec;
    applySpeechSupportUI();
  }

  async function finishSpeech(text) {
    const t = String(text || "").trim();
    if (!t) {
      if (sessionBackup) { applySnapshot(sessionBackup); sessionBackup = null; persist(); }
      setStatus("沒有聽到內容，已保留原來的資料。請再按下面的大按鈕講一次，或改在下面格子打字。", true);
      micUI("idle");
      return;
    }
    sessionBackup = null;
    const ta = $("#speech");
    if (ta) ta.value = t;
    setStatus("正在幫您做估價單，請稍候。");
    micUI("busy");
    try {
      await generateFromText(t);
      micUI("idle");
      showView("quote");
      setStatus("估價單做好了，請往下看。點預覽可以看完整報價單，或按下載。若要改數字，請選 Excel 再改。");
    } catch (e) {
      micUI("idle");
      setStatus(e && e.code === "empty" ? "請先講內容，或在下面格子打字。" : "這次沒有做成功，請再試一次，或改在下面格子打字。", true);
    }
  }

  function appendFinalTranscript(acc, chunk) {
    const piece = String(chunk || "").trim();
    if (!piece) return String(acc || "");
    const cur = String(acc || "").replace(/\s+$/, "");
    if (!cur) return piece;
    if (/[。．.！!？?；;，,、]$/.test(cur) || /^[。．.！!？?；;，,、]/.test(piece)) return cur + piece;
    return cur + "。" + piece;
  }
  function startBrowserAsr() {
    const Rec = speechCtor();
    if (!Rec) {
      applySpeechSupportUI();
      return;
    }
    const rec = new Rec();
    rec.lang = "zh-TW";
    rec.continuous = true;
    rec.interimResults = true;
    let finalText = "";
    rec.onresult = (ev) => {
      let interim = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const t = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) finalText = appendFinalTranscript(finalText, t);
        else interim += t;
      }
      const ta = $("#speech");
      const shown = (finalText + " " + interim).trim();
      if (ta) ta.value = shown;
      setLiveSpeech(shown || "正在聽您說話…", true);
    };
    rec.onerror = (e) => {
      const code = e && e.error;
      if (state.rec && state.rec._keep && (code === "no-speech" || code === "aborted")) return;
      let msg = "沒有聽清楚。請再按一次大按鈕重講，或改在下面格子打字，也可以用鍵盤上的麥克風。";
      if (code === "not-allowed" || code === "service-not-allowed") {
        msg = "沒有麥克風權限。請到手機或瀏覽器設定，允許這個網站使用麥克風，再按一次按鈕。也可以在下面格子打字。";
      }
      if (isLineBrowser()) msg += " 若您是從 LINE 打開，請點右上角「⋯」，改用外部瀏覽器再開一次。";
      setStatus(msg, true);
      micUI("idle");
      state.rec = null;
    };
    rec.onend = () => {
      if (state.rec && state.rec._keep) {
        try { rec.start(); } catch (e) {
          setTimeout(() => { try { if (state.rec && state.rec._keep) rec.start(); } catch (e2) {} }, 250);
        }
        return;
      }
      const text = ($("#speech") && $("#speech").value) || finalText;
      state.rec = null;
      finishSpeech(text);
    };
    state.rec = { kind: "browser", rec, _keep: true };
    try {
      rec.start();
    } catch (e) {
      state.rec = null;
      micUI("idle");
      let msg = "沒辦法開始聽。請再按一次，或改在下面格子打字。";
      if (isLineBrowser()) msg += " 若您是從 LINE 打開，請點右上角「⋯」，改用外部瀏覽器再開一次。";
      setStatus(msg, true);
      return;
    }
    micUI("rec");
    setStatus("正在聽您說話。您說的話會出現在按鈕下面，講完請再按一次這個大按鈕。");
  }

  function stopBrowserAsr() {
    const r = state.rec;
    if (!r || r.kind !== "browser") return;
    r._keep = false;
    try { r.rec.stop(); } catch (e) { finishSpeech($("#speech") && $("#speech").value); }
  }

  async function beginRecording(opts) {
    opts = opts || {};
    if (state.rec) return;
    if (hasSessionData() && !opts.force) {
      const ok = await confirmNewRecording();
      if (!ok) return;
      sessionBackup = snapshotData();
      clearSession({ keepStore: true });
    }
    startBrowserAsr();
  }
  async function toggleMic() {
    if (!speechSupported()) { applySpeechSupportUI(); return; }
    if (state.rec) { stopBrowserAsr(); return; }
    await beginRecording();
  }

  async function onMake() {
    const text = ($("#speech") && $("#speech").value || "").trim();
    if (!text) { setStatus("請先講內容，或在下面格子打字。", true); return; }
    setStatus("正在幫您做估價單，請稍候。");
    try {
      await generateFromText(text);
      showView("quote");
      setStatus("估價單做好了，請往下看。點預覽可以看完整報價單，或按下載。若要改數字，請選 Excel 再改。");
    } catch (e) {
      setStatus(e && e.code === "empty" ? "請先講內容，或在下面格子打字。" : "這次沒有做成功，請再試一次，或改在下面格子打字。", true);
    }
  }

  function bind() {
    bindZeroClear(document);
    const mic = $("#mic"); if (mic) mic.addEventListener("click", () => toggleMic());
    const make = $("#btn-make"); if (make) make.addEventListener("click", onMake);
    const back = $("#btn-back"); if (back) back.addEventListener("click", () => showView("home"));
    const top = $("#btn-top"); if (top) top.addEventListener("click", () => showView("home"));
    const clr = $("#btn-clear"); if (clr) clr.addEventListener("click", confirmClear);
    const dl = $("#btn-download"); if (dl) dl.addEventListener("click", openDownloadModal);
    const dlM = $("#btn-download-modal"); if (dlM) dlM.addEventListener("click", openDownloadModal);
    
    const preview = $("#quote-preview");
    if (preview) {
      preview.addEventListener("click", () => openQuoteModal());
      preview.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openQuoteModal(); }
      });
    }
    const qClose = $("#btn-quote-close"); if (qClose) qClose.addEventListener("click", () => closeQuoteModal());
    document.querySelectorAll("[data-font]").forEach((el) => {
      el.addEventListener("click", () => setFontSize(el.getAttribute("data-font")));
    });
    const speech = $("#speech");
    if (speech) speech.addEventListener("input", () => persistSoon());
    const modal = $("#modal");
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target && e.target.dataset && e.target.dataset.modalClose) closeModal();
      });
    }
    const qModal = $("#quote-modal");
    if (qModal) {
      qModal.addEventListener("click", (e) => {
        if (e.target && e.target.dataset && e.target.dataset.quoteClose) closeQuoteModal();
      });
    }
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (isDownloadModalOpen()) closeModal();
      else if (isQuoteModalOpen()) closeQuoteModal();
    });
    window.addEventListener("pageshow", (ev) => {
      if (ev.persisted) restoreState();
    });
    window.addEventListener("popstate", () => {
      if (state.items.length || state.raw) {
        const q = $("#quote");
        if (q) q.classList.add("on");
        renderQuote();
      }
    });
  }

  async function loadJson(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(path);
    return res.json();
  }
  async function init() {
    bind();
    renderMeta();
    try {
      const [db, terms, corrections] = await Promise.all([
        loadJson("price_db.json?v=4.7"),
        loadJson("taigi_terms.json?v=4.7"),
        loadJson("user_corrections.json?v=4.7").catch(function () { return null; })
      ]);
      const cat = {};
      for (const k of TRADES) {
        for (const it of (db.trades && db.trades[k]) || []) {
          cat[it.code] = Object.assign({}, it, { trade: k });
        }
      }
      state.catalog = cat;
      state.terms = terms && terms.terms ? terms : { terms: [] };
      state.corrections = (corrections && Array.isArray(corrections.corrections) && corrections.corrections.length)
        ? corrections.corrections
        : DEFAULT_USER_CORRECTIONS.slice();
      TERM_RE = null;
    } catch (e) {
      setStatus("單價或用語資料沒有載入成功。請檢查網路後，重新整理這一頁。", true);
    }
    applySpeechSupportUI();
    applyLineBrowserHint();
    applyUiPrefs(readPrefs(), { save: false });
    try {
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () { scheduleFitBrand(); }).catch(function () {});
      }
    } catch (e) {}
    document.querySelectorAll(".brand-mark-img").forEach(function (img) {
      if (!img.complete) img.addEventListener("load", scheduleFitBrand, { once: true });
    });
    window.addEventListener("resize", scheduleFitBrand);
    restoreState();
    updateGuidance();
    if ((state.items.length || state.raw) && location.hash === "#quote") {
      const q = $("#quote");
      if (q) {
        q.classList.add("on");
        q.scrollIntoView({ block: "start" });
      }
    }
    state.ready = true;
  }

  window.__MAYE__ = {
    generateFromText,
    localParse,
    normalizeAnswer,
    midPrice,
    itemByCode,
    getState: () => state,
    totals,
    exportText,
    quoteSheetHtml,
    renderSheet,
    lineShareUrl,
    exportXlsx,
    exportPdf,
    copyText,
    setTax(v) { state.tax = !!v; renderQuote(); persist(); },
    setMeta(k, v, show) {
      if (k in state.meta) state.meta[k] = v;
      if (show != null) state.show[k] = !!show;
      renderMeta();
      persist();
    },
    addRow(row) { state.items.push(row); renderLines(); renderTotals(); persist(); },
    updateRow(id, patch) {
      const row = state.items.find((r) => r.id === id);
      if (row) Object.assign(row, patch);
      renderLines(); renderTotals(); persist();
      return row;
    },
    removeRow(id) { state.items = state.items.filter((r) => r.id !== id); renderLines(); renderTotals(); persist(); },
    showView,
    setAiHandler(fn) { state.aiHandler = fn; },
    speechSupported,
    setSpeechSupported,
    installSpeechMock,
    applySpeechSupportUI,
    applyLineBrowserHint,
    isLineBrowser,
    setLiveSpeech,
    updateGuidance,
    selectTermsForPrompt,
    catalogList,
    isZeroNumericInput,
    isZeroishValue,
    extractCustomerLocal,
    adoptCustomer,
    applyUserCorrections,
    applySpeechCorrections,
    fallbackBannerText,
    segmentSpeech,
    splitClauses,
    extractPricedTotals,
    appendFinalTranscript,
    extractSpokenPrices,
    attachSpokenPrices,
    parseNumber,
    cnNum,
    correctionList,
    buildPrompt,
    mentionedInSpeech,
    persist,
    restoreState,
    clearSession,
    hasSessionData,
    openDownloadModal,
    closeModal,
    openQuoteModal,
    closeQuoteModal,
    isQuoteModalOpen,
    toggleTheme,
    setFontSize,
    applyUiPrefs,
    readPrefs,
    confirmClear,
    beginRecording,
    fitBrandAndWordmark,
    textInkRect,
    titleGlyphInk,
    ready: () => state.ready
  };
  window.__isZeroNumericInput = isZeroNumericInput;
  window.__isZeroishValue = isZeroishValue;

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
