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

| | Guest | Admin | Super admin |
| --- | --- | --- | --- |
| Read anything, browse all three panels | yes | yes | yes |
| Create / edit / delete players | yes | yes | yes |
| Upload a player photo | yes | yes | yes |
| Add players to a match, drop them | yes | yes | yes |
| Create / edit / delete matches | no | yes | yes |
| Create / edit / delete places | no | yes | yes |
| Google venue search | no | yes | yes |
| Add photos and clips to a gallery | yes | yes | yes |
| Mark the rental as paid | no | yes | yes |
| Delete a gallery file | no | yes | yes |
| See the live headcount | no | no | yes |

There are two passwords. `ADMIN_PASSWORD` is the one the office can be given;
`SUPER_ADMIN_PASSWORD` is optional and grants everything the first does plus
the headcount below. The role travels inside the signed session cookie, so
raising it means forging an HMAC, not editing a value.

The venue autocomplete is a `GET` but sits behind the session anyway: every
call costs money on the Google bill.

The UI mirrors the same rules — a guest sees the three drawers but without
their create, edit and delete controls — while the proxy is what actually
enforces them, so a hidden button is never the only thing standing in the way.

## After the whistle

A finished match keeps the pitch for **three days** (`MATCH_GRACE_MS`), because
the rental gets collected afterwards and the lineup is the list of who owes
what. Only then does the next fixture take over. `getNextMatch()` picks in this
order:

1. A match being played right now.
2. One that finished less than three days ago.
3. The closest one still to come.
4. Failing that, the last one played, so the pitch is never empty.

A live match jumps the queue on purpose: if the next fixture kicks off while
the previous one is still settling up, the ball beats the bookkeeping. The next
occurrence of a weekly fixture is still created the moment the previous one
ends, so it is in the Matches drawer the whole time -- it just does not own the
screen yet.

## The rental ledger

`match_players.paid_at` records when each player settled their share. The pitch
marks every token on the left edge of the photo, halfway down: a receipt when
they have paid, a red empty wallet when they have not. For an admin the mark is
a button and **double clicking the photo** does the same thing, which is the
fast way through a squad -- a stamp flashes over the photo to confirm. The money
pill in the HUD opens the full ledger: the split, what has
been collected, what is pending, and a switch per player.

The marks are on every match, past or future: plenty of people pay up front,
and a fixture nobody can tick is a fixture nobody can collect for.

The **organizer is always settled**: they pay the venue, so their mark is green
and locked -- no button, no double click, and the API answers 422 if somebody
tries to take it back. It is derived rather than stored, so handing the match to
somebody else moves the mark with the crown instead of leaving the old
organizer marked as having paid something they never did. Marking them paid is
accepted and writes nothing, for the same reason.

The mark flips **before the request finishes** and goes back if it fails: money
changes hands faster than a round trip, and the toast says so when the save did
not land.

Marking a payment needs the **admin** session, unlike the rest of the lineup.
There is no per-person login, so an open ledger would let anybody tick their
own name -- an honour system rather than a record. Everyone can read it.

## The fixture list

Cards, not a table. Inside a drawer a table gave the date, the venue, a count
and four buttons one line between them, which left every column too narrow to
read; a card gives each of those its own line. **Two to a row** where there is
room, **one on a phone**, **twelve to a page**.

The whole card is the way into that match, with the link as a layer behind the
controls rather than a wrapper around them -- that is what lets a card be a
link and still hold buttons and a checkbox. The match already on screen is not
a link at all.

A card carries the date and kick-off, the venue, who is organizing it, the
count of players with how many have settled, and the share each. The venue is
a link to the map and the count opens the ledger for that date -- the same
dialog the pitch uses, over a lineup fetched when asked for, since a card only
ever holds counts.

Along the foot of every card, on a line of its own so two cards side by side
line up: `Weekly` on the left when the fixture repeats, the album and the
admin buttons on the right.

