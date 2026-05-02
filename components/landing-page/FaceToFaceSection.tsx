import { CalendarDays, GraduationCap, MessagesSquare, Users2 } from "lucide-react";

const liveCourses = [
  { title: "Section 1 ( FRCS / FEBU ) - Live Online Course", icon: CalendarDays },
  { title: "Section 2 ( FRCS / FEBU ) - Live Online Course", icon: GraduationCap },
  { title: "Section 1 Test x Discussion", icon: MessagesSquare },
  { title: "Section 2 Viva in Dreams", icon: Users2 },
  { title: "Live One to One Session", icon: CalendarDays },
];

export function FaceToFaceSection() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
              Face to Face Live Online Classes
            </h2>
          </div>
          
        </div>

        <div className="gold-scrollbar flex gap-4 overflow-x-auto px-1 pb-4 pt-2">
          {liveCourses.map((course) => {
            const Icon = course.icon;

            return (
              <div
                key={course.title}
                className="relative min-w-[220px] shrink-0 overflow-hidden rounded-[32px] border border-[rgba(124,160,223,0.28)] bg-[linear-gradient(180deg,#112a4d,#0a1a31)] p-5 transition duration-300 hover:-translate-y-1 hover:border-[rgba(196,216,255,0.42)] sm:min-w-[250px]"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(174,200,255,0.12),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent)]" />
                <div className="absolute inset-x-5 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(196,216,255,0.78),transparent)]" />
                <div className="relative">
                  <div className="flex items-center gap-4">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl border border-[rgba(175,202,255,0.2)] bg-[rgba(175,202,255,0.08)] text-[#cfe0ff]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-semibold tracking-[-0.03em] text-[#eef4ff]">{course.title}</h3>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
