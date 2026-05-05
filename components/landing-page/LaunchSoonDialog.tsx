"use client";

import { Instagram, PlayCircle, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { StoreButton } from "@/components/landing-page/StoreButton";

export function LaunchSoonDialog({
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
  return (
    <Dialog>
      <DialogTrigger asChild>
        <StoreButton
          type="button"
          icon={icon}
          eyebrow={eyebrow}
          label={label}
          className={className}
        />
      </DialogTrigger>
      <DialogContent className="rounded-[32px] border border-[#0f7896]/14 bg-white p-6 text-center shadow-[0_24px_70px_rgba(15,120,150,0.18)] sm:max-w-lg">
        <DialogHeader className="items-center text-center">
          <div className="grid h-32 w-full place-items-center rounded-[28px] border border-dashed border-[#0f7896]/24 bg-cyan-50/70 text-[#0f7896]/50">
            Lottie space
          </div>
          <DialogTitle className="pt-3 text-3xl font-extrabold tracking-[-0.04em] text-[#071014]">
            We are building it fast
          </DialogTitle>
          <DialogDescription className="text-base leading-7 text-[#071014]/60">
            You will be among the first to know when the Urologics app launches.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 rounded-[24px] border border-[#0f7896]/12 bg-white p-5">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-[#0f7896]/70">
            Till then, follow us
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Button
              type="button"
              variant="outline"
              className="rounded-2xl border-[#0f7896]/16 text-[#071014] hover:bg-cyan-50 hover:text-[#071014]"
            >
              <Youtube className="h-4 w-4 text-[#0f7896]" />
              YouTube
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-2xl border-[#0f7896]/16 text-[#071014] hover:bg-cyan-50 hover:text-[#071014]"
            >
              <Instagram className="h-4 w-4 text-[#0f7896]" />
              Instagram
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-2xl border-[#0f7896]/16 text-[#071014] hover:bg-cyan-50 hover:text-[#071014]"
            >
              <PlayCircle className="h-4 w-4 text-[#0f7896]" />
              Updates
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
