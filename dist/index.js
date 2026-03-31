"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  DofolloClient: () => DofolloClient,
  DofolloFixes: () => DofolloFixes,
  DofolloHead: () => DofolloHead,
  DofolloSchema: () => DofolloSchema,
  applyContentFixes: () => applyContentFixes,
  createDofolloRedirectMiddleware: () => createDofolloRedirectMiddleware,
  createEmptyFixes: () => createEmptyFixes,
  getDofolloHeadData: () => getDofolloHeadData,
  getDofolloMetadata: () => getDofolloMetadata,
  getLinkSuggestions: () => getLinkSuggestions,
  normalizeFixesShape: () => normalizeFixesShape,
  normalizeUrl: () => normalizeUrl,
  resolveDofolloRedirect: () => resolveDofolloRedirect
});
module.exports = __toCommonJS(index_exports);

// src/types.ts
function createEmptyFixes() {
  return {
    schema: [],
    titles: [],
    h1: [],
    links: [],
    alt_text: [],
    broken_links: []
  };
}
function normalizeFixesShape(fixes) {
  if (Array.isArray(fixes)) {
    return {
      schema: fixes.filter((f) => f.type === "schema"),
      titles: fixes.filter((f) => f.type === "title"),
      h1: fixes.filter((f) => f.type === "h1"),
      links: fixes.filter((f) => f.type === "link"),
      alt_text: fixes.filter((f) => f.type === "alt_text"),
      broken_links: fixes.filter((f) => f.type === "broken_link")
    };
  }
  return {
    schema: Array.isArray(fixes?.schema) ? fixes.schema : [],
    titles: Array.isArray(fixes?.titles) ? fixes.titles : [],
    h1: Array.isArray(fixes?.h1) ? fixes.h1 : [],
    links: Array.isArray(fixes?.links) ? fixes.links : [],
    alt_text: Array.isArray(fixes?.alt_text) ? fixes.alt_text : [],
    broken_links: Array.isArray(fixes?.broken_links) ? fixes.broken_links : []
  };
}

// src/client.ts
var DofolloClient = class {
  constructor(options) {
    this.cache = /* @__PURE__ */ new Map();
    this.siteId = options.siteId;
    this.apiKey = options.apiKey;
    this.apiUrl = normalizeApiUrl(options.apiUrl ?? "https://api.dofollo.ai");
    this.cacheTtl = options.cacheTtl ?? 300;
    this.fetcher = options.fetcher ?? fetch;
  }
  async getFixes() {
    const siteFixes = await this.fetchFixes();
    if (siteFixes) {
      void this.confirmApplied(this.flattenFixes(siteFixes.fixes));
    }
    return siteFixes;
  }
  async getFixesForPage(pageUrl) {
    const data = await this.getFixes();
    const allFixes = data?.fixes ?? [];
    const filtered = allFixes.filter((f) => f.page_url === pageUrl);
    if (filtered.length > 0) {
      void this.confirmApplied(this.flattenFixes(normalizeFixesShape(filtered)));
    }
    return normalizeFixesShape(filtered);
  }
  async getSchema(pageUrl) {
    return (await this.getFixesForPage(pageUrl)).schema;
  }
  async getTitle(pageUrl) {
    return (await this.getFixesForPage(pageUrl)).titles[0] ?? null;
  }
  async getH1(pageUrl) {
    return (await this.getFixesForPage(pageUrl)).h1[0] ?? null;
  }
  async getLinks(pageUrl) {
    return (await this.getFixesForPage(pageUrl)).links;
  }
  async getAltText(pageUrl) {
    return (await this.getFixesForPage(pageUrl)).alt_text;
  }
  async getBrokenLinks(pageUrl) {
    return (await this.getFixesForPage(pageUrl)).broken_links;
  }
  async fetchFixes(pageUrl) {
    const endpoint = this.buildEndpoint(pageUrl);
    const cached = this.cache.get(endpoint);
    if (cached && Date.now() < cached.expires) {
      return cached.data;
    }
    try {
      const response = await this.fetcher(endpoint, {
        headers: {
          "X-Dofollo-API-Key": this.apiKey
        },
        next: {
          revalidate: this.cacheTtl
        }
      });
      if (!response.ok) {
        return null;
      }
      const payload = await response.json();
      if (!payload.success || !payload.data) {
        return null;
      }
      const normalized = {
        siteId: payload.data.site_id,
        generatedAt: payload.data.generated_at,
        fixes: payload.data.fixes
      };
      this.cache.set(endpoint, {
        data: normalized,
        expires: Date.now() + this.cacheTtl * 1e3
      });
      return normalized;
    } catch {
      return null;
    }
  }
  async confirmApplied(fixes) {
    if (!fixes.length) return;
    try {
      await this.fetcher(
        `${this.apiUrl}/api/public/v1/sites/${encodeURIComponent(this.siteId)}/fixes/applied`,
        {
          method: "POST",
          headers: {
            "X-Dofollo-API-Key": this.apiKey,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            fixes: fixes.map((f) => ({ id: f.id, type: f.type }))
          })
        }
      );
    } catch {
    }
  }
  flattenFixes(fixes) {
    if (Array.isArray(fixes)) {
      return fixes.map((f) => ({ id: f.id, type: f.type }));
    }
    return [
      ...fixes.schema,
      ...fixes.titles,
      ...fixes.h1,
      ...fixes.links,
      ...fixes.alt_text,
      ...fixes.broken_links
    ].map((f) => ({ id: f.id, type: f.type }));
  }
  buildEndpoint(pageUrl) {
    const url = new URL(
      `/api/public/v1/sites/${encodeURIComponent(this.siteId)}/fixes/pending`,
      this.apiUrl
    );
    if (pageUrl) {
      url.searchParams.set("page_url", pageUrl);
    }
    return url.toString();
  }
};
function normalizeApiUrl(apiUrl) {
  return apiUrl.replace(/\/$/, "");
}

