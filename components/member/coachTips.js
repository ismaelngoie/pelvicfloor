// Coach tips, ported verbatim from the iOS app's
// Scene/Main/Today/Encouragement/CoachTipDeckView.swift.
//
// Ten per goal, cycled one at a time in a small gradient pill at the bottom of
// the Today tab, exactly as on the phone. The title is what she reads in the
// pill; the detail is what she gets when she taps it.
//
// Do not rewrite this copy here. It is the same copy a member reads on her
// phone, and the two have to stay word for word identical.

import {
  ArrowDownCircle, ArrowLeftRight, ArrowRight, ArrowUpDown, Award, Baby, Bandage,
  Bed, BedDouble, Brain, CalendarDays, CheckSquare, Clock, Crown, Droplet, Ear,
  Flame, Gift, Heart, Hourglass, HeartHandshake, Link2, Lock, MapPin, Moon,
  MousePointer2, Package, PauseCircle, Repeat, Ruler, Shield, Smartphone, Smile,
  Sparkles, Target, Triangle, Trophy, Unlock, Wind, XCircle, Zap, Layers, Leaf,
  Footprints, MessageCircle, Activity, BarChart3, Infinity as InfinityIcon,
} from "lucide-react";

/** Which deck a goal reads from. Mirrors iOS's substring match on the goal title. */
const DECK_FOR_GOAL = {
  bladderLeaks: "leaks",
  intimacy: "intimacy",
  postpartum: "postpartum",
  pregnancyPrep: "pregnancy",
  coreStrength: "strength",
  pelvicPain: "pain",
  fitness: "fitness",
  stability: "posture",
  diastasisRecti: "postpartum",
};

