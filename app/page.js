import HomeClient from "./HomeClient";
import JsonLd from "@/components/seo/JsonLd";
import { homepageGraph } from "@/lib/seo/schema";

// The landing page is a server component purely so it can own its own metadata.
// Everything it renders is in HomeClient.
//
// The canonical is the point. This route is where every paid click lands, and
// it arrives as /?gclid=..., /?utm_source=..., /?fbclid=..., one distinct URL
// per ad impression, plus /index.html from the static export. Without a
// canonical those all compete with each other in the index and split the
// authority the blog spends its time building.
//
// Note what is NOT here: apple-itunes-app. Apple's Smart App Banner is a one
// tap exit to the App Store, and this is the screen we pay to fill. It appears
// on /welcome, after payment, and nowhere else.

export const metadata = {
  // Trailing slash. Cloudflare Pages serves the export's index.html at
  // https://pelvi.health/ and the canonical has to name the URL that actually
  // answers, or the tag points one hop away from the page declaring it.
  alternates: { canonical: "https://pelvi.health/" },
};

export default function Home() {
  // The homepage is the entity anchor for the whole brand, and until now it
  // declared nothing machine-readable: no company, no app, no price. An
  // assistant asked "is there a pelvic floor app with a money-back guarantee"
  // had eighty words of hero copy to work from and no structured claim at all.
  //
  // This renders into the initial HTML, before hydration, so it survives a
  // crawler that does not execute JavaScript. It adds no client bytes: the
  // graph is built at export time and shipped as text.
  return (
    <>
      <JsonLd id="pelvi-graph" data={homepageGraph()} />
      <HomeClient />
    </>
  );
}
