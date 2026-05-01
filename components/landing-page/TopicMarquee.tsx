import { marqueeItems } from "@/components/landing-page/data";

export function TopicMarquee() {
  return (
    <section className="border-y border-white/6 bg-black/10 py-4">
      <div className="overflow-hidden whitespace-nowrap">
        <div className="animate-marquee inline-flex min-w-max gap-3 px-4">
          {marqueeItems.map((item, index) => (
            <span
              key={`${item}-${index}`}
              className="inline-flex items-center rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-xs text-[#dbe4f4]/76"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