**A match that has kicked off is a record.** From the first minute -- live, or
finished months ago -- the date, the venue and the price stop being editable,
the card cannot be deleted, and the album is open to read but closed to new
files. What is already there stays readable to everyone.

The page number is clamped on read rather than corrected in an effect:
deleting the last card on the last page would otherwise leave the drawer
showing a page that no longer exists. Selections are kept across pages, so a
bulk delete can span them, and `Select all` in the toolbar takes the whole
list rather than the visible page.

## One date, one address

The front page shows whichever match owns the moment. Every other date has
its own readable address -- `/match/sep-2-2026` -- and the **whole card** in
the Matches drawer is the link to it: the front page for the one already
there, its own page for the rest. That is where a future fixture gets filled
in and paid off without waiting its turn on the pitch.

A pinned screen is the same screen: same pitch, same lineup, same ledger. It
just does not follow the clock -- the roll-over that hands the pitch to the
next match is skipped, and refreshes reload that date rather than asking
which one is current. The logo is the way back.

Slugs are built from the calendar day in the pitch's zone and matched as
strings, so the address of a match is the day it is played on, never the day
it happens to be in UTC. Two matches on the same day would share an address;
the earlier one wins.

## The cut between screens

Navigating between dates does **not** reload the page -- it is a client-side
navigation. What it does do is ask the server for the new screen, and every
screen here is a server component that reads the database, so the wait is
however long those queries take. On a local file that is ~15-25ms; against a
hosted database each query is a network hop and it adds up.

So two things happen.

**Less to wait for.** `materializeRecurringMatches()` is wrapped in React's
`cache()`: `listMatches`, `getNextMatch` and `getMatchBySlug` all roll the
fixtures forward and one page calls all three, which used to mean doing it
three times. A pinned page no longer loads the front page's match in full
either -- `getHomeMatchId()` fetches just the id, which is all a link needs.
And the slug lookup now runs inside the same `Promise.all` as everything
else instead of after it.

**Something to watch.** A diagonal wipe closes over the screen **from both
edges at once**, meeting on a 40-degree seam through the middle. Five pairs of
slabs, each pair covering the one before it: light green, **lime**, mid green,
deep green, and `primary-foreground` last, which is the colour the cut settles
on. It clears the same way, the brighter slabs leaving last.

Every colour is a band in its own right, the lime included. It started as a
4px hairline on the edge of each half, and two halves meeting in the middle
read as a pair of lines rather than as a stripe -- so it became a slab like
the rest.

The band you see of each colour is the gap between it and the slab that covers
it, and those gaps are deliberately uneven so no colour is squeezed down to a
line. A slab crosses in 620ms and clears in 420ms; end to end a navigation
takes about two seconds, most of which is the ball's second.

The diagonal is a `skewX(-40deg)` on rectangles wider and taller than the
screen, not a clip path. Both halves carry the same skew, so the edges facing
each other are parallel and meet on the centre line without a gap.

Behind the wipe there is no logo -- the wipe is the branding, and a mark under
a bouncing ball turns a transition into a splash screen. The ball appears once
the last slab lands and **always gets a full second** to bounce: the cut holds
for that second however fast the page arrives.

`useTransition` is what makes the hold honest in the other direction: React
keeps `isPending` true until the new page is ready to paint, so the wipe never
clears on a half-built screen.

The match already on screen is **not a link** -- neither its row in the drawer
nor the logo on the front page. Playing the whole transition to arrive exactly
where you started is worse than a row that does nothing.

Links are still `next/link`, so the page itself is usually prefetched and
waiting by the time the wipe has finished closing.

## Sharing a lineup

The share button turns the match into one tall image: the date, the time, the
venue and the split at the top, then every player as a row -- photo on the
left, name and area on the right -- in two columns from nine players up, so a
squad of twenty-four is one portrait picture rather than a scroll.

It is drawn in the browser on a `<canvas>`, not rendered on a server. The
fonts are already loaded on the page, Cloudinary serves the photos with
`Access-Control-Allow-Origin: *` so the canvas is never tainted and `toBlob`
works, and nobody pays for a function invocation to share a lineup. The file
is JPEG: the same picture is ~600KB instead of several megabytes, and every
chat app recompresses it anyway.

