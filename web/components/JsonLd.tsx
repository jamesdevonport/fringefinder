// Renders a <script type="application/ld+json"> block. We JSON.stringify once
// and inject via dangerouslySetInnerHTML; Next's server rendering handles
// escaping of </script>-style payloads for us when the input is a plain object.
//
// Accepts a single object or an array — array entries are emitted as separate
// <script> tags (cleaner than wrapping in @graph for mixed @types).

import React from "react";

type JsonLdObject = Record<string, unknown>;

export function JsonLd({ data }: { data: JsonLdObject | JsonLdObject[] }) {
  const items = Array.isArray(data) ? data : [data];
  return (
    <>
      {items.map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(item).replace(/</g, "\\u003c"),
          }}
        />
      ))}
    </>
  );
}
