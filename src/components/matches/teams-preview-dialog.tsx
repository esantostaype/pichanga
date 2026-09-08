"use client";

import {
  ArrowDataTransferHorizontalIcon,
  Copy01Icon,
  Download04Icon,
  Share08Icon,
  UserStar01Icon,
} from "@hugeicons/core-free-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { useLocale } from "@/components/providers/locale-provider";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icon, type IconSvgElement } from "@/components/ui/icon";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAction } from "@/hooks/use-action";
import { useNow } from "@/hooks/use-now";
import { fill } from "@/i18n/dictionaries";
import { DEFAULT_PITCH_FORMAT, TEAMS_OPEN_MS } from "@/lib/constants";
import { formatShortDate, untilLabel } from "@/lib/date";
import {
  asPng,
  renderTeamsPreviewCard,
  type PreviewSide,
} from "@/lib/share-card";
import { pickNames, planTeams, strengthOf } from "@/lib/teams";
import type { Match } from "@/types";
import { TeamCrest } from "./team-crest";
import { newSeed, widthFor } from "./teams-dialog";

/**
 * What the sides would look like if they were drawn right now.
 *
 * The real draw only opens two hours before kick-off, and for good reason: the
 * lineup is still moving before that. But "still moving" is exactly when people
 * ask who they are playing with, and answering "come back on Wednesday" is how
 * a squad ends up picking sides in the group chat instead.
 *
 * So this runs the same `planTeams` the server runs, in the browser, and writes
 * nothing: no rows, no request, no `lineup:changed`. Two consequences follow
 * from that, and both are on purpose. Anyone may open it and anyone may re-roll
 * it, because a draw that is never saved cannot be re-rolled until it flatters
 * somebody. And it is drawn to look provisional -- dashed borders, a tag on
 * every side, the countdown to the real thing under it -- because the one way
 * this feature fails is somebody reading it as the lineup.
 */
