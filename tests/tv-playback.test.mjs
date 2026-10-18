import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

let moduleRevision = 0;
async function tvModule() {
  const source = await readFile(new URL("../lib/tvPlayback.js", import.meta.url), "utf8");
  const revision = moduleRevision++;
  const namedSource = `${source}\n//# sourceURL=tvPlayback-test-source-${revision}.js`;
  return import(`data:text/javascript;base64,${Buffer.from(namedSource).toString("base64")}#tv-test-${revision}`);
}

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
async function settle() { await new Promise((resolve) => setImmediate(resolve)); }

function fakeClock() {
  let nextId = 1;
  const intervals = new Map(), timeouts = new Map();
  const scope = {
    now: 0,
    performance: { now: () => scope.now },
    setInterval(fn) { const id = nextId++; intervals.set(id, fn); return id; },
    clearInterval(id) { intervals.delete(id); },
    setTimeout(fn) { const id = nextId++; timeouts.set(id, fn); return id; },
    clearTimeout(id) { timeouts.delete(id); },
  };
  return {
    scope, intervals, timeouts,
    tick(milliseconds = 500) { scope.now += milliseconds; for (const fn of [...intervals.values()]) fn(); },
    expire() { const pending = [...timeouts.values()]; timeouts.clear(); for (const fn of pending) fn(); },
  };
}

function fakeSdkLoader() {
  const clock = fakeClock();
  const scripts = [], appended = [];
  const document = {
    querySelector: () => scripts.find((script) => script.dataset.pelviCastSdk),
    createElement: () => ({ dataset: {}, remove() { const index = scripts.indexOf(this); if (index >= 0) scripts.splice(index, 1); } }),
    head: { appendChild(script) { scripts.push(script); appended.push(script); } },
  };
  return {
    ...clock, scripts, appended, scope: { ...clock.scope, document },
    available() {
      this.scope.cast = { framework: {} };
      this.scope.chrome = { cast: { isAvailable: true } };
      this.scope.__onGCastApiAvailable(true);
    },
  };
}

