// Async work keeps the account and member identity it started with. A switch
// invalidates its UI result even when the same UID signs in again later.
export function createAccountEpoch() {
  let uid = null;
  let authEpoch = 0;
  let memberId = null;
  let memberEpoch = 0;
  let profileEpoch = 0;
  return {
    get currentUID() { return uid; },
    get currentMemberId() { return memberId; },
    switchUser(nextUID) {
      const next = nextUID || null;
      if (next === uid) return false;
      uid = next;
      authEpoch += 1;
      profileEpoch += 1;
      memberId = null;
      memberEpoch += 1;
      return true;
    },
    bindMember(nextId) {
      if (memberId !== nextId) { memberId = nextId || null; memberEpoch += 1; }
    },
    captureAuth(requestedUID = uid) { return { uid: requestedUID, authEpoch }; },
    isCurrentAuth(scope) { return Boolean(scope && scope.uid === uid && scope.authEpoch === authEpoch); },
    beginProfileLoad(requestedUID = uid) {
      if (requestedUID !== uid) return { uid: requestedUID, authEpoch, profileEpoch: -1 };
      profileEpoch += 1;
      return { uid, authEpoch, profileEpoch };
    },
    isCurrentProfile(scope) {
      return Boolean(scope && scope.uid === uid && scope.authEpoch === authEpoch && scope.profileEpoch === profileEpoch);
    },
    captureMember(requestedId = memberId) { return { uid, authEpoch, memberId: requestedId, memberEpoch }; },
    isCurrentMember(scope) {
      return Boolean(scope && scope.uid === uid && scope.authEpoch === authEpoch
        && scope.memberId && scope.memberId === memberId && scope.memberEpoch === memberEpoch);
    },
  };
}

export function memberIdentity(uid, memberId) {
  return uid && memberId ? JSON.stringify([uid, memberId]) : null;
}

export function ownsMemberIdentity(captured, current) {
  return Boolean(captured && current && captured === current);
}