Both the picture and the message carry **who has paid and who has not**: a
filled green tick or a hollow red cross on every row, a `16 paid · 8 pending
(S/ 80.00)` line under the split, and the same two states as emoji in the
text. That is the reason a lineup gets shared in the first place.

### The HUD on a phone

One card: the logo and the buttons on top, the match details under them,
sharing a border and a background. There is no info button any more -- the
date, the time, the venue and the split are simply always on screen.

It is one card rather than two floating pieces because the lineup scrolls
underneath: a bare logo with players sliding behind it looked broken. From md
up it goes back to the two pieces it always was, `md:contents` handing the
halves back to the row.

The lineup measures the whole block and starts 12px below it, the same gap the
card uses inside itself. At the bottom it clears only the floating add button,
not the height of the HUD -- and that clearance counts the button, the padding
around it and the offset the strip sits at, which is what stopped the last row
from ending up four pixels underneath it.

### The lineup on a phone

The formation still places twenty-four tokens comfortably on a phone -- they
come out around 40px on an iPhone 14 -- but the name plate under each one is a
fifth of that, seven or eight pixels, which nobody can read. So under 768px
the pitch stays exactly where it was, as the backdrop, and the players line up
over it instead of on it: photo on the left, name and area on the right, the
same shape as the share card.

Two columns, dropping to one at 479px and under. The list is centred while it
fits and grows up and down from the middle, the way the formation does;
`min-h-full` with `justify-center` is what allows both, since centring alone
clips the top of a list taller than the screen. The width comes from the
measured container, not a media query, the same way the pitch decides its
orientation.

### A permanent demo

`/demo` is a full match that exists only in memory: twenty-four players with
and without photos, a priced venue, an organizer, and two thirds of the rental
settled. It renders the real pitch and the real HUD, so the lineup, the marks
and the share card can all be tried against a full squad without touching
anybody's fixture. Nothing on it is written to the database and nothing on it
can be edited.

The faces come from randomuser through `/api/demo/avatar/[seed]`. Proxied
rather than linked because those hosts send no CORS headers: loaded directly,
the share card's canvas would be tainted and `toBlob` would throw instead of
returning a picture. Pravatar was the first choice and lost on a detail -- it
cannot be asked for one gender, and men's names wearing women's faces reads
as a bug.

It needs the session: everyone else gets a **404** rather than a redirect,
since a page nobody should be poking at is better off looking like it does not
exist.

### WhatsApp

**A link cannot open one particular group.** WhatsApp has no URL scheme that
addresses a chat, and its Business API does not address groups at all -- only
one-to-one conversations with people who opted in. The chat is picked in
WhatsApp itself, which costs one tap.

**Two tabs, two messages, the same squad in both.**

*Match* is the fixture: date, time, venue with the maps link, and the numbered
lineup. No ticks against the names and no line about what is owed -- it is a
message about who is playing, and money in it starts a different conversation.

*Payments* is the ledger: the same header, the same names, each with a
✅ or an ⏳, and the count of what is still pending. The maps link goes,
because nobody chasing a debt needs directions to the pitch, and the tab
carries the number of people still to pay.

The two cards differ the same way: the fixture drops the paid marks from the
rows and the settled-up line from the header, which makes it one line shorter.

Three icon buttons, no labels: the card above them is the subject, and three
words under it were louder than the picture.

- **Download** saves the JPEG.
- **Copy the image** puts the picture itself on the clipboard, to paste
  straight into a chat without a file ever touching the disk. Clipboards take
  PNG and nothing else, so the card is redrawn as one on the way out.
- **WhatsApp** reads the pointer. On a phone it opens `wa.me/?text=…` with the
  message already written, which hands off to the app. On a desktop it copies
  that message instead: WhatsApp Web is already open in another tab, and
  opening a third one to hand it the same text is a detour.

