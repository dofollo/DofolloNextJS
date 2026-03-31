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

// src/middleware.ts
var middleware_exports = {};
__export(middleware_exports, {
  createDofolloRedirectMiddleware: () => createDofolloRedirectMiddleware,
  resolveDofolloRedirect: () => resolveDofolloRedirect
});
module.exports = __toCommonJS(middleware_exports);
var import_server = require("next/server");

// src/types.ts
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
  createDofolloRedirectMiddleware,
  resolveDofolloRedirect
});
