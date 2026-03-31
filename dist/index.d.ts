import { D as DofolloClient, T as TitleFix, a as DofolloMetadataResult, b as DofolloFixes$1, A as ApplyContentFixOptions, L as LinkFix } from './middleware-Fk8pCozL.js';
export { c as AltTextFix, B as BrokenLinkFix, d as DofolloApiPayload, e as DofolloApiResponse, f as DofolloCacheEntry, g as DofolloClientOptions, h as DofolloRedirectMatch, i as DofolloRedirectMiddlewareOptions, j as DofolloSiteFixes, G as GenericFix, H as H1Fix, S as SchemaFix, k as createDofolloRedirectMiddleware, l as createEmptyFixes, n as normalizeFixesShape, r as resolveDofolloRedirect } from './middleware-Fk8pCozL.js';
import { JSX, ReactElement } from 'react';
import 'next/server';

interface DofolloFixesProps {
    client: Pick<DofolloClient, "getFixesForPage" | "confirmApplied">;
    pageUrl: string;
    html: string;
    as?: keyof JSX.IntrinsicElements;
    className?: string;
    baseUrl?: string;
}
declare function DofolloFixes({ client, pageUrl, html, as, className, baseUrl, }: DofolloFixesProps): Promise<ReactElement>;

interface DofolloHeadProps {
    client: Pick<DofolloClient, "getTitle">;
    pageUrl: string;
    fallbackTitle?: string | null;
}
interface DofolloHeadData {
    title: string | null;
    titleFix: TitleFix | null;
}
declare function getDofolloHeadData({ client, pageUrl, fallbackTitle, }: DofolloHeadProps): Promise<DofolloHeadData>;
declare function getDofolloMetadata(props: DofolloHeadProps): Promise<DofolloMetadataResult>;
declare function DofolloHead(props: DofolloHeadProps): Promise<ReactElement | null>;

interface DofolloSchemaProps {
    client: Pick<DofolloClient, "getFixes" | "getSchema">;
    pageUrl?: string;
}
declare function DofolloSchema({ client, pageUrl, }: DofolloSchemaProps): Promise<ReactElement | null>;

declare function normalizeUrl(value: string, baseUrl?: string): string;
declare function applyContentFixes(html: string, fixes: Partial<DofolloFixes$1> | null | undefined, options?: ApplyContentFixOptions): string;
declare function getLinkSuggestions(fixes: Partial<DofolloFixes$1> | null | undefined): LinkFix[];

export { ApplyContentFixOptions, DofolloClient, DofolloFixes$1 as DofolloFixData, DofolloFixes, type DofolloFixesProps, DofolloHead, type DofolloHeadData, type DofolloHeadProps, DofolloMetadataResult, DofolloSchema, type DofolloSchemaProps, LinkFix, TitleFix, applyContentFixes, getDofolloHeadData, getDofolloMetadata, getLinkSuggestions, normalizeUrl };