function fakeCast({ pendingConnect = false, deferredLoads = false, deferredPlay = false, deferredPause = false, preexisting = false } = {}) {
  const clock = fakeClock();
  const connectGate = deferred();
  const calls = { requestSession: 0, loads: [], plays: [], pauses: [], commands: [], end: [], timeline: [] };
  const contextListeners = new Map(), remoteListeners = new Map();
  const callbacks = { states: [], samples: [], ended: [], disconnects: [], errors: [] };
  let media = null, connectedSession = preexisting ? {} : null, player;
  const session = {
    getMediaSession: () => media,
    getCastDevice: () => ({ friendlyName: "Living room" }),
    endSession: (stopReceiver) => calls.end.push(stopReceiver),
    async setVolume(value) { calls.timeline.push(["initialVolume", value]); player.volumeLevel = value; },
    async setMute(value) { calls.timeline.push(["initialMute", value]); player.isMuted = value; },
    loadMedia(request) {
      const gate = deferred();
      const load = { request, gate };
      calls.loads.push(load);
      calls.timeline.push(["load", request.media.contentId]);
      const loadedState = request.autoplay ? "PLAYING" : "PAUSED";
      if (!deferredLoads) {
        setMedia(request.media.contentId, { state: loadedState, time: request.currentTime, duration: 30 });
        return Promise.resolve();
      }
      return gate.promise.then(() => { setMedia(request.media.contentId, { state: loadedState, time: request.currentTime, duration: 30 }); });
    },
  };
  if (preexisting) connectedSession = session;
  const context = {
    setOptions(options) { calls.options = options; },
    async requestSession() {
      calls.requestSession += 1;
      if (pendingConnect) await connectGate.promise;
      connectedSession = session;
    },
    getCurrentSession: () => connectedSession,
    addEventListener(type, fn) { contextListeners.set(type, fn); },
    removeEventListener(type, fn) { if (contextListeners.get(type) === fn) contextListeners.delete(type); },
  };
  const api = {
    isAvailable: true,
    AutoJoinPolicy: { TAB_AND_ORIGIN_SCOPED: "tab-origin" },
    media: {
      DEFAULT_MEDIA_RECEIVER_APP_ID: "default-receiver",
      PlayerState: { PLAYING: "PLAYING", PAUSED: "PAUSED", BUFFERING: "BUFFERING", IDLE: "IDLE" },
      IdleReason: { FINISHED: "FINISHED", ERROR: "ERROR", CANCELLED: "CANCELLED", INTERRUPTED: "INTERRUPTED" },
      StreamType: { BUFFERED: "BUFFERED" },
      MediaInfo: class { constructor(contentId, contentType) { this.contentId = contentId; this.contentType = contentType; } },
      GenericMediaMetadata: class {},
      LoadRequest: class { constructor(info) { this.media = info; } },
    },
  };
  const framework = {
    CastContext: { getInstance: () => context },
    RemotePlayer: class { constructor() { player = this; this.isPaused = false; this.isMuted = false; this.duration = 30; this.currentTime = 0; } },
    RemotePlayerController: class {
      addEventListener(type, fn) { remoteListeners.set(type, fn); }
      removeEventListener(type, fn) { if (remoteListeners.get(type) === fn) remoteListeners.delete(type); }
      playOrPause() { calls.commands.push("toggle"); player.isPaused = !player.isPaused; if (media) media.playerState = player.isPaused ? "PAUSED" : "PLAYING"; }
      seek() { calls.commands.push(["seek", player.currentTime]); }
      setVolumeLevel() { calls.commands.push(["volume", player.volumeLevel]); }
      muteOrUnmute() { calls.commands.push("mute"); player.isMuted = !player.isMuted; }
    },
    RemotePlayerEventType: { ANY_CHANGE: "change" },
    CastContextEventType: { SESSION_STATE_CHANGED: "session" },
    SessionState: { SESSION_ENDED: "ended" },
  };
  function setMedia(contentId, { state = "PLAYING", time = 0, duration = 30, idleReason } = {}) {
    media = {
      media: { contentId, duration }, playerState: state, position: time, idleReason,
      getEstimatedTime() { return this.position; },
      play(_, success, failure) {
        const gate = deferred();
        const play = { gate, contentId };
        calls.plays.push(play); calls.timeline.push(["play", contentId]);
        const apply = () => { this.playerState = "PLAYING"; player.isPaused = false; success?.(); };
        if (deferredPlay) gate.promise.then(apply, failure);
        else apply();
      },
      pause(_, success, failure) {
        const gate = deferred();
        calls.pauses.push({ gate, contentId });
        calls.commands.push("pause");
        const apply = () => { this.playerState = "PAUSED"; player.isPaused = true; success?.(); };
        const pendingPlay = deferredPlay && calls.plays.at(-1);
        if (deferredPause) gate.promise.then(apply, failure);
        else if (pendingPlay) pendingPlay.gate.promise.then(apply, failure);
        else apply();
      },
    };
    if (player) { player.currentTime = time; player.duration = duration; player.isPaused = state !== "PLAYING"; }
    return media;
  }
  return {
    ...clock, calls, callbacks, session, contextListeners, remoteListeners, connectGate, setMedia, currentMedia: () => media,
    scope: { ...clock.scope, cast: { framework }, chrome: { cast: api } },
    handlers: {
      onState: (value) => callbacks.states.push(value), onSample: (value) => callbacks.samples.push(value),
      onEnded: (value) => callbacks.ended.push(value), onDisconnect: (value) => callbacks.disconnects.push(value),
      onError: (value) => callbacks.errors.push(value),
    },
    read() { remoteListeners.get("change")?.(); },
    end() { contextListeners.get("session")?.({ sessionState: "ended" }); },
  };
}

const clip = { id: "clip-a", title: "Chosen exercise", url: "https://media.example.org/a.mp4", format: "mp4" };
const otherClip = { ...clip, id: "clip-b", url: "https://media.example.org/b.mp4" };

