"use client";

// SF Symbol names, drawn on the web.
//
// The iOS funnel names every glyph with an SF Symbol string, and those strings
// are copied verbatim into copy.js so the two products can be diffed line by
// line. The web has no SF Symbols, so this file is the one place that decides
// what each name looks like here. Two rules kept it honest:
//
//   1. Never let two glyphs inside the SAME goal collapse onto one icon. A
//      constellation with three identical pictures reads as a rendering bug.
//   2. If a symbol has no close lucide match, pick the one that matches the
//      SENTENCE, not the symbol. The label is what she reads.

import {
  Accessibility, Activity, Armchair, ArrowLeftRight, ArrowUpDown, Baby,
  Bandage, BedDouble, CalendarCheck, ChevronLeft, CircleCheck, Droplet,
  Dumbbell, Flower2, FoldHorizontal, Footprints, Heart, HeartPulse, Leaf,
  Link, MessagesSquare, PersonStanding, Shield, ShieldHalf, Smile, Sparkle,
  Sparkles, SquarePlay, Timer, TrendingUp, Trophy, Users, Wind, Zap, ZapOff,
} from "lucide-react";

const MAP = {
  "figure.run.circle.fill": Footprints,
  "play.rectangle.on.rectangle.fill": SquarePlay,
  "bubble.left.and.bubble.right.fill": MessagesSquare,
  "figure.child": Baby,
  "figure.stand": PersonStanding,
  "figure.walk": Accessibility,
  "figure.run": Footprints,
  "figure.seated.side": Armchair,
  "figure.strengthtraining.traditional": Dumbbell,
  "figure.mind.and.body": Flower2,
  "heart.fill": Heart,
  "heart.circle.fill": HeartPulse,
  "heart.text.square": HeartPulse,
  "bolt.heart.fill": Activity,
  "bolt.fill": Zap,
  "bolt.slash.fill": ZapOff,
  "shield.lefthalf.filled": ShieldHalf,
  "shield.fill": Shield,
  "bandage.fill": Bandage,
  "leaf.fill": Leaf,
  "link": Link,
  "lungs.fill": Wind,
  "drop.fill": Droplet,
  drop: Droplet,
  "bed.double.fill": BedDouble,
  timer: Timer,
  "checkmark.circle.fill": CircleCheck,
  "face.smiling": Smile,
  "person.2.fill": Users,
  "chart.line.uptrend.xyaxis": TrendingUp,
  "arrow.up.and.down.circle": ArrowUpDown,
  "arrow.left.and.right": ArrowLeftRight,
  "arrow.right.and.line.vertical.and.arrow.left": FoldHorizontal,
  "trophy.fill": Trophy,
  sparkles: Sparkles,
  sparkle: Sparkle,
  "calendar.badge.checkmark": CalendarCheck,
  "chevron.left": ChevronLeft,
};

/**
 * Draw an SF Symbol by its iOS name. Always decorative: every place that uses
 * one already carries the meaning in adjacent text, so the glyph is hidden from
 * screen readers rather than read out as a second, worse label.
 */
export default function SFIcon({ name, size = 24, className = "", strokeWidth = 2 }) {
  const Glyph = MAP[name] || Sparkles;
  return (
    <Glyph
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      className={className}
    />
  );
}
