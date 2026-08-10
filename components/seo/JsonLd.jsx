// Renders one JSON-LD block. Server component: no "use client", no hooks, no
// state. It is a <script> tag and nothing more.
//
// WHY NOT next/script. next/script defers by design, and a deferred structured
// data block is a structured data block that a crawler which does not run
// JavaScript never sees. This has to be a plain <script> in the initial HTML,
// which is what dangerouslySetInnerHTML on a server component produces.
//
// The `<` escape is the one real hazard: a JSON string containing "</script>"
// would close the tag early and hand the rest of the graph to the HTML parser
// as markup. Nothing in this repo's data does that today, and escaping it
// costs nothing, so it is escaped rather than trusted.

export default function JsonLd({ data, id }) {
  if (!data) return null;

  const json = JSON.stringify(data).replace(/</g, "\\u003c");

  return (
    <script
      type="application/ld+json"
      id={id}
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