test("TV support respects Safari routing, secure origins, and iOS Cast limits", async () => {
  const { tvPlaybackSupport } = await tvModule();
  assert.deepEqual(tvPlaybackSupport({ webkitShowPlaybackTargetPicker() {} }, { userAgent: "Safari" }), { airPlay: true, googleCast: false });
  assert.equal(tvPlaybackSupport({}, { userAgent: "Chrome/130", secure: true }).googleCast, true);
  assert.equal(tvPlaybackSupport({}, { userAgent: "Chrome/130", secure: false }).googleCast, false);
  assert.equal(tvPlaybackSupport({}, { userAgent: "iPhone CriOS/130" }).googleCast, false);
  assert.equal(tvPlaybackSupport({}, { userAgent: "Macintosh Chrome/130", maxTouchPoints: 5 }).googleCast, false);
});

test("Cast descriptors reject unsafe or malformed URLs and QuickTime without lying about MIME", async () => {
  const { castMediaDescriptor } = await tvModule();
  for (const url of ["not a URL", "http://media.example.org/a.mp4", "https://media.example.org/bad%xy.mp4"]) {
    assert.equal(castMediaDescriptor({ url }), null, url);
  }
  assert.equal(castMediaDescriptor({ ...clip, format: "mov" }), null);
  assert.equal(castMediaDescriptor({ url: "https://media.example.org/o/folder%2Fvideo.MOV?alt=media" }), null);
  assert.equal(castMediaDescriptor(clip).contentType, "video/mp4");
  assert.equal(castMediaDescriptor({ ...clip, url: "https://media.example.org/stream.m3u8" }).contentType, "application/x-mpegURL");
  assert.equal(castMediaDescriptor({ ...clip, url: "https://media.example.org/video.webm" }).contentType, "video/webm");
});

test("Cast start positions are finite and nonnegative", async () => {
  const { castMediaDescriptor } = await tvModule();
  assert.equal(castMediaDescriptor(clip, 12.5).startTime, 12.5);
  assert.equal(castMediaDescriptor(clip, -10).startTime, 0);
  for (const input of [Infinity, -Infinity, NaN, "invalid"]) {
    const result = castMediaDescriptor(clip, input);
    assert.ok(result === null || (Number.isFinite(result.startTime) && result.startTime >= 0), String(input));
  }
});

test("remote samples count observed playback and reject pauses, seeks, switches, and suspended gaps", async () => {
  const { createRemotePlaybackSample, resetRemotePlaybackSample, sampleRemotePlayback } = await tvModule();
  const sample = createRemotePlaybackSample();
  const observe = (time, now, playing = true, contentId = "a") => sampleRemotePlayback(sample, { time, now, playing, contentId });
  assert.equal(observe(0, 0), 0);
  assert.equal(observe(0.5, 500), 0.5);
  assert.equal(observe(8, 1000), 0, "forward seek");
  assert.equal(observe(2, 1500), 0, "rewind");
  assert.equal(observe(2.5, 2000, false), 0, "pause/buffer");
  assert.equal(observe(3, 2500), 0, "resume anchor");
  assert.equal(observe(3.5, 3000), 0.5);
  assert.equal(observe(9, 8500), 0, "hidden or suspended sender");
  assert.equal(observe(9.5, 9000, true, "b"), 0, "different content");
  assert.equal(observe(10, 9000, true, "b"), 0, "zero elapsed time");
  assert.equal(observe(Infinity, 9500, true, "b"), 0);
  resetRemotePlaybackSample(sample);
  assert.equal(observe(12, 10000), 0, "explicit seek/transfer reset");
  assert.equal(observe(12.5, 10500), 0.5);
});

test("remote samples reject short seeks that exceed observed wall time and invalid clocks", async () => {
  const { createRemotePlaybackSample, sampleRemotePlayback } = await tvModule();
  const sample = createRemotePlaybackSample();
  const observe = (time, now) => sampleRemotePlayback(sample, { contentId: "clip", time, now, playing: true });
  assert.equal(observe(1, 1000), 0);
  assert.equal(observe(2.5, 1010), 0, "a sub-two-second seek is still a seek");
  assert.equal(observe(3, NaN), 0);
  assert.equal(observe(3.5, 2010), 0, "invalid prior anchor is never credited");
  assert.equal(observe(4, 2510), 0.5, "normal accounting recovers after a valid anchor");
});

