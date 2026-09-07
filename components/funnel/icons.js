"use client";

// SF Symbol names, drawn on the web.
//
// The iOS funnel names every glyph with an SF Symbol string, and those strings
// are copied verbatim into the copy tables so the two products can be diffed
// line by line. The web has no SF Symbols, so this file is the one place that
// decides what each name looks like here. Two rules keep it honest:
//
//   1. Never let two glyphs inside the SAME goal collapse onto one icon. A
//      constellation with three identical pictures reads as a rendering bug.
//   2. If a symbol has no close lucide match, pick the one that matches the
//      SENTENCE, not the symbol. The label is what she reads.

import {
  Accessibility, Activity, Armchair, ArrowDownCircle, ArrowLeftRight, ArrowUpDown,
  AudioLines, AudioWaveform, ChevronDown, LayoutGrid, MessageCircle, Star, Baby, BadgeCheck, Bandage, BedDouble, Briefcase, CalendarCheck,
  CalendarClock, Car, ChevronLeft, CircleCheck, Clock, Crosshair, Droplet, Droplets,
  Dumbbell, Flower2, FoldHorizontal, Footprints, GraduationCap, Grip, Heart,
  HeartHandshake, HeartPulse, Hexagon, Info, Leaf, Link, MapPin, MessagesSquare,
  Moon, MoonStar, PersonStanding, Play, Scale, Shield, ShieldHalf, Shirt, Smile,
  Sparkle, Sparkles, SquarePlay, Stethoscope, Sun, Timer, TrendingUp, Trophy,
  Users, Waves, Wind, Zap, ZapOff,
} from "lucide-react";

const MAP = {
  // The video paywall's showcase and plan list.
  "message.fill": MessageCircle,
  "waveform.circle.fill": AudioWaveform,
  "square.grid.2x2.fill": LayoutGrid,
  "star.fill": Star,
  "chevron.down": ChevronDown,
  "figure.run.circle.fill": Footprints,
  "play.rectangle.on.rectangle.fill": SquarePlay,
  "play.rectangle.fill": Play,
  "play.fill": Play,
  "bubble.left.and.bubble.right.fill": MessagesSquare,
  "bubble.left.and.text.bubble.right.fill": MessagesSquare,
  "doc.text.fill": CalendarCheck,
  "figure.child": Baby,
  "figure.and.child.holdinghands": Baby,
  "figure.stand": PersonStanding,
  "figure.dress.line.vertical.figure": Users,
  "figure.walk": Accessibility,
  "figure.run": Footprints,
  "figure.seated.side": Armchair,
  "chair.fill": Armchair,
  "figure.strengthtraining.traditional": Dumbbell,
  "dumbbell.fill": Dumbbell,
  "figure.mind.and.body": Flower2,
  "heart.fill": Heart,
  "heart.circle.fill": HeartPulse,
  "heart.text.square": HeartPulse,
  "heart.text.square.fill": HeartPulse,
  "bolt.heart.fill": Activity,
  "bolt.fill": Zap,
  "bolt.slash.fill": ZapOff,
  "shield.lefthalf.filled": ShieldHalf,
  "shield.fill": Shield,
  "checkmark.shield.fill": BadgeCheck,
  "checkmark.seal.fill": BadgeCheck,
  "bandage.fill": Bandage,
  "leaf.fill": Leaf,
  link: Link,
  "lungs.fill": Wind,
  wind: Wind,
  "drop.fill": Droplet,
  "drop.triangle.fill": Droplets,
  drop: Droplet,
  "bed.double.fill": BedDouble,
  "moon.fill": Moon,
  "moon.zzz.fill": MoonStar,
  "sun.max.fill": Sun,
  timer: Timer,
  "clock.fill": Clock,
  "calendar.badge.clock": CalendarClock,
  "calendar.badge.checkmark": CalendarCheck,
  "checkmark.circle.fill": CircleCheck,
  "face.smiling": Smile,
  "person.2.fill": Users,
  "chart.line.uptrend.xyaxis": TrendingUp,
  "arrow.up.and.down.circle": ArrowUpDown,
  "arrow.left.and.right": ArrowLeftRight,
  "arrow.right.and.line.vertical.and.arrow.left": FoldHorizontal,
  "arrow.down.heart.fill": HeartHandshake,
  "arrow.up.heart.fill": HeartPulse,
  "arrow.down.circle.fill": ArrowDownCircle,
  "scalemass.fill": Scale,
  "trophy.fill": Trophy,
  sparkles: Sparkles,
  sparkle: Sparkle,
  scope: Crosshair,
  "waveform.path": AudioLines,
  "waveform.path.ecg": Activity,
  waveform: AudioLines,
  "circle.hexagongrid.fill": Hexagon,
  "cross.case.fill": Stethoscope,
  stethoscope: Stethoscope,
  "briefcase.fill": Briefcase,
  "car.fill": Car,
  "tshirt.fill": Shirt,
  "graduationcap.fill": GraduationCap,
  "mappin.and.ellipse": MapPin,
  "info.circle.fill": Info,
  "chevron.left": ChevronLeft,
  grip: Grip,
  waves: Waves,
};

/**
 * Draw an SF Symbol by its iOS name. Always decorative: every place that uses
 * one already carries the meaning in adjacent text, so the glyph is hidden from
 * screen readers rather than read out as a second, worse label.
 */
export default function SFIcon({ name, size = 24, className = "", strokeWidth = 2, style }) {
  const Glyph = MAP[name] || Sparkles;
  return (
    <Glyph
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      className={className}
      style={style}
    />
  );
}
