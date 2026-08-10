import { smartBannerMeta } from "@/lib/appStore";
import WelcomeClient from "./WelcomeClient";

// The post-purchase page: the 90-day guarantee intro, ported from the iPhone
// app's ProgramIntroView.

export const metadata = {
  title: "Your 90 days start now",
  description:
    "Your Pelvi plan is ready. Start day one and your 90-day goal guarantee begins today.",
  robots: { index: false, follow: false },
  other: {
    // Apple's Smart App Banner. Spread, not assigned: smartBannerMeta returns
    // {} while APP_HANDOFF_READY is false, which it is today, so this page ships
    // without the tag it used to carry. That is a deliberate removal and the
    // reasoning is on the constant in lib/appStore.js: the shipped iPhone app
    // has no way to unlock from a web purchase, so sending the woman who just
    // paid on this page to the App Store lands her on a second paywall.
    //
    // When it comes back, this page and /app are the only two surfaces that get
    // it. Everything upstream of payment (landing, quiz, plan reveal, paywall)
    // stays without it forever: the banner is a one-tap exit to the App Store,
    // and putting it on a funnel we pay to fill hands a warm visitor to a store
    // page that converts a quarter of the people who see it. The full argument
    // is in recon/APP-BANNER-RESEARCH.md.
    ...smartBannerMeta("success"),
  },
};

export default function WelcomePage() {
  return <WelcomeClient />;
}
