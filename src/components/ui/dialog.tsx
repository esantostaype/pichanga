"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import * as React from "react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        "fixed inset-0 z-50 bg-(--background)/80",
        "ease-pichanga data-[state=open]:animate-in data-[state=open]:duration-500 data-[state=open]:fade-in-0",
        "data-[state=closed]:animate-out data-[state=closed]:duration-[250ms] data-[state=closed]:fade-out-0",
        className,
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPortal>
      <DialogOverlay />
      {/*
        Centred with `inset-0` and `margin: auto`, not with `-translate-1/2`.
        The slide animates this element's own `transform`, which would wipe a
        translate-based centring out mid-flight; and it has to stay the portal's
        only child, because Radix wraps each child in its own `Presence` and a
        plain wrapper would unmount instantly, cutting the exit animation off.
      */}
      <DialogPrimitive.Content
        className={cn(
          "fixed inset-0 z-50 m-auto grid h-fit w-[calc(100vw-2rem)] max-w-lg gap-5",
          "max-h-[calc(100dvh-2rem)] overflow-y-auto scrollbar-thin",
          "rounded-2xl border border-border bg-card p-6 shadow-2xl shadow-black/60",
          // Rises 200px into place on the app's curve, and drops back out in
          // half the time: leaving should not keep anybody waiting.
          "ease-pichanga data-[state=open]:animate-in data-[state=open]:duration-500 data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-[200px]",
          "data-[state=closed]:animate-out data-[state=closed]:duration-[250ms] data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-bottom-[200px]",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          className={cn(
            "absolute right-4 top-4 cursor-pointer rounded-full p-1.5 text-muted-foreground transition-colors",
            "hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          )}
        >
          <Icon icon={Cancel01Icon} size={16} />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1.5 pr-8", className)} {...props} />;
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn(
        "font-display text-xl uppercase tracking-[0.04em]",
        className,
      )}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
