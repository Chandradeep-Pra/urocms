import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link";

export default function Page() {
  return (
    <main className="min-h-screen bg-[#0a0f0d] text-white">

      {/* NAVBAR */}
      <header className="flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-extrabold tracking-tight text-emerald-400">
          Urologics
        </h1>

       <Link href="/login">
  <Button
    variant="outline"
    className="border-emerald-700 text-emerald-300 hover:bg-emerald-900/40"
  >
    Admin Login
  </Button>
</Link>
      </header>

      {/* HERO */}
      <section className="px-6 pt-28 pb-36 max-w-7xl mx-auto grid md:grid-cols-2 gap-20 items-center">
        <div className="space-y-7">
          <Badge className="bg-emerald-900/50 text-emerald-300 border border-emerald-700 rounded-full px-4 py-1">
            FRCS Urology Preparation App
          </Badge>

          <h2 className="text-4xl md:text-5xl font-extrabold leading-tight">
            FRCS Urology <br />
            <span className="text-emerald-400">Done Properly.</span>
          </h2>

          <p className="text-lg text-slate-300 max-w-xl leading-relaxed">
            Urologics is a premium mobile learning platform built for serious
            FRCS Urology aspirants. Practice with exam-grade mock tests,
            AI-powered viva simulations, high-yield video content, and
            full-length grand mocks — guided by{" "}
            <strong className="text-white">Dr. Ankit Goel</strong>, Gold
            Medalist.
          </p>

          <div className="flex gap-4 pt-2">
            <Button
              size="lg"
              className="bg-emerald-500 hover:bg-emerald-400 text-black rounded-2xl shadow-xl shadow-emerald-500/30"
            >
              Get Early Access
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-2xl border-slate-600 text-slate-200"
            >
              Download App
            </Button>
          </div>
        </div>

        {/* DOCTOR CARD */}
        <div className="relative">
          <div className="h-[440px] rounded-3xl bg-[#111816] border border-emerald-900/50 shadow-2xl shadow-emerald-500/20 flex items-center justify-center text-slate-500">
            Doctor Photo Placeholder
          </div>
          <p className="mt-4 text-center text-sm text-slate-400">
            <strong className="text-white">Dr. Ankit Goel</strong> — Gold Medalist
          </p>
        </div>
      </section>

      {/* FEATURES */}
      <section className="px-6 py-32 bg-[#0d1412]">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-20 items-center">

          {/* VISUAL BLOCK */}
          <div className="h-[360px] rounded-3xl bg-[#111816] border border-emerald-900/40 shadow-xl shadow-emerald-500/10 flex items-center justify-center text-emerald-400">
            App / Lottie Placeholder
          </div>

          <div className="space-y-12">
            <Feature
              title="Exam-Grade Mock Tests"
              desc="FRCS-pattern mock exams designed to test recall, reasoning, and time management — not just theory."
            />
            <Feature
              title="AI-Powered Viva Simulation"
              desc="Adaptive viva questions with intelligent follow-ups that replicate real examiner behaviour."
            />
            <Feature
              title="High-Yield Video Content"
              desc="Focused urology concepts explained strictly from an exam-point-of-view."
            />
            <Feature
              title="Grand Mock Exams"
              desc="Full-length simulations to assess readiness and reduce exam-day anxiety."
            />
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="px-6 py-36 max-w-6xl mx-auto text-center">
        <h3 className="text-4xl font-extrabold mb-4">
          Premium, Not Noisy
        </h3>
        <p className="text-slate-400 mb-16">
          Built for aspirants who take the exam seriously.
        </p>

        <div className="grid md:grid-cols-3 gap-10">
          <PricingCard
            title="Free"
            price="₹0"
            features={[
              "Limited mock access",
              "Sample content",
              "Basic insights",
            ]}
          />
          <PricingCard
            highlight
            title="Premium"
            price="₹4,999"
            features={[
              "All mock & grand exams",
              "Complete video library",
              "AI viva simulations",
              "Advanced analytics",
            ]}
          />
          <PricingCard
            title="Ultimate"
            price="₹7,999"
            features={[
              "Everything in Premium",
              "Priority updates",
              "Early module access",
            ]}
          />
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-emerald-900/40 py-12 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} Urologics · Built by{" "}
        <a
          href="https://www.linkedin.com/company/tic-tech-toe"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-white"
        >
          Tic Tech Toe
        </a>
      </footer>
    </main>
  )
}

/* ---------- Components ---------- */

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div>
      <h4 className="text-xl font-semibold text-white mb-3">
        {title}
      </h4>
      <p className="text-slate-400 leading-relaxed">{desc}</p>
    </div>
  )
}

function PricingCard({
  title,
  price,
  features,
  highlight = false,
}: {
  title: string
  price: string
  features: string[]
  highlight?: boolean
}) {
  return (
    <Card
      className={`rounded-3xl border ${
        highlight
          ? "border-emerald-500 shadow-2xl shadow-emerald-500/30"
          : "border-emerald-900/40"
      } bg-[#111816]`}
    >
      <CardContent className="pt-10 pb-12 space-y-7">
        {highlight && (
          <Badge className="bg-emerald-500 text-black rounded-full px-4 py-1">
            Most Popular
          </Badge>
        )}
        <h4 className="text-2xl font-bold">{title}</h4>
        <p className="text-4xl font-extrabold text-emerald-400">{price}</p>
        <ul className="space-y-2 text-slate-400 text-sm">
          {features.map((f) => (
            <li key={f}>• {f}</li>
          ))}
        </ul>
        <Button className="w-full mt-4 bg-emerald-500 hover:bg-emerald-400 text-black rounded-2xl shadow-lg shadow-emerald-500/30">
          Choose Plan
        </Button>
      </CardContent>
    </Card>
  )
}
