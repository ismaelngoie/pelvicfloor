"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, BookOpen, FileText, Search, ShieldCheck } from "lucide-react";
import { Sheet } from "./ui";
import { useMember } from "./MemberProvider";
import { RESOURCE_ARTICLES, TRUSTED_SOURCES } from "./resourceContent";
import { memberPathway } from "@/lib/dailyTracking";

const EXCLUDED = {
  mensPelvicHealth: new Set(["Prolapse", "Diastasis Recti", "Menopause", "Intimacy & Sexual Pain", "Pregnancy", "Postpartum"]),
  womensPelvicHealth: new Set(["Prostate Recovery"]),
};

export function clinicalResourcesFor(pathway = "womensPelvicHealth", goalId, query = "") {
  const excluded = EXCLUDED[memberPathway({ pathway }, goalId)];
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const matches = (item) => !excluded.has(item.topic) && words.every((word) =>
    `${item.title} ${item.summary} ${item.topic} ${item.organization || ""}`.toLowerCase().includes(word));
  const order = (a, b) => Number(b.applicableGoals?.includes(goalId)) - Number(a.applicableGoals?.includes(goalId));
  return {
    articles: RESOURCE_ARTICLES.filter(matches).sort(order),
    sources: TRUSTED_SOURCES.filter(matches).sort(order),
  };
}

export function ClinicalSourceLinks({ sources = [], title = "Original medical sources" }) {
  if (!sources.length) return null;
  return <section className="mt-6">
    <h3 className="text-[16px] font-bold text-atelier-ink">{title}</h3>
    <ul className="mt-3 space-y-3">{sources.map((source) => <li key={source.id}>
      <a href={source.url} target="_blank" rel="noopener noreferrer" className="flex gap-3 rounded-[16px] border border-atelier-line bg-atelier-paper p-3 text-left">
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-atelier-rose" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold text-atelier-ink">{source.title}</span>
          <span className="mt-1 block text-[12px] text-atelier-ink2">{source.organization || source.source}</span>
          <span className="mt-1 block text-[11px] text-atelier-ink3">{source.evidenceLabel}{source.sourceReviewDate ? ` · Source reviewed ${source.sourceReviewDate}` : ""}</span>
        </span>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-atelier-ink3" aria-hidden="true" />
      </a>
    </li>)}</ul>
  </section>;
}

export default function ResourceCenter({ open, onClose }) {
  const { member, goalId } = useMember();
  const [article, setArticle] = useState(null);
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("");
  const resources = useMemo(() => clinicalResourcesFor(member?.pathway, goalId, query), [member?.pathway, goalId, query]);
  const topics = [...new Set([...resources.articles, ...resources.sources].map((item) => item.topic))];
  const visibleArticles = resources.articles.filter((item) => !topic || item.topic === topic);
  const visibleSources = resources.sources.filter((item) => !topic || item.topic === topic);
  return <>
    <Sheet open={open} onClose={onClose} title="Resource Center">
      <div className="pb-6">
        <p className="text-[14px] leading-snug text-atelier-ink2">Reviewed guidance for your pelvic health, with the original medical sources.</p>
        <label className="mt-4 flex items-center gap-2 rounded-full border border-atelier-line bg-atelier-paper px-4">
          <Search className="h-4 w-4 text-atelier-ink3" aria-hidden="true" />
          <input aria-label="Search resources" type="search" value={query} onChange={(event) => { setQuery(event.target.value); setTopic(""); }} placeholder="Search symptoms, topics or sources" className="h-11 min-w-0 flex-1 bg-transparent text-[14px] outline-none" />
        </label>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2 no-scrollbar" aria-label="Resource topics">
          {["", ...topics].map((value) => <button key={value} onClick={() => setTopic(value)} aria-pressed={topic === value} className={`shrink-0 rounded-full border px-3 py-2 text-[12px] font-semibold ${topic === value ? "border-atelier-rose bg-atelier-rose/10 text-atelier-rose" : "border-atelier-line text-atelier-ink2"}`}>{value || "All topics"}</button>)}
        </div>
        {visibleArticles.length > 0 && <section className="mt-5"><h3 className="font-serif text-[22px] text-atelier-ink">Clinically reviewed guides</h3>
          <ul className="mt-3 space-y-3">{visibleArticles.map((item) => <li key={item.id}><button onClick={() => setArticle(item)} className="flex w-full gap-3 rounded-[18px] border border-atelier-line bg-atelier-card p-4 text-left">
            <BookOpen className="mt-1 h-5 w-5 shrink-0 text-atelier-rose" aria-hidden="true" /><span><span className="block text-[15px] font-bold text-atelier-ink">{item.title}</span><span className="mt-1 block text-[13px] leading-snug text-atelier-ink2">{item.summary}</span><span className="mt-2 block text-[11px] text-atelier-ink3">{item.topic} · {item.evidenceLabel}</span></span>
          </button></li>)}</ul>
        </section>}
        <ClinicalSourceLinks sources={visibleSources} title="Trusted sources" />
        {!visibleArticles.length && !visibleSources.length && <p role="status" className="mt-6 text-[14px] text-atelier-ink2">No resources match that search. Try a symptom or a shorter phrase.</p>}
      </div>
    </Sheet>
    {open && article && <Sheet open onClose={() => setArticle(null)} title={article.title}>
      <div className="pb-6">
        <p className="text-[14px] text-atelier-ink2">{article.summary}</p>
        <p className="mt-3 flex items-center gap-2 text-[12px] text-atelier-ink3"><ShieldCheck className="h-4 w-4" aria-hidden="true" />{article.reviewedBy} · Sources checked {article.sourcesChecked}</p>
        <div className="mt-5 space-y-3">{article.body.map((block, index) => block.type === "h" ? <h3 key={index} className="pt-3 font-serif text-[22px] text-atelier-ink">{block.text}</h3> : <p key={index} className={`text-[15px] leading-relaxed text-atelier-ink ${block.type === "li" ? "pl-3" : ""}`}>{block.text.replace(/\*\*/g, "")}</p>)}</div>
        <section className="mt-5 rounded-[18px] bg-atelier-paper p-4"><h3 className="text-[13px] font-bold text-atelier-ink">Key takeaways</h3><ul className="mt-2 list-disc space-y-2 pl-4">{article.takeaways.map((line) => <li key={line} className="text-[14px] leading-snug text-atelier-ink">{line}</li>)}</ul></section>
        <ClinicalSourceLinks sources={article.sources} />
      </div>
    </Sheet>}
  </>;
}
