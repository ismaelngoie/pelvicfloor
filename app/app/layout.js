import "./app.css";
import MemberFrame from "@/components/member/MemberFrame";

// The member app is behind a gate and has nothing a search engine should hold.
export const metadata = {
  title: "Your Plan",
  robots: { index: false, follow: false },
};

export default function AppLayout({ children }) {
  return <MemberFrame>{children}</MemberFrame>;
}
