"use client";

// One player, mounted once, opened from anywhere.
//
// Any tab calls openPlayer({ videos, startIndex, ... }) and gets the same
// component with the same rules. The provider owns the writes back to
// Firestore, so a day finished from the Coach Mia hand-off card counts exactly
// like a day finished from the Today tab.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import VideoPlayer from "./VideoPlayer";
import { useMember } from "./MemberProvider";
import { normalizePlaybackRequest } from "@/lib/playbackLedger";
import { memberIdentity, ownsMemberIdentity } from "@/lib/accountEpoch";

const PlayerContext = createContext(null);

export function usePlayer() {
  const value = useContext(PlayerContext);
  if (!value) throw new Error("usePlayer must be used inside <PlayerProvider>.");
  return value;
}

export function PlayerProvider({ children }) {
  const { user, member, authState, logVideoWatched, logDayComplete, toggleSaved, savedIds } = useMember();
  const [request, setRequest] = useState(null);
  const ownerIdentity = authState === "signedIn" ? memberIdentity(user?.uid, member?.id) : null;
  const ownerRef = useRef(ownerIdentity);
  ownerRef.current = ownerIdentity;
  const activeRequest = request && ownsMemberIdentity(request.ownerIdentity, ownerIdentity) ? request : null;
  useEffect(() => {
    if (ownerIdentity !== ownerRef.current) return;
    setRequest((current) => current && !ownsMemberIdentity(current.ownerIdentity, ownerIdentity) ? null : current);
  }, [ownerIdentity]);

  /**
   * @param {object}   options
   * @param {object[]} options.videos      catalog entries in playing order
   * @param {number}   [options.startIndex]
   * @param {string}   [options.title]
   * @param {string}   [options.subtitle]
   * @param {object}   [options.dayContext] { day } when this is a program day
   */
  const openPlayer = useCallback((options) => {
    if (!ownsMemberIdentity(ownerIdentity, ownerRef.current)) return;
    const request = normalizePlaybackRequest(options);
    if (request.videos.length) setRequest({ ...request, ownerIdentity });
  }, [ownerIdentity]);

  const closePlayer = useCallback(() => setRequest(null), []);

  const value = useMemo(() => ({ openPlayer, closePlayer, isOpen: Boolean(activeRequest) }), [
    openPlayer, closePlayer, activeRequest,
  ]);

  return (
    <PlayerContext.Provider value={value}>
      {children}
      {activeRequest && (
        <VideoPlayer
          key={`${request.title}-${request.startIndex}-${request.videos[0]?.id}`}
          videos={request.videos}
          startIndex={request.startIndex}
          title={request.title}
          subtitle={request.subtitle}
          dayContext={request.dayContext}
          prescriptionDay={request.prescriptionDay}
          playbackContext={request.playbackContext}
          savedIds={savedIds}
          onToggleSaved={(id) => ownsMemberIdentity(activeRequest.ownerIdentity, ownerRef.current) ? toggleSaved(id) : undefined}
          onVideoWatched={(event) => ownsMemberIdentity(activeRequest.ownerIdentity, ownerRef.current) ? logVideoWatched(event) : false}
          onDayComplete={(event) => ownsMemberIdentity(activeRequest.ownerIdentity, ownerRef.current) ? logDayComplete(event) : false}
          onClose={() => {
            if (ownsMemberIdentity(activeRequest.ownerIdentity, ownerRef.current)) setRequest((current) => current?.ownerIdentity === activeRequest.ownerIdentity ? null : current);
          }}
        />
      )}
    </PlayerContext.Provider>
  );
}
