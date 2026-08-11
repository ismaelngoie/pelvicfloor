"use client";

// The Audience tab: every email address the business has ever captured, and the
// buttons that turn them into an ad platform upload.
//
// WHY IT IS A SEPARATE TAB AND NOT PART OF MEMBERS. The Members tab answers
// "who is using the product". This one answers "who did we get the address of,
// and did she buy" — including several hundred women who are not members at
// all, because they opened the checkout sheet, typed an address and then closed
// it. Those two lists barely overlap and they are read for opposite reasons.
//
// IT LOADS ITSELF, LAZILY. Everything else in /admin runs on the one Firestore
// read the dashboard does on sign-in. This tab additionally needs Stripe, which
// costs a round trip through our own Worker, so it fetches only when the tab is
// actually opened. The sidebar's "Count again" bumps `reloadToken` and this
// refetches with it.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AUDIENCE_RANGES,
  AUDIENCE_SEGMENTS,
  AUDIENCE_STATUSES,
  AUDIENCE_STATUS_LABELS,
  audienceCounts,
  audienceCsv,
  audienceDetailCsv,
  audienceDetailFilename,
  audienceFilename,
  audienceRangeById,
  audienceTone,
  downloadCsv,
  fetchStripeAudience,
  mergeAudience,
  rowsForSegment,
  searchAudience,
  sourceLabel,
  withinRange,
} from "@/lib/adminAudience";
import { formatCount, formatDate, formatDateTime, formatPercent } from "@/lib/adminMetrics";
import { FIXTURES_ON } from "@/lib/devFixtures";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  Pill,
  RowsSkeleton,
  SectionHeader,
  Segmented,
  TileSkeleton,
} from "./ui";

/* -------------------------------------------------------------------------
   Tiles
   ------------------------------------------------------------------------- */

function Tile({ label, value, explanation, hero = false, delay = 0 }) {
  return (
    <Card className="pv-rise flex flex-col p-5" style={{ animationDelay: `${delay}ms` }}>
      <p
        className="text-[11px] font-semibold uppercase tracking-[0.14em]"
        style={{ color: "var(--pv-ink-3)" }}
      >
        {label}
      </p>
      <p
        className={`pv-figure mt-2 font-semibold ${hero ? "text-[52px] leading-[1.02]" : "text-[34px] leading-[1.1]"}`}
        style={{ color: "var(--pv-ink)" }}
      >
        {value}
      </p>
      <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "var(--pv-ink-2)" }}>
        {explanation}
      </p>
    </Card>
  );
}

export function AudienceSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <TileSkeleton key={i} />
        ))}
      </div>
      <div className="pv-skeleton h-40 w-full" />
      <RowsSkeleton rows={8} />
    </div>
  );
}

/* -------------------------------------------------------------------------
   The tab
   ------------------------------------------------------------------------- */

