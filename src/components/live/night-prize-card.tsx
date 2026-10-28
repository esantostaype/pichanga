"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

import { useScene } from "@/components/layout/scene-transition";
import { TeamCrest } from "@/components/matches/team-crest";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRealtime } from "@/hooks/use-realtime";
import { fill } from "@/i18n/dictionaries";
import { api } from "@/lib/api-client";
import { formatMoney } from "@/lib/money";
import { nightMoney, nightPrize } from "@/lib/prize";
import type { Match, MatchLive } from "@/types";
import { PrizeLedger } from "./prize-ledger";
import { TeamDebts } from "./team-debts";

/**
 * The night's accounts, on the lineup, once the night is over: the pot and
 * who won it, the pitch, the no-shows' penalties, and what each one is handed
 * or owes -- all settled together, because none of it is known until then.
 *
 * That is when the money changes hands: at the next coffee, the day after, by
 * transfer at the weekend. So the winners and everybody's account sit in the
 * a dialog over the pitch, the lineup dimmed behind, and fold away into a pill
 * when somebody needs the tokens -- to tick off who paid the pitch, which
 * updates the account right here.
 */
export function NightPrizeCard({
  match,
  resultsHref,
  open,
  onOpenChange: setOpen,
  onTogglePaid,
  onUndoNoShow,
}: {
  match: Match;
  resultsHref: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTogglePaid?: (playerId: string, paid: boolean) => Promise<unknown>;
  onUndoNoShow?: (playerId: string) => void;
}) {
  const { t } = useLocale();
  const { go } = useScene();
  const [live, setLive] = useState<MatchLive | null>(null);

  const load = useCallback(async () => {
    try {
      setLive(await api.matches.live(match.id));
    } catch {
      // The pill stays; the next event tries again.
    }
  }, [match.id]);

  useEffect(() => {
    // Deferred, so the effect never sets state synchronously.
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  useRealtime({
    "live:changed": (payload) => {
      if ((payload as { matchId?: string })?.matchId === match.id) void load();
    },
  });

  if (!live) return null;

  const prize = nightPrize(match.teams, live.games, live.goals, match.bet);
  const money = nightMoney(match, live);
  const perGame = money.mode === "perGame";
  const winners = prize.rows.filter((row) => prize.winnerIds.includes(row.team.id));

  return (
    <>
      {/*
        The app's own dialog, so it comes and goes like every other one: it
        rises in over the dimmed lineup, and closes with the cross, a tap
        outside or Escape.
      */}
      <Dialog open={open} onOpenChange={setOpen}>
        {/*
          The whole screen scrolls it, not only the box: a long list of
          accounts read with a thumb anywhere on the phone. The box keeps its
          full height and starts at the top, so nothing ends up out of reach
          above the fold.
        */}
        <DialogContent
          className="max-h-none max-w-2xl gap-4 self-start overflow-visible"
          style={{ overflowY: "auto" }}
        >
          <DialogHeader>
            <DialogTitle className="text-3xl sm:text-4xl">
              {t.results.title}
            </DialogTitle>
            <DialogDescription className="font-display text-xl uppercase tracking-[0.04em] text-primary">
              {prize.bet > 0
                ? perGame
                  ? fill(t.results.perGame, { amount: formatMoney(money.bet) })
                  : `${t.results.pot} ${formatMoney(prize.pot)}`
                : t.results.noBet}
            </DialogDescription>
          </DialogHeader>

          {match.teams.length < 2 ? null : winners.length ? (
            <div className="flex items-end justify-center gap-4">
              {winners.map((row) => (
                <div
                  key={row.team.id}
                  className="flex min-w-0 flex-col items-center gap-1"
                >
                  <TeamCrest
                    name={row.team.name}
                    accent={row.team.accent}
                    badge={row.team.badge}
                    image={row.team.crestUrl}
                    size={56}
                  />
                  <span
                    className="max-w-[12rem] truncate font-display text-xl uppercase tracking-[0.04em]"
                    style={{ color: row.team.accent }}
                  >
                    {row.team.name}
                  </span>
                  <span className="text-base text-foreground/90">
                    {fill(t.results.points, { points: row.standing.points })}
                    {prize.bet > 0 && !perGame
                      ? ` · ${fill(t.results.each, { amount: formatMoney(row.perPlayer) })}`
                      : ""}
                  </span>
                </div>
              ))}
              <Image
                src="/images/cup.png"
                alt={t.results.cup}
                width={138}
                height={331}
                className="h-28 w-auto"
              />
            </div>
          ) : (
            <p className="text-center text-base text-foreground/90">
              {prize.allLevel
                ? perGame
                  ? t.results.allLevelGames
                  : t.results.allLevel
                : t.results.noGames}
            </p>
          )}

          {prize.bet > 0 && money.mode === "perGame" ? (
            <TeamDebts bets={money.games} className="bg-background/40" />
          ) : null}

          <PrizeLedger
            match={match}
            money={money}
            onTogglePaid={onTogglePaid}
            onUndoNoShow={onUndoNoShow}
            className="bg-background/40"
          />

          {match.teams.length > 1 ? (
            <Button
              variant="secondary"
              className="justify-self-center"
              onClick={() => go(resultsHref)}
            >
              {t.results.pitchFull}
            </Button>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
