import DiastasisLanding from "./DiastasisLanding";
import { DEFAULT_PRICE_LABEL, DEFAULT_PRICE_PERIOD } from "@/lib/pricing";

export const metadata = {
  title: "Diastasis Recti Exercise Plan | Rebuild Your Core",
  description: `A progressive 90-day diastasis recti exercise plan, with guided videos, adjustable practice and simple check-ins. Start on your phone for ${DEFAULT_PRICE_LABEL} per ${DEFAULT_PRICE_PERIOD}.`,
  alternates: { canonical: "https://pelvi.health/diastasis-recti" },
  openGraph: {
    title: "Your core deserves a clear way forward.",
    description: "Meet your progressive 90-day core plan. Guided movement, one day at a time.",
    url: "https://pelvi.health/diastasis-recti",
    images: [{ url: "/diastasis/at-home-1200.webp", width: 1200, height: 800, alt: "A comfortable at-home breathing practice" }],
  },
  twitter: { card: "summary_large_image", title: "Diastasis Recti Exercise Plan | Pelvi", description: "A progressive 90-day core plan with guided movement, adjustable practice and simple check-ins.", images: ["/diastasis/at-home-1200.webp"] },
  keywords: ["diastasis recti exercises", "diastasis recti exercise plan", "postpartum core training", "core strength"],
};

export default function DiastasisRectiPage() {
  return <DiastasisLanding />;
}