// src/utils.ts
function normalizeUrl(value, baseUrl) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  try {
    const url = baseUrl ? new URL(trimmed, baseUrl) : new URL(trimmed);
    const protocol = url.protocol.toLowerCase();
    const hostname = url.hostname.toLowerCase();
    const pathname = normalizePathname(url.pathname);
    const port = shouldKeepPort(protocol, url.port) ? `:${url.port}` : "";
    url.hash = "";
    return `${protocol}//${hostname}${port}${pathname}${url.search}`;
  } catch {
    if (trimmed.startsWith("?")) {
      return trimmed;
    }
    return normalizePathname(trimmed);
  }
}
function applyContentFixes(html, fixes, options = {}) {
  if (!html) {
    return html;
  }
  const normalizedFixes = normalizeFixesShape(fixes ?? createEmptyFixes());
  const baseUrl = options.baseUrl;
  const appliedFixes = [];
  const broken = applyBrokenLinkFixes(html, normalizedFixes.broken_links, baseUrl);
  appliedFixes.push(...broken.applied);
  const h1 = applyH1Fixes(broken.output, normalizedFixes.h1);
  appliedFixes.push(...h1.applied);
  const alt = applyAltTextFixes(h1.output, normalizedFixes.alt_text, baseUrl);
  appliedFixes.push(...alt.applied);
  if (options.onApplied && appliedFixes.length > 0) {
    options.onApplied(deduplicateFixes(appliedFixes));
  }
  return alt.output;
}
function getLinkSuggestions(fixes) {
  return normalizeFixesShape(fixes).links;
}
function applyBrokenLinkFixes(html, fixes, baseUrl) {
  if (!fixes.length) {
    return { output: html, applied: [] };
  }
  const applied = [];
  const output = html.replace(/<a\b[^>]*>/gi, (tag) => {
    const href = readAttribute(tag, "href");
    if (!href) {
      return tag;
    }
    const match = fixes.find((fix) => urlsMatch(href, fix.broken_url, baseUrl));
    if (!match) {
      return tag;
    }
    applied.push(match);
    return upsertAttribute(tag, "href", match.new_url);
  });
  return { output, applied };
}
function applyH1Fixes(html, fixes) {
  if (!fixes.length) {
    return { output: html, applied: [] };
  }
  const applied = [];
  const remainingFixes = [...fixes];
  const output = html.replace(/<h1\b([^>]*)>([\s\S]*?)<\/h1>/gi, (fullMatch, attributes, innerHtml) => {
    const currentText = normalizeText(stripHtml(innerHtml));
    const fixIndex = remainingFixes.findIndex(
      (candidate) => normalizeText(candidate.current_h1) === currentText
    );
    if (fixIndex === -1) {
      return fullMatch;
    }
    const [fix] = remainingFixes.splice(fixIndex, 1);
    applied.push(fix);
    return `<h1${attributes}>${escapeHtml(fix.new_h1)}</h1>`;
  });
  return { output, applied };
}
function applyAltTextFixes(html, fixes, baseUrl) {
  if (!fixes.length) {
    return { output: html, applied: [] };
  }
  const applied = [];
  const output = html.replace(/<img\b[^>]*>/gi, (tag) => {
    const src = readAttribute(tag, "src");
    if (!src) {
      return tag;
    }
    const match = fixes.find((fix) => urlsMatch(src, fix.image_url, baseUrl));
    if (!match) {
      return tag;
    }
    applied.push(match);
    return upsertAttribute(tag, "alt", match.new_alt);
  });
  return { output, applied };
}
function normalizePathname(pathname) {
  if (!pathname || pathname === "/") {
    return "/";
  }
  const normalized = pathname.replace(/\/+$/, "");
  return normalized || "/";
}
function shouldKeepPort(protocol, port) {
  if (!port) {
    return false;
  }
  if (protocol === "http:" && port === "80" || protocol === "https:" && port === "443") {
    return false;
  }
  return true;
}
function urlsMatch(left, right, baseUrl) {
  return normalizeUrl(left, baseUrl) === normalizeUrl(right, baseUrl);
}
function readAttribute(tag, attribute) {
  const pattern = new RegExp(`\\b${attribute}\\s*=\\s*(['"])(.*?)\\1`, "i");
  const match = tag.match(pattern);
  return match?.[2] ?? null;
}
function upsertAttribute(tag, attribute, value) {
  const nextAttribute = `${attribute}="${escapeAttribute(value)}"`;
  const pattern = new RegExp(`\\b${attribute}\\s*=\\s*(['"])(.*?)\\1`, "i");
  if (pattern.test(tag)) {
    return tag.replace(pattern, nextAttribute);
  }
  return tag.replace(/\s*\/?>$/, (ending) => ` ${nextAttribute}${ending}`);
}
function stripHtml(value) {
  return decodeHtmlEntities(value.replace(/<[^>]+>/g, " "));
}
function normalizeText(value) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}
function escapeHtml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeAttribute(value) {
  return escapeHtml(value).replace(/"/g, "&quot;");
}
function decodeHtmlEntities(value) {
  return value.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">");
}
function deduplicateFixes(fixes) {
  const seen = /* @__PURE__ */ new Set();
  return fixes.filter((fix) => {
    if (seen.has(fix.id)) {
      return false;
    }
    seen.add(fix.id);
    return true;
  });
}

