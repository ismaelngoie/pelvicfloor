// utils/dailyLogic.js
import { GOAL_PATHWAYS, GENERAL_LOOP, formatLoopVideos } from '@/app/data/videoData';

// --- TITLES DATABASE (Matches Swift Challenge Providers) ---
const DAY_TITLES = {
  "Improve Intimacy": [
    "Awaken Sensation",
    "Release for Pleasure",
    "Orgasmic Strength",
    "Rhythm & Connection",
    "Flexible Positions",
    "Sexual Endurance",
    "Total Control"
  ],
  "Stop Bladder Leaks": [
    "Activate Control",
    "Build Support",
    "Leak-Proof Power",
    "All-Day Endurance",
    "Control in Motion",
    "Everyday Strength",
    "Total Confidence"
  ],
  "Recover Postpartum": [
    "Heal Your Core",
    "Soothe New Mom Aches",
    "Close The Gap",
    "Reclaim Your Balance",
    "Support Your Pelvis",
    "Strength for Motherhood",
    "Strong & Capable"
  ],
  "Prepare for Pregnancy": [
    "Core Connection",
    "Prepare for Load",
    "Strong Core Foundation",
    "Pelvic Stability",
    "Glute Power",
    "Functional Movement",
    "Body Confidence"
  ],
  "Ease Pelvic Pain": [
    "The Gentle Release",
    "Unlock Your Hips",
    "Free Your Spine",
    "The Supportive Core",
    "Build Your Anchor",
    "Pain-Free Flow",
    "Confident Comfort"
  ],
  "Build Core Strength": [
    "Activate Deep Core",
    "Rotational Power",
    "The Stability Test",
    "Full Body Integration",
    "The Endurance Burn",
    "The Power Circuit",
    "Ultimate Stability"
  ]
};

export const getDailyPlaylist = (userGoal, joinDateString) => {
    // 1. Calculate Day Index (0-based)
    const today = new Date();
    // Use the join date, or default to today if missing (Day 0)
    const joinDate = joinDateString ? new Date(joinDateString) : new Date();
    
    // Normalize time to midnight to ensure accurate day counting
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const joinMidnight = new Date(joinDate.getFullYear(), joinDate.getMonth(), joinDate.getDate());

    const diffTime = Math.abs(todayMidnight - joinMidnight);
    const dayIndex = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // 2. Normalize User Goal to a Valid Key
    let goalKey = "Build Core Strength"; // Default fallback
    const g = (userGoal || "").toLowerCase();

    if (g.includes("intimacy") || g.includes("sexual")) {
        goalKey = "Improve Intimacy";
    } else if (g.includes("leak") || g.includes("bladder")) {
        goalKey = "Stop Bladder Leaks";
    } else if (g.includes("postpartum") || g.includes("recover")) {
        goalKey = "Recover Postpartum";
    } else if (g.includes("pregnancy") || g.includes("prepare")) {
        goalKey = "Prepare for Pregnancy";
    } else if (g.includes("pain") || g.includes("discomfort")) {
        goalKey = "Ease Pelvic Pain";
    } else if (g.includes("strength") || g.includes("fitness") || g.includes("stability") || g.includes("posture")) {
        // All fitness/strength variants map to the Core Challenge
        goalKey = "Build Core Strength";
    }

    // --- PHASE 1: THE FIRST 7 DAYS (Goal Specific Challenge) ---
    if (dayIndex < 7) {
        // Retrieve the specific plan for this goal
        const goalPlan = GOAL_PATHWAYS[goalKey] || GOAL_PATHWAYS["Build Core Strength"];
        
        // Safety check: Ensure we have videos for this day
        const safeDayIndex = dayIndex % goalPlan.length;
        const todaysVideos = goalPlan[safeDayIndex];

        // Retrieve the specific title for this day
        const titlesList = DAY_TITLES[goalKey] || DAY_TITLES["Build Core Strength"];
        const dayTitle = titlesList[safeDayIndex] || "Daily Routine";

        return {
            title: `Day ${dayIndex + 1}: ${dayTitle}`,
            videos: todaysVideos || [],
            isChallenge: true,
            dayNumber: dayIndex + 1
        };
    }

    // --- PHASE 2: THE 16-DAY LOOP (General Maintenance) ---
    // Subtract the first 7 days, then modulo 16 to loop forever
    const loopIndex = (dayIndex - 7) % 16;
    
    // Retrieve videos from general loop
    const rawUrls = GENERAL_LOOP[loopIndex] || GENERAL_LOOP[0];
    
    return {
        title: "Daily Maintenance Routine",
        videos: formatLoopVideos(rawUrls),
        isChallenge: false,
        dayNumber: loopIndex + 1 // Display 1-16 for loop days
    };
};
