// Exported from native GoalDailyTrackingPlan; preserve authored choices and storage slot values.
export const NATIVE_DAILY_TRACKING = {
  "mensPelvicHealth" : {
    "bladderLeaks" : {
      "completion" : "Your bladder check-in is saved.",
      "goal" : "bladderLeaks",
      "prompts" : [
        {
          "choices" : [
            {
              "title" : "None",
              "value" : 0
            },
            {
              "title" : "A few",
              "value" : 1
            },
            {
              "title" : "Several",
              "value" : 2
            }
          ],
          "question" : "Any leaks since your last check-in?",
          "slot" : "leak",
          "title" : "Leaks"
        },
        {
          "choices" : [
            {
              "title" : "Hard",
              "value" : 1
            },
            {
              "title" : "Sometimes",
              "value" : 3
            },
            {
              "title" : "In control",
              "value" : 5
            }
          ],
          "question" : "How easy was it to wait when an urge came?",
          "slot" : "secondary",
          "title" : "Urge control"
        },
        {
          "choices" : [
            {
              "title" : "Low",
              "value" : 1
            },
            {
              "title" : "Growing",
              "value" : 3
            },
            {
              "title" : "Strong",
              "value" : 5
            }
          ],
          "question" : "How sure do you feel about bladder control today?",
          "slot" : "confidence",
          "title" : "Confidence"
        }
      ],
      "subtitle" : "See changes in leaks, urge control and confidence.",
      "systemImage" : "drop.circle.fill"
    },
    "bowelControl" : {
      "completion" : "Your bowel-control check-in is saved.",
      "goal" : "bowelControl",
      "prompts" : [
        {
          "choices" : [
            {
              "title" : "None",
              "value" : 0
            },
            {
              "title" : "A little",
              "value" : 1
            },
            {
              "title" : "Several times",
              "value" : 2
            }
          ],
          "question" : "Any bowel leakage or staining since your last check-in?",
          "slot" : "leak",
          "title" : "Leaks or staining"
        },
        {
          "choices" : [
            {
              "title" : "Hard",
              "value" : 1
            },
            {
              "title" : "Sometimes",
              "value" : 3
            },
            {
              "title" : "In control",
              "value" : 5
            }
          ],
          "question" : "How easy was it to stay in control when urgency came?",
          "slot" : "secondary",
          "title" : "Urgency control"
        },
        {
          "choices" : [
            {
              "title" : "Low",
              "value" : 1
            },
            {
              "title" : "Growing",
              "value" : 3
            },
            {
              "title" : "Strong",
              "value" : 5
            }
          ],
          "question" : "How confident did you feel away from a bathroom today?",
          "slot" : "confidence",
          "title" : "Confidence"
        }
      ],
      "subtitle" : "Track urgency, bowel control and confidence away from a bathroom.",
      "systemImage" : "checkmark.shield.fill"
    },
    "coreStrength" : {
      "completion" : "Your core check-in is saved.",
      "goal" : "coreStrength",
      "prompts" : [
        {
          "choices" : [
            {
              "title" : "Uncomfortable",
              "value" : 8
            },
            {
              "title" : "Manageable",
              "value" : 4
            },
            {
              "title" : "Comfortable",
              "value" : 0
            }
          ],
          "question" : "How comfortable does your core feel today?",
          "slot" : "discomfort",
          "title" : "Exercise comfort"
        },
        {
          "choices" : [
            {
              "title" : "Hard to feel",
              "value" : 1
            },
            {
              "title" : "Starting",
              "value" : 3
            },
            {
              "title" : "Strong",
              "value" : 5
            }
          ],
          "question" : "How clearly can you feel your deep core?",
          "slot" : "secondary",
          "title" : "Core connection"
        },
        {
          "choices" : [
            {
              "title" : "Low",
              "value" : 1
            },
            {
              "title" : "Building",
              "value" : 3
            },
            {
              "title" : "Steady",
              "value" : 5
            }
          ],
          "question" : "How steady does your core control feel?",
          "slot" : "confidence",
          "title" : "Control"
        }
      ],
      "subtitle" : "Notice comfort, deep-core connection and control.",
      "systemImage" : "circle.hexagongrid.fill"
    },
    "diastasisRecti" : {
      "completion" : "Your diastasis check-in is saved.",
      "goal" : "diastasisRecti",
      "prompts" : [
        {
          "choices" : [
            {
              "title" : "Often",
              "value" : 8
            },
            {
              "title" : "Sometimes",
              "value" : 4
            },
            {
              "title" : "Not today",
              "value" : 0
            }
          ],
          "question" : "How often did you notice doming or pressure?",
          "slot" : "discomfort",
          "title" : "Doming or pressure"
        },
        {
          "choices" : [
            {
              "title" : "Hard to feel",
              "value" : 1
            },
            {
              "title" : "Starting",
              "value" : 3
            },
            {
              "title" : "Connected",
              "value" : 5
            }
          ],
          "question" : "How clearly can you feel your deep core?",
          "slot" : "secondary",
          "title" : "Core connection"
        },
        {
          "choices" : [
            {
              "title" : "Low",
              "value" : 1
            },
            {
              "title" : "Growing",
              "value" : 3
            },
            {
              "title" : "Strong",
              "value" : 5
            }
          ],
          "question" : "How confident do you feel moving today?",
          "slot" : "confidence",
          "title" : "Movement confidence"
        }
      ],
      "subtitle" : "Watch doming, core connection and movement confidence.",
      "systemImage" : "circle.dashed.inset.filled"
    },
    "fitness" : {
      "completion" : "Your fitness check-in is saved.",
      "goal" : "fitness",
      "prompts" : [
        {
          "choices" : [
            {
              "title" : "Noticeable",
              "value" : 8
            },
            {
              "title" : "A little",
              "value" : 4
            },
            {
              "title" : "None",
              "value" : 0
            }
          ],
          "question" : "Did you notice pelvic pressure or heaviness?",
          "slot" : "discomfort",
          "title" : "Pressure or heaviness"
        },
        {
          "choices" : [
            {
              "title" : "Low",
              "value" : 1
            },
            {
              "title" : "Okay",
              "value" : 3
            },
            {
              "title" : "Good",
              "value" : 5
            }
          ],
          "question" : "How is your energy today?",
          "slot" : "secondary",
          "title" : "Energy"
        },
        {
          "choices" : [
            {
              "title" : "Low",
              "value" : 1
            },
            {
              "title" : "Growing",
              "value" : 3
            },
            {
              "title" : "Strong",
              "value" : 5
            }
          ],
          "question" : "How confident do you feel exercising today?",
          "slot" : "confidence",
          "title" : "Movement confidence"
        }
      ],
      "subtitle" : "Track pressure, energy and confidence while you move.",
      "systemImage" : "figure.run.circle.fill"
    },
    "intimacy" : {
      "completion" : "Your erection-and-control check-in is saved.",
      "goal" : "intimacy",
      "prompts" : [
        {
          "choices" : [
            {
              "title" : "High",
              "value" : 8
            },
            {
              "title" : "Some",
              "value" : 4
            },
            {
              "title" : "Relaxed",
              "value" : 0
            }
          ],
          "question" : "How much pelvic tension or gripping do you notice today?",
          "slot" : "discomfort",
          "title" : "Pelvic tension"
        },
        {
          "choices" : [
            {
              "title" : "Low",
              "value" : 1
            },
            {
              "title" : "Mixed",
              "value" : 3
            },
            {
              "title" : "Strong",
              "value" : 5
            }
          ],
          "question" : "How reliable did erection support feel today?",
          "slot" : "secondary",
          "title" : "Erection support"
        },
        {
          "choices" : [
            {
              "title" : "Low",
              "value" : 1
            },
            {
              "title" : "Mixed",
              "value" : 3
            },
            {
              "title" : "In control",
              "value" : 5
            }
          ],
          "question" : "How in control did you feel before finishing?",
          "slot" : "confidence",
          "title" : "Lasting control"
        }
      ],
      "subtitle" : "Erection support, lasting control and confidence, private and only for you.",
      "systemImage" : "bolt.heart.fill"
    },
    "pelvicPain" : {
      "completion" : "Your comfort check-in is saved.",
      "goal" : "pelvicPain",
      "prompts" : [
        {
          "choices" : [
            {
              "title" : "High",
              "value" : 8
            },
            {
              "title" : "Moderate",
              "value" : 4
            },
            {
              "title" : "Low",
              "value" : 0
            }
          ],
          "question" : "How much discomfort do you feel today?",
          "slot" : "discomfort",
          "title" : "Pain or discomfort"
        },
        {
          "choices" : [
            {
              "title" : "Guarded",
              "value" : 1
            },
            {
              "title" : "Some ease",
              "value" : 3
            },
            {
              "title" : "Relaxed",
              "value" : 5
            }
          ],
          "question" : "How relaxed does your pelvic area feel?",
          "slot" : "secondary",
          "title" : "Muscle ease"
        },
        {
          "choices" : [
            {
              "title" : "Low",
              "value" : 1
            },
            {
              "title" : "Growing",
              "value" : 3
            },
            {
              "title" : "Strong",
              "value" : 5
            }
          ],
          "question" : "How confident do you feel moving today?",
          "slot" : "confidence",
          "title" : "Movement confidence"
        }
      ],
      "subtitle" : "Track discomfort, muscle ease and movement confidence.",
      "systemImage" : "leaf.circle.fill"
    },
    "postpartum" : {
      "completion" : "Your recovery check-in is saved.",
      "goal" : "postpartum",
      "prompts" : [
        {
          "choices" : [
            {
              "title" : "Very sore",
              "value" : 8
            },
            {
              "title" : "Manageable",
              "value" : 4
            },
            {
              "title" : "Comfortable",
              "value" : 0
            }
          ],
          "question" : "How does your body feel today?",
          "slot" : "discomfort",
          "title" : "Recovery comfort"
        },
        {
          "choices" : [
            {
              "title" : "Low",
              "value" : 1
            },
            {
              "title" : "Okay",
              "value" : 3
            },
            {
              "title" : "Good",
              "value" : 5
            }
          ],
          "question" : "How is your energy today?",
          "slot" : "secondary",
          "title" : "Energy"
        },
        {
          "choices" : [
            {
              "title" : "Hard to feel",
              "value" : 1
            },
            {
              "title" : "Starting",
              "value" : 3
            },
            {
              "title" : "Connected",
              "value" : 5
            }
          ],
          "question" : "How clearly can you feel your deep core today?",
          "slot" : "confidence",
          "title" : "Core connection"
        }
      ],
      "subtitle" : "Notice recovery comfort, energy and core connection.",
      "systemImage" : "figure.and.child.holdinghands"
    },
    "pregnancyPrep" : {
      "completion" : "Your pregnancy-prep check-in is saved.",
      "goal" : "pregnancyPrep",
      "prompts" : [
        {
          "choices" : [
            {
              "title" : "Uncomfortable",
              "value" : 8
            },
            {
              "title" : "Manageable",
              "value" : 4
            },
            {
              "title" : "Comfortable",
              "value" : 0
            }
          ],
          "question" : "How comfortable does your body feel today?",
          "slot" : "discomfort",
          "title" : "Body comfort"
        },
        {
          "choices" : [
            {
              "title" : "Low",
              "value" : 1
            },
            {
              "title" : "Okay",
              "value" : 3
            },
            {
              "title" : "Good",
              "value" : 5
            }
          ],
          "question" : "How is your energy today?",
          "slot" : "secondary",
          "title" : "Energy"
        },
        {
          "choices" : [
            {
              "title" : "Unsure",
              "value" : 1
            },
            {
              "title" : "Building",
              "value" : 3
            },
            {
              "title" : "Ready",
              "value" : 5
            }
          ],
          "question" : "How ready does your body feel today?",
          "slot" : "confidence",
          "title" : "Body readiness"
        }
      ],
      "subtitle" : "Track comfort, energy and how ready your body feels.",
      "systemImage" : "figure.stand"
    },
    "prolapse" : {
      "completion" : "Your pelvic support check-in is saved.",
      "goal" : "prolapse",
      "prompts" : [
        {
          "choices" : [
            {
              "title" : "Noticeable",
              "value" : 8
            },
            {
              "title" : "A little",
              "value" : 4
            },
            {
              "title" : "None",
              "value" : 0
            }
          ],
          "question" : "How much pelvic heaviness or bulging did you notice today?",
          "slot" : "discomfort",
          "title" : "Heaviness or bulging"
        },
        {
          "choices" : [
            {
              "title" : "Not supported",
              "value" : 1
            },
            {
              "title" : "Improving",
              "value" : 3
            },
            {
              "title" : "Supported",
              "value" : 5
            }
          ],
          "question" : "How supported did your pelvic area feel while standing or lifting?",
          "slot" : "secondary",
          "title" : "Pelvic support"
        },
        {
          "choices" : [
            {
              "title" : "Low",
              "value" : 1
            },
            {
              "title" : "Growing",
              "value" : 3
            },
            {
              "title" : "Strong",
              "value" : 5
            }
          ],
          "question" : "How confident do you feel moving through your day?",
          "slot" : "confidence",
          "title" : "Movement confidence"
        }
      ],
      "subtitle" : "Track heaviness, pelvic support and confidence during daily movement.",
      "systemImage" : "arrow.up.heart.fill"
    },
    "prostateRecovery" : {
      "completion" : "Your recovery check-in is saved.",
      "goal" : "prostateRecovery",
      "prompts" : [
        {
          "choices" : [
            {
              "title" : "None",
              "value" : 0
            },
            {
              "title" : "A few",
              "value" : 1
            },
            {
              "title" : "Several",
              "value" : 2
            }
          ],
          "question" : "Any leaks or after-urination drips since your last check-in?",
          "slot" : "leak",
          "title" : "Leaks or drips"
        },
        {
          "choices" : [
            {
              "title" : "Low",
              "value" : 1
            },
            {
              "title" : "Improving",
              "value" : 3
            },
            {
              "title" : "Strong",
              "value" : 5
            }
          ],
          "question" : "How in control did your bladder feel today?",
          "slot" : "secondary",
          "title" : "Bladder control"
        },
        {
          "choices" : [
            {
              "title" : "Low",
              "value" : 1
            },
            {
              "title" : "Growing",
              "value" : 3
            },
            {
              "title" : "Strong",
              "value" : 5
            }
          ],
          "question" : "How confident did daily movement feel today?",
          "slot" : "confidence",
          "title" : "Recovery confidence"
        }
      ],
      "subtitle" : "Track leaks, bladder control and recovery confidence.",
      "systemImage" : "cross.case.fill"
    },
    "stability" : {
      "completion" : "Your stability check-in is saved.",
      "goal" : "stability",
      "prompts" : [
        {
          "choices" : [
            {
              "title" : "Uncomfortable",
              "value" : 8
            },
            {
              "title" : "Manageable",
              "value" : 4
            },
            {
              "title" : "Comfortable",
              "value" : 0
            }
          ],
          "question" : "How comfortable does movement feel today?",
          "slot" : "discomfort",
          "title" : "Movement comfort"
        },
        {
          "choices" : [
            {
              "title" : "Unsteady",
              "value" : 1
            },
            {
              "title" : "Improving",
              "value" : 3
            },
            {
              "title" : "Steady",
              "value" : 5
            }
          ],
          "question" : "How steady do your hips feel today?",
          "slot" : "secondary",
          "title" : "Steadiness"
        },
        {
          "choices" : [
            {
              "title" : "Low",
              "value" : 1
            },
            {
              "title" : "Growing",
              "value" : 3
            },
            {
              "title" : "Strong",
              "value" : 5
            }
          ],
          "question" : "How confident do you feel moving today?",
          "slot" : "confidence",
          "title" : "Movement confidence"
        }
      ],
      "subtitle" : "Track comfort, steadiness and movement confidence.",
      "systemImage" : "figure.stand.line.dotted.figure.stand"
    }
  },
  "womensPelvicHealth" : {
    "bladderLeaks" : {
      "completion" : "Your bladder check-in is saved.",
      "goal" : "bladderLeaks",
      "prompts" : [
        {
          "choices" : [
            {
              "title" : "None",
              "value" : 0
            },
            {
              "title" : "A few",
              "value" : 1
            },
            {
              "title" : "Several",
              "value" : 2
            }
          ],
          "question" : "Any leaks since your last check-in?",
          "slot" : "leak",
          "title" : "Leaks"
        },
        {
          "choices" : [
            {
              "title" : "Hard",
              "value" : 1
            },
            {
              "title" : "Sometimes",
              "value" : 3
            },
            {
              "title" : "In control",
              "value" : 5
            }
          ],
          "question" : "How easy was it to wait when an urge came?",
          "slot" : "secondary",
          "title" : "Urge control"
        },
        {
          "choices" : [
            {
              "title" : "Low",
              "value" : 1
            },
            {
              "title" : "Growing",
              "value" : 3
            },
            {
              "title" : "Strong",
              "value" : 5
            }
          ],
          "question" : "How sure do you feel about bladder control today?",
          "slot" : "confidence",
          "title" : "Confidence"
        }
      ],
      "subtitle" : "See changes in leaks, urge control and confidence.",
      "systemImage" : "drop.circle.fill"
    },
    "bowelControl" : {
      "completion" : "Your bowel-control check-in is saved.",
      "goal" : "bowelControl",
      "prompts" : [
        {
          "choices" : [
            {
              "title" : "None",
              "value" : 0
            },
            {
              "title" : "A little",
              "value" : 1
            },
            {
              "title" : "Several times",
              "value" : 2
            }
          ],
          "question" : "Any bowel leakage or staining since your last check-in?",
          "slot" : "leak",
          "title" : "Leaks or staining"
        },
        {
          "choices" : [
            {
              "title" : "Hard",
              "value" : 1
            },
            {
              "title" : "Sometimes",
              "value" : 3
            },
            {
              "title" : "In control",
              "value" : 5
            }
          ],
          "question" : "How easy was it to stay in control when urgency came?",
          "slot" : "secondary",
          "title" : "Urgency control"
        },
        {
          "choices" : [
            {
              "title" : "Low",
              "value" : 1
            },
            {
              "title" : "Growing",
              "value" : 3
            },
            {
              "title" : "Strong",
              "value" : 5
            }
          ],
          "question" : "How confident did you feel away from a bathroom today?",
          "slot" : "confidence",
          "title" : "Confidence"
        }
      ],
      "subtitle" : "Track urgency, bowel control and confidence away from a bathroom.",
      "systemImage" : "checkmark.shield.fill"
    },
    "coreStrength" : {
      "completion" : "Your core check-in is saved.",
      "goal" : "coreStrength",
      "prompts" : [
        {
          "choices" : [
            {
              "title" : "Uncomfortable",
              "value" : 8
            },
            {
              "title" : "Manageable",
              "value" : 4
            },
            {
              "title" : "Comfortable",
              "value" : 0
            }
          ],
          "question" : "How comfortable does your core feel today?",
          "slot" : "discomfort",
          "title" : "Exercise comfort"
        },
        {
          "choices" : [
            {
              "title" : "Hard to feel",
              "value" : 1
            },
            {
              "title" : "Starting",
              "value" : 3
            },
            {
              "title" : "Strong",
              "value" : 5
            }
          ],
          "question" : "How clearly can you feel your deep core?",
          "slot" : "secondary",
          "title" : "Core connection"
        },
        {
          "choices" : [
            {
              "title" : "Low",
              "value" : 1
            },
            {
              "title" : "Building",
              "value" : 3
            },
            {
              "title" : "Steady",
              "value" : 5
            }
          ],
          "question" : "How steady does your core control feel?",
          "slot" : "confidence",
          "title" : "Control"
        }
      ],
      "subtitle" : "Notice comfort, deep-core connection and control.",
      "systemImage" : "circle.hexagongrid.fill"
    },
    "diastasisRecti" : {
      "completion" : "Your diastasis check-in is saved.",
      "goal" : "diastasisRecti",
      "prompts" : [
        {
          "choices" : [
            {
              "title" : "Often",
              "value" : 8
            },
            {
              "title" : "Sometimes",
              "value" : 4
            },
            {
              "title" : "Not today",
              "value" : 0
            }
          ],
          "question" : "How often did you notice doming or pressure?",
          "slot" : "discomfort",
          "title" : "Doming or pressure"
        },
        {
          "choices" : [
            {
              "title" : "Hard to feel",
              "value" : 1
            },
            {
              "title" : "Starting",
              "value" : 3
            },
            {
              "title" : "Connected",
              "value" : 5
            }
          ],
          "question" : "How clearly can you feel your deep core?",
          "slot" : "secondary",
          "title" : "Core connection"
        },
        {
          "choices" : [
            {
              "title" : "Low",
              "value" : 1
            },
            {
              "title" : "Growing",
              "value" : 3
            },
            {
              "title" : "Strong",
              "value" : 5
            }
          ],
          "question" : "How confident do you feel moving today?",
          "slot" : "confidence",
          "title" : "Movement confidence"
        }
      ],
      "subtitle" : "Watch doming, core connection and movement confidence.",
      "systemImage" : "circle.dashed.inset.filled"
    },
    "fitness" : {
      "completion" : "Your fitness check-in is saved.",
      "goal" : "fitness",
      "prompts" : [
        {
          "choices" : [
            {
              "title" : "Noticeable",
              "value" : 8
            },
            {
              "title" : "A little",
              "value" : 4
            },
            {
              "title" : "None",
              "value" : 0
            }
          ],
          "question" : "Did you notice pelvic pressure or heaviness?",
          "slot" : "discomfort",
          "title" : "Pressure or heaviness"
        },
        {
          "choices" : [
            {
              "title" : "Low",
              "value" : 1
            },
            {
              "title" : "Okay",
              "value" : 3
            },
            {
              "title" : "Good",
              "value" : 5
            }
          ],
          "question" : "How is your energy today?",
          "slot" : "secondary",
          "title" : "Energy"
        },
        {
          "choices" : [
            {
              "title" : "Low",
              "value" : 1
            },
            {
              "title" : "Growing",
              "value" : 3
            },
            {
              "title" : "Strong",
              "value" : 5
            }
          ],
          "question" : "How confident do you feel exercising today?",
          "slot" : "confidence",
          "title" : "Movement confidence"
        }
      ],
      "subtitle" : "Track pressure, energy and confidence while you move.",
      "systemImage" : "figure.run.circle.fill"
    },
    "intimacy" : {
      "completion" : "Your intimacy check-in is saved.",
      "goal" : "intimacy",
      "prompts" : [
        {
          "choices" : [
            {
              "title" : "Uncomfortable",
              "value" : 8
            },
            {
              "title" : "Okay",
              "value" : 4
            },
            {
              "title" : "Comfortable",
              "value" : 0
            }
          ],
          "question" : "How comfortable does your pelvic area feel today?",
          "slot" : "discomfort",
          "title" : "Comfort"
        },
        {
          "choices" : [
            {
              "title" : "Low",
              "value" : 1
            },
            {
              "title" : "Some",
              "value" : 3
            },
            {
              "title" : "Clear",
              "value" : 5
            }
          ],
          "question" : "How clear does sensation feel today?",
          "slot" : "secondary",
          "title" : "Sensation"
        },
        {
          "choices" : [
            {
              "title" : "Low",
              "value" : 1
            },
            {
              "title" : "Growing",
              "value" : 3
            },
            {
              "title" : "Strong",
              "value" : 5
            }
          ],
          "question" : "How confident do you feel about intimacy today?",
          "slot" : "confidence",
          "title" : "Confidence"
        }
      ],
      "subtitle" : "Comfort, sensation and confidence, private and only for you.",
      "systemImage" : "heart.circle.fill"
    },
    "pelvicPain" : {
      "completion" : "Your comfort check-in is saved.",
      "goal" : "pelvicPain",
      "prompts" : [
        {
          "choices" : [
            {
              "title" : "High",
              "value" : 8
            },
            {
              "title" : "Moderate",
              "value" : 4
            },
            {
              "title" : "Low",
              "value" : 0
            }
          ],
          "question" : "How much discomfort do you feel today?",
          "slot" : "discomfort",
          "title" : "Pain or discomfort"
        },
        {
          "choices" : [
            {
              "title" : "Guarded",
              "value" : 1
            },
            {
              "title" : "Some ease",
              "value" : 3
            },
            {
              "title" : "Relaxed",
              "value" : 5
            }
          ],
          "question" : "How relaxed does your pelvic area feel?",
          "slot" : "secondary",
          "title" : "Muscle ease"
        },
        {
          "choices" : [
            {
              "title" : "Low",
              "value" : 1
            },
            {
              "title" : "Growing",
              "value" : 3
            },
            {
              "title" : "Strong",
              "value" : 5
            }
          ],
          "question" : "How confident do you feel moving today?",
          "slot" : "confidence",
          "title" : "Movement confidence"
        }
      ],
      "subtitle" : "Track discomfort, muscle ease and movement confidence.",
      "systemImage" : "leaf.circle.fill"
    },
    "postpartum" : {
      "completion" : "Your recovery check-in is saved.",
      "goal" : "postpartum",
      "prompts" : [
        {
          "choices" : [
            {
              "title" : "Very sore",
              "value" : 8
            },
            {
              "title" : "Manageable",
              "value" : 4
            },
            {
              "title" : "Comfortable",
              "value" : 0
            }
          ],
          "question" : "How does your body feel today?",
          "slot" : "discomfort",
          "title" : "Recovery comfort"
        },
        {
          "choices" : [
            {
              "title" : "Low",
              "value" : 1
            },
            {
              "title" : "Okay",
              "value" : 3
            },
            {
              "title" : "Good",
              "value" : 5
            }
          ],
          "question" : "How is your energy today?",
          "slot" : "secondary",
          "title" : "Energy"
        },
        {
          "choices" : [
            {
              "title" : "Hard to feel",
              "value" : 1
            },
            {
              "title" : "Starting",
              "value" : 3
            },
            {
              "title" : "Connected",
              "value" : 5
            }
          ],
          "question" : "How clearly can you feel your deep core today?",
          "slot" : "confidence",
          "title" : "Core connection"
        }
      ],
      "subtitle" : "Notice recovery comfort, energy and core connection.",
      "systemImage" : "figure.and.child.holdinghands"
    },
    "pregnancyPrep" : {
      "completion" : "Your pregnancy-prep check-in is saved.",
      "goal" : "pregnancyPrep",
      "prompts" : [
        {
          "choices" : [
            {
              "title" : "Uncomfortable",
              "value" : 8
            },
            {
              "title" : "Manageable",
              "value" : 4
            },
            {
              "title" : "Comfortable",
              "value" : 0
            }
          ],
          "question" : "How comfortable does your body feel today?",
          "slot" : "discomfort",
          "title" : "Body comfort"
        },
        {
          "choices" : [
            {
              "title" : "Low",
              "value" : 1
            },
            {
              "title" : "Okay",
              "value" : 3
            },
            {
              "title" : "Good",
              "value" : 5
            }
          ],
          "question" : "How is your energy today?",
          "slot" : "secondary",
          "title" : "Energy"
        },
        {
          "choices" : [
            {
              "title" : "Unsure",
              "value" : 1
            },
            {
              "title" : "Building",
              "value" : 3
            },
            {
              "title" : "Ready",
              "value" : 5
            }
          ],
          "question" : "How ready does your body feel today?",
          "slot" : "confidence",
          "title" : "Body readiness"
        }
      ],
      "subtitle" : "Track comfort, energy and how ready your body feels.",
      "systemImage" : "figure.stand"
    },
    "prolapse" : {
      "completion" : "Your pelvic support check-in is saved.",
      "goal" : "prolapse",
      "prompts" : [
        {
          "choices" : [
            {
              "title" : "Noticeable",
              "value" : 8
            },
            {
              "title" : "A little",
              "value" : 4
            },
            {
              "title" : "None",
              "value" : 0
            }
          ],
          "question" : "How much pelvic heaviness or bulging did you notice today?",
          "slot" : "discomfort",
          "title" : "Heaviness or bulging"
        },
        {
          "choices" : [
            {
              "title" : "Not supported",
              "value" : 1
            },
            {
              "title" : "Improving",
              "value" : 3
            },
            {
              "title" : "Supported",
              "value" : 5
            }
          ],
          "question" : "How supported did your pelvic area feel while standing or lifting?",
          "slot" : "secondary",
          "title" : "Pelvic support"
        },
        {
          "choices" : [
            {
              "title" : "Low",
              "value" : 1
            },
            {
              "title" : "Growing",
              "value" : 3
            },
            {
              "title" : "Strong",
              "value" : 5
            }
          ],
          "question" : "How confident do you feel moving through your day?",
          "slot" : "confidence",
          "title" : "Movement confidence"
        }
      ],
      "subtitle" : "Track heaviness, pelvic support and confidence during daily movement.",
      "systemImage" : "arrow.up.heart.fill"
    },
    "prostateRecovery" : {
      "completion" : "Your recovery check-in is saved.",
      "goal" : "prostateRecovery",
      "prompts" : [
        {
          "choices" : [
            {
              "title" : "None",
              "value" : 0
            },
            {
              "title" : "A few",
              "value" : 1
            },
            {
              "title" : "Several",
              "value" : 2
            }
          ],
          "question" : "Any leaks or after-urination drips since your last check-in?",
          "slot" : "leak",
          "title" : "Leaks or drips"
        },
        {
          "choices" : [
            {
              "title" : "Low",
              "value" : 1
            },
            {
              "title" : "Improving",
              "value" : 3
            },
            {
              "title" : "Strong",
              "value" : 5
            }
          ],
          "question" : "How in control did your bladder feel today?",
          "slot" : "secondary",
          "title" : "Bladder control"
        },
        {
          "choices" : [
            {
              "title" : "Low",
              "value" : 1
            },
            {
              "title" : "Growing",
              "value" : 3
            },
            {
              "title" : "Strong",
              "value" : 5
            }
          ],
          "question" : "How confident did daily movement feel today?",
          "slot" : "confidence",
          "title" : "Recovery confidence"
        }
      ],
      "subtitle" : "Track leaks, bladder control and recovery confidence.",
      "systemImage" : "cross.case.fill"
    },
    "stability" : {
      "completion" : "Your stability check-in is saved.",
      "goal" : "stability",
      "prompts" : [
        {
          "choices" : [
            {
              "title" : "Uncomfortable",
              "value" : 8
            },
            {
              "title" : "Manageable",
              "value" : 4
            },
            {
              "title" : "Comfortable",
              "value" : 0
            }
          ],
          "question" : "How comfortable does movement feel today?",
          "slot" : "discomfort",
          "title" : "Movement comfort"
        },
        {
          "choices" : [
            {
              "title" : "Unsteady",
              "value" : 1
            },
            {
              "title" : "Improving",
              "value" : 3
            },
            {
              "title" : "Steady",
              "value" : 5
            }
          ],
          "question" : "How steady do your hips feel today?",
          "slot" : "secondary",
          "title" : "Steadiness"
        },
        {
          "choices" : [
            {
              "title" : "Low",
              "value" : 1
            },
            {
              "title" : "Growing",
              "value" : 3
            },
            {
              "title" : "Strong",
              "value" : 5
            }
          ],
          "question" : "How confident do you feel moving today?",
          "slot" : "confidence",
          "title" : "Movement confidence"
        }
      ],
      "subtitle" : "Track comfort, steadiness and movement confidence.",
      "systemImage" : "figure.stand.line.dotted.figure.stand"
    }
  }
};
