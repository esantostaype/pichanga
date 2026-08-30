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
npm run db:migrate
npm run dev
```

`db:migrate` is the one to reach for whenever the app says it cannot read the
database: it applies the migrations that have not run yet and adds nothing
else. `db:push` rewrites tables to match the schema, which on a database with
rows in it means losing them -- it is how this one was emptied once -- so it is
for an empty local file and nothing else.

### Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `start` | Production build and start |
| `npm run lint` | ESLint |
| `npm test` | Vitest, once |
| `npm run db:migrate` | Applies pending migrations. **This is the one.** |
| `npm run db:migrate:plan` | Lists what it would run, and writes nothing |
| `npm run demo:clear` | Counts the sandbox rows in the database, writes nothing |
| `npm run demo:clear:yes` | Deletes them |
| `npm run test:watch` | Vitest, watching |
| `npm run db:generate` | Generates migration SQL from the schema |
| `npm run db:push` | Rebuilds tables from the schema. Local files only: it drops what it cannot keep, and refuses a remote database without `ALLOW_REMOTE_DB=1` |
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

**The last whistle puts the match back to being a notice.** Finishing the
night sets `ends_at` to now and returns to the match's own screen: the sides
come off the pitch, the paid marks and the organizer's crown come back, and
neither the draw button nor the way into match night is offered again -- there
is nothing left to draw sides for. The teams themselves are kept on the row,
because the season's table is built from them; they are just not what that
match is about any more.

## The rental ledger

`match_players.paid_at` records when each player settled their share. The pitch
marks every token on the left edge of the photo, halfway down: a receipt when
they have paid, a red empty wallet when they have not. For an admin the mark is
a button, and it is **the only way to move money on the pitch** -- a stamp
flashes over the photo to confirm. Double clicking the photo used to do the
same thing, which was quick until you remember the photo is also how a card is
opened: a gesture that moves money sharing a target with a gesture that reads
about somebody is one that eventually fires by mistake. The money pill in the
HUD opens the full ledger: the split, what has been collected, what is
pending, and a switch per player.

The marks are on every match, past or future: plenty of people pay up front,
and a fixture nobody can tick is a fixture nobody can collect for.

The **organizer is always settled**: they pay the venue, so their mark is green
and locked -- no button at all, and the API answers 422 if somebody
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

**Every navigation gets it**, not the ones that remembered to ask. The
provider catches clicks on internal links in the capture phase, before Next's
own handler -- which then stands down, because the click has already been
taken -- so a match card, the logo and a link nobody has written yet all play
the same cut without knowing it exists. Back and forward are covered too: they
cannot be held, since the browser has already moved by the time the event
fires, so the cut closes over what is still on screen and opens when the new
address arrives.

**The browser's own arrows are left alone.** A traversal is instant -- the
page it goes to has already been fetched -- so there is nothing to cover for.
Playing the cut anyway meant watching two seconds of it over a screen that had
already arrived, and holding the traversal behind the cut (the Navigation API
does allow that) put a wait on the one control people press when they want out
of somewhere. The cut is for the waits the app itself creates. Nothing keeps
the screen covered either: if the page never arrives it opens after four
seconds regardless.

The match already on screen is **not a link** -- neither its row in the drawer
nor the logo on the front page. Playing the whole transition to arrive exactly
where you started is worse than a row that does nothing, so a link to the
address you are on is left alone.

Links are still `next/link`, so the page itself is usually prefetched and
waiting by the time the wipe has finished closing.

## Crests

A shield in the side's colour with its short form on it, drawn rather than
drawn *by hand*: fourteen names in the pool and more to come, each needing a
crest in two sizes and both themes. As artwork that is fourteen files to keep
in step with a list in a constants file; as a shape plus a colour plus two
letters, a new name arrives with its crest already made. `Los 404` reads
`404` because the pool carries the short form; a name from outside it falls
back to initials, which is never wrong even when it is dull.

**Two letters at most.** A shield is read from the touchline at the size of a
thumbnail, and three characters in it are a word nobody can make out. They are
big enough to fill it now, which is what retired the stripe across the middle:
that was there to stop the badge reading as a sticker with letters on it, and
the lettering does that itself. The baseline is placed so the capitals straddle
the middle of the shield rather than relying on `dominant-baseline`, which is a
different centre in every browser.

**The colour belongs to the name**, so a side is the same colour every week,
and the six are spread as far around the wheel as six hues get: two teams a
shade apart are two teams nobody can tell apart from the touchline. Both are
copied onto the team row when the sides are drawn, so changing the pool renames
nothing that has already been played.

**Picking names cannot spin.** They are walked from a point the seed decides in
steps rather than one by one, which keeps the pairs from always being
neighbours in the list -- but a step that shares a factor with the pool walks a
circle smaller than the pool. Three into six visits two names and no more, and
the loop filling four sides from that circle never came back: the request hung
and the server sat there holding it, which is exactly what happened the first
time the pool went from fourteen names to six. The step is nudged until the two
are coprime, so the walk visits every name before it repeats one, and a turnout
needing more sides than there are names gets the pool again with a numeral on
it. It lives in `lib/teams.ts` now, with tests.

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

*Payments* is the ledger: the same header plus the money -- what the pitch
costs in full and what that comes to each -- then the same names, each with a
✅ or an ⏳, and the count of what is still pending. The maps link goes,
because nobody chasing a debt needs directions to the pitch, and the tab
carries the number of people still to pay.

The two cards differ the same way: the fixture drops the paid marks from the
rows, and both money lines from the header, which makes it two lines shorter.
What a match costs is a thing to settle among the people playing it, not part
of telling them where to turn up.

Switching tabs redraws the card, and the one already on screen stays there
while it happens. Clearing it first put a spinner up for long enough to blink
and took the dialog height with it, for a picture that was about to be replaced
anyway.

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

## Tabs

One component, everywhere: the share sheet, the season, and the goals of a
night. They take the width of their words rather than stretching across
whatever they sit in -- stretched, two tabs read as a segmented control and
five as a navigation bar.

When they stop fitting, the tail collapses into a **+N** that opens the rest in
a dropdown. Never a row that scrolls sideways: a tab you have to drag into view
is a tab nobody knows is there. Two things make the collapse work, and both were
learned by watching it not:

- The wrapper is `w-full min-w-0`. Inside a grid or a flex row a box may grow
  past its container to fit its content, and a row that can grow never has to
  collapse -- it makes its parent scroll instead.
- The probe that measures the natural widths is clipped and out of the flow. An
  absolutely positioned box still counts towards an ancestor's scroll width,
  which is where the sideways scrollbar was coming from.

**The row never reorders itself.** Choosing from the dropdown used to pull that
tab to the front, which moved the tabs somebody had just read while they were
reading them. The trigger carries the state instead: it lights up while the
selection is one of the ones it is holding, and the selection is marked inside
it.

The active tab is the app's green at fifteen percent, not the solid green: a tab
is a place you are, not a button you press.

## Scrollbars

One bar, everywhere: thin, the border colour, no track. It used to be a class
that drawers and tables opted into, which left the page itself with the
system's -- a wide grey bar down the side of a black app. Anything that scrolls
now gets the same one.

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

## Skills, positions and teams

Every player carries six skills -- pace, stamina, finishing, passing, defending
and goalkeeping -- each 1 to 5, and a position they would rather play.

**Six, and all of them start at 3.** Each skill is a value somebody has to set
twenty times over; a seventh would be the one nobody fills in. Starting at
average means an unrated player still balances into a team sensibly, and the
organizer only has to touch the handful who are not average. They live in the
player form and nowhere else -- a number rating a colleague does not belong on
the pitch where everyone can read it.

**The position is not a label, it is the weighting.** A player's strength is
their six skills weighed by where they play, so a defender is never marked down
for not finishing:

| Position | What counts |
| --- | --- |
| Goalkeeper | goalkeeping 60%, the rest 40% |
| Defender | defending 40%, stamina 25%, pace 20%, passing 15% |
| Midfielder | passing 35%, stamina 30%, pace 20%, finishing 15% |
| Forward | finishing 40%, pace 35%, passing 15%, stamina 10% |

Each row sums to 1, so every player lands on the same 1-to-5 scale however they
play.

### The card

Every player has one: photo, name, area, position, the six skills as bars and
as a hexagon, and the overall in the corner. It opens from the view button in
the Players drawer, and from their **name** on the pitch -- the plate under the
token on a screen, the name in the list on a phone.

The name and not the photo, deliberately: the photo already answers to a double
click for the payment mark, and two gestures a fifth of a second apart on the
same target is how somebody ends up marked as paid for trying to read about
them.

The **X** that drops somebody from the lineup carries an invisible square
eight pixels wider than itself on every side. It is a small circle sitting half
off the corner of a token, which made it a thing you had to travel to and could
lose on the way -- leaving the token takes the hover with it. The square
catches the clicks that land just wide, and because it belongs to a child of
the token it keeps the token hovered while the pointer crosses the gap.

The overall is the same number the balancer uses, weighed by the position they
picked, so the card explains the teams instead of sitting next to them. And the
hexagon is there because six bars say the same numbers but the shape is what
gets remembered: a forward and a defender with the same overall look nothing
alike on it.

It opens from the **photo** as well as the name. The photo used to belong to
the payment mark -- a double click on it settled somebody's share -- and that
was quick until you remember the name right under it opens a card: a gesture
that moves money sharing a target with one that reads about somebody is one
that eventually fires by mistake. The mark on the edge does the money now, and
the whole token reads as one thing to press.

**Whose card it is outlives the card being open.** Closing it used to clear the
player, which unmounted the dialog on the spot: it arrived with a transition
and vanished without one. The player stays until the next tap replaces them,
and only the open flag comes down, so there is still something on screen for
the way out to animate.

### How many teams

A place says how many a side it takes -- 5, 6, 7, 9 or 11 -- and that decides
the shape of the day, because a side may never be bigger than what fits on the
pitch. The turnout is divided by it and **rounded up**: fifteen on a
seven-a-side pitch is three fives taking turns, not seven against eight with
nowhere for the eighth to stand, and twenty is three teams of six or seven
rather than two with six people watching.

Never fewer than two, since there is no match otherwise, and never so many that
a team would be down to one player -- which is the only case where a side can
still come out bigger than the pitch, and by then the pitch was never the
problem.

### The balancer

`planTeams` runs three passes, in an order where each one only makes sense
once the last is settled:

1. **Goal.** One keeper per team: volunteers first, best first. Where there are
   not enough, the gloves go to the highest `goalkeeping` among everyone else,
   with a nudge towards defenders, and that team is marked as having *borrowed*
   a keeper. This runs first because it is the hardest constraint -- two
   perfectly balanced teams where one has nobody in goal are not balanced, they
   are unplayable. A keeper with nowhere to keep plays out, and is rated as a
   defender, which is where they will end up.
2. **The draft.** Everybody else in strength order, snaked across the teams, so
   the first pick of one round is the last of the next.
3. **The swaps.** Pairs traded between teams for as long as it keeps closing the
   gap. The draft on its own leaves teams about one player apart; this closes
   most of what is left. Keepers stay put, and a swap that changes nothing is
   not taken -- otherwise the same squad would plan differently every time it
   was asked.

The seed only breaks ties, so a squad always plans the same way and "shuffle
again" is a different seed rather than a different algorithm.

**Mix the areas** is a second thing to aim at, offered as a switch when the
teams are shuffled. Eight from Dev and four from Design is four Devs against
four Devs however even the strengths look, and the point of playing on
Wednesday is talking to somebody you do not sit next to. It is worth about a
tenth of a point of strength -- enough to break a tie between two equally fair
draws, never enough to make an unfair one win.

There is a **Guest** area for the people who do not work here at all: somebody's
friend, making up the numbers. It balances like any other.

### Drawing them

The button turns up in the HUD **two hours before kick-off** and not a minute
earlier: until then the lineup is still moving, and teams drawn from half a
squad are worth nothing. The window is enforced in the endpoint as well as in
the button, because a button is a suggestion and this is the rule.

**Anyone can draw them.** It happens with everybody standing around and
somebody has to press it. **Shuffling again is the session's**, though: a squad
that can re-roll until it likes the look of a team has not been given teams at
all.

Each side gets a name from a pool of fourteen -- Los 404, Kernel Panic, Cache
Miss -- and a crest that is drawn rather than drawn by hand: a shield, the
team's colour, and the short form of the name. Fourteen names and more to come
would otherwise be fourteen pieces of artwork to keep in step with a list in a
constants file; as a shape plus a colour plus two letters, a new name arrives
with its crest already made.

### On the pitch

The pitch splits into a band per team, across its length when it is wide and
down it when it is tall, and each band is laid out by the same code that lays
out a whole squad. Inside a band the keeper goes first and the rest follow back
to front, which is the order a team sheet is read in.

Nothing about the animation is new, and that is the point: the tokens are the
same nodes they always were, so the tween that carries a new player to their
place carries everybody to their team. The sides sort themselves out in front
of you rather than appearing already sorted.

**A drawn pitch is about the match, not the money.** The paid marks and the
organizer's crown come off the moment there are sides: both are still one tap
away in the ledger, and neither means anything while a game is on.

The ring around a photo switches from the area colour to the team colour once
the sides exist -- during a match, which team somebody is on matters more than
which floor they sit on. On a phone, where there is no room for bands side by
side, the same list breaks into one section per team and the teams take turns
down the screen instead of across it.

It is the first thing here with tests, because it is the first thing here that
is pure logic with no screen attached: fifteen cases in
`src/lib/teams.test.ts` covering the counts, the keeper shortage, the spare
keeper, everybody being placed exactly once, and the gap staying under a fifth
of a point on a five-point scale -- plus six more in `formation.test.ts` for
the bands: a slot per player, the split following the long axis, every token
inside its own band, and both sides drawn at the same size however lopsided the
teams are.

## Match night

Its own address -- `/match/sep-2-2026/live` -- and its own gestures, which is
what lets a **double tap** mean "they scored" there while it still means "they
paid" on the lineup. The two never share a page, so neither has to guess.

**The first game waits for kick-off.** The teams can be drawn two hours early
-- that is standing-around time -- but a game that started before the match did
puts a clock on screen that means nothing. The sandbox is exempt, because it
exists to be played with at four on a Tuesday afternoon.

**The lineup can change under a night in progress.** Somebody turns up, or
somebody has to leave, and this screen was only handed the match once -- at
render -- so a side kept a player who had walked off until the next reload. It
listens for `lineup:changed` now and reads the match again, which is the same
event the lineup screen has always broadcast.

The header is **the same component**, not one that matches: `AppHeader` is
rendered by the lineup and by match night, and the page brings the same provider
with it so the logo, the details, the album, the share sheet and the menu are
the ones people already know. Copying it would have left two headers a week
later. The rendered markup on the two pages is identical apart from the id Radix
generates for the menu.

**Match day lives by the thumb.** Drawing the sides and going to the night both
happen with a phone in one hand at the pitch, so they sit above the add button
rather than in the corner with the browsing -- the same size as it, in a softer
green, because adding a player is still what gets pressed most.

**The board is the middle of the screen and nothing else.** No card, no border,
no ground of its own: it is the thing being looked at, and a box around it would
be a second thing to look at. A side sits either hand of it while there is room
and both drop underneath when there is not, each built like a player's card --
the team's colour bleeding down from the top -- because that is already what
this app uses for "here is somebody", and a team is a group of somebodies.

The goals and the table are icon buttons beside the score, and open as dialogs.
They are worth reading between games and worth nothing during one, which is not
a good enough reason to have them on screen all night.

A side sits either hand of the board from **768 up** -- the same width the
header changes shape at, so the page has one breakpoint rather than two -- and
both drop underneath below it.

Everything sits in the middle of the window while it fits, and grows past it
when it does not -- `justify-center` stops mattering the moment the content is
taller than the minimum, so nothing is ever pushed off the top.

The page scrolls as a page: the pitch behind it is fixed and the header is
pinned to the window, so a thumb anywhere moves the night. Getting there took
two goes. `overflow-x: hidden` had quietly made the page its own scroll
container -- hidden on one axis forces `auto` on the other -- so a wheel over
the fixed pitch went to the document, which had nothing to scroll; `clip` does
not do that. And the `body` itself was held still for the pitch screens, which
meant no page could ever scroll. It is not any more: the pitch screens are
`h-dvh` with their own `overflow-hidden`, so they stay still on their own.

The board is the game being played: both crests, the score, and a clock counted
from one timestamp. Only `startedAt` is stored, and every phone works the time
out from it -- the only way six devices agree about how long is left.

**The gloves can be moved by hand.** The balancer names a keeper for every
side and is right most of the time, but it cannot know whose knee hurts or who
has spent three weeks refusing. A glove sits on the left edge of the keeper's
token -- the edge the ledger uses before the sides are drawn, free once they
are -- and every other player's name plate carries one on its corner: press it
and they take over. The same control is in the Teams dialog, next to each name.

The team sheets on match night carry it too, which is where somebody is
standing when they find out the keeper's knee hurts: a glove beside each name,
quiet until the sheet is reached for and always there on a touch screen.

**Not while a game is on, with three sides or more.** A side reshuffling in
front of the two waiting to come on is a side being unfair to them, and the
table is being kept on the result. With two sides there is nobody waiting, so
the gloves move whenever those two agree -- which is how a pickup game actually
works. The server holds that rule; the screens only decide whether to offer it.

**Somebody arriving after the draw goes on a side**, rather than standing on
the pitch belonging to nobody: the one with fewest players, and between two of
the same size the weaker one, which is what the balancer was aiming at anyway.
Redrawing everything instead would be tidier arithmetic and worse football --
the sides have been read out, and one person arriving should not rearrange the
other fourteen. If they keep and that side was making do with somebody who does
not, the gloves are theirs, which is the whole reason a keeper turning up late
is good news.

**And the sides even themselves up.** Four against six is not a game, and it
is what a lineup turns into when two people from the same team drop out an hour
before kick-off. Players are moved one at a time from the fullest side to the
emptiest until no two are more than one apart, and whoever moves is whoever
leaves the two closest in strength -- evening the numbers should not hand one
of them the game. A keeper never moves.

The sides themselves are left alone: only shirts change. Drawing them again
would be the tidier arithmetic and the worse idea, because the games and the
goals hang off the team rows and cascade with them. A goal keeps the side that
scored it either way -- it is stamped on the goal, not worked out from where
the scorer happens to be standing now.

**And nobody is left with an empty net.** Taking the keeper off the lineup
hands the gloves to the next best on that side -- a volunteer first, then
whoever keeps best, the same order the draw uses.

**How long a game runs is agreed when the sides are drawn**, in the Teams
dialog -- which opens wider for three sides or more, as many across as the
screen fits and the rest underneath, because reading a triangular in a column
means scrolling past one team to compare it with another -- because that is the moment everyone is standing together looking at the
same screen. Ten minutes unless somebody says otherwise, kept on the match
rather than on the place -- the same pitch is rented for an hour some weeks and
two others, and it is the night that decides how long the side waiting has to
wait. It reads on the board next to the game number, and it is not behind the
session: the length of a game is settled out loud at the ground and the phone
that types it in is whichever one is out.

**Two sides can play with no clock at all**, which is the other thing an
office does: one game, running until the pitch is up. The choice only appears
with two sides drawn, because with three there is always somebody waiting for
the game to end and a game that never ends is a side that never plays. The
board says "no clock" where it would say the minutes, the clock counts up and
never turns amber, and full time stops asking whether it is too early -- there
is nothing to be early for.

**The clock says how close it is.** It turns amber at three quarters of that
length and red at the last twentieth, and stays red past it. Neither stops
anything -- the whistle is still a person pressing a button -- but nobody has
to do arithmetic with a stopwatch to know whether to let this one run.

**Full time asks, while there is anything to ask about.** Blowing up with
minutes left says how many are left and waits for a yes -- nobody does that by
accident, but somebody reaching for the goals button at arm's length might. In
the **last thirty seconds** it just blows: nobody plays on for half a minute,
and a dialog in the last seconds of a game is a dialog in front of somebody
watching a game.

**A goal can only be taken back off the game being played.** One mistyped is
noticed within the minute; one removed from a game that finished an hour ago
rewrites a result the teams already played on, and the table with it. The
endpoint refuses it, not just the button.

**The last whistle** is a button in the corner: it blows the running game dead
and moves the match's end to now, so the app stops offering another game and the
fixture reads as played. The date, the lineup and the ledger are untouched -- it
says "we are done", not "this never happened".

**The way in is the Teams dialog**, not only the button on the pitch: the
sides have just been drawn, so what happens next is somebody keeping score. It
is the one button on that dialog worth pressing, so it is the primary one and
it sits on the right, with the undoing -- put away, shuffle again -- on the
left, which is the order they happen in. It is there for everyone, admin or
not: whoever is holding the phone at the ground taps the goals.

The game length goes with them: the games already in the table were played to
the length they were played to, and moving it afterwards only changes what the
clock calls late. What stays on the dialog once the night is under way is the
way into it and the gloves.

The dialog hears the night start rather than finding out when somebody
reopens it: it reads the games when it opens and again on every `live:changed`,
because the kick-off usually happens on somebody else's phone, and a screen
still offering to shuffle the sides two minutes after the first whistle is a
screen lying about what it can do.

**And once a game has been played, the sides stand.** Drawing them again then
is not a redraw but a delete: the games and the goals hang off the team rows
and cascade with them, so a shuffle after kick-off would take the night's table
with it. Both buttons come off the dialog and both endpoints answer 409, which
is the half that matters -- a button is a suggestion and this is the rule.

**Three shapes.** On a phone the night is one column, board first. From 480px
the two sides sit next to each other with the board across the top: a tablet
has room for them side by side but not for a board between them, which at that
width leaves each side about a hundred pixels. From 768px the board moves into
the middle where it belongs and each side is capped at 17rem, pushed towards
it -- two sheets stretched across a wide screen put the names further from the
score than they are from the edge.

**Anybody can keep score.** It happens on a pitch with twenty people standing
on it and whoever has their phone out does it, so there is no role behind any of
it. What there is instead: every goal can be taken back off by anyone, the feed
shows the minute and the game each one belongs to, and every goal records the
browser that tapped it in -- not a person, nobody has an account, but enough to
tell four goals from four phones apart from four off one.

**GOAL goes up on every screen at the ground**, over the whole display: the
scorer's face, the word in `SPORTNEWS` tilted ten degrees a hand below it, then
their name and their area. A ball hitting a net was drawn here first, and it
was the better drawing and the worse thing to look at -- the only two facts
anybody wants in that second are *goal* and *who*, and they were the two
arriving last. The photo is there for the same reason: six people look up at
once and a name takes a moment to read, while a face does not.

**And it makes a noise.** `public/audio/gol.mp3` plays with the shout, off one
element for the whole page rather than one per goal -- two clips a second and a
half apart is noise rather than a celebration, so the second rewinds the first.
A browser will not play audio until somebody has touched the page, which is the
right rule: the phone keeping score has been touched, and the one that has not
still gets the shout on screen with the `play()` rejection swallowed.

**Muting is per device.** The switch under the board says *Sound on* or
*Muted*, and the choice lives in that browser's own storage -- somebody at
their desk with the tab open is exactly the person who wants it off, and their
choice should not silence the phone at the ground. It is read with
`useSyncExternalStore` rather than mirrored into state in an effect: one render
of the wrong icon is one render too many, and this app's lint rules refuse the
effect anyway.

**It leaves the way it came in.** The name goes back down and the word shrinks
and turns back to where it started, over the same times and with the same ease,
in reverse order -- and the veil goes with the word, so the pitch is back the
moment the shout is. It used to be a flat fade on both at once, which after all
that arriving read as the screen being switched off.

It is shown the moment the scorer is tapped rather than when the server answers:
the tap and the shout are the same moment on a pitch, and the network is not
invited to it. The broadcast of that same goal then reaches the same device, so
each tap leaves **one echo owed** and the first broadcast for that player pays it
off silently. Marking the goal's id would be tidier, except the broadcast beats
the response that carries the id -- which is exactly how one goal got shouted
twice. An echo that never arrives is forgotten after eight seconds, so a device
with no realtime does not go on swallowing other people's goals.

Two things for a phone in a coat pocket in the dark: the screen is kept awake
while the page is open, and a goal that does not reach the server is kept and
retried every five seconds, with a count of what is still unsent. The signal out
there comes and goes; a goal that vanished because a request failed is the one
thing this screen cannot do.

The goals hang off a **wire down the middle**: the minute on the line, the
scorer on the side their team was playing on, so who is scoring is a shape you
read rather than a colour you decode. Newest at the top -- the last goal is the
one being argued about.

Between games the next pairing is worked out and offered, and which custom it
follows depends on how many sides were drawn.

**Three (or five, or six).** The loser comes off, whoever has waited longest
comes on -- and **nobody plays more than two in a row**. A side that has just
won twice goes off anyway and the side it beat stays to face the fresh legs.
That is the rule almost every triangular is really played by, and the one that
stops an evening turning into one team's exercise bike.

**Four.** They pair off two and two, and then the results decide: the next game
is the two winners, the one after it the two losers, and every round of two
starts from the round before. Nobody sits out more than a game.

**A draw is settled by the app.** On three sides it picks which of the two
comes off; on four it costs the drawing pair nothing -- both are coming off
anyway -- and only decides which of them faces the side that actually won.

The pick is drawn from the id of the game just played rather than from a live
coin toss: unpredictable to everyone standing there, and the same on every phone
reading the fixture. `Math.random()` would have each device offering a different
next game until somebody pressed one. Once a game has finished there is a table -- three for a win, one for
a draw, ordered by points, then goal difference, then goals.

## Stats

Two ways of reading the same goals, in a drawer off the menu: **Players** and
**Nights**. Nothing there can be edited -- it is what happened.

A player's record follows the **games their side played**, not the matches they
turned up to. On a triangular evening one team plays three games and another
two, and a win is a win in the one you were on the pitch for. Turning up and
never getting a side counts as a night and nothing else.

Only finished games count. A game still running has no result, and calling it a
draw until somebody blows the whistle is a lie that corrects itself minutes
later.

A night counts once somebody kept score, rather than once the clock passes it:
going by the clock alone would count a fixture nobody turned up to, and would
leave the sandbox -- whose kick-off is always half an hour ahead -- with no
season at all.

The top three stand on a **podium** above the table -- second, first, third,
the way a podium is stood on rather than listed -- with a cup in gold, silver
and bronze in the corner of each step. The steps are different heights and the
faces different sizes, so each card is built from the bottom up with the name
row and the figures under it at fixed heights: the three names line up, and so
do the goals below them, whatever height the step is.

Its skeleton is the same screen drawn empty -- three steps at their own
heights, the column headings, and rows built from the widths the table itself
uses -- so when the numbers land nothing moves except the ink.

It is four queries for the whole season, not four per match. An office plays
once a week, so this is a few hundred rows, and the arithmetic lives in
`buildStats` where ten tests can reach it without a database.

## The demo

`/demo` is the whole app over rows nobody plays on: the same screen, the same
provider, the same endpoints. Players can be added and deleted, an organizer
picked, the teams drawn, the night played out at `/demo/live`, and the rental
settled -- none of it touching a real fixture.

It is a **world**, not a mock. Every listing reads with a `demo` flag and every
write marks what it creates, so the sandbox never sees the office's rows and the
office never sees the sandbox's. A mock would have tested the mock.

The squad and the pitch live in `src/data/demo.json` -- a list of names,
areas, positions and skills, which is the one thing in the app somebody might
want to edit without reading any code. They are rows in the database like
everything else, though: the sandbox is a **world**, not a fixture file, and
the whole point is that it goes through the same queries, endpoints and rules
the real match does.

`npm run demo:clear` counts what the sandbox owns in whatever database
`.env.local` points at and writes nothing; `npm run demo:clear:yes` deletes it.
Both print the database first. Everything the demo owns carries `is_demo`, so
the deletes cannot reach anything real, and its teams, games, goals and lineup
cascade off the match.

The squad is seeded on the way in rather than by a script somebody has to
remember to run, and **kick-off is always half an hour ahead**. That one detail
is what opens every gate at once -- the teams can be drawn, the night can be
played, the ledger is live -- without a single date being special-cased. Reset
the demo from the menu when it gets messy.

**Nothing in it is seeded twice.** The check used to key off the sandbox
match alone, so deleting that fixture -- which the sandbox exists to let you do
-- brought back a second Demo pitch and a second copy of all eighteen players
on the next visit. Two Emilio Cardenas in one lineup, and taking one off leaves
the other standing there. What is already in the sandbox is reused now; only
what is missing is made.

**And it rolls on.** Finish the sandbox match and the next one is waiting: the
same squad, the same pitch, half an hour ahead again, with its own sides to
draw and its own goals to score. The night just played stays where it is, with
its teams and its table, so the season builds up week by week the way the real
one does. The three-day grace window is skipped here -- the sandbox owes
nobody a rental, and holding its one screen on a match that is over would leave
nothing to try.

Behind the session, and a 404 rather than a redirect for everyone else.

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