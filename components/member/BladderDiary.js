"use client";

// The bladder diary, ported from "Pelvic Floor/Core/Diary/BladderDiaryView.swift".
//
// Why it is worth the trouble on a laptop: a 3-day bladder diary is the single
// artifact a pelvic floor physical therapist asks a patient to bring to a first
// appointment, and it feeds the clinician report on this same tab.
//
// The three rules that shaped the phone's screen are the three rules here:
//   1. A tap logs immediately. Details are optional and come afterwards, by
//      tapping the entry in the timeline. Nobody fills a form standing up.
//   2. Every log is undoable for a few seconds, so a mis-tap costs nothing.
//   3. The empty state explains WHY three days matters, because a diary nobody
//      understands is a diary nobody keeps.
//
// One thing is deliberately different. The phone logs into SwiftData on the
// device; this writes to users/{id}/diary, which is hers and nobody else's (see
// firestore.rules), because a browser has no device to keep it on.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft, ChevronRight, Droplet, GlassWater, Toilet, TriangleAlert, Undo2, X,
} from "lucide-react";
import {
  DIARY_KIND, FLUID_TYPES, LEAK_SIZES, NIGHT_WINDOW_DESCRIPTION, RECOMMENDED_DAY_COUNT,
  URGENCY_LEVELS, VOLUME_PRESETS, deleteDiaryEntry, entryDetail, logDiaryEntry,
  recentLoggedDays, sameDay, startOfDay, updateDiaryEntry, volumeLabel,
} from "./youStore";
import { Sheet } from "./ui";

const KIND_ICONS = { void: Toilet, leak: Droplet, fluid: GlassWater, urge: TriangleAlert };
const KIND_ORDER = ["void", "leak", "fluid", "urge"];

