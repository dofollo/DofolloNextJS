# `@dofollo/nextjs`

Apply Dofollo SEO fixes to your Next.js site automatically. The package fetches published fixes from the Dofollo public API at request time on the server, caches them for 5 minutes by default, and lets you apply them in server components, metadata functions, and middleware without rebuilding your app.

## Install

```bash
npm install @dofollo/nextjs
```

## Quick Start

### 1. Configure a shared client

```ts
// lib/dofollo.ts
import { DofolloClient } from "@dofollo/nextjs";

const dofollo = new DofolloClient({
  siteId: process.env.DOFOLLO_SITE_ID!,
  apiKey: process.env.DOFOLLO_API_KEY!,
});

export default dofollo;
```

```env
# .env.local
DOFOLLO_SITE_ID=dofollo.ai
DOFOLLO_API_KEY=dflo_abc123...
```

### 2. Use schema and metadata fixes

```tsx
// app/about/page.tsx
import { DofolloSchema, getDofolloMetadata } from "@dofollo/nextjs";
import dofollo from "@/lib/dofollo";

const pageUrl = "https://dofollo.ai/about";

export async function generateMetadata() {
  return {
    ...(await getDofolloMetadata({
      client: dofollo,
      pageUrl,
      fallbackTitle: "About - Dofollo",
    })),
  };
}

export default async function AboutPage() {
  return (
    <>
      <DofolloSchema client={dofollo} pageUrl={pageUrl} />
      <h1>About Us</h1>
      <p>...</p>
    </>
  );
}
```

### 3. Apply content fixes to HTML

```tsx
import { applyContentFixes } from "@dofollo/nextjs";
import dofollo from "@/lib/dofollo";

export default async function BlogPost({ content }: { content: string }) {
  const pageUrl = "https://dofollo.ai/blog/seo-tips";
  const fixes = await dofollo.getFixesForPage(pageUrl);
  const fixedContent = applyContentFixes(content, fixes, { baseUrl: pageUrl });

  return <div dangerouslySetInnerHTML={{ __html: fixedContent }} />;
}
```

## API

### `DofolloClient`

```ts
import { DofolloClient } from "@dofollo/nextjs";

const dofollo = new DofolloClient({
  siteId: "dofollo.ai",
  apiKey: process.env.DOFOLLO_API_KEY!,
  apiUrl: "https://api.dofollo.ai",
  cacheTtl: 300,
});
```

Available methods:

- `getFixes()` returns the full site payload with `siteId`, `generatedAt`, and `fixes`.
- `getFixesForPage(pageUrl)` returns page-scoped fixes and falls back to empty arrays on error.
- `getSchema(pageUrl)` returns schema fixes for a page.
- `getTitle(pageUrl)` returns a single title fix or `null`.
- `getH1(pageUrl)` returns a single H1 fix or `null`.
- `getLinks(pageUrl)` returns internal link suggestions for a page.
- `getAltText(pageUrl)` returns image alt text fixes for a page.
- `getBrokenLinks(pageUrl)` returns broken link replacements for a page.

The client keeps an in-memory cache per request URL and also sets `next: { revalidate: cacheTtl }` on fetch requests. New fixes appear within the cache window without a rebuild or redeploy.

### `DofolloSchema`

Use `DofolloSchema` in a server component to inject JSON-LD:

```tsx
// app/layout.tsx
import { DofolloSchema } from "@dofollo/nextjs";
import dofollo from "@/lib/dofollo";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        <DofolloSchema client={dofollo} />
        {children}
      </body>
    </html>
  );
}
```

Pass `pageUrl` to inject schema for one page. Omit it to render every published schema entry for the site.

### `getDofolloMetadata` and `DofolloHead`

For the App Router, use `getDofolloMetadata()` inside `generateMetadata()`:

```tsx
import { getDofolloMetadata } from "@dofollo/nextjs";
import dofollo from "@/lib/dofollo";

export async function generateMetadata() {
  return {
    ...(await getDofolloMetadata({
      client: dofollo,
      pageUrl: "https://dofollo.ai/blog",
      fallbackTitle: "Blog - Dofollo",
    })),
  };
}
```

If you still want a title-tag component, `DofolloHead` renders a `<title>` element for `app/head.tsx` or Pages Router head usage.

### `applyContentFixes`

`applyContentFixes(html, fixes)` processes raw HTML and applies the fix types that can be handled safely on the server:

- Replaces broken link URLs in `<a href="...">`
- Updates matching `<h1>` content
- Updates `<img alt="...">` attributes by image URL

Internal link suggestions are exposed separately. The package does not auto-insert links into arbitrary HTML because placement is template-specific.

```tsx
import { applyContentFixes, getLinkSuggestions } from "@dofollo/nextjs";
import dofollo from "@/lib/dofollo";

export default async function BlogPost({ content }: { content: string }) {
  const pageUrl = "https://dofollo.ai/blog/seo-tips";
  const fixes = await dofollo.getFixesForPage(pageUrl);
  const fixedContent = applyContentFixes(content, fixes, { baseUrl: pageUrl });
  const linkSuggestions = getLinkSuggestions(fixes);

  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: fixedContent }} />
      {linkSuggestions.map((link) => (
        <p key={`${link.page_url}:${link.target_url}:${link.anchor_text}`}>
          Suggested link: {link.anchor_text} -&gt; {link.target_url}
        </p>
      ))}
    </>
  );
}
```

### `DofolloFixes`

If your page content is already HTML, `DofolloFixes` can fetch the fixes and render the updated markup for you:

```tsx
import { DofolloFixes } from "@dofollo/nextjs";
import dofollo from "@/lib/dofollo";

export default async function Page() {
  return (
    <DofolloFixes
      client={dofollo}
      pageUrl="https://dofollo.ai/about"
      html="<h1>About</h1><p>...</p>"
      as="article"
    />
  );
}
```

### Middleware helper

Use `createDofolloRedirectMiddleware()` to redirect incoming requests that match published broken URLs:

```ts
// middleware.ts
import { DofolloClient } from "@dofollo/nextjs";
import { createDofolloRedirectMiddleware } from "@dofollo/nextjs/middleware";

const dofollo = new DofolloClient({
  siteId: process.env.DOFOLLO_SITE_ID!,
  apiKey: process.env.DOFOLLO_API_KEY!,
});

export const middleware = createDofolloRedirectMiddleware(dofollo);
```

The middleware fetches site-wide broken link fixes, matches the incoming request URL against `broken_url`, and redirects to `new_url`.

## Behavior and Guarantees

- Server-side only: keep `DofolloClient` in server components, route handlers, `generateMetadata`, `getServerSideProps`, or middleware.
- Graceful fallback: API failures resolve to `null` or empty arrays and do not break rendering.
- Zero client-side JS: the provided components render plain server HTML.
- No rebuild for new fixes: published changes appear within the cache TTL without a redeploy.

## Build

```bash
npm run build
```

## Publish

```bash
npm login
npm publish --access public
```
## Support

[Contact Dofollo team here](https://dofollo.ai/support/)