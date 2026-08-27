"use client";

import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import gsap from "gsap";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";

import { Icon } from "@/components/ui/icon";
import { Spinner } from "@/components/ui/spinner";
import { EASE } from "@/lib/ease";
import { fullUrl, thumbUrl } from "@/lib/media-url";
import type { MatchMedia } from "@/types";

/** Where a thumbnail sits, so the photo can grow out of it and shrink back. */
export type OpenFrom = {
  top: number;
  left: number;
  width: number;
  height: number;
};

/** Pixel size of the file itself, measured while it was preloaded. */
export type NaturalSize = { width: number; height: number };

const GROW_SECONDS = 0.5;
const SHRINK_SECONDS = 0.25;
/** One photo out and the next one in, at the same time. */
const SLIDE_SECONDS = 0.45;

/** The 16px of air the dialog leaves on each side, as one CSS length. */
const FRAME_MARGIN = "2rem";

/** Longest wait for a decode before showing the photo anyway. */
const DECODE_GRACE_MS = 300;

/** How far a finger has to travel before it counts as a swipe. */
const SWIPE_PX = 50;

/**
 * Downloads a photo and reports its pixel size. Nothing is shown until this
 * resolves, so a half-painted photo never reaches the screen.
 */
export function preloadPhoto(src: string): Promise<NaturalSize> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    const done = () =>
      image.naturalWidth
        ? resolve({ width: image.naturalWidth, height: image.naturalHeight })
        : reject(new Error("The photo could not be loaded"));

    image.onload = () => {
      if (!image.decode) return done();

      // `decode` waits for the pixels to be ready to paint rather than merely
      // received -- but it never settles while the page is hidden, and a photo
      // tapped just before switching apps would hang the spinner forever. The
      // bytes are already here by now, so a short race is enough.
      void Promise.race([
        image.decode(),
        new Promise((settle) => setTimeout(settle, DECODE_GRACE_MS)),
      ]).then(done, done);
    };
    image.onerror = () => reject(new Error("The photo could not be loaded"));
    image.src = src;
  });
}

/** The size a file should be drawn at, from whatever is known about it. */
function sizeOf(
  media: MatchMedia | undefined,
  measured: Record<string, NaturalSize>,
  fallback: NaturalSize | null,
) {
  if (!media) return null;
  if (measured[media.id]) return measured[media.id];
  if (fallback) return fallback;

  return media.width && media.height
    ? { width: media.width, height: media.height }
    : null;
}

/**
 * The screen is the limit, not the target: a photo smaller than the screen is
 * shown at its own size instead of being blown up to fill it. Hence the
 * three-way `min` -- its own width, the width available, and the width its own
 * height allows.
 */
function frameStyleFor(size: NaturalSize | null) {
  if (!size) return undefined;

  return {
    aspectRatio: `${size.width} / ${size.height}`,
    width: `min(${size.width}px, 100%, calc((100dvh - ${FRAME_MARGIN}) * ${size.width} / ${size.height}))`,
  };
}

/**
 * A photo, as big as it deserves to be, with the rest of the album a swipe, an
 * arrow key or a button away.
 *
 * Its own dialog rather than the shared one: no card, no padding, 16px of air
 * and nothing else. It grows out of the thumbnail that opened it and shrinks
 * back into whichever thumbnail is showing when it closes.
 *
 * Hand-rolled instead of a lightbox library on purpose: the growing animation,
 * the Cloudinary sizes and the app's own dialog conventions are the whole
 * point, and a library would bring its own of each.
 */
