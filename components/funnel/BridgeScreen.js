"use client";

// Dr Reed's 26 seconds between the reveal and the paywall
// (DrReedBridgeViewController): full bleed, sound on, a ghost Skip in the
// bottom right, and straight on to the paywall when the clip ends.

import React, { useEffect, useRef } from "react";
import { DR_REED } from "./revealCopy";
import { track } from "@/lib/analytics";
import DrReedVideo from "./DrReedVideo";

export default function BridgeScreen({ onDone }) {
  const doneRef = useRef(false);
  const finish = (reason) => {
    if (doneRef.current) return;
    doneRef.current = true;
    track(reason === "skip" ? "reviewer_bridge_skipped" : "reviewer_bridge_completed");
    onDone();
  };
  useEffect(() => {
    track("reviewer_bridge_viewed");
  }, []);
  return (
    <div className="relative h-full w-full bg-black">
      <DrReedVideo src={DR_REED.bridge} fill onFinish={() => finish("end")} className="h-full w-full" />
      <button
        type="button"
        onClick={() => finish("skip")}
        className="absolute bottom-[max(env(safe-area-inset-bottom),20px)] right-5 rounded-full border border-white/35 bg-black/30 px-4 py-2 text-[14px] font-semibold text-white/90 backdrop-blur"
        id="onboarding.bridge.skip"
      >
        {DR_REED.skip}
      </button>
    </div>
  );
}
