import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const registryPath = join(root, "data", "market_source_registry.json");
const port = Number(process.env.AMMONIA_PRICE_PORT || 4174);
const timeoutMs = 2500;

const status = {
  waiting: "\u5f85\u8054\u7f51",
  unavailable: "\u7f51\u7edc\u4e0d\u53ef\u7528",
  updated: "\u5df2\u66f4\u65b0",
  authorization: "\u9700\u884c\u60c5\u6388\u6743",
  periodic: "\u5468\u671f\u6027\u53c2\u8003",
  enterprisePending: "\u5f85ERP/\u7ecf\u8425\u786e\u8ba4"
};

const presentation = {
  nbs_production_materials: {
    name: "\u56fd\u5bb6\u7edf\u8ba1\u5c40\u751f\u4ea7\u8d44\u6599\u4ef7\u683c",
    products: ["\u5c3f\u7d20", "\u590d\u5408\u80a5", "\u78f7\u80a5", "\u94be\u80a5"],
    refresh: "\u65ec\u5ea6",
    role: "\u5168\u56fd\u6279\u53d1\u53c2\u8003\u57fa\u51c6"
  },
  czce_market_data: {
    name: "\u90d1\u5dde\u5546\u54c1\u4ea4\u6613\u6240",
    products: ["\u5c3f\u7d20\u671f\u8d27 UR", "\u7eaf\u78b1\u671f\u8d27 SA"],
    refresh: "\u76d8\u4e2d/\u65e5\u7ec8",
    role: "\u671f\u8d27\u4ef7\u683c\u4e0e\u8d8b\u52bf\u53c2\u8003"
  },
  mofcom_commodity_price: {
    name: "\u5546\u52a1\u90e8\u5546\u54c1\u4ef7\u683c\u7f51",
    products: ["\u6db2\u6c28\u884c\u4e1a\u53c2\u8003", "\u5316\u80a5\u884c\u4e1a\u53c2\u8003"],
    refresh: "\u5468\u671f\u6027\u8d44\u6599",
    role: "\u884c\u4e1a\u8d70\u52bf\u4ea4\u53c9\u9a8c\u8bc1"
  },
  yuntu_erp_business_price: {
    name: "\u4e91\u56fe ERP/\u9500\u552e\u91c7\u8d2d\u7ed3\u7b97",
    products: ["\u6db2\u6c28", "\u785d\u9178", "\u5c3f\u7d20\u6eb6\u6db2", "\u590d\u5408\u80a5", "\u8054\u78b1\u4ea7\u54c1"],
    refresh: "\u8ba2\u5355/\u62a5\u4ef7/\u65e5\u7ed3",
    role: "\u8c03\u5ea6\u6267\u884c\u4ef7\u683c\u4e3b\u6765\u6e90"
  }
};

