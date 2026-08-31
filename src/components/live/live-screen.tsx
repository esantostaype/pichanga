"use client";

import {
  ArrowLeft01Icon,
  GloveIcon,
  ChartLineData01Icon,
  CheckmarkCircle02Icon,
  Delete02Icon,
  FootballIcon,
  PlayIcon,
  StopIcon,
  VolumeHighIcon,
  VolumeOffIcon,
} from "@hugeicons/core-free-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AppHeader } from "@/components/layout/app-header";
import { type PanelName } from "@/components/layout/app-menu";
import { useScene } from "@/components/layout/scene-transition";
import { GalleryDialog } from "@/components/matches/gallery-dialog";
import { MatchesDrawer } from "@/components/matches/matches-drawer";
import { PaymentsDialog } from "@/components/matches/payments-dialog";
import { ShareDialog } from "@/components/matches/share-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TeamCrest } from "@/components/matches/team-crest";
import { PitchSurface } from "@/components/pitch/pitch-surface";
import { PlacesDrawer } from "@/components/places/places-drawer";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { PlayersDrawer } from "@/components/players/players-drawer";
import { StatsDrawer } from "@/components/stats/stats-drawer";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Spinner } from "@/components/ui/spinner";
import { Tabs } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useElementSize } from "@/hooks/use-element-size";
import { useNow } from "@/hooks/use-now";
import { useLocale } from "@/components/providers/locale-provider";
import { useGoalSound } from "@/hooks/use-goal-sound";
import { areaLabel, fill } from "@/i18n/dictionaries";
import { useRealtime } from "@/hooks/use-realtime";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { api } from "@/lib/api-client";
import { getArea, INDEFINITE_GAME } from "@/lib/constants";
import { formatTimeRange } from "@/lib/date";
import {
  currentGame,
  gameScore,
  minuteOf,
  nextPairing,
  standings,
} from "@/lib/live";
import { cn } from "@/lib/utils";
import type {
  Match,
  MatchGame,
  MatchGoal,
  MatchLive,
  MatchTeam,
  Player,
} from "@/types";
import { GOL_MS, GolOverlay } from "./gol-overlay";

/** How often an unsaved goal tries again. The pitch has bad signal. */
const RETRY_MS = 5_000;

/**
 * What the finishing button occupies in the bottom corner: its own height, the
 * strip around it and the offset it sits at. The night keeps that much clear
 * underneath it and nothing more.
 */
const FINISH_CLEARANCE = 48 + 16 + 16;

/**
 * How close to the end is close enough to blow up without being asked twice.
 *
 * Half a minute: nobody plays on for it, and a dialog in the last seconds of a
 * game is a dialog in front of somebody watching a game.
 */
const EARLY_MS = 30_000;

/** How long an unanswered echo waits before it stops being expected. */
const ECHO_MS = 8_000;

/**
 * Match night.
 *
 * Its own screen and its own gestures, which is what lets a **double tap** mean
 * "they scored" here while it still means "they paid" on the lineup: the two
 * never share a page.
 *
 * The board sits in the middle with a side either hand of it while there is
 * room, and the sides drop underneath when there is not. The page scrolls as a
 * page -- the pitch behind it is fixed and the header is pinned, so a thumb
 * anywhere on the screen moves the night rather than only over the cards.
 */
