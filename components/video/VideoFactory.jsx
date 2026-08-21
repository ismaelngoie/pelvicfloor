"use client";

import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  CirclePlay,
  Clock3,
  Copy,
  Download,
  ExternalLink,
  FileCheck2,
  Film,
  Image as ImageIcon,
  Library,
  LoaderCircle,
  LogOut,
  MessageSquareQuote,
  Mic2,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Upload,
  WandSparkles,
  Youtube,
} from "lucide-react";
import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from "firebase/auth";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ADMIN_EMAIL, auth, isAdminEmail, isFirebaseConfigured } from "@/lib/firebase";

const ACTIVE = new Set(["researching", "claim_check_starting", "claim_check", "storyboarding", "rendering", "quality_check"]);
const TABS = [
  ["preview", "Preview"],
  ["script", "Script"],
  ["storyboard", "Storyboard"],
  ["evidence", "Evidence"],
  ["publish", "Publish"],
];
const STARTERS = [
  "Why does sex hurt even when I’m aroused and want it?",
  "Can a tight pelvic floor make orgasms harder to reach?",
  "Why do I leak near the end of a run?",
  "Can Kegels make pelvic pain worse?",
  "Is a two-finger ab gap actually a problem?",
];

export default function VideoFactory() {
  const configured = isFirebaseConfigured();
  const [authState, setAuthState] = useState(configured ? "loading" : "unconfigured");
  const [authError, setAuthError] = useState("");
  const [user, setUser] = useState(null);
  const [signingIn, setSigningIn] = useState(false);
  const [projects, setProjects] = useState([]);
  const [activeId, setActiveId] = useState("");
  const [factory, setFactory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [railOpen, setRailOpen] = useState(true);
  const [title, setTitle] = useState("");
  const [tab, setTab] = useState("preview");
  const [scheduleAt, setScheduleAt] = useState("");
  const [thumbnailBlobs, setThumbnailBlobs] = useState({});
  const [videoBlobs, setVideoBlobs] = useState({});
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState({});
  const polling = useRef(false);
  const thumbnailStarted = useRef(new Set());
  const thumbnailObjectUrls = useRef(new Set());
  const videoObjectUrl = useRef("");

  const isOwner = Boolean(user && isAdminEmail(user.email));
  const active = activeId ? projects.find((project) => project.id === activeId) || null : null;
  const pendingProjectKey = useMemo(() => projects
    .filter((project) => ACTIVE.has(project.status))
    .map((project) => `${project.id}:${project.status}`)
    .sort()
    .join("|"), [projects]);

  useEffect(() => {
    // A schedule belongs to one production. Never carry a date from another
    // project, where a once-future value could have become an immediate post.
    setScheduleAt("");
  }, [activeId]);

  useEffect(() => {
    if (!configured) return undefined;
    let unsubscribe = () => {};
    try {
      const instance = auth();
      getRedirectResult(instance).catch((nextError) => {
        if (nextError?.code !== "auth/no-auth-event") setAuthError(describeError(nextError));
      });
      unsubscribe = onAuthStateChanged(instance, (nextUser) => {
        setUser(nextUser);
        setAuthState(nextUser ? "signedIn" : "signedOut");
      }, (nextError) => {
        setAuthError(describeError(nextError));
        setAuthState("signedOut");
      });
    } catch (nextError) {
      setAuthError(describeError(nextError));
      setAuthState("signedOut");
    }
    return () => unsubscribe();
  }, [configured]);

  const call = useCallback(async (action, payload = {}) => {
    if (!user) throw new Error("Sign in first.");
    const token = await user.getIdToken();
    const response = await fetch("/api/video-factory", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "The Video Factory could not finish that request.");
    return result;
  }, [user]);

  const upsert = useCallback((project) => {
    if (!project) return;
    setProjects((current) => [project, ...current.filter((item) => item.id !== project.id)]
      .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt))));
  }, []);

  const loadStudio = useCallback(async () => {
    if (!isOwner) return;
    setLoading(true);
    setError("");
    try {
      const [status, library] = await Promise.all([call("status"), call("list")]);
      setFactory(status);
      setProjects(library.projects || []);
      setActiveId((current) => current || library.projects?.[0]?.id || "");
    } catch (nextError) {
      setError(describeError(nextError));
    } finally {
      setLoading(false);
    }
  }, [call, isOwner]);

  useEffect(() => { loadStudio(); }, [loadStudio]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const result = new URLSearchParams(window.location.search).get("youtube");
    if (!result) return;
    if (result === "connected") setNotice("YouTube is connected. New videos will stay private until you schedule them.");
    else setError("YouTube did not connect. Try again from the Publish tab.");
    window.history.replaceState({}, "", "/video/");
  }, []);

  const refreshOne = useCallback(async (projectId) => {
    if (!projectId || polling.current) return;
    polling.current = true;
    try {
      const result = await call("refresh", { projectId });
      upsert(result.project);
      if (result.project?.status === "ready") setNotice("Your finished video is ready to review.");
    } catch (nextError) {
      setError(describeError(nextError));
    } finally {
      polling.current = false;
    }
  }, [call, upsert]);

  useEffect(() => {
    const pendingIds = pendingProjectKey
      .split("|")
      .filter(Boolean)
      .map((entry) => entry.slice(0, entry.lastIndexOf(":")));
    if (!pendingIds.length) return undefined;
    let canceled = false;
    let timer;
    const refreshPending = async () => {
      for (const projectId of pendingIds) {
        if (canceled) break;
        await refreshOne(projectId);
      }
      if (!canceled) timer = window.setTimeout(refreshPending, 5000);
    };
    refreshPending();
    return () => { canceled = true; window.clearTimeout(timer); };
  }, [pendingProjectKey, refreshOne]);

  useEffect(() => {
    if (!factory?.integrations?.image || !active?.blueprint || active.hasThumbnail || thumbnailStarted.current.has(active?.id)) return;
    thumbnailStarted.current.add(active.id);
    call("thumbnail", { projectId: active.id })
      .then((result) => upsert(result.project))
      .catch(() => thumbnailStarted.current.delete(active.id));
  }, [active?.id, active?.blueprint, active?.hasThumbnail, call, factory?.integrations?.image, upsert]);

  useEffect(() => {
    if (!active?.thumbnailAssetUrl || thumbnailBlobs[active.id]) return undefined;
    let canceled = false;
    user.getIdToken().then((token) => fetch(active.thumbnailAssetUrl, {
      headers: { Authorization: `Bearer ${token}` },
    })).then((response) => {
      if (!response.ok) throw new Error("Thumbnail unavailable");
      return response.blob();
    }).then((blob) => {
      if (canceled) return;
      const localUrl = URL.createObjectURL(blob);
      thumbnailObjectUrls.current.add(localUrl);
      setThumbnailBlobs((current) => ({ ...current, [active.id]: localUrl }));
    }).catch(() => {});
    return () => { canceled = true; };
  }, [active?.id, active?.thumbnailAssetUrl, thumbnailBlobs, user]);

  useEffect(() => () => {
    for (const localUrl of thumbnailObjectUrls.current) URL.revokeObjectURL(localUrl);
    thumbnailObjectUrls.current.clear();
  }, []);

  useEffect(() => {
    if (!active?.videoAssetUrl || videoBlobs[active.id]) return undefined;
    let canceled = false;
    user.getIdToken().then((token) => fetch(active.videoAssetUrl, {
      headers: { Authorization: `Bearer ${token}` },
    })).then((response) => {
      if (!response.ok) throw new Error("Archived video unavailable");
      return response.blob();
    }).then((blob) => {
      if (canceled) return;
      const localUrl = URL.createObjectURL(blob);
      if (videoObjectUrl.current) URL.revokeObjectURL(videoObjectUrl.current);
      videoObjectUrl.current = localUrl;
      setVideoBlobs({ [active.id]: localUrl });
    }).catch(() => {});
    return () => { canceled = true; };
  }, [active?.id, active?.videoAssetUrl, user, videoBlobs]);

  useEffect(() => () => {
    if (videoObjectUrl.current) URL.revokeObjectURL(videoObjectUrl.current);
    videoObjectUrl.current = "";
  }, []);

  const startSignIn = async () => {
    setSigningIn(true);
    setAuthError("");
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    try {
      await signInWithPopup(auth(), provider);
    } catch (nextError) {
      const popup = ["auth/popup-blocked", "auth/operation-not-supported-in-this-environment", "auth/popup-closed-by-user"].includes(nextError?.code);
      if (popup) {
        try { await signInWithRedirect(auth(), provider); } catch (redirectError) { setAuthError(describeError(redirectError)); }
      } else if (nextError?.code !== "auth/cancelled-popup-request") setAuthError(describeError(nextError));
    } finally {
      setSigningIn(false);
    }
  };

  const create = async (event) => {
    event.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const idempotencyKey = crypto.randomUUID().replace(/-/g, "_");
      const result = await call("create", { title, idempotencyKey });
      upsert(result.project);
      setActiveId(result.project.id);
      setTitle("");
      setTab("preview");
      setNotice("Research started. You can leave this page and come back without losing it.");
    } catch (nextError) {
      setError(describeError(nextError));
    } finally {
      setLoading(false);
    }
  };

  const action = async (name, payload = {}) => {
    if (!active) return;
    setLoading(true);
    setError("");
    try {
      const result = await call(name, { projectId: active.id, ...payload });
      upsert(result.project);
      return result;
    } catch (nextError) {
      setError(describeError(nextError));
      return null;
    } finally {
      setLoading(false);
    }
  };

  const connectYoutube = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await call("youtube_connect");
      window.location.assign(result.url);
    } catch (nextError) {
      setError(describeError(nextError));
      setLoading(false);
    }
  };

  const uploadYoutube = async () => {
    let publishAt = "";
    if (scheduleAt) {
      const timestamp = new Date(scheduleAt).getTime();
      if (!Number.isFinite(timestamp) || timestamp < Date.now() + 5 * 60 * 1000) {
        setError("Choose a YouTube publish time at least five minutes in the future.");
        return;
      }
      publishAt = new Date(timestamp).toISOString();
    }
    const result = await action("youtube_upload", {
      publishAt,
      confirmNewUpload: active?.youtubeStatus === "recovery_required",
    });
    if (result?.project?.youtubeStatus === "thumbnail_failed") {
      setNotice("The video is private on YouTube. Its custom thumbnail still needs one retry.");
    } else if (["uploading", "upload_paused"].includes(result?.project?.youtubeStatus)) {
      setNotice("YouTube saved the upload session. Resume it to continue without starting over.");
    } else if (result?.project?.youtubeStatus === "recovery_required") {
      setNotice("Check the Pelvi YouTube channel for this title. Then use the confirmation button only if no copy exists.");
    } else if (result) setNotice(publishAt ? "Uploaded privately and scheduled on YouTube." : "Uploaded privately to YouTube.");
  };

  const signOutOwner = async () => {
    await signOut(auth());
    setProjects([]);
    setFactory(null);
  };

  const openSettings = () => {
    setSettingsDraft({ ...(factory?.settings || {}) });
    setSettingsOpen(true);
  };

  const saveSettings = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await call("save_settings", { settings: settingsDraft });
      setFactory(result.status);
      setSettingsDraft(result.settings || {});
      setSettingsOpen(false);
      setNotice("Provider settings were encrypted and saved. No deployment is needed.");
    } catch (nextError) {
      setError(describeError(nextError));
    } finally {
      setLoading(false);
    }
  };

  if (authState !== "signedIn" || !isOwner) {
    return (
      <OwnerGate
        state={authState}
        email={user?.email}
        configured={configured}
        error={authError}
        signingIn={signingIn}
        onSignIn={startSignIn}
        onSignOut={signOutOwner}
      />
    );
  }

  const thumb = thumbnailBlobs[active?.id] || active?.thumbnailUrl || active?.providerThumbnailUrl || "";
  const finalVideo = videoBlobs[active?.id] || active?.videoUrl || "";

  return (
    <div className="vf-app" data-rail={railOpen ? "open" : "closed"}>
      <aside className="vf-rail">
        <div className="vf-brand-row">
          <div className="vf-brand-mark"><Film /></div>
          <div className="vf-brand-copy"><strong>Pelvi</strong><span>Video Factory</span></div>
          <button className="vf-icon-button vf-rail-toggle" type="button" aria-label={railOpen ? "Close project library" : "Open project library"} onClick={() => setRailOpen((value) => !value)}>
            {railOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
          </button>
        </div>

        <button type="button" className="vf-new-button" onClick={() => { setActiveId(""); setTitle(""); }}>
          <Plus /> <span>New video</span>
        </button>

        <div className="vf-library-head"><span>Projects</span><span>{projects.length}</span></div>
        <nav className="vf-project-list" aria-label="Video projects">
          {projects.map((project) => (
            <button key={project.id} type="button" className="vf-project-row" aria-current={active?.id === project.id ? "page" : undefined} onClick={() => { setActiveId(project.id); setTab("preview"); }}>
              <ProjectGlyph status={project.status} />
              <span className="vf-project-copy"><strong>{project.blueprint?.youtube?.title || project.title}</strong><small>{statusLabel(project.status)} · {relativeDate(project.updatedAt)}</small></span>
            </button>
          ))}
          {!projects.length && !loading ? <div className="vf-empty-library"><Library /><span>Your finished and in-progress videos will live here.</span></div> : null}
        </nav>

        <div className="vf-rail-footer">
          <IntegrationSummary factory={factory} />
          <button type="button" className="vf-account" onClick={signOutOwner}><span>{initials(user.email)}</span><span><strong>Studio owner</strong><small>{user.email}</small></span><LogOut /></button>
        </div>
      </aside>

      <main className="vf-main">
        <header className="vf-topbar">
          <div><span className="vf-eyebrow">PRIVATE PRODUCTION STUDIO</span><strong>{active ? "Production workspace" : "Create a new video"}</strong></div>
          <div className="vf-top-actions">
            {active && ACTIVE.has(active.status) ? <button className="vf-live-chip" type="button" onClick={() => refreshOne(active.id)}><i /><span>{statusLabel(active.status)}</span><RefreshCw /></button> : null}
            <button className="vf-icon-button" type="button" aria-label="Open provider settings" onClick={openSettings}><Settings2 /></button>
            <button className="vf-icon-button" type="button" aria-label="Refresh studio" onClick={loadStudio}><RefreshCw /></button>
          </div>
        </header>

        <div className="vf-scroll">
          <section className="vf-compose">
            <div className="vf-compose-copy">
              <span className="vf-kicker"><WandSparkles /> ONE TITLE IN. A PUBLISHABLE VIDEO OUT.</span>
              <h1>Turn a private pelvic-floor question into a video people trust.</h1>
              <p>Live research, claim-by-claim evidence, a human script, a consistent presenter, visual storytelling, captions, thumbnail, metadata and private YouTube delivery.</p>
            </div>
            <form className="vf-prompt" onSubmit={create}>
              <label htmlFor="vf-title">What should the next video answer?</label>
              <div className="vf-prompt-box">
                <textarea id="vf-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={180} placeholder="Why does sex hurt even when I’m aroused and want it?" rows={2} />
                <button type="submit" disabled={loading || title.trim().length < 12} aria-label="Create complete video"><Sparkles /><span>Create video</span><ArrowRight /></button>
              </div>
              <div className="vf-suggestions" aria-label="Example questions">
                {STARTERS.slice(0, 3).map((starter) => <button type="button" key={starter} onClick={() => setTitle(starter)}>{starter}</button>)}
              </div>
            </form>
          </section>

          {notice ? <div className="vf-notice" role="status"><Check />{notice}<button type="button" onClick={() => setNotice("")}>Dismiss</button></div> : null}
          {error ? <div className="vf-error" role="alert"><AlertTriangle />{error}<button type="button" onClick={() => setError("")}>Dismiss</button></div> : null}

          {active ? (
            <section className="vf-workspace">
              <ProjectHeader project={active} videoUrl={finalVideo} onRetry={() => action("retry")} loading={loading} />
              <Pipeline project={active} />
              <div className="vf-tabs" role="tablist" aria-label="Project artifacts">
                {TABS.map(([id, label]) => <button type="button" key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>{label}</button>)}
              </div>
              <div className="vf-artifact">
                {tab === "preview" ? <Preview project={active} thumb={thumb} videoUrl={finalVideo} onRender={() => action("render")} onThumbnail={() => action("thumbnail")} loading={loading} /> : null}
                {tab === "script" ? <ScriptPanel project={active} /> : null}
                {tab === "storyboard" ? <StoryboardPanel project={active} /> : null}
                {tab === "evidence" ? <EvidencePanel project={active} /> : null}
                {tab === "publish" ? (
                  <PublishPanel
                    project={active}
                    factory={factory}
                    scheduleAt={scheduleAt}
                    setScheduleAt={setScheduleAt}
                    onConnect={connectYoutube}
                    onUpload={uploadYoutube}
                    loading={loading}
                  />
                ) : null}
              </div>
            </section>
          ) : <StudioEmpty onPick={(value) => setTitle(value)} />}
        </div>
      </main>
      {settingsOpen ? (
        <ProviderSettings
          value={settingsDraft}
          onChange={setSettingsDraft}
          onClose={() => setSettingsOpen(false)}
          onSave={saveSettings}
          loading={loading}
          redirectUri={factory?.youtubeRedirectUri}
        />
      ) : null}
    </div>
  );
}