// src/components/DofolloFixes.tsx
var import_jsx_runtime = require("react/jsx-runtime");
async function DofolloFixes({
  client,
  pageUrl,
  html,
  as = "div",
  className,
  baseUrl
}) {
  const fixes = await client.getFixesForPage(pageUrl);
  const fixedContent = applyContentFixes(html, fixes, {
    baseUrl: baseUrl ?? pageUrl,
    onApplied: (applied) => {
      void client.confirmApplied(applied);
    }
  });
  const Wrapper = as;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wrapper, { className, dangerouslySetInnerHTML: { __html: fixedContent } });
}

// src/components/DofolloHead.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
async function getDofolloHeadData({
  client,
  pageUrl,
  fallbackTitle = null
}) {
  const titleFix = await client.getTitle(pageUrl);
  return {
    title: titleFix?.new_title ?? fallbackTitle,
    titleFix
  };
}
async function getDofolloMetadata(props) {
  const { title } = await getDofolloHeadData(props);
  if (!title) {
    return {};
  }
  return { title };
}
async function DofolloHead(props) {
  const { title } = await getDofolloHeadData(props);
  if (!title) {
    return null;
  }
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("title", { children: title });
}

// src/components/DofolloSchema.tsx
var import_jsx_runtime3 = require("react/jsx-runtime");
async function DofolloSchema({
  client,
  pageUrl
}) {
  const schemaFixes = pageUrl ? await client.getSchema(pageUrl) : normalizeFixesShape((await client.getFixes())?.fixes ?? []).schema;
  if (!schemaFixes.length) {
    return null;
  }
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_jsx_runtime3.Fragment, { children: schemaFixes.map((fix, index) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
    "script",
    {
      type: "application/ld+json",
      dangerouslySetInnerHTML: {
        __html: JSON.stringify(fix.schema_markup)
      }
    },
    `${fix.page_url}:${fix.published_at}:${index}`
  )) });
}

// src/middleware.ts
var import_server = require("next/server");
async function resolveDofolloRedirect(client, requestUrl, options = {}) {
  const siteFixes = await client.getFixes();
  const fixes = siteFixes?.fixes ?? [];
  const normalized = normalizeFixesShape(fixes);
  const match = findBrokenLinkMatch(normalized.broken_links, requestUrl);
  if (!match) {
    return null;
  }
  return {
    destination: match.new_url,
    match,
    permanent: options.permanent ?? true
  };
}
function createDofolloRedirectMiddleware(client, options = {}) {
  return async (request) => {
    const redirect = await resolveDofolloRedirect(client, request.nextUrl.toString(), options);
    if (!redirect) {
      return import_server.NextResponse.next();
    }
    return import_server.NextResponse.redirect(redirect.destination, redirect.permanent ? 308 : 307);
  };
}
function findBrokenLinkMatch(fixes, requestUrl) {
  const normalizedRequestUrl = normalizeUrl(requestUrl);
  for (const fix of fixes) {
    const normalizedBrokenUrl = normalizeUrl(fix.broken_url);
    if (normalizedBrokenUrl === normalizedRequestUrl) {
      return fix;
    }
  }
  try {
    const requestWithoutQuery = new URL(requestUrl);
    requestWithoutQuery.search = "";
    const normalizedWithoutQuery = normalizeUrl(requestWithoutQuery.toString());
    return fixes.find((fix) => normalizeUrl(fix.broken_url) === normalizedWithoutQuery) ?? null;
  } catch {
    return null;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DofolloClient,
  DofolloFixes,
  DofolloHead,
  DofolloSchema,
  applyContentFixes,
  createDofolloRedirectMiddleware,
  createEmptyFixes,
  getDofolloHeadData,
  getDofolloMetadata,
  getLinkSuggestions,
  normalizeFixesShape,
  normalizeUrl,
  resolveDofolloRedirect
});
