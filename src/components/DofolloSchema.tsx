import type { ReactElement } from "react";

import type { DofolloClient } from "../client";
import { normalizeFixesShape } from "../types";

export interface DofolloSchemaProps {
  client: Pick<DofolloClient, "getFixes" | "getSchema">;
  pageUrl?: string;
}

export async function DofolloSchema({
  client,
  pageUrl,
}: DofolloSchemaProps): Promise<ReactElement | null> {
  const schemaFixes = pageUrl
    ? await client.getSchema(pageUrl)
    : normalizeFixesShape((await client.getFixes())?.fixes ?? []).schema;

  if (!schemaFixes.length) {
    return null;
  }

  return (
    <>
      {schemaFixes.map((fix, index) => (
        <script
          key={`${fix.page_url}:${fix.published_at}:${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(fix.schema_markup),
          }}
        />
      ))}
    </>
  );
}
