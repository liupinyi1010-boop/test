/* 估價嗎耶通 — 語音直出估價單 */
(function () {
  "use strict";

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const fmt = (n) => Math.round(Number(n) || 0).toLocaleString("zh-TW");
  const money = (n) => "NT$ " + fmt(n);
  const uid = () => "r" + Math.random().toString(36).slice(2, 9);
  const TAX_RATE = 0.05;
  const TRADES = ["carpentry", "plumbing_electrical", "painting"];
  const EXTRA_ALIASES = [
    { spoken: ["米知", "米突", "米吐", "米嘟"], standard: "公尺", code: null, note: "長度單位 m" },
    { spoken: ["紅毛土", "紅毛塗"], standard: "水泥", code: null, note: "台語 âng-mn̂g-thôo" }
  ];
  const UNITS = ["平方公尺", "公尺", "公分", "台尺", "坪", "尺", "寸", "分", "處", "口", "迴", "盞", "座", "樘", "式", "工", "個", "組", "只", "台", "屋", "米知", "米突", "米"];
  const CN_D = { "零": 0, "〇": 0, "一": 1, "二": 2, "兩": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9 };
  const NUM = "([0-9]+(?:\\.[0-9]+)?|[零〇一二兩三四五六七八九十百]+)";
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
    { re: /輕隔間/, code: "W-201" },
    { re: /木作衣櫃|衣櫃/, code: "W-305" },
    { re: /吊櫃/, code: "W-304" },
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
    { re: /220\s*V|220伏特|冷氣迴路|專用迴路/, code: "E-005" },
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
  const STORE_KEY = "maye-quote-state-v3";
  const PREFS_KEY = "maye-ui-prefs";
  function systemTheme() {
    try {
      return (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
    } catch (e) { return "light"; }
  }
  function readPrefs() {
    try {
      const p = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
      const themeLocked = p.theme === "light" || p.theme === "dark";
      return {
        theme: themeLocked ? p.theme : systemTheme(),
        font: (p.font === "s" || p.font === "m" || p.font === "l") ? p.font : "m",
        themeLocked
      };
    } catch (e) {
      return { theme: systemTheme(), font: "m", themeLocked: false };
    }
  }
  function applyUiPrefs(next, opts) {
    opts = opts || {};
    const cur = readPrefs();
    const theme = (next && (next.theme === "light" || next.theme === "dark")) ? next.theme : cur.theme;
    const font = (next && (next.font === "s" || next.font === "m" || next.font === "l")) ? next.font : cur.font;
    const lockTheme = !!(opts.lockTheme || cur.themeLocked || (next && (next.theme === "light" || next.theme === "dark") && opts.save));
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.setAttribute("data-font", font);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#0E0E0E" : "#EFE8DF");
    const lab = $("#theme-lab");
    if (lab) lab.textContent = theme === "dark" ? "深色" : "明亮";
    const btn = $("#btn-theme");
    if (btn) {
      btn.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
      btn.setAttribute("aria-label", theme === "dark"
        ? "目前是深色模式，按下去改成明亮模式"
        : "目前是明亮模式，按下去改成深色模式");
    }
    document.querySelectorAll("[data-font]").forEach((el) => {
      el.setAttribute("aria-pressed", el.getAttribute("data-font") === font ? "true" : "false");
    });
    if (opts.save) {
      try {
        const o = { font };
        if (lockTheme) o.theme = theme;
        localStorage.setItem(PREFS_KEY, JSON.stringify(o));
      } catch (e) {}
    }
    return { theme, font, themeLocked: lockTheme };
  }
  function toggleTheme() {
    const cur = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    const font = document.documentElement.getAttribute("data-font") || "m";
    applyUiPrefs({ theme: cur === "dark" ? "light" : "dark", font }, { save: true, lockTheme: true });
  }
  function setFontSize(font) {
    const theme = document.documentElement.getAttribute("data-theme") || systemTheme();
    applyUiPrefs({ theme, font }, { save: true });
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
    x = String(x);
    if (/^[0-9.]+$/.test(x)) return parseFloat(x);
    let total = 0, cur = 0;
    for (const ch of x) {
      if (ch in CN_D) cur = CN_D[ch];
      else if (ch === "十") { total += (cur || 1) * 10; cur = 0; }
      else if (ch === "百") { total += (cur || 1) * 100; cur = 0; }
    }
    return total + cur;
  }
  const fmtChi = (v) => String(Math.round(v * 100) / 100);
  function parseNumber(text) {
    const t = String(text || "").trim();
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
    s = s.replace(/[，,。．、；;：:！!？?「」『』“”‘’（）()【】\[\]…—–]/g, " ");
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
  function termTable() {
    if (TERM_RE) return;
    TERM_MAP = new Map();
    for (const t of allTermEntries()) {
      if (t.auto === false) continue;
      for (const w of termWords(t)) {
        const k = String(w || "").trim();
        if (k.length < 2) continue;
        if (/^[a-z]{1,3}$/i.test(k) && !/^cm$/i.test(k)) continue;
        if (!TERM_MAP.has(k)) TERM_MAP.set(k, t);
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
    if (TERM_RE) out = out.replace(TERM_RE, (m) => {
      const t = TERM_MAP.get(m); if (!t) return m;
      const unsure = termUnsure(t), std = String(t.standard || ""), code = t.code || null;
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
      unitPrice: price, pending: false, note: ""
    };
  }
  function pendingLine(name, qty, unit, note) {
    return {
      id: uid(), code: null, name: name || "未命名項目",
      qty: qty != null && Number(qty) > 0 ? Number(qty) : 1,
      unit: unit || "式", unitPrice: 0, pending: true, note: note || "單價庫沒有對應行情"
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

  const UNIT_ALT = { "米": "公尺", "米知": "公尺", "米突": "公尺", "台尺": "尺" };
  function unitCanon(u) {
    const t = String(u || "").trim();
    return UNIT_ALT[t] || t;
  }
  function findQtys(text) {
    const src = String(text || "");
    const unitPat = UNITS.slice().sort((a, b) => b.length - a.length)
      .map((u) => u.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
    const re = new RegExp(`${NUM}\\s*(${unitPat})`, "g");
    const out = [];
    let m;
    while ((m = re.exec(src))) {
      const n = parseNumber(m[1]);
      if (n != null) out.push({ qty: n, unit: unitCanon(m[2]), index: m.index, raw: m[0] });
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

  function localParse(text) {
    const norm = normalizeAnswer(text || "");
    const src = norm.text;
    const used = new Set();
    const items = [];
    function take(code, at, unitHint) {
      if (!code || used.has(code) || !itemByCode(code)) return;
      const it = itemByCode(code);
      const q = nearestQty(src, at == null ? src.search(it.item) : at, unitHint || it.unit);
      items.push(lineFromCode(code, q.qty > 0 ? q.qty : 1, q.unit || it.unit));
      used.add(code);
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
    // 水泥／紅毛土：三個工種目錄沒有「水泥」单项，標待填
    if (/水泥/.test(src) && !items.some((it) => /水泥/.test(it.name))) {
      const q = nearestQty(src, src.indexOf("水泥"), "公尺");
      items.push(pendingLine("水泥", q.qty, q.unit || "公尺", "單價庫（水電／木工／油漆）沒有水泥行情"));
    }
    if (!items.length && src) {
      items.push(pendingLine(src.slice(0, 20), 1, "式", "無法對應目錄，請師傅自行修正"));
    }
    return { text: src, hits: norm.hits, items, local: true };
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
  function buildPrompt(spoken, normalized, original) {
    const termLines = selectTermsForPrompt((spoken||"")+" "+(normalized||"")).map(formatTermLine);
    const rules = formatCorrectionRules();
    return [
      "你是估價助理。請依師傅口述產生估價單品項，並把台語／同音錯字轉寫成國語工項。",
      "【最高優先】以下是師傅確認的語音修正，必須先套用，不得改回或忽略：",
      rules,
      "本機已先行套用這些規則。下方「師傅口述」是修正後的文字；語音辨識原稿僅供對照。",
      "中文語音辨識常把台語術語聽成同音或近音的錯字，例如把「紅毛土」寫成「洪毛土／紅毛兔／宏毛土」，把「米知」（公尺）寫成「米之／米突／米吐」。請依發音近似度，對照下面的術語表還原成國語標準名稱。術語表沒有的不要臆造新工項或新單價。",
      "只使用下面「單價目錄」裡的工項與單價（水電、木工、油漆）。不得虛構或改寫單價。",
      "估價單不要列出工種分類。請自行判斷工種並對到目錄。",
      "數量與單位要從口述解析。「米知」「米突」「米之」當公尺。「紅毛土」「洪毛土」「紅毛兔」是水泥。",
      "目錄有對應：填 code、name、qty、unit，unitPrice 必須等於目錄中的行情數字。pending=false。",
      "目錄沒有對應：name 用標準名稱，unitPrice 必須是 0，pending=true（畫面會標「待填」）。",
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
        // 即使 AI 帶了單價，也強制改回行情，避免虛構
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

  async function defaultAi(prompt) {
    if (typeof state.aiHandler === "function") return state.aiHandler(prompt);
    const claude = window.claude && typeof window.claude.use === "function" ? window.claude.use("sample") : null;
    if (claude && typeof claude.json === "function") return claude.json(prompt, { modelTier: "quick" });
    throw Object.assign(new Error("no-ai"), { code: "needs_api_key" });
  }

  async function generateFromText(text, opts) {
    const original = String(text || "").trim();
    if (!original) throw Object.assign(new Error("empty"), { code: "empty" });
    const corr = applyUserCorrections(original);
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
        const data = await defaultAi(buildPrompt(raw, norm.text, original));
        const items = adoptAiItems(data);
        if (items.length) {
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
    document.querySelectorAll("#fallback-banner, #fallback-banner-modal").forEach((ban) => {
      ban.classList.toggle("on", isFb);
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
      const price = pending && !(Number(row.unitPrice) > 0) ? "待填" : fmt(row.unitPrice);
      return `<tr>
        <td class="num">${i + 1}</td>
        <td class="name">${esc(row.name)}${pending ? '<span class="qs-pending">待填</span>' : ""}</td>
        <td class="num">${esc(row.qty)}</td>
        <td>${esc(row.unit)}</td>
        <td class="num">${price}</td>
        <td class="num">${fmt(lineAmount(row))}</td>
      </tr>`;
    }).join("");
    return `<header class="qs-head">估價嗎耶通</header>
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
    const lines = ["估價嗎耶通", ""];
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
      const tag = r.pending ? "（待填）" : "";
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
      s.src = "exceljs.min.js?v=4.1";
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
    return `估價嗎耶通_${n}_${ds}.${ext}`;
  }
  async function exportXlsx() {
    const ExcelJS = await loadExcelJS();
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("估價單");
    const t = totals();
    let r = 1;
    ws.getCell(r, 1).value = "估價嗎耶通"; ws.getCell(r, 1).font = { bold: true, size: 16 }; r++;
    for (const line of visibleMetaLines()) { ws.getCell(r, 1).value = line; r++; }
    r++;
    const headers = ["項次", "品名", "數量", "單位", "單價", "複價", "備註"];
    headers.forEach((h, i) => { const c = ws.getCell(r, i + 1); c.value = h; c.font = { bold: true }; });
    r++;
    const firstData = r;
    state.items.forEach((row, i) => {
      ws.getCell(r, 1).value = i + 1;
      ws.getCell(r, 2).value = row.name + (row.pending ? "（待填）" : "");
      ws.getCell(r, 3).value = Number(row.qty) || 0;
      ws.getCell(r, 4).value = row.unit;
      ws.getCell(r, 5).value = Number(row.unitPrice) || 0;
      ws.getCell(r, 6).value = { formula: "C" + r + "*E" + r, result: lineAmount(row) };
      ws.getCell(r, 3).numFmt = "0.##";
      ws.getCell(r, 5).numFmt = "#,##0";
      ws.getCell(r, 6).numFmt = "#,##0";
      ws.getCell(r, 7).value = row.note || "";
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
      ctx.fillText("估價嗎耶通", 56, 62);
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
      const name = row.name + (row.pending ? "（待填）" : "");
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
        if (ev.results[i].isFinal) finalText += t;
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
    const themeBtn = $("#btn-theme"); if (themeBtn) themeBtn.addEventListener("click", toggleTheme);
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
        loadJson("price_db.json?v=4.1"),
        loadJson("taigi_terms.json?v=4.1"),
        loadJson("user_corrections.json?v=4.1").catch(function () { return null; })
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
    ready: () => state.ready
  };
  window.__isZeroNumericInput = isZeroNumericInput;
  window.__isZeroishValue = isZeroishValue;

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