function ProviderSettings({ value, onChange, onClose, onSave, loading, redirectUri }) {
  const update = (field, next) => onChange((current) => ({ ...current, [field]: next }));
  const imageProvider = value.imageProvider || "gemini";
  const imageCost = thumbnailCost(value);
  return (
    <div className="vf-modal" role="dialog" aria-modal="true" aria-labelledby="vf-provider-title">
      <button type="button" className="vf-modal-backdrop" aria-label="Close provider settings" onClick={onClose} />
      <section className="vf-settings-panel">
        <header>
          <div><span className="vf-eyebrow">ENCRYPTED PROVIDER VAULT</span><h2 id="vf-provider-title">Connect the factory once</h2><p>Add or replace keys here. They are encrypted server-side and never returned in full, so changing a provider does not require a code push.</p></div>
          <button className="vf-icon-button" type="button" aria-label="Close settings" onClick={onClose}>×</button>
        </header>
        <div className="vf-settings-scroll">
          <SettingsGroup icon={Search} title="Research and medical review" badge="OpenAI">
            <SecretField label="OpenAI API key" value={value.openaiApiKey || ""} onChange={(next) => update("openaiApiKey", next)} placeholder="sk-proj-…" />
            <div className="vf-field-pair">
              <TextField label="Research model" value={value.researchModel || "gpt-5.6-sol"} onChange={(next) => update("researchModel", next)} />
              <TextField label="Independent review model" value={value.reviewModel || "gpt-5.6-sol"} onChange={(next) => update("reviewModel", next)} />
            </div>
            <p className="vf-settings-note">This stage searches only approved medical domains, creates the claim ledger, then runs a separate safety and human-voice review.</p>
          </SettingsGroup>

          <SettingsGroup icon={ImageIcon} title="Thumbnail image" badge={imageProvider === "gemini" ? "Nano Banana" : "OpenAI"}>
            <div className="vf-field-pair">
              <label className="vf-settings-field"><span>Image provider</span><select value={imageProvider} onChange={(event) => {
                const provider = event.target.value;
                update("imageProvider", provider);
                update("imageModel", provider === "gemini" ? "gemini-3-pro-image" : "gpt-image-2");
              }}><option value="gemini">Google Gemini</option><option value="openai">OpenAI</option></select></label>
              <label className="vf-settings-field"><span>Image model</span><select value={value.imageModel || "gemini-3-pro-image"} onChange={(event) => update("imageModel", event.target.value)}>{imageProvider === "gemini" ? <><option value="gemini-3-pro-image">Nano Banana Pro · final quality</option><option value="gemini-3.1-flash-image">Nano Banana 2 · faster</option><option value="gemini-3.1-flash-lite-image">Nano Banana 2 Lite · lowest cost</option></> : <option value="gpt-image-2">GPT Image 2</option>}</select></label>
            </div>
            {imageProvider === "gemini" ? <SecretField label="Google Gemini API key" value={value.geminiApiKey || ""} onChange={(next) => update("geminiApiKey", next)} placeholder="AIza…" /> : null}
            <div className="vf-cost-line"><span>{imageCost.label}</span><strong>{imageCost.usd ? `$${imageCost.usd.toFixed(3)}` : "Depends on model"}</strong></div>
            <p className="vf-settings-note">Nano Banana Pro is the highest-quality thumbnail option. Nano Banana 2 is the lower-cost all-around choice. Lite is cheapest but limited to 1K and is less suitable when exact text or character consistency matters.</p>
          </SettingsGroup>

          <SettingsGroup icon={Film} title="Presenter and finished video" badge="HeyGen Video Agent">
            <SecretField label="HeyGen API key" value={value.heygenApiKey || ""} onChange={(next) => update("heygenApiKey", next)} placeholder="HeyGen key" />
            <div className="vf-field-pair">
              <TextField label="Commercially authorized avatar ID" value={value.heygenAvatarId || ""} onChange={(next) => update("heygenAvatarId", next)} placeholder="Required" />
              <TextField label="Voice ID" value={value.heygenVoiceId || ""} onChange={(next) => update("heygenVoiceId", next)} placeholder="Recommended" />
              <TextField label="Style ID" value={value.heygenStyleId || ""} onChange={(next) => update("heygenStyleId", next)} placeholder="Optional" />
              <TextField label="Brand kit ID" value={value.heygenBrandKitId || ""} onChange={(next) => update("heygenBrandKitId", next)} placeholder="Optional" />
            </div>
            <div className="vf-cost-line"><span>Typical 3-minute complete render</span><strong>about $6.00</strong></div>
            <p className="vf-settings-note">Use an avatar and voice you have commercial rights to. The factory identifies this person as a Pelvi educational host, not a doctor.</p>
          </SettingsGroup>

          <SettingsGroup icon={Youtube} title="Private YouTube delivery" badge="Google OAuth">
            <TextField label="YouTube OAuth client ID" value={value.youtubeClientId || ""} onChange={(next) => update("youtubeClientId", next)} placeholder="…apps.googleusercontent.com" />
            <SecretField label="YouTube OAuth client secret" value={value.youtubeClientSecret || ""} onChange={(next) => update("youtubeClientSecret", next)} placeholder="GOCSPX-…" />
            <div className="vf-redirect-copy"><span>Authorized redirect URI</span><code>{redirectUri || "https://pelvi.health/api/video-factory-youtube"}</code><CopyButton value={redirectUri || "https://pelvi.health/api/video-factory-youtube"} /></div>
            <p className="vf-settings-note">Add that exact URI once in Google Cloud. After that, channel connection and uploads happen from this studio.</p>
          </SettingsGroup>
        </div>
        <footer><div><ShieldCheck /><span><strong>AES-GCM encrypted</strong><small>The existing Firebase service identity protects the vault.</small></span></div><div><button type="button" className="vf-secondary-button" onClick={onClose}>Cancel</button><button type="button" className="vf-primary-button" onClick={onSave} disabled={loading}>{loading ? <LoaderCircle className="vf-spin" /> : <Check />} Save provider setup</button></div></footer>
      </section>
    </div>
  );
}

