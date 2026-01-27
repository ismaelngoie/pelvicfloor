// utils/dailyLogic.js
import { GOAL_PATHWAYS, GENERAL_LOOP, formatLoopVideos } from '@/app/data/videoData';

// --- TITLES DATABASE ---
const DAY_TITLES = {
  "Improve Intimacy": [
    "Awaken Sensation", "Release for Pleasure", "Orgasmic Strength", "Rhythm & Connection", 
    "Flexible Positions", "Sexual Endurance", "Total Control"
  ],
  "Stop Bladder Leaks": [
    "Activate Control", "Build Support", "Leak-Proof Power", "All-Day Endurance", 
    "Control in Motion", "Everyday Strength", "Total Confidence"
  ],
  "Recover Postpartum": [
    "Heal Your Core", "Soothe New Mom Aches", "Close The Gap", "Reclaim Your Balance", 
    "Support Your Pelvis", "Strength for Motherhood", "Strong & Capable"
  ],
  "Prepare for Pregnancy": [
    "Core Connection", "Prepare for Load", "Strong Core Foundation", "Pelvic Stability", 
    "Glute Power", "Functional Movement", "Body Confidence"
  ],
  "Ease Pelvic Pain": [
    "The Gentle Release", "Unlock Your Hips", "Free Your Spine", "The Supportive Core", 
    "Build Your Anchor", "Pain-Free Flow", "Confident Comfort"
  ],
  "Build Core Strength": [
    "Activate Deep Core", "Rotational Power", "The Stability Test", "Full Body Integration", 
    "The Endurance Burn", "The Power Circuit", "Ultimate Stability"
  ]
};

export const getDailyPlaylist = (userGoal, joinDateString) => {
    // 1. Calculate Day Index (0-based)
    const today = new Date();
    const joinDate = joinDateString ? new Date(joinDateString) : new Date();
    
    // Normalize time to midnight
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const joinMidnight = new Date(joinDate.getFullYear(), joinDate.getMonth(), joinDate.getDate());

    const diffTime = Math.abs(todayMidnight - joinMidnight);
    const dayIndex = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // 2. AGGRESSIVE GOAL MATCHING
    // This ensures even slight variations in goal strings get matched correctly
    let goalKey = "Build Core Strength"; // Default fallback
    const g = (userGoal || "").toLowerCase();

    if (g.includes("intimacy") || g.includes("sex")) {
        goalKey = "Improve Intimacy";
    } else if (g.includes("leak") || g.includes("bladder") || g.includes("incontinence")) {
        goalKey = "Stop Bladder Leaks";
    } else if (g.includes("postpartum") || g.includes("recover") || g.includes("baby")) {
        goalKey = "Recover Postpartum";
    } else if (g.includes("pregnancy") || g.includes("prepare") || g.includes("expecting")) {
        goalKey = "Prepare for Pregnancy";
    } else if (g.includes("pain") || g.includes("discomfort") || g.includes("relief")) {
        goalKey = "Ease Pelvic Pain";
    } else if (g.includes("strength") || g.includes("fitness") || g.includes("stability") || g.includes("posture") || g.includes("core")) {
        goalKey = "Build Core Strength";
    }

    // --- PHASE 1: THE FIRST 7 DAYS (Goal Specific Challenge) ---
    if (dayIndex < 7) {
        // Retrieve the specific plan for this goal
        const goalPlan = GOAL_PATHWAYS[goalKey] || GOAL_PATHWAYS["Build Core Strength"];
        
        // Safety check: Ensure we have videos for this day
        // We use % length to prevent crashing if data is missing, though your data file is complete now.
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
    const loopIndex = (dayIndex - 7) % 16;
    const rawUrls = GENERAL_LOOP[loopIndex] || GENERAL_LOOP[0];
    
    return {
        title: "Daily Maintenance Routine",
        videos: formatLoopVideos(rawUrls),
        isChallenge: false,
        dayNumber: loopIndex + 1
    };
};
