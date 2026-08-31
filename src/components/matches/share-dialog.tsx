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
import {
  matchShareText,
  renderMatchCard,
  type ShareScope,
  type ShareWords,
} from "@/lib/share-card";
import type { Match } from "@/types";

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
  const owing = match ? match.players.length - match.paidPlayerIds.length : 0;

  /*
   * Switching tabs redraws the card, which takes a couple of hundred
   * milliseconds. The old one stays up for those: clearing it first put a
   * spinner on screen long enough to blink and take the dialog's height with
   * it, for a picture that was about to be replaced anyway.
   */
  useEffect(() => {
    if (!open || !match) return;

    let cancelled = false;

    void renderMatchCard(match, scope, DICTIONARIES[locale].share, locale)
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
  }, [open, match, scope, locale]);

  /** The last card ever drawn, released when the dialog leaves for good. */
  useEffect(
    () => () => {
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    },
    [],
  );

  const name = match
    ? `pichanga-${formatShortDate(match.playedAt).replace(/[ ,]+/g, "-").toLowerCase()}${scope === "payments" ? "-payments" : ""}.jpg`
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
              : scope === "payments"
                ? fill(t.share.stillToPay, {
                    date: formatShortDate(match.playedAt, locale),
                    count: owing,
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

        <Tabs
          ariaLabel={t.share.whatToShare}
          value={scope}
          onChange={(next) => setScope(next as ShareScope)}
          items={[
            { value: "match", label: t.share.tabMatch },
            {
              value: "payments",
              label: t.share.tabPayments,
            },
          ]}
        />

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
              if (onPhone) openWhatsApp(match, scope, cardWords, locale);
              else
                void copyText(
                  match,
                  scope,
                  {
                    copied: t.share.copiedLineup,
                    noClipboard: t.share.noClipboard,
                  },
                  cardWords,
                  locale,
                );
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

/** The same picture, in the one format a clipboard will take. */
async function asPng(jpeg: Blob) {
  const bitmap = await createImageBitmap(jpeg);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
  bitmap.close();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("share.noImageCopy"))),
      "image/png",
    );
  });
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
  match: Match,
  scope: ShareScope,
  said: { copied: string; noClipboard: string },
  words: ShareWords,
  lang: "en" | "es",
) {
  try {
    await navigator.clipboard.writeText(
      matchShareText(match, scope, words, lang),
    );
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
function openWhatsApp(
  match: Match,
  scope: ShareScope,
  words: ShareWords,
  lang: "en" | "es",
) {
  const text = encodeURIComponent(matchShareText(match, scope, words, lang));
  window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
}
