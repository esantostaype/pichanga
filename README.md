# Pichanga

Office match lineup: a full-screen football pitch where signed-up players
appear from the center and spread outwards, always symmetric, updating live for
everyone watching.

## Stack

| Piece | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router, React 19) |
| Styling | Tailwind CSS v4, shadcn/ui components on Radix |
| Database | Turso (libSQL) with Drizzle ORM |
| Realtime | Pusher Channels |
| Images | Cloudinary |
| Venue search | Google Places API (New), optional |
| Animation | GSAP (`@gsap/react`) |
| Icons | Hugeicons |
| Typography | Sofia Sans (UI), Sofia Sans Extra Condensed 500 (display) |
| Forms | React Hook Form + Zod, shadcn date picker (react-day-picker) |

## Getting started

```bash
npm install
```

Copy `.env.example` to `.env.local` and fill in the Turso, Pusher and Cloudinary
credentials. Then:

```bash
npm run db:push
npm run dev
```

### Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `start` | Production build and start |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generates migration SQL from the schema |
| `npm run db:push` | Applies the schema to Turso |
| `npm run db:studio` | Drizzle data browser |
| `npm run db:seed` | Creates tables and seeds sample data |

`db:seed` refuses to write to a remote database unless `--yes` is passed, and
accepts `--db=file:local.db` to work against a local SQLite file.

## How the pitch works

The whole layout is computed in real container pixels, measured with a
`ResizeObserver`:

- **`src/lib/pitch-geometry.ts`** resolves boxes, arcs, corners and goals in a
  `(length, width)` space and then projects them to `(x, y)`. On landscape or
  square screens the boxes sit left and right; on portrait screens, top and
  bottom. The SVG uses `viewBox="0 0 width height"` in pixels, so **the center
  circle and the arcs are never distorted**: they only change size with the
  device.
- **`src/lib/formation.ts`** spreads any number of players across a grid of rows and
  lanes chosen to keep cells as square as possible. Leftovers go to the central
  rows and every row is centered on the long axis, so the lineup is always
  mirror-symmetric. Positions are sorted by distance to the center: the first
  player signed up takes the center circle and each new one lands further out.
- **`src/components/pitch/lineup-layer.tsx`** animates with GSAP: new tokens are
  born in the center and travel to their spot while the rest reshuffle.

There is **no player cap**: the grid grows with the squad and the token size
derives from the real gap between neighbours, which changes with orientation.
Tokens shrink as the lineup grows (84px down to a 16px floor), so a large squad
still fits on a portrait phone as well as on a wide monitor.

> **Note on the date and time fields.** The date picker is the shadcn recipe
> (`Calendar` + `Popover` over react-day-picker). shadcn/ui ships no time
> picker, so `ui/time-picker.tsx` is a matching one: the same popover, with
> scrollable hour and minute columns instead of a month grid. Both share
> `ui/picker-trigger.tsx`, so the two fields are pixel-identical. Values stay on
> the native contracts, `yyyy-MM-dd` and `HH:mm`.

## Structure

```
src/
  app/
    api/            REST routes (players, matches, lineup, photo upload)
    layout.tsx      fonts, dark theme, toaster
    page.tsx        server-side initial load
  components/
    layout/         HUD, menu, brand, setup notice
    matches/        drawer, form and "add players" dialog
    pitch/          pitch, SVG surface, tokens and lineup layer
    places/         drawer, form and Google autocomplete field
    players/        drawer, form, picker and avatar
    providers/      shared state + Pusher subscription
    ui/             shadcn/ui primitives
  db/               Drizzle schema and queries
  hooks/            realtime, element measuring, mutations with toasts
  lib/              geometry, formation, validators, service clients
  types/            serializable domain types
```

## Auth

One shared password, no user table. `AUTH_SECRET` signs an HttpOnly session
cookie and `ADMIN_PASSWORD` is what you type to get it. With either missing,
sign-in is disabled and the app stays in guest mode — it fails closed, never
open.

`src/proxy.ts` guards the API. In Next 16 this file convention is **`proxy`**,
not `middleware`. It is deliberately dependency-free and runs on Web Crypto so
the exact same verification works there and in route handlers.

