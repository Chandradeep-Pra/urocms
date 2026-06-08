"use client";

import { useState, type ComponentType } from "react";
import { Button } from "@/components/ui/button";

type SignUpDialogProps = {
  controlledOpen?: boolean;
  onControlledOpenChange?: (open: boolean) => void;
};

export function LazySignUpDialog({
  className,
  label = "Sign Up",
}: {
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [DialogComponent, setDialogComponent] =
    useState<ComponentType<SignUpDialogProps> | null>(null);

  async function openDialog() {
    setOpen(true);
    if (!DialogComponent) {
      const signUpDialog = await import("./SignUpDialog");
      setDialogComponent(() => signUpDialog.SignUpDialog);
    }
  }

  return (
    <>
      <Button type="button" onClick={openDialog} className={className}>
        {label}
      </Button>
      {open && DialogComponent ? (
        <DialogComponent controlledOpen={open} onControlledOpenChange={setOpen} />
      ) : null}
    </>
  );
}
