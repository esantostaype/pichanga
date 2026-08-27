"use client";

import { useCallback, useEffect, useState } from "react";

import { usePichanga } from "@/components/providers/pichanga-provider";
import { api } from "@/lib/api-client";
import { GALLERY } from "@/lib/constants";
import type { MatchMedia } from "@/types";

/** Guessed from the MIME type: Cloudinary confirms it in the response. */
const kindOf = (file: File): "image" | "video" | null => {
  if ((GALLERY.imageTypes as readonly string[]).includes(file.type)) {
    return "image";
  }
  if ((GALLERY.videoTypes as readonly string[]).includes(file.type)) {
    return "video";
  }
  return null;
};

const mb = (bytes: number) => Math.round(bytes / 1024 / 1024);

/**
 * A video's poster frame. Cloudinary renders one from any frame of the clip
 * when the extension is swapped, so no extra upload is needed.
 */
const posterFor = (url: string) => url.replace(/\.[^./]+$/, ".jpg");

type CloudinaryUpload = {
  public_id?: string;
  secure_url?: string;
  resource_type?: string;
  width?: number;
  height?: number;
};

/**
 * The gallery of one match.
 *
 * Files go from the browser straight to Cloudinary with a signature this app
 * hands out, and only the resulting metadata comes back here. That is what
 * makes video possible: a serverless request body would cap the upload at a
 * few megabytes.
 */
export function useMatchMedia(matchId: string | null, open: boolean) {
  const { mediaVersion } = usePichanga();

  const [items, setItems] = useState<MatchMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(0);

  useEffect(() => {
    if (!matchId || !open) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const media = await api.media.list(matchId);
        if (!cancelled) setItems(media);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
    // `mediaVersion` ticks when another screen adds or removes something.
  }, [matchId, open, mediaVersion]);

  const upload = useCallback(
    async (files: File[]) => {
      if (!matchId || files.length === 0) return;

      const ticket = await api.media.ticket();
      setUploading(files.length);

      try {
        for (const file of files) {
          const kind = kindOf(file);
          if (!kind) throw new Error(`${file.name}: unsupported format`);

          const limit =
            kind === "video" ? GALLERY.maxVideoBytes : GALLERY.maxImageBytes;
          if (file.size > limit) {
            throw new Error(`${file.name} is over the ${mb(limit)} MB limit`);
          }

          const form = new FormData();
          form.append("file", file);
          form.append("api_key", ticket.apiKey);
          form.append("timestamp", String(ticket.timestamp));
          form.append("folder", ticket.folder);
          form.append("signature", ticket.signature);

          const response = await fetch(
            `https://api.cloudinary.com/v1_1/${ticket.cloudName}/auto/upload`,
            { method: "POST", body: form },
          );

          if (!response.ok) throw new Error(`${file.name} could not be uploaded`);

          const uploaded = (await response.json()) as CloudinaryUpload;
          if (!uploaded.public_id || !uploaded.secure_url) {
            throw new Error(`${file.name} came back incomplete`);
          }

          const isVideo = uploaded.resource_type === "video";

          const saved = await api.media.add(matchId, {
            publicId: uploaded.public_id,
            url: uploaded.secure_url,
            kind: isVideo ? "video" : "image",
            thumbnailUrl: isVideo ? posterFor(uploaded.secure_url) : null,
            width: uploaded.width ?? null,
            height: uploaded.height ?? null,
          });

          setItems((prev) => [saved, ...prev]);
          setUploading((prev) => Math.max(0, prev - 1));
        }
      } finally {
        setUploading(0);
      }
    },
    [matchId],
  );

  /**
   * Takes a list so one tile and a whole selection share the same path. The
   * requests go out together and the grid is trimmed once, not once per file.
   */
  const remove = useCallback(
    async (mediaIds: string[]) => {
      if (!matchId || mediaIds.length === 0) return;

      const results = await Promise.allSettled(
        mediaIds.map((id) => api.media.remove(matchId, id)),
      );

      const gone = mediaIds.filter((_, i) => results[i].status === "fulfilled");
      setItems((prev) => prev.filter((item) => !gone.includes(item.id)));

      const failed = results.length - gone.length;
      if (failed > 0) {
        throw new Error(
          failed === results.length
            ? "Those files could not be deleted"
            : `${failed} of ${results.length} files could not be deleted`,
        );
      }
    },
    [matchId],
  );

  return { items, loading, uploading, upload, remove };
}
