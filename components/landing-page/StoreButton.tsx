import Image from "next/image";

export function StoreButton({
  href,
  icon,
  eyebrow,
  label,
  className = "",
}: {
  href: string;
  icon: string;
  eyebrow: string;
  label: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={`flex items-center justify-center gap-2.5 rounded-2xl bg-black px-3 py-3 text-white shadow-[0_14px_32px_rgba(0,0,0,0.16)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#111] sm:min-w-[180px] sm:justify-start sm:gap-3 sm:px-4 ${className}`}
    >
      <Image
        src={icon}
        alt=""
        width={26}
        height={26}
        className="h-6 w-6 object-contain sm:h-7 sm:w-7"
      />

      <span className="leading-none">
        <span className="block text-[9px] font-medium uppercase tracking-[0.06em] text-white/70 sm:text-[10px]">
          {eyebrow}
        </span>
        <span className="mt-1 block text-sm font-semibold tracking-[-0.03em] sm:text-lg">
          {label}
        </span>
      </span>
    </a>
  );
}