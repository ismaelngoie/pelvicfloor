import DiastasisLanding from "./DiastasisLanding";
import { DEFAULT_PRICE_LABEL, DEFAULT_PRICE_PERIOD } from "@/lib/pricing";

export const metadata = {
  title: "Diastasis Recti Exercise Plan | Rebuild Your Core",
  description: `Start with 5 minutes a day for your core. Daily coach videos, simple self-assessments and a clear 90-day diastasis recti exercise plan. ${DEFAULT_PRICE_LABEL} per ${DEFAULT_PRICE_PERIOD}. Full sessions can take longer.`,
  alternates: { canonical: "https://pelvi.health/diastasis-recti" },
  openGraph: {
    title: "Your daily diastasis recti plan | Pelvi",
    description: "Start with 5 minutes a day. Daily coach videos and clear steps for your core. Full sessions can take longer.",
    url: "https://pelvi.health/diastasis-recti",
    images: [{ url: "/diastasis/at-home-1200.webp", width: 1200, height: 800, alt: "A comfortable at-home breathing practice" }],
  },
  twitter: { card: "summary_large_image", title: "Diastasis Recti Exercise Plan | Pelvi", description: "Daily coach videos. Simple self-assessments. A clear plan for your core.", images: ["/diastasis/at-home-1200.webp"] },
  keywords: ["diastasis recti exercises", "diastasis recti exercise plan", "postpartum core training", "core strength"],
};

export default function DiastasisRectiPage() {
  return <DiastasisLanding />;
}
