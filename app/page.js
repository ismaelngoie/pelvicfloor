import HomeClient from "./HomeClient";

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
  alternates: { canonical: "/" },
};

export default function Home() {
  return <HomeClient />;
}