function SettingsGroup({ icon: Icon, title, badge, children }) {
  return <section className="vf-settings-group"><div className="vf-settings-group-head"><span><Icon /></span><div><h3>{title}</h3><small>{badge}</small></div></div><div className="vf-settings-fields">{children}</div></section>;
}

function SecretField({ label, value, onChange, placeholder }) {
  return <label className="vf-settings-field"><span>{label}</span><input type="password" autoComplete="new-password" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>;
}

function TextField({ label, value, onChange, placeholder }) {
  return <label className="vf-settings-field"><span>{label}</span><input type="text" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>;
}

function thumbnailCost(settings) {
  if ((settings.imageProvider || "gemini") !== "gemini") return { label: "Selected OpenAI image model", usd: null };
  const model = settings.imageModel || "gemini-3-pro-image";
  if (model === "gemini-3.1-flash-lite-image") return { label: "Nano Banana 2 Lite · 1K · 16:9", usd: 0.0336 };
  if (model === "gemini-3.1-flash-image") return { label: "Nano Banana 2 · 2K · 16:9", usd: 0.101 };
  return { label: "Nano Banana Pro · 2K · 16:9", usd: 0.134 };
}

function OwnerGate({ state, email, configured, error, signingIn, onSignIn, onSignOut }) {
  let title = "Checking your studio access";
  let body = "One moment while Pelvi verifies the owner account.";
  let action = <LoaderCircle className="vf-spin" />;
  if (!configured || state === "unconfigured") {
    title = "Firebase is not configured";
    body = "The private studio needs the existing Pelvi Firebase project before it can verify its owner.";
    action = null;
  } else if (state === "signedOut") {
    title = "Open Pelvi Video Factory";
    body = "Sign in with the one verified Pelvi owner account. Every project and provider operation is checked again on the server.";
    action = <button type="button" onClick={onSignIn} disabled={signingIn}>{signingIn ? <LoaderCircle className="vf-spin" /> : <Sparkles />}{signingIn ? "Opening Google" : "Continue with Google"}</button>;
  } else if (state === "signedIn") {
    title = "This account does not own the studio";
    body = `${email || "This account"} cannot open private Pelvi productions. Only ${ADMIN_EMAIL} has access.`;
    action = <button type="button" onClick={onSignOut}><LogOut /> Sign out</button>;
  }
  return (
    <div className="vf-gate">
      <div className="vf-gate-orbit"><span /><span /><span /></div>
      <div className="vf-gate-card">
        <div className="vf-gate-mark"><Film /></div>
        <span className="vf-eyebrow">PELVI · PRIVATE STUDIO</span>
        <h1>{title}</h1>
        <p>{body}</p>
        {error ? <div className="vf-gate-error">{error}</div> : null}
        {action}
      </div>
    </div>
  );
}