const DECKS = {
  leaks: [
    { id: "L1", Icon: Droplet, title: "Did You Know Hydration is Key to Control?", detail: "It sounds counterintuitive, but drinking enough water is crucial. When your urine is too concentrated, it can irritate your bladder and make leaks more likely. Aim for steady hydration throughout the day." },
    { id: "L2", Icon: Footprints, title: "Stand Tall to Reduce Pressure on Your Bladder", detail: "When you slouch, you put extra pressure on your pelvic organs. Try sitting and standing tall, with your ribs stacked over your hips. This gives your pelvic floor the space it needs to function correctly." },
    { id: "L3", Icon: Wind, title: "Unlock Your Deep Core With a Single Breath", detail: "A deep diaphragmatic breath (belly breath) allows your pelvic floor to relax and lengthen on the inhale. Practice this throughout the day to release tension that can contribute to leaks." },
    { id: "L4", Icon: Unlock, title: "Protect Your Pelvic Floor in the Bathroom", detail: "Pushing or straining when you use the bathroom can weaken your pelvic floor over time. Take your time, breathe, and let things happen naturally." },
    { id: "L5", Icon: XCircle, title: "Identify Your Personal Bladder Irritants", detail: "Common culprits like caffeine, alcohol, and spicy foods can make bladder issues worse for some people. Pay attention to see if certain foods trigger your symptoms." },
    { id: "L6", Icon: Clock, title: "Retrain Your Bladder by Waiting a Little Longer", detail: "Going to the bathroom just in case can train your bladder to hold less. Try to wait until your bladder feels full to help it regain its natural capacity." },
    { id: "L7", Icon: Activity, title: "Why High-Impact Exercise Can Be a Trigger", detail: "Activities like running or jumping can stress the pelvic floor. As you build strength here, you're improving your ability to handle that impact without leaks." },
    { id: "L8", Icon: Moon, title: "The Surprising Truth About Water Before Bed", detail: "Severely restricting water before sleep can lead to concentrated urine overnight, irritating the bladder. Instead, just reduce your intake an hour or two before you lie down." },
    { id: "L9", Icon: BarChart3, title: "A Bladder Diary Can Reveal Powerful Patterns", detail: "Track what you drink, when you go to the bathroom, and when leaks occur. This can reveal powerful patterns and help you understand your body better." },
    { id: "L10", Icon: CheckSquare, title: "Learn This Knack for Coughs & Sneezes", detail: "This involves consciously contracting your pelvic floor before you cough, sneeze, or lift something. It's like giving your muscles a heads-up to prepare for the pressure." },
  ],
  intimacy: [
    { id: "I1", Icon: Flame, title: "Stronger Muscles Can Lead to Stronger Sensations", detail: "Just like any other muscle, a well-exercised pelvic floor has better blood flow and nerve response, which are key components of arousal and orgasm." },
    { id: "I2", Icon: Unlock, title: "Build Confidence in Your Body for Better Intimacy", detail: "Feeling in control of your body lifts your confidence in intimate moments. The work you are doing here is a real step toward that." },
    { id: "I3", Icon: Brain, title: "Connect to Your Body to Deepen Pleasure", detail: "During your exercises, focus on the physical sensations. This practice, known as mindfulness, helps you become more attuned to your body's signals during intimacy." },
    { id: "I4", Icon: ArrowUpDown, title: "The Secret is Both Squeeze and Release", detail: "Intimacy requires muscles that can both contract and fully release. Our exercises train this full range of motion, which is crucial for comfort and pleasure." },
    { id: "I5", Icon: Wind, title: "Deep Breathing Can Calm Your Nervous System", detail: "If you ever feel anxious during intimacy, focusing on slow, deep belly breaths can help your body relax and become more receptive to pleasure." },
    { id: "I6", Icon: Link2, title: "How Hormonal Changes Affect Sexual Wellness", detail: "Life events like menopause or postpartum can impact desire and comfort. Pelvic floor exercises are a fantastic, non-hormonal way to support your sexual health through all life stages." },
    { id: "I7", Icon: Activity, title: "Boost Blood Flow for Increased Arousal", detail: "These exercises increase blood flow to the pelvic region, which is essential for lubrication, arousal, and overall tissue health. It's a natural boost for your body." },
    { id: "I8", Icon: MessageCircle, title: "Why Communication With a Partner is Key", detail: "Telling a partner what you are working on builds closeness and understanding, and that makes physical intimacy better too." },
    { id: "I9", Icon: HeartHandshake, title: "Curious About Coregasms? They're Real", detail: "Some people experience arousal or orgasm during core exercises. This happens because the same muscles are being activated. It's a normal sign that you're engaging your deep core correctly." },
    { id: "I10", Icon: Sparkles, title: "Appreciate Your Body's Capacity for Pleasure", detail: "This is about more than how your body works. It is about liking your body again. Every session is a small act of care." },
  ],
  postpartum: [
    { id: "P1", Icon: Hourglass, title: "Slow and Steady is the Fastest Way to Recover", detail: "Your body has been through a monumental event. Gentle, consistent activation is far more effective than pushing yourself too hard, too soon. Be patient and kind to yourself." },
    { id: "P2", Icon: BedDouble, title: "Rest Is Not a Luxury; It's a Requirement for Healing", detail: "Cellular repair and muscle recovery happen during rest. Prioritizing sleep, even in short bursts, is just as important as your daily exercises." },
    { id: "P3", Icon: Baby, title: "It Takes Time to Reconnect With Your New Body", detail: "It's normal to feel disconnected from your body after pregnancy and birth. These exercises are a wonderful way to gently re-establish that connection and appreciate all it has done." },
    { id: "P4", Icon: Bandage, title: "Be Mindful of Coning in Your Abdomen", detail: "If a ridge or dome pops up down the middle of your belly during an exercise, that is too much pressure. Make the move gentler until your deep core is stronger." },
    { id: "P5", Icon: Link2, title: "Reconnect Your Core Team for Full Recovery", detail: "The pelvic floor, diaphragm, and deep abdominals are all part of one team. Our exercises are designed to get them coordinating again, which is the key to true core recovery." },
    { id: "P6", Icon: Droplet, title: "Why Scar Tissue Needs Gentle Movement", detail: "If you had a C-section or tearing, gentle pelvic floor exercises can help promote healing and improve tissue mobility once you've been cleared by your doctor." },
    { id: "P7", Icon: MessageCircle, title: "Postpartum Recovery is Not No Pain, No Gain", detail: "Pain or pressure are signs to stop and modify. Gentle consistency is what builds lasting strength, not pushing through discomfort." },
    { id: "P8", Icon: ArrowDownCircle, title: "Don't Forget to Relax the Muscles, Too", detail: "Recovery after birth is as much about letting tension go as it is about getting stronger. Focus on the release at the end of each squeeze." },
    { id: "P9", Icon: CalendarDays, title: "True Healing Takes a Year or More", detail: "The 6-week checkup is just the beginning. True tissue and strength recovery is a much longer process. Celebrate your progress and don't rush the timeline." },
    { id: "P10", Icon: Heart, title: "Asking for Help is a Sign of Strength", detail: "Recovering from childbirth is a major undertaking. Asking for support with the baby so you can have 5 minutes for yourself and your exercises is a sign of strength, not weakness." },
  ],
  pregnancy: [
    { id: "PR1", Icon: Shield, title: "You're Building a Strong Support System for Your Baby", detail: "A strong pelvic floor and core act as a supportive hammock for your growing baby, which can help reduce back pain and pressure during pregnancy." },
    { id: "PR2", Icon: Shield, title: "Prepare Your Body for an Easier Labor and Delivery", detail: "Learning to both contract and relax your pelvic floor can be beneficial during childbirth. You are training your muscles for the big day." },
    { id: "PR3", Icon: Repeat, title: "The Work You Do Now Helps Postpartum Recovery", detail: "The work you do now makes a real difference in how your body bounces back after delivery. You're giving your future self a wonderful gift." },
    { id: "PR4", Icon: MessageCircle, title: "Always Listen to Your Body and Your Doctor", detail: "Pregnancy changes your body every day. If something does not feel right, stop and rest. Always check your exercise plan with your doctor or midwife." },
    { id: "PR5", Icon: Wind, title: "Connect With Your Baby Through a Simple Breath", detail: "Take a moment during your breathing exercises to focus on the life you're growing. It's a beautiful way to bond while doing something healthy for both of you." },
    { id: "PR6", Icon: Bandage, title: "Avoid Exercises That Cause Abdominal Coning", detail: "As your belly grows, avoid traditional crunches or any move that causes a bulge down the midline of your abdomen. Stick to deep core activation." },
    { id: "PR7", Icon: ArrowDownCircle, title: "The Hormone That Makes You Flexible (And How to Stay Safe)", detail: "Your body produces a hormone called relaxin to prepare for birth, which loosens ligaments. Be careful not to overstretch during your exercises." },
    { id: "PR8", Icon: Triangle, title: "Improve Your Balance as Your Body Changes", detail: "As your center of gravity shifts, focus on exercises that improve stability. This can help prevent falls and make you feel more secure in your body." },
    { id: "PR9", Icon: InfinityIcon, title: "Preventing Future Issues Starts Now", detail: "Keeping your pelvic floor strong during pregnancy is one of the best ways to avoid leaks and a heavy, dropping feeling after birth." },
    { id: "PR10", Icon: Heart, title: "This Daily Practice is a Profound Act of Self-Care", detail: "Taking a few minutes each day to connect with and care for your changing body is incredibly beneficial for both your physical and mental well-being during pregnancy." },
  ],
  strength: [
    { id: "S1", Icon: Zap, title: "True Power and Strength Come From the Core", detail: "A strong pelvic floor and a strong deep tummy muscle are the base of all your strength. Every powerful move starts there." },
    { id: "S2", Icon: Shield, title: "A Strong Core is the Best Way to Protect Your Back", detail: "Many instances of lower back pain are caused by a weak core. By strengthening these muscles, you are creating a natural brace that supports and protects your spine." },
    { id: "S3", Icon: Flame, title: "A Pro Tip: Engage, Don't Just Squeeze", detail: "Think of gently lifting your pelvic floor, like an elevator going up one floor, rather than just clenching. It's a subtle but powerful difference in activation." },
    { id: "S4", Icon: Link2, title: "Connect Your Core to Your Glutes for More Power", detail: "Your core and glutes work as a team. Activating your glutes in exercises like bridges and squats helps to properly position and support your pelvis, enhancing core strength." },
    { id: "S5", Icon: Clock, title: "Focus on Control, Not Speed, for Better Results", detail: "Slower, more controlled movements are far more effective for building deep core strength than fast, jerky reps. Focus on quality over quantity." },
    { id: "S6", Icon: Layers, title: "Visualize Your Core as a Strong Canister", detail: "Your diaphragm is the top, your pelvic floor is the bottom, and your deep abs and back muscles are the sides. A strong canister works together to manage pressure." },
    { id: "S7", Icon: ArrowLeftRight, title: "Remember to Exhale on the Hardest Part of the Move", detail: "Breathe out during the hardest part of the exercise. This helps engage your deep core muscles and manage internal pressure, protecting your pelvic floor." },
    { id: "S8", Icon: Target, title: "It's About So Much More Than a Six-Pack", detail: "Real core strength lives in the deep muscles you cannot see, the corset muscle and the pelvic floor. That is exactly what you are training here." },
    { id: "S9", Icon: Zap, title: "This Strength Will Translate to Everyday Life", detail: "From lifting groceries to lifting weights at the gym, the stable base you're building here makes every other movement safer and more powerful." },
    { id: "S10", Icon: Crown, title: "A Strong Core Builds a Confident You", detail: "There's a reason we talk about core confidence. Feeling strong and stable from your center radiates outward, affecting how you carry yourself every day." },
  ],
  pain: [
    { id: "PN1", Icon: Sparkles, title: "Relaxation is Just as Important as Strength", detail: "Pelvic pain often comes from muscles that are too tight. Our exercises teach you to not only contract but also fully release and lengthen these muscles, which is key to finding relief." },
    { id: "PN2", Icon: MapPin, title: "Pain Isn't Always Where the Problem Is", detail: "Tightness in your hips, glutes, or even your back can refer pain to the pelvic region. That's why we focus on releasing and strengthening the entire area." },
    { id: "PN3", Icon: Wind, title: "Are You Unconsciously Holding Tension in Your Belly?", detail: "Many people constantly suck in their stomach, which creates downward pressure and tension. Practice letting your belly be soft and relaxed, especially when you breathe." },
    { id: "PN4", Icon: PauseCircle, title: "A Quick Tip for Anyone Who Sits a Lot", detail: "Prolonged sitting can shorten your hip flexors and put pressure on your pelvic floor. Try to stand up and stretch for a minute or two every half hour." },
    { id: "PN5", Icon: Bed, title: "Improve Your Sleep with This Simple Trick", detail: "If you're a side sleeper, placing a pillow between your knees can help keep your pelvis in a more neutral alignment, reducing strain overnight." },
    { id: "PN6", Icon: Droplet, title: "A Warm Bath Can Be a Powerful Tool for Relief", detail: "A warm bath or a heating pad placed on your lower abdomen or lower back can help relax tight, painful muscles before or after your exercises." },
    { id: "PN7", Icon: Heart, title: "Be Gentle and Patient With Your Body", detail: "Healing from long-lasting pain is not a straight line. There will be good days and bad days. The goal is steady, gentle care, never pushing through pain." },
    { id: "PN8", Icon: Ear, title: "Listen Closely to Your Body's Unique Signals", detail: "Pay attention to what activities or positions make your pain better or worse. This awareness is a powerful tool for managing your symptoms day-to-day." },
    { id: "PN9", Icon: ArrowDownCircle, title: "Check In: Are You Clenching Your Pelvic Floor Now?", detail: "Throughout the day, check in with yourself. Are you clenching your jaw? Your glutes? Your pelvic floor? Consciously think about letting go and releasing that tension." },
    { id: "PN10", Icon: ArrowRight, title: "Healing Takes Time, and That Is Fine", detail: "It took time for this tension to build up, so it takes time to let it go. Celebrate every small step toward a more comfortable life." },
  ],
  fitness: [
    { id: "FT1", Icon: Trophy, title: "A Strong Core Elevates All Your Other Training", detail: "Whether you run, lift, or do yoga, a stable core and pelvic floor will improve your form, increase your power, and reduce your risk of injury." },
    { id: "FT2", Icon: Footprints, title: "Improve Your Running Form With a Stable Pelvis", detail: "Leaks or pain while running are common signs of a weak core system. By strengthening your foundation, you create a more efficient and powerful running form." },
    { id: "FT3", Icon: MousePointer2, title: "Learn to Transfer Power More Efficiently", detail: "Your core is the bridge between your upper and lower body. A strong, stable core allows you to transfer force effectively, whether you're swinging a kettlebell or a tennis racket." },
    { id: "FT4", Icon: Shield, title: "Build Your Body's Natural Weightlifting Belt", detail: "The deep core muscles, including the pelvic floor, act as a natural corset that stabilizes your spine during heavy lifts. This is how you lift safer and stronger." },
    { id: "FT5", Icon: Wind, title: "Did You Know Better Breathing Equals Better Performance?", detail: "Proper core training improves the function of your diaphragm. A more efficient diaphragm means better oxygen intake and improved endurance during cardio." },
    { id: "FT6", Icon: Zap, title: "This Training Can Help You Unlock Your Athletic Potential", detail: "Many athletes hit a plateau because of a weak or uncoordinated core. This work might be the missing link you need to reach the next level in your sport." },
    { id: "FT7", Icon: ArrowDownCircle, title: "A Balanced Core Can Even Improve Flexibility", detail: "When your deep core muscles are doing their job correctly, larger muscles like your hamstrings and hip flexors don't have to overwork to provide stability, which can improve your overall mobility." },
    { id: "FT8", Icon: Repeat, title: "A Surprising Benefit: Improved Recovery Time", detail: "A well-functioning core with good blood flow can help you recover faster between intense workouts by efficiently clearing metabolic waste." },
    { id: "FT9", Icon: Target, title: "All Precision and Balance Starts at Your Center", detail: "For sports that require precision and balance, like golf or yoga, a stable pelvis is non-negotiable. The stability you build here will show up in your game." },
    { id: "FT10", Icon: Flame, title: "Think of This as Your Performance Foundation", detail: "You can't build a strong house on a weak foundation. The 5 minutes you spend here is one of the highest-return investments you can make in your overall fitness." },
  ],
  posture: [
    { id: "PO1", Icon: Footprints, title: "Great Posture Starts From the Ground Up", detail: "Your pelvic floor is the foundation of your torso. By strengthening it, you're building the base that allows your spine to align naturally and effortlessly." },
    { id: "PO2", Icon: Triangle, title: "Visualize Your Core Like a Stable Mountain", detail: "A strong, engaged core provides the stability your spine needs to stay in a healthy alignment, reducing strain and preventing pain." },
    { id: "PO3", Icon: Ruler, title: "A Simple Trick: Stack Your Joints for Better Alignment", detail: "Try to align your ears over your shoulders, your shoulders over your ribs, and your ribs over your hips. This is the natural, efficient posture your body craves." },
    { id: "PO4", Icon: Package, title: "Quick Posture Check: How Are You Sitting Right Now?", detail: "Try to sit with both feet on the floor, without crossing your legs, and with a small curve in your lower back. This simple adjustment can make a huge difference over time." },
    { id: "PO5", Icon: Smartphone, title: "A Modern Problem: Be Mindful of Text Neck", detail: "Looking down at your phone puts a tremendous amount of strain on your neck and upper back. Try to bring your phone up to eye level more often." },
    { id: "PO6", Icon: ArrowUpDown, title: "Try This Mental Cue: Imagine a String Pulling You Up", detail: "A great cue for good posture is to imagine a string attached to the crown of your head, gently pulling you upward and elongating your spine." },
    { id: "PO7", Icon: Wind, title: "Why a Relaxed Belly Actually Supports Good Posture", detail: "Constantly holding your stomach in can disrupt your breathing patterns and create tension. A strong but relaxed core allows for a more natural and sustainable posture." },
    { id: "PO8", Icon: Package, title: "Protect Your Back by Lifting With Your Legs", detail: "When you lift something, hinge at your hips and bend your knees. Engage your core before you lift. This protects your back and reinforces good movement patterns." },
    { id: "PO9", Icon: Repeat, title: "Good Posture is a Dynamic Habit, Not a Rigid Pose", detail: "Nobody holds perfect posture all day. The goal is to build the strength and awareness to return to a good alignment easily and often. It's a practice, not a permanent state." },
    { id: "PO10", Icon: Sparkles, title: "Did You Know Good Posture Radiates Confidence?", detail: "Standing tall not only is better for your body, but it also sends a powerful message to your brain and to others that you are confident and present." },
  ],
  fallback: [
    { id: "FB1", Icon: Zap, title: "Remember: Consistency is Your True Superpower", detail: "It's not about one perfect workout. It's about showing up consistently, even for just a few minutes. Small, regular efforts compound into massive results over time." },
    { id: "FB2", Icon: BarChart3, title: "A Little Progress Each Day Adds Up to Big Results", detail: "Don't underestimate the power of today's session. Each time you complete your routine, you're laying another brick in a strong foundation for lifelong health." },
    { id: "FB3", Icon: Leaf, title: "Nurture Your Foundation, and the Rest Will Grow", detail: "Think of your core and pelvic floor as the roots of a tree. The stronger they are, the more stable and powerful the rest of your body becomes." },
    { id: "FB4", Icon: Smile, title: "Don't Forget to Celebrate the Small Wins", detail: "Did you hold a pose longer today? Did you feel a stronger connection to your muscles? Acknowledge and celebrate these small victories. They are the building blocks of success." },
    { id: "FB5", Icon: Moon, title: "Your Muscles Get Stronger While You Recover", detail: "Your muscles get stronger when they rest and repair. Make sure you're getting enough quality sleep to reap the full benefits of your hard work." },
    { id: "FB6", Icon: Droplet, title: "A Quick Tip: Stay Hydrated for Better Muscle Health", detail: "Water is essential for muscle function, nutrient transport, and flushing out toxins. Proper hydration can help reduce muscle soreness and improve performance." },
    { id: "FB7", Icon: Ear, title: "The Most Important Rule: Listen to Your Body", detail: "Some days you'll feel strong, and other days you'll need to be gentle. Honoring your body's signals is the key to sustainable, long-term progress." },
    { id: "FB8", Icon: Brain, title: "Focus on the Mind-Muscle Connection for Best Results", detail: "Don't just go through the motions. Actively think about the muscles you are trying to engage. This focus dramatically increases the effectiveness of each exercise." },
    { id: "FB9", Icon: Hourglass, title: "A Gentle Reminder to Be Patient", detail: "Real strength takes time to build. Keep showing up and the results follow. You are on the right path." },
    { id: "FB10", Icon: Gift, title: "This Daily Practice is a Powerful Gift to Yourself", detail: "Taking these few minutes each day is a powerful act of self-care. It's an investment in your current well-being and your future health." },
  ],
};

/** The deck for a goal, falling back the way iOS does when nothing matches. */
export function coachTipsFor(goalId) {
  return DECKS[DECK_FOR_GOAL[goalId] || "fallback"] || DECKS.fallback;
}

/** The rotating icon set is unused elsewhere; exported for tests and previews. */
export { DECKS as COACH_TIP_DECKS, Award };
