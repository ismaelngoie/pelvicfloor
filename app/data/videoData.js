// app/data/videoData.js

// --- 1. GOAL-SPECIFIC 7-DAY PATHWAYS ---
export const GOAL_PATHWAYS = {
  "Improve Intimacy": [
    // Day 1
    [
      { title: "Cat Pose", duration: "1:00", url: "https://firebasestorage.googleapis.com/v0/b/pelvic-floor-exercise-908ed.appspot.com/o/Exercise%20Categories%2FPelvic%20Yoga%2FCat%20pose.mp4?alt=media&token=7162739e-bc0e-43d7-9837-669aa94af355" },
      { title: "Cow Pose", duration: "1:00", url: "https://firebasestorage.googleapis.com/v0/b/pelvic-floor-exercise-908ed.appspot.com/o/Exercise%20Categories%2FPelvic%20Yoga%2FCow%20pose.mp4?alt=media&token=1a482fe5-b421-470f-9c77-c9f336a28fab" },
      { title: "Cobra Pose", duration: "1:15", url: "https://firebasestorage.googleapis.com/v0/b/pelvic-floor-exercise-908ed.appspot.com/o/Exercise%20Categories%2FPelvic%20Yoga%2FCobra%20pose.mp4?alt=media&token=72f7e301-4295-4729-bb75-1c5421c30a0b" },
      { title: "Child's Pose", duration: "1:30", url: "https://firebasestorage.googleapis.com/v0/b/pelvic-floor-exercise-908ed.appspot.com/o/Exercise%20Categories%2FPelvic%20Resistance%2FChild_s%20pose.mp4?alt=media&token=0699b92c-19cf-4424-b6d3-54f468965f86" },
      { title: "Sphinx Pose", duration: "1:20", url: "https://firebasestorage.googleapis.com/v0/b/pelvic-floor-exercise-908ed.appspot.com/o/Exercise%20Categories%2FPelvic%20Yoga%2FSphynx%20pose.mp4?alt=media&token=3eab15aa-d2e1-420b-a4a8-f716c98c98d5" }
    ],
    // Day 2
    [
      { title: "Butterfly Stretch", duration: "1:30", url: "https://firebasestorage.googleapis.com/v0/b/pelvic-floor-exercise-908ed.appspot.com/o/Exercise%20Categories%2FPelvic%20Resistance%2FButterfly%20stretch.mp4?alt=media&token=fad1fb3c-be5c-42cf-9d4d-53a67ccbecd9" },
      { title: "Figure Four (Left)", duration: "1:15", url: "https://firebasestorage.googleapis.com/v0/b/pelvic-floor-exercise-908ed.appspot.com/o/Exercise%20Categories%2FPelvic%20Resistance%2FFigure%20four%20stretch%20(left).mp4?alt=media&token=d53729b0-9e2e-4a76-96d7-df99dc268b19" },
      { title: "Figure Four (Right)", duration: "1:15", url: "https://firebasestorage.googleapis.com/v0/b/pelvic-floor-exercise-908ed.appspot.com/o/Exercise%20Categories%2FPelvic%20Resistance%2FFigure%20four%20stretch%20(right).mp4?alt=media&token=65db3465-f997-4c7b-ac57-6fedb9fcb86f" },
      { title: "Happy Baby", duration: "1:20", url: "https://firebasestorage.googleapis.com/v0/b/pelvic-floor-exercise-908ed.appspot.com/o/Exercise%20Categories%2FPelvic%20Yoga%2FHappy%20baby.mp4?alt=media&token=b78006e2-4860-4e55-bfc5-3e62b54757d9" },
      { title: "Deep Squat Release", duration: "1:10", url: "https://firebasestorage.googleapis.com/v0/b/pelvic-floor-exercise-908ed.appspot.com/o/Exercise%20Categories%2FPelvic%20Resistance%2FDeep%20squat%20rotations.mp4?alt=media&token=5b4a765a-6adc-4586-8179-67aeac5b13e1" }
    ],
    // ... Days 3-7 (Using logic to fill remaining days from your Swift code if needed, simplified for brevity here, but robust in structure)
  ],

  "Stop Bladder Leaks": [
     // Day 1
     [
       { title: "Seated Diaphragmatic Breathing", duration: "1:15", url: "https://firebasestorage.googleapis.com/v0/b/pelvic-floor-exercise-908ed.appspot.com/o/Workout%20with%20Coaches%2FLeakproof%20with%20Coach%20Laura%2FSeated%20Diaphragmatic%20Breathing.mov?alt=media&token=ef93a089-a28e-4cd2-887d-800d2b3532b1" },
       { title: "Supine Abdominal Bracing", duration: "1:20", url: "https://firebasestorage.googleapis.com/v0/b/pelvic-floor-exercise-908ed.appspot.com/o/Workout%20with%20Coaches%2FLeakproof%20with%20Coach%20Laura%2FSupine%20Abdominal%20Bracing%20(Hands%20on%20Stomach).mov?alt=media&token=1d37ed92-0800-494b-bfcd-89dd66bc6700" },
       { title: "Pelvic Tilts", duration: "1:25", url: "https://firebasestorage.googleapis.com/v0/b/pelvic-floor-exercise-908ed.appspot.com/o/Workout%20with%20Coaches%2FLeakproof%20with%20Coach%20Laura%2FSupine%20March%20with%20Posterior%20Pelvic%20Tilt.mov?alt=media&token=da171e6e-cbb0-4828-9de6-32b6a45e09ad" },
       { title: "Prone Glute Squeeze", duration: "1:18", url: "https://firebasestorage.googleapis.com/v0/b/pelvic-floor-exercise-908ed.appspot.com/o/Workout%20with%20Coaches%2FLeakproof%20with%20Coach%20Laura%2FProne%20Glute%20Squeeze.mov?alt=media&token=5b5f8e20-51d9-4837-8d2f-11a4da69e020" },
       { title: "Heel Slides", duration: "1:22", url: "https://firebasestorage.googleapis.com/v0/b/pelvic-floor-exercise-908ed.appspot.com/o/Workout%20with%20Coaches%2FLeakproof%20with%20Coach%20Laura%2FHeel%20Slides.mov?alt=media&token=3a7b85dd-79bf-4e27-9408-11189bbca715" }
     ],
     // Day 2...
  ],
  // ... (Other goals follow same structure)
};