export default function Audience({ members, user, reloadToken = 0 }) {
  const [stripe, setStripe] = useState(null);
  const [state, setState] = useState("loading");
  const [error, setError] = useState("");

  const [rangeId, setRangeId] = useState("all");
  const [filter, setFilter] = useState("all");
  const [term, setTerm] = useState("");

  const load = useCallback(async () => {
    setState((current) => (current === "ready" ? "refreshing" : "loading"));
    setError("");
    try {
      let next;
      // Local QA only, and dead code in a production bundle. The NODE_ENV test
      // is written here as a literal so webpack can delete the branch and the
      // dynamic import with it. See lib/devFixtures.js.
      if (process.env.NODE_ENV !== "production" && FIXTURES_ON) {
        const f = await import("@/lib/devFixtureData");
        next = f.fixtureStripeAudience();
      } else {
        next = await fetchStripeAudience(user);
      }
      setStripe(next);
      setState("ready");
    } catch (err) {
      setError(err?.message || "Stripe did not answer.");
      setState("error");
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load, reloadToken]);

  const allRows = useMemo(
    () => mergeAudience(stripe?.rows || [], members || []),
    [stripe, members]
  );

  const now = useMemo(() => stripe?.fetchedAt || new Date(), [stripe]);
  const windowed = useMemo(() => withinRange(allRows, rangeId, now), [allRows, rangeId, now]);
  const counts = useMemo(() => audienceCounts(windowed.rows), [windowed]);

  const visible = useMemo(() => {
    const byStatus =
      filter === "all" ? windowed.rows : windowed.rows.filter((row) => row.status === filter);
    return searchAudience(byStatus, term);
  }, [windowed, filter, term]);

  const range = audienceRangeById(rangeId);

  if (state === "loading") return <AudienceSkeleton />;

  if (state === "error") {
    return (
      <Card className="p-4">
        <ErrorState title="The audience did not load" description={error} onRetry={load} />
      </Card>
    );
  }

  return (
    <div
      className="space-y-8"
      style={{ opacity: state === "refreshing" ? 0.6 : 1, transition: "opacity 160ms ease" }}
    >
      <SectionHeader
        eyebrow="Everyone whose address we have"
        title="Audience"
        description="Every email address this business has captured, in one list, with what happened next. Stripe supplies everybody who opened the checkout sheet and typed an address — it makes the customer record before it takes a card, so the women who did not pay are in here too. Firestore supplies the members. The two are joined on the address."
        action={
          <Segmented
            label="Which addresses to count, by when they were first seen"
            value={rangeId}
            onChange={setRangeId}
            options={AUDIENCE_RANGES.map((r) => ({ value: r.id, label: r.label }))}
          />
        }
      />

      {stripe?.truncated ? (
        <Card className="p-4" style={{ borderColor: "var(--pv-warn)" }}>
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--pv-ink)" }}>
            <strong>This list is a floor, not a total.</strong> Stripe holds more records than one
            request will walk, so everything below counts the first{" "}
            {formatCount(stripe.ceiling)} customers and no further. Raise MAX_PAGES in
            functions/api/audience.js when this appears.
          </p>
        </Card>
      ) : null}

      {/* --- The numbers ------------------------------------------------- */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile
          label="Addresses captured"
          value={formatCount(counts.total)}
          hero
          explanation={`Unique email addresses, ${range.days ? `first seen in ${range.longLabel}` : "all time"}. Counted once each: an address on two Stripe customers and a member record is one woman here.`}
        />
        <Tile
          label="Paid"
          value={formatCount(counts.paid)}
          delay={40}
          explanation={`Has a live subscription now, or a member record showing an App Store purchase. ${formatCount(counts.payingNow)} of them are live in Stripe.`}
        />
        <Tile
          label="Did not pay"
          value={formatCount(counts.abandoned)}
          delay={80}
          explanation="Opened the checkout, typed an address, no payment ever cleared, and no member record. This is the win-back list."
        />
        <Tile
          label="Checkout to paid"
          value={
            counts.conversion === null
              ? "No checkouts yet"
              : formatPercent(counts.everPaidInStripe, counts.startedCheckout)
          }
          delay={120}
          explanation={`${formatCount(counts.everPaidInStripe)} of the ${formatCount(counts.startedCheckout)} women who reached the checkout sheet and typed an address have paid us at some point. App Store members are in neither half — they never touched this checkout.`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Tile
          label="Paid before, not now"
          value={formatCount(counts.lapsed)}
          explanation="Cancelled, or a card Stripe gave up retrying. Kept out of the did-not-pay export on purpose: she is a former customer, not a stranger."
        />
        <Tile
          label="App members"
          value={formatCount(counts.app)}
          explanation="A member record and no Stripe history at all. Almost always iPhone, where the App Store takes the payment and this dashboard cannot see it."
        />
        <Tile
          label="Counted"
          value={stripe?.fetchedAt ? formatDate(stripe.fetchedAt) : "Just now"}
          explanation={`Read from Stripe at ${formatDateTime(now)}. Press Count again in the sidebar to read it fresh.${windowed.undated ? ` ${formatCount(windowed.undated)} row${windowed.undated === 1 ? " has" : "s have"} no first-seen date and only appear under All time.` : ""}${stripe?.withoutEmail ? ` ${formatCount(stripe.withoutEmail)} Stripe customer${stripe.withoutEmail === 1 ? " has" : "s have"} no address at all and cannot be counted here.` : ""}`}
        />
      </div>

      {/* --- The exports ------------------------------------------------- */}

      <Card className="p-5">
        <h3 className="text-lg font-semibold" style={{ color: "var(--pv-ink)" }}>
          Download for Google Ads and Meta
        </h3>
        <p className="mt-2 max-w-3xl text-[13px] leading-relaxed" style={{ color: "var(--pv-ink-2)" }}>
          Each file has <strong>one column, headed Email</strong>, one address per line. That is
          what Google Ads Customer Match reads without a mapping step, and what Meta Custom
          Audiences maps in one click. Do not add columns to these files before uploading: Google
          rejects columns it does not recognise, and it wants first name, last name, country and
          postcode together or not at all. Do not hash the addresses either — both platforms hash
          them in your browser as they upload, and a pre-hashed list matches nobody.
        </p>
        <p className="mt-2 max-w-3xl text-[13px] leading-relaxed" style={{ color: "var(--pv-ink-2)" }}>
          The file is built here, in this browser, from the rows already on screen. Nothing is
          uploaded anywhere by pressing these. Each one respects the window and gives you{" "}
          <strong>{range.days ? range.longLabel : "the whole history"}</strong>.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {AUDIENCE_SEGMENTS.map((segment) => {
            const rows = rowsForSegment(windowed.rows, segment.id);
            return (
              <div
                key={segment.id}
                className="flex flex-col rounded-2xl p-4"
                style={{ background: "var(--pv-surface-2)", border: "1px solid var(--pv-border)" }}
              >
                <p className="text-[14px] font-semibold" style={{ color: "var(--pv-ink)" }}>
                  {segment.label}
                </p>
                <p className="pv-tabular mt-1 text-[22px] font-semibold" style={{ color: "var(--pv-ink)" }}>
                  {formatCount(rows.length)}
                </p>
                <p className="mt-1.5 flex-1 text-[12px] leading-relaxed" style={{ color: "var(--pv-ink-3)" }}>
                  {segment.note}
                </p>
                <Button
                  variant="ghost"
                  className="mt-3 w-full"
                  disabled={rows.length === 0}
                  onClick={() => downloadCsv(audienceFilename(segment.id, now), audienceCsv(rows))}
                >
                  {rows.length === 0 ? "Nobody yet" : `Download ${formatCount(rows.length)}`}
                </Button>
              </div>
            );
          })}
        </div>

        <div
          className="mt-4 flex flex-wrap items-center gap-3 border-t pt-4"
          style={{ borderColor: "var(--pv-border)" }}
        >
          <Button
            variant="quiet"
            disabled={windowed.rows.length === 0}
            onClick={() =>
              downloadCsv(audienceDetailFilename(now), audienceDetailCsv(windowed.rows))
            }
          >
            Download everything, with detail
          </Button>
          <p className="text-[12px] leading-relaxed" style={{ color: "var(--pv-ink-3)" }}>
            Address, name, status, where it came from, first seen and the Stripe subscription word.
            For a spreadsheet and your own records — <strong>not</strong> for uploading to an ad
            platform, because the extra columns are what makes Customer Match reject a file. The
            goal she picked is not in any of these files, and not in the data this screen fetches:
            it is health information, and it must never travel with a marketing list.
          </p>
        </div>
      </Card>

      {/* --- The list ---------------------------------------------------- */}

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Segmented
            label="Filter the list by what happened"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: `All ${formatCount(windowed.rows.length)}` },
              ...AUDIENCE_STATUSES.map((s) => ({ value: s.id, label: s.label })),
            ]}
          />
          <div className="relative w-full sm:w-80">
            <Input
              type="search"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search addresses"
              aria-label="Search the audience by email address, name or status"
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
        </div>

        {filter !== "all" ? (
          <p className="max-w-3xl text-[13px] leading-relaxed" style={{ color: "var(--pv-ink-2)" }}>
            {AUDIENCE_STATUSES.find((s) => s.id === filter)?.meaning}
          </p>
        ) : null}

        {visible.length === 0 ? (
          <Card className="p-4">
            <EmptyState
              title={term.trim() ? "Nobody matches that" : "No addresses in this window"}
              description={
                term.trim()
                  ? "Try part of an address or a name."
                  : "Nothing has been captured in the window you picked. Switch to All time to see the whole history."
              }
              icon={term.trim() ? "⌕" : "○"}
            />
          </Card>
        ) : (
          <>
            {/* Phone: stacked cards. A five-column table at 375px is a
                horizontal scroll nobody uses. */}
            <ul className="space-y-2 tab:hidden">
              {visible.slice(0, 400).map((row) => (
                <li
                  key={row.email}
                  className="rounded-2xl p-4"
                  style={{ background: "var(--pv-surface)", border: "1px solid var(--pv-border)" }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p
                        className="truncate text-[14px] font-semibold"
                        style={{ color: "var(--pv-ink)" }}
                      >
                        {row.email}
                      </p>
                      <p className="truncate text-[12px]" style={{ color: "var(--pv-ink-3)" }}>
                        {row.name || "No name given"}
                      </p>
                    </div>
                    <Pill tone={audienceTone(row.status)}>{AUDIENCE_STATUS_LABELS[row.status]}</Pill>
                  </div>
                  <div
                    className="mt-3 grid grid-cols-2 gap-2 border-t pt-3 text-[12px]"
                    style={{ borderColor: "var(--pv-border)" }}
                  >
                    <div>
                      <p style={{ color: "var(--pv-ink-3)" }}>First seen</p>
                      <p className="font-semibold" style={{ color: "var(--pv-ink)" }}>
                        {formatDate(row.firstSeenAt, "Not known")}
                      </p>
                    </div>
                    <div>
                      <p style={{ color: "var(--pv-ink-3)" }}>Where from</p>
                      <p className="font-semibold" style={{ color: "var(--pv-ink)" }}>
                        {sourceLabel(row.source)}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Tablet and up: a real table. Flat and solid, because the sticky
                header needs an opaque background to sit on. */}
            <Card
              flat
              className="hidden overflow-hidden tab:block"
              style={{ background: "var(--pv-surface-solid)" }}
            >
              <div className="pv-table-scroll">
                <table className="w-full min-w-[720px] text-left text-[13px]">
                  <caption className="pv-sr">
                    Captured email addresses, newest first, with what happened after each one was
                    captured.
                  </caption>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--pv-border)" }}>
                      {["Email address", "Name", "Status", "Where from", "First seen"].map(
                        (heading, i) => (
                          <th
                            key={heading}
                            scope="col"
                            className={`pv-th px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] ${
                              i === 4 ? "text-right" : ""
                            }`}
                            style={{ color: "var(--pv-ink-3)" }}
                          >
                            {heading}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {visible.slice(0, 400).map((row, i) => (
                      <tr
                        key={row.email}
                        style={{ borderTop: i === 0 ? "none" : "1px solid var(--pv-border)" }}
                      >
                        <td className="px-4 py-3 font-semibold" style={{ color: "var(--pv-ink)" }}>
                          {row.email}
                        </td>
                        <td className="px-4 py-3" style={{ color: "var(--pv-ink-2)" }}>
                          {row.name || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Pill tone={audienceTone(row.status)}>
                            {AUDIENCE_STATUS_LABELS[row.status]}
                          </Pill>
                        </td>
                        <td className="px-4 py-3" style={{ color: "var(--pv-ink-2)" }}>
                          {sourceLabel(row.source)}
                        </td>
                        <td className="px-4 py-3 text-right" style={{ color: "var(--pv-ink-2)" }}>
                          {formatDate(row.firstSeenAt, "Not known")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {visible.length > 400 ? (
              <p className="text-[13px]" style={{ color: "var(--pv-ink-3)" }}>
                Showing the newest 400 of {formatCount(visible.length)}. The CSV downloads above
                are never truncated — they contain every row in the window.
              </p>
            ) : null}
          </>
        )}
      </div>

      {/* --- What each word means ---------------------------------------- */}

      <Card className="p-5">
        <h3 className="text-lg font-semibold" style={{ color: "var(--pv-ink)" }}>
          What each word on this screen means
        </h3>
        <dl className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {AUDIENCE_STATUSES.map((status) => (
            <div key={status.id}>
              <dt className="mb-1.5">
                <Pill tone={status.tone}>{status.label}</Pill>
              </dt>
              <dd className="text-[13px] leading-relaxed" style={{ color: "var(--pv-ink-2)" }}>
                {status.meaning}
              </dd>
            </div>
          ))}
        </dl>
        <p
          className="mt-5 border-t pt-4 text-[13px] leading-relaxed"
          style={{ borderColor: "var(--pv-border)", color: "var(--pv-ink-2)" }}
        >
          <strong>Before you upload anything.</strong> The privacy policy tells her, in section 2
          and section 5, that her address may be used to contact her about the product and may go
          into an advertising audience. Keep that true. Never build an audience out of a health
          answer — the goal she picked, the conditions she ticked — which is both a promise this
          site makes her and a rule Google enforces. If somebody asks to be left out, delete her
          from the ad platform as well as from here.
        </p>
      </Card>
    </div>
  );
}