test("SDK loader coalesces callers, restores previous callback, and cleans timeout", async () => {
  const { loadGoogleCast, CAST_SDK_URL } = await tvModule();
  const fake = fakeSdkLoader();
  const notices = [];
  const previous = (available) => notices.push(available);
  fake.scope.__onGCastApiAvailable = previous;
  const first = loadGoogleCast(fake.scope), second = loadGoogleCast(fake.scope);
  assert.equal(first, second);
  assert.equal(fake.appended.length, 1);
  assert.equal(fake.scripts[0].src, CAST_SDK_URL);
  fake.available();
  assert.equal(await first, fake.scope);
  assert.deepEqual(notices, [true]);
  assert.equal(fake.scope.__onGCastApiAvailable, previous);
  assert.equal(fake.timeouts.size, 0);
  assert.equal(await loadGoogleCast(fake.scope), fake.scope);
  assert.equal(fake.appended.length, 1);
});

for (const failure of ["timeout", "unavailable", "network"]) {
  test(`SDK loader retries after ${failure} with a fresh script`, async () => {
    const { loadGoogleCast } = await tvModule();
    const fake = fakeSdkLoader();
    const first = loadGoogleCast(fake.scope), failed = assert.rejects(first, /cast_unavailable/);
    const oldScript = fake.scripts[0];
    if (failure === "timeout") fake.expire();
    else if (failure === "unavailable") fake.scope.__onGCastApiAvailable(false);
    else oldScript.onerror();
    await failed;
    const second = loadGoogleCast(fake.scope);
    assert.equal(fake.appended.length, 2);
    assert.notEqual(fake.scripts[0], oldScript);
    fake.available();
    assert.equal(await second, fake.scope);
  });
}

test("creating a client never adopts or stops an existing TV session", async () => {
  const { createGoogleCastClient } = await tvModule();
  const fake = fakeCast({ preexisting: true });
  const client = createGoogleCastClient(fake.scope, fake.handlers);
  fake.setMedia("https://other.example.org/private.mp4"); fake.read(); fake.tick();
  assert.equal(fake.callbacks.samples.length, 0);
  assert.equal(fake.calls.requestSession, 0);
  client.dispose();
  assert.deepEqual(fake.calls.end, []);
  assert.equal(fake.contextListeners.size, 0);
  assert.equal(fake.remoteListeners.size, 0);
});

test("duplicate connect clicks open one picker and install one polling interval", async () => {
  const { createGoogleCastClient } = await tvModule();
  const fake = fakeCast({ pendingConnect: true });
  const client = createGoogleCastClient(fake.scope, fake.handlers);
  const first = client.connect(), second = client.connect();
  assert.equal(fake.calls.requestSession, 1);
  fake.connectGate.resolve();
  assert.equal(await first, true); assert.equal(await second, true);
  assert.equal(fake.intervals.size, 1);
  client.dispose();
  assert.equal(fake.intervals.size, 0);
});

test("disposing during a pending picker cannot leave its new receiver running", async () => {
  const { createGoogleCastClient } = await tvModule();
  const fake = fakeCast({ pendingConnect: true });
  const client = createGoogleCastClient(fake.scope, fake.handlers);
  const pending = client.connect();
  client.dispose(); fake.connectGate.resolve();
  assert.equal(await pending, false);
  assert.deepEqual(fake.calls.end, [true]);
  assert.equal(fake.intervals.size, 0);
  assert.equal(fake.callbacks.samples.length, 0);
  assert.equal(fake.callbacks.states.filter((state) => state.connected).length, 0);
});

test("Cast loads contain only chosen media metadata and preserve the resume position", async () => {
  const { createGoogleCastClient } = await tvModule();
  const fake = fakeCast();
  const client = createGoogleCastClient(fake.scope, fake.handlers);
  await client.connect();
  assert.equal(await client.load({ ...clip, memberId: "private-member", goal: "private-goal", symptoms: "private-symptoms", note: "private-note" }, 7.25), true);
  const { request } = fake.calls.loads[0];
  assert.equal(request.currentTime, 7.25); assert.equal(request.autoplay, false);
  assert.equal(request.media.contentId, clip.url); assert.equal(request.media.contentType, "video/mp4");
  assert.equal(request.media.metadata.title, clip.title);
  assert.equal(request.customData, undefined); assert.equal(request.media.customData, undefined);
  assert.doesNotMatch(JSON.stringify(request), /private-member|private-goal|private-symptoms|private-note/);
  client.dispose();
});

