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
    { re: /全室水電/, code: "P-011" }
  ];

  const state = {
    catalog: {},
    terms: { terms: [] },
    ready: false,
    raw: "",
    normalized: "",
    hits: [],
    items: [],
    tax: true,
    source: "idle",
    meta: { customer: "", address: "", region: "", building: "", floor: "" },
    show: { customer: false, address: false, region: false, building: false, floor: false },
    asrOn: true,
    quotaRemain: null,
    quotaLimit: null,
    rec: null,
    aiHandler: null
  };
  let TERM_MAP = null, TERM_RE = null;

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
    const w = [...(t.spoken || []), ...(t.asr_variants || [])];
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
  function buildPrompt(spoken, normalized) {
    return [
      "你是估價助理。請依師傅口述產生估價單品項。",
      "只使用下面「單價目錄」裡的工項與單價（水電、木工、油漆）。不得虛構或改寫單價。",
      "估價單不要列出工種分類。請自行判斷工種並對到目錄。",
      "數量與單位要從口述解析。『米知』『米突』當公尺。『紅毛土』是水泥。",
      "目錄有對應：填 code、name、qty、unit，unitPrice 必須等於目錄中的行情數字。pending=false。",
      "目錄沒有對應：name 用標準名稱，unitPrice 必須是 0，pending=true（畫面會標「待填」）。",
      "只回一個 JSON 物件，格式：",
      '{"items":[{"code":"W-101","name":"平釘天花板(矽酸鈣板)","qty":8,"unit":"坪","unitPrice":4400,"pending":false,"note":""}],"note":""}',
      "單價目錄（代碼|品名|單位|行情）：",
      catalogForPrompt(),
      "師傅口述：",
      spoken,
      "用語正規化：",
      normalized
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
    const raw = String(text || "").trim();
    if (!raw) throw Object.assign(new Error("empty"), { code: "empty" });
    const norm = normalizeAnswer(raw);
    state.raw = raw;
    state.normalized = norm.text;
    state.hits = norm.hits;
    const force = opts && opts.forceFallback;
    if (!force) {
      try {
        const data = await defaultAi(buildPrompt(raw, norm.text));
        const items = adoptAiItems(data);
        if (items.length) {
          state.items = items;
          state.source = "ai";
          return { ok: true, source: "ai", items };
        }
      } catch (e) {
        state.lastAiError = e;
      }
    }
    const local = localParse(raw);
    state.items = local.items;
    state.source = "fallback";
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
    $$(".view").forEach((v) => v.classList.toggle("on", v.id === name));
    if (name === "quote") renderQuote();
    window.scrollTo(0, 0);
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

  function renderLines() {
    const box = $("#lines");
    if (!box) return;
    box.innerHTML = state.items.map((row) => {
      const pend = row.pending ? '<span class="pending">待填</span>' : "";
      return `<article class="line-card" data-id="${row.id}">
        <div class="name-row"><input type="text" data-f="name" data-sync="1" value="${esc(row.name)}" aria-label="品名">${pend}</div>
        <div class="grid">
          <label class="cell"><span>數量</span><input inputmode="decimal" data-f="qty" data-sync="1" value="${esc(row.qty)}"></label>
          <label class="cell"><span>單位</span><input type="text" data-f="unit" data-sync="1" value="${esc(row.unit)}"></label>
          <label class="cell"><span>單價</span><input inputmode="decimal" data-f="unitPrice" data-sync="1" value="${esc(row.unitPrice)}"></label>
          <div class="cell"><span>複價</span><div class="amt">${fmt(lineAmount(row))}</div></div>
        </div>
        <div class="foot"><button type="button" class="btn ghost" data-del="${row.id}">刪除此列</button></div>
      </article>`;
    }).join("") || '<p class="hint">還沒有項目，請回首頁再說一次，或按「新增一列」。</p>';
  }
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
  }
  function renderTotals() {
    const t = totals();
    const box = $("#totals");
    if (!box) return;
    box.innerHTML =
      `<div><span>小計</span><span>${money(t.sub)}</span></div>` +
      (state.tax ? `<div><span>營業稅 5%</span><span>${money(t.tax)}</span></div>` : `<div><span>營業稅</span><span>未加</span></div>`) +
      `<div class="grand"><span>合計</span><span>${money(t.total)}</span></div>`;
  }
  function renderMeta() {
    const box = $("#meta-fields");
    if (!box) return;
    box.innerHTML = META_FIELDS.map((f) => {
      const show = state.show[f.k] ? "checked" : "";
      let ctl = "";
      if (f.type === "select") {
        const opts = f.options.map((o) => `<option value="${esc(o)}"${state.meta[f.k] === o ? " selected" : ""}>${o || "請選擇"}</option>`).join("");
        ctl = `<select data-meta="${f.k}">${opts}</select>`;
      } else {
        const im = f.inputmode ? ` inputmode="${f.inputmode}"` : "";
        ctl = `<input type="text"${im} data-meta="${f.k}" placeholder="${esc(f.placeholder || "")}" value="${esc(state.meta[f.k] || "")}">`;
      }
      return `<div class="field">
        <label class="lbl">${esc(f.label)}</label>
        <div class="row">${ctl}
          <label class="vis"><input type="checkbox" data-show="${f.k}" ${show}>呈現在估價單</label>
        </div>
      </div>`;
    }).join("");
  }
  function renderSpoken() {
    const el = $("#spoken-box");
    if (!el) return;
    el.textContent = state.raw ? ("口述：「" + state.raw + "」") : "";
  }
  function renderQuote() {
    renderSpoken();
    renderLines();
    renderTotals();
    renderMeta();
    const ban = $("#fallback-banner");
    if (ban) ban.classList.toggle("on", state.source === "fallback");
    const tax = $("#tax");
    if (tax) tax.checked = !!state.tax;
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
  function exportText() {
    const t = totals();
    const lines = ["估價嗎耶通", ""];
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
    lines.push("單價依市場行情，可再自行調整。沒有行情者標示待填。");
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
      s.src = "exceljs.min.js?v=1";
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
    state.items.forEach((row, i) => {
      ws.getCell(r, 1).value = i + 1;
      ws.getCell(r, 2).value = row.name + (row.pending ? "（待填）" : "");
      ws.getCell(r, 3).value = Number(row.qty) || 0;
      ws.getCell(r, 4).value = row.unit;
      ws.getCell(r, 5).value = Number(row.unitPrice) || 0;
      ws.getCell(r, 6).value = lineAmount(row);
      ws.getCell(r, 7).value = row.note || "";
      r++;
    });
    r++;
    ws.getCell(r, 5).value = "小計"; ws.getCell(r, 6).value = t.sub; r++;
    if (state.tax) { ws.getCell(r, 5).value = "營業稅 5%"; ws.getCell(r, 6).value = t.tax; r++; }
    ws.getCell(r, 5).value = "合計"; ws.getCell(r, 6).value = t.total;
    ws.columns = [{ width: 8 }, { width: 28 }, { width: 10 }, { width: 10 }, { width: 12 }, { width: 12 }, { width: 24 }];
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveBlob(exportName("xlsx"), blob);
    setExportStatus("已匯出 Excel。");
    return blob;
  }

  function printHtml() {
    const t = totals();
    const meta = visibleMetaLines().map((l) => `<div>${esc(l)}</div>`).join("");
    const rows = state.items.map((row, i) =>
      `<tr><td>${i + 1}</td><td>${esc(row.name)}${row.pending ? "（待填）" : ""}</td><td style="text-align:right">${esc(row.qty)}</td><td>${esc(row.unit)}</td><td style="text-align:right">${fmt(row.unitPrice)}</td><td style="text-align:right">${fmt(lineAmount(row))}</td></tr>`
    ).join("");
    return `<h1>估價嗎耶通</h1>${meta}
      <table width="100%" cellspacing="0" cellpadding="6" style="border-collapse:collapse;margin-top:12px">
        <thead><tr><th>項次</th><th>品名</th><th>數量</th><th>單位</th><th>單價</th><th>複價</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="text-align:right">小計 ${fmt(t.sub)}${state.tax ? "<br>營業稅 5% " + fmt(t.tax) : ""}<br><b>合計 ${fmt(t.total)}</b></p>
      <p>單價依市場行情，可再自行調整。沒有行情者標示待填。</p>`;
  }
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
    btn.classList.toggle("is-rec", mode === "rec");
    btn.classList.toggle("is-busy", mode === "busy");
    btn.setAttribute("aria-pressed", mode === "rec" ? "true" : "false");
    if (mode === "rec") { lab.textContent = "停止"; hint.textContent = "說完再點一下，就會產生估價單"; }
    else if (mode === "busy") { lab.textContent = "辨識中"; hint.textContent = "正在辨識，請稍候…"; }
    else { lab.textContent = "開始說"; hint.textContent = "點一下開始，再說一次結束"; }
  }

  function asrWanted() {
    const box = $("#asr-on");
    const row = $("#quota-row");
    if (!box || !box.checked || (row && row.hidden)) return false;
    if (state.quotaRemain != null && state.quotaRemain <= 0) return false;
    const ai = window.__SHIFU_AI__;
    return !!(ai && typeof ai.proxyConfigured === "function" && ai.proxyConfigured() && typeof ai.transcribe === "function");
  }
  function applyQuota(q) {
    if (!q) return;
    if (q.remaining != null) state.quotaRemain = Math.max(0, Number(q.remaining));
    if (q.limit != null) state.quotaLimit = Number(q.limit);
    const txt = $("#quota-txt"), box = $("#asr-on");
    const row = $("#quota-row");
    if (row && state.quotaRemain != null) row.hidden = false;
    if (txt && state.quotaRemain != null) {
      txt.textContent = state.quotaRemain <= 0
        ? "本月台語辨識次數已用完，改用瀏覽器辨識或打字。"
        : ("本月還剩 " + state.quotaRemain + " 次");
    }
    if (box && state.quotaRemain != null && state.quotaRemain <= 0) box.checked = false;
  }
  async function refreshQuota() {
    const row = $("#quota-row");
    const ai = window.__SHIFU_AI__;
    if (!(ai && typeof ai.proxyConfigured === "function" && ai.proxyConfigured() && typeof ai.getAsrQuota === "function")) {
      if (row) row.hidden = true;
      return;
    }
    if (row) row.hidden = false;
    try {
      const q = await ai.getAsrQuota({ plan: "basic" });
      applyQuota(q);
    } catch (e) {
      const txt = $("#quota-txt");
      if (txt) txt.textContent = "暫時查不到剩餘次數，仍可嘗試；失敗會改打字或瀏覽器辨識。";
    }
  }

  async function finishSpeech(text) {
    const t = String(text || "").trim();
    if (!t) { setStatus("沒有辨識到文字，請再說一次或改打字。", true); micUI("idle"); return; }
    const ta = $("#speech");
    if (ta) ta.value = t;
    setStatus("正在產生估價單…");
    micUI("busy");
    try {
      await generateFromText(t);
      micUI("idle");
      showView("quote");
      setStatus("估價單已產生，請再檢查數量與單價。");
    } catch (e) {
      micUI("idle");
      setStatus(e && e.code === "empty" ? "請先說內容或打字。" : "產生失敗，請再試一次。", true);
    }
  }

  function startBrowserAsr() {
    const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Rec) {
      setStatus("這個瀏覽器不能語音辨識，請直接打字。", true);
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
      if (ta) ta.value = (finalText + " " + interim).trim();
    };
    rec.onerror = () => { setStatus("瀏覽器辨識沒有成功，請改打字。", true); micUI("idle"); state.rec = null; };
    rec.onend = () => {
      if (state.rec && state.rec._keep) { try { rec.start(); } catch (e) {} return; }
      const text = ($("#speech") && $("#speech").value) || finalText;
      state.rec = null;
      finishSpeech(text);
    };
    state.rec = { kind: "browser", rec, _keep: true };
    rec.start();
    micUI("rec");
    setStatus("正在聽…說完請再點麥克風。");
  }

  function stopBrowserAsr() {
    const r = state.rec;
    if (!r || r.kind !== "browser") return;
    r._keep = false;
    try { r.rec.stop(); } catch (e) { finishSpeech($("#speech") && $("#speech").value); }
  }

  function startYating() {
    const ai = window.__SHIFU_AI__;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
      setStatus("這個瀏覽器不能錄音給台語辨識，改用瀏覽器辨識或打字。", true);
      return startBrowserAsr();
    }
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const types = ["audio/mp4", "audio/aac", "audio/webm;codecs=opus", "audio/webm"];
      const mime = (MediaRecorder.isTypeSupported && types.find((t) => MediaRecorder.isTypeSupported(t))) || "";
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      const chunks = [];
      rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
      rec.start(250);
      state.rec = { kind: "yating", rec, stream, chunks, mime: rec.mimeType || mime, started: Date.now() };
      micUI("rec");
      setStatus("台語辨識錄音中…說完再點一下。");
    }).catch(() => {
      setStatus("無法開啟麥克風，請改打字，或到瀏覽器允許麥克風。", true);
      micUI("idle");
    });
  }

  function stopYating() {
    const y = state.rec;
    if (!y || y.kind !== "yating") return;
    state.rec = null;
    const finished = new Promise((res) => {
      if (!y.rec || y.rec.state === "inactive") return res();
      y.rec.onstop = () => res();
      try { y.rec.stop(); } catch (e) { res(); }
      setTimeout(res, 1500);
    });
    micUI("busy");
    setStatus("台語辨識中…");
    finished.then(async () => {
      try { y.stream && y.stream.getTracks().forEach((t) => t.stop()); } catch (e) {}
      const blob = new Blob(y.chunks || [], { type: y.mime || "audio/webm" });
      if (blob.size < 200) { setStatus("沒有錄到聲音，請再試一次或改打字。", true); micUI("idle"); return; }
      try {
        const r = await window.__SHIFU_AI__.transcribe(blob, {
          plan: "basic",
          duration: Math.max(1, Math.round((Date.now() - (y.started || Date.now())) / 1000))
        });
        applyQuota(r);
        const text = String(r && r.text || "").trim();
        await finishSpeech(text);
      } catch (e) {
        if (e && e.remaining != null) applyQuota(e);
        const why = e && e.code === "quota_exceeded" ? "本月台語辨識次數已用完" : "台語辨識沒有成功";
        setStatus(why + "，請改打字或再試瀏覽器辨識。", true);
        micUI("idle");
        const box = $("#asr-on"); if (box) box.checked = false;
      }
    });
  }

  function toggleMic() {
    if (state.rec) {
      if (state.rec.kind === "yating") stopYating();
      else stopBrowserAsr();
      return;
    }
    if (asrWanted()) startYating();
    else startBrowserAsr();
  }

  async function onMake() {
    const text = ($("#speech") && $("#speech").value || "").trim();
    if (!text) { setStatus("請先說內容或打字。", true); return; }
    setStatus("正在產生估價單…");
    try {
      await generateFromText(text);
      showView("quote");
      setStatus("估價單已產生，請再檢查數量與單價。");
    } catch (e) {
      setStatus("請先說內容或打字。", true);
    }
  }

  function bind() {
    bindZeroClear(document);
    $("#mic").addEventListener("click", toggleMic);
    $("#btn-make").addEventListener("click", onMake);
    $("#btn-back").addEventListener("click", () => showView("home"));
    $("#btn-add").addEventListener("click", () => {
      state.items.push(pendingLine("新項目", 1, "式", "手動新增"));
      renderLines(); renderTotals();
    });
    $("#lines").addEventListener("click", (e) => {
      const id = e.target && e.target.dataset && e.target.dataset.del;
      if (!id) return;
      state.items = state.items.filter((r) => r.id !== id);
      renderLines(); renderTotals();
    });
    $("#lines").addEventListener("input", (e) => {
      if (e.target && e.target.dataset && e.target.dataset.sync) syncRowFromInput(e.target);
    });
    $("#tax").addEventListener("change", (e) => { state.tax = !!e.target.checked; renderTotals(); });
    $("#meta-fields").addEventListener("input", (e) => {
      const el = e.target;
      if (el.dataset.meta) state.meta[el.dataset.meta] = el.value;
    });
    $("#meta-fields").addEventListener("change", (e) => {
      const el = e.target;
      if (el.dataset.meta) state.meta[el.dataset.meta] = el.value;
      if (el.dataset.show) state.show[el.dataset.show] = !!el.checked;
    });
    $("#btn-copy").addEventListener("click", () => copyText().catch(() => {}));
    $("#btn-line").addEventListener("click", () => { window.open(lineShareUrl(), "_blank", "noopener"); });
    $("#btn-xlsx").addEventListener("click", () => exportXlsx().catch((e) => { console.error(e); setExportStatus("匯出 Excel 失敗。", true); }));
    $("#btn-pdf").addEventListener("click", () => exportPdf().catch((e) => { console.error(e); setExportStatus("匯出 PDF 失敗。", true); }));
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
      const [db, terms] = await Promise.all([
        loadJson("price_db.json?v=1"),
        loadJson("taigi_terms.json?v=1")
      ]);
      const cat = {};
      for (const k of TRADES) {
        for (const it of (db.trades && db.trades[k]) || []) {
          cat[it.code] = Object.assign({}, it, { trade: k });
        }
      }
      state.catalog = cat;
      state.terms = terms && terms.terms ? terms : { terms: [] };
      TERM_RE = null;
      state.ready = true;
    } catch (e) {
      setStatus("單價或用語資料載入失敗，請檢查網路後再重新整理。", true);
    }
    refreshQuota();
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
    lineShareUrl,
    exportXlsx,
    exportPdf,
    copyText,
    setTax(v) { state.tax = !!v; const el = $("#tax"); if (el) el.checked = state.tax; renderTotals(); },
    setMeta(k, v, show) {
      if (k in state.meta) state.meta[k] = v;
      if (show != null) state.show[k] = !!show;
      renderMeta();
    },
    addRow(row) { state.items.push(row); renderLines(); renderTotals(); },
    updateRow(id, patch) {
      const row = state.items.find((r) => r.id === id);
      if (row) Object.assign(row, patch);
      renderLines(); renderTotals();
      return row;
    },
    removeRow(id) { state.items = state.items.filter((r) => r.id !== id); renderLines(); renderTotals(); },
    showView,
    setAiHandler(fn) { state.aiHandler = fn; },
    applyQuota,
    refreshQuota,
    catalogList,
    isZeroNumericInput,
    isZeroishValue,
    ready: () => state.ready
  };
  window.__isZeroNumericInput = isZeroNumericInput;
  window.__isZeroishValue = isZeroishValue;

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
