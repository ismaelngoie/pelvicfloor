import "./admin.css";

// /admin is the owner's private screen. It must never be indexed, never be
// previewed in a link unfurl, and never inherit the member app's light chrome.
export const metadata = {
  title: "Admin",
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
  themeColor: "#0B0810",
};

export default function AdminLayout({ children }) {
  return children;
}