test("commands never control unrelated content loaded by another sender", async () => {
  const { createGoogleCastClient } = await tvModule();
  const fake = fakeCast();
  const client = createGoogleCastClient(fake.scope, fake.handlers);
  await client.connect(); await client.load(clip);
  fake.setMedia("https://other.example.org/unrelated.mp4");
  client.pause(); client.toggle(); client.seek(10); client.volume(0.5, true);
  assert.deepEqual(fake.calls.commands, []);
  fake.read();
  assert.equal(fake.calls.end.length, 0, "do not stop another sender's content");
  client.dispose();
  assert.equal(fake.calls.end.length, 0, "cleanup must relinquish unrelated media");
});

test("an owned playing item supports TV pause, resume, seek, volume, and explicit stop", async () => {
  const { createGoogleCastClient } = await tvModule();
  const fake = fakeCast();
  const client = createGoogleCastClient(fake.scope, fake.handlers);
  await client.connect(); await client.load(clip);
  client.pause();
  assert.equal(fake.currentMedia().playerState, "PAUSED");
  client.toggle();
  assert.equal(fake.currentMedia().playerState, "PLAYING");
  client.seek(9.5); client.volume(0.4, true);
  assert.ok(fake.calls.commands.some((command) => Array.isArray(command) && command[0] === "seek" && command[1] === 9.5));
  assert.ok(fake.calls.commands.some((command) => Array.isArray(command) && command[0] === "volume" && command[1] === 0.4));
  assert.ok(fake.calls.commands.includes("mute"));
  client.stop();
  assert.deepEqual(fake.calls.end, [true]);
  assert.equal(fake.callbacks.states.at(-1).connected, false);
  client.dispose();
  assert.deepEqual(fake.calls.end, [true], "dispose does not stop the same receiver twice");
});

test("initial IDLE does not suppress the eventual FINISHED callback and completion fires once", async () => {
  const { createGoogleCastClient } = await tvModule();
  const fake = fakeCast();
  const client = createGoogleCastClient(fake.scope, fake.handlers);
  await client.connect(); await client.load(clip);
  fake.setMedia(clip.url, { state: "IDLE" }); fake.read();
  fake.setMedia(clip.url, { state: "PLAYING", time: 29 }); fake.read();
  fake.setMedia(clip.url, { state: "IDLE", time: 30, idleReason: "FINISHED" }); fake.read(); fake.read();
  assert.equal(fake.callbacks.ended.length, 1);
  assert.equal(fake.callbacks.ended[0].contentId, clip.url);
  client.dispose();
});

for (const idleReason of ["CANCELLED", "INTERRUPTED", "ERROR"]) {
  test(`terminal ${idleReason} cannot complete an exercise or retain a connected transport`, async () => {
    const { createGoogleCastClient } = await tvModule();
    const fake = fakeCast();
    const client = createGoogleCastClient(fake.scope, fake.handlers);
    await client.connect(); await client.load(clip);
    fake.setMedia(clip.url, { state: "IDLE", time: 4, idleReason }); fake.read();
    assert.equal(fake.callbacks.ended.length, 0);
    assert.equal(fake.callbacks.states.at(-1).connected, false);
    if (idleReason === "ERROR") assert.equal(fake.callbacks.errors.length, 1);
    client.dispose();
  });
}

