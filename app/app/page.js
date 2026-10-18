import { Suspense } from "react";
import Today from "@/components/member/Today";

export const metadata = { title: "Today" };

export default function TodayPage() {
  return <Suspense fallback={<div className="p-6 text-atelier-ink2">Opening your plan…</div>}><Today /></Suspense>;
}
