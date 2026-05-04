import Image from "next/image";
import { type LucideIcon } from "lucide-react";
import { panelClass } from "@/components/landing-page/theme";

export function HeroMetric({
  valueIcon: ValueIcon,
  label,
  value,
}: {
  valueIcon?: LucideIcon;
  label: string;
  value?: string;
}) {
  return (
    <div className={`${panelClass} px-5 py-5`}>
      <p className="text-center text-[11px] uppercase tracking-[0.18em] text-[#071014]/46">{label}</p>
      {ValueIcon ? (
        <div className="mt-5 flex justify-center">
          <ValueIcon className="h-16 w-16 text-[#0f7896]" />
        </div>
      ) : value ? (
        <p className="mt-5 text-center text-3xl font-semibold tracking-[-0.04em] text-[#071014]">{value}</p>
      ) : null}
    </div>
  );
}

export function LandingBadge({ text }: { text: string }) {
  return <span className="rounded-full border border-[#0f7896]/18 bg-white px-3 py-1 text-xs text-[#0f7896]">{text}</span>;
}

export function MiniPanel({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[22px] border border-[#0f7896]/18 bg-white p-3">
      <p className="text-sm font-medium text-[#071014]">{title}</p>
      <p className="mt-1 text-xs leading-6 text-[#071014]/56">{text}</p>
    </div>
  );
}

export function PhoneMock({
  className = "",
  imageSrc,
}: {
  className?: string;
  imageSrc: string;
}) {
  return (
    <div
      className={`relative mx-auto w-[310px] rounded-[54px] border border-[#0f7896]/18 bg-zinc-700 p-[10px] shadow-[0_20px_54px_rgba(15,120,150,0.10)] ${className}`}
    >
      {/* <div className="absolute left-1/2 top-[10px] h-[28px] w-[118px] -translate-x-1/2 rounded-full bg-black/85" /> */}
      {/* <div className="absolute left-[10px] right-[10px] top-[10px] h-[calc(100%-20px)] rounded-[44px] border border-[#0f7896]/12" /> */}

      <div className="relative min-h-[560px] overflow-hidden rounded-[42px] bg-cyan-50">
        <Image src={imageSrc} alt="" fill className="object-cover" sizes="420px" />
      </div>
    </div>
  );
}

export function SignalRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[22px] border border-[#0f7896]/18 bg-white px-4 py-3">
      <div className="grid h-10 w-10 place-items-center rounded-2xl border border-[#0f7896]/18 bg-cyan-50 text-[#0f7896]">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-sm font-medium text-[#071014]">{label}</p>
        <p className="text-xs text-[#071014]/54">{value}</p>
      </div>
    </div>
  );
}

export function ValueRow({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-4 rounded-[24px] border border-[#0f7896]/18 bg-white p-4">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[#0f7896]/18 bg-cyan-50 text-[#0f7896]">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-base font-medium text-[#071014]">{title}</p>
        <p className="mt-1 text-sm leading-7 text-[#071014]/58">{text}</p>
      </div>
    </div>
  );
}

export function TechStat({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[24px] border border-[#0f7896]/18 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-[#0f7896]/18 bg-cyan-50 text-[#0f7896]">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-medium text-[#071014]">{title}</p>
          <p className="mt-1 text-xs leading-6 text-[#071014]/56">{text}</p>
        </div>
      </div>
    </div>
  );
}

export function DirectionCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[24px] border border-[#0f7896]/18 bg-white p-5">
      <p className="text-lg font-medium text-[#071014]">{title}</p>
      <p className="mt-2 text-sm leading-7 text-[#071014]/58">{text}</p>
    </div>
  );
}
