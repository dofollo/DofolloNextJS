import type {
  AltTextFix,
  ApplyContentFixOptions,
  BrokenLinkFix,
  DofolloFixes,
  Fix,
  H1Fix,
  LinkFix,
} from "./types";
import { createEmptyFixes, normalizeFixesShape } from "./types";

export function normalizeUrl(value: string, baseUrl?: string): string {
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

export function applyContentFixes(
  html: string,
  fixes: Partial<DofolloFixes> | null | undefined,
  options: ApplyContentFixOptions = {},
): string {
  if (!html) {
    return html;
  }

  const normalizedFixes = normalizeFixesShape(fixes ?? createEmptyFixes());
  const baseUrl = options.baseUrl;
  const appliedFixes: Fix[] = [];

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

export function getLinkSuggestions(fixes: Partial<DofolloFixes> | null | undefined): LinkFix[] {
  return normalizeFixesShape(fixes).links;
}

function applyBrokenLinkFixes(
  html: string,
  fixes: BrokenLinkFix[],
  baseUrl?: string,
): { output: string; applied: BrokenLinkFix[] } {
  if (!fixes.length) {
    return { output: html, applied: [] };
  }

  const applied: BrokenLinkFix[] = [];
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

function applyH1Fixes(html: string, fixes: H1Fix[]): { output: string; applied: H1Fix[] } {
  if (!fixes.length) {
    return { output: html, applied: [] };
  }

  const applied: H1Fix[] = [];
  const remainingFixes = [...fixes];

  const output = html.replace(/<h1\b([^>]*)>([\s\S]*?)<\/h1>/gi, (fullMatch, attributes, innerHtml) => {
    const currentText = normalizeText(stripHtml(innerHtml));

    const fixIndex = remainingFixes.findIndex(
      (candidate) => normalizeText(candidate.current_h1) === currentText,
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

function applyAltTextFixes(
  html: string,
  fixes: AltTextFix[],
  baseUrl?: string,
): { output: string; applied: AltTextFix[] } {
  if (!fixes.length) {
    return { output: html, applied: [] };
  }

  const applied: AltTextFix[] = [];
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

function normalizePathname(pathname: string): string {
  if (!pathname || pathname === "/") {
    return "/";
  }

  const normalized = pathname.replace(/\/+$/, "");
  return normalized || "/";
}

function shouldKeepPort(protocol: string, port: string): boolean {
  if (!port) {
    return false;
  }

  if ((protocol === "http:" && port === "80") || (protocol === "https:" && port === "443")) {
    return false;
  }

  return true;
}

function urlsMatch(left: string, right: string, baseUrl?: string): boolean {
  return normalizeUrl(left, baseUrl) === normalizeUrl(right, baseUrl);
}

function readAttribute(tag: string, attribute: string): string | null {
  const pattern = new RegExp(`\\b${attribute}\\s*=\\s*(['"])(.*?)\\1`, "i");
  const match = tag.match(pattern);

  return match?.[2] ?? null;
}

function upsertAttribute(tag: string, attribute: string, value: string): string {
  const nextAttribute = `${attribute}="${escapeAttribute(value)}"`;
  const pattern = new RegExp(`\\b${attribute}\\s*=\\s*(['"])(.*?)\\1`, "i");

  if (pattern.test(tag)) {
    return tag.replace(pattern, nextAttribute);
  }

  return tag.replace(/\s*\/?>$/, (ending) => ` ${nextAttribute}${ending}`);
}

function stripHtml(value: string): string {
  return decodeHtmlEntities(value.replace(/<[^>]+>/g, " "));
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function deduplicateFixes<T extends Fix>(fixes: T[]): T[] {
  const seen = new Set<string>();
  return fixes.filter((fix) => {
    if (seen.has(fix.id)) {
      return false;
    }
    seen.add(fix.id);
    return true;
  });
}
