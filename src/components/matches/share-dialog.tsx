"use client";

import {
  Copy01Icon,
  Download04Icon,
  WhatsappIcon,
} from "@hugeicons/core-free-icons";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { useLocale } from "@/components/providers/locale-provider";
import { DICTIONARIES } from "@/i18n/dictionaries";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icon, type IconSvgElement } from "@/components/ui/icon";
import { Spinner } from "@/components/ui/spinner";
import { Tabs } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAction } from "@/hooks/use-action";
import { fill } from "@/i18n/dictionaries";
import { formatShortDate } from "@/lib/date";
import { api } from "@/lib/api-client";
import { canSettle } from "@/lib/money";
import { useNow } from "@/hooks/use-now";
import {
  asPng,
  matchShareText,
  renderMatchCard,
  type ShareScope,
  type ShareWords,
  accountsShareText,
  renderAccountsCard,
  type AccountsWords,
} from "@/lib/share-card";
import type { Match, MatchLive } from "@/types";

/**
 * The match as something you can send to a chat: a tall image of the lineup, or
 * the same information as text.
 *
 * The image is drawn in the browser when the dialog opens, so what is on screen
 * is exactly the file that gets downloaded or shared -- no second render, no
 * surprises.
 */
export function ShareDialog({
  open,
  onOpenChange,
  match,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: Match | null;
}) {
  const { t, locale } = useLocale();

  /* What the drawn card and the message say around the numbers. */
  const cardWords: ShareWords = {
    cardPitch: t.share.cardPitch,
    cardTotalLine: t.share.cardTotalLine,
    cardEachLine: t.share.cardEachLine,
    cardPaidLine: t.share.cardPaidLine,
    cardPendingLine: t.share.cardPendingLine,
    cardOnPitch: t.share.cardOnPitch,
    cardAllPaid: t.share.cardAllPaid,
    cardOwing: t.share.cardOwing,
    cardOrganizer: t.share.cardOrganizer,
  };
  const [preview, setPreview] = useState<string | null>(null);
  const file = useRef<Blob | null>(null);
  /** The object URL behind `preview`, so it can be released once replaced. */
  const previewUrl = useRef<string | null>(null);
  const onPhone = useCoarsePointer();

  /*
   * Two messages about the same match, with the same squad in both: the
   * fixture, and the ledger. One says who is playing, the other says who has
   * put their money in -- and the second is the one nobody wants to write by
   * hand.
   */
  const [scope, setScope] = useState<ShareScope>("match");

  /*
   * The accounts only exist once the night is over -- nothing changes hands
   * before -- so that tab only appears then, and it needs the night itself
   * (games and goals) to know who won the pot.
   */
  const now = useNow(60_000);
  const settlable = !!match && now !== null && canSettle(match, now);
  const showing: ShareScope = settlable ? scope : "match";
  const [live, setLive] = useState<MatchLive | null>(null);

  const accountsWords: AccountsWords = {
    title: t.share.accTitle,
    pitchBet: t.share.accPitchBet,
    pot: t.share.accPot,
    winners: t.share.accWinners,
    noWinner: t.share.accNoWinner,
    toCollect: t.share.accToCollect,
    toHand: t.share.accToHand,
    collect: t.share.accCollect,
    hand: t.share.accHand,
    square: t.share.accSquare,
    breakdownWinner: t.share.accBreakdownWinner,
    breakdown: t.share.accBreakdown,
    noShow: t.share.accNoShow,
  };

  useEffect(() => {
    if (!open || !match || showing !== "payments") return;

    let cancelled = false;
    void api.matches
      .live(match.id)
      .then((next) => {
        if (!cancelled) setLive(next);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [open, match, showing]);

  /** What the chat gets: the lineup, or the night's accounts. */
  const shareText = !match
    ? ""
    : showing === "payments" && live
      ? accountsShareText(match, live, accountsWords, locale)
      : matchShareText(match, "match", cardWords, locale);

  /*
   * Switching tabs redraws the card, which takes a couple of hundred
   * milliseconds. The old one stays up for those: clearing it first put a
   * spinner on screen long enough to blink and take the dialog's height with
   * it, for a picture that was about to be replaced anyway.
   */
  useEffect(() => {
    if (!open || !match) return;
    // The accounts card waits for the night to load.
    if (showing === "payments" && !live) return;

    let cancelled = false;

    const drawing =
      showing === "payments" && live
        ? renderAccountsCard(
            match,
            live,
            {
              title: DICTIONARIES[locale].share.accTitle,
              pitchBet: DICTIONARIES[locale].share.accPitchBet,
              pot: DICTIONARIES[locale].share.accPot,
              winners: DICTIONARIES[locale].share.accWinners,
              noWinner: DICTIONARIES[locale].share.accNoWinner,
              toCollect: DICTIONARIES[locale].share.accToCollect,
              toHand: DICTIONARIES[locale].share.accToHand,
              collect: DICTIONARIES[locale].share.accCollect,
              hand: DICTIONARIES[locale].share.accHand,
              square: DICTIONARIES[locale].share.accSquare,
              breakdownWinner: DICTIONARIES[locale].share.accBreakdownWinner,
              breakdown: DICTIONARIES[locale].share.accBreakdown,
              noShow: DICTIONARIES[locale].share.accNoShow,
            },
            locale,
          )
        : renderMatchCard(match, "match", DICTIONARIES[locale].share, locale);

    void drawing
      .then((blob) => {
        const url = URL.createObjectURL(blob);

        // Nothing is showing this one: release it and leave the state alone.
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }

        file.current = blob;
        const previous = previewUrl.current;
        previewUrl.current = url;
        setPreview(url);
        if (previous) URL.revokeObjectURL(previous);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
    // `locale` belongs here: the card has words on it, so it is a different
    // card in the other language.
  }, [open, match, showing, live, locale]);

  /** The last card ever drawn, released when the dialog leaves for good. */
  useEffect(
    () => () => {
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    },
    [],
  );

  const name = match
    ? `pichanga-${formatShortDate(match.playedAt).replace(/[ ,]+/g, "-").toLowerCase()}${showing === "payments" ? "-cuentas" : ""}.jpg`
    : "pichanga.jpg";

  const download = () => {
    if (!preview) return;

    const link = document.createElement("a");
    link.href = preview;
    link.download = name;
    link.click();
  };

  /** The picture itself on the clipboard, to paste straight into a chat. */
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
          if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
          previewUrl.current = null;
          file.current = null;
          setPreview(null);
          setScope("match");
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t.share.heading}</DialogTitle>
          <DialogDescription>
            {!match
              ? t.share.nothing
              : showing === "payments"
                ? fill(t.share.accountsLine, {
                    date: formatShortDate(match.playedAt, locale),
                  })
                : fill(t.share.lineup, {
                    date: formatShortDate(match.playedAt, locale),
                    count: match.players.length,
                    players:
                      match.players.length === 1
                        ? t.common.player
                        : t.common.players,
                  })}
          </DialogDescription>
        </DialogHeader>

        {settlable ? (
          <Tabs
            ariaLabel={t.share.whatToShare}
            value={showing}
            onChange={(next) => setScope(next as ShareScope)}
            items={[
              { value: "match", label: t.share.tabMatch },
              { value: "payments", label: t.share.tabAccounts },
            ]}
          />
        ) : null}

        {/* No frame around it: the card has its own edge and its own ground. */}
        <div className="max-h-[52vh] overflow-y-auto rounded-xl scrollbar-thin">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt={t.share.cardAlt}
              className="block w-full rounded-xl"
            />
          ) : (
            <div className="grid h-40 place-items-center rounded-xl bg-muted/20">
              <Spinner />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2">
          <Action
            label={t.share.download}
            icon={Download04Icon}
            disabled={!preview}
            onClick={download}
          />

          <Action
            label={t.share.copyImage}
            icon={Copy01Icon}
            disabled={!preview || copyImage.pending}
            pending={copyImage.pending}
            onClick={() => void copyImage.run()}
          />

          <Action
            // A phone opens the app; a desktop already has WhatsApp Web in
            // another tab and only needs the message to paste into it.
            label={onPhone ? t.share.sendWhatsApp : t.share.copyForWhatsApp}
            icon={WhatsappIcon}
            disabled={!match}
            onClick={() => {
              if (!match) return;
              if (onPhone) openWhatsApp(shareText);
              else
                void copyText(shareText, {
                  copied: t.share.copiedLineup,
                  noClipboard: t.share.noClipboard,
                });
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** One of the three things you can do with the card, as an icon with its name. */
function Action({
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

/** True on anything driven by a finger, which is where the app is worth opening. */
function useCoarsePointer() {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia("(pointer: coarse)");
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(pointer: coarse)").matches,
    // The server has no pointer to ask about, and a desktop is the safer guess:
    // it copies instead of opening a tab nobody asked for.
    () => false,
  );
}

/** The message on the clipboard, ready to paste into whatever chat is open. */
async function copyText(
  text: string,
  said: { copied: string; noClipboard: string },
) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(said.copied);
  } catch {
    toast.error(said.noClipboard);
  }
}

/**
 * Opens WhatsApp with the message ready to send.
 *
 * There is no way to aim a link at one particular group: WhatsApp has no URL
 * scheme for it and its Business API does not address groups at all. The chat
 * is picked in WhatsApp itself, which costs one tap.
 */
function openWhatsApp(message: string) {
  const text = encodeURIComponent(message);
  window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
}
