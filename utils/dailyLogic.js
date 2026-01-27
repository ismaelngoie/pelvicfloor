// utils/dailyLogic.js
import { GOAL_PATHWAYS, GENERAL_LOOP, formatLoopVideos } from '@/app/data/videoData';

export const getDailyPlaylist = (userGoal, joinDateString) => {
    const today = new Date();
    const joinDate = new Date(joinDateString || new Date().toISOString());
    
    // Calculate days since joining (0-indexed)
    const diffTime = Math.abs(today - joinDate);
    const dayIndex = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Normalize Goal Title to match keys
    let goalKey = "Build Core Strength"; // Default
    if (userGoal?.toLowerCase().includes("intimacy")) goalKey = "Improve Intimacy";
    else if (userGoal?.toLowerCase().includes("leak")) goalKey = "Stop Bladder Leaks";
    else if (userGoal?.toLowerCase().includes("postpartum")) goalKey = "Recover Postpartum";
    else if (userGoal?.toLowerCase().includes("pregnancy")) goalKey = "Prepare for Pregnancy";
    else if (userGoal?.toLowerCase().includes("pain")) goalKey = "Ease Pelvic Pain";
    // ... add other mappings

    // --- PHASE 1: THE FIRST 7 DAYS (Goal Specific) ---
    if (dayIndex < 7) {
        const goalPlan = GOAL_PATHWAYS[goalKey] || GOAL_PATHWAYS["Build Core Strength"]; // Fallback
        // Ensure we don't crash if plan is shorter than 7 days
        const dayPlan = goalPlan[dayIndex % goalPlan.length]; 
        
        return {
            title: `Day ${dayIndex + 1}: ${getGoalTitle(goalKey)}`,
            videos: dayPlan || [],
            isChallenge: true,
            dayNumber: dayIndex + 1
        };
    }

    // --- PHASE 2: THE 16-DAY LOOP (General Maintenance) ---
    // Subtract the first 7 days, then modulo 16 to loop forever
    const loopIndex = (dayIndex - 7) % 16;
    const rawUrls = GENERAL_LOOP[loopIndex] || GENERAL_LOOP[0];
    
    return {
        title: "Daily Maintenance Routine",
        videos: formatLoopVideos(rawUrls),
        isChallenge: false,
        dayNumber: loopIndex + 1
    };
};

const getGoalTitle = (key) => {
    if (key.includes("Intimacy")) return "Awaken Sensation";
    if (key.includes("Leaks")) return "Activate Control";
    return "Deep Core Activation";
}
