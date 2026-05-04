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
    title: string;
    textPoints?: string[];
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
    title: "FRCS Urology Section 1",
    textPoints: ["Chapter Wise Test","Grand Mock Test","Live Lectures","Recorded Lectures","Practice With Mentor"],
  },
  {
    title: "FRCS Section 2",
    textPoints: ["Chapter Wise Test","Grand Mock Test","Live Lectures","Recorded Lectures","Practice With Mentor"],
  },
  {
    title: "FEBU Section 1",
    textPoints: ["Chapter Wise Test","Grand Mock Test","Live Lectures","Recorded Lectures","Practice With Mentor"],
  },
  {
    title: "FEBU Section 2",
    textPoints: ["Chapter Wise Test","Grand Mock Test","Live Lectures","Recorded Lectures","Practice With Mentor"],
  },
  {
    title: "Viva in Dreams",
    textPoints: ["One to one Single day grand mock exam","Simulate Real Exam consitions"],
  },
  {
    title: "Urologics AI",
    textPoints:["AI UROLOGY MENTOR","Experiment different examiners temperament","Choose your examiner from the credits","More thank 100+ AI Viva Scenarios","Personalised feedback scoreing after each viva","Monitor your progress during FRCS preparation"],
  },
  {
    title: "Practice with Mentor",
    textPoints: ["Live online one to one teaching","Flexible class schedules","Customisation as per the candidate's requirement"],
  },
  {
    title: "Urologics Resident Teaching",
    textPoints: ["Campbell based Online videos","Monthly Master Classes","Recent Advances update","EAU Guidelines update"],
   
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