test("serialized loads let the newest clip win without stale samples or completion", async () => {
  const { createGoogleCastClient } = await tvModule();
  const fake = fakeCast({ deferredLoads: true });
  const client = createGoogleCastClient(fake.scope, fake.handlers);
  await client.connect();
  const first = client.load(clip, 2);
  await settle();
  assert.equal(fake.calls.loads.length, 1);
  assert.equal(fake.calls.loads[0].request.media.contentId, clip.url);
  const second = client.load(otherClip, 5);
  await settle();
  assert.equal(fake.calls.loads.length, 1, "a second receiver LOAD must wait for the first acknowledgement");
  fake.calls.loads[0].gate.resolve(); await settle();
  assert.equal(fake.calls.loads.length, 2);
  fake.setMedia(clip.url, { state: "IDLE", idleReason: "FINISHED" }); fake.read();
  assert.equal(fake.callbacks.ended.length, 0);
  assert.equal(fake.calls.plays.length, 0);
  fake.calls.loads[1].gate.resolve();
  await first; assert.equal(await second, true);
  assert.equal(fake.callbacks.samples.at(-1).contentId, otherClip.url);
  assert.ok(fake.callbacks.samples.every((sample) => sample.contentId !== clip.url), "superseded load never starts accounting");
  client.dispose();
});

test("normal Cast load stays paused until saved sound preferences apply, then starts once", async () => {
  const { createGoogleCastClient } = await tvModule();
  const fake = fakeCast({ deferredLoads: true });
  const client = createGoogleCastClient(fake.scope, fake.handlers);
  await client.connect();
  const pending = client.load(clip, 4, { volume: 0.35, muted: true }); await settle();
  assert.deepEqual(fake.calls.timeline, [["load", clip.url]]);
  assert.equal(fake.calls.loads[0].request.autoplay, false);
  assert.equal(fake.calls.plays.length, 0);
  fake.calls.loads[0].gate.resolve();
  assert.equal(await pending, true);
  assert.deepEqual(fake.calls.timeline, [["load", clip.url], ["initialVolume", 0.35], ["initialMute", true], ["play", clip.url]]);
  assert.equal(fake.calls.plays.length, 1);
  fake.read(); fake.tick();
  assert.equal(fake.calls.plays.length, 1, "SDK state updates do not resend PLAY");
  assert.equal(fake.currentMedia().playerState, "PLAYING");
  client.dispose();
});

test("mute and volume changes during pending LOAD apply before the first PLAY", async () => {
  const { createGoogleCastClient } = await tvModule();
  const fake = fakeCast({ deferredLoads: true });
  const client = createGoogleCastClient(fake.scope, fake.handlers);
  await client.connect();
  const pending = client.load(clip, 0, { volume: 0.8, muted: false }); await settle();
  client.volume(0.2, true);
  assert.equal(fake.calls.plays.length, 0);
  assert.deepEqual(fake.calls.commands, [], "unready receiver does not get direct transport controls");
  fake.calls.loads[0].gate.resolve();
  assert.equal(await pending, true);
  assert.deepEqual(fake.calls.timeline, [["load", clip.url], ["initialVolume", 0.2], ["initialMute", true], ["play", clip.url]]);
  assert.equal(fake.calls.plays.length, 1);
  client.dispose();
});

test("pausing while receiver LOAD is pending prevents playback behind guided practice", async () => {
  const { createGoogleCastClient } = await tvModule();
  const fake = fakeCast({ deferredLoads: true });
  const client = createGoogleCastClient(fake.scope, fake.handlers);
  await client.connect();
  const pending = client.load(clip); await settle();
  client.pause(); fake.calls.loads[0].gate.resolve();
  assert.equal(await pending, true);
  assert.equal(fake.calls.plays.length, 0);
  assert.equal(fake.currentMedia().playerState, "PAUSED");
  assert.ok(fake.callbacks.samples.every((sample) => !sample.playing && sample.delta === 0));
  client.dispose();
});

test("finishing while receiver LOAD is pending cancels its eventual playback", async () => {
  const { createGoogleCastClient } = await tvModule();
  const fake = fakeCast({ deferredLoads: true });
  const client = createGoogleCastClient(fake.scope, fake.handlers);
  await client.connect();
  const pending = client.load(clip); await settle();
  client.pause(); client.stop(); fake.calls.loads[0].gate.resolve();
  assert.equal(await pending, false);
  assert.equal(fake.calls.plays.length, 0);
  assert.equal(fake.callbacks.samples.length, 0);
  assert.deepEqual(fake.calls.end, [true]);
  client.dispose();
});

