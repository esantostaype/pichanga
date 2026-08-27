"use client";

import {
  Album02Icon,
  Delete02Icon,
  ImageAdd02Icon,
  PlayCircleIcon,
} from "@hugeicons/core-free-icons";
import { useCallback, useRef, useState } from "react";

import { usePichanga } from "@/components/providers/pichanga-provider";
import { BulkBar } from "@/components/ui/bulk-bar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useAction } from "@/hooks/use-action";
import { useMatchMedia } from "@/hooks/use-match-media";
import { useRowSelection } from "@/hooks/use-row-selection";
import { GALLERY, GALLERY_ACCEPT } from "@/lib/constants";
import { formatShortDate } from "@/lib/date";
import { fullUrl, thumbUrl } from "@/lib/media-url";
import { cn } from "@/lib/utils";
import type { MatchMedia } from "@/types";
import {
  PhotoViewer,
  preloadPhoto,
  type NaturalSize,
  type OpenFrom,
} from "./photo-viewer";

const mb = (bytes: number) => Math.round(bytes / 1024 / 1024);

export function GalleryDialog({
  open,
  onOpenChange,
  matchId,
  playedAt,
  canAdd = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchId: string | null;
  playedAt: number | null;
  /** False once the match has started: the album is then a record to read. */
  canAdd?: boolean;
}) {
  const { isAdmin } = usePichanga();
  const { items, loading, uploading, upload, remove } = useMatchMedia(
    matchId,
    open,
  );

  const input = useRef<HTMLInputElement>(null);
  /** The open photo, and the tile it came out of, for the growing animation. */
  /** Which file is open, where its tile was, and how big the file is. */
  const [viewing, setViewing] = useState<{
    index: number;
    from: OpenFrom;
    natural: NaturalSize | null;
  } | null>(null);
  /** The file being fetched before its viewer opens. */
  const [opening, setOpening] = useState<string | null>(null);
  /** Ids whose thumbnail has painted; the rest show a skeleton. */
  const [loaded, setLoaded] = useState<string[]>([]);
  /** Ids queued for deletion: one tile or a whole selection, same path. */
  const [pendingDelete, setPendingDelete] = useState<string[]>([]);

  const selection = useRowSelection(items);

  const add = useAction(async (files: File[]) => upload(files), {
    success: "Added to the gallery",
  });

  /**
   * Holds the click until the photo is in the browser: opening on a blank
   * frame and filling it in afterwards looked broken.
   */
  const reveal = useAction(async (media: MatchMedia, from: OpenFrom) => {
    const index = items.findIndex((item) => item.id === media.id);
    if (index === -1) return;

    // A clip streams as it plays, so there is nothing to wait for.
    if (media.kind === "video") {
      setViewing({ index, from, natural: null });
      return;
    }

    setOpening(media.id);
    try {
      setViewing({
        index,
        from,
        natural: await preloadPhoto(fullUrl(media.url)),
      });
    } finally {
      setOpening(null);
    }
  });

  /**
   * Where a file's tile is on screen, so the viewer can shrink back into the
   * right one after somebody has stepped through the album.
   */
  const rectFor = useCallback((mediaId: string) => {
    const tile = document.querySelector(`[data-media="${mediaId}"]`);
    if (!tile) return null;

    const rect = tile.getBoundingClientRect();
    return {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    };
  }, []);

  const drop = useAction(async (ids: string[]) => remove(ids), {
    success: "Removed",
    onSuccess: () => {
      setPendingDelete([]);
      selection.clear();
    },
  });

  const busy = add.pending || uploading > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Gallery</DialogTitle>
            <DialogDescription>
              {playedAt !== null
                ? `Photos and clips from ${formatShortDate(playedAt)}.`
                : "Photos and clips from this match."}{" "}
              {canAdd
                ? `Up to ${mb(GALLERY.maxImageBytes)} MB per photo and ${mb(GALLERY.maxVideoBytes)} MB per clip.`
                : "The match has started, so the album is closed to new files."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap items-center gap-2">
            {canAdd ? (
            <>
            <input
              ref={input}
              type="file"
              accept={GALLERY_ACCEPT}
              multiple
              hidden
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                // Cleared straight away so picking the same file twice still
                // fires a change event.
                event.target.value = "";
                if (files.length) void add.run(files);
              }}
            />

            <Button
              size="sm"
              disabled={busy || !matchId}
              onClick={() => input.current?.click()}
            >
              {busy ? <Spinner /> : <Icon icon={ImageAdd02Icon} size={16} />}
              {busy ? "Uploading" : "Add photos or videos"}
            </Button>
            </>
            ) : null}

            {isAdmin && items.length > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={selection.toggleAll}
                disabled={drop.pending}
              >
                {selection.count === items.length ? "Clear all" : "Select all"}
              </Button>
            ) : null}
          </div>

          {isAdmin ? (
            <BulkBar
              count={selection.count}
              noun="file"
              disabled={drop.pending}
              onClear={selection.clear}
              onDelete={() => setPendingDelete(selection.selected)}
            />
          ) : null}

          {loading && items.length === 0 ? (
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {Array.from({ length: 8 }, (_, index) => (
                <li key={index}>
                  <Skeleton className="aspect-square w-full" />
                </li>
              ))}
            </ul>
          ) : items.length === 0 ? (
            <EmptyState
              icon={Album02Icon}
              title="Nothing here yet"
              description={
                canAdd
                  ? "Add the first photo or clip from this match."
                  : "This match finished without anybody adding one."
              }
            />
          ) : (
            <ul className="grid max-h-[60vh] grid-cols-2 gap-2 overflow-y-auto scrollbar-thin sm:grid-cols-3 md:grid-cols-4">
              {items.map((media) => {
                const picked = selection.isSelected(media.id);
                const isLoaded = loaded.includes(media.id);

                return (
                  <li key={media.id} className="group/media relative">
                    {/*
                      The frame never moves: it keeps its square and clips its
                      contents, and the photo inside is what grows and tilts.
                    */}
                    <button
                      type="button"
                      data-media={media.id}
                      // The rectangle the photo grows out of is measured here,
                      // at the moment of the click, not guessed later.
                      onClick={(event) => {
                        const rect =
                          event.currentTarget.getBoundingClientRect();
                        void reveal.run(media, {
                          top: rect.top,
                          left: rect.left,
                          width: rect.width,
                          height: rect.height,
                        });
                      }}
                      className={cn(
                        "relative block aspect-square w-full cursor-pointer overflow-hidden rounded-xl border bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                        picked ? "border-primary" : "border-border/60",
                      )}
                    >
                      {isLoaded ? null : (
                        <Skeleton className="absolute inset-0 rounded-none" />
                      )}

                      {/*
                        A 400px square rendered by Cloudinary, not the original:
                        an album of phone photos would otherwise be tens of
                        megabytes before anybody has clicked anything.
                      */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={thumbUrl(media.thumbnailUrl ?? media.url)}
                        alt=""
                        loading="lazy"
                        onLoad={() =>
                          setLoaded((prev) =>
                            prev.includes(media.id) ? prev : [...prev, media.id],
                          )
                        }
                        className={cn(
                          "size-full object-cover transition-transform duration-500 ease-pichanga group-hover/media:scale-110 group-hover/media:rotate-2",
                          isLoaded ? "opacity-100" : "opacity-0",
                        )}
                      />

                      {media.kind === "video" ? (
                        <span className="pointer-events-none absolute inset-0 grid place-items-center text-white/90">
                          <Icon icon={PlayCircleIcon} size={34} />
                        </span>
                      ) : null}

                      {/* Downloading. The tile dims and holds a spinner. */}
                      {opening === media.id ? (
                        <span className="pointer-events-none absolute inset-0 grid place-items-center bg-primary-foreground/50">
                          <Spinner />
                        </span>
                      ) : null}
                    </button>

                    {isAdmin ? (
                      <>
                        {/*
                          Sitting outside the button so ticking a file never
                          opens it. Stays visible once anything is selected.
                        */}
                        <span
                          className={cn(
                            "absolute left-2 top-2 grid size-6 place-items-center rounded-md bg-black/70 backdrop-blur-sm transition-opacity",
                            picked || selection.count > 0
                              ? "opacity-100"
                              : "opacity-0 group-hover/media:opacity-100 pointer-coarse:opacity-100",
                          )}
                        >
                          <Checkbox
                            checked={picked}
                            onCheckedChange={() => selection.toggle(media.id)}
                            aria-label="Select this file"
                          />
                        </span>

                        <Button
                          variant="secondary"
                          size="icon-sm"
                          aria-label="Delete this file"
                          className="absolute right-1.5 top-1.5 bg-black/70 opacity-0 backdrop-blur-sm hover:text-destructive focus-visible:opacity-100 group-hover/media:opacity-100 pointer-coarse:opacity-100"
                          onClick={() => setPendingDelete([media.id])}
                        >
                          <Icon icon={Delete02Icon} size={14} />
                        </Button>
                      </>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      {/* Keyed so each photo starts fresh: its own loading state, its own tween. */}
      {/* Keyed on the file it opened with, so each visit starts clean. */}
      <PhotoViewer
        key={viewing ? items[viewing.index]?.id : "empty"}
        items={items}
        startIndex={viewing?.index ?? null}
        from={viewing?.from ?? null}
        natural={viewing?.natural ?? null}
        rectFor={rectFor}
        onClose={() => setViewing(null)}
      />

      <ConfirmDialog
        open={pendingDelete.length > 0}
        onOpenChange={(next) => !next && setPendingDelete([])}
        title={
          pendingDelete.length > 1
            ? `Delete ${pendingDelete.length} files`
            : "Delete this file"
        }
        description={
          pendingDelete.length > 1
            ? `${pendingDelete.length} files leave the gallery and storage. This cannot be undone.`
            : "It is removed from the gallery and from storage. This cannot be undone."
        }
        confirmLabel="Delete"
        pending={drop.pending}
        onConfirm={() => void drop.run(pendingDelete)}
      />
    </>
  );
}
