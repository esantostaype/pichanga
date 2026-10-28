"use client";

import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef } from "react";

import { TeamCrest } from "@/components/matches/team-crest";
import { useLocale } from "@/components/providers/locale-provider";
import { Icon } from "@/components/ui/icon";
import { fill } from "@/i18n/dictionaries";
import { EASE } from "@/lib/ease";
import { formatMoney } from "@/lib/money";
import type { GameBets } from "@/lib/prize";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP);

/** Con signo: `+S/ 35.00`, `−S/ 35.00`, o el cero tal cual. */
export function signedMoney(amount: number) {
  if (amount > 0.004) return `+${formatMoney(amount)}`;
  if (amount < -0.004) return `−${formatMoney(-amount)}`;
  return formatMoney(0);
}

/**
 * La apuesta por partido, equipo por equipo: cuánto le dejó la noche a cada
 * uno y quién le debe a quién.
 *
 * Las deudas ya vienen compensadas por par, así que cada línea es una sola
 * entrega de plata: el capitán de un equipo le paga al del otro, y listo.
 */
export function TeamDebts({
  bets,
  className,
}: {
  bets: GameBets;
  className?: string;
}) {
  const { t } = useLocale();
  const root = useRef<HTMLElement>(null);

  // Las filas entran una tras otra, y otra vez cuando cambian las deudas.
  const signature = bets.debts
    .map((debt) => `${debt.from.id}>${debt.to.id}:${debt.amount}`)
    .join(",");

  useGSAP(
    () => {
      gsap.from("[data-debt-row]", {
        autoAlpha: 0,
        y: 10,
        duration: 0.4,
        ease: EASE,
        stagger: 0.05,
        clearProps: "transform,opacity,visibility",
      });
    },
    { dependencies: [signature], scope: root },
  );

  return (
    <section
      ref={root}
      className={cn(
        "w-full rounded-2xl border border-border/70 bg-card/85 p-4 backdrop-blur-md",
        className,
      )}
    >
      <header className="mb-3 flex flex-col gap-1">
        <h2 className="font-display text-2xl uppercase tracking-[0.04em]">
          {t.results.debtsTitle}
        </h2>
        <p className="text-sm text-muted-foreground">
          {fill(t.results.debtsLine, { bet: formatMoney(bets.bet) })}
        </p>
      </header>

      {/* Lo que le dejó la noche a cada equipo, en el orden de la tabla. */}
      <ul className="mb-4 space-y-1.5">
        {bets.rows.map((row) => (
          <li
            key={row.team.id}
            data-debt-row
            className="flex items-center gap-2.5 text-sm"
          >
            <TeamCrest
              name={row.team.name}
              accent={row.team.accent}
              badge={row.team.badge}
              image={row.team.crestUrl}
              size={22}
            />
            <span
              className="min-w-0 flex-1 truncate font-medium"
              style={{ color: row.team.accent }}
            >
              {row.team.name}
            </span>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {fill(t.results.playedCount, { count: row.standing.played })}
              {" · "}
              {fill(t.results.record, {
                won: row.standing.won,
                drawn: row.standing.drawn,
                lost: row.standing.lost,
              })}
            </span>
            <span
              className={cn(
                "w-24 shrink-0 text-right font-display text-lg tabular-nums",
                row.net > 0.004
                  ? "text-primary"
                  : row.net < -0.004
                    ? "text-amber-400"
                    : "text-muted-foreground",
              )}
            >
              {signedMoney(row.net)}
            </span>
          </li>
        ))}
      </ul>

      {bets.debts.length === 0 ? (
        <p data-debt-row className="text-sm text-muted-foreground">
          {t.results.noDebts}
        </p>
      ) : (
        <ul className="flex flex-col [&>li:not(:last-child)]:border-b [&>li:not(:last-child)]:border-white/[0.06]">
          {bets.debts.map((debt) => (
            <li
              key={`${debt.from.id}>${debt.to.id}`}
              data-debt-row
              className="flex items-center gap-3 py-3"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex min-w-0 items-center gap-2">
                  <TeamCrest
                    name={debt.from.name}
                    accent={debt.from.accent}
                    badge={debt.from.badge}
                    image={debt.from.crestUrl}
                    size={24}
                  />
                  <span
                    className="min-w-0 truncate font-display text-lg uppercase tracking-[0.04em]"
                    style={{ color: debt.from.accent }}
                  >
                    {debt.from.name}
                  </span>
                  <Icon
                    icon={ArrowRight01Icon}
                    size={16}
                    className="shrink-0 text-muted-foreground"
                  />
                  <TeamCrest
                    name={debt.to.name}
                    accent={debt.to.accent}
                    badge={debt.to.badge}
                    image={debt.to.crestUrl}
                    size={24}
                  />
                  <span
                    className="min-w-0 truncate font-display text-lg uppercase tracking-[0.04em]"
                    style={{ color: debt.to.accent }}
                  >
                    {debt.to.name}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {fill(t.results.debtGames, {
                    from: debt.from.name,
                    to: debt.to.name,
                    won: debt.toWon,
                    lost: debt.fromWon,
                  })}
                </span>
              </span>

              <span className="flex shrink-0 flex-col items-end">
                <span className="text-xs uppercase tracking-wider text-amber-400/60">
                  {t.results.owes}
                </span>
                <span className="font-display text-2xl leading-tight tabular-nums text-amber-400">
                  {formatMoney(debt.amount)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
