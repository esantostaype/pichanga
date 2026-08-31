import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, initialsOf } from "@/lib/utils";
import type { Player } from "@/types";

export function PlayerAvatar({
  player,
  className,
  imageClassName,
  ring,
  style,
}: {
  player: Pick<Player, "firstName" | "lastName" | "photoUrl">;
  className?: string;
  /**
   * Put on the photo itself rather than on the circle around it, so a
   * caller can move the picture and let the frame clip it.
   */
  imageClassName?: string;
  /** The colour around them, drawn over the photo rather than under it. */
  ring?: { color: string; width: number };
  style?: React.CSSProperties;
}) {
  const initials = initialsOf(player.firstName, player.lastName);

  return (
    <Avatar className={cn("bg-secondary", className)} style={style}>
      {player.photoUrl ? (
        <AvatarImage
          src={player.photoUrl}
          alt={`${player.firstName} ${player.lastName}`}
          className={imageClassName}
        />
      ) : null}
      <AvatarFallback className={imageClassName}>{initials}</AvatarFallback>

      {ring ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{ boxShadow: `inset 0 0 0 ${ring.width}px ${ring.color}` }}
        />
      ) : null}
    </Avatar>
  );
}
