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
    const m = t.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (m) t = m[1].trim();
    else t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    return t;
  }

  function stripTrailingCommas(s) {
    return String(s || "").replace(/,\s*([\]}])/g, "$1");
  }

  function tryRepairJson(s) {
    let t = stripTrailingCommas(String(s || "").trim());
    t = t.replace(/,?\s*"[^"\\]*(?:\\.[^"\\]*)*"\s*:\s*[^,}\]]*$/, "");
    t = t.replace(/,?\s*"[^"\\]*(?:\\.[^"\\]*)*"\s*$/, "");
    t = t.replace(/,\s*$/, "");
    const stack = [];
    let inStr = false, esc = false;
    for (let i = 0; i < t.length; i++) {
      const ch = t[i];
      if (inStr) {
        if (esc) esc = false;
        else if (ch === "\\") esc = true;
        else if (ch === '"') inStr = false;
        continue;
      }
      if (ch === '"') inStr = true;
      else if (ch === "{") stack.push("}");
      else if (ch === "[") stack.push("]");
      else if (ch === "}" || ch === "]") {
        if (stack.length && stack[stack.length - 1] === ch) stack.pop();
      }
    }
    if (inStr) t += '"';
    while (stack.length) t += stack.pop();
    return stripTrailingCommas(t);
  }

  function parseJsonLoose(text) {
    const t = stripJsonFence(text);
    const attempts = [t, stripTrailingCommas(t)];
    const a = t.indexOf("{"), b = t.lastIndexOf("}");
    if (a >= 0 && b > a) attempts.push(t.slice(a, b + 1), stripTrailingCommas(t.slice(a, b + 1)));
    const iArr = t.indexOf("["), jArr = t.lastIndexOf("]");
    if (iArr >= 0 && jArr > iArr && (a < 0 || iArr < a)) {
      attempts.push(t.slice(iArr, jArr + 1));
    }
    attempts.push(tryRepairJson(t));
    if (a >= 0) attempts.push(tryRepairJson(t.slice(a)));
    const seen = new Set();
    for (const cand of attempts) {
      if (!cand || seen.has(cand)) continue;
      seen.add(cand);
      try {
        return JSON.parse(cand);
      } catch (e) {}
    }
    throw makeErr("invalid_json", "AI 回覆不是合法 JSON");
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

  function wantedMaxTokens(options, fallback) {
    const n = Number(options && (options.max_tokens || options.maxTokens));
    return Number.isFinite(n) && n > 0 ? Math.max(256, Math.min(n, 8192)) : fallback;
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
          max_tokens: wantedMaxTokens(options, 8096),
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
    try {
      const parsed = parseJsonLoose(text);
      if (data && data.stop_reason) parsed._stop_reason = data.stop_reason;
      return parsed;
    } catch (e) {
      if (data && data.stop_reason === "max_tokens") {
        throw makeErr("invalid_json", "AI 回覆被截斷，將再試一次");
      }
      throw e;
    }
  }

  async function callAnthropicProxy(content, options) {
    let res;
    try {
      res = await fetch(proxyEndpoint("/v1/messages"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          modelTier: (options && options.modelTier) || "quick",
          max_tokens: wantedMaxTokens(options, 4096),
          messages: [{ role: "user", content }],
        }),
        signal: options && options.signal,
      });
    } catch (net) {
      if (options && options.signal && options.signal.aborted) {
        throw makeErr("cancelled", "已停止分析。");
      }
      if (net && net.name === "TimeoutError") throw makeErr("timeout", "服務回覆逾時，請稍後再試。");
      throw makeErr("upstream_error", "無法連線到雲端 AI 代理，請確認網路或改在設定填入本機金鑰。");
    }
    if (!res.ok) await readFetchError(res);
    const data = await res.json();
    if (data && data.ok === false) throw mapProxyError(data, res.status);
    const text = extractMessageText(data);
    if (!text) throw makeErr("empty_completion", "AI 沒有回覆內容");
    try {
      const parsed = parseJsonLoose(text);
      if (data && data.stop_reason) parsed._stop_reason = data.stop_reason;
      return parsed;
    } catch (e) {
      if (data && data.stop_reason === "max_tokens") {
        throw makeErr("invalid_json", "AI 回覆被截斷，將再試一次");
      }
      throw e;
    }
  }

  function withTimeoutSignal(options, timeoutMs) {
    const parent = options && options.signal;
    if (!timeoutMs || timeoutMs <= 0) return { signal: parent, cancel: function () {} };
    const ctrl = new AbortController();
    const id = setTimeout(function () {
      try { ctrl.abort(); } catch (e) {}
    }, timeoutMs);
    if (parent) {
      if (parent.aborted) ctrl.abort();
      else parent.addEventListener("abort", function () { ctrl.abort(); }, { once: true });
    }
    return {
      signal: ctrl.signal,
      cancel: function () { clearTimeout(id); },
      timedOut: function () { return ctrl.signal.aborted && !(parent && parent.aborted); }
    };
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
    if (!key && !proxyConfigured()) throw makeErr("needs_api_key", AI_NOTICE);
    const timeoutMs = Number(options && options.timeoutMs) > 0 ? Number(options.timeoutMs) : 30000;
    let lastErr = null;
    const retries = 2;
    for (let i = 0; i < retries; i++) {
      const gate = withTimeoutSignal(options, timeoutMs);
      try {
        const opts = Object.assign({}, options || {}, { signal: gate.signal, max_tokens: wantedMaxTokens(options, 4096) });
        const data = key ? await callAnthropicDirect(key, content, opts) : await callAnthropicProxy(content, opts);
        gate.cancel();
        return data;
      } catch (e) {
        gate.cancel();
        if (gate.timedOut()) lastErr = makeErr("timeout", "服務回覆逾時，請稍後再試。");
        else lastErr = e;
        if (options && options.signal && options.signal.aborted) throw makeErr("cancelled", "已停止分析。");
        const code = lastErr && lastErr.code;
        const retryable = code === "invalid_json" || code === "empty_completion" || code === "timeout" || code === "upstream_error";
        if (!retryable || i === retries - 1) throw lastErr;
      }
    }
    throw lastErr || makeErr("upstream_error", "雲端服務連線或回應錯誤，請稍後再試。");
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
    parseJsonLoose,
    getApiKey,
    setApiKey,
    AI_KEY_LS,
    AI_NOTICE,
    proxyConfigured,
    setProxyUrl,
    getProxyUrl,
    deviceId,
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
