"use client";

import { useId, useMemo, useState } from "react";
import { Card, EmptyState, Pill, SectionHeader } from "./ui";

const WIDTH = 800;
const HEIGHT = 400;

// Coarse fallback centroids only. Exact points should come from an existing
// profile city/region coordinate when available.
const COUNTRY_CENTROIDS = {
  US: [39.8, -98.6], CA: [56.1, -106.3], MX: [23.6, -102.6], BR: [-10.8, -52.9],
  AR: [-38.4, -63.6], CL: [-33.4, -70.7], CO: [4.6, -74.1], PE: [-9.2, -75.0],
  GB: [54.7, -3.4], UK: [54.7, -3.4], IE: [53.1, -8.2], FR: [46.2, 2.2],
  DE: [51.2, 10.5], ES: [40.5, -3.7], PT: [39.4, -8.2], IT: [42.8, 12.8],
  NL: [52.1, 5.3], SE: [60.1, 18.6], NO: [60.5, 8.5], PL: [52.1, 19.1], AL: [41.2, 20.2],
  NG: [9.1, 8.7], GH: [7.9, -1.0], KE: [0.2, 37.9], ZA: [-30.6, 22.9],
  EG: [26.8, 30.8], MA: [31.8, -7.1], IN: [20.6, 78.9], PK: [30.4, 69.4],
  AE: [23.4, 53.8], SA: [23.9, 45.1], CN: [35.9, 104.2], JP: [36.2, 138.3],
  KR: [36.5, 127.9], PH: [12.9, 121.8], ID: [-2.5, 118.0], AU: [-25.3, 133.8],
  NZ: [-41.0, 174.9], RU: [61.5, 105.3],
};

const COUNTRY_NAME_TO_CODE = {
  "united states": "US", usa: "US", canada: "CA", mexico: "MX", brazil: "BR",
  argentina: "AR", chile: "CL", colombia: "CO", peru: "PE", "united kingdom": "GB",
  england: "GB", ireland: "IE", france: "FR", germany: "DE", spain: "ES", portugal: "PT",
  italy: "IT", netherlands: "NL", sweden: "SE", norway: "NO", poland: "PL", albania: "AL", nigeria: "NG",
  ghana: "GH", kenya: "KE", "south africa": "ZA", egypt: "EG", morocco: "MA", india: "IN",
  pakistan: "PK", "united arab emirates": "AE", "saudi arabia": "SA", china: "CN",
  japan: "JP", "south korea": "KR", philippines: "PH", indonesia: "ID", australia: "AU",
  "new zealand": "NZ", russia: "RU",
};

