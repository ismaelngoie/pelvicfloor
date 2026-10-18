"use client";

import { Airplay, Cast, Check, Loader2, Maximize, Tv, X } from "lucide-react";
import { useEffect, useRef } from "react";

export default function WatchOnTV({ tv, onFullScreen, fullScreenAvailable }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    if (!tv.open) return undefined;
    const previous = document.activeElement;
    dialogRef.current?.querySelector('button:not([disabled])')?.focus();
    return () => previous?.focus?.();
  }, [tv.open]);
  if (!tv.open) return null;
  const onKeyDown = (event) => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); tv.setOpen(false); }
    if (event.key !== "Tab") return;
    const nodes = [...dialogRef.current.querySelectorAll('button:not([disabled]), a[href]')];
    if (event.shiftKey && document.activeElement === nodes[0]) { event.preventDefault(); nodes.at(-1)?.focus(); }
    else if (!event.shiftKey && document.activeElement === nodes.at(-1)) { event.preventDefault(); nodes[0]?.focus(); }
  };
  return <div className="fixed inset-0 z-[85] flex items-end justify-center bg-black/65 p-3 sm:items-center sm:p-6" onClick={() => tv.setOpen(false)}>
    <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="watch-tv-title" onKeyDown={onKeyDown} onClick={(event) => event.stopPropagation()} className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-[28px] bg-atelier-paper p-6 text-atelier-ink shadow-2xl outline-none">
      <div className="flex items-start justify-between gap-4"><div><Tv className="h-7 w-7 text-atelier-rosewood" aria-hidden="true" /><h2 id="watch-tv-title" className="mt-4 font-serif text-[30px]">Watch on TV</h2></div><button type="button" onClick={() => tv.setOpen(false)} aria-label="Close TV options" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-atelier-line"><X className="h-5 w-5" /></button></div>
      <p className="mt-3 text-sm leading-relaxed text-atelier-ink2">A little more room to follow along. Connect your TV and this device to the same Wi-Fi.</p>
      {tv.error && <p role="alert" className="mt-4 rounded-2xl border border-atelier-line bg-white p-4 text-sm leading-relaxed text-atelier-rosewood">{tv.error}</p>}
      <div className="mt-5 space-y-3">
        <Option icon={Airplay} title={tv.airPlaying ? "AirPlay connected" : "AirPlay"} detail={tv.support.airPlay ? "Choose Apple TV or an AirPlay-compatible TV." : "Open Pelvi in Safari on your iPhone, iPad, or Mac to use AirPlay."} disabled={!tv.support.airPlay} onClick={tv.showAirPlay} />
        <Option icon={Cast} title={tv.connected ? `Connected to ${tv.name}` : "Chromecast / Google TV"} detail={!tv.castCompatible ? "This video uses a format for local playback or AirPlay. Screen mirroring is another option." : !tv.support.googleCast ? "Available in supported Chrome browsers on Android and computers. On iPhone, use AirPlay." : tv.castStatus === "loading" ? "Preparing TV connection…" : tv.castStatus === "unavailable" ? "Casting isn’t available in this browser. Try Chrome with a compatible TV nearby." : "Choose a Chromecast or Google Cast-enabled TV."} disabled={tv.connected || !tv.castCompatible || tv.castStatus !== "ready"} onClick={tv.connect} busy={tv.castStatus === "loading"} />
        {tv.connected && <button type="button" onClick={() => { tv.stop(); tv.setOpen(false); }} className="min-h-11 w-full rounded-full border border-atelier-line text-sm font-semibold text-atelier-rosewood">Stop casting and return here</button>}
        {fullScreenAvailable && <button type="button" onClick={() => { tv.setOpen(false); onFullScreen(); }} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-atelier-line text-sm font-semibold"><Maximize className="h-4 w-4" aria-hidden="true" />Full screen on this device</button>}
      </div>
      <div className="mt-5 rounded-2xl border border-atelier-line bg-white/70 p-4"><p className="flex items-center gap-2 text-xs font-semibold"><Check className="h-4 w-4 text-atelier-rosewood" />Your phone stays in control</p><p className="mt-2 text-xs leading-relaxed text-atelier-ink2">Keep this page open for progress, guided practice, and the next exercise. Only the video appears on your TV; the practice timer stays here. Mirror mode applies to this screen.</p></div>
      <p className="mt-4 text-xs leading-relaxed text-atelier-ink3">No TV listed? Check Wi-Fi and your TV’s AirPlay or Google Cast setting. You can also use your device’s screen mirroring. TV compatibility varies by model and video format.</p>
    </section>
  </div>;
}

function Option({ icon: Icon, title, detail, disabled, busy, onClick }) {
  return <button type="button" disabled={disabled} onClick={onClick} className="flex min-h-[76px] w-full items-center gap-3 rounded-2xl border border-atelier-line bg-white p-4 text-left transition-colors enabled:active:bg-atelier-paper disabled:bg-white/50"><Icon className={`h-6 w-6 shrink-0 ${disabled ? "text-atelier-ink3" : "text-atelier-rosewood"}`} aria-hidden="true" /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{title}</span><span className="mt-1 block text-xs leading-relaxed text-atelier-ink2">{detail}</span></span>{busy && <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-label="Loading TV support" />}</button>;
}