test("pause requested after LOAD but before PLAY acknowledgement remains authoritative", async () => {
  const { createGoogleCastClient } = await tvModule();
  const fake = fakeCast({ deferredPlay: true });
  const client = createGoogleCastClient(fake.scope, fake.handlers);
  await client.connect(); await client.load(clip);
  assert.equal(fake.calls.plays.length, 1);
  assert.equal(fake.currentMedia().playerState, "PAUSED");
  client.pause(); fake.calls.plays[0].gate.resolve(); await settle();
  assert.equal(fake.currentMedia().playerState, "PAUSED", "late PLAY acknowledgement cannot undo practice pause");
  client.dispose();
});

test("late PLAY and PAUSE errors from an old clip cannot stop the current clip", async () => {
  const { createGoogleCastClient } = await tvModule();
  const fake = fakeCast({ deferredPlay: true, deferredPause: true });
  const client = createGoogleCastClient(fake.scope, fake.handlers);
  await client.connect(); await client.load(clip);
  client.pause();
  assert.equal(fake.calls.plays.length, 1); assert.equal(fake.calls.pauses.length, 1);
  await client.load(otherClip);
  assert.equal(fake.calls.plays.length, 2);
  fake.calls.plays[0].gate.reject(new Error("old PLAY rejected"));
  fake.calls.pauses[0].gate.reject(new Error("old PAUSE rejected"));
  await settle();
  assert.deepEqual(fake.calls.end, []);
  assert.deepEqual(fake.callbacks.errors, []);
  assert.equal(fake.callbacks.states.at(-1).connected, true);
  assert.equal(fake.currentMedia().media.contentId, otherClip.url);
  fake.calls.plays[1].gate.resolve(); await settle(); fake.read();
  assert.equal(fake.currentMedia().playerState, "PLAYING");
  assert.equal(fake.callbacks.samples.at(-1).contentId, otherClip.url);
  client.dispose();
});

test("same-turn loads coalesce before sending and only the latest item starts accounting", async () => {
  const { createGoogleCastClient } = await tvModule();
  const fake = fakeCast({ deferredLoads: true });
  const client = createGoogleCastClient(fake.scope, fake.handlers);
  await client.connect();
  const first = client.load(clip, 2), second = client.load(otherClip, 5);
  await settle();
  assert.equal(fake.calls.loads.length, 1);
  assert.equal(fake.calls.loads[0].request.media.contentId, otherClip.url);
  fake.calls.loads[0].gate.resolve();
  assert.equal(await first, false);
  assert.equal(await second, true);
  assert.ok(fake.callbacks.samples.every((sample) => sample.contentId === otherClip.url));
  client.dispose();
});

test("disposing during a media load ignores its late acknowledgement and removes all listeners", async () => {
  const { createGoogleCastClient } = await tvModule();
  const fake = fakeCast({ deferredLoads: true });
  const client = createGoogleCastClient(fake.scope, fake.handlers);
  await client.connect();
  const pending = client.load(clip); await settle();
  client.dispose(); fake.calls.loads[0].gate.resolve();
  assert.equal(await pending, false);
  assert.equal(fake.callbacks.samples.length, 0);
  assert.equal(fake.callbacks.ended.length, 0);
  assert.equal(fake.calls.plays.length, 0);
  assert.equal(fake.remoteListeners.size, 0); assert.equal(fake.contextListeners.size, 0);
  assert.equal(fake.intervals.size, 0); assert.deepEqual(fake.calls.end, [true]);
});

test("a rejected receiver load returns control locally without inventing playback", async () => {
  const { createGoogleCastClient } = await tvModule();
  const fake = fakeCast({ deferredLoads: true });
  const client = createGoogleCastClient(fake.scope, fake.handlers);
  await client.connect();
  const pending = client.load(clip); await settle();
  fake.calls.loads[0].gate.reject(new Error("receiver codec rejected"));
  assert.equal(await pending, false);
  assert.equal(fake.callbacks.samples.length, 0);
  assert.equal(fake.callbacks.ended.length, 0);
  assert.equal(fake.callbacks.errors.length, 1);
  assert.equal(fake.callbacks.states.at(-1).connected, false);
  client.dispose();
});