function ProjectHeader({ project, videoUrl, onRetry, loading }) {
  return (
    <div className="vf-project-head">
      <div>
        <div className="vf-project-meta"><StatusPill status={project.status} />{project.blueprint?.goal ? <span>{goalLabel(project.blueprint.goal)}</span> : null}{project.durationSeconds ? <span><Clock3 />{formatDuration(project.durationSeconds)}</span> : null}{project.estimatedProductionCostUSD ? <span>Est. ${project.estimatedProductionCostUSD.toFixed(2)}</span> : null}</div>
        <h2>{project.blueprint?.youtube?.title || project.title}</h2>
        <p>{project.blueprint?.answer || "The factory is researching the exact question before it writes a word."}</p>
      </div>
      <div className="vf-head-actions">
        {project.status === "failed" ? <button type="button" className="vf-secondary-button" onClick={onRetry} disabled={loading}><RefreshCw /> Retry failed step</button> : null}
        {videoUrl ? <a className="vf-primary-button" href={videoUrl} target="_blank" rel="noreferrer"><Play /> Open final video</a> : null}
      </div>
    </div>
  );
}

function Pipeline({ project }) {
  const current = pipelineIndex(project.status);
  const stages = [
    ["Research", Search, "Current sources"],
    ["Medical check", ShieldCheck, "Claim by claim"],
    ["Production", FileCheck2, "Script and scenes"],
    ["Render", Film, "Presenter and edit"],
    ["Ready", Check, "Private delivery"],
  ];
  return (
    <ol className="vf-pipeline" aria-label="Video production progress">
      {stages.map(([label, Icon, detail], index) => {
        const state = project.status === "failed" && index === current ? "failed" : index < current ? "done" : index === current ? "active" : "waiting";
        return <li key={label} data-state={state}><span className="vf-stage-icon">{state === "active" && ACTIVE.has(project.status) ? <LoaderCircle className="vf-spin" /> : state === "done" ? <Check /> : <Icon />}</span><span><strong>{label}</strong><small>{detail}</small></span>{index < stages.length - 1 ? <i /> : null}</li>;
      })}
    </ol>
  );
}

