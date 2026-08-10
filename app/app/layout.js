import "./app.css";
import MemberFrame from "@/components/member/MemberFrame";
import { smartBannerMeta } from "@/lib/appStore";

// The member app is behind a gate and has nothing a search engine should hold.
export const metadata = {
  title: "Your Plan",
  robots: { index: false, follow: false },
  other: {
    // APPLE'S SMART APP BANNER, on every signed-in page. Spread, not assigned:
    // smartBannerMeta returns {} while APP_HANDOFF_READY is false, which it is
    // today, so no tag is emitted at all. Read that constant in lib/appStore.js
    // before turning any of this on. The short version is that the shipped
    // iPhone app cannot unlock from a web purchase, so the banner's only effect
    // on a web member is a trip to a second paywall.
    //
    // WHEN IT IS ON, THIS IS THE RIGHT PLACE FOR IT AND THE FUNNEL IS NOT. The
    // banner is a one-tap exit into the App Store. On the funnel that is a warm
    // visitor we paid for walking out of a checkout to save a commission we
    // have not earned yet, and the arithmetic in recon/APP-BANNER-RESEARCH.md
    // says there is no install-and-return rate at which that trade wins. So /,
    // the quiz, the plan reveal and the paywall carry no such tag and must
    // never be given one.
    //
    // WHY A STATIC TAG IS THE RIGHT ANSWER TO "ONLY FOR A MEMBER WHO HAS PAID".
    // Safari reads this at parse time, so it cannot be injected later once
    // entitlement comes back from Stripe: a tag added by script is not reliably
    // picked up, and this is a static export with no server to branch on. What
    // makes it honest anyway is that /app IS the paid area.
    // components/member/MemberShell.js refuses to render anything under this
    // layout without a live entitlement, so the only visitor who reaches this
    // tag without one is sitting on the sign-in or the recovery screen, and
    // that person is a member on the wrong device far more often than she is a
    // prospect. APP-BANNER-RESEARCH.md recommends a campaign token for exactly
    // that surface.
    //
    // No app-argument. It has to be a full URL and it is only worth carrying
    // once Universal Links ship on the app side; a pelvi:// scheme here would
    // be a second, competing deep-link scheme, and PelviRouter on iOS discards
    // the query string today, so it could not read a handoff token even if one
    // were passed.
    ...smartBannerMeta("member"),
  },
};

export default function AppLayout({ children }) {
  return <MemberFrame>{children}</MemberFrame>;
}
