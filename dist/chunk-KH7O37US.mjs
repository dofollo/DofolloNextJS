// src/middleware.ts
import { NextResponse } from "next/server";

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

// src/middleware.ts
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
      return NextResponse.next();
    }
    return NextResponse.redirect(redirect.destination, redirect.permanent ? 308 : 307);
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

export {
  createEmptyFixes,
  normalizeFixesShape,
  normalizeUrl,
  applyContentFixes,
  getLinkSuggestions,
  resolveDofolloRedirect,
  createDofolloRedirectMiddleware
};