export function PhotoViewer({
  items,
  startIndex,
  from,
  natural,
  rectFor,
  onClose,
}: {
  /** The album, so prev and next stay inside the viewer. */
  items: MatchMedia[];
  startIndex: number | null;
  from: OpenFrom | null;
  /** Size of the photo that was opened; the rest are measured as they load. */
  natural: NaturalSize | null;
  /** Where a given file's thumbnail is right now, for the closing tween. */
  rectFor: (mediaId: string) => OpenFrom | null;
  onClose: () => void;
}) {
  /** The frame of the settled photo: what the growing tween moves. */
  const mover = useRef<HTMLDivElement>(null);
  /** The two sliding layers, each centring its own photo. */
  const currentLayer = useRef<HTMLDivElement>(null);
  const incomingLayer = useRef<HTMLDivElement>(null);

  const growing = useRef<gsap.core.Tween | null>(null);
  const grown = useRef(false);
  /** Set while the closing tween runs, so it cannot be started twice. */
  const leaving = useRef(false);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);

  const [index, setIndex] = useState(startIndex ?? 0);
  /** The photo on its way in, while both layers are on screen. */
  const [incoming, setIncoming] = useState<{
    index: number;
    direction: number;
  } | null>(null);
  const [sizes, setSizes] = useState<Record<string, NaturalSize>>({});
  /** Set while a neighbour is being fetched, so the wait is visible. */
  const [waiting, setWaiting] = useState(false);

  const open = startIndex !== null;
  const media = open ? items[index] : undefined;
  const isVideo = media?.kind === "video";

  const size = sizeOf(media, sizes, index === startIndex ? natural : null);
  const incomingMedia = incoming ? items[incoming.index] : undefined;
  const incomingSize = sizeOf(incomingMedia, sizes, null);

  /**
   * How far a photo is from the thumbnail it belongs to. It is already laid out
   * at its final size, so the tween runs from this offset back to nothing.
   */
  const offsetFromThumb = useCallback((rect: OpenFrom | null) => {
    const node = mover.current;
    if (!node || !rect) return null;

    const to = node.getBoundingClientRect();
    if (!to.width || !to.height) return null;

    return {
      x: rect.left + rect.width / 2 - (to.left + to.width / 2),
      y: rect.top + rect.height / 2 - (to.top + to.height / 2),
      scale: rect.width / to.width,
    };
  }, []);

  /**
   * Grows out of the thumbnail on the way in, started from the ref itself.
   *
   * Not from a mount effect: Radix renders a portal empty on the first commit
   * and fills it on the second, so an effect on mount runs while this node does
   * not exist yet -- which is how the opening animation went missing while the
   * closing one, fired from a click, worked fine.
   *
   * It only ever runs once. Stepping to the next photo is a change of subject,
   * not a new arrival.
   */
  const attach = useCallback(
    (node: HTMLDivElement | null) => {
      mover.current = node;
      if (!node || grown.current) return;

      grown.current = true;
      const offset = offsetFromThumb(from);
      if (!offset) return;

      // Only the transform is animated. If the tween never ticks the photo is
      // still on screen, just small: an invisible one would be worse.
      growing.current = gsap.fromTo(node, offset, {
        x: 0,
        y: 0,
        scale: 1,
        duration: GROW_SECONDS,
        ease: EASE,
        // Without this GSAP holds the first render back to its next tick, so
        // the photo sits full size for a frame before snapping to the
        // thumbnail to start -- which reads as no animation at all.
        lazy: false,
      });
    },
    [from, offsetFromThumb],
  );

  useEffect(
    () => () => {
      growing.current?.kill();
    },
    [],
  );

  /** Shrinks back into the thumbnail of whatever is on screen, then unmounts. */
  const close = useCallback(() => {
    const node = mover.current;
    const offset = offsetFromThumb(media ? rectFor(media.id) : null);

    if (!node || !offset || leaving.current) {
      onClose();
      return;
    }

    leaving.current = true;
    gsap.to(node, {
      ...offset,
      duration: SHRINK_SECONDS,
      ease: EASE,
      lazy: false,
      onComplete: () => {
        leaving.current = false;
        onClose();
      },
    });
  }, [media, offsetFromThumb, onClose, rectFor]);

  /**
   * The slide: both layers move at once, one leaving as the other arrives.
   * They are separate layers so the two photos can be different shapes and
   * each still sits in the middle of the screen.
   */
  useLayoutEffect(() => {
    const leavingLayer = currentLayer.current;
    const arriving = incomingLayer.current;
    if (!incoming || !leavingLayer || !arriving) return;

    const away = window.innerWidth;
    const { direction, index: next } = incoming;

    gsap.to(leavingLayer, {
      x: -direction * away,
      duration: SLIDE_SECONDS,
      ease: EASE,
      lazy: false,
    });

    gsap.fromTo(
      arriving,
      { x: direction * away },
      {
        x: 0,
        duration: SLIDE_SECONDS,
        ease: EASE,
        lazy: false,
        onComplete: () => {
          /*
           * Order matters. Putting the layer back at rest before React has
           * rendered the new photo into it flashes the old one back into the
           * middle for a frame, so the commit is forced through first and the
           * transform cleared only once the layer holds the right photo.
           */
          flushSync(() => {
            setIndex(next);
            setIncoming(null);
          });

          gsap.set(currentLayer.current, { x: 0 });
        },
      },
    );
    // One run per slide: `incoming` is what starts and ends one.
  }, [incoming]);

  /**
   * Steps through the album. The next photo is downloaded before it is shown,
   * the same rule the first one follows; neighbours are usually already in the
   * browser by then, so the wait is rarely visible.
   */
  const go = useCallback(
    async (step: number) => {
      const next = index + step;
      const target = items[next];
      if (!target || leaving.current || incoming) return;

      const direction = Math.sign(step);

      if (target.kind === "video" || sizes[target.id]) {
        setIncoming({ index: next, direction });
        return;
      }

      setWaiting(true);
      try {
        const measured = await preloadPhoto(fullUrl(target.url));
        setSizes((prev) => ({ ...prev, [target.id]: measured }));
        setIncoming({ index: next, direction });
      } catch {
        // Leave the current photo up: a blank frame would be worse than a
        // button that did nothing.
      } finally {
        setWaiting(false);
      }
    },
    [incoming, index, items, sizes],
  );

  /** Arrow keys, while the viewer holds the screen. */
  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") void go(-1);
      if (event.key === "ArrowRight") void go(1);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, go]);

  /** The neighbours, fetched quietly so stepping through feels instant. */
  useEffect(() => {
    if (!open) return;

    for (const neighbour of [items[index - 1], items[index + 1]]) {
      if (!neighbour || neighbour.kind === "video" || sizes[neighbour.id]) {
        continue;
      }
      void preloadPhoto(fullUrl(neighbour.url))
        .then((measured) =>
          setSizes((prev) =>
            prev[neighbour.id] ? prev : { ...prev, [neighbour.id]: measured },
          ),
        )
        .catch(() => undefined);
    }
  }, [open, index, items, sizes]);

  const hasPrev = index > 0;
  const hasNext = index < items.length - 1;

  /**
   * Sideways to change photo, down to leave. A finger that has barely moved is
   * a tap, and on the photo itself a tap does nothing.
   */
  const swipe = {
    onPointerDown: (event: React.PointerEvent) => {
      if (event.pointerType === "mouse") return;
      swipeStart.current = { x: event.clientX, y: event.clientY };
    },
    onPointerUp: (event: React.PointerEvent) => {
      const start = swipeStart.current;
      swipeStart.current = null;
      if (!start) return;

      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;

      if (Math.abs(dy) > Math.abs(dx)) {
        if (dy > SWIPE_PX) close();
        return;
      }

      if (Math.abs(dx) >= SWIPE_PX) void go(dx < 0 ? 1 : -1);
    },
  };

  /** Anywhere that is not the photo is a way out. */
  const closeOnBackdrop = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) close();
  };

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={[
            "fixed inset-0 z-50 bg-black/85 backdrop-blur-sm",
            "ease-pichanga data-[state=open]:animate-in data-[state=open]:duration-500 data-[state=open]:fade-in-0",
            "data-[state=closed]:animate-out data-[state=closed]:duration-[250ms] data-[state=closed]:fade-out-0",
          ].join(" ")}
        />

        {/* 16px of air on every side, and nothing else between photo and edge. */}
        <DialogPrimitive.Content
          className="fixed inset-4 z-50 overflow-hidden border-0 bg-transparent p-0 outline-none"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <DialogPrimitive.Title className="sr-only">
            {isVideo ? "Match clip" : "Match photo"}
          </DialogPrimitive.Title>

          {media ? (
            <div
              ref={currentLayer}
              onClick={closeOnBackdrop}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div
                ref={attach}
                className="relative flex max-h-full max-w-full"
                // Swipe on a phone. Vertical scrolling is left to the browser.
                style={{ ...frameStyleFor(size), touchAction: "pan-y" }}
                {...swipe}
              >
                <Frame media={media} />

                {waiting ? (
                  <span className="pointer-events-none absolute inset-0 grid place-items-center bg-primary-foreground/50">
                    <Spinner />
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}

          {incomingMedia ? (
            <div
              ref={incomingLayer}
              className="absolute inset-0 flex items-center justify-center"
              // Parked off-screen until the tween takes over, so it never
              // flashes in the middle for a frame.
              style={{
                transform: `translateX(${(incoming?.direction ?? 1) * 100}vw)`,
              }}
            >
              <div
                className="relative flex max-h-full max-w-full"
                style={frameStyleFor(incomingSize)}
              >
                <Frame media={incomingMedia} />
              </div>
            </div>
          ) : null}

          {items.length > 1 ? (
            <>
              <ViewerButton
                icon={ArrowLeft01Icon}
                label="Previous photo"
                disabled={!hasPrev || waiting}
                onClick={() => void go(-1)}
                className="left-0 top-1/2 -translate-y-1/2"
              />
              <ViewerButton
                icon={ArrowRight01Icon}
                label="Next photo"
                disabled={!hasNext || waiting}
                onClick={() => void go(1)}
                className="right-0 top-1/2 -translate-y-1/2"
              />

              <p className="pointer-events-none absolute bottom-0 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs tabular-nums text-white/80 backdrop-blur-sm">
                {index + 1} / {items.length}
              </p>
            </>
          ) : null}

          <DialogPrimitive.Close
            className="absolute right-0 top-0 z-10 grid size-10 cursor-pointer place-items-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            aria-label="Close"
          >
            <Icon icon={Cancel01Icon} size={18} />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** One file, filling whatever box it has been given. */
function Frame({ media }: { media: MatchMedia }) {
  if (media.kind === "video") {
    return (
      <video
        src={media.url}
        poster={thumbUrl(media.thumbnailUrl ?? media.url)}
        controls
        autoPlay
        className="max-h-full max-w-full rounded-lg bg-black"
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={fullUrl(media.url)}
      alt=""
      className="block size-full rounded-lg object-contain"
    />
  );
}

function ViewerButton({
  icon,
  label,
  disabled,
  onClick,
  className,
}: {
  icon: typeof ArrowLeft01Icon;
  label: string;
  disabled: boolean;
  onClick: () => void;
  className: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={[
        "absolute z-10 grid size-11 cursor-pointer place-items-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-colors",
        "hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
        "disabled:pointer-events-none disabled:opacity-0",
        className,
      ].join(" ")}
    >
      <Icon icon={icon} size={20} />
    </button>
  );
}
