import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, initialsOf } from "@/lib/utils";
import type { Player } from "@/types";

export function PlayerAvatar({
  player,
  className,
  style,
}: {
  player: Pick<Player, "firstName" | "lastName" | "photoUrl">;
  className?: string;
  style?: React.CSSProperties;
}) {
  const initials = initialsOf(player.firstName, player.lastName);

  return (
    <Avatar className={cn("bg-secondary", className)} style={style}>
      {player.photoUrl ? (
        <AvatarImage
          src={player.photoUrl}
          alt={`${player.firstName} ${player.lastName}`}
        />
      ) : null}
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  );
}