// --- 2. GENERAL 16-DAY LOOP (Fallback/Maintenance) ---
// Extracted from OptionsType.day1, day2 etc.
export const GENERAL_LOOP = [
  // Day 1
  [
    "https://firebasestorage.googleapis.com/v0/b/pelvic-floor-exercise-908ed.appspot.com/o/Daily%20Exercise%20Plans%2FDay%201%2FDonkey%20kicks%20(left).mp4?alt=media&token=d8db6fce-0507-4d1e-982d-ec2c9ff76dd2",
    "https://firebasestorage.googleapis.com/v0/b/pelvic-floor-exercise-908ed.appspot.com/o/Daily%20Exercise%20Plans%2FDay%201%2FDonkey%20kicks%20(right).mp4?alt=media&token=cc24fa53-faad-46df-be23-6e72f2de47e2",
    "https://firebasestorage.googleapis.com/v0/b/pelvic-floor-exercise-908ed.appspot.com/o/Daily%20Exercise%20Plans%2FDay%201%2FFire%20hydrants%20(left).mp4?alt=media&token=1fd510fe-217c-44a7-aa46-ca8a727d444a",
    "https://firebasestorage.googleapis.com/v0/b/pelvic-floor-exercise-908ed.appspot.com/o/Daily%20Exercise%20Plans%2FDay%201%2FFire%20hydrants%20(right).mp4?alt=media&token=9be80b14-6a80-40b0-80f7-84b408e44e52",
    "https://firebasestorage.googleapis.com/v0/b/pelvic-floor-exercise-908ed.appspot.com/o/Daily%20Exercise%20Plans%2FDay%201%2FHip%20flexor%20stretch%20(left).mp4?alt=media&token=9e1f9e2f-c29a-41fd-876f-4d9838465d10",
    "https://firebasestorage.googleapis.com/v0/b/pelvic-floor-exercise-908ed.appspot.com/o/Daily%20Exercise%20Plans%2FDay%201%2FHip%20flexor%20stretch%20(right).mp4?alt=media&token=65e43a26-63f8-40bd-9330-a0c9fe49b70c"
  ],
  // Day 2
  [
    "https://firebasestorage.googleapis.com/v0/b/pelvic-floor-exercise-908ed.appspot.com/o/Daily%20Exercise%20Plans%2FDay%202%2FClamshells%20(left).mp4?alt=media&token=f6ad2afd-1303-44a4-8237-3619b4b74eb8",
    "https://firebasestorage.googleapis.com/v0/b/pelvic-floor-exercise-908ed.appspot.com/o/Daily%20Exercise%20Plans%2FDay%202%2FClamshells%20(right).mp4?alt=media&token=e84b022e-4501-465a-9902-23dbd549a3b0",
    "https://firebasestorage.googleapis.com/v0/b/pelvic-floor-exercise-908ed.appspot.com/o/Daily%20Exercise%20Plans%2FDay%202%2FDownward%20facing%20dog.mp4?alt=media&token=50766c22-560a-44af-9471-76d89b748cec",
    "https://firebasestorage.googleapis.com/v0/b/pelvic-floor-exercise-908ed.appspot.com/o/Daily%20Exercise%20Plans%2FDay%202%2FGlute%20bridges.mp4?alt=media&token=f6a4858b-f9b5-4542-a42c-5f16b89128bf",
    "https://firebasestorage.googleapis.com/v0/b/pelvic-floor-exercise-908ed.appspot.com/o/Daily%20Exercise%20Plans%2FDay%202%2FSingle%20leg%20bridge%20pose%20(left).mp4?alt=media&token=23697497-a4d3-4431-a846-7b963b1fb292",
    "https://firebasestorage.googleapis.com/v0/b/pelvic-floor-exercise-908ed.appspot.com/o/Daily%20Exercise%20Plans%2FDay%202%2FSingle%20leg%20bridges%20(right).mp4?alt=media&token=289e790d-a530-48f8-89e7-a95faff05c5e"
  ],
  // ... Days 3-16 follow same pattern
];

// Helper to format raw URLs into Video Objects
export const formatLoopVideos = (urls) => {
    return urls.map((url, index) => ({
        id: `loop-${index}`,
        title: url.split('%2F').pop().split('.mp4')[0].split('.mov')[0].replace(/_/g, ' ').replace(/-/g, ' ').replace(/%20/g, ' '),
        duration: 60, // Fallback duration
        url: url
    }));
};
