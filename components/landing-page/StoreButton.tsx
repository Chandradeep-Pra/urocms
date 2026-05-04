import Image from "next/image";

export function StoreButton({
  href,
  icon,
  eyebrow,
  label,
}: {
  href: string;
  icon: string;
  eyebrow: string;
  label: string;
}) {
  return (
    <a
      href={href}
      className="flex min-w-[180px] items-center gap-3 rounded-2xl bg-black px-4 py-3 text-white shadow-[0_14px_32px_rgba(0,0,0,0.16)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#111]"
    >
      <Image
        src={icon}
        alt=""
        width={28}
        height={28}
        className="h-7 w-7 object-contain"
      />

      <span className="leading-none">
        <span className="block text-[10px] font-medium uppercase tracking-[0.08em] text-white/70">
          {eyebrow}
        </span>
        <span className="mt-1 block text-lg font-semibold tracking-[-0.03em]">
          {label}
        </span>
      </span>
    </a>
  );
}