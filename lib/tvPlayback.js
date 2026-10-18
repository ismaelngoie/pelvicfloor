// TV transports are optional. They never change member identity or send health
// records to a receiver; the load request contains only the chosen video.
export const CAST_SDK_URL = "https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1";

export function tvPlaybackSupport(video, { userAgent = "", maxTouchPoints = 0, secure = true } = {}) {
  const ios = /iPhone|iPad|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && maxTouchPoints > 1);
  return {
    airPlay: typeof video?.webkitShowPlaybackTargetPicker === "function",
    googleCast: secure && !ios && /Chrome|Chromium|Edg\//i.test(userAgent),
  };
}

export function castMediaDescriptor(video, startTime = 0) {
  let url;
  try { url = new URL(video?.url); } catch { return null; }
  if (url.protocol !== "https:") return null;
  let path;
  try { path = decodeURIComponent(url.pathname).toLowerCase(); } catch { return null; }
  // QuickTime files remain available locally and over AirPlay. Advertising
  // them as MP4 would not convert them into a Cast-supported container.
  if (video?.format?.toLowerCase() === "mov" || path.endsWith(".mov")) return null;
  const contentType = path.endsWith(".m3u8") ? "application/x-mpegURL"
    : path.endsWith(".mpd") ? "application/dash+xml"
      : path.endsWith(".webm") ? "video/webm" : "video/mp4";
  const position = Number(startTime);
  return { contentId: url.href, contentType, title: video?.title || "Pelvi exercise", startTime: Number.isFinite(position) ? Math.max(0, position) : 0 };
}

export function createRemotePlaybackSample() { return { previous: null }; }
export function resetRemotePlaybackSample(sample) { sample.previous = null; }

// A receiver position is not a watch-duration counter. Reject seeks, switches,
// paused/buffering intervals and gaps while the sender cannot observe playback.
export function sampleRemotePlayback(sample, { contentId, time, playing, now }) {
  const previous = sample.previous;
  sample.previous = { contentId, time, playing, now };
  if (!previous || previous.contentId !== contentId || !previous.playing || !playing) return 0;
  const delta = time - previous.time;
  const elapsed = (now - previous.now) / 1000;
  return Number.isFinite(delta) && elapsed > 0 && elapsed < 2 && delta > 0 && delta < 2
    && delta <= elapsed * 1.25 + 0.15 ? delta : 0;
}

const sdkLoads = new WeakMap();
let connectionTicket = 0;
export function loadGoogleCast(scope = window) {
  if (scope.cast?.framework && scope.chrome?.cast?.isAvailable) return Promise.resolve(scope);
  if (sdkLoads.has(scope)) return sdkLoads.get(scope);
  const promise = new Promise((resolve, reject) => {
    let settled = false;
    let script;
    const previous = scope.__onGCastApiAvailable;
    const finish = (available) => {
      if (settled) return;
      settled = true;
      scope.clearTimeout(timeout);
      scope.__onGCastApiAvailable = previous;
      if (available && scope.cast?.framework) resolve(scope);
      else { script?.remove(); sdkLoads.delete(scope); reject(new Error("cast_unavailable")); }
    };
    const timeout = scope.setTimeout(() => finish(false), 15000);
    scope.__onGCastApiAvailable = (available) => {
      try { previous?.(available); } finally { finish(available); }
    };
    script = scope.document.querySelector('script[data-pelvi-cast-sdk]');
    if (!script) {
      script = scope.document.createElement("script");
      script.src = CAST_SDK_URL;
      script.async = true;
      script.dataset.pelviCastSdk = "true";
      script.onerror = () => { script.remove(); finish(false); };
      scope.document.head.appendChild(script);
    }
  });
  sdkLoads.set(scope, promise);
  return promise;
}

