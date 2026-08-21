import { Geist, Geist_Mono } from "next/font/google";
import "./video.css";

export const metadata = {
  title: "Pelvi Video Factory",
  description: "Private Pelvi Health video production studio.",
  robots: { index: false, follow: false, nocache: true },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#100A12",
};

const sans = Geist({ subsets: ["latin"], variable: "--vf-sans", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--vf-mono", display: "swap" });

export default function VideoLayout({ children }) {
  return <div className={`${sans.variable} ${mono.variable} vf-root`}>{children}</div>;
}