There is no share-sheet button. `navigator.share` was the only way to put the
picture *and* the text into a chat in one gesture, and on a phone that now
takes two: copy or download the card, then the text.

The message is date, time, venue, maps link, the split, and the numbered lineup
with the organizer marked and a ✅ or a ⏳ at the head of every line.

**The maps link goes out exactly as Google wrote it**, `cid`, signed `g_mp`
blob and all -- past 130 characters, every one of them printed above the
preview. It was shortened twice and put back both times. Coordinates lose the
card altogether: `?q=lat,lng` is a bare pin and the preview came back reading
`12°05'56.2"S` where the venue name and photo had been. The bare `cid` reaches
the same page, but only through a redirect the crawler does not follow, so the
card never appeared. The long link is the one that draws the photo, the name
and the rating, and that card is the whole point of sending it.

There is no way to send that card without the link showing, either: WhatsApp
has no syntax for a titled link, and the preview is generated from the URL in
the message.

**Neither the message nor the image carries a link back to the app.** Whoever
is in that chat is being sent a lineup, not an advert for where it came from.


## Match galleries

Every match has an album of photos and clips: `match_media` remembers where each
file lives and `ON DELETE cascade` takes the album with the match. Reachable
from the HUD for the match on the pitch, and from the gallery button on any row
of the Matches drawer.

**Anyone can add, only the session can delete.** A shared album is easy to
empty by accident and there is nothing to restore it from. An admin gets a
checkbox on every tile and a bulk bar, so a whole batch goes in one confirm;
the requests fly in parallel and a partial failure says how many survived.

Each tile is a fixed square with `overflow: hidden`. Hovering grows and tilts
the **photo inside it**, never the frame, so nothing in the grid shifts. A
skeleton holds the square until the thumbnail paints.

### Sizes, and the viewer

Nothing ever loads the original. `lib/media-url.ts` writes the
transformation into the delivery URL and Cloudinary renders and caches each
size. For one demo photo:

| Variant | Used for | Bytes |
| --- | --- | --- |
| original | never | 109,669 |
| `w_400,h_400,c_fill` | grid tile | 32,099 |
| `w_40,q_30` | first paint in the viewer | 674 |
| `w_2400,q_auto` | the open photo | 98,960 |

An album of forty phone photos is a few hundred kilobytes of thumbnails
instead of eighty megabytes of originals.

Photos open in their own dialog, not the shared one: no card, no padding, 16px
of air on every side and nothing else. It opens with the 40px version blown up
and left deliberately blocky (`image-rendering: pixelated`), and the full photo
fades over it when it arrives.

The photo also **grows out of the thumbnail that opened it**, and shrinks back
into whichever thumbnail is showing when it closes. The tile's rectangle is
measured at the moment of the click and GSAP tweens the difference: the frame
is already laid out at full size, so the tween runs from that offset back to
nothing. Only `transform` is animated, never opacity, so a tween that never
ticks leaves a small photo rather than an invisible one.

Two details make that animation actually run, both learned the hard way:

- The tween starts from the **ref callback**, not from an effect on mount.
  Radix renders a portal empty on its first commit and fills it on the second,
  so a mount effect fires while the node does not exist yet. That is why the
  photo used to open with no animation while closing worked fine.
- The tween is created with **`lazy: false`**. GSAP otherwise holds the first
  render back to its next tick, and the photo sits full size for a frame
  before snapping back to the thumbnail to start.

### Stepping through the album

Arrow keys, the buttons at either edge, or a horizontal swipe. Both photos
move **at the same time**, on the app's curve: the one leaving and the one
arriving are separate full-screen layers, so they can be different shapes and
each still sits in the middle of the screen. When the slide ends the commit is
forced through with `flushSync` *before* the layer's transform is cleared --
the other order flashes the previous photo back into the middle for a frame.

A downward swipe closes, and so does a click anywhere that is not the photo.
The neighbours are fetched quietly in the background, so stepping through an
album is usually instant; when it is not, the spinner says so.

