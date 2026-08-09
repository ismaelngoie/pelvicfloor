import { smartBannerContent } from "@/lib/appStore";
import WelcomeClient from "./WelcomeClient";

// The post-purchase page, and the ONLY page on the site that carries the
// apple-itunes-app tag.
//
// Everything upstream of payment (landing, quiz, plan reveal, paywall) leaves
// it off on purpose. Apple's Smart App Banner is a one-tap exit to the App
// Store, and putting it on a funnel we pay to fill hands a warm visitor to a
// store page that converts a quarter of the people who see it. Downstream of
// payment it costs nothing and gains a member who can be reminded.

export const metadata = {
  title: "You're in",
  description:
    "Your Pelvi plan is ready. Get the app for daily reminders and the in-the-moment tools, or carry on in your browser.",
  robots: { index: false, follow: false },
  other: {
    // Safari on iOS only. Chrome on iOS, WKWebView and the Instagram, Facebook
    // and TikTok in-app browsers all ignore it, which is exactly why the HTML
    // install card below does the real work.
    "apple-itunes-app": smartBannerContent("success"),
  },
};

export default function WelcomePage() {
  return <WelcomeClient />;
}
