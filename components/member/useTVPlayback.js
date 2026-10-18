"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { castMediaDescriptor, createGoogleCastClient, loadGoogleCast, tvPlaybackSupport } from "@/lib/tvPlayback";

export default function useTVPlayback({ videoRef, video, revision = 0, volume = 1, muted = false, onSample, onEnded, onDisconnect }) {
  const [open, setOpen] = useState(false);
  const [support, setSupport] = useState({ airPlay: false, googleCast: false });
  const [castStatus, setCastStatus] = useState("idle");
  const [state, setState] = useState({ connected: false, loading: false, name: "" });
  const [airPlaying, setAirPlaying] = useState(false);
  const [error, setError] = useState("");
  const clientRef = useRef(null);
  const activeRef = useRef(false);
  const handlersRef = useRef({});
  const previousLoadRef = useRef({ connected: false, key: null });
  handlersRef.current = { video, onSample, onEnded, onDisconnect, volume, muted };

  useEffect(() => {
    const el = videoRef.current;
    setSupport(tvPlaybackSupport(el, { userAgent: navigator.userAgent, maxTouchPoints: navigator.maxTouchPoints, secure: window.isSecureContext }));
    const wireless = () => setAirPlaying(Boolean(el?.webkitCurrentPlaybackTargetIsWireless));
    el?.addEventListener("webkitcurrentplaybacktargetiswirelesschanged", wireless);
    wireless();
    return () => el?.removeEventListener("webkitcurrentplaybacktargetiswirelesschanged", wireless);
  }, [videoRef, video?.url]);

  useEffect(() => () => {
    activeRef.current = false;
    clientRef.current?.dispose();
    clientRef.current = null;
  }, []);

  // Load Google's optional SDK only after the member opens the TV controls.
  useEffect(() => {
    if (!open || !support.googleCast || clientRef.current) return undefined;
    let cancelled = false;
    setCastStatus("loading");
    loadGoogleCast().then((scope) => {
      if (cancelled) return;
      clientRef.current = createGoogleCastClient(scope, {
        onState(value) {
          if (value.connected != null) activeRef.current = value.connected;
          if (value.connected) videoRef.current?.pause();
          setState((current) => ({ ...current, ...value }));
        },
        onSample(value) {
          if (value.contentId === handlersRef.current.video?.url) handlersRef.current.onSample?.(value);
        },
        onEnded(value) {
          if (value.contentId === handlersRef.current.video?.url) handlersRef.current.onEnded?.(value);
        },
        onDisconnect(position, contentId) {
          const el = videoRef.current;
          if (el && contentId === handlersRef.current.video?.url && Number.isFinite(position)) {
            const restored = Math.max(0, Math.min(position, Number.isFinite(el.duration) ? el.duration : position));
            el.currentTime = restored;
            handlersRef.current.onDisconnect?.(restored);
          }
        },
        onError(message) { setError(message); setOpen(true); },
      });
      setCastStatus("ready");
    }).catch(() => { if (!cancelled) setCastStatus("unavailable"); });
    return () => { cancelled = true; };
  }, [open, support.googleCast, videoRef]);

  useEffect(() => {
    const key = `${video?.url}-${revision}`;
    const switchedClip = previousLoadRef.current.connected && previousLoadRef.current.key !== key;
    if (state.connected && video) void clientRef.current?.load(video, switchedClip ? 0 : videoRef.current?.currentTime || 0, handlersRef.current);
    previousLoadRef.current = { connected: state.connected, key };
    // A video change sends exactly one load to the connected receiver.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.connected, video?.url, revision]);

  const connect = useCallback(async () => {
    setError("");
    try {
      const connected = await clientRef.current?.connect();
      if (connected) setOpen(false);
    } catch (failure) {
      const code = failure?.code || failure;
      if (!["cancel", "CANCEL", "cancelled"].includes(code)) setError("No connection was made. Check that your TV and this device are on the same Wi-Fi, then try again.");
    }
  }, []);

  const showAirPlay = useCallback(() => {
    setError("");
    try { videoRef.current?.webkitShowPlaybackTargetPicker(); setOpen(false); }
    catch { setError("AirPlay couldn’t open. Try Safari and check that your TV and iPhone are on the same Wi-Fi."); }
  }, [videoRef]);

  return {
    open, setOpen, support, castStatus, ...state, airPlaying, error, activeRef,
    castCompatible: Boolean(castMediaDescriptor(video)),
    connect, showAirPlay,
    pause: () => clientRef.current?.pause(),
    replay: () => clientRef.current?.load(handlersRef.current.video, 0, handlersRef.current),
    toggle: () => clientRef.current?.toggle(),
    seek: (time) => clientRef.current?.seek(time),
    volume: (value, muted) => clientRef.current?.volume(value, muted),
    stop: () => clientRef.current?.stop(),
  };
}
