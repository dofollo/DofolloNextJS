export interface SchemaFix {
  id: string;
  type: string;
  page_url: string;
  schema_markup: Record<string, unknown>;
  published_at: string;
}

export interface TitleFix {
  id: string;
  type: string;
  page_url: string;
  current_title: string;
  new_title: string;
  published_at: string;
}

export interface H1Fix {
  id: string;
  type: string;
  page_url: string;
  current_h1: string;
  new_h1: string;
  published_at: string;
}

export interface LinkFix {
  id: string;
  type: string;
  page_url: string;
  anchor_text: string;
  target_url: string;
  context: string;
  published_at: string;
}

export interface AltTextFix {
  id: string;
  type: string;
  page_url: string;
  image_url: string;
  current_alt: string;
  new_alt: string;
  published_at: string;
}

export interface BrokenLinkFix {
  id: string;
  type: string;
  page_url: string;
  broken_url: string;
  new_url: string;
  anchor_text: string;
  published_at: string;
}

export interface DofolloFixes {
  schema: SchemaFix[];
  titles: TitleFix[];
  h1: H1Fix[];
  links: LinkFix[];
  alt_text: AltTextFix[];
  broken_links: BrokenLinkFix[];
}

export interface DofolloApiPayload {
  site_id: string;
  generated_at: string;
  fixes: (SchemaFix | TitleFix | H1Fix | LinkFix | AltTextFix | BrokenLinkFix)[];
  total: number;
}

export interface Fix {
  id: string;
  type: string;
}

export interface DofolloApiResponse<T> {
  success: boolean;
  data?: T;
}

export type GenericFix = SchemaFix | TitleFix | H1Fix | LinkFix | AltTextFix | BrokenLinkFix;

export interface DofolloSiteFixes {
  siteId: string;
  generatedAt: string;
  fixes: GenericFix[];
}

export interface DofolloClientOptions {
  siteId: string;
  apiKey: string;
  apiUrl?: string;
  cacheTtl?: number;
  fetcher?: typeof fetch;
}

export interface DofolloCacheEntry<T> {
  data: T;
  expires: number;
}

export interface ApplyContentFixOptions {
  baseUrl?: string;
  onApplied?: (fixes: Fix[]) => void;
}

export interface DofolloMetadataResult {
  title?: string;
}

export interface DofolloRedirectMatch {
  destination: string;
  match: BrokenLinkFix;
  permanent: boolean;
}

export function createEmptyFixes(): DofolloFixes {
  return {
    schema: [],
    titles: [],
    h1: [],
    links: [],
    alt_text: [],
    broken_links: [],
  };
}

export function normalizeFixesShape(fixes?: Partial<DofolloFixes> | GenericFix[] | null): DofolloFixes {
  if (Array.isArray(fixes)) {
    return {
      schema: fixes.filter((f): f is SchemaFix => f.type === "schema"),
      titles: fixes.filter((f): f is TitleFix => f.type === "title"),
      h1: fixes.filter((f): f is H1Fix => f.type === "h1"),
      links: fixes.filter((f): f is LinkFix => f.type === "link"),
      alt_text: fixes.filter((f): f is AltTextFix => f.type === "alt_text"),
      broken_links: fixes.filter((f): f is BrokenLinkFix => f.type === "broken_link"),
    };
  }

  return {
    schema: Array.isArray(fixes?.schema) ? fixes.schema : [],
    titles: Array.isArray(fixes?.titles) ? fixes.titles : [],
    h1: Array.isArray(fixes?.h1) ? fixes.h1 : [],
    links: Array.isArray(fixes?.links) ? fixes.links : [],
    alt_text: Array.isArray(fixes?.alt_text) ? fixes.alt_text : [],
    broken_links: Array.isArray(fixes?.broken_links) ? fixes.broken_links : [],
  };
}