export function TeamsPreviewDialog({
  open,
  onOpenChange,
  match,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: Match | null;
}) {
  const { t, locale } = useLocale();

  /*
   * Kept across opens rather than re-rolled on each: closing the dialog to
   * check who is in and opening it again should show the same sides, or the
   * countdown underneath is measuring a lineup that changed while you looked
   * away. "Another draw" is the button for a different one.
   */
  const [seed, setSeed] = useState(newSeed);
  const [mixAreas, setMixAreas] = useState(false);
  const [sharing, setSharing] = useState(false);

  // Only for the countdown, so a minute is as fine a tick as it gets.
  const now = useNow(60_000);

  const players = match?.players;
  const signedUp = players?.length ?? 0;

  const teamSize = match?.venue?.format ?? DEFAULT_PITCH_FORMAT;

  /*
   * The same three calls `drawTeams` makes on the server, in the same order.
   * Keeping them here rather than behind an endpoint is what makes this cost
   * nothing: it is a few hundred players' worth of arithmetic, and the squad
   * is already in memory because the pitch behind the dialog is drawing it.
   */
  const sides = useMemo(() => {
    if (!players || players.length < 4) return [];

    const plan = planTeams(players, { teamSize, seed, mixAreas });
    const names = pickNames(plan.teams.length, seed);

    return plan.teams.map((team, index) => ({
      ...team,
      name: names[index].name,
      accent: names[index].accent,
    }));
  }, [players, teamSize, seed, mixAreas]);

  const opensAt = match ? match.playedAt - TEAMS_OPEN_MS : null;
  const when =
    opensAt !== null && now !== null && now < opensAt
      ? untilLabel(opensAt, now, locale)
      : null;

  /** Said once and used twice: here under the sides, and on the shared card. */
  const opensLine = when ? fill(t.teams.previewOpens, { when }) : "";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={widthFor(sides.length)}>
          <DialogHeader>
            <DialogTitle>{t.teams.previewTitle}</DialogTitle>
            <DialogDescription>
              {fill(t.teams.previewLine, {
                count: sides.length,
                players: `${signedUp} ${
                  signedUp === 1 ? t.common.player : t.common.players
                }`,
              })}
            </DialogDescription>
          </DialogHeader>

          {/* Same grid as the real dialog: as many sides across as the width takes. */}
          <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(15rem,1fr))]">
            {sides.map((team) => (
              <section
                key={team.index}
                /*
                 * Dashed, and a shade fainter than a drawn side. The difference
                 * between this dialog and the real one has to survive being seen
                 * across a table on somebody else's phone, and the words alone
                 * do not carry that far.
                 */
                className="rounded-2xl border border-dashed p-4"
                style={{
                  borderColor: `${team.accent}55`,
                  backgroundColor: `color-mix(in oklab, ${team.accent} 7%, var(--background))`,
                }}
              >
                <header className="flex items-center gap-3">
                  <TeamCrest
                    name={team.name}
                    accent={team.accent}
                    size={36}
                    className="opacity-70"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-lg uppercase tracking-[0.04em]">
                      {team.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {team.players.length}{" "}
                      {team.players.length === 1
                        ? t.common.player
                        : t.common.players}
                      {team.borrowedKeeper
                        ? ` · ${t.teams.keeperBorrowed}`
                        : ""}
                    </p>
                  </div>

                  <span
                    className="shrink-0 rounded-md px-1.5 py-0.5 text-[0.625rem] uppercase tracking-wider text-muted-foreground"
                    style={{ backgroundColor: `${team.accent}14` }}
                  >
                    {t.teams.previewTag}
                  </span>
                </header>

                <ul className="mt-3 space-y-1.5">
                  {team.players.map((player) => (
                    <li key={player.id} className="flex items-center gap-2.5">
                      <PlayerAvatar player={player} className="size-7" />

                      <span className="min-w-0 flex-1 truncate text-sm">
                        {player.firstName} {player.lastName}
                      </span>

                      {/*
                      The gloves are shown but never handed over: who goes in
                      goal is the one thing on a side that somebody argues
                      about, so leaving it off the preview would hide the part
                      people came to look at. Moving them is the real dialog's
                      job, once there are real sides to move them between.
                    */}
                      {player.id === team.keeperId ? (
                        <span
                          className="rounded-md px-1.5 py-0.5 text-xs uppercase tracking-wider"
                          style={{
                            color: team.accent,
                            backgroundColor: `${team.accent}1f`,
                          }}
                          title={
                            team.borrowedKeeper
                              ? t.teams.keeperFillingIn
                              : t.teams.keeperByChoice
                          }
                        >
                          {team.borrowedKeeper
                            ? t.teams.inGoal
                            : t.teams.keeper}
                        </span>
                      ) : null}

                      {player.id === match?.organizerId ? (
                        <Icon
                          icon={UserStar01Icon}
                          size={13}
                          className="text-primary"
                        />
                      ) : null}

                      <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">
                        {strengthOf(
                          player,
                          player.id === team.keeperId ? "gk" : undefined,
                        ).toFixed(1)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          {/*
          The countdown and the caveat, under the sides rather than over them:
          the sides are what was opened for, and a warning above them is a
          warning read once and skipped every week after.
        */}
          <p className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
            {opensLine ? `${opensLine} ` : ""}
            {t.teams.previewMoving}
          </p>

          <label className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
            <Switch checked={mixAreas} onCheckedChange={setMixAreas} />
            <span className="flex flex-col">
              <span className="text-sm font-medium">{t.teams.mixTitle}</span>
              <span className="text-xs text-muted-foreground">
                {t.teams.mixLine}
              </span>
            </span>
          </label>

          <DialogFooter className="justify-between">
            <span className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => setSeed(newSeed())}>
                <Icon icon={ArrowDataTransferHorizontalIcon} size={16} />
                {t.teams.previewAgain}
              </Button>

              {/*
              Only a picture, and only ever a picture. The real card has a
              WhatsApp button that writes the lineup out as text, and text is
              exactly what gets quoted back on Wednesday with the caveat
              stripped off it. A draw that has not happened yet travels as
              something that visibly says so or it does not travel.
            */}
              <Button
                variant="ghost"
                disabled={sides.length === 0}
                onClick={() => setSharing(true)}
              >
                <Icon icon={Share08Icon} size={16} />
                {t.teams.previewShare}
              </Button>
            </span>

            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              {t.teams.previewClose}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PreviewShareDialog
        open={sharing}
        onOpenChange={setSharing}
        match={match}
        sides={sides}
        opensLine={opensLine}
      />
    </>
  );
}

/**
 * The preview as a picture, to copy or to download.
 *
 * Its own dialog stacked over the first rather than a panel inside it: the
 * sides underneath are what you were looking at when you decided to send them,
 * and swapping them for a tall JPEG means checking the draw again after closing
 * the picture.
 *
 * Nothing here shares on your behalf. The file lands on the clipboard or in the
 * downloads folder and you choose the chat yourself, which is the difference
 * between putting a provisional lineup in front of somebody and posting it.
 */
function PreviewShareDialog({
  open,
  onOpenChange,
  match,
  sides,
  opensLine,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: Match | null;
  sides: PreviewSide[];
  opensLine: string;
}) {
  const { t, locale } = useLocale();

  const [card, setCard] = useState<string | null>(null);
  const file = useRef<Blob | null>(null);
  /** The object URL behind `card`, so it can be released once replaced. */
  const cardUrl = useRef<string | null>(null);

  /*
   * Drawn when the dialog opens, and again whenever the draw or the language
   * changes underneath it: both of those are words and names on the picture, so
   * either one makes it a different file.
   */
  useEffect(() => {
    if (!open || !match || sides.length === 0) return;

    let cancelled = false;

    void renderTeamsPreviewCard(
      match,
      sides,
      {
        opens: opensLine,
        moving: t.teams.previewMoving,
        tag: t.teams.previewTag,
        onPitch: t.share.cardOnPitch,
        keeper: t.teams.keeper,
        inGoal: t.teams.inGoal,
      },
      locale,
    )
      .then((blob) => {
        const url = URL.createObjectURL(blob);

        // Nothing is showing this one: release it and leave the state alone.
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }

        file.current = blob;
        const previous = cardUrl.current;
        cardUrl.current = url;
        setCard(url);
        if (previous) URL.revokeObjectURL(previous);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [open, match, sides, opensLine, locale, t]);

  /** The last card ever drawn, released when the dialog leaves for good. */
  useEffect(
    () => () => {
      if (cardUrl.current) URL.revokeObjectURL(cardUrl.current);
    },
    [],
  );

  const name = match
    ? `pichanga-${formatShortDate(match.playedAt)
        .replace(/[ ,]+/g, "-")
        .toLowerCase()}-preview.jpg`
    : "pichanga-preview.jpg";

  const download = () => {
    if (!card) return;

    const link = document.createElement("a");
    link.href = card;
    link.download = name;
    link.click();
  };

  const copyImage = useAction(async () => {
    if (!file.current) return;

    if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
      toast.error(t.share.noImageCopy);
      return;
    }

    try {
      // The card is a JPEG for its size, and clipboards only take PNG.
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": await asPng(file.current) }),
      ]);
      toast.success(t.share.copiedImagePaste);
    } catch {
      toast.error(t.share.noImageCopy);
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          if (cardUrl.current) URL.revokeObjectURL(cardUrl.current);
          cardUrl.current = null;
          file.current = null;
          setCard(null);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t.teams.previewShare}</DialogTitle>
          <DialogDescription>{t.teams.previewShareLine}</DialogDescription>
        </DialogHeader>

        {/* No frame around it: the card has its own edge and its own ground. */}
        <div className="max-h-[52vh] overflow-y-auto rounded-xl scrollbar-thin">
          {card ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card}
              alt={t.teams.previewCardAlt}
              className="block w-full rounded-xl"
            />
          ) : (
            <div className="grid h-40 place-items-center rounded-xl bg-muted/20">
              <Spinner />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2">
          <CardAction
            label={t.share.download}
            icon={Download04Icon}
            disabled={!card}
            onClick={download}
          />

          <CardAction
            label={t.share.copyImage}
            icon={Copy01Icon}
            disabled={!card || copyImage.pending}
            pending={copyImage.pending}
            onClick={() => void copyImage.run()}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** One of the two things you can do with the card, as an icon with its name. */
function CardAction({
  label,
  icon,
  disabled,
  pending,
  onClick,
}: {
  label: string;
  icon: IconSvgElement;
  disabled?: boolean;
  pending?: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
        >
          {pending ? <Spinner /> : <Icon icon={icon} size={18} />}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}
