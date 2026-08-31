"use client";

import { Camera01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";

import { useLocale } from "@/components/providers/locale-provider";
import { Icon } from "@/components/ui/icon";
import {
  ACCEPTED_PHOTO_ACCEPT,
  ACCEPTED_PHOTO_TYPES,
  MAX_PHOTO_BYTES,
} from "@/lib/constants";
import { fill } from "@/i18n/dictionaries";
import { cn } from "@/lib/utils";

type PhotoFieldProps = {
  /** Photo already saved for the player. */
  currentUrl: string | null;
  file: File | null;
  onSelect: (file: File | null) => void;
  /** Marks the existing photo for deletion on save. */
  onClear: () => void;
  disabled?: boolean;
};

export function PhotoField({
  currentUrl,
  file,
  onSelect,
  onClear,
  disabled,
}: PhotoFieldProps) {
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);

  const localPreview = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );

  // Release the object URL as soon as it stops being shown.
  useEffect(
    () => () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    },
    [localPreview],
  );

  const preview = localPreview ?? currentUrl;

  const handleFiles = (files: FileList | null) => {
    const next = files?.[0];
    if (!next) return;

    if (!ACCEPTED_PHOTO_TYPES.includes(next.type)) {
      toast.error(t.players.badFormat);
      return;
    }

    if (next.size > MAX_PHOTO_BYTES) {
      toast.error(
        fill(t.players.tooBig, { mb: MAX_PHOTO_BYTES / 1024 / 1024 }),
      );
      return;
    }

    onSelect(next);
  };

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          if (!disabled) handleFiles(event.dataTransfer.files);
        }}
        className={cn(
          "cursor-pointer group relative size-24 shrink-0 overflow-hidden rounded-full border border-dashed border-border bg-muted/40 transition-colors",
          "hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
          "disabled:cursor-not-allowed disabled:opacity-60",
        )}
        aria-label={t.players.pickPhoto}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt={t.common.preview}
            className="size-full object-cover"
          />
        ) : null}

        <span
          className={cn(
            "absolute inset-0 grid place-items-center bg-black/55 text-muted-foreground transition-opacity",
            preview ? "opacity-0 group-hover:opacity-100" : "opacity-100",
          )}
        >
          <Icon icon={Camera01Icon} size={22} />
        </span>
      </button>

      <div className="space-y-1.5 text-sm">
        <p className="text-muted-foreground">{t.players.photoHint}</p>
        <p className="text-xs text-muted-foreground/70">
          {fill(t.players.photoTypes, {
            mb: MAX_PHOTO_BYTES / 1024 / 1024,
          })}
        </p>

        {preview ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              if (!localPreview) onClear();
              onSelect(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-destructive hover:underline"
          >
            <Icon icon={Cancel01Icon} size={12} />
            {t.players.removePhoto}
          </button>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_PHOTO_ACCEPT}
        className="sr-only"
        onChange={(event) => handleFiles(event.target.files)}
      />
    </div>
  );
}
