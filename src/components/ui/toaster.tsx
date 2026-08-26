"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      theme="dark"
      position="bottom-center"
      richColors={false}
      toastOptions={{
        classNames: {
          toast:
            "!bg-card !border-border !text-foreground !rounded-2xl !shadow-2xl !shadow-black/60",
          description: "!text-muted-foreground",
          actionButton: "!bg-primary !text-primary-foreground",
          cancelButton: "!bg-secondary !text-secondary-foreground",
          error: "!text-destructive",
        },
      }}
    />
  );
}