Files go from the browser **straight to Cloudinary**, not through this app.
`/api/upload/ticket` signs a folder and a timestamp; the browser posts the file
to Cloudinary with that signature and sends back only the metadata. Two reasons:
a serverless request body caps out around 4.5 MB, which no video clears, and the
API secret never leaves the server. Cloudinary rejects any parameter that is not
in the signature, so a ticket cannot be turned into anything but "put a file in
that folder".

The metadata that comes back is not trusted either. The url has to be on
`res.cloudinary.com` and the public id has to start with our gallery folder,
or the endpoint answers 422 -- otherwise an open endpoint could be used to file
any link in the world as match media.

Caps are 10 MB per photo and 100 MB per clip, checked before the upload starts.
Videos are the expensive part of a Cloudinary plan: storage, bandwidth and
transformations all count against it, and a match full of clips adds up much
faster than the player portraits ever did.

## Links

Every link in the app is one component, `AppLink`. A link is a solid underline
under the words and the app's lime on hover, and nothing else in the interface
looks like that.

The icon goes **inside** the link. Beside it, the hover stopped at the first
letter and the icon stayed grey while the text went green, so the pair read as
two unrelated things; inside, the icon inherits the link's colour and turns
with it, and the whole thing is one target. The underline stays on the words
alone -- a line under a glyph reads as a rendering fault.

It also renders a button, for the places that open a dialog rather than go
somewhere -- the player count on a card, for one. That is still a link to
whoever is reading it, and it should not be the one that looks different.

Two things opt out with `no-underline`, because they are surfaces rather than
text: the layer that makes a whole card clickable, and the logo.

## Waiting

Skeletons come from shadcn's `Skeleton` -- a div, a pulse and the muted token,
no dependency. They go where something is genuinely on its way and its shape is
already known:

- **The album**, as a grid of squares rather than one spinner, so it keeps its
  shape, and behind each thumbnail until that thumbnail decodes.
- **The ledger opened from a fixture card**, whose lineup is fetched on
  demand. Everything in it is the match's -- the date, the split, both totals,
  every name and area -- so all of it waits together. Each placeholder sits in
  a box the height of what it stands for, 28px for the date, 26px for an area
  badge, and the dialog measures the same 526px before and after the names
  land: no jump.

  The same dialog opened from the pitch has **no** skeleton, and that is not an
  oversight: that match is already in hand, so there is nothing to wait for.

Everywhere else a spinner is the honest thing. A spinner says *working*: an
upload, a card being drawn, a form being saved. A skeleton says *this is coming
and it will look like this*, which is a lie if the shape is not known yet.

**No page ever wears one.** There is no `loading.tsx` on the match screens: a
skeleton of the pitch is a second, worse version of the screen you are waiting
for, and the wipe already covers the move between them. The fixture cards and
the players and places tables have none either -- they arrive with the page,
from the server, already filled in.

## Dialog motion

Dialogs rise 200px into place over 500ms and drop back out in 250ms -- half
the time, because leaving should not keep anybody waiting. Both use the app
curve, `cubic-bezier(0.32, 0.72, 0, 1)`.

Two things make that work. The panel is centred with `inset-0` and
`margin: auto` rather than `-translate-1/2`, since the slide animates the
panel's own `transform` and a translate-based centring would be wiped out
mid-flight. And the panel stays the **only child of the portal**: Radix wraps
each child in its own `Presence`, so a plain centring wrapper would unmount
the instant the dialog closes and cut the exit animation off before it ran.

**How a dialog is centred.** Radix's content element is the whole screen, and
the card is a grid item centred inside it. It used to be the card itself,
absolutely positioned with `inset-0` and `margin: auto` -- which asks the
browser to size a box to its content between a top and a bottom, and Safari on
iOS answers "fill the screen": the card grew to the whole viewport with its
buttons stranded at the foot of it.

