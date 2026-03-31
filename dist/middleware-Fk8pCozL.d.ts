import { NextMiddleware } from 'next/server';

interface SchemaFix {
    id: string;
    type: string;
    page_url: string;
    schema_markup: Record<string, unknown>;
    published_at: string;
}
interface TitleFix {
    id: string;
    type: string;
    page_url: string;
    current_title: string;
    new_title: string;
    published_at: string;
}
interface H1Fix {
    id: string;
    type: string;
    page_url: string;
    current_h1: string;
    new_h1: string;
    published_at: string;
}
interface LinkFix {
    id: string;
    type: string;
    page_url: string;
    anchor_text: string;
    target_url: string;
    context: string;
    published_at: string;
}
interface AltTextFix {
    id: string;
    type: string;
    page_url: string;
    image_url: string;
    current_alt: string;
    new_alt: string;
    published_at: string;
}
interface BrokenLinkFix {
    id: string;
    type: string;
    page_url: string;
    broken_url: string;
    new_url: string;
    anchor_text: string;
    published_at: string;
}
interface DofolloFixes {
    schema: SchemaFix[];
    titles: TitleFix[];
    h1: H1Fix[];
    links: LinkFix[];
    alt_text: AltTextFix[];
    broken_links: BrokenLinkFix[];
}
interface DofolloApiPayload {
    site_id: string;
    generated_at: string;
    fixes: (SchemaFix | TitleFix | H1Fix | LinkFix | AltTextFix | BrokenLinkFix)[];
    total: number;
}
interface Fix {
    id: string;
    type: string;
}
interface DofolloApiResponse<T> {
    success: boolean;
    data?: T;
}
type GenericFix = SchemaFix | TitleFix | H1Fix | LinkFix | AltTextFix | BrokenLinkFix;
interface DofolloSiteFixes {
    siteId: string;
    generatedAt: string;
    fixes: GenericFix[];
}
interface DofolloClientOptions {
    siteId: string;
    apiKey: string;
    apiUrl?: string;
    cacheTtl?: number;
    fetcher?: typeof fetch;
}
interface DofolloCacheEntry<T> {
    data: T;
    expires: number;
}
interface ApplyContentFixOptions {
    baseUrl?: string;
    onApplied?: (fixes: Fix[]) => void;
}
interface DofolloMetadataResult {
    title?: string;
}
interface DofolloRedirectMatch {
    destination: string;
    match: BrokenLinkFix;
    permanent: boolean;
}
declare function createEmptyFixes(): DofolloFixes;
declare function normalizeFixesShape(fixes?: Partial<DofolloFixes> | GenericFix[] | null): DofolloFixes;

declare class DofolloClient {
    private readonly siteId;
    private readonly apiKey;
    private readonly apiUrl;
    private readonly cacheTtl;
    private readonly fetcher;
    private readonly cache;
    constructor(options: DofolloClientOptions);
    getFixes(): Promise<DofolloSiteFixes | null>;
    getFixesForPage(pageUrl: string): Promise<DofolloFixes>;
    getSchema(pageUrl: string): Promise<SchemaFix[]>;
    getTitle(pageUrl: string): Promise<TitleFix | null>;
    getH1(pageUrl: string): Promise<H1Fix | null>;
    getLinks(pageUrl: string): Promise<LinkFix[]>;
    getAltText(pageUrl: string): Promise<AltTextFix[]>;
    getBrokenLinks(pageUrl: string): Promise<BrokenLinkFix[]>;
    private fetchFixes;
    confirmApplied(fixes: Fix[]): Promise<void>;
    private flattenFixes;
    private buildEndpoint;
}

interface DofolloRedirectMiddlewareOptions {
    permanent?: boolean;
}
declare function resolveDofolloRedirect(client: Pick<DofolloClient, "getFixes">, requestUrl: string, options?: DofolloRedirectMiddlewareOptions): Promise<DofolloRedirectMatch | null>;
declare function createDofolloRedirectMiddleware(client: Pick<DofolloClient, "getFixes">, options?: DofolloRedirectMiddlewareOptions): NextMiddleware;

export { type ApplyContentFixOptions as A, type BrokenLinkFix as B, DofolloClient as D, type GenericFix as G, type H1Fix as H, type LinkFix as L, type SchemaFix as S, type TitleFix as T, type DofolloMetadataResult as a, type DofolloFixes as b, type AltTextFix as c, type DofolloApiPayload as d, type DofolloApiResponse as e, type DofolloCacheEntry as f, type DofolloClientOptions as g, type DofolloRedirectMatch as h, type DofolloRedirectMiddlewareOptions as i, type DofolloSiteFixes as j, createDofolloRedirectMiddleware as k, createEmptyFixes as l, normalizeFixesShape as n, resolveDofolloRedirect as r };
