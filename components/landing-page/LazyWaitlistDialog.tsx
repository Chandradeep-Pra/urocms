"use client";

import { useState, type ComponentType } from "react";
import { Button } from "@/components/ui/button";

type WaitlistDialogProps = {
  triggerLabel?: string;
  triggerClassName?: string;
  controlledOpen?: boolean;
  onControlledOpenChange?: (open: boolean) => void;
};

export function LazyWaitlistDialog({
  triggerLabel = "Join Waitlist",
  triggerClassName = "",
}: {
  triggerLabel?: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [DialogComponent, setDialogComponent] =
    useState<ComponentType<WaitlistDialogProps> | null>(null);

  async function openDialog() {
    setOpen(true);
    if (!DialogComponent) {
      const waitlistDialog = await import("./WaitlistDialog");
      setDialogComponent(() => waitlistDialog.WaitlistDialog);
    }
  }

  return (
    <>
      <Button
        type="button"
        onClick={openDialog}
        className={`rounded-full bg-gradient-to-r from-[#0f7896] to-[#1294ba] px-8 py-7 text-base font-bold text-white shadow-[0_8px_30px_rgba(15,120,150,0.25)] transition-all duration-300 hover:-translate-y-1 hover:scale-105 hover:from-[#1294ba] hover:to-[#0f7896] hover:shadow-[0_12px_40px_rgba(15,120,150,0.4)] ${triggerClassName}`}
      >
        {triggerLabel}
      </Button>
      {open && DialogComponent ? (
        <DialogComponent
          controlledOpen={open}
          onControlledOpenChange={setOpen}
          triggerLabel={triggerLabel}
          triggerClassName={triggerClassName}
        />
      ) : null}
    </>
  );
}
