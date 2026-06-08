"use client";

import { useState, type ComponentType } from "react";
import { StoreButton } from "./StoreButton";

type LaunchSoonDialogProps = {
  icon: string;
  eyebrow: string;
  label: string;
  className?: string;
  controlledOpen?: boolean;
  onControlledOpenChange?: (open: boolean) => void;
};

export function LazyLaunchSoonDialog({
  icon,
  eyebrow,
  label,
  className,
}: {
  icon: string;
  eyebrow: string;
  label: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [DialogComponent, setDialogComponent] =
    useState<ComponentType<LaunchSoonDialogProps> | null>(null);

  async function openDialog() {
    setOpen(true);
    if (!DialogComponent) {
      const launchSoonDialog = await import("./LaunchSoonDialog");
      setDialogComponent(() => launchSoonDialog.LaunchSoonDialog);
    }
  }

  return (
    <>
      <StoreButton
        type="button"
        icon={icon}
        eyebrow={eyebrow}
        label={label}
        className={className}
        onClick={openDialog}
      />
      {open && DialogComponent ? (
        <DialogComponent
          icon={icon}
          eyebrow={eyebrow}
          label={label}
          className={className}
          controlledOpen={open}
          onControlledOpenChange={setOpen}
        />
      ) : null}
    </>
  );
}
