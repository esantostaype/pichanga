"use client";

import { useGSAP } from "@gsap/react";
import { Cancel01Icon, ImageUpload01Icon } from "@hugeicons/core-free-icons";
import gsap from "gsap";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { useLocale } from "@/components/providers/locale-provider";
import { Icon } from "@/components/ui/icon";
import { Spinner } from "@/components/ui/spinner";
import { fill, problem } from "@/i18n/dictionaries";
import { api } from "@/lib/api-client";
import {
  ACCEPTED_PHOTO_ACCEPT,
  ACCEPTED_PHOTO_TYPES,
  MAX_PHOTO_BYTES,
} from "@/lib/constants";
import { EASE } from "@/lib/ease";
import { badgeFor } from "@/lib/teams";
import { cn } from "@/lib/utils";
import { TeamCrest } from "./team-crest";

gsap.registerPlugin(useGSAP);

/**
 * Un escudo que se puede cambiar ahí mismo.
 *
 * El doble clic abre la edición de las letras: dos, nunca más, porque es todo
 * lo que cabe en un escudo. El botón pequeño de abajo cambia las letras por una
 * imagen. Las dos cosas se hacen una vez, al nombrar el equipo, así que no
 * estorban al nombre: el escudo parece un escudo hasta que se le pide otra cosa.
 *
 * Si las letras quedan iguales a las que saldrían del nombre, se guardan como
 * nada, para que un equipo renombrado después tome las letras del nombre nuevo.
 */
export function CrestEditor({
  name,
  accent,
  badge,
  image,
  onBadge,
  onImage,
  disabled,
}: {
  name: string;
  accent: string;
  badge: string | null;
  image: string | null;
  onBadge: (badge: string | null) => void;
  onImage: (url: string | null) => void;
  disabled?: boolean;
}) {
  const { t } = useLocale();
  const root = useRef<HTMLDivElement>(null);
  const picker = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [uploading, setUploading] = useState(false);

  const auto = badgeFor(name);

  const edit = () => {
    if (disabled) return;
    setDraft(badge ?? auto);
    setEditing(true);
  };

  const commit = () => {
    setEditing(false);
    const letters = draft.trim();
    const next = letters === "" || letters === auto ? null : letters;

    // Escribir letras sobre una imagen es pedir letras.
    if (image && letters !== "" && letters !== (badge ?? auto)) onImage(null);
    if (next !== badge) onBadge(next);
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;

    if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
      toast.error(t.players.badFormat);
      return;
    }

    if (file.size > MAX_PHOTO_BYTES) {
      toast.error(fill(t.players.tooBig, { mb: MAX_PHOTO_BYTES / 1024 / 1024 }));
      return;
    }

    setUploading(true);
    try {
      const { url } = await api.uploadPhoto(file, "crest");
      onImage(url);
    } catch (error) {
      toast.error(
        problem(t, error instanceof Error ? error.message : undefined) ??
          t.common.couldNotComplete,
      );
    } finally {
      setUploading(false);
    }
  };

  /*
   * El campo sale del escudo en vez de reemplazarlo, y el botón de quitar
   * aparece igual: nada en esta tarjeta aparece de golpe.
   */
  useGSAP(
    () => {
      if (editing) {
        gsap.from("[data-crest-field]", {
          scale: 0.6,
          autoAlpha: 0,
          duration: 0.3,
          ease: EASE,
        });
      }
    },
    { dependencies: [editing], scope: root },
  );

  useGSAP(
    () => {
      if (image) {
        gsap.from("[data-crest-remove]", {
          scale: 0,
          duration: 0.3,
          ease: "back.out(2)",
        });
      }
    },
    { dependencies: [!!image], scope: root },
  );

  // El escudo da un pequeño salto cada vez que cambia lo que muestra.
  useGSAP(
    () => {
      gsap.fromTo(
        "[data-crest-face]",
        { scale: 0.85 },
        { scale: 1, duration: 0.45, ease: "back.out(2.2)" },
      );
    },
    { dependencies: [badge, image], scope: root, revertOnUpdate: false },
  );

  return (
    <div ref={root} className="relative shrink-0">
      <div
        data-crest-face
        onDoubleClick={edit}
        title={t.teams.badgeHint}
        className={cn(
          "select-none",
          disabled ? "cursor-default" : "cursor-pointer",
        )}
      >
        <TeamCrest
          name={name}
          accent={accent}
          badge={badge}
          image={image}
          size={44}
        />
      </div>

      {editing ? (
        <input
          data-crest-field
          autoFocus
          value={draft}
          maxLength={2}
          aria-label={t.teams.badgeLabel}
          onChange={(event) =>
            setDraft(
              event.target.value.replace(/\s+/g, "").toUpperCase().slice(0, 2),
            )
          }
          onFocus={(event) => event.target.select()}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") {
              // No es el Escape del diálogo: este solo cierra el campo.
              event.stopPropagation();
              setEditing(false);
            }
          }}
          className="absolute left-1/2 top-1/2 h-8 w-12 -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background text-center font-display text-lg uppercase tracking-[0.08em] outline-none"
          style={{ borderColor: accent, color: accent }}
        />
      ) : null}

      <button
        type="button"
        disabled={disabled || uploading}
        onClick={() => picker.current?.click()}
        aria-label={t.teams.crestUpload}
        title={t.teams.crestUpload}
        className="absolute -bottom-1 -right-2 grid size-6 cursor-pointer place-items-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:text-foreground disabled:cursor-default"
      >
        {uploading ? <Spinner /> : <Icon icon={ImageUpload01Icon} size={13} />}
      </button>

      {image ? (
        <button
          data-crest-remove
          type="button"
          disabled={disabled}
          onClick={() => onImage(null)}
          aria-label={t.teams.crestRemove}
          title={t.teams.crestRemove}
          className="absolute -right-2 -top-1 grid size-5 cursor-pointer place-items-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:text-destructive disabled:cursor-default"
        >
          <Icon icon={Cancel01Icon} size={11} />
        </button>
      ) : null}

      <input
        ref={picker}
        type="file"
        accept={ACCEPTED_PHOTO_ACCEPT}
        className="hidden"
        onChange={(event) => {
          void upload(event.target.files?.[0]);
          // Elegir el mismo archivo dos veces seguidas también cuenta.
          event.target.value = "";
        }}
      />
    </div>
  );
}
