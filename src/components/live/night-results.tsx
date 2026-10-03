"use client";

import {
  ArrowLeft01Icon,
  ChampionIcon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";
import Image from "next/image";
import { useCallback, useState } from "react";

import { useScene } from "@/components/layout/scene-transition";
import { TeamCrest } from "@/components/matches/team-crest";
import { PitchSurface } from "@/components/pitch/pitch-surface";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Icon } from "@/components/ui/icon";
import { useElementSize } from "@/hooks/use-element-size";
import { useRealtime } from "@/hooks/use-realtime";
import { fill } from "@/i18n/dictionaries";
import { api } from "@/lib/api-client";
import { loanHeroes } from "@/lib/loans";
import { PrizeLedger } from "./prize-ledger";
import { formatMoney } from "@/lib/money";
import { nightPrize, type PrizeRow } from "@/lib/prize";
import { cn } from "@/lib/utils";
import type { Match, MatchLive } from "@/types";

/**
 * The end of the night: the podium in the middle of the pitch, the pot and who
 * takes it, and the button that closes the night for good.
 *
 * Its own address, so it can be put up on the phone everybody crowds round
 * while the money changes hands. Reading it changes nothing; only "close the
 * night" does, and once it has the page stays as a record of how it finished.
 */
export function NightResults({
  match: served,
  initial,
  backHref,
  liveHref,
}: {
  match: Match;
  initial: MatchLive;
  /** The lineup, where closing the night sends everybody. */
  backHref: string;
  /** Match night, for when somebody wants one more game after all. */
  liveHref: string;
}) {
  const { t } = useLocale();
  const { go } = useScene();
  const [ground, size] = useElementSize<HTMLDivElement>();

  const [match, setMatch] = useState(served);
  const [live, setLive] = useState(initial);
  const [confirming, setConfirming] = useState(false);
  const [closing, setClosing] = useState(false);

  // A goal taken back or a game ended on another phone moves the podium too.
  const refresh = useCallback(async () => {
    try {
      setLive(await api.matches.live(match.id));
      setMatch(await api.matches.get(match.id));
    } catch {
      // The last good table stays up; the next event tries again.
    }
  }, [match.id]);

  useRealtime({
    "live:changed": (payload) => {
      if ((payload as { matchId?: string })?.matchId === match.id) {
        void refresh();
      }
    },
  });

  const closed = match.closedAt !== null;
  const prize = nightPrize(match.teams, live.games, live.goals, match.bet);
  const byId = new Map(match.players.map((player) => [player.id, player]));

  /** The podium is the winners and nobody else; the rest go in the table. */
  const podium = prize.rows.filter((row) => prize.winnerIds.includes(row.team.id));
  const rest = prize.rows.filter((row) => !prize.winnerIds.includes(row.team.id));
  const played = prize.rows.some((row) => row.standing.played > 0);
  const playedGames = live.games.filter((one) => one.endedAt !== null).length;

  // The lent players who helped their borrowed side win: their reward.
  const heroes = loanHeroes(live.loans, live.games, live.goals).flatMap(
    (hero) => {
      const player = byId.get(hero.playerId);
      const team = match.teams.find((one) => one.id === hero.teamId);
      return player && team ? [{ ...hero, player, team }] : [];
    },
  );

  const close = () => {
    setClosing(true);

    void api.matches
      .finishNight(match.id)
      .then(() => go(backHref))
      .catch(() => setClosing(false));
  };

  return (
    <main className="relative min-h-svh overflow-x-hidden bg-background">
      {/* The pitch, fixed behind the whole page: the podium stands on it. */}
      <div ref={ground} className="fixed inset-0">
        <PitchSurface width={size.width} height={size.height || 1} />
        <div aria-hidden className="absolute inset-0 bg-black/45" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-svh w-full max-w-3xl flex-col items-center justify-center gap-6 px-4 py-10">
        <header className="flex flex-col items-center gap-2 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg">
            <Icon icon={ChampionIcon} size={24} />
          </span>
          <h1 className="font-display text-4xl uppercase tracking-[0.04em] sm:text-5xl">
            {t.results.title}
          </h1>

          {/* The pot: how big, and where it came from. */}
          {prize.bet > 0 ? (
            <p className="flex flex-wrap items-baseline justify-center gap-x-2 text-sm text-foreground/80">
              <span className="font-display text-2xl uppercase tracking-[0.06em] text-primary">
                {t.results.pot} {formatMoney(prize.pot)}
              </span>
              <span>
                {fill(t.results.potLine, {
                  count: prize.pot / prize.bet,
                  bet: formatMoney(prize.bet),
                })}
              </span>
            </p>
          ) : (
            <p className="text-sm text-foreground/70">{t.results.noBet}</p>
          )}
        </header>

        {!played ? (
          <p className="max-w-md rounded-2xl border border-white/10 bg-black/60 px-5 py-4 text-center text-sm backdrop-blur-md">
            {t.results.noGames}
          </p>
        ) : (
          <>
            {/*
              The winners, side by side and all the same height: sharing the
              pot is sharing first place, so no step is taller than another.
              The cup is taller than the steps on purpose -- it is the thing
              the night was played for.
              The cup stands beside a lone winner, overlapping its edge, and
              between them when there are two or more -- centred on the row,
              which with three puts it in front of the middle one.
            */}
            {podium.length ? (
              <div
                className={cn(
                  "relative flex w-full items-end justify-center",
                  // Room in the middle for the cup when it stands between them.
                  podium.length > 1 ? "gap-12 sm:gap-16" : "gap-3",
                  podium.length >= 3
                    ? "[--step:6.5rem] sm:[--step:10rem]"
                    : "[--step:9.5rem] sm:[--step:11.5rem]",
                )}
              >
                {podium.map((row) => (
                  <Step key={row.team.id} row={row} showMoney={prize.bet > 0} />
                ))}

                <Image
                  src="/images/cup.png"
                  alt={t.results.cup}
                  width={138}
                  height={331}
                  priority
                  className={cn(
                    "pointer-events-none absolute bottom-0 z-10 h-44 w-auto drop-shadow-[0_8px_24px_rgba(0,0,0,0.6)] sm:h-56",
                    podium.length === 1
                      ? // Beside the one winner, 24px over its edge.
                        "left-1/2 ml-[calc(var(--step)/2_-_24px)]"
                      : "left-1/2 -translate-x-1/2",
                  )}
                />
              </div>
            ) : (
              <p className="max-w-md rounded-2xl border border-white/10 bg-black/60 px-5 py-4 text-center text-sm backdrop-blur-md">
                {prize.allLevel ? t.results.allLevel : t.results.noGames}
              </p>
            )}

            {podium.length > 1 ? (
              <p className="text-sm text-primary">{t.results.tie}</p>
            ) : null}

            {/* Everybody else, the way the season card lists a night. */}
            {rest.length ? (
              <section className="w-full rounded-2xl border border-border/70 bg-card/80 p-4 backdrop-blur-md">
                <header className="flex items-baseline justify-between gap-3">
                  <p className="font-display text-lg uppercase tracking-[0.04em]">
                    {podium.length ? t.results.rest : t.results.table}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {fill(t.results.gamesPlayed, { count: playedGames })}
                  </p>
                </header>
                <ul className="mt-3 space-y-1.5">
                  {rest.map((row) => (
                    <li
                      key={row.team.id}
                      className="flex items-center gap-2.5 text-sm"
                    >
                      <TeamCrest
                        name={row.team.name}
                        accent={row.team.accent}
                        size={20}
                      />
                      <span
                        className="min-w-0 flex-1 truncate"
                        style={{ color: row.team.accent }}
                      >
                        {row.team.name}
                      </span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {row.standing.goalsFor}-{row.standing.goalsAgainst}
                      </span>
                      <span className="w-8 shrink-0 text-right font-semibold tabular-nums">
                        {row.standing.points}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {/* Everybody's money: who is handed what, who still owes. */}
            {prize.bet > 0 ? <PrizeLedger match={match} prize={prize} /> : null}
          </>
        )}

        {heroes.length ? (
          <section className="w-full rounded-2xl border border-white/10 bg-black/60 p-4 backdrop-blur-md">
            <h2 className="font-display text-sm uppercase tracking-[0.2em] text-muted-foreground">
              {t.results.heroes}
            </h2>
            <p className="mb-3 text-xs text-muted-foreground">
              {t.results.heroesLine}
            </p>
            <ul className="flex flex-col gap-2">
              {heroes.map((hero, index) => (
                <li
                  key={`${hero.playerId}-${index}`}
                  className="flex items-center gap-3"
                >
                  <PlayerAvatar
                    player={hero.player}
                    className="size-8 shrink-0"
                    style={{
                      outline: `2px solid ${hero.team.accent}`,
                      outlineOffset: "-2px",
                    }}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {hero.player.firstName} {hero.player.lastName}
                  </span>
                  <span className="text-xs text-foreground/80">
                    {fill(t.results.heroWon, { team: hero.team.name })}
                    {hero.goals > 0
                      ? ` · ${fill(t.results.heroGoals, { count: hero.goals })}`
                      : ""}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="flex flex-col items-center gap-3 sm:flex-row">
          {closed ? (
            <>
              <p className="flex items-center gap-2 text-sm text-foreground/80">
                <Icon icon={CheckmarkCircle02Icon} size={18} className="text-primary" />
                {t.results.closedLine}
              </p>
              <Button variant="secondary" onClick={() => go(backHref)}>
                {t.results.backToPitch}
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => go(liveHref)}>
                <Icon icon={ArrowLeft01Icon} />
                {t.results.backToNight}
              </Button>
              <Button
                size="lg"
                disabled={closing}
                onClick={() => setConfirming(true)}
              >
                <Icon icon={CheckmarkCircle02Icon} />
                {t.results.close}
              </Button>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t.results.closeTitle}
        description={t.results.closeLine}
        confirmLabel={t.results.close}
        pending={closing}
        onConfirm={() => {
          setConfirming(false);
          close();
        }}
      />
    </main>
  );
}

/**
 * One winner on the podium: the crest, the points, and what it takes home.
 *
 * As wide as `--step`, which the row sets, so the cup can find the edge of a
 * lone winner without measuring anything.
 */
function Step({ row, showMoney }: { row: PrizeRow; showMoney: boolean }) {
  const { t } = useLocale();
  const { standing, team } = row;

  return (
    <div className="flex w-[var(--step)] min-w-0 flex-col items-center gap-2">
      <TeamCrest name={team.name} accent={team.accent} size={64} />
      <p className="w-full truncate text-center font-display text-lg uppercase leading-tight tracking-[0.04em] sm:text-xl">
        {team.name}
      </p>

      <div
        className="flex h-32 w-full flex-col items-center justify-start gap-1 rounded-t-2xl border border-b-0 px-2 pt-3 backdrop-blur-md sm:h-36"
        style={{
          borderColor: `${team.accent}66`,
          background: `linear-gradient(180deg, ${team.accent}40 0%, rgba(0,0,0,0.65) 100%)`,
        }}
      >
        <span
          className="font-display text-2xl uppercase leading-none tracking-[0.06em]"
          style={{ color: team.accent }}
        >
          {fill(t.results.points, { points: standing.points })}
        </span>
        <span className="text-xs text-foreground/70">
          {fill(t.results.record, {
            won: standing.won,
            drawn: standing.drawn,
            lost: standing.lost,
          })}
        </span>

        {showMoney ? (
          <span className="mt-2 text-center">
            <span className="block font-display text-base uppercase tracking-[0.04em] text-primary sm:text-lg">
              {fill(t.results.takes, { amount: formatMoney(row.prize) })}
            </span>
            <span className="block text-xs text-foreground/80">
              {fill(t.results.each, { amount: formatMoney(row.perPlayer) })}
            </span>
          </span>
        ) : null}
      </div>
    </div>
  );
}
