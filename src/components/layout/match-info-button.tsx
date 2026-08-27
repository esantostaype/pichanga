"use client";

import { InformationCircleIcon } from "@hugeicons/core-free-icons";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import type { Match } from "@/types";
import { MatchHudCard } from "./match-hud-card";

/**
 * Mobile-only way into the match details.
 *
 * On a phone the HUD is cut back to the logo and two buttons so the pitch is
 * not covered, so the date, time, venue and split live behind this dialog
 * instead of being permanently on screen.
 */
export function MatchInfoButton({
  match,
  className,
}: {
  match: Match | null;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          aria-label="Match details"
          className={cn("bg-black/55 backdrop-blur-md", className)}
        >
          <Icon icon={InformationCircleIcon} size={20} />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-sm">
        <DialogTitle className="sr-only">Match details</DialogTitle>
        <MatchHudCard match={match} stacked />
      </DialogContent>
    </Dialog>
  );
}