function Preview({ project, thumb, videoUrl, onRender, onThumbnail, loading }) {
  const blueprint = project.blueprint;
  if (!blueprint) return <WorkingState project={project} />;
  return (
    <div className="vf-preview-grid">
      <div className="vf-player-card">
        <div className="vf-player-frame">
          {videoUrl ? <video src={videoUrl} poster={thumb || project.providerThumbnailUrl} controls playsInline preload="metadata" /> : thumb ? <img src={thumb} alt={`Thumbnail for ${blueprint.youtube.title}`} /> : <div className="vf-film-placeholder"><Film /><span>{project.status === "script_ready" ? "Script approved" : "Render in progress"}</span></div>}
          {!videoUrl && thumb ? <div className="vf-frame-badge"><ImageIcon /> Thumbnail ready</div> : null}
        </div>
        <div className="vf-player-footer">
          <div><span>Final cut</span><strong>{formatDuration(project.durationSeconds || blueprint.runtimeSeconds)} · 16:9 · captions</strong></div>
          <div className="vf-inline-actions">
            {!project.hasThumbnail ? <button type="button" onClick={onThumbnail} disabled={loading}><ImageIcon /> Create thumbnail</button> : null}
            {project.status === "script_ready" ? <button type="button" onClick={onRender} disabled={loading}><Film /> Render video</button> : null}
            {videoUrl ? <a href={videoUrl} download target="_blank" rel="noreferrer"><Download /> Download MP4</a> : null}
          </div>
        </div>
      </div>
      <aside className="vf-preview-side">
        <div className="vf-score-card"><span>Publishing score</span><strong>{project.review?.engagementScore || blueprint.quality?.score || 0}<small>/100</small></strong><div><i style={{ width: `${Math.max(0, Math.min(100, project.review?.engagementScore || blueprint.quality?.score || 0))}%` }} /></div><p>Medical safety must pass before rendering. Engagement must reach 85.</p></div>
        <div className="vf-answer-card"><span>THE ANSWER</span><p>{blueprint.answer}</p></div>
        <div className="vf-proof-list">
          <Proof icon={ShieldCheck} title={`${blueprint.claims.length} checked claims`} detail={`${blueprint.sources.length} reproducible sources`} />
          <Proof icon={Mic2} title="Human voice pass" detail="No filler, invented clinic stories or stiff phrasing" />
          <Proof icon={Clock3} title="Payoff before 0:22" detail="The viewer gets a direct answer before the explanation" />
        </div>
      </aside>
    </div>
  );
}

