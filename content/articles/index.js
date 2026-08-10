// The slug to article map.
//
// Every import is written out by hand rather than resolved from a glob, because
// `output: 'export'` builds the whole site at compile time and a dynamic import
// path is exactly the thing that survives `next dev` and then produces an empty
// page in the export. If a slug is in lib/blog/posts.js and not in here, the
// route calls notFound() at build time and the build tells you, which is the
// failure mode you want.
//
// `headings` comes from each article file and drives the "On this page" list.
// It has to match the <H2> text in that file, in order.

import * as howLong from "./how-long-until-pelvic-floor-exercises-work";
import * as howMany from "./how-many-kegels-should-i-do-a-day";
import * as bladderTraining from "./bladder-training-plan-for-urgency";
import * as redFlags from "./pelvic-floor-red-flags";
import * as physioVisit from "./what-happens-at-a-pelvic-floor-physio-appointment";
import * as menopause from "./pelvic-floor-exercises-for-menopause";
import * as measuring from "./how-to-measure-pelvic-floor-progress";
import * as choosingAnApp from "./how-to-choose-a-pelvic-floor-app";

function entry(mod) {
  return { Body: mod.Body, headings: mod.headings };
}

export const ARTICLES = {
  "how-long-until-pelvic-floor-exercises-work": entry(howLong),
  "how-many-kegels-should-i-do-a-day": entry(howMany),
  "bladder-training-plan-for-urgency": entry(bladderTraining),
  "pelvic-floor-red-flags": entry(redFlags),
  "what-happens-at-a-pelvic-floor-physio-appointment": entry(physioVisit),
  "pelvic-floor-exercises-for-menopause": entry(menopause),
  "how-to-measure-pelvic-floor-progress": entry(measuring),
  "how-to-choose-a-pelvic-floor-app": entry(choosingAnApp),
};
