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
      <div className="absolute inset-x-5 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(233,210,149,0.65),transparent)]" />
      <p className="text-center text-[11px] uppercase tracking-[0.18em] text-white/42">{label}</p>
      {ValueIcon ? (
        <div className="mt-5 flex justify-center">
          <ValueIcon className="h-16 w-16 text-[#f3dfae]" />
        </div>
      ) : value ? (
        <p className="mt-5 text-center text-3xl font-semibold tracking-[-0.04em] text-white">{value}</p>
      ) : null}
    </div>
  );
}

export function LandingBadge({ text }: { text: string }) {
  return <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-xs text-[#d6e0f2]/74">{text}</span>;
}

export function MiniPanel({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <p className="text-sm font-medium text-white">{title}</p>
      <p className="mt-1 text-xs leading-6 text-white/56">{text}</p>
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
      className={`relative mx-auto w-[310px] rounded-[54px] border border-[rgba(220,200,145,0.18)] bg-[linear-gradient(180deg,#020712,#07111f)] p-[10px] shadow-[0_28px_84px_rgba(0,3,10,0.68)] ${className}`}
    >
      <div className="absolute left-1/2 top-[10px] h-[28px] w-[118px] -translate-x-1/2 rounded-full bg-black/85" />
      <div className="absolute left-[10px] right-[10px] top-[10px] h-[calc(100%-20px)] rounded-[44px] border border-white/7" />

      <div className="relative min-h-[560px] overflow-hidden rounded-[42px] border border-[rgba(214,190,130,0.12)] bg-[linear-gradient(180deg,#08111f,#030814)]">
        <Image src={imageSrc} alt="" fill className="object-cover" sizes="420px" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,8,20,0.06),rgba(2,8,20,0.2))]" />
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
    <div className="flex items-center gap-3 rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-3">
      <div className="grid h-10 w-10 place-items-center rounded-2xl border border-[rgba(214,190,130,0.18)] bg-[rgba(214,190,130,0.08)] text-[#efdca8]">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-white/54">{value}</p>
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
    <div className="flex gap-4 rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[rgba(214,190,130,0.18)] bg-[rgba(214,190,130,0.08)] text-[#f1dfaf]">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-base font-medium text-white">{title}</p>
        <p className="mt-1 text-sm leading-7 text-white/58">{text}</p>
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
    <div className="rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-[rgba(214,190,130,0.18)] bg-[rgba(214,190,130,0.08)] text-[#f1dfaf]">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-medium text-white">{title}</p>
          <p className="mt-1 text-xs leading-6 text-white/56">{text}</p>
        </div>
      </div>
    </div>
  );
}

export function DirectionCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <p className="text-lg font-medium text-white">{title}</p>
      <p className="mt-2 text-sm leading-7 text-white/58">{text}</p>
    </div>
  );
}
