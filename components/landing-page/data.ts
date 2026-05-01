import {
  BarChart3,
  Brain,
  Crown,
  Layers3,
  Trophy,
  Video,
  type LucideIcon,
} from "lucide-react";

export type LandingFeature = {
  icon: LucideIcon;
  title: string;
  text: string;
  tone: string;
  span: string;
  points: string[];
};

export const topics = [
  "Stone disease",
  "Oncology",
  "Pediatrics",
  "Andrology",
  "Functional urology",
  "Trauma",
  "Haematuria",
  "LUTS",
  "Uro-radiology",
  "Emergencies",
];

export const features: LandingFeature[] = [
  {
    icon: Video,
    title: "Video courses",
    text: "Exam-relevant lectures and focused revision blocks designed for deliberate FRCS preparation.",
    tone: "from-[#e7d39f1a] via-[#a9823324] to-transparent",
    span: "xl:col-span-2",
    points: ["Structured learning tracks", "Private premium content", "Built for serious revision"],
  },
  {
    icon: Layers3,
    title: "Chapter wise quizzes",
    text: "Turn each topic into measurable progress with targeted question practice and clearer recall loops.",
    tone: "from-[#b8c7ef14] via-[#6f8dcf18] to-transparent",
    span: "xl:col-span-1",
    points: ["Topic-by-topic revision", "Repeatable performance checks", "Immediate feedback structure"],
  },
  {
    icon: Trophy,
    title: "Weekly mock tests",
    text: "Create a disciplined study rhythm and benchmark yourself against a more realistic exam cadence.",
    tone: "from-[#e7d39f17] via-[#83632f1f] to-transparent",
    span: "xl:col-span-1",
    points: ["Scheduled assessment cycles", "Leaderboard-ready scoring", "Progress history"],
  },
  {
    icon: Crown,
    title: "Grand mocks",
    text: "Full-length pressure simulations to rehearse timing, answer quality, and clinical discipline.",
    tone: "from-[#d8bc6b18] via-[#8b692d22] to-transparent",
    span: "xl:col-span-1",
    points: ["Full exam simulation", "Higher-pressure rehearsal", "Admin-managed scoring"],
  },
  {
    icon: BarChart3,
    title: "Progress intelligence",
    text: "Track what has been consumed, what is improving, and where the candidate still needs focused work.",
    tone: "from-[#a9bde91a] via-[#4f699d1f] to-transparent",
    span: "xl:col-span-1",
    points: ["Consumption analytics", "Attempt history", "Clear next-step signals"],
  },
  {
    icon: Brain,
    title: "AI viva system",
    text: "The signature differentiator: an advanced viva experience designed to feel close to the pressure of the real room.",
    tone: "from-[#f3e0ae22] via-[#a1782f24] to-transparent",
    span: "xl:col-span-2",
    points: ["Calm and rapid modes", "Exam-style questioning", "High perceived value"],
  },
];

export const valuePoints = [
  {
    title: "Preparation as a system",
    text: "Candidates do not jump between random tools. Learning, testing, progress, and viva practice sit inside one coherent environment.",
  },
  {
    title: "Clinical seriousness",
    text: "The product should feel academically grounded, not generic edtech. That tone creates trust before the first session begins.",
  },
  {
    title: "High-value differentiation",
    text: "The AI viva experience is not decorative. It is the feature that makes the product feel advanced and worth paying attention to.",
  },
];

export const marqueeItems = [...topics, ...topics];
