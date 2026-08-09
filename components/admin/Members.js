"use client";

// The members tab: search, sort, open one.
//
// Two layouts, one list. A real table once there is room for it, and stacked
// cards on a phone, because a seven-column table on a 375px screen is a
// horizontal scroll nobody uses.

import { useMemo, useState } from "react";
import {
  ENTITLEMENT_LABELS,
  PROGRAM_LENGTH_DAYS,
  SORT_COLUMNS,
  displayName,
  formatCount,
  formatDate,
  formatRelativeDay,
  memberInitials,
  searchMembers,
  sortMembers,
} from "@/lib/adminMetrics";
import MemberPanel from "./MemberPanel";
import { Card, EmptyState, Input, Pill, RowsSkeleton, SectionHeader } from "./ui";

function entitlementTone(value) {
  if (value === "active" || value === "ios") return "good";
  if (value === "trial") return "accent";
  if (value === "retrying") return "warn";
  if (value === "expired") return "crit";
  // "Not known here" stays grey on purpose. It is the commonest state on this
  // list, it is not a problem, and colouring it would read as one.
  return "neutral";
}

function dayLabel(member) {
  return Number.isFinite(member.programDay)
    ? `${member.programDay} of ${PROGRAM_LENGTH_DAYS}`
    : "Not started";
}

function Avatar({ member }) {
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold"
      style={{
        background: "linear-gradient(135deg, var(--pv-rose), var(--pv-violet))",
        color: "var(--pv-accent-ink)",
      }}
      aria-hidden="true"
    >
      {memberInitials(member)}
    </span>
  );
}

export function MembersSkeleton() {
  return (
    <div className="space-y-4">
      <div className="pv-skeleton h-12 w-full" />
      <RowsSkeleton rows={8} />
    </div>
  );
}

