"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, AudioLines, Check, Clock, Download, Heart, History, Pause, Play, RotateCcw, RotateCw, Volume2, VolumeX, X } from "lucide-react";
import { audioJourneyDay, audioScript, audioSessionById, audioSessionsFor } from "@/lib/audioCatalog";
import { AUDIO_JOURNEY_EVENT, audioWhatHelped, beginAudioListen, completeAudioListen, completedAudioCount, isAudioFavorite, readAudioJourney, recommendAudio, toggleAudioFavorite } from "@/lib/audioJourney";
import { removeSavedAudio, saveAudioOffline, savedAudioURL } from "@/lib/audioOffline";
import { PHASE_SCALE, durationLabel } from "./sessionScripts";
import { useSessionEngine } from "./audioEngine";
import { SessionRing, useAudioDialog } from "./GuidedSession";
import { usePrefersReducedMotion } from "./VideoPlayer";
import AudioRituals from "./AudioRituals";

/** Full native goal catalog. initialSessionId opens its detail, never generic Kegels. */
export default function AudioHub({ goalId, pathway, focusId, programDay = 1, graduated = false, completions = [], memberId, initialSessionId, initialSessionID, onClose, onSessionComplete }) {
  const sessions = useMemo(() => audioSessionsFor(goalId, pathway, focusId), [goalId, pathway, focusId]);
  const [journey, setJourney] = useState({ records: [], favorites: {} });
  const [selectedId, setSelectedId] = useState(initialSessionId || initialSessionID || null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const ref = useRef(null);
  const close = useCallback(() => onClose(), [onClose]);
  useAudioDialog(ref, close);
  useEffect(() => {
    const update = () => setJourney(readAudioJourney(memberId));
    update(); window.addEventListener(AUDIO_JOURNEY_EVENT, update); window.addEventListener("storage", update);
    return () => { window.removeEventListener(AUDIO_JOURNEY_EVENT, update); window.removeEventListener("storage", update); };
  }, [memberId]);
  const selected = sessions.find((session) => session.id === selectedId);
  const featured = recommendAudio(sessions, journey, audioJourneyDay(programDay, graduated, completions));
  const insight = audioWhatHelped(journey, goalId, sessions);
  const favorites = sessions.filter((session) => isAudioFavorite(journey, session.id));
  const openSession = (session) => { setSelectedId(session.id); setHistoryOpen(false); };
  const goBack = () => { setSelectedId(null); setHistoryOpen(false); setPlaying(false); };

  return <div ref={ref} role="dialog" aria-modal="true" aria-label="Guided Audio" tabIndex={-1} className="fixed inset-0 z-[65] overflow-y-auto bg-atelier-paper text-atelier-ink outline-none">
    <div className="mx-auto min-h-full max-w-2xl px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="mb-6 flex items-center gap-3">
        {(selected || historyOpen) && !playing && <IconButton label="Back to audio library" onClick={goBack}><ArrowLeft /></IconButton>}
        <div className="flex-1"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-atelier-ink3">Coach Mia™</p><h2 className="font-serif text-2xl">{historyOpen ? "Listening History" : "Guided Audio"}</h2></div>
        {!selected && !historyOpen && <IconButton label="Listening history" onClick={() => setHistoryOpen(true)}><History /></IconButton>}
        <IconButton label="Close guided audio" onClick={close}><X /></IconButton>
      </header>
      {selected ? playing ? <AudioPlayer key={selected.id} session={selected} memberId={memberId} onBack={() => setPlaying(false)} onSessionComplete={onSessionComplete} />
        : <AudioDetail session={selected} favorite={isAudioFavorite(journey, selected.id)} onFavorite={() => toggleAudioFavorite(memberId, selected.id)} onStart={() => setPlaying(true)} />
        : historyOpen ? <AudioHistory journey={journey} goalId={goalId} onOpen={openSession} sessions={sessions} />
          : <>
            {featured && <button type="button" onClick={() => openSession(featured)} className="w-full rounded-[26px] bg-cta-gradient p-6 text-left text-white shadow-sm">
              <p className="text-[10px] font-bold tracking-[0.16em]">COACH MIA™ CHOSE THIS</p><h3 className="mt-3 font-serif text-[28px] leading-tight">{featured.title}</h3><p className="mt-2 text-sm leading-relaxed opacity-90">{featured.subtitle}</p><div className="mt-5 flex items-center gap-4 text-xs font-semibold"><span className="flex items-center gap-1"><Clock className="h-4 w-4" />{durationLabel(audioScript(featured).totalDuration)}</span><span className="flex items-center gap-1"><AudioLines className="h-4 w-4" />Recorded voice</span><Play className="ml-auto h-5 w-5" /></div>
            </button>}
            <p className="my-5 rounded-2xl bg-white/60 p-4 text-sm leading-relaxed">{insight || "After two completed listens, Coach Mia™ can show which audio feels most helpful for you."}</p>
            {goalId === "intimacy" && <AudioRituals memberId={memberId} pathway={pathway} onAudio={openSession} />}
            {favorites.length > 0 && <section className="mb-6"><h3 className="mb-3 font-serif text-xl">Saved for you</h3><div className="flex gap-3 overflow-x-auto pb-2">{favorites.map((session) => <button type="button" key={session.id} onClick={() => openSession(session)} className="w-44 shrink-0 rounded-2xl border border-atelier-line bg-white p-4 text-left"><Heart className="mb-3 h-5 w-5 fill-atelier-rose text-atelier-rose" /><p className="text-sm font-semibold">{session.title}</p><p className="mt-2 text-xs text-atelier-ink3">{durationLabel(audioScript(session).totalDuration)}</p></button>)}</div></section>}
            <section><h3 className="font-serif text-xl">Your complete library</h3><p className="mb-4 mt-1 text-xs text-atelier-ink3">{sessions.length} goal-based sessions · choose what helps today</p><div className="space-y-3">{sessions.map((session) => <AudioRow key={session.id} session={session} count={completedAudioCount(journey, session.id)} onClick={() => openSession(session)} />)}</div></section>
            <p className="mt-6 text-xs leading-relaxed text-atelier-ink3">Favorites and listening history are saved in this browser for your account. Recorded audio can continue while your screen is locked when your browser allows it.</p>
          </>}
    </div>
  </div>;
}

function IconButton({ label, children, onClick }) {
  return <button type="button" aria-label={label} onClick={onClick} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-black/5 [&>svg]:h-5 [&>svg]:w-5">{children}</button>;
}

function AudioRow({ session, count = 0, onClick }) {
  return <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-[18px] border border-atelier-line bg-white/80 p-4 text-left"><AudioLines className="h-6 w-6 shrink-0 text-atelier-rose" /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{session.title}</span><span className="mt-1 block text-xs leading-relaxed text-atelier-ink3">{session.subtitle}</span></span><span className="text-right text-xs text-atelier-ink3">{durationLabel(audioScript(session).totalDuration)}{count > 0 && <span className="mt-2 flex items-center justify-end gap-1 text-atelier-rose"><Check className="h-3 w-3" />{count}</span>}</span></button>;
}

function useOfflineRecording(session) {
  const [source, setSource] = useState(null);
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let disposed = false; let objectURL;
    savedAudioURL(session.continuousTrackID).then((value) => { objectURL = value; if (disposed && value) URL.revokeObjectURL(value); else setSource(value); });
    return () => { disposed = true; if (objectURL) URL.revokeObjectURL(objectURL); };
  }, [session.continuousTrackID]);
  const toggle = async () => {
    setSaving(true); setMessage(null);
    try {
      if (source) { await removeSavedAudio(session.continuousTrackID); URL.revokeObjectURL(source); setSource(null); }
      else setSource(await saveAudioOffline(session.continuousTrackID));
    } catch (error) { setMessage(error.message || "Audio could not save. Please try again."); }
    finally { setSaving(false); }
  };
  return { source, message, saving, toggle };
}

