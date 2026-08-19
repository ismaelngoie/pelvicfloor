import { Geist, Geist_Mono } from "next/font/google";
import "./admin.css";

// /admin is the owner's private screen. It must never be indexed, never be
// previewed in a link unfurl, and never inherit the member app's light chrome.
//
// Type: Geist for the interface, Geist Mono for every figure. Both are loaded
// through next/font so the build self-hosts them and the page never waits on a
// third-party stylesheet to paint a number.
export const metadata = {
  title: "Pelvi Ops",
  description: "The Pelvi Health owner dashboard.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0B0B0F",
};

const sans = Geist({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--pv-font-sans", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--pv-font-mono", display: "swap" });

export default function AdminLayout({ children }) {
  return <div className={`${sans.variable} ${mono.variable} pv-root`}>{children}</div>;
}