A guest fully manages **players** and the **lineup** — the part the whole
office touches. The **fixture** itself, matches and places, needs the session.

| | Guest | Admin |
| --- | --- | --- |
| Read anything, browse all three panels | yes | yes |
| Create / edit / delete players | yes | yes |
| Upload a player photo | yes | yes |
| Add players to a match, drop them | yes | yes |
| Create / edit / delete matches | no | yes |
| Create / edit / delete places | no | yes |
| Google venue search | no | yes |

The venue autocomplete is a `GET` but sits behind the session anyway: every
call costs money on the Google bill.

The UI mirrors the same rules — a guest sees the three drawers but without
their create, edit and delete controls — while the proxy is what actually
enforces them, so a hidden button is never the only thing standing in the way.

## Places

Venues live in their own table and matches point at them, so a pitch is typed
once and reused. `PlaceFormDialog` can autocomplete through the Google Places
API (New): pick a suggestion and name, address, coordinates and the clickable
maps link are filled in.

The API key is **optional and server-side only**. Requests go through
`/api/places/search`, which proxies Google so the key never reaches the browser.
Without `GOOGLE_MAPS_API_KEY` the route answers `503`, the search box is not
rendered at all and the form falls back to typing name and address by hand.

Enabling it needs a Google Cloud project with the *Places API (New)* enabled and
billing active.

Restrict the key by **API** (Places API New) and, when the host has static
egress IPs, by **IP address**. An HTTP referrer restriction would break it: the
call is made from the server, not the browser, so there is no referrer to
match.

## Time zone

Dates render in one fixed zone, `NEXT_PUBLIC_TIME_ZONE` (default
`America/Lima`), never in the machine's own zone.

This matters because the server formats these during SSR: relying on the local
zone made the same match read *Wednesday 20:00* on a laptop in Lima and
*Thursday 01:00* on Vercel, which runs in UTC. A match kicks off at a
wall-clock time at the pitch, so that is the time everyone sees.

`src/lib/date.ts` does the formatting with `Intl.DateTimeFormat` and converts
the form's `yyyy-MM-dd` + `HH:mm` back to an instant with `toEpoch`, resolving
the zone offset twice so a DST boundary cannot shift the result.

## Kick-off, final whistle and "Live"

A match carries a start *and* an end (`played_at` / `ends_at`). That end is
what decides which fixture owns the pitch: a match counts as current until its
final whistle, not until midnight. At 21:05 a 20:00-21:00 fixture is over and
the next one takes over on its own — the `useNow` clock ticks every 30s and the
provider refetches once the fixture on screen has ended.

While the clock is between the two, the chip beside the date turns into
**Live** with a pulsing dot.

Rows created before the column existed fall back to
`DEFAULT_MATCH_DURATION_MS` (90 minutes), and the migration backfills them.

## Recurring matches

A match can be switched to **repeat weekly**. The rule lives on the match
itself (`recurrence`) and every occurrence generated from it shares a
`series_id`.

Rolling forward happens lazily on read, in `materializeRecurringMatches()`:
when the newest occurrence of a series has **ended**, the next date is created,
keeping the same duration and carrying over the place and the previous lineup.
Only **one** occurrence is created per series, jumping straight to the next
date — a fixture nobody opened for two months produces next Wednesday, not
eight back-dated matches. A unique `(series_id, played_at)` index makes the
insert safe when two requests race.

Turning the switch off detaches the match from its series, so it stops
repeating without touching the dates already created.

## Realtime

Mutations emit events on the `pichanga` channel (`lineup:changed`,
`players:changed`, `matches:changed`). The state provider listens and reloads
only what is affected, so adding someone makes the token appear on every open
screen.

## Usage

- The **menu** button (top right) opens **Matches**, **Players** and **Places**,
  each in a drawer with its table and its create button.
- The **+** button adds players to the match on the pitch, either picking
  existing profiles or creating one on the spot.
- The pitch always shows the **closest upcoming** match; if there is none, it
  shows the most recent one played.
#   p i c h a n g a  
 