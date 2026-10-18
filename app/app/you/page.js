import { Suspense } from "react";
import You from "@/components/member/You";

export const metadata = { title: "You" };

export default function YouPage() {
  return <Suspense fallback={<div className="p-6 text-atelier-ink2">Opening your plan…</div>}><You /></Suspense>;
}
