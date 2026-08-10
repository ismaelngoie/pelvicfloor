"use client";

// Coach Mia, ported from "Pelvic Floor/Scene/Main/Coach Mia/CoachMiaService.swift".
//
// Same Firebase project, same backend, same model, same system instruction,
// same 0.7 temperature, same 1024 token ceiling, same multi-turn history, and
// the same streamed reply. A member who asks on her phone and a member who asks
// in Chrome are talking to the same coach.
//
// TWO THINGS ARE DELIBERATELY DIFFERENT, AND BOTH ARE WRITTEN DOWN:
//
//   1. THE RED FLAG SCREEN RUNS LOCALLY FIRST. On iOS, Tier 1 of the safety
//      protocol lives only in the system instruction, so a member describing
//      bleeding still spends a network round trip before she is told to see
//      someone. Here lib/ai/safety.js catches the same vocabulary before the
//      request is made and answers with the exact sentence the instruction
//      tells Mia to say. Same words, no network, no chance of the model
//      talking itself out of it.
//
//   2. BILLING. The iOS directive says cancelling happens in App Store
//      settings, which is true on an iPhone and false in a browser: a web
//      member bought through Stripe and cancels in the You tab. Sending her to
//      an App Store subscription she does not have is how a cancellation
//      becomes a chargeback. The directive below covers both, and nothing else
//      in the persona changed.

import { generativeModel } from "./client";
import { isRedFlag, COACH_RED_FLAG_REPLY } from "./safety";
import { withoutLongDashes } from "./text";
// One source of truth for the support address, the same constant the You
// tab prints on its "Help and refunds" row.
import { CLAIM_EMAIL } from "@/lib/guaranteeCopy";

/** Same ceiling as the phone. The single biggest lever on cost per message. */
const MAX_OUTPUT_TOKENS = 1024;

/** Same window as ChatView.historyWindow on iOS. */
export const HISTORY_WINDOW = 30;

export { isRedFlag, COACH_RED_FLAG_REPLY };

/**
 * The persona. Ported line for line from CoachMiaService.systemPrompt(for:),
 * with the billing directive corrected for the web (see the header).
 *
 * @param {object} context
 * @param {string} context.name        her first name, or "" if we do not know it
 * @param {string} context.goal        display title, e.g. "Stop Bladder Leaks"
 * @param {number} context.streak      current streak in days
 * @param {string[]} context.todaysPlan exercise names, in order
 * @param {number} context.programDay  day number, 1 to 90
 * @param {string|null} context.weekTheme
 */
export function systemPrompt(context) {
  const todayPlan = context.todaysPlan?.length ? context.todaysPlan.join(", ") : "No plan assigned";
  const weekTheme = context.weekTheme || "Not started yet";
  const name = context.name || "there";

  return `You are Coach Mia™, a world-class, certified pelvic health physiotherapist and compassionate wellness coach. Your tone is ALWAYS warm, empathetic, supportive, and professional.

**CRITICAL DIRECTIVES:**
1.  **Continue the conversation naturally:** DO NOT re-introduce yourself or say "Hello" if a conversation is already in progress. Use the user's name (${name}) sparingly and naturally.
2.  **Follow the 3-Tier Safety Protocol:**
    - **TIER 1 (Red Flags):** If the user mentions **severe/sharp/sudden pain, bleeding, numbness, or other clear medical emergencies**, your ONLY response is to gently stop and guide them to a doctor. Say: "${COACH_RED_FLAG_REPLY}" DO NOT recommend any exercises.
    - **TIER 2 (Sensitive Conditions):** For conditions like pregnancy, answer helpfully first, then add a gentle disclaimer to check with a doctor.
    - **TIER 3 (General Questions):** For all other questions, answer directly and be helpful.

3.  **Today's Plan:** If the user asks for their plan today ("what's my plan", "today's workout", etc.), your response MUST follow this exact structure:
    1.  Start with a warm, encouraging sentence like, "Of course! Today's routine is tailored to your goal of ${context.goal}. We'll be doing:"
    2.  List the exercises provided in the <TODAY_PLAN> section. You MUST use the exact names from the list.
    3.  End with the exact phrase: **Recommendation:** Today's 5-Minute Routine

4.  **Billing Questions:** She is using the web app in a browser, so do not send her to App Store settings first. If she asks about her subscription, the price or how to cancel, tell her she can do it herself in the You tab of this app, under "Manage or cancel". Add that if she originally bought her plan in the App Store on an iPhone, Apple handles that billing, so it is cancelled in iPhone Settings, under her name, then Subscriptions. For a refund, or for the 90 day guarantee, send her to the You tab under "Help and refunds", which emails ${CLAIM_EMAIL}. Never invent a support page, a phone number, a chat queue or a team that does not exist: that email is the only way to reach a person.
5.  **End with Encouragement:** Always end on a positive, empowering note.

<USER_CONTEXT>
Name: ${name}
Primary Goal: ${context.goal}
Program Day: ${context.programDay} of 90
This Week's Theme: ${weekTheme}
Current Streak: ${context.streak} days
</USER_CONTEXT>

<TODAY_PLAN>
[${todayPlan}]
</TODAY_PLAN>`;
}

