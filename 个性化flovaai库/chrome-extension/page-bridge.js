(function () {
  if (window.__flovaSkillBridgeInstalled) return;
  window.__flovaSkillBridgeInstalled = true;

  const apiBase = "https://service.flova.ai/api/v2";

  async function apiRequest(path, options = {}) {
    const res = await fetch(`${apiBase}${path}`, {
      method: options.method || "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Client": "fetcher",
        "X-Lang": "zh-CN",
        ...(options.headers || {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json || json.code !== 0) {
      throw new Error(json?.message || `Flova API ${res.status}`);
    }
    return json.data;
  }

  async function apiAny(requests = []) {
    let lastError = null;
    for (const request of requests) {
      try {
        const data = await apiRequest(request.path, request.options || {});
        return {
          used: request.path,
          data,
        };
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error("No Flova API candidates provided");
  }

  window.addEventListener("message", async (event) => {
    if (event.source !== window) return;
    const message = event.data;
    if (!message || message.source !== "flova-skill-selector" || !message.id) return;

    try {
      let data;
      if (message.type === "api") {
        data = await apiRequest(message.path, message.options || {});
      } else if (message.type === "apiAny") {
        data = await apiAny(message.requests || []);
      } else {
        throw new Error(`Unsupported bridge action: ${message.type}`);
      }
      window.postMessage(
        {
          source: "flova-skill-selector-bridge",
          id: message.id,
          ok: true,
          data,
        },
        "*",
      );
    } catch (error) {
      window.postMessage(
        {
          source: "flova-skill-selector-bridge",
          id: message.id,
          ok: false,
          error: error?.message || String(error),
        },
        "*",
      );
    }
  });
})();
