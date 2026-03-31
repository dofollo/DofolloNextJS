import { NextResponse, type NextMiddleware, type NextRequest } from "next/server";

import type { DofolloClient } from "./client";
import type { BrokenLinkFix, DofolloRedirectMatch } from "./types";
import { normalizeUrl } from "./utils";
import { normalizeFixesShape } from "./types";

export interface DofolloRedirectMiddlewareOptions {
  permanent?: boolean;
}

export async function resolveDofolloRedirect(
  client: Pick<DofolloClient, "getFixes">,
  requestUrl: string,
  options: DofolloRedirectMiddlewareOptions = {},
): Promise<DofolloRedirectMatch | null> {
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
    permanent: options.permanent ?? true,
  };
}

export function createDofolloRedirectMiddleware(
  client: Pick<DofolloClient, "getFixes">,
  options: DofolloRedirectMiddlewareOptions = {},
): NextMiddleware {
  return async (request: NextRequest) => {
    const redirect = await resolveDofolloRedirect(client, request.nextUrl.toString(), options);

    if (!redirect) {
      return NextResponse.next();
    }

    return NextResponse.redirect(redirect.destination, redirect.permanent ? 308 : 307);
  };
}

function findBrokenLinkMatch(fixes: BrokenLinkFix[], requestUrl: string): BrokenLinkFix | null {
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
