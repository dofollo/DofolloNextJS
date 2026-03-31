import type { JSX, ReactElement } from "react";

import type { DofolloClient } from "../client";
import { applyContentFixes } from "../utils";

export interface DofolloFixesProps {
  client: Pick<DofolloClient, "getFixesForPage" | "confirmApplied">;
  pageUrl: string;
  html: string;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  baseUrl?: string;
}

export async function DofolloFixes({
  client,
  pageUrl,
  html,
  as = "div",
  className,
  baseUrl,
}: DofolloFixesProps): Promise<ReactElement> {
  const fixes = await client.getFixesForPage(pageUrl);
  const fixedContent = applyContentFixes(html, fixes, {
    baseUrl: baseUrl ?? pageUrl,
    onApplied: (applied) => {
      void client.confirmApplied(applied);
    },
  });
  const Wrapper = as;

  return <Wrapper className={className} dangerouslySetInnerHTML={{ __html: fixedContent }} />;
}