export function createGoogleCastClient(scope, { onState, onSample, onEnded, onDisconnect, onError } = {}) {
  const framework = scope.cast.framework;
  const api = scope.chrome.cast;
  const context = framework.CastContext.getInstance();
  context.setOptions({ receiverApplicationId: api.media.DEFAULT_MEDIA_RECEIVER_APP_ID, autoJoinPolicy: api.AutoJoinPolicy.TAB_AND_ORIGIN_SCOPED });
  const player = new framework.RemotePlayer();
  const controller = new framework.RemotePlayerController(player);
  const sample = createRemotePlaybackSample();
  let session = null;
  let expected = null;
  let ready = false;
  let generation = 0;
  let ended = false;
  let disposed = false;
  let lastPosition = 0;
  let timer = null;
  let connectPromise = null;
  let loadQueue = Promise.resolve();
  let pauseRequested = false;
  let sound = { volume: 1, muted: false, revision: 0 };
  const report = (value) => { if (!disposed) onState?.(value); };
  const currentMedia = () => session?.getMediaSession?.();
  const fail = () => { if (!disposed) onError?.("The TV couldn’t play this video. You can continue here, or try AirPlay or screen mirroring."); };
  const read = () => {
    if (disposed || !session || !ready || !expected) return;
    const media = currentMedia();
    if (!media || media.media?.contentId !== expected.contentId) {
      resetRemotePlaybackSample(sample);
      if (media?.media?.contentId) stop(false);
      return;
    }
    const state = media.playerState;
    const playing = state === api.media.PlayerState.PLAYING;
    if (pauseRequested && playing) pauseOwned();
    const time = Number(media.getEstimatedTime?.() ?? player.currentTime) || 0;
    const duration = Number(media.media?.duration || player.duration) || 0;
    lastPosition = time;
    const delta = sampleRemotePlayback(sample, { contentId: expected.contentId, time, playing, now: scope.performance.now() });
    onSample?.({ contentId: expected.contentId, time, duration, playing, waiting: state === api.media.PlayerState.BUFFERING, delta });
    if (state === api.media.PlayerState.IDLE && !ended) {
      if (media.idleReason === api.media.IdleReason.FINISHED) { ended = true; onEnded?.({ contentId: expected.contentId, duration }); }
      else if (media.idleReason === api.media.IdleReason.ERROR) { ended = true; stop(); fail(); }
      else if ([api.media.IdleReason.CANCELLED, api.media.IdleReason.INTERRUPTED].includes(media.idleReason)) { ended = true; stop(false); }
    }
  };
  const stateChanged = (event) => {
    if (session && event.sessionState === framework.SessionState.SESSION_ENDED) stop(false);
  };
  function stop(endReceiver = true) {
    const previous = session;
    const position = lastPosition;
    const contentId = expected?.contentId;
    const foreignMedia = ready && contentId && currentMedia()?.media?.contentId && currentMedia().media.contentId !== contentId;
    session = null; expected = null; ready = false; generation += 1;
    resetRemotePlaybackSample(sample);
    if (timer != null) scope.clearInterval(timer);
    timer = null;
    if (previous && endReceiver && !foreignMedia) { try { previous.endSession(true); } catch { /* Already disconnected. */ } }
    report({ connected: false, loading: false, name: "" });
    if (previous && !disposed) onDisconnect?.(position, contentId);
  }
  const ownsMedia = () => {
    if (!session || !ready || !expected) return false;
    if (currentMedia()?.media?.contentId !== expected.contentId) { stop(false); return false; }
    return true;
  };
  function pauseOwned() {
    pauseRequested = true;
    if (ownsMedia()) {
      const media = currentMedia();
      const attempt = generation;
      if (typeof media.pause === "function") media.pause(null, () => {}, () => { if (!disposed && attempt === generation) { stop(); fail(); } });
      else if (!player.isPaused) controller.playOrPause();
    }
    resetRemotePlaybackSample(sample);
  }
  controller.addEventListener(framework.RemotePlayerEventType.ANY_CHANGE, read);
  context.addEventListener(framework.CastContextEventType.SESSION_STATE_CHANGED, stateChanged);
  return {
    connect() {
      if (connectPromise) return connectPromise;
      if (disposed) return Promise.resolve(false);
      const attempt = ++generation;
      const ticket = ++connectionTicket;
      const initialSession = context.getCurrentSession();
      connectPromise = (async () => {
        await context.requestSession();
        const candidate = context.getCurrentSession();
        if (disposed || attempt !== generation) {
          if (candidate && candidate !== initialSession && ticket === connectionTicket) candidate.endSession(true);
          return false;
        }
        session = candidate;
        if (!session) return false;
        if (timer != null) scope.clearInterval(timer);
        timer = scope.setInterval(read, 500);
        report({ connected: true, loading: false, name: session.getCastDevice()?.friendlyName || "your TV" });
        return true;
      })().finally(() => { connectPromise = null; });
      return connectPromise;
    },
    async load(video, position = 0, { volume = 1, muted = false } = {}) {
      const descriptor = castMediaDescriptor(video, position);
      if (!session || !descriptor || disposed) { if (session && !descriptor) { stop(); fail(); } return false; }
      const attempt = ++generation;
      expected = descriptor; ready = false; ended = false; pauseRequested = false; lastPosition = descriptor.startTime;
      sound = { volume, muted, revision: sound.revision + 1 };
      resetRemotePlaybackSample(sample);
      report({ connected: true, loading: true });
      const info = new api.media.MediaInfo(descriptor.contentId, descriptor.contentType);
      info.metadata = new api.media.GenericMediaMetadata();
      info.metadata.title = descriptor.title;
      info.metadata.subtitle = "Pelvi Health";
      info.streamType = api.media.StreamType.BUFFERED;
      const request = new api.media.LoadRequest(info);
      request.currentTime = descriptor.startTime;
      // Start paused so a slow LOAD cannot begin playing behind guided work
      // after the member has asked to pause. Apply sound before the first frame.
      request.autoplay = false;
      loadQueue = loadQueue.catch(() => false).then(async () => {
        if (disposed || attempt !== generation || !session) return false;
        try {
          const receiver = session;
          await receiver.loadMedia(request);
          let appliedRevision;
          do {
            if (disposed || attempt !== generation || !session) return false;
            appliedRevision = sound.revision;
            if (receiver.setVolume) await receiver.setVolume(Math.min(1, Math.max(0, sound.volume)));
            if (disposed || attempt !== generation || !session) return false;
            if (receiver.setMute) await receiver.setMute(Boolean(sound.muted));
          } while (appliedRevision !== sound.revision);
          if (disposed || attempt !== generation || !session) return false;
          ready = true;
          report({ connected: true, loading: false });
          if (!pauseRequested && currentMedia()?.media?.contentId === descriptor.contentId) {
            const media = currentMedia();
            if (typeof media.play === "function") media.play(null, () => { if (!disposed && attempt === generation && pauseRequested) pauseOwned(); }, () => { if (!disposed && attempt === generation) { stop(); fail(); } });
            else if (player.isPaused) controller.playOrPause();
          }
          read();
          return true;
        } catch {
          if (!disposed && attempt === generation) { stop(); fail(); }
          return false;
        }
      });
      return loadQueue;
    },
    pause: pauseOwned,
    toggle() { if (session && !ready) { pauseRequested = !pauseRequested; return; } if (ownsMedia()) { pauseRequested = !player.isPaused; resetRemotePlaybackSample(sample); controller.playOrPause(); } },
    seek(time) {
      if (!ownsMedia()) return;
      resetRemotePlaybackSample(sample);
      player.currentTime = Math.max(0, Math.min(Number(time) || 0, player.duration || Infinity));
      lastPosition = player.currentTime;
      controller.seek();
    },
    volume(value, muted) {
      if (sound.volume !== value || sound.muted !== muted) sound = { volume: value, muted, revision: sound.revision + 1 };
      if (!ownsMedia()) return;
      player.volumeLevel = value; controller.setVolumeLevel();
      if (player.isMuted !== muted) controller.muteOrUnmute();
    },
    stop,
    dispose() {
      disposed = true;
      stop();
      controller.removeEventListener(framework.RemotePlayerEventType.ANY_CHANGE, read);
      context.removeEventListener(framework.CastContextEventType.SESSION_STATE_CHANGED, stateChanged);
    },
  };
}
