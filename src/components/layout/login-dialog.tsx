"use client";

import { useRef, useState } from "react";

import { usePichanga } from "@/components/providers/pichanga-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useAction } from "@/hooks/use-action";

export function LoginDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const busy = useRef(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!busy.current) onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Sign in</DialogTitle>
          <DialogDescription>
            Managing matches, players and places needs the office password.
          </DialogDescription>
        </DialogHeader>

        <LoginForm
          onBusyChange={(value) => (busy.current = value)}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function LoginForm({
  onBusyChange,
  onDone,
}: {
  onBusyChange: (busy: boolean) => void;
  onDone: () => void;
}) {
  const { login } = usePichanga();
  const [password, setPassword] = useState("");

  const { run, pending } = useAction(async () => login(password), {
    success: "Signed in",
    onSuccess: () => onDone(),
  });

  return (
    <form
      className="space-y-5"
      onSubmit={async (event) => {
        event.preventDefault();
        onBusyChange(true);
        await run();
        onBusyChange(false);
      }}
    >
      <Field label="Password">
        <Input
          type="password"
          autoComplete="current-password"
          autoFocus
          disabled={pending}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </Field>

      <DialogFooter>
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={onDone}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={pending || !password}>
          {pending ? <Spinner /> : null}
          Sign in
        </Button>
      </DialogFooter>
    </form>
  );
}
