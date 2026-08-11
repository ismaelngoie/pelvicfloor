"use client";

// The Pelvi® Boutique.
//
// WHAT THE PHONE DOES, AND WHAT A BROWSER CAN DO ABOUT IT
//
// On iOS the boutique is a WKWebView (Scene/Main/Hub/PelviBoutique/PelviBoutique.swift)
// pointed at the storefront, with the shop's own header and footer hidden by an
// injected stylesheet and a pink banner pushed onto the top of the page reading
// "Welcome, {name}! Your exclusive 20% discount has been applied."
//
// A browser cannot do the frame half of that, and it is worth being precise
// about why rather than quietly dropping it: an iframe of the store is refused
// by the store itself (Shopify sends X-Frame-Options), and even if it were not,
// the same-origin policy forbids injecting a stylesheet or a banner into a
// document from another origin. The phone can do it because a WKWebView is not
// a frame — it is a browser the app owns.
//
// So this is the same shop, the same product, and the same discount, presented
// the way the phone presents it, and it hands over to the store in a new tab.
// The one thing she gets here that the phone's member does not is the discount
// code in text, so it survives the hop between tabs.
//
// THE URL IS LOAD BEARING. It is the phone's, character for character:
// /discount/APP20 applies the 20% at the till, and `redirect` lands her on the
// product rather than the shop's front page. Keep the redirect value
// percent-encoded (%2F, not /) or the query dies on the way through.

import { useState } from "react";
import { ArrowUpRight, BadgePercent, Check, Copy, ShoppingBag } from "lucide-react";
import { Sheet } from "./ui";

export const BOUTIQUE_URL =
  "https://vagitight.com/discount/APP20?redirect=%2Fproducts%2Fkegel-exerciser-pelvic-floor-trainer";

export const DISCOUNT_CODE = "APP20";

export default function Boutique({ open, onClose, name }) {
  const [copied, setCopied] = useState(false);
  const firstName = (name || "").trim().split(/\s+/)[0] || "Pelvi Member";

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(DISCOUNT_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard permission refused, or an insecure origin. The code is on the
      // screen in text either way, which is the whole reason it is printed.
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="The Pelvi® Boutique">
      <div className="pb-6">
        {/* The phone's injected banner, in its own markup rather than somebody
            else's document. Same words, same gradient. */}
        <div
          className="rounded-[18px] px-4 py-3 text-center text-white"
          style={{
            backgroundImage:
              "linear-gradient(90deg, hsl(348 77% 61%) 0%, hsl(289 72% 63%) 100%)",
          }}
        >
          <p className="text-[15px] font-semibold">Welcome, {firstName}!</p>
          <p className="mt-0.5 text-[12.5px] text-white/90">
            Your exclusive 20% discount has been applied.
          </p>
        </div>

        <div className="mt-4 rounded-[20px] border border-black/[0.06] bg-white p-4">
          <div className="flex items-start gap-3">
            <span
              className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl"
              style={{ backgroundImage: "linear-gradient(180deg, #4FC7EC 0%, #22A7D0 100%)" }}
            >
              <ShoppingBag className="h-6 w-6 text-white" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h3 className="text-[16px] font-bold leading-tight text-app-textPrimary">
                Kegel Exerciser &amp; Pelvic Floor Trainer
              </h3>
              {/* Deliberately no specifications, no materials and no claims:
                  this is another company's product page and every detail that
                  matters is on it. Anything written here would be a second,
                  unmaintained copy of somebody else's product description. */}
              <p className="mt-1 text-[13px] leading-snug text-app-textSecondary">
                Shop products we love. This is the one the Boutique opens on, and
                your member discount is already on it.
              </p>
            </div>
          </div>

          {/* The code and its button stack rather than sit side by side: at
              320px a three-column row leaves the sentence about four characters
              wide. */}
          <div className="mt-4 rounded-2xl bg-app-background p-3">
            <div className="flex items-start gap-2.5">
              <BadgePercent className="mt-0.5 h-5 w-5 shrink-0 text-app-primary" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-app-textPrimary">
                  Members save 20% with {DISCOUNT_CODE}
                </p>
                <p className="mt-0.5 text-[12px] leading-snug text-app-textSecondary">
                  It is applied for you at the till. The code is here in case you
                  come back to the shop later.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={copyCode}
              className="mt-2.5 flex h-10 w-full items-center justify-center gap-1.5 rounded-full border border-app-borderIdle bg-white text-[13px] font-semibold text-app-textPrimary"
            >
              {copied ? (
                <Check className="h-4 w-4 text-app-positive" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4" aria-hidden="true" />
              )}
              {copied ? "Code copied" : `Copy ${DISCOUNT_CODE}`}
            </button>
          </div>

          <a
            href={BOUTIQUE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-ios-pink text-[16px] font-bold text-white"
          >
            Shop the Boutique
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </a>
          <p className="mt-2 text-center text-[12px] text-app-textSecondary">
            Opens the shop in a new tab. Your plan stays open here.
          </p>
        </div>

        <p className="mt-4 text-[12.5px] leading-snug text-app-textSecondary">
          The Boutique is a separate shop with its own checkout, its own delivery
          and its own returns. Your Pelvi subscription is not affected by anything
          you buy there.
        </p>
      </div>
    </Sheet>
  );
}