function WorkingState({ project }) {
  const copy = {
    researching: ["Researching the exact question", "The factory is reading current guidelines and reviews, then building the claim ledger before the script."],
    claim_check: ["Rechecking every medical claim", "A separate editorial pass is reopening each source, correcting certainty and removing anything it cannot reproduce."],
    storyboarding: ["Turning the approved script into a film", "Scenes, presenter direction, visual rhythm, source slugs, captions and thumbnail are being assembled."],
    rendering: ["Rendering the final cut", "The consistent presenter, voice, B-roll, diagrams, typography and captions are being edited into one video."],
    quality_check: ["Checking the finished narration", "The factory is matching the rendered captions to the medically approved script before it saves the final video."],
    failed: ["This step needs attention", project.error || "Retry the failed step without losing the completed work."],
  }[project.status] || ["Production is moving", "The complete project will appear here as each stage clears its quality gate."];
  return <div className="vf-working"><div className="vf-working-orb"><LoaderCircle className={ACTIVE.has(project.status) ? "vf-spin" : ""} /></div><span>{statusLabel(project.status)}</span><h3>{copy[0]}</h3><p>{copy[1]}</p><div className="vf-working-lines"><i /><i /><i /></div></div>;
}

function ScriptPanel({ project }) {
  const blueprint = project.blueprint;
  if (!blueprint) return <WorkingState project={project} />;
  return (
    <div className="vf-document-grid">
      <article className="vf-script-paper">
        <div className="vf-document-head"><div><span>FINAL VOICE SCRIPT</span><h3>{blueprint.scriptTitle}</h3></div><CopyButton value={blueprint.fullScript} /></div>
        <p className="vf-script-text">{blueprint.fullScript}</p>
      </article>
      <aside className="vf-script-notes">
        <h3>Voice direction</h3>
        <ul><li>Warm, precise and conversational</li><li>No biography before the answer</li><li>Short sentences and natural contractions</li><li>Never claims to be a doctor or clinician</li></ul>
        <div className="vf-quote"><MessageSquareQuote /><p>{blueprint.youtube.pinnedComment}</p></div>
      </aside>
    </div>
  );
}

