"use client";

import { useEffect, useState } from "react";
import { Linkedin, Loader2, PlayCircle, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LottieAnimation } from "@/components/landing-page/LottieAnimation";
import { StoreButton } from "@/components/landing-page/StoreButton";
import { WaitlistDialog } from "@/components/landing-page/WaitlistDialog";

const youtubeUrl = "https://www.youtube.com/@ankitgoel2863";
const linkedinUrl = "https://www.linkedin.com/in/ankitgoelfrcs/";

type AnnouncementPayload = {
  title: string;
  subtitle?: string;
  description?: string;
  media?: {
    type?: "youtube" | "image";
    src?: string;
  };
};

function AnnouncementPreview({ announcement }: { announcement: AnnouncementPayload | null }) {
  if (!announcement) {
    return (
      <div className="rounded-2xl border border-dashed border-[#0f7896]/14 bg-cyan-50 px-4 py-8 text-center text-sm text-[#071014]/55">
        No live update has been published yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h4 className="text-xl font-bold tracking-tight text-[#071014]">{announcement.title}</h4>
        {announcement.subtitle ? (
          <p className="text-sm font-medium text-[#0f7896]">{announcement.subtitle}</p>
        ) : null}
      </div>

      {announcement.media?.type === "youtube" && announcement.media.src ? (
        <div className="overflow-hidden rounded-2xl border border-[#0f7896]/12">
          <iframe
            src={`https://www.youtube.com/embed/${announcement.media.src}`}
            title={announcement.title}
            className="aspect-video w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : null}

      {announcement.media?.type === "image" && announcement.media.src ? (
        <div className="overflow-hidden rounded-2xl border border-[#0f7896]/12">
          <img
            src={announcement.media.src}
            alt={announcement.title}
            className="h-auto w-full object-cover"
          />
        </div>
      ) : null}

      {announcement.description ? (
        <p className="text-sm leading-7 text-[#071014]/65">{announcement.description}</p>
      ) : null}
    </div>
  );
}

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
  const [updatesOpen, setUpdatesOpen] = useState(false);
  const [announcement, setAnnouncement] = useState<AnnouncementPayload | null>(null);
  const [loadingAnnouncement, setLoadingAnnouncement] = useState(false);
  const [announcementError, setAnnouncementError] = useState("");

  useEffect(() => {
    if (!updatesOpen) return;

    let cancelled = false;

    async function loadAnnouncement() {
      try {
        setLoadingAnnouncement(true);
        setAnnouncementError("");
        const response = await fetch("/api/announcements", { cache: "no-store" });
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.error || "Failed to load announcement");
        }

        if (!cancelled) {
          setAnnouncement((data?.announcement as AnnouncementPayload | null) ?? null);
        }
      } catch (error) {
        if (!cancelled) {
          setAnnouncement(null);
          setAnnouncementError(
            error instanceof Error ? error.message : "Failed to load announcement"
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingAnnouncement(false);
        }
      }
    }

    loadAnnouncement();

    return () => {
      cancelled = true;
    };
  }, [updatesOpen]);

  return (
    <>
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
            <div className="grid h-40 w-full place-items-center overflow-hidden">
              <LottieAnimation path="/coding.json" className="h-40 w-40" />
            </div>
            <DialogTitle className="pt-3 text-3xl font-extrabold tracking-[-0.04em] text-[#071014]">
              We are building it fast
            </DialogTitle>
            <DialogDescription className="text-base leading-7 text-[#071014]/60">
              You will be among the first to know when the{" "}
              <span className="font-extrabold text-[#0f7896]">Urologics</span> app launches.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 rounded-[24px] border border-[#0f7896]/12 bg-white p-5">
            <WaitlistDialog
              triggerLabel="Join waitlist"
              triggerClassName="mb-5 w-full rounded-2xl px-5 py-5 text-sm"
            />
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-[#0f7896]/70">
              Till then, follow us
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Button
                asChild
                type="button"
                variant="outline"
                className="rounded-2xl border-[#0f7896]/16 text-[#071014] hover:bg-cyan-50 hover:text-[#071014]"
              >
                <a href={youtubeUrl} target="_blank" rel="noopener noreferrer">
                  <Youtube className="h-4 w-4 text-[#0f7896]" />
                  YouTube
                </a>
              </Button>
              <Button
                asChild
                type="button"
                variant="outline"
                className="rounded-2xl border-[#0f7896]/16 text-[#071014] hover:bg-cyan-50 hover:text-[#071014]"
              >
                <a href={linkedinUrl} target="_blank" rel="noopener noreferrer">
                  <Linkedin className="h-4 w-4 text-[#0f7896]" />
                  LinkedIn
                </a>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setUpdatesOpen(true)}
                className="rounded-2xl border-[#0f7896]/16 text-[#071014] hover:bg-cyan-50 hover:text-[#071014]"
              >
                <PlayCircle className="h-4 w-4 text-[#0f7896]" />
                Updates
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={updatesOpen} onOpenChange={setUpdatesOpen}>
        <DialogContent className="rounded-[32px] border border-[#0f7896]/14 bg-white p-6 shadow-[0_24px_70px_rgba(15,120,150,0.18)] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold tracking-tight text-[#071014]">
              Latest Update
            </DialogTitle>
            
          </DialogHeader>

          {loadingAnnouncement ? (
            <div className="grid min-h-[260px] place-items-center">
              <div className="flex items-center gap-2 text-sm text-[#071014]/55">
                <Loader2 className="h-4 w-4 animate-spin text-[#0f7896]" />
                Loading update...
              </div>
            </div>
          ) : announcementError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-600">
              {announcementError}
            </div>
          ) : (
            <AnnouncementPreview announcement={announcement} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
