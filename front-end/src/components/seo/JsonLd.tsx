import { Helmet } from 'react-helmet-async';

type JsonLdValue = unknown;

type Props = {
  /** Single schema.org object, or an array of them. Will be serialized via JSON.stringify. */
  data: JsonLdValue | JsonLdValue[];
};

/**
 * Page-level structured-data emitter. Sits next to <PublicSeo> and uses
 * react-helmet-async so per-page schema dedupes against any default shipped
 * in index.html. The site already emits Organization + WebSite globally; this
 * is for FAQPage / SoftwareApplication / Person / Article / BreadcrumbList /
 * etc. that only make sense on a specific page.
 *
 *   <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", ... }} />
 *
 * Pass an array to emit multiple schema blocks from one page:
 *
 *   <JsonLd data={[breadcrumbSchema, faqSchema]} />
 */
export default function JsonLd({ data }: Props) {
  const blocks = Array.isArray(data) ? data : [data];
  return (
    <Helmet>
      {blocks.map((block, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(block)}
        </script>
      ))}
    </Helmet>
  );
}
