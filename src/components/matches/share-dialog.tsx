"use client";

import {
  Download04Icon,
  Share08Icon,
  WhatsappIcon,
} from "@hugeicons/core-free-icons";
import { useEffect, useRef, useState } from "react";

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
import { useAction } from "@/hooks/use-action";
import { formatShortDate } from "@/lib/date";
import { matchShareText, renderMatchCard } from "@/lib/share-card";
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

  useEffect(() => {
    if (!open || !match) return;

    let url: string | null = null;
    let cancelled = false;

    void renderMatchCard(match)
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
  }, [open, match]);

  const name = match
    ? `pichanga-${formatShortDate(match.playedAt).replace(/[ ,]+/g, "-").toLowerCase()}.jpg`
    : "pichanga.jpg";

  const download = () => {
    if (!preview) return;

    const link = document.createElement("a");
    link.href = preview;
    link.download = name;
    link.click();
  };

  /**
   * The native share sheet, which is the only way a picture reaches a specific
   * chat: the app hands over the file and the person picks the conversation.
   */
  const share = useAction(async () => {
    if (!match || !file.current) return;

    const image = new File([file.current], name, { type: "image/jpeg" });

    if (navigator.canShare?.({ files: [image] })) {
      await navigator.share({ files: [image], text: matchShareText(match) });
      return;
    }

    // No share sheet (most desktops): the text goes to WhatsApp and the image
    // is saved, so both halves are still available.
    openWhatsApp(match);
    download();
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share the lineup</DialogTitle>
          <DialogDescription>
            {match
              ? `${formatShortDate(match.playedAt)}, ${match.players.length} ${match.players.length === 1 ? "player" : "players"}.`
              : "Nothing to share yet."}
          </DialogDescription>
        </DialogHeader>

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

        <div className="grid gap-2 sm:grid-cols-3">
          <Button
            variant="secondary"
            disabled={!preview}
            onClick={download}
          >
            <Icon icon={Download04Icon} size={16} />
            Download
          </Button>

          <Button
            variant="secondary"
            disabled={!match}
            onClick={() => match && openWhatsApp(match)}
          >
            <Icon icon={WhatsappIcon} size={16} />
            WhatsApp
          </Button>

          <Button
            disabled={!preview || share.pending}
            onClick={() => void share.run()}
          >
            {share.pending ? <Spinner /> : <Icon icon={Share08Icon} size={16} />}
            Share
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Opens WhatsApp with the message ready to send.
 *
 * There is no way to aim a link at one particular group: WhatsApp has no URL
 * scheme for it and its Business API does not address groups at all. The chat
 * is picked in WhatsApp itself, which costs one tap.
 */
function openWhatsApp(match: Match) {
  const text = encodeURIComponent(matchShareText(match));
  window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
}