function AudioDetail({ session, favorite, onFavorite, onStart }) {
  const offline = useOfflineRecording(session);
  return <section className="pb-6">
    <AudioLines className="mx-auto mt-5 h-16 w-16 rounded-full bg-atelier-plum p-4 text-white" /><h3 className="mt-5 text-center font-serif text-3xl">{session.title}</h3><p className="mx-auto mt-3 max-w-md text-center text-sm leading-relaxed text-atelier-ink3">{session.subtitle}</p>
    <div className="my-6 flex justify-center gap-3 text-xs text-atelier-ink3"><span>{durationLabel(audioScript(session).totalDuration)}</span><span>Recorded voice</span><span>{offline.source ? "Saved in this browser" : "Stream audio"}</span></div>
    <button type="button" onClick={onStart} className="min-h-14 w-full rounded-full bg-cta-gradient p-4 font-semibold text-white">Start session</button>
    <button type="button" onClick={onFavorite} aria-pressed={favorite} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-atelier-rose/10 p-3 text-sm font-semibold text-atelier-rose"><Heart className={`h-4 w-4 ${favorite ? "fill-current" : ""}`} />{favorite ? "Saved to favorites" : "Save to favorites"}</button>
    <button type="button" onClick={offline.toggle} disabled={offline.saving} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-atelier-line p-3 text-sm"><Download className="h-4 w-4" />{offline.saving ? "Saving recording…" : offline.source ? "Remove saved recording" : "Save recording for offline listening"}</button>
    {offline.message && <p role="alert" className="mt-3 text-sm text-red-700">{offline.message}</p>}
    <details className="mt-6 rounded-2xl border border-atelier-line bg-white/70 p-5"><summary className="cursor-pointer font-semibold">Read transcript</summary><ol className="mt-4 list-decimal space-y-4 pl-5 text-sm leading-relaxed text-atelier-ink3">{session.beats.map((beat) => <li key={beat.id}>{beat.spoken}</li>)}</ol></details>
    <p className="mt-5 text-xs leading-relaxed text-atelier-ink3">These guided sessions provide education and self-management support. Stop if symptoms worsen and seek individual medical care for severe, new, or concerning symptoms.</p>
    <p className="mt-3 text-xs leading-relaxed text-atelier-ink3">Saved recordings stay in this browser until its storage is cleared or removed. Open the session before going offline; the website itself still needs to load.</p>
  </section>;
}

