"use client";

// One player, mounted once, opened from anywhere.
//
// Any tab calls openPlayer({ videos, startIndex, ... }) and gets the same
// component with the same rules. The provider owns the writes back to
// Firestore, so a day finished from the Coach Mia hand-off card counts exactly
// like a day finished from the Today tab.

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import VideoPlayer from "./VideoPlayer";
import { useMember } from "./MemberProvider";

const PlayerContext = createContext(null);

export function usePlayer() {
  const value = useContext(PlayerContext);
  if (!value) throw new Error("usePlayer must be used inside <PlayerProvider>.");
  return value;
}

export function PlayerProvider({ children }) {
  const { logVideoWatched, logDayComplete, toggleSaved, savedIds } = useMember();
  const [request, setRequest] = useState(null);

  /**
   * @param {object}   options
   * @param {object[]} options.videos      catalog entries in playing order
   * @param {number}   [options.startIndex]
   * @param {string}   [options.title]
   * @param {string}   [options.subtitle]
   * @param {object}   [options.dayContext] { day } when this is a program day
   */
  const openPlayer = useCallback((options) => {
    const videos = (options?.videos || []).filter(Boolean);
    if (!videos.length) return;
    setRequest({
      videos,
      startIndex: Math.min(Math.max(options.startIndex || 0, 0), videos.length - 1),
      title: options.title || "Your session",
      subtitle: options.subtitle || "",
      dayContext: options.dayContext || null,
    });
  }, []);

  const closePlayer = useCallback(() => setRequest(null), []);

  const value = useMemo(() => ({ openPlayer, closePlayer, isOpen: Boolean(request) }), [
    openPlayer, closePlayer, request,
  ]);

  return (
    <PlayerContext.Provider value={value}>
      {children}
      {request && (
        <VideoPlayer
          key={`${request.title}-${request.startIndex}-${request.videos[0]?.id}`}
          videos={request.videos}
          startIndex={request.startIndex}
          title={request.title}
          subtitle={request.subtitle}
          dayContext={request.dayContext}
          savedIds={savedIds}
          onToggleSaved={toggleSaved}
          onVideoWatched={logVideoWatched}
          onDayComplete={logDayComplete}
          onClose={closePlayer}
        />
      )}
    </PlayerContext.Provider>
  );
}
