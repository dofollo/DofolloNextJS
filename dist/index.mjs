import {
  applyContentFixes,
  createDofolloRedirectMiddleware,
  createEmptyFixes,
  getLinkSuggestions,
  normalizeFixesShape,
  normalizeUrl,
  resolveDofolloRedirect
} from "./chunk-KH7O37US.mjs";

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

// src/components/DofolloFixes.tsx
import { jsx } from "react/jsx-runtime";
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
  return /* @__PURE__ */ jsx(Wrapper, { className, dangerouslySetInnerHTML: { __html: fixedContent } });
}

// src/components/DofolloHead.tsx
import { jsx as jsx2 } from "react/jsx-runtime";
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
  return /* @__PURE__ */ jsx2("title", { children: title });
}

// src/components/DofolloSchema.tsx
import { Fragment, jsx as jsx3 } from "react/jsx-runtime";
async function DofolloSchema({
  client,
  pageUrl
}) {
  const schemaFixes = pageUrl ? await client.getSchema(pageUrl) : normalizeFixesShape((await client.getFixes())?.fixes ?? []).schema;
  if (!schemaFixes.length) {
    return null;
  }
  return /* @__PURE__ */ jsx3(Fragment, { children: schemaFixes.map((fix, index) => /* @__PURE__ */ jsx3(
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
export {
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
};