function finite(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function projected(latitude, longitude) {
  return {
    x: ((longitude + 180) / 360) * WIDTH,
    y: ((90 - latitude) / 180) * HEIGHT,
  };
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function placeName(location) {
  return [text(location.city), text(location.region), text(location.country)].filter(Boolean).join(", ")
    || text(location.countryCode)
    || "Unknown location";
}

function normalizeLocations(locations) {
  if (!Array.isArray(locations)) return [];
  const resolved = [];
  for (const item of locations) {
    const location = item?.location && typeof item.location === "object" ? { ...item, ...item.location } : item || {};
    const suppliedCode = text(location.countryCode).toUpperCase();
    const code = (/^[A-Z]{2}$/.test(suppliedCode) ? suppliedCode : "")
      || COUNTRY_NAME_TO_CODE[text(location.country || location.countryCode).toLowerCase()]
      || "";
    const fallback = COUNTRY_CENTROIDS[code];
    const rawLatitude = finite(location.latitude ?? location.lat);
    const rawLongitude = finite(location.longitude ?? location.lng ?? location.lon);
    const latitude = rawLatitude ?? fallback?.[0] ?? null;
    const longitude = rawLongitude ?? fallback?.[1] ?? null;
    if (latitude === null || longitude === null || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) continue;
    const memberCount = Math.max(1, Math.round(finite(location.count ?? location.memberCount) ?? 1));
    const phase = text(location.premiumPhase ?? location.phase).toLowerCase();
    resolved.push({
      ...location,
      countryCode: code,
      latitude,
      longitude,
      approximate: rawLatitude === null || rawLongitude === null,
      count: memberCount,
      paid: Math.max(0, Math.round(finite(location.paid) ?? (phase === "paid" ? memberCount : 0))),
      trials: Math.max(0, Math.round(finite(location.trials) ?? (phase === "trial" ? memberCount : 0))),
      label: placeName(location),
    });
  }

  const grouped = new Map();
  for (const item of resolved) {
    const key = text(item.key) || `${item.label}|${item.latitude.toFixed(2)}|${item.longitude.toFixed(2)}`;
    const current = grouped.get(key);
    if (!current) grouped.set(key, { ...item, key });
    else grouped.set(key, {
      ...current,
      count: current.count + item.count,
      paid: current.paid + item.paid,
      trials: current.trials + item.trials,
      approximate: current.approximate || item.approximate,
    });
  }
  return [...grouped.values()].sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

function markerLabel(point) {
  const mix = [];
  if (point.paid) mix.push(`${point.paid} paid`);
  if (point.trials) mix.push(`${point.trials} trial${point.trials === 1 ? "" : "s"}`);
  return `${point.label}: ${point.count} active premium member${point.count === 1 ? "" : "s"}${mix.length ? `, ${mix.join(", ")}` : ""}`;
}

function LocationSummary({ point }) {
  if (!point) return null;
  return (
    <div className="rounded-2xl p-4" style={{ background: "var(--pv-surface-2)", border: "1px solid var(--pv-border)" }} aria-live="polite">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[14px] font-semibold" style={{ color: "var(--pv-ink)" }}>{point.label}</p>
          <p className="mt-1 text-[11px]" style={{ color: "var(--pv-ink-3)" }}>{point.approximate ? "Approximate country position" : "Profile city/region position"}</p>
        </div>
        <Pill tone="accent">{point.count} member{point.count === 1 ? "" : "s"}</Pill>
      </div>
      {point.paid || point.trials ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl px-3 py-2" style={{ background: "var(--pv-surface)" }}>
            <p className="text-[10px] uppercase tracking-[0.1em]" style={{ color: "var(--pv-ink-3)" }}>Paid</p>
            <p className="pv-tabular mt-1 text-[18px] font-semibold" style={{ color: "var(--pv-good)" }}>{point.paid}</p>
          </div>
          <div className="rounded-xl px-3 py-2" style={{ background: "var(--pv-surface)" }}>
            <p className="text-[10px] uppercase tracking-[0.1em]" style={{ color: "var(--pv-ink-3)" }}>Trial</p>
            <p className="pv-tabular mt-1 text-[18px] font-semibold" style={{ color: "var(--pv-violet)" }}>{point.trials}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * A dependency-free geographic overview. Locations are deliberately coarse;
 * this component never requests GPS or calls an external map service.
 */
export default function PremiumMemberMap({
  locations = [],
  activePremiumTotal = null,
  title = "Where active premium members are",
  description = "A coarse geographic view from location already present in member profiles. Markers are not live GPS positions.",
  unavailableReason = "No active premium profile currently has a usable city, country, or coordinate.",
}) {
  const points = useMemo(() => normalizeLocations(locations), [locations]);
  const [selectedKey, setSelectedKey] = useState(null);
  const rawId = useId();
  const mapId = `pv-map-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const selected = points.find((point) => point.key === selectedKey) || points[0] || null;
  const plotted = points.reduce((sum, point) => sum + point.count, 0);
  const total = finite(activePremiumTotal);
  const countries = new Set(points.map((point) => point.countryCode || point.country || point.label)).size;

  return (
    <section aria-labelledby="premium-map-heading">
      <SectionHeader
        id="premium-map-heading"
        eyebrow="Premium geography"
        title={title}
        description={description}
        action={<Pill tone="accent">{points.length ? `${countries} countr${countries === 1 ? "y" : "ies"}` : "No locations"}</Pill>}
      />

      <Card className="overflow-hidden p-4 sm:p-6">
        {!points.length ? (
          <EmptyState title="No member locations to plot yet" description={unavailableReason} icon="⌖" />
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_250px]">
            <div className="relative overflow-hidden rounded-2xl" style={{ background: "var(--pv-surface-2)", border: "1px solid var(--pv-border)" }}>
              <div className="absolute left-4 top-4 z-10 rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ background: "var(--pv-surface-solid)", border: "1px solid var(--pv-border)", color: "var(--pv-ink-2)" }}>
                {plotted.toLocaleString("en-US")}{total !== null ? ` of ${Math.round(total).toLocaleString("en-US")}` : ""} located
              </div>

              <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="block h-auto min-h-[260px] w-full" role="group" aria-label="Approximate map of active premium member locations">
                <defs>
                  <radialGradient id={`${mapId}-glow`}>
                    <stop offset="0%" stopColor="var(--pv-rose)" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="var(--pv-rose)" stopOpacity="0" />
                  </radialGradient>
                  <linearGradient id={`${mapId}-land`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="var(--pv-violet)" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="var(--pv-rose)" stopOpacity="0.08" />
                  </linearGradient>
                </defs>

                {[100, 200, 300].map((y) => <line key={`lat-${y}`} x1="0" x2={WIDTH} y1={y} y2={y} stroke="var(--pv-grid)" strokeWidth="1" />)}
                {[100, 200, 300, 400, 500, 600, 700].map((x) => <line key={`lng-${x}`} y1="0" y2={HEIGHT} x1={x} x2={x} stroke="var(--pv-grid)" strokeWidth="1" />)}

                {/* Deliberately quiet continent silhouettes: geographic context, not a navigation map. */}
                <g fill={`url(#${mapId}-land)`} stroke="var(--pv-border-strong)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" aria-hidden="true">
                  <path d="M54 90 L92 55 160 49 205 74 226 110 208 139 172 147 153 174 121 164 105 134 76 125 55 106 Z" />
                  <path d="M190 173 L222 185 240 226 229 277 207 329 187 302 174 257 164 218 Z" />
                  <path d="M347 78 L382 60 419 69 430 87 457 80 486 93 500 119 477 138 446 133 425 151 390 142 365 119 338 107 Z" />
                  <path d="M393 155 L438 151 469 179 461 226 437 287 407 308 384 259 375 205 Z" />
                  <path d="M468 91 L524 62 588 65 625 85 687 92 737 119 719 151 669 159 633 145 608 165 563 152 538 131 498 134 Z" />
                  <path d="M618 244 L660 224 706 242 721 277 687 299 646 291 611 269 Z" />
                  <path d="M746 309 L758 299 769 313 757 325 Z" />
                  <path d="M329 54 L342 37 359 42 353 60 Z" />
                </g>

                {points.map((point) => {
                  const { x, y } = projected(point.latitude, point.longitude);
                  const selectedPoint = selected?.key === point.key;
                  const radius = Math.min(15, 5 + Math.sqrt(point.count) * 2.2);
                  return (
                    <g
                      key={point.key}
                      role="button"
                      tabIndex={0}
                      aria-label={markerLabel(point)}
                      aria-pressed={selectedPoint}
                      onClick={() => setSelectedKey(point.key)}
                      onFocus={() => setSelectedKey(point.key)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedKey(point.key);
                        }
                      }}
                      className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                      style={{ cursor: "pointer" }}
                    >
                      <circle cx={x} cy={y} r={radius * 2.3} fill={`url(#${mapId}-glow)`} opacity={selectedPoint ? 1 : 0.6} aria-hidden="true" />
                      <circle cx={x} cy={y} r={radius} fill={point.trials > point.paid ? "var(--pv-violet)" : "var(--pv-rose)"} stroke="var(--pv-accent-ink)" strokeWidth={selectedPoint ? 3 : 1.5} vectorEffect="non-scaling-stroke">
                        <title>{markerLabel(point)}</title>
                      </circle>
                      {point.count > 1 ? <text x={x} y={y + 3.5} textAnchor="middle" fontSize="9" fontWeight="700" fill="var(--pv-accent-ink)" aria-hidden="true">{point.count}</text> : null}
                    </g>
                  );
                })}
              </svg>
            </div>

            <aside className="space-y-3" aria-label="Location details">
              <LocationSummary point={selected} />
              <div className="max-h-[230px] space-y-1 overflow-y-auto pr-1">
                {points.map((point) => (
                  <button
                    key={point.key}
                    type="button"
                    onClick={() => setSelectedKey(point.key)}
                    className="flex min-h-[44px] w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left"
                    style={{
                      background: selected?.key === point.key ? "var(--pv-surface-2)" : "transparent",
                      border: `1px solid ${selected?.key === point.key ? "var(--pv-border-strong)" : "transparent"}`,
                    }}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[12px] font-semibold" style={{ color: "var(--pv-ink)" }}>{point.label}</span>
                      <span className="mt-0.5 block text-[10px]" style={{ color: "var(--pv-ink-3)" }}>{point.approximate ? "Approximate" : "Profile location"}</span>
                    </span>
                    <span className="pv-tabular text-[13px] font-semibold" style={{ color: "var(--pv-ink-2)" }}>{point.count}</span>
                  </button>
                ))}
              </div>
              {total !== null && plotted < total ? (
                <p className="text-[10px] leading-relaxed" style={{ color: "var(--pv-ink-3)" }}>{Math.max(0, Math.round(total - plotted)).toLocaleString("en-US")} active premium profile{Math.round(total - plotted) === 1 ? " has" : "s have"} no usable location and {Math.round(total - plotted) === 1 ? "is" : "are"} not plotted.</p>
              ) : null}
            </aside>
          </div>
        )}
      </Card>
    </section>
  );
}

export { COUNTRY_CENTROIDS, LocationSummary, normalizeLocations };