export default function Members({ members, onPatched }) {
  const [term, setTerm] = useState("");
  const [sortKey, setSortKey] = useState("lastSeenAt");
  const [sortDir, setSortDir] = useState("desc");
  const [openId, setOpenId] = useState(null);

  const rows = useMemo(() => {
    const found = searchMembers(members, term);
    return sortMembers(found, sortKey, sortDir);
  }, [members, term, sortKey, sortDir]);

  const openMember = useMemo(() => members.find((m) => m.id === openId) || null, [members, openId]);

  const toggleSort = (columnId) => {
    if (columnId === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(columnId);
      // Dates and counts are most useful biggest first; names read A to Z.
      setSortDir(columnId === "name" || columnId === "goalTitle" || columnId === "entitlement" ? "asc" : "desc");
    }
  };

  const sortLabel = (column) => {
    if (column.id !== sortKey) return "none";
    return sortDir === "asc" ? "ascending" : "descending";
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow="Everyone"
        title="Members"
        description='Search by name, email address or member id. Click anyone to see her whole record and to change it. The Subscription column says only what this dashboard can see, so most people read "Not known here" until you look them up in Stripe and mark them.'
      />

      <div className="relative">
        <Input
          type="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search members"
          aria-label="Search members by name, email or id"
          className="pl-11"
        />
        <span
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[15px]"
          style={{ color: "var(--pv-ink-3)" }}
          aria-hidden="true"
        >
          ⌕
        </span>
      </div>

      <p className="text-[13px]" style={{ color: "var(--pv-ink-2)" }} role="status">
        {term.trim()
          ? `${formatCount(rows.length)} of ${formatCount(members.length)} members match "${term.trim()}".`
          : `${formatCount(members.length)} member${members.length === 1 ? "" : "s"} in total.`}
      </p>

      {rows.length === 0 ? (
        <Card className="p-4">
          <EmptyState
            title={term.trim() ? "Nobody matches that" : "No members yet"}
            description={
              term.trim()
                ? "Try part of a first name, an email address, or the member id shown at the top of her panel."
                : "Members appear here the moment somebody finishes onboarding on the phone or signs in on the web."
            }
            icon={term.trim() ? "⌕" : "○"}
          />
        </Card>
      ) : (
        <>
          {/* Phone: stacked cards ---------------------------------------- */}
          <ul className="space-y-2 lg:hidden">
            {rows.map((member, i) => (
              <li key={member.id}>
                {/* Only spans inside: a button may not contain block elements,
                    and the whole card has to stay one tap target. */}
                <button
                  type="button"
                  onClick={() => setOpenId(member.id)}
                  className="pv-rise w-full rounded-2xl p-4 text-left"
                  style={{
                    background: "var(--pv-surface)",
                    border: "1px solid var(--pv-border)",
                    animationDelay: `${Math.min(i * 18, 240)}ms`,
                  }}
                >
                  <span className="flex items-center gap-3">
                    <Avatar member={member} />
                    <span className="min-w-0 flex-1">
                      <span
                        className="block truncate text-[15px] font-semibold"
                        style={{ color: "var(--pv-ink)" }}
                      >
                        {displayName(member)}
                      </span>
                      <span className="block truncate text-[12px]" style={{ color: "var(--pv-ink-3)" }}>
                        {member.email || "No email on record"}
                      </span>
                    </span>
                    <Pill tone={entitlementTone(member.entitlement)}>
                      {ENTITLEMENT_LABELS[member.entitlement]}
                    </Pill>
                  </span>
                  <span
                    className="mt-3 grid grid-cols-3 gap-2 border-t pt-3 text-[12px]"
                    style={{ borderColor: "var(--pv-border)" }}
                  >
                    <span className="block">
                      <span className="block" style={{ color: "var(--pv-ink-3)" }}>
                        Day
                      </span>
                      <span className="pv-tabular block font-semibold" style={{ color: "var(--pv-ink)" }}>
                        {dayLabel(member)}
                      </span>
                    </span>
                    <span className="block">
                      <span className="block" style={{ color: "var(--pv-ink-3)" }}>
                        Streak
                      </span>
                      <span className="pv-tabular block font-semibold" style={{ color: "var(--pv-ink)" }}>
                        {formatCount(member.streak)}
                      </span>
                    </span>
                    <span className="block">
                      <span className="block" style={{ color: "var(--pv-ink-3)" }}>
                        Last seen
                      </span>
                      <span className="block font-semibold" style={{ color: "var(--pv-ink)" }}>
                        {formatRelativeDay(member.lastSeenAt)}
                      </span>
                    </span>
                  </span>
                  <span className="mt-2 block truncate text-[12px]" style={{ color: "var(--pv-ink-2)" }}>
                    {member.goalTitle}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {/* Desktop: a real table --------------------------------------- */}
          <Card className="hidden overflow-hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <caption className="pv-sr">
                  Members, sortable. Use the buttons in each column heading to sort.
                </caption>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--pv-border)" }}>
                    {SORT_COLUMNS.map((column) => (
                      <th
                        key={column.id}
                        scope="col"
                        aria-sort={sortLabel(column)}
                        className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] ${
                          column.numeric ? "text-right" : ""
                        }`}
                        style={{ color: "var(--pv-ink-3)" }}
                      >
                        <button
                          type="button"
                          onClick={() => toggleSort(column.id)}
                          className="inline-flex min-h-[32px] items-center gap-1.5"
                          style={{ color: column.id === sortKey ? "var(--pv-ink)" : "var(--pv-ink-3)" }}
                        >
                          {column.label}
                          <span aria-hidden="true">
                            {column.id === sortKey ? (sortDir === "asc" ? "↑" : "↓") : "·"}
                          </span>
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Each row stays a row. The member's name is the button, so
                      the table keeps its structure and a keyboard gets one
                      clear stop per member instead of a mystery row. */}
                  {rows.map((member, i) => (
                    <tr
                      key={member.id}
                      onClick={() => setOpenId(member.id)}
                      className="pv-fade cursor-pointer transition-colors hover:brightness-125"
                      style={{
                        borderTop: i === 0 ? "none" : "1px solid var(--pv-border)",
                        animationDelay: `${Math.min(i * 10, 200)}ms`,
                      }}
                    >
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenId(member.id);
                          }}
                          className="flex w-full items-center gap-3 text-left"
                          aria-label={`Open ${displayName(member)}`}
                        >
                          <Avatar member={member} />
                          <span className="min-w-0">
                            <span className="block truncate font-semibold" style={{ color: "var(--pv-ink)" }}>
                              {displayName(member)}
                            </span>
                            <span className="block truncate text-[12px]" style={{ color: "var(--pv-ink-3)" }}>
                              {member.email || "No email on record"}
                            </span>
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-3" style={{ color: "var(--pv-ink-2)" }}>
                        {member.goalTitle}
                      </td>
                      <td className="pv-tabular px-4 py-3 text-right" style={{ color: "var(--pv-ink)" }}>
                        {dayLabel(member)}
                      </td>
                      <td className="pv-tabular px-4 py-3 text-right" style={{ color: "var(--pv-ink)" }}>
                        {formatCount(member.streak)}
                      </td>
                      <td className="px-4 py-3 text-right" style={{ color: "var(--pv-ink-2)" }}>
                        {formatRelativeDay(member.lastSeenAt)}
                      </td>
                      <td className="px-4 py-3 text-right" style={{ color: "var(--pv-ink-2)" }}>
                        {formatDate(member.joinedAt, "Not recorded")}
                      </td>
                      <td className="px-4 py-3">
                        <Pill tone={entitlementTone(member.entitlement)}>
                          {ENTITLEMENT_LABELS[member.entitlement]}
                        </Pill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {openMember ? (
        <MemberPanel
          member={openMember}
          onClose={() => setOpenId(null)}
          onPatched={(patch) => onPatched(openMember.id, patch)}
        />
      ) : null}
    </div>
  );
}