export function LiveScreen({
  match: served,
  backHref,
  initial,
}: {
  match: Match;
  /** Where the arrow goes: this match's own screen. */
  backHref: string;
  initial: MatchLive;
}) {
  const { t } = useLocale();
  /*
   * The lineup can change under a night in progress -- somebody turns up, or
   * somebody has to leave -- and this screen was only handed the match once,
   * at render. It listens for that now, so a side loses a player here at the
   * same moment they walk off, not the next time somebody reloads.
   */
  const [match, setMatch] = useState(served);
  const [live, setLive] = useState(initial);
  const [pending, setPending] = useState<
    Array<{ gameId: string; playerId: string }>
  >([]);
  const [busy, setBusy] = useState(false);
  const [shout, setShout] = useState<{
    key: number;
    player: Player;
    name: string;
    role: string;
    accent: string;
  } | null>(null);

  const [ground, size] = useElementSize<HTMLDivElement>();
  const [hudNode, hudSize] = useElementSize<HTMLDivElement>();

  /* The same panels the lineup has: match night is not a second application. */
  const [panel, setPanel] = useState<PanelName | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [paymentsOpen, setPaymentsOpen] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);
  const [finishing, setFinishing] = useState(false);
  /** Blowing up with time left, which is worth one question. */
  const [endingEarly, setEndingEarly] = useState(false);
  /** Whose gloves are on their way from the server. */
  const [handing, setHanding] = useState<string | null>(null);
  /** Which game's goals are being read. Null follows whatever is on. */
  const [goalsGame, setGoalsGame] = useState<string | null>(null);

  const now = useNow(1_000);
  const { go } = useScene();
  const sound = useGoalSound();
  useWakeLock();

  /*
   * Shouts this device is still expecting to hear back.
   *
   * The tap puts GOAL up straight away -- realtime is optional, and waiting for
   * a round trip on a pitch is waiting -- and the broadcast of that same goal
   * then arrives here too. Marking the goal's id would be the tidy way, except
   * the broadcast usually beats the response that carries the id, which is
   * exactly how one goal got shouted twice.
   *
   * So it is counted instead: one tap, one echo owed. An echo that never comes
   * is forgotten after a few seconds, so a device with no realtime at all does
   * not go on swallowing somebody else's goals.
   */
  const echoes = useRef(new Map<string, number>());
  /** Counts the shouts, purely to give each overlay a fresh key. */
  const shoutCount = useRef(0);

  const byId = new Map(match.players.map((player) => [player.id, player]));
  const teams = match.teams;
  const teamById = new Map(teams.map((team) => [team.id, team]));

  const game = currentGame(live.games);
  const pairing = nextPairing(teams, live.games, live.goals);
  const table = standings(teams, live.games, live.goals);

  // The sandbox plays whenever it likes; a real match waits for its own time.
  const kickedOff = match.isDemo || (now !== null && now >= match.playedAt);

  const refresh = useCallback(async () => {
    try {
      setLive(await api.matches.live(match.id));
    } catch {
      // A missed refresh is a stale board, not a broken one: the next event or
      // the next goal puts it right.
    }
  }, [match.id]);

  /** Puts GOAL up for whoever scored, wherever the news came from. */
  const shoutFor = (playerId: string) => {
    const scorer = byId.get(playerId);
    if (!scorer) return;

    const team = teams.find((one) => one.playerIds.includes(playerId));

    sound.play();

    setShout({
      key: (shoutCount.current += 1),
      player: scorer,
      name: `${scorer.firstName} ${scorer.lastName}`,
      role: getArea(scorer.area).label,
      accent: team?.accent ?? "#c6f432",
    });
  };

  /** Every phone at the ground hears the same goal at the same moment. */
  useRealtime({
    "live:changed": (payload) => {
      if ((payload as { matchId?: string })?.matchId !== match.id) return;
      void refresh();
    },
    "lineup:changed": (payload) => {
      if ((payload as { matchId?: string })?.matchId !== match.id) return;

      void api.matches
        .get(match.id)
        .then(setMatch)
        .catch(() => undefined);
    },
    "live:goal": (payload) => {
      const { matchId, playerId } = (payload ?? {}) as {
        matchId?: string;
        playerId?: string;
      };
      if (matchId !== match.id || !playerId) return;

      const owed = echoes.current.get(playerId) ?? 0;
      if (owed > 0) {
        echoes.current.set(playerId, owed - 1);
        return;
      }

      shoutFor(playerId);
    },
  });

  /* The shout clears itself, so nobody has to dismiss a goal. */
  useEffect(() => {
    if (!shout) return;

    const timer = setTimeout(() => setShout(null), GOL_MS);
    return () => clearTimeout(timer);
  }, [shout]);

  /*
   * Goals that did not reach the server keep trying while the page is open.
   * Out on a pitch the signal comes and goes, and a goal that vanished because
   * the request failed is the one thing this screen cannot do.
   */
  useEffect(() => {
    if (pending.length === 0) return;

    const timer = setInterval(() => {
      const next = pending[0];
      if (!next) return;

      void api.matches
        .addGoal(match.id, next.gameId, next.playerId, recorderId())
        .then((state) => {
          setLive(state);
          setPending((queue) => queue.slice(1));
        })
        .catch(() => undefined);
    }, RETRY_MS);

    return () => clearInterval(timer);
  }, [pending, match.id]);

  const score = (player: Player) => {
    if (!game) return;

    // Straight away, before the request: the tap and the shout are the same
    // moment on the pitch, and the network is not invited to that.
    echoes.current.set(player.id, (echoes.current.get(player.id) ?? 0) + 1);
    shoutFor(player.id);

    // If the echo never lands -- no realtime configured, a dropped socket --
    // stop expecting it rather than eating the next one from somebody else.
    setTimeout(() => {
      const owed = echoes.current.get(player.id) ?? 0;
      if (owed > 0) echoes.current.set(player.id, owed - 1);
    }, ECHO_MS);

    void api.matches
      .addGoal(match.id, game.id, player.id, recorderId())
      .then(setLive)
      .catch(() => {
        // Kept and retried rather than reported: whoever tapped it is looking
        // at the pitch, not at a toast.
        setPending((queue) => [
          ...queue,
          { gameId: game.id, playerId: player.id },
        ]);
      });
  };

  const undo = (goal: MatchGoal) => {
    void api.matches
      .removeGoal(match.id, goal.id)
      .then(setLive)
      .catch(() => undefined);
  };

  /*
   * Handing the gloves over from here, which is where somebody is standing
   * when they find out the keeper's knee hurts. Only between games -- or at
   * any time with two sides, since there is nobody waiting to be unfair to.
   * The server holds the same rule and the toast carries its refusal back.
   */
  const handOver = (teamId: string, playerId: string) => {
    setHanding(playerId);

    void api.matches
      .setKeeper(match.id, teamId, playerId)
      .then(setMatch)
      .catch((error: unknown) => {
        toast.error(
          error instanceof Error ? error.message : t.live.keeperStuck,
        );
      })
      .finally(() => setHanding(null));
  };

  const kickOff = () => {
    if (!pairing) return;
    setBusy(true);

    void api.matches
      .startGame(match.id, pairing.homeTeamId, pairing.awayTeamId)
      .then(setLive)
      .catch(() => undefined)
      .finally(() => setBusy(false));
  };

  const finish = () => {
    setBusy(true);

    void api.matches
      .finishNight(match.id)
      .then(() => {
        // There is no night left to keep: the match goes back to being the
        // notice it was, and this screen has nothing more to show.
        go(backHref);
      })
      .catch(() => setBusy(false));
  };

  /*
   * Nobody blows up four minutes early by accident, but somebody reaching for
   * the goals button at arm's length might. So it is asked -- once, and only
   * while there is enough time left on it to be worth asking about.
   */
  const whistle = () => {
    // Nothing to be early for when there is no clock: the game ends when
    // somebody says it does, which is what they agreed to.
    if (timed && remaining > EARLY_MS) setEndingEarly(true);
    else fullTime();
  };

  const fullTime = () => {
    if (!game) return;
    setBusy(true);

    void api.matches
      .endGame(match.id, game.id)
      .then(setLive)
      .catch(() => undefined)
      .finally(() => setBusy(false));
  };

  /*
   * The tab opens on whatever is being played, and on the last one played once
   * the whistle has gone -- that is the game being argued about. Picking
   * another only lasts as long as the dialog is open; the next time it is
   * opened it is back on the current one.
   */
  const readingGame =
    goalsGame ?? game?.id ?? live.games[live.games.length - 1]?.id ?? null;

  const shownGoals = live.goals.filter((goal) => goal.gameId === readingGame);

  const home = game ? teamById.get(game.homeTeamId) : undefined;
  const away = game ? teamById.get(game.awayTeamId) : undefined;
  const running = game ? gameScore(live.goals, game) : null;
  const elapsed = game && now ? now - game.startedAt : 0;
  /**
   * What is left of the length agreed for the night, and whether there is a
   * length at all: two sides may agree to play the whole match as one game.
   */
  const timed = match.gameMinutes > INDEFINITE_GAME;
  const remaining = timed
    ? Math.max(0, match.gameMinutes * 60_000 - elapsed)
    : Infinity;
  const nextHome = pairing ? teamById.get(pairing.homeTeamId) : undefined;
  const nextAway = pairing ? teamById.get(pairing.awayTeamId) : undefined;

  /*
   * Whether the gloves may move: between games always, and during one only
   * when two sides are playing -- with three there is a side waiting to come
   * on and a table being kept on the result.
   */
  const glovesMove = !game || teams.length === 2;

  /** The two sides on the pitch, or the two about to be. */
  const left = home ?? nextHome;
  const right = away ?? nextAway;

  const squadOf = (team: MatchTeam | undefined) =>
    (team?.playerIds ?? [])
      .map((id) => byId.get(id))
      .filter((player) => player !== undefined);

  const goalsOf = (team: MatchTeam | undefined) =>
    game && team
      ? live.goals.filter(
          (goal) => goal.gameId === game.id && goal.teamId === team.id,
        )
      : [];

  return (
    /*
      `overflow-x-clip` and not `hidden`: hidden on one axis forces `auto` on
      the other, which quietly turns this into its own scroll container -- and
      then a wheel over the fixed pitch behind it scrolls the document, which
      has nothing to scroll. Clipping leaves the page scrolling as a page.
    */
    <main className="relative min-h-dvh w-full overflow-x-clip bg-(--grass-edge)">
      {/* The same grass as the lineup, held still behind the night. */}
      <div ref={ground} className="fixed inset-0">
        <PitchSurface width={size.width} height={size.height || 1} />
        <div className="absolute inset-0 bg-background/75" />
      </div>

      {shout ? (
        <GolOverlay
          key={shout.key}
          player={shout.player}
          name={shout.name}
          role={shout.role}
          accent={shout.accent}
        />
      ) : null}

      {/*
        The header the whole app wears, unchanged -- pinned to the window here,
        because this page scrolls and the way out must not scroll with it.
      */}
      <AppHeader
        fixed
        match={match}
        hudRef={hudNode}
        onOpenPayments={() => setPaymentsOpen(true)}
        onShare={() => setShareOpen(true)}
        onGallery={() => setGalleryOpen(true)}
        onSelectPanel={setPanel}
        onSignIn={() => undefined}
      />

      {/*
        Centred in the window while it fits, and growing past it when it does
        not: `justify-center` stops mattering the moment the content is taller
        than the minimum, so nothing is ever pushed off the top.
      */}
      <div
        className="relative mx-auto flex min-h-dvh w-full max-w-6xl flex-col justify-center px-3 sm:px-4"
        /*
         * The header's height at the top, because it is fixed and would sit on
         * the board otherwise, and only the finishing button's corner at the
         * bottom. Matching the two looked right on a short night and left a
         * screenful of grass under a long one -- and the middle of the window
         * a reader means is the middle of what they can see under the header
         * anyway.
         */
        style={{
          paddingTop: hudSize.height + 16,
          paddingBottom: FINISH_CLEARANCE,
        }}
      >
        {/*
          Three shapes, not two. On a phone everything is one column. From 480
          the two sides sit next to each other with the board across the top --
          a tablet has room for them side by side but not for a board between
          them, which at that width leaves each side about a hundred pixels.
          From 768 the board moves into the middle where it belongs.
        */}
        <div className="grid items-start gap-3 xs:grid-cols-2 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          {/* The board first on a phone, in the middle on a screen. */}
          {/*
            The sides start at the top of the row and the board sits in the
            middle of it: they are lists that grow downwards, and it is a score
            being compared across them.
          */}
          <div className="order-first xs:col-span-2 md:order-none md:col-span-1 md:col-start-2 md:row-start-1 md:self-center">
            <Board
              match={match}
              backHref={backHref}
              home={left}
              away={right}
              score={running}
              elapsed={elapsed}
              gameNumber={game ? game.slot + 1 : null}
              playing={!!game}
              canKickOff={kickedOff && !!pairing}
              busy={busy}
              unsent={pending.length}
              onKickOff={kickOff}
              onFullTime={whistle}
              onGoals={() => {
                // Back to the current game every time it is opened.
                setGoalsGame(null);
                setGoalsOpen(true);
              }}
              soundOn={sound.enabled}
              onToggleSound={() => sound.setEnabled(!sound.enabled)}
              onTable={() => setTableOpen(true)}
              goals={live.goals.length}
              hasTable={live.games.some((one) => one.endedAt !== null)}
            />
          </div>

          {left ? (
            <TeamSheet
              team={left}
              players={squadOf(left)}
              goals={goalsOf(left)}
              onScore={game ? score : undefined}
              onSetKeeper={
                glovesMove
                  ? (playerId) => handOver(left.id, playerId)
                  : undefined
              }
              keeperPending={handing}
              // Narrower than its column, and pushed towards the board: two
              // sheets stretched across a wide screen put the names further
              // from the score than they are from the edge.
              className="xs:col-start-1 md:row-start-1 md:w-full md:max-w-[20rem] md:justify-self-end"
            />
          ) : null}

          {right ? (
            <TeamSheet
              team={right}
              players={squadOf(right)}
              goals={goalsOf(right)}
              onScore={game ? score : undefined}
              onSetKeeper={
                glovesMove
                  ? (playerId) => handOver(right.id, playerId)
                  : undefined
              }
              keeperPending={handing}
              className="xs:col-start-2 md:col-start-3 md:row-start-1 md:w-full md:max-w-[20rem] md:justify-self-start"
            />
          ) : null}
        </div>
      </div>

      {/* ------------------------------- panels ------------------------------ */}

      <Dialog open={goalsOpen} onOpenChange={setGoalsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t.live.goalsTitle}</DialogTitle>
            <DialogDescription>
              {live.goals.length === 0
                ? t.live.noGoalsYet
                : fill(t.live.goalsSoFar, {
                    goals: live.goals.length,
                    count: live.games.length,
                    games:
                      live.games.length === 1 ? t.common.game : t.common.games,
                  })}
            </DialogDescription>
          </DialogHeader>

          {live.games.length > 0 ? (
            <Tabs
              ariaLabel={t.live.whichGame}
              value={readingGame ?? ""}
              onChange={setGoalsGame}
              items={live.games.map((one) => ({
                value: one.id,
                label: fill(t.live.gameNumber, { number: one.slot + 1 }),
              }))}
            />
          ) : null}

          {shownGoals.length > 0 ? (
            <Timeline
              goals={shownGoals}
              games={live.games}
              teams={teams}
              players={byId}
              // Only the game being played can be corrected: the rest are
              // results the teams already played on.
              onUndo={game && readingGame === game.id ? undo : undefined}
            />
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t.live.goalsEmpty}
            </p>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={tableOpen} onOpenChange={setTableOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t.live.tableTitle}</DialogTitle>
            <DialogDescription>{t.live.tableLine}</DialogDescription>
          </DialogHeader>

          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-1 text-left font-normal">
                  {t.live.tableTeam}
                </th>
                <th className="w-8 py-1 text-right font-normal">{t.table.p}</th>
                <th className="w-8 py-1 text-right font-normal">{t.table.w}</th>
                <th className="w-8 py-1 text-right font-normal">{t.table.d}</th>
                <th className="w-8 py-1 text-right font-normal">{t.table.l}</th>
                <th className="w-12 py-1 text-right font-normal">
                  {t.table.gd}
                </th>
                <th className="w-8 py-1 text-right font-normal">
                  {t.table.points}
                </th>
              </tr>
            </thead>
            <tbody>
              {table.map((row) => {
                const team = teamById.get(row.teamId);

                return (
                  <tr key={row.teamId} className="border-t border-border/50">
                    <td className="py-2">
                      <span className="flex items-center gap-2">
                        {team ? (
                          <TeamCrest
                            name={team.name}
                            accent={team.accent}
                            size={18}
                          />
                        ) : null}
                        <span className="truncate">{team?.name}</span>
                      </span>
                    </td>
                    <td className="text-right tabular-nums">{row.played}</td>
                    <td className="text-right tabular-nums">{row.won}</td>
                    <td className="text-right tabular-nums">{row.drawn}</td>
                    <td className="text-right tabular-nums">{row.lost}</td>
                    <td className="text-right tabular-nums">
                      {row.goalsFor - row.goalsAgainst}
                    </td>
                    <td className="text-right font-semibold tabular-nums">
                      {row.points}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </DialogContent>
      </Dialog>

      {/*
        The last whistle, in the corner the app keeps its actions in. Soft
        rather than solid: it is the end of the night, not the thing anybody is
        here to press.
      */}
      <div className="fixed bottom-4 right-4 z-30">
        <Button
          variant="soft"
          size="icon-lg"
          aria-label={t.live.finishTitle}
          title={t.live.finishTitle}
          disabled={busy}
          onClick={() => setFinishing(true)}
        >
          {busy ? <Spinner /> : <Icon icon={CheckmarkCircle02Icon} size={22} />}
        </Button>
      </div>

      <ConfirmDialog
        open={endingEarly}
        onOpenChange={setEndingEarly}
        title={t.live.earlyTitle}
        description={fill(t.live.earlyLine, {
          left: clock(remaining),
          minutes: match.gameMinutes,
        })}
        confirmLabel={t.live.earlyConfirm}
        pending={busy}
        onConfirm={() => {
          setEndingEarly(false);
          fullTime();
        }}
      />

      <ConfirmDialog
        open={finishing}
        onOpenChange={setFinishing}
        title={t.live.finishTitle}
        description={t.live.finishLine}
        confirmLabel={t.live.finishConfirm}
        pending={busy}
        onConfirm={() => {
          setFinishing(false);
          finish();
        }}
      />

      <ShareDialog open={shareOpen} onOpenChange={setShareOpen} match={match} />

      <GalleryDialog
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        matchId={match.id}
        playedAt={match.playedAt}
        canAdd
      />

      <MatchesDrawer
        open={panel === "matches"}
        onOpenChange={(next) => setPanel(next ? "matches" : null)}
      />

      <PlayersDrawer
        open={panel === "players"}
        onOpenChange={(next) => setPanel(next ? "players" : null)}
      />

      <PlacesDrawer
        open={panel === "places"}
        onOpenChange={(next) => setPanel(next ? "places" : null)}
      />

      <StatsDrawer
        open={panel === "stats"}
        onOpenChange={(next) => setPanel(next ? "stats" : null)}
      />

      <PaymentsDialog
        open={paymentsOpen}
        onOpenChange={setPaymentsOpen}
        match={match}
      />
    </main>
  );
}

/**
 * The scoreboard: no card, no border, nothing behind it.
 *
 * It is the thing being looked at, and a box around it would be a second thing
 * to look at. The pitch is the background it deserves.
 */
/**
 * When the clock starts warning.
 *
 * Two readings rather than one: amber says the game is nearly up, so whoever
 * is refereeing can let it run to something, and red says it is up. Neither
 * stops anything -- the whistle is still a person pressing a button -- they
 * just mean nobody has to do arithmetic with a stopwatch.
 */
const CLOCK_AMBER = 0.75;
const CLOCK_RED = 0.95;

function Board({
  match,
  backHref,
  home,
  away,
  score,
  elapsed,
  gameNumber,
  playing,
  canKickOff,
  busy,
  unsent,
  goals,
  hasTable,
  onKickOff,
  onFullTime,
  onGoals,
  onTable,
  soundOn,
  onToggleSound,
}: {
  match: Match;
  backHref: string;
  home?: MatchTeam;
  away?: MatchTeam;
  score: { home: number; away: number } | null;
  elapsed: number;
  gameNumber: number | null;
  playing: boolean;
  canKickOff: boolean;
  busy: boolean;
  unsent: number;
  goals: number;
  hasTable: boolean;
  onKickOff: () => void;
  onFullTime: () => void;
  onGoals: () => void;
  onTable: () => void;
  /** This device's own choice, kept in its own storage. */
  soundOn: boolean;
  onToggleSound: () => void;
}) {
  const { t } = useLocale();
  /*
   * How far through the agreed length this game is -- and never, if the two
   * sides are playing the match out as one game. A clock with nothing to run
   * out has no reason to go amber.
   */
  const share =
    match.gameMinutes > INDEFINITE_GAME
      ? elapsed / (match.gameMinutes * 60_000)
      : 0;

  return (
    <section className="py-2 text-center md:px-4">
      <div className="mb-3 flex items-center justify-center gap-3">
        <a
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground no-underline transition-colors hover:text-foreground"
        >
          <Icon icon={ArrowLeft01Icon} size={14} />
          {t.live.lineup}
        </a>

        {unsent > 0 ? (
          <span className="flex items-center gap-2 rounded-full bg-amber-400/15 px-3 py-1 text-xs text-amber-300">
            <Spinner />
            {fill(t.live.unsent, { count: unsent })}
          </span>
        ) : null}
      </div>

      {home && away ? (
        <>
          <div className="flex items-center justify-center gap-3 sm:gap-5">
            <Digit value={score?.home ?? 0} accent={home.accent} />
            <div className="flex flex-col items-center gap-1">
              <TeamCrest name={home.name} accent={home.accent} size={26} />
              <span className="font-display text-[0.625rem] uppercase tracking-[0.2em] text-muted-foreground">
                {t.common.versus}
              </span>
              <TeamCrest name={away.name} accent={away.accent} size={26} />
            </div>
            <Digit value={score?.away ?? 0} accent={away.accent} />
          </div>

          <p
            className={cn(
              "mt-4 font-display text-3xl tabular-nums tracking-[0.08em] transition-colors",
              !playing
                ? "text-foreground"
                : share >= CLOCK_RED
                  ? "text-destructive"
                  : share >= CLOCK_AMBER
                    ? "text-amber-400"
                    : "text-foreground",
            )}
          >
            {playing ? clock(elapsed) : "--:--"}
          </p>

          <p className="mt-1.5 font-display text-sm uppercase tracking-[0.2em] text-muted-foreground">
            {playing
              ? fill(t.live.gameNumber, { number: gameNumber ?? 0 })
              : gameNumber === null
                ? t.live.nextUp
                : t.live.betweenGames}
            {" · "}
            {match.gameMinutes > INDEFINITE_GAME
              ? fill(t.live.minutes, { count: match.gameMinutes })
              : t.live.noClock}
          </p>
        </>
      ) : (
        <p className="font-display text-xl uppercase tracking-[0.06em]">
          {t.live.noSides}
        </p>
      )}

      {/*
        The whistle in the middle with a reading either side of it: it is the
        one button anybody presses in a hurry, and it should be under the same
        thumb whether the goals have piled up or not.
      */}
      <div className="mt-5 flex items-center justify-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="soft"
              size="icon"
              aria-label={t.live.goalsTitle}
              disabled={goals === 0}
              onClick={onGoals}
            >
              <Icon icon={FootballIcon} size={18} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{t.live.goalsTitle}</TooltipContent>
        </Tooltip>

        {playing ? (
          <Button variant="secondary" disabled={busy} onClick={onFullTime}>
            {busy ? <Spinner /> : <Icon icon={StopIcon} size={16} />}
            {t.live.fullTime}
          </Button>
        ) : (
          <Button disabled={busy || !canKickOff} onClick={onKickOff}>
            {busy ? <Spinner /> : <Icon icon={PlayIcon} size={16} />}
            {t.live.kickOff}
          </Button>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="soft"
              size="icon"
              aria-label={t.live.tableTitle}
              disabled={!hasTable}
              onClick={onTable}
            >
              <Icon icon={ChartLineData01Icon} size={18} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{t.live.tableTitle}</TooltipContent>
        </Tooltip>
      </div>

      {/*
        The sound, and the way to stop it. Somebody is always at their desk
        with the tab open, and a goal at full volume is how that person stops
        keeping the tab open.
      */}
      <div className="mt-3 flex items-center justify-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              role="switch"
              aria-checked={soundOn}
              aria-label={soundOn ? t.live.soundOnLabel : t.live.soundOffLabel}
              onClick={onToggleSound}
              className={cn(
                "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 font-display text-[0.6875rem] uppercase tracking-[0.18em] transition-colors",
                soundOn
                  ? "text-primary hover:bg-primary/10"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon icon={soundOn ? VolumeHighIcon : VolumeOffIcon} size={15} />
              {soundOn ? t.live.soundOn : t.live.muted}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {soundOn ? t.live.soundOnHint : t.live.mutedHint}
          </TooltipContent>
        </Tooltip>
      </div>

      {!playing && !canKickOff ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {fill(t.live.firstGame, {
            time: formatTimeRange(match.playedAt, match.endsAt).split(" - ")[0],
          })}
          {formatTimeRange(match.playedAt, match.endsAt).split(" - ")[0]}.
        </p>
      ) : null}
    </section>
  );
}

/**
 * One side's score, in the team's colour.
 *
 * The tint is mixed rather than made transparent: it looks the same over this
 * page's dark ground, but the pitch markings behind it do not run through the
 * numbers -- which they did, and a halfway line crossing a scoreline reads as
 * a mistake.
 */
function Digit({ value, accent }: { value: number; accent: string }) {
  return (
    <span
      className="grid size-16 place-items-center rounded-full font-display text-4xl tabular-nums sm:size-20 sm:text-5xl"
      style={{
        backgroundColor: `color-mix(in oklab, ${accent} 12%, var(--background))`,
        border: `1px solid color-mix(in oklab, ${accent} 42%, var(--background))`,
        color: accent,
      }}
    >
      {value}
    </span>
  );
}

/**
 * One side, with its players as targets.
 *
 * Built like a player's card -- the team's colour bleeding down from the top
 * and giving out before the names -- because that is what the app already uses
 * for "here is somebody", and a team is a group of somebodies.
 *
 * A **double tap** is the goal. A single one would fire while somebody is
 * scrolling the list with a thumb, and this screen is used one-handed in the
 * dark by a person also watching a football match.
 */
function TeamSheet({
  team,
  players,
  goals,
  onScore,
  onSetKeeper,
  keeperPending,
  className,
}: {
  team: MatchTeam;
  players: Player[];
  goals: MatchGoal[];
  /** Absent between games: there is nothing to score in. */
  onScore?: (player: Player) => void;
  /** Absent while a game is on with three sides drawn. */
  onSetKeeper?: (playerId: string) => void;
  /** Whose gloves are on their way from the server. */
  keeperPending?: string | null;
  className?: string;
}) {
  const { t } = useLocale();
  const tally = new Map<string, number>();
  for (const goal of goals) {
    tally.set(goal.playerId, (tally.get(goal.playerId) ?? 0) + 1);
  }

  return (
    <section
      className={cn(
        "group/sheet overflow-hidden rounded-2xl bg-card/70 backdrop-blur-md",
        className,
      )}
    >
      {/*
        One flat wash of the side's colour -- the same mix the score wears, so
        the card and the number on the board read as the same team. No outline
        and no gradient: the colour is the edge, and a fade down the card was a
        second thing happening for no reason.
      */}
      <div
        className="p-4"
        style={{
          backgroundColor: `color-mix(in oklab, ${team.accent} 12%, var(--background))`,
        }}
      >
        <header className="mb-3 flex items-center gap-2.5">
          <TeamCrest name={team.name} accent={team.accent} size={30} />
          <p
            className="min-w-0 flex-1 truncate font-display text-lg uppercase tracking-[0.04em]"
            style={{ color: team.accent }}
          >
            {team.name}
          </p>
          {onScore ? (
            <span className="shrink-0 text-[0.625rem] uppercase tracking-wider text-muted-foreground">
              {t.live.doubleTap}
            </span>
          ) : null}
        </header>

        {/*
          The rows carry nothing of their own -- no plate, no outline, no
          padding. Twelve small boxes inside a box read as a table of contents;
          a face, a name and a colour are enough to tell one player from the
          next, and a hairline between them does the separating.

          The line belongs to the row above it and the space is split evenly
          either side, so it sits in the middle of the gap rather than under
          one name. The last row has neither: a rule under the final player
          draws a floor that is not there.
        */}
        <ul className="grid [&>li:not(:last-child)]:border-b [&>li:not(:last-child)]:border-white/[0.06] [&>li:not(:first-child)]:pt-2.5 [&>li:not(:last-child)]:pb-2.5">
          {players.map((player) => {
            const scored = tally.get(player.id) ?? 0;

            return (
              <li key={player.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onDoubleClick={onScore ? () => onScore(player) : undefined}
                  disabled={!onScore}
                  title={
                    onScore
                      ? fill(t.live.giveGoal, { name: player.firstName })
                      : undefined
                  }
                  className="flex min-w-0 flex-1 select-none items-center gap-2.5 rounded-xl text-left transition-opacity enabled:cursor-pointer enabled:hover:opacity-80 enabled:active:scale-[0.99] disabled:cursor-default"
                >
                  <PlayerAvatar
                    player={player}
                    className="size-9 shrink-0"
                    style={{
                      outline: `2px solid ${team.accent}`,
                      outlineOffset: "-2px",
                    }}
                  />

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium leading-tight">
                      {player.firstName} {player.lastName}
                    </span>
                    <span className="block truncate font-display text-[0.8125rem] uppercase leading-tight tracking-widest text-muted-foreground">
                      {areaLabel(player.area)}
                    </span>
                  </span>

                  {scored > 0 ? (
                    <span
                      className="flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 font-display text-sm tabular-nums"
                      style={{
                        color: team.accent,
                        backgroundColor: `${team.accent}1f`,
                      }}
                    >
                      <Icon icon={FootballIcon} size={13} />
                      {scored}
                    </span>
                  ) : null}
                </button>

                {/*
                  The gloves, on the right where the eye can run down them.
                  The one wearing them and the way to hand them over are the
                  same mark at the same size -- the size they are on the pitch
                  -- so there is one thing to look for and one place to press.

                  Beside the row rather than inside it: the row is already a
                  button, and one cannot hold another.
                */}
                {player.id === team.keeperId ? (
                  <span
                    aria-label={t.pitch.inGoal}
                    title={t.pitch.inGoal}
                    className="grid size-8 shrink-0 place-items-center rounded-full border"
                    style={{
                      color: team.accent,
                      borderColor: `${team.accent}66`,
                      backgroundColor: `color-mix(in oklab, ${team.accent} 22%, var(--background))`,
                    }}
                  >
                    <Icon icon={GloveIcon} size={16} strokeWidth={2} />
                  </span>
                ) : onSetKeeper ? (
                  <button
                    type="button"
                    onClick={() => onSetKeeper(player.id)}
                    disabled={keeperPending === player.id}
                    aria-label={fill(t.pitch.putInGoal, {
                      name: player.firstName,
                    })}
                    title={fill(t.pitch.putInGoal, {
                      name: player.firstName,
                    })}
                    className={cn(
                      "grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-muted-foreground transition-all hover:text-foreground focus-visible:opacity-100 group-hover/sheet:opacity-100 disabled:cursor-default pointer-coarse:opacity-70",
                      keeperPending === player.id ? "opacity-100" : "opacity-0",
                    )}
                  >
                    {keeperPending === player.id ? (
                      <Spinner size={16} />
                    ) : (
                      <Icon icon={GloveIcon} size={16} />
                    )}
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/**
 * The goals, down a wire.
 *
 * The minute sits on the line and the scorer hangs off the side their team was
 * playing on, so who is scoring is a shape you read rather than a colour you
 * decode. Newest at the top: the last goal is the one being argued about.
 */
function Timeline({
  goals,
  games,
  teams,
  players,
  onUndo,
}: {
  goals: MatchGoal[];
  games: MatchGame[];
  teams: MatchTeam[];
  players: Map<string, Player>;
  /** Absent once the game has finished, which is most of them. */
  onUndo?: (goal: MatchGoal) => void;
}) {
  const { t } = useLocale();
  return (
    <ol className="relative max-h-[60vh] overflow-y-auto scrollbar-thin">
      {/* The wire itself, behind the minutes. */}
      <span
        aria-hidden
        className="absolute inset-y-3 left-1/2 w-px -translate-x-1/2 bg-border"
      />

      {[...goals].reverse().map((goal) => {
        const scorer = players.get(goal.playerId);
        const team = teams.find((one) => one.id === goal.teamId);
        const game = games.find((one) => one.id === goal.gameId);
        // The side of the wire is the side of the pitch they were on.
        const home = game?.homeTeamId === goal.teamId;

        const name = (
          <div
            className={cn(
              "flex min-w-0 items-center gap-2",
              home
                ? "justify-end text-right"
                : "flex-row-reverse justify-end text-left",
            )}
          >
            {onUndo ? (
              <button
                type="button"
                onClick={() => onUndo(goal)}
                aria-label={t.live.undoGoal}
                title={t.live.undoGoal}
                className="shrink-0 cursor-pointer text-muted-foreground/40 transition-colors hover:text-destructive"
              >
                <Icon icon={Delete02Icon} size={14} />
              </button>
            ) : null}

            <span className="min-w-0 truncate text-sm font-medium">
              {scorer
                ? `${scorer.firstName} ${scorer.lastName}`
                : t.live.unknown}
            </span>

            <span className="shrink-0" style={{ color: team?.accent }}>
              <Icon icon={FootballIcon} size={16} />
            </span>
          </div>
        );

        return (
          <li
            key={goal.id}
            className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-2"
          >
            {home ? name : <span />}

            <span
              className="relative grid size-11 shrink-0 place-items-center rounded-full border bg-card font-display text-sm tabular-nums"
              style={{
                borderColor: `${team?.accent ?? "#ffffff"}59`,
                color: team?.accent,
              }}
            >
              {minuteOf(goal, game)}&apos;
            </span>

            {home ? <span /> : name}
          </li>
        );
      })}
    </ol>
  );
}

/** mm:ss, counting up. Past ten minutes it keeps counting, in red. */
function clock(elapsed: number) {
  const seconds = Math.max(0, Math.floor(elapsed / 1000));
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return `${mm}:${ss}`;
}

/** The browser that tapped it in. Not a person: nobody has an account. */
function recorderId() {
  try {
    return sessionStorage.getItem("pichanga:visitor");
  } catch {
    return null;
  }
}
