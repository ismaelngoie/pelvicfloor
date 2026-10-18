// Native ProactiveChatManager messages, queued per member and delivered in order on opening chat.
const DECKS = {
  "intimacy": [
    "Great work on '{workoutTitle}'! I'm curious, which of those movements helped you feel the most connected to your body?",
    "That was a powerful session. Building these muscles is the key to more fulfilling orgasms. How did you feel during that last exercise?",
    "Your consistency is inspiring! What's one thing you're learning about your body's potential for pleasure?",
    "Incredible focus today. Confidence is the ultimate aphrodisiac, and you're building it from the inside out. Did any of today's movements feel particularly empowering?"
  ],
  "mensIntimacy": [
    "Great work on '{workoutTitle}'. Which movement gave you the clearest sense of pelvic control today?",
    "That session trained release, strength, and timing together. Did any movement feel easier to control than before?",
    "You showed up for your confidence today. How relaxed did your pelvic area feel by the final exercise?",
    "Precise control matters more than squeezing harder. Which exercise gave you the best mind-muscle connection?"
  ],
  "bladderLeaks": [
    "Fantastic session! What's one daily activity (like laughing or sneezing) you're looking forward to doing with total confidence?",
    "Great consistency on '{workoutTitle}'! During that last exercise, could you feel the difference between just squeezing and truly *lifting* your pelvic floor?",
    "Wonderful job! Is the mind-muscle connection to your deep core feeling more automatic this week?",
    "You're building a truly reliable support system for your body. How confident were you feeling during today's more challenging movements?"
  ],
  "postpartum": [
    "Wonderful job being so gentle with your recovery today. Which movement during '{workoutTitle}' felt the most nourishing for your body?",
    "That was a great session. Were you able to feel that deep, gentle 'hugging' sensation in your tummy as you exhaled?",
    "You're doing amazing, and your {streak}-day streak shows it! How are you feeling emotionally today? Remember this journey is for you.",
    "It takes so much courage to prioritize your healing. After today's session, do you feel a little more 'at home' in your body?"
  ],
  "pelvicPain": [
    "That was a wonderful session focused on creating ease. Was there a particular stretch today that helped you feel a sense of release?",
    "You're doing amazing work by listening to your body. How are you feeling right now compared to before the workout?",
    "Every gentle movement is a message of safety to your nervous system. What's one word you'd use to describe how your core feels right now?"
  ],
  "pregnancyPrep": [
    "Beautiful work on '{workoutTitle}'! Every session is preparing your body to carry and support new life. How did your core feel today?",
    "You're building such a strong foundation for pregnancy. Could you feel that deep connection between your breath and your pelvic floor today?",
    "Wonderful session! A strong, flexible pelvic floor is one of the greatest gifts you can give your future self. How is your body feeling right now?",
    "Your consistency is amazing! Preparing your body now means a smoother journey ahead. What part of today's session felt the most empowering?"
  ],
  "diastasisRecti": [
    "Gentle, focused work like today's '{workoutTitle}' is exactly how the deep core heals. Could you feel that wrapping, corset-like engagement in your tummy?",
    "Beautiful session! Healing diastasis is all about reconnection, not force. Did you notice your breath and deep core working together today?",
    "You're doing this exactly right: slow, consistent, and kind to your body. How does your midline feel after today's session?",
    "Every session knits your core back together a little more. What felt different or stronger for you today?"
  ],
  "prolapse": [
    "Great work on '{workoutTitle}'. Did you notice less downward pressure when you matched the lift to your exhale?",
    "Today's gentle support work should never feel like straining. How supported does your pelvic area feel now?",
    "You trained support for real daily movement today. Which exercise felt most useful for standing or lifting?",
    "Precise lift and full release work together. Could you feel both parts today?"
  ],
  "prostateRecovery": [
    "Great recovery work on '{workoutTitle}'. Which exercise gave you the clearest sense of bladder control?",
    "Quality matters more than force during recovery. Could you lift gently without tightening your stomach or holding your breath?",
    "Every precise session helps rebuild confidence. Have you noticed any change in leaks or after-urination drips?",
    "You trained control for real daily movement today. How did walking or standing feel after the session?"
  ],
  "bowelControl": [
    "Great work on '{workoutTitle}'. Did control or release feel clearer by the final exercise?",
    "Bowel control depends on coordination, not constant squeezing. Could you fully relax between repetitions?",
    "You practiced staying in control without straining today. How does your pelvic area feel now?",
    "Consistent practice can make urgency feel more manageable. Which exercise felt most useful today?"
  ],
  "coreStrength": [
    "Powerful session today! Could you feel how '{workoutTitle}' challenged your deep stabilizers? That's the foundation of true strength.",
    "That's a {streak}-day streak. Your consistency is building a rock-solid core. What's one exercise you're finding easier now?",
    "Great job! What was one moment during that workout where you felt particularly strong and stable?",
    "Awesome work today! A strong core is the secret to better posture. How tall and confident are you feeling right now?"
  ],
  "fitness": [
    "Powerful session today! Could you feel how '{workoutTitle}' challenged your deep stabilizers? That's the foundation of true strength.",
    "That's a {streak}-day streak. Your consistency is building a rock-solid core. What's one exercise you're finding easier now?",
    "Great job! What was one moment during that workout where you felt particularly strong and stable?",
    "Awesome work today! A strong core is the secret to better posture. How tall and confident are you feeling right now?"
  ],
  "stability": [
    "Powerful session today! Could you feel how '{workoutTitle}' challenged your deep stabilizers? That's the foundation of true strength.",
    "That's a {streak}-day streak. Your consistency is building a rock-solid core. What's one exercise you're finding easier now?",
    "Great job! What was one moment during that workout where you felt particularly strong and stable?",
    "Awesome work today! A strong core is the secret to better posture. How tall and confident are you feeling right now?"
  ]
};
const keyFor = (memberId) => `pelvi.pendingCoachMessages.v2.${encodeURIComponent(memberId || "local")}`;
function readQueue(memberId) {
  try { const value = JSON.parse(window.localStorage.getItem(keyFor(memberId)) || "[]"); return Array.isArray(value) ? value : []; } catch { return []; }
}
export function postWorkoutMessage({ goalId, pathway, programDay: day, workoutTitle = "your workout", streak = 0, random = Math.random }) {
  if (day === 1) return `You took the first step on '${workoutTitle}' today! That's often the hardest part, and you did it. How is your body feeling right now?`;
  if (day === 7) return "You just completed Day 7! That is a massive achievement. What's the biggest change you've noticed in your body this week?";
  if (day === 30) return "Day 30! A full month of showing up for your body. The changes you're building now run deep. How are you feeling compared to when you started?";
  if (day === 60) return "Sixty days. You're two-thirds of the way through your program, and your consistency has been remarkable. What feels different in your everyday life now?";
  if (day === 90) return "Day 90. You did it! You've completed your full program, and I am SO proud of you. Take a moment to honor how far you've come. What's the biggest change you've noticed?";
  if (day > 0 && day % 7 === 0) return `That's week ${day / 7} complete! Every week you finish, your foundation grows stronger. How did this week's sessions feel compared to last week's?`;
  if (streak === 3) return "That's three sessions in a row. You're building a rhythm your body can recognize. How are you feeling?";
  if (streak === 7) return "An entire week of consistency! That's incredible. You've given your body a huge gift this week. What's been the most surprising discovery for you?";
  if (streak === 21) return "Twenty-one days of showing up for yourself. That's real consistency, and one missed day could never erase it. How does that feel?";
  const deck = DECKS[goalId === "intimacy" && pathway === "mensPelvicHealth" ? "mensIntimacy" : goalId] || DECKS.coreStrength;
  return (deck[Math.min(deck.length - 1, Math.max(0, Math.floor(random() * deck.length)))] || "You crushed it! That was a great session. How is your body feeling right now compared to when you started?")
    .replaceAll("{workoutTitle}", workoutTitle).replaceAll("{streak}", String(streak));
}
export function queuePostWorkout(context) {
  if (!context.memberId) return;
  const queue = readQueue(context.memberId);
  const date = new Date().toISOString();
  const dedupe = `${context.goalId}:${context.programDay}:${date.slice(0, 10)}`;
  if (queue.some((item) => item.dedupe === dedupe)) return;
  queue.push({ id: `proactive_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`, dedupe, text: postWorkoutMessage(context), date });
  try { window.localStorage.setItem(keyFor(context.memberId), JSON.stringify(queue.slice(-60))); window.dispatchEvent(new Event("pelvi:coach-queue")); } catch { /* A reminder must never prevent a completed session from saving. */ }
}
export function pendingCoachMessages(memberId) { return readQueue(memberId); }
export function acknowledgeCoachMessage(memberId, id) {
  try { window.localStorage.setItem(keyFor(memberId), JSON.stringify(readQueue(memberId).filter((item) => item.id !== id))); } catch { /* Retry the same stable message id on the next visit. */ }
}
