"use client";

import {
  Copy01Icon,
  Download04Icon,
  WhatsappIcon,
} from "@hugeicons/core-free-icons";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAction } from "@/hooks/use-action";
import { formatShortDate } from "@/lib/date";
import {
  matchShareText,
  renderMatchCard,
  type ShareScope,
} from "@/lib/share-card";
import { cn } from "@/lib/utils";
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
  const [preview, setPreview] = useState<string | null>(null);
  const file = useRef<Blob | null>(null);
  const onPhone = useCoarsePointer();

  /*
   * Two messages about the same match, with the same squad in both: the
   * fixture, and the ledger. One says who is playing, the other says who has
   * put their money in -- and the second is the one nobody wants to write by
   * hand.
   */
  const [scope, setScope] = useState<ShareScope>("match");
  const owing = match
    ? match.players.length - match.paidPlayerIds.length
    : 0;

  useEffect(() => {
    if (!open || !match) return;

    let url: string | null = null;
    let cancelled = false;

    void renderMatchCard(match, scope)
      .then((blob) => {
        if (cancelled) return;
        file.current = blob;
        url = URL.createObjectURL(blob);
        setPreview(url);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
      setPreview(null);
    };
  }, [open, match, scope]);

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
      toast.error("This browser cannot copy images. Download it instead.");
      return;
    }

    try {
      // The card is a JPEG for its size, and clipboards only take PNG.
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": await asPng(file.current) }),
      ]);
      toast.success("Image copied. Paste it into the chat.");
    } catch {
      toast.error("This browser cannot copy images. Download it instead.");
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share the lineup</DialogTitle>
          <DialogDescription>
            {!match
              ? "Nothing to share yet."
              : scope === "payments"
                ? `${formatShortDate(match.playedAt)}, ${owing} still to pay.`
                : `${formatShortDate(match.playedAt)}, ${match.players.length} ${match.players.length === 1 ? "player" : "players"}.`}
          </DialogDescription>
        </DialogHeader>

        <div role="tablist" className="grid grid-cols-2 gap-1 rounded-xl bg-muted/40 p-1">
          <Tab
            selected={scope === "match"}
            onSelect={() => setScope("match")}
            label="Match"
          />
          <Tab
            selected={scope === "payments"}
            onSelect={() => setScope("payments")}
            label={`Payments${owing > 0 ? ` (${owing})` : ""}`}
          />
        </div>

        {/* No frame around it: the card has its own edge and its own ground. */}
        <div className="max-h-[52vh] overflow-y-auto rounded-xl scrollbar-thin">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="The match card"
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
            label="Download the image"
            icon={Download04Icon}
            disabled={!preview}
            onClick={download}
          />

          <Action
            label="Copy the image"
            icon={Copy01Icon}
            disabled={!preview || copyImage.pending}
            pending={copyImage.pending}
            onClick={() => void copyImage.run()}
          />

          <Action
            // A phone opens the app; a desktop already has WhatsApp Web in
            // another tab and only needs the message to paste into it.
            label={onPhone ? "Send with WhatsApp" : "Copy the text for WhatsApp"}
            icon={WhatsappIcon}
            disabled={!match}
            onClick={() => {
              if (!match) return;
              if (onPhone) openWhatsApp(match, scope);
              else void copyText(match, scope);
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** One half of the switch between the two messages. */
function Tab({
  selected,
  onSelect,
  label,
}: {
  selected: boolean;
  onSelect: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onSelect}
      className={cn(
        "cursor-pointer rounded-lg px-3 py-1.5 text-sm transition-colors",
        selected
          ? "bg-card text-foreground shadow-sm shadow-black/30"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
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
      (blob) => (blob ? resolve(blob) : reject(new Error("No image to copy"))),
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
async function copyText(match: Match, scope: ShareScope) {
  try {
    await navigator.clipboard.writeText(matchShareText(match, scope));
    toast.success("Lineup copied. Paste it into WhatsApp.");
  } catch {
    toast.error("The clipboard is not available here.");
  }
}

/**
 * Opens WhatsApp with the message ready to send.
 *
 * There is no way to aim a link at one particular group: WhatsApp has no URL
 * scheme for it and its Business API does not address groups at all. The chat
 * is picked in WhatsApp itself, which costs one tap.
 */
function openWhatsApp(match: Match, scope: ShareScope) {
  const text = encodeURIComponent(matchShareText(match, scope));
  window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
}
