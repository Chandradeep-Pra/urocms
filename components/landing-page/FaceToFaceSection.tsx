"use client";

import { ExpandableCardGrid } from "@/components/landing-page/ExpandableCardGrid";
import { GraduationCap, Presentation, Users2 } from "lucide-react";

const liveCourses = [
  {
    title: "Section 1 (FRCS / FEBU) - Live Online Course",
    icon: Presentation,
    points: ["16 live online sessions", "Structured case based interactive sessions", "SBA discussion on all topics for FRCS/FEBU exam","Detailed discussion on Oxford , EAU guidelines , Scientific Basis of Urology","Mnemonics , Algorithms and Flowcharts","Evidence based solution to controversial questions","Statistics and Ethical scenarios"],
  },
  {
    title: "Section 2 (FRCS / FEBU) - Live Online Course",
    icon: GraduationCap,
    points: ["16 live online sessions ", "4 to 5 viva case practice per session ", "Viva practice for candidates in each session followed by feedback","Time management, appropriate evidence quotation and communication skills highlight","Learn the 'opening gambit' in viva","Concept based algorithms","Understanding the marking scheme"],
  },
  // {
  //   title: "Section 1 (FRCS / FEBU) Test & Discussion",
  //   icon: MessagesSquare,
  //   points: ["Test-based learning", "Discussion sessions", "Doubt solving"],
  // },
  {
    title: "Section 2 Viva in Dreams",
    icon: Users2,
    points: ["One to One Grand Mock Viva exam for Section 2 FRCS Urology ", "All 8 stations covered as actual exam", "Duration and Sequence of Mock stations individualised as a per Royal college sequence","Ideal for last minute assessment and feedback"],
  },
  {
    title: "Live One to One Session",
    icon: Presentation,
    points: ["Personalised mentoring for Section 1/ Section 2 FRCS Urology", "Flexible schedule for busy trainees / consultants", "Customisation as per candidate's requirement","Discussion of Previous Exam like scenarios","Maximum viva practice on one to one basis with feedback","Limited slots only"],
  },
  {
    title: "Urology Masterclass",
    icon: Presentation,
    points: ["Monthly Masterclass", "Recent Advances Masterclass", "EAU Guidelines Masterclass","Post Graduate Practical Exam Masterclass"],
  },
];

export function FaceToFaceSection() {
  return (
    <section className="bg-cyan-50 px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-20 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-[#071014] sm:text-6xl">
            Face to Face <span className="bg-gradient-to-r from-[#0f7896] to-[#1294ba] bg-clip-text text-transparent">Live Online Classes</span>
          </h2>
        </div>

        <ExpandableCardGrid
          items={liveCourses.map((course) => ({
            title: course.title,
            textPoints: course.points,
          }))}
        />
      </div>
    </section>
  );
}