export default function BladderDiary({ open, onClose, memberId, entries, onChange }) {
  const [selectedDay, setSelectedDay] = useState(() => startOfDay(new Date()));
  const [toast, setToast] = useState(null);
  const [editing, setEditing] = useState(null);

  // Coming back to the diary lands on today, the way opening a screen does on
  // the phone. A day she picked on purpose stays put while it is open.
  useEffect(() => {
    if (open) setSelectedDay(startOfDay(new Date()));
  }, [open]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  const dayEntries = useMemo(
    () =>
      (entries || [])
        .filter((e) => e.timestamp && sameDay(e.timestamp, selectedDay))
        .sort((a, b) => a.timestamp - b.timestamp),
    [entries, selectedDay]
  );

  const loggedDays = useMemo(() => recentLoggedDays(entries), [entries]);
  const isToday = sameDay(selectedDay, new Date());

  const log = useCallback(
    async (kind) => {
      // Logging into a past day keeps the time of day she is looking at rather
      // than pretending she was awake at midnight: the phone composes into the
      // selected day at the current clock time, and so does this.
      const now = new Date();
      const timestamp = new Date(selectedDay);
      timestamp.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), 0);
      try {
        const record = await logDiaryEntry(memberId, { kind, timestamp });
        if (!record) return;
        setToast({ id: record.id, message: DIARY_KIND[kind].loggedMessage });
        onChange?.();
      } catch {
        // A tap that looks logged and is not is worse than a tap that failed
        // loudly: she is building the one document she is taking to an
        // appointment. Say so, and leave the buttons ready to try again.
        setToast({ id: null, message: "We could not save that. Check your connection." });
      }
    },
    [memberId, selectedDay, onChange]
  );

  const undo = useCallback(async () => {
    if (!toast?.id) return;
    try {
      await deleteDiaryEntry(memberId, toast.id);
      onChange?.();
    } catch {
      // Nothing was removed. The entry is still in the timeline below, where
      // she can open it and delete it herself.
    }
    setToast(null);
  }, [memberId, toast, onChange]);

  const shiftDay = (delta) => {
    const next = new Date(selectedDay);
    next.setDate(next.getDate() + delta);
    if (startOfDay(next) > startOfDay(new Date())) return;
    setSelectedDay(startOfDay(next));
  };

  return (
    <>
      <Sheet open={open} onClose={onClose} title="Bladder Diary">
        <div className="pb-6">
          {/* Day switcher */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => shiftDay(-1)}
              aria-label="Previous day"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-app-borderIdle bg-white"
            >
              <ChevronLeft className="h-4 w-4 text-app-textPrimary" aria-hidden="true" />
            </button>
            <div className="min-w-0 flex-1 text-center">
              <p className="truncate text-[15px] font-bold text-app-textPrimary">
                {dayTitle(selectedDay)}
              </p>
              <p className="truncate text-[12px] text-app-textSecondary">
                {selectedDay.toLocaleDateString(undefined, {
                  weekday: "long", month: "short", day: "numeric",
                })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => shiftDay(1)}
              disabled={isToday}
              aria-label="Next day"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-app-borderIdle bg-white disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4 text-app-textPrimary" aria-hidden="true" />
            </button>
          </div>

          {/* Quick log. Four buttons, one tap each. */}
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            {KIND_ORDER.map((kind) => {
              const meta = DIARY_KIND[kind];
              const Icon = KIND_ICONS[kind];
              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => log(kind)}
                  className="flex min-h-[92px] flex-col items-start gap-1.5 rounded-[18px] border border-black/[0.06] bg-white p-3 text-left"
                >
                  <span
                    className="grid h-9 w-9 place-items-center rounded-xl"
                    style={{ backgroundColor: meta.accent }}
                  >
                    <Icon className="h-[18px] w-[18px] text-white" aria-hidden="true" />
                  </span>
                  <span className="text-[14px] font-semibold leading-tight text-app-textPrimary">
                    {meta.buttonTitle}
                  </span>
                  <span className="text-[11.5px] leading-tight text-app-textSecondary">
                    {meta.caption}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Timeline, or the empty state that explains the point of it. */}
          {dayEntries.length === 0 ? (
            <div className="mt-4 rounded-[20px] border border-black/[0.06] bg-white p-4">
              <p className="text-[15px] font-bold text-app-textPrimary">
                Nothing logged {isToday ? "yet today" : "on this day"}
              </p>
              <p className="mt-1.5 text-[13.5px] leading-snug text-app-textSecondary">
                Three days of this is the one thing a pelvic floor therapist asks
                you to bring to a first appointment. Tap a button the moment it
                happens — it takes a second, and it beats trying to remember a
                week later.
              </p>
            </div>
          ) : (
            <div className="mt-4 overflow-hidden rounded-[20px] border border-black/[0.06] bg-white">
              <h3 className="px-4 pt-4 text-[13px] font-bold uppercase tracking-wider text-app-textSecondary">
                {dayEntries.length} {dayEntries.length === 1 ? "entry" : "entries"}
              </h3>
              <ul className="mt-1 divide-y divide-black/[0.06]">
                {dayEntries.map((entry) => {
                  const meta = DIARY_KIND[entry.kind];
                  const Icon = KIND_ICONS[entry.kind] || Droplet;
                  const detail = entryDetail(entry);
                  return (
                    <li key={entry.id}>
                      <button
                        type="button"
                        onClick={() => setEditing(entry)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left"
                      >
                        <span
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
                          style={{ backgroundColor: meta?.accent || "#737380" }}
                        >
                          <Icon className="h-4 w-4 text-white" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[14.5px] font-medium text-app-textPrimary">
                            {meta?.buttonTitle || "Entry"}
                          </span>
                          {detail ? (
                            <span className="block truncate text-[12px] text-app-textSecondary">
                              {detail}
                            </span>
                          ) : (
                            <span className="block text-[12px] text-app-textSecondary">
                              Tap to add details
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 text-[12px] tabular-nums text-app-textSecondary">
                          {entry.timestamp.toLocaleTimeString(undefined, {
                            hour: "numeric", minute: "2-digit",
                          })}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* The three-day card. */}
          <div className="mt-4 rounded-[20px] border border-black/[0.06] bg-white p-4">
            <p className="text-[15px] font-bold text-app-textPrimary">Your 3-day diary</p>
            <p className="mt-1 text-[13px] leading-snug text-app-textSecondary">
              Three days in a row is what a therapist reads. {NIGHT_WINDOW_DESCRIPTION}, and
              night trips are counted separately on your report.
            </p>
            <ol className="mt-3 flex gap-2">
              {loggedDays.map((done, index) => (
                <li
                  key={index}
                  className={`flex h-9 flex-1 items-center justify-center rounded-xl text-[12.5px] font-semibold ${
                    done
                      ? "bg-app-positive/15 text-app-positiveInk"
                      : "border border-dashed border-app-borderIdle text-app-textSecondary"
                  }`}
                >
                  {dayLabelForOffset(RECOMMENDED_DAY_COUNT - 1 - index)}
                </li>
              ))}
            </ol>
          </div>

          {/* Undo. Five seconds, the same as the phone's toast. */}
          {toast && (
            <div className="sticky bottom-0 mt-4 flex items-center gap-3 rounded-full bg-app-textPrimary px-4 py-3 text-white">
              <span className="min-w-0 flex-1 text-[13.5px]">{toast.message}</span>
              {toast.id && (
                <button
                  type="button"
                  onClick={undo}
                  className="flex shrink-0 items-center gap-1.5 text-[13.5px] font-bold"
                >
                  <Undo2 className="h-4 w-4" aria-hidden="true" />
                  Undo
                </button>
              )}
              <button
                type="button"
                onClick={() => setToast(null)}
                aria-label="Dismiss"
                className="shrink-0"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </Sheet>

      <EntryEditor
        entry={editing}
        memberId={memberId}
        onClose={() => setEditing(null)}
        onChange={onChange}
      />
    </>
  );
}

/**
 * The optional half: how much, what kind, how urgent, and a note. Everything
 * here can be left alone — an entry with nothing but a time is still a valid
 * row on the report.
 */
function EntryEditor({ entry, memberId, onClose, onChange }) {
  const [volumeML, setVolumeML] = useState(null);
  const [leakSize, setLeakSize] = useState(null);
  const [fluidType, setFluidType] = useState(null);
  const [urgencyLevel, setUrgencyLevel] = useState(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!entry) return;
    setVolumeML(entry.volumeML ?? null);
    setLeakSize(entry.leakSize ?? null);
    setFluidType(entry.fluidType ?? null);
    setUrgencyLevel(typeof entry.urgencyLevel === "number" ? entry.urgencyLevel : null);
    setNote(entry.note || "");
  }, [entry]);

  if (!entry) return null;
  const meta = DIARY_KIND[entry.kind];

  const save = async () => {
    try {
      await updateDiaryEntry(memberId, entry.id, {
        volumeML, leakSize, fluidType, urgencyLevel, note: note.trim() || null,
      });
      onChange?.();
    } catch {
      // The entry itself is still logged; only the optional detail is lost.
    }
    onClose();
  };

  const remove = async () => {
    try {
      await deleteDiaryEntry(memberId, entry.id);
      onChange?.();
    } catch {
      // Left where it was, and still visible in the timeline.
    }
    onClose();
  };

  return (
    <Sheet open onClose={onClose} title={meta?.buttonTitle || "Entry"}>
      <div className="pb-6">
        <p className="text-[13px] text-app-textSecondary">
          Logged at{" "}
          {entry.timestamp.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}.
          Everything below is optional.
        </p>

        {entry.kind === "fluid" && (
          <>
            <Fieldset legend="How much?">
              <div className="flex flex-wrap gap-2">
                {VOLUME_PRESETS.map((ml) => (
                  <Chip
                    key={ml}
                    on={volumeML === ml}
                    onClick={() => setVolumeML(volumeML === ml ? null : ml)}
                  >
                    {volumeLabel(ml)}
                  </Chip>
                ))}
              </div>
            </Fieldset>
            <Fieldset legend="What was it?">
              <div className="flex flex-wrap gap-2">
                {FLUID_TYPES.map((type) => (
                  <Chip
                    key={type.id}
                    on={fluidType === type.id}
                    onClick={() => setFluidType(fluidType === type.id ? null : type.id)}
                  >
                    {type.title}
                  </Chip>
                ))}
              </div>
            </Fieldset>
          </>
        )}

        {entry.kind === "leak" && (
          <Fieldset legend="How much came away?">
            <div className="space-y-2">
              {LEAK_SIZES.map((size) => (
                <Row2
                  key={size.id}
                  on={leakSize === size.id}
                  onClick={() => setLeakSize(leakSize === size.id ? null : size.id)}
                >
                  {size.title}
                </Row2>
              ))}
            </div>
          </Fieldset>
        )}

        {entry.kind !== "fluid" && (
          <Fieldset legend="How urgent was it?">
            <div className="space-y-2">
              {URGENCY_LEVELS.map((level) => (
                <Row2
                  key={level.value}
                  on={urgencyLevel === level.value}
                  onClick={() => setUrgencyLevel(urgencyLevel === level.value ? null : level.value)}
                >
                  {level.title}
                </Row2>
              ))}
            </div>
          </Fieldset>
        )}

        <Fieldset legend="Anything worth remembering?">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="On the way to the car…"
            className="h-12 w-full rounded-2xl border border-app-borderIdle bg-white px-4 text-[15px] text-app-textPrimary placeholder:text-app-textSecondary focus:border-ios-pink focus:outline-none"
          />
        </Fieldset>

        <div className="mt-5 space-y-2.5">
          <button
            type="button"
            onClick={save}
            className="h-12 w-full rounded-full bg-ios-pink text-[15px] font-bold text-white"
          >
            Save
          </button>
          <button
            type="button"
            onClick={remove}
            className="h-12 w-full rounded-full border border-app-borderIdle bg-white text-[15px] font-semibold text-app-primaryInk"
          >
            Delete this entry
          </button>
        </div>
      </div>
    </Sheet>
  );
}

function Fieldset({ legend, children }) {
  return (
    <fieldset className="mt-5">
      <legend className="mb-2 text-[13px] font-bold uppercase tracking-wider text-app-textSecondary">
        {legend}
      </legend>
      {children}
    </fieldset>
  );
}

function Chip({ on, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`h-10 rounded-full border px-3.5 text-[13.5px] font-medium ${
        on ? "border-ios-pink bg-ios-pink text-white" : "border-app-borderIdle bg-white text-app-textPrimary"
      }`}
    >
      {children}
    </button>
  );
}

function Row2({ on, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`flex w-full items-center rounded-[14px] border-2 px-4 py-3 text-left text-[14.5px] ${
        on ? "border-app-primary/70 bg-app-primary/10" : "border-app-borderIdle bg-white"
      } text-app-textPrimary`}
    >
      {children}
    </button>
  );
}

function dayTitle(day) {
  const today = startOfDay(new Date());
  const diff = Math.round((startOfDay(day) - today) / 86400000);
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  return day.toLocaleDateString(undefined, { month: "long", day: "numeric" });
}

function dayLabelForOffset(offset) {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  if (offset === 0) return "Today";
  return d.toLocaleDateString(undefined, { weekday: "short" });
}
