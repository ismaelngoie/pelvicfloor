// A private, bounded answer archive matching native CoachAnswerStore; scoped to the member.
const keyFor = (memberId) => `pelvi.savedCoachAnswers.v1.${encodeURIComponent(memberId || "local")}`;
export function savedCoachAnswers(memberId) {
  try {
    const list = JSON.parse(window.localStorage.getItem(keyFor(memberId)) || "[]");
    return Array.isArray(list) ? list.filter((item) => item?.id && typeof item.text === "string").slice(0, 100) : [];
  } catch { return []; }
}
export function toggleCoachAnswer(memberId, message, goalId) {
  const previous = savedCoachAnswers(memberId);
  const exists = previous.some((item) => item.id === message.id);
  const next = exists ? previous.filter((item) => item.id !== message.id) : [{ id: message.id, text: message.text, goal: goalId, savedAt: new Date().toISOString(), messageDate: message.date?.toDate?.()?.toISOString() || new Date(message.date || Date.now()).toISOString() }, ...previous].slice(0, 100);
  try { window.localStorage.setItem(keyFor(memberId), JSON.stringify(next)); } catch { return previous; }
  return next;
}
