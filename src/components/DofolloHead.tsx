import type { ReactElement } from "react";

import type { DofolloClient } from "../client";
import type { DofolloMetadataResult, TitleFix } from "../types";

export interface DofolloHeadProps {
  client: Pick<DofolloClient, "getTitle">;
  pageUrl: string;
  fallbackTitle?: string | null;
}

export interface DofolloHeadData {
  title: string | null;
  titleFix: TitleFix | null;
}

export async function getDofolloHeadData({
  client,
  pageUrl,
  fallbackTitle = null,
}: DofolloHeadProps): Promise<DofolloHeadData> {
  const titleFix = await client.getTitle(pageUrl);

  return {
    title: titleFix?.new_title ?? fallbackTitle,
    titleFix,
  };
}

export async function getDofolloMetadata(props: DofolloHeadProps): Promise<DofolloMetadataResult> {
  const { title } = await getDofolloHeadData(props);

  if (!title) {
    return {};
  }

  return { title };
}

export async function DofolloHead(props: DofolloHeadProps): Promise<ReactElement | null> {
  const { title } = await getDofolloHeadData(props);

  if (!title) {
    return null;
  }

  return <title>{title}</title>;
}