function AudioPlayer({ session, memberId, onBack, onSessionComplete }) {
  const [comfort, setComfort] = useState(null);
  const [recordId, setRecordId] = useState(null);
  const [outcome, setOutcome] = useState(null);
  const [voiceOn, setVoiceOn] = useState(true);
  const offline = useOfflineRecording(session);
  const script = useMemo(() => audioScript({ ...session, audioSource: offline.source }), [session, offline.source]);
  const recordRef = useRef(null);
  const reduceMotion = usePrefersReducedMotion();
  useEffect(() => { try { const value = localStorage.getItem("pelvi.session.voice"); if (value != null) setVoiceOn(value === "1"); } catch { /* default on */ } }, []);
  const finish = useCallback(() => {
    if (recordRef.current) completeAudioListen(memberId, recordRef.current);
    onSessionComplete?.({ kind: "premium-audio", id: script.id, seconds: Math.round(script.totalDuration) });
  }, [memberId, onSessionComplete, script.id, script.totalDuration]);
  const engine = useSessionEngine(script, { voiceOn, onFinish: finish });
  const start = () => { if (comfort == null) return; const id = beginAudioListen(memberId, session, comfort); recordRef.current = id; setRecordId(id); engine.start(); };
  const toggleVoice = () => { const next = !voiceOn; setVoiceOn(next); try { localStorage.setItem("pelvi.session.voice", next ? "1" : "0"); } catch { /* private browser */ } };
  const submit = (value) => { completeAudioListen(memberId, recordId, value); setOutcome(value); };
  if (!recordId) return <section className="flex min-h-[70vh] flex-col items-center justify-center text-center"><h3 className="font-serif text-3xl">{session.title}</h3><p className="mt-4 text-base">How settled and comfortable do you feel right now?</p><div className="mt-7 flex gap-2" role="group" aria-label="Comfort before listening">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" aria-label={`Comfort ${value} of 5`} aria-pressed={comfort === value} onClick={() => setComfort(value)} className={`h-12 w-12 rounded-full font-semibold ${comfort === value ? "bg-atelier-rose text-white" : "bg-atelier-rose/10 text-atelier-rose"}`}>{value}</button>)}</div><div className="mt-2 flex w-full max-w-72 justify-between text-xs text-atelier-ink3"><span>Tense</span><span>Settled</span></div><button type="button" disabled={comfort == null} onClick={start} className="mt-10 min-h-14 w-full rounded-full bg-cta-gradient p-4 font-semibold text-white disabled:opacity-50">{comfort == null ? "Choose how you feel" : `Begin · ${durationLabel(script.totalDuration)}`}</button></section>;
  if (engine.finished) return <section className="flex min-h-[65vh] flex-col justify-center text-center"><Check className="mx-auto h-16 w-16 text-atelier-rose" /><h3 className="mt-5 font-serif text-3xl">{outcome ? "Saved to your history" : "How do you feel now?"}</h3>{outcome ? <><p className="mt-5 text-xl font-semibold capitalize text-atelier-rose">{outcome}</p><p className="mt-4 text-sm leading-relaxed text-atelier-ink3">Coach Mia™ will use your completed listens to show what seems to help you most.</p></> : <div className="mt-6 flex gap-3">{["better", "same", "worse"].map((value) => <button key={value} type="button" onClick={() => submit(value)} className="min-h-20 flex-1 rounded-2xl bg-atelier-rose/10 p-3 font-semibold capitalize text-atelier-rose">{value}</button>)}</div>}<button type="button" onClick={onBack} className="mt-8 min-h-14 rounded-full bg-cta-gradient p-4 font-semibold text-white">{outcome ? "Done" : "Skip feedback"}</button></section>;
  return <section className="flex min-h-[72vh] flex-col items-center justify-center">
    <div className="mb-6 flex w-full items-center justify-between"><IconButton label="End session" onClick={() => { engine.stop(); onBack(); }}><X /></IconButton><span className="text-sm font-semibold tabular-nums text-atelier-rose">{durationLabel(engine.position?.secondsRemainingInSession || 0)}</span><IconButton label={voiceOn ? "Mute voice" : "Unmute voice"} onClick={toggleVoice}>{voiceOn ? <Volume2 /> : <VolumeX />}</IconButton></div>
    <SessionRing label={engine.paused ? "Paused" : engine.position?.step?.label || session.title} seconds={engine.position?.secondsRemainingInStep || 0} progress={engine.position?.phaseProgress || 0} scale={engine.paused ? 1 : PHASE_SCALE[engine.position?.step?.phase] || 1} effort={false} complete={false} reduceMotion={reduceMotion} />
    <p aria-live="polite" className="mt-7 max-w-sm text-center text-base leading-relaxed">{engine.position?.step?.detail || session.subtitle}</p>
    <progress aria-label="Session progress" value={engine.elapsed} max={script.totalDuration} className="mt-7 h-2 w-full accent-[#B66476]" />
    <div className="my-6 flex items-center gap-7"><IconButton label="Back 10 seconds" onClick={() => engine.seek(-10)}><RotateCcw /></IconButton><button type="button" aria-label={engine.paused ? "Resume" : "Pause"} onClick={engine.paused ? engine.resume : engine.pause} className="grid h-16 w-16 place-items-center rounded-full bg-cta-gradient text-white">{engine.paused ? <Play /> : <Pause />}</button><IconButton label="Forward 10 seconds" onClick={() => engine.seek(10)}><RotateCw /></IconButton></div>
    {engine.playbackMessage && <p role="status" className="mb-3 text-center text-sm text-atelier-ink3">{engine.playbackMessage}</p>}
    <p className="text-center text-xs text-atelier-ink3">Recorded voice · screen lock and background playback follow your browser.</p>
  </section>;
}

function AudioHistory({ journey, goalId, sessions, onOpen }) {
  const allowed = new Set(sessions.map((session) => session.id));
  const records = journey.records.filter((record) => record.goal === goalId && allowed.has(record.sessionID));
  return records.length ? <div className="space-y-3">{records.map((record) => {
    const session = audioSessionById(record.sessionID);
    return <button type="button" key={record.id} onClick={() => onOpen(session)} className="flex w-full items-center gap-3 rounded-2xl border border-atelier-line bg-white p-4 text-left"><AudioLines className="h-5 w-5 text-atelier-rose" /><span className="flex-1"><span className="block text-sm font-semibold">{session.title}</span><span className="mt-1 block text-xs text-atelier-ink3">{new Date(record.startedAt).toLocaleString()}</span></span><span className="text-xs capitalize text-atelier-rose">{record.outcome || (record.completedAt ? "Complete" : "Started")}</span></button>;
  })}</div> : <p className="py-20 text-center text-sm text-atelier-ink3">No listens yet. Your completed and recent sessions will appear here.</p>;
}