function StoryboardPanel({ project }) {
  const blueprint = project.blueprint;
  if (!blueprint) return <WorkingState project={project} />;
  return (
    <div className="vf-scenes">
      {blueprint.scenePlan.map((scene, index) => (
        <article key={`${scene.startSeconds}-${index}`}>
          <div className="vf-scene-time"><span>{String(index + 1).padStart(2, "0")}</span><strong>{formatTime(scene.startSeconds)}–{formatTime(scene.endSeconds)}</strong></div>
          <div className="vf-scene-visual"><Film /><p>{scene.visualDirection}</p>{scene.onScreenText ? <span>{scene.onScreenText}</span> : null}</div>
          <div className="vf-scene-copy"><p>{scene.narration}</p>{scene.citationIds?.length ? <small>{scene.citationIds.join(" · ")}</small> : null}</div>
        </article>
      ))}
    </div>
  );
}

function EvidencePanel({ project }) {
  const blueprint = project.blueprint;
  if (!blueprint) return <WorkingState project={project} />;
  return (
    <div className="vf-evidence-grid">
      <section className="vf-claims"><div className="vf-section-title"><span><ShieldCheck /> CLAIM LEDGER</span><strong>{blueprint.claims.length} claims</strong></div>{blueprint.claims.map((claim) => <article key={claim.id}><div><span>{claim.id}</span><em data-strength={claim.evidenceStrength}>{claim.evidenceStrength.replace("_", " ")}</em></div><p>{claim.text}</p><small>{claim.certainty}{claim.limits ? ` · ${claim.limits}` : ""}</small><footer>{claim.sourceIds.join(" · ")}</footer></article>)}</section>
      <section className="vf-sources"><div className="vf-section-title"><span><BookOpen /> SOURCE LIBRARY</span><strong>{blueprint.sources.length} sources</strong></div>{blueprint.sources.map((source) => <a key={source.id} href={source.url} target="_blank" rel="noreferrer"><span>{source.tier}</span><div><strong>{source.title}</strong><small>{source.publisher} · {source.year}</small><p>{source.scope}</p></div><ExternalLink /></a>)}</section>
    </div>
  );
}

