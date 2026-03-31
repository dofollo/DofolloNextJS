import type {
  AltTextFix,
  BrokenLinkFix,
  DofolloApiPayload,
  DofolloApiResponse,
  DofolloCacheEntry,
  DofolloClientOptions,
  DofolloFixes,
  DofolloSiteFixes,
  Fix,
  GenericFix,
  H1Fix,
  LinkFix,
  SchemaFix,
  TitleFix,
} from "./types";
import { createEmptyFixes, normalizeFixesShape } from "./types";

export class DofolloClient {
  private readonly siteId: string;
  private readonly apiKey: string;
  private readonly apiUrl: string;
  private readonly cacheTtl: number;
  private readonly fetcher: typeof fetch;
  private readonly cache = new Map<string, DofolloCacheEntry<DofolloSiteFixes>>();

  constructor(options: DofolloClientOptions) {
    this.siteId = options.siteId;
    this.apiKey = options.apiKey;
    this.apiUrl = normalizeApiUrl(options.apiUrl ?? "https://api.dofollo.ai");
    this.cacheTtl = options.cacheTtl ?? 300;
    this.fetcher = options.fetcher ?? fetch;
  }

  async getFixes(): Promise<DofolloSiteFixes | null> {
    const siteFixes = await this.fetchFixes();

    if (siteFixes) {
      void this.confirmApplied(this.flattenFixes(siteFixes.fixes));
    }

    return siteFixes;
  }

  async getFixesForPage(pageUrl: string): Promise<DofolloFixes> {
    const data = await this.getFixes();
    const allFixes = data?.fixes ?? [];
    const filtered = allFixes.filter((f) => f.page_url === pageUrl);

    if (filtered.length > 0) {
      void this.confirmApplied(this.flattenFixes(normalizeFixesShape(filtered)));
    }

    return normalizeFixesShape(filtered);
  }

  async getSchema(pageUrl: string): Promise<SchemaFix[]> {
    return (await this.getFixesForPage(pageUrl)).schema;
  }

  async getTitle(pageUrl: string): Promise<TitleFix | null> {
    return (await this.getFixesForPage(pageUrl)).titles[0] ?? null;
  }

  async getH1(pageUrl: string): Promise<H1Fix | null> {
    return (await this.getFixesForPage(pageUrl)).h1[0] ?? null;
  }

  async getLinks(pageUrl: string): Promise<LinkFix[]> {
    return (await this.getFixesForPage(pageUrl)).links;
  }

  async getAltText(pageUrl: string): Promise<AltTextFix[]> {
    return (await this.getFixesForPage(pageUrl)).alt_text;
  }

  async getBrokenLinks(pageUrl: string): Promise<BrokenLinkFix[]> {
    return (await this.getFixesForPage(pageUrl)).broken_links;
  }

  private async fetchFixes(pageUrl?: string): Promise<DofolloSiteFixes | null> {
    const endpoint = this.buildEndpoint(pageUrl);
    const cached = this.cache.get(endpoint);

    if (cached && Date.now() < cached.expires) {
      return cached.data;
    }

    try {
      const response = await this.fetcher(endpoint, {
        headers: {
          "X-Dofollo-API-Key": this.apiKey,
        },
        next: {
          revalidate: this.cacheTtl,
        },
      } as RequestInit & { next?: { revalidate: number } });

      if (!response.ok) {
        return null;
      }

      const payload = (await response.json()) as DofolloApiResponse<DofolloApiPayload>;

      if (!payload.success || !payload.data) {
        return null;
      }

      const normalized: DofolloSiteFixes = {
        siteId: payload.data.site_id,
        generatedAt: payload.data.generated_at,
        fixes: payload.data.fixes,
      };

      this.cache.set(endpoint, {
        data: normalized,
        expires: Date.now() + this.cacheTtl * 1000,
      });

      return normalized;
    } catch {
      return null;
    }
  }

  async confirmApplied(fixes: Fix[]): Promise<void> {
    if (!fixes.length) return;

    try {
      await this.fetcher(
        `${this.apiUrl}/api/public/v1/sites/${encodeURIComponent(this.siteId)}/fixes/applied`,
        {
          method: "POST",
          headers: {
            "X-Dofollo-API-Key": this.apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fixes: fixes.map((f) => ({ id: f.id, type: f.type })),
          }),
        },
      );
    } catch {
      // Never throw — confirmation failure must not break rendering
    }
  }

  private flattenFixes(fixes: DofolloFixes | GenericFix[]): Fix[] {
    if (Array.isArray(fixes)) {
      return fixes.map((f) => ({ id: f.id, type: f.type }));
    }

    return [
      ...fixes.schema,
      ...fixes.titles,
      ...fixes.h1,
      ...fixes.links,
      ...fixes.alt_text,
      ...fixes.broken_links,
    ].map((f) => ({ id: f.id, type: f.type }));
  }

  private buildEndpoint(pageUrl?: string): string {
    const url = new URL(
      `/api/public/v1/sites/${encodeURIComponent(this.siteId)}/fixes/pending`,
      this.apiUrl,
    );

    if (pageUrl) {
      url.searchParams.set("page_url", pageUrl);
    }

    return url.toString();
  }
}

function normalizeApiUrl(apiUrl: string): string {
  return apiUrl.replace(/\/$/, "");
}
