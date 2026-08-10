import { BlogFooter, BlogHeader } from "@/components/blog/BlogChrome";

// The root layout locks the viewport at maximumScale 1 with userScalable off,
// which is the right call for the funnel: it is a phone app pretending to be a
// web page, and a stray double-tap zoom in the middle of checkout is a lost
// sale. It is the wrong call for two thousand words of body text. Pinching to
// zoom is how a woman with tired eyes reads an article, and taking it away is a
// WCAG failure the moment the page is prose rather than a control surface.
//
// A nested viewport export replaces the root one for these routes only, so the
// funnel keeps its lock and the articles become readable.
export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FAF9FA",
};

export default function BlogLayout({ children }) {
  return (
    <div className="min-h-full bg-app-background">
      <BlogHeader />
      {children}
      <BlogFooter />
    </div>
  );
}