function PublishPanel({ project, factory, scheduleAt, setScheduleAt, onConnect, onUpload, loading }) {
  const blueprint = project.blueprint;
  if (!blueprint) return <WorkingState project={project} />;
  const connected = factory?.integrations?.youtubeConnected;
  const thumbnailRecovery = ["thumbnail_failed", "thumbnail_uploading"].includes(project.youtubeStatus);
  const youtubeDone = Boolean(project.youtubeVideoId) && !thumbnailRecovery;
  const uploadLabel = project.youtubeStatus === "thumbnail_failed"
    ? "Retry custom thumbnail"
    : project.youtubeStatus === "thumbnail_uploading"
      ? "Finish custom thumbnail"
    : ["uploading", "upload_paused"].includes(project.youtubeStatus)
      ? "Resume YouTube upload"
      : project.youtubeStatus === "recovery_required"
        ? "I checked. Start a new upload"
    : youtubeDone
      ? "Uploaded"
      : scheduleAt
        ? "Upload private and schedule"
        : "Upload as private";
  const uploadDescription = youtubePackageDescription(blueprint);
  return (
    <div className="vf-publish-grid">
      <section className="vf-publish-copy">
        <div className="vf-document-head"><div><span>YOUTUBE PACKAGE</span><h3>{blueprint.youtube.title}</h3></div><CopyButton value={`${blueprint.youtube.title}\n\n${uploadDescription}`} /></div>
        <label>Description</label><div className="vf-copy-block">{uploadDescription}</div>
        <label>Chapters</label><div className="vf-chapters">{blueprint.youtube.chapters.map((chapter) => <span key={`${chapter.time}-${chapter.title}`}><b>{chapter.time}</b>{chapter.title}</span>)}</div>
        <label>Tags</label><div className="vf-tags">{blueprint.youtube.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
        <label>Next-video bridge</label><div className="vf-next-video"><CirclePlay /><strong>{blueprint.youtube.nextVideoTitle}</strong></div>
      </section>
      <aside className="vf-delivery-card">
        <div className="vf-youtube-mark"><Youtube /></div>
        <span>PRIVATE YOUTUBE DELIVERY</span>
        <h3>{connected ? "Channel connected" : "Connect the Pelvi channel"}</h3>
        <p>{connected ? "The factory uploads privately first. Add an optional publish time or leave it private for your own review." : "Connect once with Google. The permission is limited to uploading videos, and the refresh token is encrypted before storage."}</p>
        {!connected ? <button className="vf-youtube-button" type="button" onClick={onConnect} disabled={loading}><Youtube /> Connect YouTube</button> : (
          <>
            <label htmlFor="vf-schedule">Optional publish time</label>
            <input id="vf-schedule" type="datetime-local" value={scheduleAt} min={futureLocalTime()} onChange={(event) => setScheduleAt(event.target.value)} />
            <button className="vf-youtube-button" type="button" onClick={onUpload} disabled={loading || youtubeDone || (!project.videoUrl && !project.hasArchivedVideo)}>{loading ? <LoaderCircle className="vf-spin" /> : youtubeDone ? <Check /> : <Upload />}{uploadLabel}</button>
          </>
        )}
        {project.youtubeUrl ? <a className="vf-youtube-link" href={project.youtubeUrl} target="_blank" rel="noreferrer"><Youtube /> Open in YouTube Studio <ExternalLink /></a> : null}
        {project.youtubeError ? <div className="vf-delivery-error">{project.youtubeError}</div> : null}
        <div className="vf-delivery-proof"><ShieldCheck /><span><strong>Owner-only operation</strong><small>No public upload happens without this button.</small></span></div>
      </aside>
    </div>
  );
}

function StudioEmpty({ onPick }) {
  return (
    <section className="vf-empty-studio">
      <div className="vf-empty-visual"><span><Search /></span><span><ShieldCheck /></span><span><FileCheck2 /></span><span><Film /></span><i /></div>
      <span className="vf-eyebrow">THE PELVI EDITORIAL STANDARD</span>
      <h2>Authority comes from specificity and evidence, not a costume.</h2>
      <p>The factory starts inside the viewer’s private moment, answers the question plainly, verifies each health claim, then turns it into a visual story people want to finish.</p>
      <div className="vf-empty-proofs"><Proof icon={Search} title="Live research" detail="Current guidelines and systematic reviews" /><Proof icon={ShieldCheck} title="Two-pass review" detail="Medical safety plus human voice" /><Proof icon={Film} title="Complete production" detail="Presenter, scenes, captions and YouTube package" /></div>
      <button type="button" onClick={() => onPick(STARTERS[0])}>Use an example question <ArrowRight /></button>
    </section>
  );
}

function IntegrationSummary({ factory }) {
  const values = factory?.integrations || {};
  const ready = [values.research, values.presenter, values.persistence].filter(Boolean).length;
  return <div className="vf-integrations"><div><Settings2 /><span><strong>Factory setup</strong><small>{ready}/3 production systems ready</small></span></div><div className="vf-mini-meter"><i style={{ width: `${(ready / 3) * 100}%` }} /></div></div>;
}

function Proof({ icon: Icon, title, detail }) {
  return <div className="vf-proof"><span><Icon /></span><div><strong>{title}</strong><small>{detail}</small></div></div>;
}

function ProjectGlyph({ status }) {
  if (status === "ready" || status === "uploaded") return <span className="vf-project-glyph" data-tone="ready"><Play /></span>;
  if (status === "failed") return <span className="vf-project-glyph" data-tone="failed"><AlertTriangle /></span>;
  return <span className="vf-project-glyph" data-tone="working"><LoaderCircle className="vf-spin" /></span>;
}

function StatusPill({ status }) {
  const tone = status === "failed" ? "failed" : ["ready", "uploaded"].includes(status) ? "ready" : ACTIVE.has(status) ? "working" : "neutral";
  return <span className="vf-status" data-tone={tone}>{tone === "ready" ? <Check /> : tone === "failed" ? <AlertTriangle /> : tone === "working" ? <LoaderCircle className="vf-spin" /> : <FileCheck2 />}{statusLabel(status)}</span>;
}

function CopyButton({ value }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(value || ""); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch {}
  };
  return <button type="button" className="vf-copy-button" onClick={copy}>{copied ? <Check /> : <Copy />}{copied ? "Copied" : "Copy"}</button>;
}

function pipelineIndex(status) {
  if (["ready", "uploaded"].includes(status)) return 4;
  if (["rendering", "quality_check"].includes(status)) return 3;
  if (["script_ready", "storyboarding"].includes(status)) return 2;
  if (["claim_check", "claim_check_starting"].includes(status)) return 1;
  if (status === "failed") return 0;
  return 0;
}

function statusLabel(status) {
  return ({ researching: "Researching", claim_check_starting: "Starting medical review", claim_check: "Checking claims", script_ready: "Script approved", storyboarding: "Building production", rendering: "Rendering", quality_check: "Checking final narration", ready: "Ready to publish", uploaded: "Uploaded", failed: "Needs attention" })[status] || "In progress";
}

function goalLabel(goal) {
  return ({ intimacy: "Intimacy", bladder_leaks: "Bladder leaks", postpartum: "Postpartum", diastasis_recti: "Diastasis recti", pregnancy_prep: "Pregnancy prep", pelvic_pain: "Pelvic pain", core_strength: "Core strength", fitness: "Fitness" })[goal] || goal;
}

function formatDuration(seconds) {
  const value = Math.max(0, Math.round(Number(seconds) || 0));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}

function formatTime(seconds) { return formatDuration(seconds); }

function relativeDate(value) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "just now";
  const minutes = Math.max(0, Math.round((Date.now() - time) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function futureLocalTime() {
  const date = new Date(Date.now() + 20 * 60 * 1000);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function youtubePackageDescription(blueprint) {
  const description = String(blueprint?.youtube?.description || "").trim();
  const chapters = Array.isArray(blueprint?.youtube?.chapters)
    ? blueprint.youtube.chapters.map((chapter) => `${chapter.time} ${chapter.title}`)
    : [];
  return chapters.length ? `${description}\n\nChapters\n${chapters.join("\n")}` : description;
}

function initials(email) { return String(email || "P").slice(0, 2).toUpperCase(); }

function describeError(error) {
  const message = error?.message || "Something went wrong.";
  const authCode = error?.code || "";
  if (authCode === "auth/popup-closed-by-user") return "The sign-in window was closed before Google finished.";
  if (authCode === "auth/network-request-failed") return "The network interrupted sign-in. Try again.";
  return String(message).replace(/^Firebase:\s*/i, "").slice(0, 320);
}