/**
 * Force the history to strictly alternate user, model, user, model.
 *
 * THIS IS NOT TIDINESS. IT IS WHAT STOPS ONE DROPPED REQUEST KILLING COACH MIA
 * FOR GOOD.
 *
 * `startChat` runs the SDK's validateChatHistory in its CONSTRUCTOR
 * (@firebase/ai, ChatSession), and that function throws
 * "Content with role 'user' can't follow 'user'" the moment two turns in a row
 * share a role. It throws SYNCHRONOUSLY, before a single byte goes to Google,
 * so the failure looks exactly like a dead network and the caller reports it as
 * one.
 *
 * A real transcript grows same-role runs constantly, and every one of them is
 * ordinary:
 *
 *   • Her question is written to Firestore before the reply is generated. If
 *     the reply then fails (a tunnel, a timeout, a 500), the transcript keeps
 *     an unanswered user turn. Two of those in the last 30 turns and every
 *     future question throws here instead of being asked.
 *   • The dashboard can reply twice in a row, which is two model turns.
 *   • A proactive message landing after one of Mia's replies is the same shape.
 *
 * Left unhandled, the member sees "Mia could not answer just now. It is usually
 * the connection, so trying again normally works." for ever, on a connection
 * that is fine, and Try again cannot clear it because it rebuilds the same
 * history. 98 percent of this traffic is a phone on mobile data.
 *
 * MERGED, NOT DROPPED. Adjacent same-role turns are joined into one Content
 * rather than thrown away, so nothing she said is lost and Mia still sees the
 * question she never got to answer. Blank-line joined, which is how the two
 * messages read on screen anyway.
 */
function alternating(turns) {
  const out = [];
  for (const turn of turns) {
    const previous = out[out.length - 1];
    if (previous && previous.role === turn.role) {
      previous.parts = [
        { text: `${previous.parts.map((p) => p.text).join("\n\n")}\n\n${turn.parts[0].text}` },
      ];
      continue;
    }
    out.push({ role: turn.role, parts: [...turn.parts] });
  }
  // sendMessageStream appends the new question as a user turn, so a history
  // that already ends on one would hand the validator the same clash from the
  // other side. Fold that last turn into the question's own turn instead by
  // leaving it out: it is the message immediately above the composer, and the
  // model still has every turn before it.
  if (out.length && out[out.length - 1].role === "user") out.pop();
  return out;
}

/**
 * Stream Coach Mia's reply.
 *
 * Yields text chunks in order, exactly like the AsyncThrowingStream the phone
 * consumes. The caller is responsible for allowing only one of these at a time.
 *
 * @param {object} params
 * @param {string} params.question the new question, NOT also present in history
 * @param {object} params.context  see systemPrompt
 * @param {Array<{role: string, text: string}>} params.history prior turns, oldest first
 * @returns {AsyncGenerator<string>}
 */
export async function* askCoach({ question, context, history = [] }) {
  const trimmed = String(question || "").trim();
  if (!trimmed) throw new Error("empty-question");

  const model = await generativeModel({
    generationConfig: { temperature: 0.7, maxOutputTokens: MAX_OUTPUT_TOKENS },
    systemInstruction: systemPrompt(context),
  });

  const turns = history
    .filter((message) => String(message?.text || "").trim())
    .slice(-HISTORY_WINDOW)
    .map((message) => ({
      role: message.role === "user" ? "user" : "model",
      parts: [{ text: message.text }],
    }));

  // Gemini rejects a history that opens on a model turn, which is exactly what
  // a transcript starting with one of Mia's proactive messages looks like.
  while (turns.length && turns[0].role === "model") turns.shift();

  const chat = model.startChat({ history: alternating(turns) });
  const result = await chat.sendMessageStream(trimmed);

  let received = false;
  for await (const chunk of result.stream) {
    let text = "";
    try {
      text = chunk.text();
    } catch {
      // A blocked or empty chunk. Keep reading: the stream may still finish.
      text = "";
    }
    if (!text) continue;
    received = true;
    yield text;
  }
  if (!received) throw new Error("empty-response");
}

/**
 * Split a reply into what she reads and whether the routine card is offered.
 *
 * Ported from ChatView.parseResponse(from:), which splits on "Recommendation:"
 * and treats "Today's 5-Minute Routine" as the request for the card. Two
 * additions:
 *
 *   • anything Mia wrote AFTER the recommendation line (her closing
 *     encouragement, usually) is kept and shown under the card instead of
 *     being thrown away;
 *   • the em dashes and en dashes this app's copy rules ban are stripped. A
 *     model reaches for them constantly ("your streak—take your time"), and a
 *     member reading one is reading something no human here would have
 *     written. Applied on the way out as well as on the way in, so a reply
 *     stored before this existed reads correctly too.
 */
export function parseCoachReply(raw) {
  const text = withoutLongDashes(raw || "");

  // Kept for admin and proactive messages, which have used this token.
  const token = /\[\[\s*START_ROUTINE\s*\]\]/i;
  if (token.test(text)) {
    return { body: text.replace(token, "").trim(), after: "", showsRoutine: true };
  }

  const match = text.match(/\*\*Recommendation:\*\*|Recommendation:/i);
  if (!match) return { body: text.trim(), after: "", showsRoutine: false };

  const start = match.index;
  const before = text.slice(0, start).trim();
  const rest = text.slice(start + match[0].length).trim();

  const line = rest.split("\n")[0] || "";
  // Curly apostrophes are what a model writes when it is being tidy, and
  // "Today’s" must match "Today's" or the card never appears.
  const flattened = line.toLowerCase().replace(/[‘’]/g, "'");
  if (!flattened.includes("today's 5-minute routine") && !flattened.includes("todays 5-minute routine")) {
    return { body: before, after: "", showsRoutine: false };
  }

  const after = rest.slice(line.length).trim();
  return {
    body: before || "Here is your plan for today:",
    after,
    showsRoutine: true,
  };
}
