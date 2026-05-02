import Image from "next/image";
import { DirectionCard } from "@/components/landing-page/primitives";
import { panelClass } from "@/components/landing-page/theme";

export function MentorSection() {
  return (
    <section id="mentor" className="px-6 py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div className={`${panelClass} p-5`}>
          <div className="relative overflow-hidden rounded-[28px] border border-[rgba(214,190,130,0.14)] bg-[linear-gradient(180deg,#0a1f3a,#06111f)] p-6">
            <div className="relative min-h-[420px] overflow-hidden rounded-[24px] border border-[rgba(214,190,130,0.16)] bg-[#09111d]">
              <Image
                src="/my-mentor-2.jpeg"
                alt="Dr. Ankit Goel"
                fill
                className="object-cover object-center"
                sizes="(max-width: 1024px) 100vw, 40vw"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,10,20,0.04),rgba(4,10,20,0.34))]" />
              <div className="absolute inset-x-0 bottom-0 p-6">
                <div className="rounded-[20px] border border-white/10 bg-[rgba(5,10,19,0.62)] px-5 py-4 backdrop-blur-sm">
                  <p className="text-lg font-semibold text-white">Dr. Ankit Goel</p>
                  <p className="mt-1 text-sm leading-6 text-white/62">Clinical mentorship and academic direction behind the platform.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={`${panelClass} p-8`}>
          <p className="text-sm uppercase tracking-[0.24em] text-[#e7d39f]/76">Your Mentor</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white">
            Urologics launched by the Founder of FRCS Urology course<span className="text-[#e7d39f]"> Dr. Ankit Goel</span> <span className="text-sm italic tracking-1 font-normal"> ,(  Gold Medalist ).</span>
          </h2>
          {/* <p className="mt-4 text-md leading-6 text-[#d2dbef]/66">
            Specializes in Urology, Renal Transplant, and Robotic Surgery. Dr. Goel brings a wealth of expertise in Endourology, Reconstructive Urology, Andrology, Laparoscopy, and Robotic Uro-oncology. His strong academic focus on research and teaching further strengthens his commitment to advancing patient care and urological education.
          </p> */}

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <DirectionCard title="200+" text="Mentored successfully over 200 candidates worldwide." />
            <DirectionCard title="Gold Medalist" text="Learn from the " />
            <DirectionCard title="Technology with purpose" text="Analytics, AI viva, and gated content should feel like meaningful infrastructure." />
            <DirectionCard title="Better exam readiness" text="Everything points back to preparation quality, confidence, and final performance." />
          </div>
        </div>
      </div>
    </section>
  );
}