It has to stay the portal's only child, because Radix wraps each child in its
own `Presence` and a plain wrapper would unmount instantly, cutting the exit
short. So the fade lives on the full-screen element, where Radix watches for it
to finish, and the slide is on the card, driven by the same `data-state`
through `group`. The space around the card is a `Close` of its own: it is no
longer "outside" the dialog, so a tap there has to say so itself.

Footers put their buttons on one line, right-aligned, phone included. `Cancel`
and `Remove` are two words; stacking them full-width made a small question look
like a big one.
## Who is online

A quiet line in the bottom-left corner reads *3 people are watching Pichanga
right now*. **Only a super admin sees it**, and only that session can read the
number: it is not pushed to the other screens.

That is why the count is kept in our own `visitors` table instead of a Pusher
presence channel. A presence channel shares its member list with everyone
subscribed to it, which is exactly the audience the number is supposed to be
hidden from.

Every open tab `POST`s an id to `/api/presence` every 20 seconds and counts as
present while its last beat is under two minutes old. The id lives in
`sessionStorage`, so it is **per tab**, not per person: five tabs of the same
browser count as five. It is a random value with no address, no device and no
link to a player, so the table can answer *how many* and never *who*.

Two minutes of slack sounds long for a 20 second beat, and it is deliberate: a
browser throttles timers in a hidden tab to roughly one a minute, so anything
tighter would make background tabs flicker in and out. What keeps the number
from lagging is the other half — a tab fires `navigator.sendBeacon` as it
closes and its row is deleted right away, so the slack only ever covers a crash
or a lost connection. Rows older than ten minutes are swept whenever the count
is read, so the table stays the size of the crowd rather than the history.

Two limits worth knowing. The beat endpoint is open, because guests are counted
too: anyone who found the URL could post made-up ids and inflate the number.
Nothing else is exposed by that — the ids mean nothing and the table holds
nothing else — but the figure is an indicator, not an audited metric. And
signing out only clears the cookie: the token itself stays valid until it
expires, which is how a stateless session works. Rotating `AUTH_SECRET`
invalidates every session at once.

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

## Splitting the rental

A place carries a `price`, the rental for one match. The HUD shows what each
player owes at the far right of the date line, and it recomputes on every
render, so signing someone up or dropping them changes the figure with the
lineup, on every open screen.

`perPlayer()` returns `null` when there is no price or nobody signed up, so
the slot stays empty instead of printing a zero or an infinity.

The currency comes from `NEXT_PUBLIC_CURRENCY` (default `PEN`). Like the time
zone, the formatting locale is pinned rather than taken from the runtime: the
server and the browser would otherwise disagree and the SSR markup would not
match.

## The organizer

A match points at one of the players with `organizer_id`. That player wears a
crown on the pitch instead of taking a line in the HUD, and the form ticks them
into the lineup when picked: the crown needs a token to sit on.

The organizer always stands on the exact center spot. `buildFormation()` takes
a `centerSlot` flag that forces an odd row count and an odd middle row, which
is the only shape where a slot lands dead center; the queries then push the
organizer to the head of the lineup, and slot 0 is the position closest to the
center. Without an organizer nothing changes and the grid stays as it was.

## Bulk delete

Every drawer table has a checkbox column with a select-all header. Ticking
rows raises a bar with the count, a *Clear* and a *Delete*, and the confirm
dialog names either the single row or the count.

Some details worth knowing:

- **Selection follows the visible rows.** In Players, "select all" means the
  current search results, not the whole table, and ticked rows survive
  clearing the search.
- **One row and a selection share the same path**: the per-row trash icon just
  queues a list of one, so there is a single delete flow to reason about.
- **`useRowSelection` prunes on read.** Ids that vanish from the list are
  filtered out when read instead of being synced away in an effect, which
  would mean writing state in reaction to state.
- **The provider deletes with `allSettled` and refreshes once**, not once per
  row, and reports how many actually went through if some fail.
- The column follows the permissions: a guest gets it in Players, which they
  may delete, and not in Matches or Places.

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