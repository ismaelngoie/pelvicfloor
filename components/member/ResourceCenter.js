"use client";

// The Resource Center, ported from
// "Pelvic Floor/Scene/Main/Hub/Health Resources/HealthResourcesView.swift".
//
// Three shelves — Safety First, Understanding Your Body, Trusted Sources — the
// same five articles and the same three outside links, in the same order. The
// phone scrolls each shelf horizontally; so does this, and each card is the
// same shape.
//
// The copy lives in resourceContent.js. Read the note at the top of it before
// touching a word: three of these five are safety articles.

import { useState } from "react";
import { ArrowUpRight, Brain, CircleHelp, FileText, PersonStanding, ShieldAlert, Stethoscope } from "lucide-react";
import { Sheet } from "./ui";
import { RESOURCE_ARTICLES, RESOURCE_CATEGORIES, TRUSTED_SOURCES } from "./resourceContent";

const ICONS = {
  whenToSeeADoctor: Stethoscope,
  isSorenessNormal: CircleHelp,
  medicalDisclaimer: ShieldAlert,
  anatomyOfThePelvicFloor: PersonStanding,
  mindBodyConnection: Brain,
};

export default function ResourceCenter({ open, onClose }) {
  const [article, setArticle] = useState(null);

  return (
    <>
      <Sheet open={open} onClose={onClose} title="Resource Center">
        <div className="pb-6">
          <p className="text-[13.5px] leading-snug text-app-textSecondary">
            Trusted answers about your body, and the three things that mean it is
            time to call a doctor.
          </p>

          {RESOURCE_CATEGORIES.map((category) => (
            <section key={category.id} className="mt-5">
              <h3 className="text-[17px] font-bold text-app-textPrimary">{category.title}</h3>
              <ul className="mt-2.5 flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                {category.id === "clinicalReferences"
                  ? TRUSTED_SOURCES.map((source) => (
                      <li key={source.id}>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-[160px] w-[220px] shrink-0 flex-col rounded-[18px] border border-black/[0.06] bg-white p-4"
                        >
                          <FileText className="h-5 w-5 text-blue-500" aria-hidden="true" />
                          <span className="mt-2 block text-[15px] font-bold leading-tight text-app-textPrimary">
                            Trusted Source
                          </span>
                          <span className="mt-1 block text-[12px] leading-snug text-app-textSecondary">
                            Read the full guidance from {source.host}.
                          </span>
                          <span className="mt-auto flex items-center gap-1 text-[11px] font-medium text-app-textSecondary">
                            Source: {source.source}
                            <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                          </span>
                        </a>
                      </li>
                    ))
                  : RESOURCE_ARTICLES.filter((a) => a.category === category.id).map((item) => {
                      const Icon = ICONS[item.id] || FileText;
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => setArticle(item)}
                            className="flex h-[160px] w-[220px] shrink-0 flex-col rounded-[18px] border border-black/[0.06] bg-white p-4 text-left"
                          >
                            <Icon className="h-5 w-5" style={{ color: item.accent }} aria-hidden="true" />
                            <span className="mt-2 block text-[15px] font-bold leading-tight text-app-textPrimary">
                              {item.title}
                            </span>
                            <span className="mt-1 block text-[12px] leading-snug text-app-textSecondary">
                              {item.summary}
                            </span>
                          </button>
                        </li>
                      );
                    })}
              </ul>
            </section>
          ))}
        </div>
      </Sheet>

      {article && (
        <Sheet open onClose={() => setArticle(null)} title={article.title}>
          <div className="pb-6">
            <p className="text-[13.5px] text-app-textSecondary">{article.summary}</p>
            <div className="mt-4 space-y-3">
              {article.body.map((block, index) =>
                block.type === "h" ? (
                  <h3 key={index} className="text-[17px] font-bold text-app-textPrimary">
                    {block.text}
                  </h3>
                ) : block.type === "li" ? (
                  <p key={index} className="flex items-start gap-2.5 text-[15px] leading-snug text-app-textPrimary">
                    <span
                      className="mt-[8px] h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: article.accent }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0">{block.text}</span>
                  </p>
                ) : (
                  <p key={index} className="text-[15px] leading-snug text-app-textPrimary">
                    {block.text}
                  </p>
                )
              )}
            </div>

            <div className="mt-5 rounded-[18px] bg-app-background p-4">
              <p className="text-[13px] font-bold uppercase tracking-wider text-app-textSecondary">
                Key takeaways
              </p>
              <ul className="mt-2 space-y-2">
                {article.takeaways.map((line) => (
                  <li key={line} className="flex items-start gap-2.5 text-[14px] leading-snug text-app-textPrimary">
                    <span
                      className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: article.accent }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0">{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Sheet>
      )}
    </>
  );
}
