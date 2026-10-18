"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Download, Smartphone } from "lucide-react";
import { INSTALL_GUIDES } from "@/lib/webAppInstall";
import { useWebAppInstall } from "./WebAppInstallProvider";
import { PrimaryButton, Sheet } from "./ui";
import { Segmented } from "./youUI";

const GUIDE_OPTIONS = [
  { id: "apple", title: "iPhone / iPad" },
  { id: "android", title: "Android" },
  { id: "desktop", title: "Computer" },
];

export default function WebAppInstall({ open, onClose }) {
  const { environment, outcome, requestInstall, ...install } = useWebAppInstall();
  const [guideId, setGuideId] = useState(environment?.guide || "apple");
  useEffect(() => { if (environment) setGuideId(environment.guide); }, [environment]);

  const guide = INSTALL_GUIDES[guideId];

  return (
    <Sheet open={open} onClose={onClose} title="Add to Home Screen" labelledBy="web-app-install-title">
      <div className="space-y-5 pb-3">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-app-primary/10">
            {install.installed ? <CheckCircle2 className="h-5 w-5 text-app-primary" aria-hidden="true" /> : <Smartphone className="h-5 w-5 text-app-primary" aria-hidden="true" />}
          </span>
          <div>
            <p className="text-[15px] font-semibold leading-snug text-app-textPrimary">
              {install.installed ? "Pelvi is ready to open like an app" : "Your plan, one tap away"}
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-app-textSecondary">
              {install.installed ? "You can return using the Pelvi icon on this device." : "Keep Pelvi beside your other apps and open your plan from its own icon."}
            </p>
          </div>
        </div>

        {!install.installed && <>
          {install.available || install.busy ? <PrimaryButton className="h-12 gap-2 text-[15px]" onClick={requestInstall} disabled={install.busy}>
            <Download className="h-4 w-4" aria-hidden="true" />
            {install.busy ? "Waiting for your browser…" : "Install Pelvi"}
          </PrimaryButton> : null}

          {outcome && <p role="status" className="rounded-xl bg-white px-3 py-2.5 text-[13px] leading-relaxed text-app-textSecondary">
            {outcome === "accepted" ? "Follow your browser to finish setup, then open Pelvi from its new icon." : outcome === "error" ? "Your browser could not open setup. You can still use its menu with the steps below." : "You can add Pelvi later. The steps below are always available here."}
          </p>}

          <Segmented options={GUIDE_OPTIONS} value={guideId} onChange={setGuideId} label="Setup device" />
          <div>
            <h3 className="text-[15px] font-semibold text-app-textPrimary">{guide.title}</h3>
            {environment?.browserHint && guideId === environment.guide && <p className="mt-2 text-[13px] leading-relaxed text-app-textSecondary">{environment.browserHint}</p>}
            <ol className="mt-3 space-y-3">
              {guide.steps.map((step, index) => <li key={step} className="flex gap-3 text-[14px] leading-relaxed text-app-textPrimary">
                <span aria-hidden="true" className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-app-primary/10 text-[12px] font-bold text-app-primary">{index + 1}</span>
                <span>{step}</span>
              </li>)}
            </ol>
            <a className="mt-4 inline-block text-[12px] font-semibold text-app-primary underline underline-offset-2" href={guide.url} target="_blank" rel="noopener noreferrer">{guide.source}</a>
          </div>
        </>}

        <p className="border-t border-atelier-line pt-3 text-[12px] leading-relaxed text-app-textSecondary">
          Use the same Pelvi account if asked to sign in. An internet connection is needed for your plan and videos.
        </p>
      </div>
    </Sheet>
  );
}
