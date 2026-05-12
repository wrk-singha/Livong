// Sets the <title> element for a client-component page using React 19's
// hoistable tag (any <title> in the tree is automatically lifted into <head>).
//
// Wired so that `apps/web/src/app/layout.tsx` does NOT set metadata.title
// (only sets `template`); otherwise Next.js 16's MetadataOutlet appends a
// second <title> after ours and wins document.title.
//
// Usage: <PageTitle title="Sign in" />          → "Sign in — Livong"
//        <PageTitle title={dynamicValue} />     → updates reactively
import type { ReactElement } from "react";

const SUFFIX = " — Livong";
const FALLBACK = "Livong — Find your perfect roommate";

export function PageTitle({ title }: { title: string | null | undefined }): ReactElement {
  return <title>{title ? `${title}${SUFFIX}` : FALLBACK}</title>;
}
