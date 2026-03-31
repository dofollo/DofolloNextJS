export { DofolloClient } from "./client";
export { DofolloFixes } from "./components/DofolloFixes";
export {
  DofolloHead,
  getDofolloHeadData,
  getDofolloMetadata,
} from "./components/DofolloHead";
export { DofolloSchema } from "./components/DofolloSchema";
export {
  createDofolloRedirectMiddleware,
  resolveDofolloRedirect,
} from "./middleware";
export type { DofolloFixesProps } from "./components/DofolloFixes";
export type {
  DofolloHeadData,
  DofolloHeadProps,
} from "./components/DofolloHead";
export type { DofolloSchemaProps } from "./components/DofolloSchema";
export type {
  AltTextFix,
  ApplyContentFixOptions,
  BrokenLinkFix,
  DofolloApiPayload,
  DofolloApiResponse,
  DofolloCacheEntry,
  DofolloClientOptions,
  DofolloFixes as DofolloFixData,
  DofolloMetadataResult,
  DofolloRedirectMatch,
  DofolloSiteFixes,
  GenericFix,
  H1Fix,
  LinkFix,
  SchemaFix,
  TitleFix,
} from "./types";
export type { DofolloRedirectMiddlewareOptions } from "./middleware";
export { createEmptyFixes, normalizeFixesShape } from "./types";
export { applyContentFixes, getLinkSuggestions, normalizeUrl } from "./utils";
