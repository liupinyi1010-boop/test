/* 師傅說 ShifuSay v4.9.6：開場動畫、訂閱狀態、設定視窗。
   音效全部用 Web Audio API 即時合成，不載入任何外部音檔。 */
(function () {
  "use strict";
  var VER = "4.9.7";
  var SUB_KEY = "maye-sub-v1";        // 訂閱狀態（之後由綠界／後端寫入）
  var PREFS_KEY = "maye-ui-prefs";    // 介面偏好（字體、靜音）
  var SEEN_KEY = "maye-splash-v1";    // sessionStorage：這次開啟已看過開場
  var ENTRY_KEY = "maye-entry-v1";    // sessionStorage：從「立即免費體驗3天」進來
  var TRIAL_DAYS = 3;
  var DAY = 86400000;

  function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }

  // ---------- 訂閱狀態 ----------
  function readSub() {
    try {
      var d = JSON.parse(localStorage.getItem(SUB_KEY) || "null");
      return d && typeof d === "object" ? d : null;
    } catch (e) { return null; }
  }
  function subscriptionInfo() {
    var d = readSub();
    if (!d) return { status: "none", start: null, end: null };
    var start = d.start || null, end = d.end || null;
    var endMs = end ? Date.parse(end) : NaN;
    var expired = !isNaN(endMs) && endMs < Date.now();
    if ((d.status === "active" || d.status === "trial") && !expired) return { status: d.status, start: start, end: end };
    return { status: "none", start: start, end: end, expired: expired, was: d.status || null };
  }
  // 之後串接綠界／後端時，只要改這個函式
  function isSubscribed() {
    var s = subscriptionInfo().status;
    return s === "active" || s === "trial";
  }
  function startTrial() {
    if (readSub()) return false; // 已有紀錄（含過期試用）就不重開
    var now = new Date();
    var rec = { status: "trial", start: now.toISOString(), end: new Date(now.getTime() + TRIAL_DAYS * DAY).toISOString(), source: "trial-button" };
    try { localStorage.setItem(SUB_KEY, JSON.stringify(rec)); } catch (e) {}
    return true;
  }
  function canEnterApp() {
    return isSubscribed() || ssGet(ENTRY_KEY) === "trial";
  }

  // ---------- 偏好：靜音 ----------
  function readPrefs() {
    try { var p = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}"); return p && typeof p === "object" ? p : {}; } catch (e) { return {}; }
  }
  function isMuted() { return readPrefs().mute === true; }
  function setMuted(v) {
    var p = readPrefs();
    p.mute = !!v;
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch (e) {}
    return p.mute;
  }
  function reducedMotion() {
    try { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { return false; }
  }

  // ---------- 合成音效 ----------
  var audio = { ctx: null, master: null };
  function audioCtx() {
    if (audio.ctx) return audio.ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      audio.ctx = new AC();
      audio.master = audio.ctx.createGain();
      audio.master.gain.value = 0.55;
      audio.master.connect(audio.ctx.destination);
    } catch (e) { audio.ctx = null; }
    return audio.ctx;
  }
  // 泡泡「啵」：正弦波快速下滑音高＋短促音量包絡
  function playPop(t, pitch) {
    var ctx = audio.ctx; if (!ctx) return;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(pitch, t);
    o.frequency.exponentialRampToValueAtTime(pitch * 0.32, t + 0.09);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.7, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
    o.connect(g); g.connect(audio.master);
    o.start(t); o.stop(t + 0.15);
  }
  function tone(t, freq, dur, type, vol) {
    var ctx = audio.ctx; if (!ctx) return;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || "triangle";
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.3, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(audio.master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  // 自編短旋律（C 大調上行琶音＋收尾和弦），約 1.2 秒
  function playJingle(t) {
    var notes = [523.25, 659.25, 783.99, 880.0, 783.99, 1046.5];
    notes.forEach(function (f, i) { tone(t + i * 0.12, f, 0.2, "triangle", 0.28); });
    var end = t + notes.length * 0.12;
    [523.25, 659.25, 783.99, 1046.5].forEach(function (f) { tone(end, f, 0.6, "triangle", 0.16); });
    tone(t, 130.81, 0.35, "sine", 0.22);
    tone(end, 130.81, 0.6, "sine", 0.22);
    return end + 0.6 - t;
  }
  var POP_TIMES = [0.12, 0.22, 0.32, 0.42, 0.52, 0.62, 0.72, 0.82];
  function playIntroSound(rm) {
    var ctx = audioCtx();
    if (!ctx) return 0;
    try { if (ctx.state === "suspended" && ctx.resume) ctx.resume(); } catch (e) {}
    var t0 = ctx.currentTime + 0.05;
    if (rm) { playPop(t0, 900); playPop(t0 + 0.15, 1150); return 0.2 + playJingle(t0 + 0.3); }
    POP_TIMES.forEach(function (d, i) { playPop(t0 + d, 700 + (i % 4) * 160); });
    return 1.3 + playJingle(t0 + 1.3);
  }

  // ---------- 開場 ----------
  var splash = document.getElementById("splash");
  var params;
  try { params = new URLSearchParams(location.search); } catch (e) { params = null; }
  if (params && params.get("entry") === "trial") {
    ssSet(ENTRY_KEY, "trial");
    startTrial();
    try {
      params.delete("entry");
      var qs = params.toString();
      history.replaceState(history.state, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
    } catch (e) {}
  }
  var showing = !!splash && document.documentElement.getAttribute("data-splash") === "on";
  var state = { done: false, started: false, route: null, soundSec: 0 };

  function syncMute() {
    var btn = document.getElementById("splash-mute");
    var lab = document.getElementById("splash-mute-lab");
    var m = isMuted();
    if (btn) {
      btn.setAttribute("aria-pressed", m ? "true" : "false");
      btn.setAttribute("aria-label", m ? "聲音：關（點一下打開聲音）" : "聲音：開（點一下關閉聲音）");
      btn.classList.toggle("is-muted", m);
    }
    if (lab) lab.textContent = m ? "聲音 關" : "聲音 開";
  }
  function replay() {
    if (!splash) return;
    splash.classList.remove("play");
    void splash.offsetWidth;
    splash.classList.add("play");
  }
  function hideSplash() {
    if (!splash) return;
    splash.classList.add("out");
    setTimeout(function () {
      document.documentElement.removeAttribute("data-splash");
      if (splash && splash.parentNode) splash.parentNode.removeChild(splash);
      var mic = document.getElementById("mic");
      if (mic) { try { mic.focus({ preventScroll: true }); } catch (e) {} }
    }, reducedMotion() ? 0 : 320);
  }
  function finish() {
    if (state.done) return state.route;
    state.done = true;
    ssSet(SEEN_KEY, "1");
    if (canEnterApp()) {
      state.route = "app";
      hideSplash();
    } else {
      state.route = "subscribe";
      api.navigate("subscribe.html?v=" + VER);
    }
    return state.route;
  }
  function start() {
    if (state.started) return;
    state.started = true;
    var rm = reducedMotion();
    var btn = document.getElementById("splash-start");
    if (btn) { btn.disabled = true; btn.classList.add("is-going"); }
    var wait;
    if (isMuted()) {
      wait = rm ? 150 : 600;
    } else {
      if (!rm) replay();
      var sec = playIntroSound(rm);
      state.soundSec = sec;
      wait = Math.round((sec ? sec + 0.15 : (rm ? 0.15 : 0.6)) * 1000);
    }
    setTimeout(finish, Math.min(wait, 4000));
  }

  var api = {
    version: VER,
    isSubscribed: isSubscribed,
    subscriptionInfo: subscriptionInfo,
    startTrial: startTrial,
    canEnterApp: canEnterApp,
    isMuted: isMuted,
    setMuted: setMuted,
    reducedMotion: reducedMotion,
    playIntroSound: playIntroSound,
    start: start,
    finish: finish,
    showing: function () { return showing && !state.done; },
    state: function () { return { done: state.done, started: state.started, route: state.route, soundSec: state.soundSec }; },
    navigate: function (url) { location.replace(url); },
    keys: { SUB_KEY: SUB_KEY, PREFS_KEY: PREFS_KEY, SEEN_KEY: SEEN_KEY, ENTRY_KEY: ENTRY_KEY },
    openSettings: function () { openSettings(); },
    closeSettings: function () { closeSettings(); }
  };
  window.ShifuSay = api;
  window.isSubscribed = isSubscribed;

  if (showing) {
    try {
      syncMute();
      var startBtn = document.getElementById("splash-start");
      var muteBtn = document.getElementById("splash-mute");
      if (startBtn) {
        startBtn.addEventListener("click", start);
        try { startBtn.focus({ preventScroll: true }); } catch (e) {}
      }
      if (muteBtn) muteBtn.addEventListener("click", function () { setMuted(!isMuted()); syncMute(); });
    } catch (e) {
      document.documentElement.removeAttribute("data-splash");
    }
  } else if (splash && splash.parentNode) {
    splash.parentNode.removeChild(splash);
  }

  // ---------- 設定視窗 ----------
  function fmtDate(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.getFullYear() + "/" + String(d.getMonth() + 1).padStart(2, "0") + "/" + String(d.getDate()).padStart(2, "0");
  }
  function renderSettings() {
    var info = subscriptionInfo();
    var st = document.getElementById("set-status");
    var per = document.getElementById("set-period");
    var label = info.status === "active" ? "已訂閱" : info.status === "trial" ? "試用中" : "未訂閱";
    if (st) { st.textContent = label; st.setAttribute("data-status", info.status); }
    if (per) {
      var a = info.start ? fmtDate(info.start) : "", b = info.end ? fmtDate(info.end) : "";
      var txt = "尚無資料";
      if (a || b) {
        var range = (a || "—") + " ～ " + (b || "—");
        if (info.status === "trial") txt = "試用期間\n" + range;
        else if (info.status === "active") txt = range;
        else txt = (info.was === "trial" ? "試用已結束\n" : "已結束\n") + range;
      }
      per.textContent = txt;
    }
    var note = document.getElementById("set-pay-status");
    if (note) note.textContent = "";
  }
  var lastFocus = null;
  function settingsEl() { return document.getElementById("settings-modal"); }
  function openSettings() {
    var m = settingsEl(); if (!m) return;
    renderSettings();
    lastFocus = document.activeElement;
    m.hidden = false;
    document.body.classList.add("settings-open");
    var c = document.getElementById("btn-settings-close");
    setTimeout(function () { if (c) c.focus(); }, 20);
  }
  function closeSettings() {
    var m = settingsEl(); if (!m || m.hidden) return;
    m.hidden = true;
    document.body.classList.remove("settings-open");
    var g = document.getElementById("btn-settings");
    var back = (lastFocus && document.contains(lastFocus)) ? lastFocus : g;
    if (back && back.focus) { try { back.focus({ preventScroll: true }); } catch (e) {} }
  }
  function bindSettings() {
    var gear = document.getElementById("btn-settings");
    var m = settingsEl();
    if (!gear || !m) return;
    gear.addEventListener("click", openSettings);
    m.addEventListener("click", function (e) {
      var t = e.target;
      if (t && t.getAttribute && t.getAttribute("data-settings-close")) { closeSettings(); return; }
      var b = t && t.closest && t.closest(".set-soon");
      if (b) {
        var note = document.getElementById("set-pay-status");
        if (note) note.textContent = "「" + b.getAttribute("data-soon") + "」即將開放，敬請期待。";
      }
    });
    var c = document.getElementById("btn-settings-close");
    if (c) c.addEventListener("click", closeSettings);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !m.hidden) { e.stopPropagation(); closeSettings(); }
    }, true);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bindSettings);
  else bindSettings();
})();