function json(res, code, payload) {
  res.writeHead(code, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, OPTIONS",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function stripHtml(value) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchText(url, requestTimeoutMs = timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "user-agent": "Yuntu-Ammonia-Dispatch-Reference/1.0" }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

function parseNbsUrea(html) {
  const text = stripHtml(html);
  const match = text.match(/\u5c3f\u7d20\s*[\(\uff08]?\u4e2d\u5c0f\u9897\u7c92[\)\uff09]?\s*\u5428\s*([0-9]+(?:\.[0-9]+)?)/);
  if (!match) return null;
  return {
    product: "\u5c3f\u7d20\uff08\u4e2d\u5c0f\u9897\u7c92\uff09",
    value: Number(match[1]),
    unit: "\u5143/\u5428"
  };
}

async function loadRegistry() {
  return JSON.parse(await readFile(registryPath, "utf8"));
}

async function buildSnapshot() {
  const registry = await loadRegistry();
  const now = new Date().toISOString();
  const sources = registry.sources.map(source => ({
    id: source.id,
    name: presentation[source.id]?.name || source.name,
    kind: source.kind,
    products: presentation[source.id]?.products || source.products,
    refresh: presentation[source.id]?.refresh || source.refresh,
    url: source.url,
    role: presentation[source.id]?.role || source.role,
    executionAuthority: source.execution_authority,
    status: source.id === "yuntu_erp_business_price" ? status.enterprisePending : status.waiting
  }));
  const references = [];
  const nbs = registry.sources.find(source => source.id === "nbs_production_materials");
  let nbsStatus = status.unavailable;
  let nbsMessage = "\u672c\u8f6e\u672a\u80fd\u4ece\u516c\u5f00\u5b98\u65b9\u9875\u9762\u8bfb\u53d6\uff0c\u4e0d\u6539\u53d8\u4f01\u4e1a\u6267\u884c\u4ef7\u3002";
  let nbsUrl = nbs.url;
  try {
    let html;
    try {
      html = await fetchText(nbs.url);
    } catch {
      nbsUrl = nbs.fallback_url;
      html = await fetchText(nbs.fallback_url, 1000);
    }
    const parsed = parseNbsUrea(html);
    if (!parsed) throw new Error("\u672a\u8bc6\u522b\u5c3f\u7d20\u4ef7\u683c\u5b57\u6bb5");
    references.push({ ...parsed, sourceId: nbs.id, sourceName: presentation[nbs.id].name, sourceUrl: nbsUrl, publishedAt: now.slice(0, 10), status: "official_reference" });
    nbsStatus = status.updated;
    nbsMessage = "\u5df2\u8bfb\u53d6\u516c\u5f00\u5b98\u65b9\u9875\u9762\uff1b\u5c5e\u5168\u56fd\u6279\u53d1\u53c2\u8003\uff0c\u4e0d\u4f5c\u4e3a\u6db2\u6c28\u6267\u884c\u4ef7\u3002";
  } catch (error) {
    nbsMessage = `${nbsMessage}${error.name === "AbortError" ? "\u8bf7\u6c42\u8d85\u65f6" : error.message}`;
  }
  const nbsCard = sources.find(source => source.id === nbs.id);
  nbsCard.status = nbsStatus;
  nbsCard.message = nbsMessage;
  nbsCard.url = nbsUrl;
  const zceCard = sources.find(source => source.id === "czce_market_data");
  zceCard.status = status.authorization;
  zceCard.message = "\u5b98\u65b9\u4ea4\u6613\u6240\u5df2\u767b\u8bb0\uff1b\u76d8\u4e2d\u6570\u636e\u9700\u4f01\u4e1a\u884c\u60c5\u6743\u9650\u6216\u65e5\u7ec8\u6587\u4ef6\u3002";
  const mofcomCard = sources.find(source => source.id === "mofcom_commodity_price");
  mofcomCard.status = status.periodic;
  mofcomCard.message = "\u516c\u5f00\u884c\u4e1a\u8d44\u6599\u7528\u4e8e\u4ea4\u53c9\u9a8c\u8bc1\uff0c\u4e0d\u4f5c\u4e3a\u8fde\u7eed\u5b9e\u65f6\u6210\u4ea4\u4ef7\u3002";
  return {
    gatewayVersion: "market-gateway-v1",
    fetchedAt: now,
    status: references.length ? "reference_updated" : "reference_unavailable",
    executionPriceStatus: status.enterprisePending,
    sources,
    references,
    lastVerifiedPublicExample: registry.demo_reference.last_verified_public_example,
    policy: registry.fallback_policy,
    note: "\u516c\u5f00\u53c2\u8003\u884c\u60c5\u4e0e\u4f01\u4e1a\u6267\u884c\u4ef7\u683c\u5206\u5c42\u4fdd\u5b58\uff1b\u672a\u786e\u8ba4\u7684\u5916\u90e8\u6570\u636e\u4e0d\u8fdb\u5165\u53ef\u6267\u884c\u65b9\u6848\u3002"
  };
}

const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") return json(res, 204, {});
  const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
  if (url.pathname === "/health") return json(res, 200, { ok: true, service: "ammonia-market-gateway", port });
  if (url.pathname !== "/api/market/snapshot" || req.method !== "GET") return json(res, 404, { ok: false, message: "route_not_found" });
  try {
    return json(res, 200, await buildSnapshot());
  } catch (error) {
    return json(res, 503, { ok: false, status: "gateway_error", message: error.message });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`ammonia market gateway listening on http://127.0.0.1:${port}`);
});
