import StartClient from "./StartClient";

export const metadata = {
  title: "Your Pelvi plan",
  description: "Your payment confirmation and diastasis recti plan.",
  robots: { index: false, follow: false },
};

export default function DiastasisStartPage() { return <StartClient />; }
