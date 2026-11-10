/* 師傅估價通・獨立網頁版 AI／下載／儲存轉接層（由 build.py 注入） */
(function () {
  "use strict";
  const AI_KEY_LS = "shifu-ai-key-v1";
  const AI_NOTICE = "此功能需要設定 AI 金鑰";
  const DEVICE_LS = "shifu-device-id-v1";
  // 部署 Cloudflare Worker 後，把下面改成正式網址（例如 https://shifu-ai-proxy.<帳號>.workers.dev）
  // 空白或含 PLACEHOLDER 時視為尚未設定，沒有本機金鑰就走 needs_api_key（本機規則後援仍可用）
  const PROXY_URL = "https://shifu-quote-proxy.shifu-quote.workers.dev";

  let proxyUrlOverride = null; // null = 用預設 PROXY_URL；設成 "" 可關閉代理

  function getApiKey() {
    try {
      return String(localStorage.getItem(AI_KEY_LS) || "").trim();
    } catch (e) {
      return "";
    }
  }

  function setApiKey(v) {
    try {
      const s = String(v || "").trim();
      if (s) localStorage.setItem(AI_KEY_LS, s);
      else localStorage.removeItem(AI_KEY_LS);
    } catch (e) {}
  }

  function setProxyUrl(u) {
    // 明確傳入字串（含空字串）就覆寫；null/undefined 恢復預設
    if (u == null) proxyUrlOverride = null;
    else proxyUrlOverride = String(u).trim();
  }

  function getProxyUrl() {
    if (proxyUrlOverride != null) return proxyUrlOverride;
    return (PROXY_URL || "").trim();
  }

  function proxyConfigured() {
    const u = getProxyUrl();
    return !!(u && /^https?:\/\//i.test(u) && !/PLACEHOLDER/i.test(u));
  }

  function proxyEndpoint(path) {
    const base = getProxyUrl().replace(/\/+$/, "");
    if (!path) return base || "";
    if (/^https?:\/\//i.test(path)) return path;
    return base + (path.charAt(0) === "/" ? path : "/" + path);
  }

  function deviceId() {
    try {
      let id = localStorage.getItem(DEVICE_LS) || "";
      if (!id) {
        id = (crypto.randomUUID && crypto.randomUUID()) ||
          ("dev-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10));
        localStorage.setItem(DEVICE_LS, id);
      }
      return id;
    } catch (e) {
      return "";
    }
  }

  function accountId() {
    try {
      if (window.__SHIFU_ACCOUNT_ID) return String(window.__SHIFU_ACCOUNT_ID).trim();
    } catch (e) {}
    return "";
  }

  function currentPlan() {
    try {
      if (typeof window.__shifuPlan === "function") return window.__shifuPlan();
      if (typeof window.isPro === "function") return window.isPro() ? "pro" : "basic";
      const ds = document.documentElement && document.documentElement.dataset && document.documentElement.dataset.plan;
      if (ds === "pro" || ds === "basic") return ds;
      const v = localStorage.getItem("shifu-plan-v1") || "";
      if (v === "pro" || v === "basic") return v;
    } catch (e) {}
    return "basic";
  }

  function makeErr(code, message) {
    const e = new Error(message || code);
    e.code = code;
    return e;
  }

  function mapProxyError(data, status) {
    const err = data && data.error ? data.error : {};
    const code = err.code || (
      status === 429 ? "rate_limited" :
      status === 403 ? "origin_rejected" :
      status === 413 ? "input_too_large" :
      status === 401 ? "not_granted" :
      "upstream_error"
    );
    const fallback = {
      needs_api_key: "請到設定填入 AI 金鑰，或等候雲端代理開放。",
      not_granted: "AI 金鑰無效或沒有權限，請到設定檢查。",
      rate_limited: "AI 使用過於頻繁或已達上限，請稍後再試。",
      quota_exceeded: "AI 或語音次數已用完，請稍後再試或改用本機方式。",
      timeout: "服務回覆逾時，請稍後再試。",
      unavailable: "雲端代理目前無法使用。",
      upstream_error: "雲端服務連線或回應錯誤，請稍後再試。",
      invalid_json: "請求或回覆格式無法解讀。",
      empty_completion: "AI 沒有回覆內容。",
      input_too_large: "內容太大，請縮短文字、少傳圖片或把錄音錄短一點。",
      origin_rejected: "這個網頁來源不得使用雲端代理。",
      cancelled: "已取消",
    };
    return makeErr(code, err.message || fallback[code] || fallback.upstream_error);
  }

  async function blobToBase64(blob) {
    const buf = await blob.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let bin = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(bin);
  }

  function stripJsonFence(text) {
    let t = String(text || "").trim();
    const m = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (m) t = m[1].trim();
    return t;
  }

  function parseJsonLoose(text) {
    const t = stripJsonFence(text);
    try {
      return JSON.parse(t);
    } catch (e1) {
      const a = t.indexOf("{"),
        b = t.lastIndexOf("}");
      if (a >= 0 && b > a) {
        try {
          return JSON.parse(t.slice(a, b + 1));
        } catch (e2) {}
      }
      throw makeErr("invalid_json", "AI 回覆不是合法 JSON");
    }
  }

  function extractMessageText(data) {
    return (data && data.content || [])
      .filter((c) => c && c.type === "text")
      .map((c) => c.text)
      .join("\n")
      .trim();
  }

  // Model IDs (verified 2026-11-10 against Anthropic docs):
  // Sonnet 4 (dated 20250514) retired 2026-06-15 → use claude-sonnet-5-5
  // Haiku 4.5 dated 20251001 still Active
  // Docs: platform.claude.com/docs/en/about-claude/models
  //       platform.claude.com/docs/en/about-claude/model-deprecations
  function pickModel(tier) {
    if (tier === "quick") return "claude-haiku-4-5-20251001";
    if (tier === "complex") return "claude-sonnet-5-5";
    return "claude-sonnet-5-5";
  }

  async function readFetchError(res) {
    let data = null, raw = "";
    try { raw = await res.text(); } catch (e) {}
    if (raw) {
      try { data = JSON.parse(raw); } catch (e) {}
    }
    if (data && data.error) throw mapProxyError(data, res.status);
    if (res.status === 401 || res.status === 403) throw makeErr("not_granted", "AI 金鑰無效或沒有權限，請到設定檢查。");
    if (res.status === 429) throw makeErr("rate_limited", "AI 使用量已達上限，請稍後再試。");
    throw makeErr("upstream_error", "AI 服務回應錯誤（" + res.status + "）" + (raw ? "：" + raw.slice(0, 180) : ""));
  }

  async function callAnthropicDirect(key, content, options) {
    let res;
    try {
      res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: pickModel(options && options.modelTier),
          max_tokens: 8096,
          messages: [{ role: "user", content }],
        }),
        signal: options && options.signal,
      });
    } catch (net) {
      if (options && options.signal && options.signal.aborted) {
        throw makeErr("cancelled", "已停止分析。");
      }
      throw makeErr(
        "upstream_error",
        "無法連線到 AI 服務（瀏覽器可能阻擋跨域請求）。請確認已設定 AI 金鑰，或改用支援瀏覽器直連的代理。"
      );
    }
    if (!res.ok) await readFetchError(res);
    const data = await res.json();
    const text = extractMessageText(data);
    if (!text) throw makeErr("empty_completion", "AI 沒有回覆內容");
    return parseJsonLoose(text);
  }

  async function callAnthropicProxy(content, options) {
    let res;
    try {
      res = await fetch(proxyEndpoint("/v1/messages"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          modelTier: (options && options.modelTier) || "quick",
          max_tokens: 2048,
          messages: [{ role: "user", content }],
        }),
        signal: options && options.signal,
      });
    } catch (net) {
      if (options && options.signal && options.signal.aborted) {
        throw makeErr("cancelled", "已停止分析。");
      }
      throw makeErr("upstream_error", "無法連線到雲端 AI 代理，請確認網路或改在設定填入本機金鑰。");
    }
    if (!res.ok) await readFetchError(res);
    const data = await res.json();
    if (data && data.ok === false) throw mapProxyError(data, res.status);
    const text = extractMessageText(data);
    if (!text) throw makeErr("empty_completion", "AI 沒有回覆內容");
    return parseJsonLoose(text);
  }

  async function callAnthropic(prompt, options) {
    const content = [];
    const images = (options && options.images) || [];
    for (const img of images) {
      const blob = img instanceof Blob ? img : null;
      if (!blob) continue;
      const data = await blobToBase64(blob);
      const media =
        blob.type && /^image\//.test(blob.type) ? blob.type : "image/jpeg";
      content.push({
        type: "image",
        source: { type: "base64", media_type: media, data },
      });
    }
    content.push({
      type: "text",
      text:
        String(prompt || "") +
        "\n\n請只回覆一個合法 JSON 物件，不要加說明文字，也不要用 markdown 程式碼區塊包起來。",
    });

    const key = getApiKey();
    if (key) return callAnthropicDirect(key, content, options);
    if (proxyConfigured()) return callAnthropicProxy(content, options);
    throw makeErr("needs_api_key", AI_NOTICE);
  }

  function asrHeaders() {
    const h = { "X-Device-Id": deviceId(), "X-Shifu-Plan": currentPlan() };
    const acct = accountId();
    if (acct) h["X-Account-Id"] = acct;
    return h;
  }

  async function getAsrQuota(opts) {
    if (!proxyConfigured()) throw makeErr("unavailable", "尚未設定雲端語音代理。");
    const plan = (opts && opts.plan) || currentPlan();
    let res;
    try {
      const headers = asrHeaders();
      headers["X-Shifu-Plan"] = plan;
      res = await fetch(proxyEndpoint("/v1/asr/quota"), { headers, signal: opts && opts.signal });
    } catch (e) {
      throw makeErr("upstream_error", "無法查詢台語辨識剩餘次數，請稍後再試。");
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) {
      const err = mapProxyError(data, res.status);
      if (data && data.remaining != null) err.remaining = data.remaining;
      if (data && data.limit != null) err.limit = data.limit;
      throw err;
    }
    return data;
  }

  async function transcribe(blob, opts) {
    if (!proxyConfigured()) throw makeErr("unavailable", "尚未設定雲端語音代理。");
    if (!blob || !blob.size) throw makeErr("invalid_json", "沒有錄音可以辨識。");
    const fd = new FormData();
    const type = (blob.type || "application/octet-stream").split(";")[0];
    const ext = /mp4|m4a|aac|quicktime/i.test(type) ? "m4a" : /mpeg|mp3/i.test(type) ? "mp3" : /wav/i.test(type) ? "wav" : /webm/i.test(type) ? "webm" : "dat";
    const file = blob instanceof File ? blob : new File([blob], "clip." + ext, { type: blob.type || type });
    fd.append("file", file, file.name || ("clip." + ext));
    fd.append("plan", (opts && opts.plan) || currentPlan());
    const headers = asrHeaders();
    if (opts && opts.plan) headers["X-Shifu-Plan"] = opts.plan;
    if (opts && opts.duration) headers["X-Audio-Duration"] = String(opts.duration);
    let res;
    try {
      res = await fetch(proxyEndpoint("/v1/asr"), {
        method: "POST",
        headers,
        body: fd,
        signal: opts && opts.signal,
      });
    } catch (e) {
      if (opts && opts.signal && opts.signal.aborted) throw makeErr("cancelled", "已取消辨識。");
      throw makeErr("upstream_error", "無法連線到台語辨識代理，請改用瀏覽器辨識。");
    }
    const data = await res.json().catch(() => ({}));
    if ((!res.ok && res.status !== 202) || data.ok === false) {
      const err = mapProxyError(data, res.status);
      if (data && data.remaining != null) err.remaining = data.remaining;
      if (data && data.limit != null) err.limit = data.limit;
      throw err;
    }
    if (data && data.pending && data.uid) {
      return await waitAsrJob(data, headers, opts);
    }
    return data;
  }

  async function waitAsrJob(first, headers, opts) {
    const uid = first.uid;
    const t0 = Date.now();
    let last = first;
    while (Date.now() - t0 < 45000) {
      if (opts && opts.signal && opts.signal.aborted) throw makeErr("cancelled", "已取消辨識。");
      await new Promise((r) => setTimeout(r, 1000));
      let res;
      try {
        res = await fetch(proxyEndpoint("/v1/asr/jobs/" + encodeURIComponent(uid)), { headers, signal: opts && opts.signal });
      } catch (e) {
        if (opts && opts.signal && opts.signal.aborted) throw makeErr("cancelled", "已取消辨識。");
        continue;
      }
      const data = await res.json().catch(() => ({}));
      if ((!res.ok && res.status !== 202) || data.ok === false) {
        const err = mapProxyError(data, res.status);
        if (data && data.remaining != null) err.remaining = data.remaining;
        if (data && data.limit != null) err.limit = data.limit;
        throw err;
      }
      last = data;
      if (!data.pending && (data.text != null || data.status === "completed")) return data;
    }
    const err = makeErr("timeout", "台語辨識逾時，請再試一次或改用瀏覽器辨識。");
    if (last && last.remaining != null) err.remaining = last.remaining;
    throw err;
  }

  function createSample() {
    return {
      async limits() {
        // 不強制金鑰：讓呼叫端進入 sample.json，由 json() 顯示「需要設定 AI 金鑰」
        return {
          images: {
            maxCount: 10,
            maxInputBytes: 20 * 1024 * 1024,
            maxPixels: 1200000,
          },
        };
      },
      async json(prompt, options) {
        return callAnthropic(prompt, options || {});
      },
    };
  }

  // 下載：不提供 artifact downloads API，讓原有 <a download> 後備路徑運作
  const prevArtifactApi = window.claude;
  window.claude = {
    use(name) {
      if (name === "sample") return createSample();
      if (name === "downloads") return null;
      if (prevArtifactApi && typeof prevArtifactApi.use === "function") {
        try {
          return prevArtifactApi.use(name);
        } catch (e) {
          return null;
        }
      }
      return null;
    },
  };

  // artifact-only storage → localStorage
  if (!window.storage) {
    window.storage = {
      async get(key) {
        try {
          const v = localStorage.getItem(String(key));
          return v == null ? null : { key, value: v };
        } catch (e) {
          return null;
        }
      },
      async set(key, value) {
        try {
          localStorage.setItem(String(key), String(value));
          return { ok: true };
        } catch (e) {
          return { ok: false };
        }
      },
      async delete(key) {
        try {
          localStorage.removeItem(String(key));
          return { ok: true };
        } catch (e) {
          return { ok: false };
        }
      },
      async list() {
        try {
          const keys = [];
          for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i));
          return { keys };
        } catch (e) {
          return { keys: [] };
        }
      },
    };
  }

  const api = {
    getApiKey,
    setApiKey,
    AI_KEY_LS,
    AI_NOTICE,
    proxyConfigured,
    setProxyUrl,
    getProxyUrl,
    deviceId,
    getAsrQuota,
    transcribe,
  };
  Object.defineProperty(api, "PROXY_URL", {
    configurable: true,
    enumerable: true,
    get: getProxyUrl,
    set: setProxyUrl,
  });
  window.__SHIFU_AI__ = api;

  function wireAiKeyField() {
    const input = document.getElementById("ai-key");
    if (input) {
      input.value = getApiKey();
      const sync = () => setApiKey(input.value);
      input.addEventListener("change", sync);
      input.addEventListener("blur", sync);
      const clearBtn = document.getElementById("ai-key-clear");
      if (clearBtn) {
        clearBtn.addEventListener("click", () => {
          input.value = "";
          setApiKey("");
        });
      }
    }
    // 只有真的設定了代理網址才提示，避免還沒部署時多出一段文字
    if (proxyConfigured()) {
      const hint = document.getElementById("ai-key-proxy-hint") || (function () {
        if (!input) return null;
        const p = document.createElement("p");
        p.id = "ai-key-proxy-hint";
        p.className = "hint";
        input.parentNode && input.parentNode.appendChild(p);
        return p;
      })();
      if (hint) hint.textContent = "已接上雲端代理，可以不填本機金鑰。若要自己的額度，仍可在這裡填入金鑰。";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wireAiKeyField);
  } else {
    wireAiKeyField();
  }
})();
