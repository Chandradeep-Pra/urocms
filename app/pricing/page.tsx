import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  Brain,
  FileQuestion,
  Gift,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PricingCategoryAccordion } from "@/components/pricing/PricingCategoryAccordion";
import { adminDb } from "@/lib/firebaseAdmin";
import { absoluteUrl, siteConfig } from "@/lib/site";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "View Urologics pricing for FRCS Urology preparation, including course access, mocks, quizzes, and AI viva preparation plans.",
  alternates: {
    canonical: "/pricing",
  },
  openGraph: {
    title: "Urologics Pricing",
    description:
      "Compare Urologics pricing plans for FRCS Urology preparation, course access, mocks, quizzes, and AI viva support.",
    url: absoluteUrl("/pricing"),
    images: [
      {
        url: absoluteUrl(siteConfig.defaultOgImage),
        width: 500,
        height: 500,
        alt: "Urologics pricing",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Urologics Pricing",
    description:
      "Compare Urologics pricing plans for FRCS Urology preparation, course access, mocks, quizzes, and AI viva support.",
    images: [absoluteUrl(siteConfig.defaultOgImage)],
  },
};

type PricingPlanCard = {
  id: string;
  name: string;
  category?: string;
  tag?: string;
  versions: Array<{
    id: string;
    months: number;
    price: number;
    originalPrice?: number;
    discountedPrice?: number;
    embeddedLink?: string;
    couponCode?: string;
    billingLabel?: string;
    durationLabel?: string;
  }>;
  price: number;
  originalPrice?: number;
  discountedPrice?: number;
  embeddedLink?: string;
  couponCode?: string;
  subtitle: string;
  featureBullets: string[];
  billingLabel?: string;
  availabilityNote?: string;
  vivaMinutes?: number;
  items: Array<{
    key: "chapters" | "videos" | "quizzes" | "mocks" | "vivaCases";
    label: string;
    count: number;
    details: string[];
  }>;
  courseItems: Array<{
    id: string;
    title: string;
    accessTier: "free" | "paid";
    showOnApp: boolean;
    sectionsCount: number;
  }>;
  expiryMonths: number;
  durationLabel?: string;
  sortOrder?: number;
  isActive: boolean;
};

const featureMeta = {
  chapters: { label: "Chapter", plural: "Chapters", icon: BookOpen },
  videos: { label: "Video", plural: "Videos", icon: Video },
  quizzes: { label: "Quiz", plural: "Quizzes", icon: FileQuestion },
  mocks: { label: "Mock", plural: "Mocks", icon: BadgeCheck },
  vivaCases: { label: "AI Viva Set", plural: "AI Viva Sets", icon: Brain },
} as const;

const selectionKeyMap: Record<keyof typeof featureMeta, string> = {
  chapters: "chapterIds",
  videos: "videoIds",
  quizzes: "quizIds",
  mocks: "mockIds",
  vivaCases: "vivaCaseIds",
};

function groupPlansByCategory(plans: PricingPlanCard[]) {
  const grouped = new Map<string, PricingPlanCard[]>();

  for (const plan of plans) {
    const category = plan.category || "Programs";
    const existing = grouped.get(category) || [];
    existing.push(plan);
    grouped.set(category, existing);
  }

  return Array.from(grouped.entries()).map(([category, items]) => ({
    category,
    plans: items,
  }));
}

async function getPricingPlans(): Promise<PricingPlanCard[]> {
  try {
    const [snapshot, coursesSnap, chaptersSnap, videosSnap, quizzesSnap, mocksSnap, vivaSnap] =
      await Promise.all([
        adminDb.collection("pricingPlans").get(),
        adminDb.collection("courses").get(),
        adminDb.collection("chapters").where("isActive", "==", true).get(),
        adminDb.collection("videoItems").get(),
        adminDb.collection("quizzes").where("isActive", "==", true).get(),
        adminDb.collection("mocks").get(),
        adminDb.collection("vivaCases").where("isActive", "==", true).get(),
      ]);

    const titleMap = {
      courses: Object.fromEntries(
        coursesSnap.docs.map((doc) => [
          doc.id,
          {
            id: doc.id,
            title: String(doc.data().title ?? "Untitled Course"),
            accessTier: doc.data().accessTier === "paid" ? "paid" : "free",
            showOnApp: Boolean(doc.data().showOnApp),
            sectionsCount: Array.isArray(doc.data().sections)
              ? doc.data().sections.length
              : 0,
          },
        ])
      ),
      chapters: Object.fromEntries(
        chaptersSnap.docs.map((doc) => [doc.id, String(doc.data().title ?? doc.id)])
      ),
      videos: Object.fromEntries(
        videosSnap.docs.map((doc) => [doc.id, String(doc.data().title ?? "Untitled Video")])
      ),
      quizzes: Object.fromEntries(
        quizzesSnap.docs.map((doc) => [doc.id, String(doc.data().title ?? doc.id)])
      ),
      mocks: Object.fromEntries(
        mocksSnap.docs.map((doc) => [doc.id, String(doc.data().title ?? "Untitled Mock")])
      ),
      vivaCases: Object.fromEntries(
        vivaSnap.docs.map((doc) => [
          doc.id,
          String(doc.data().case?.title ?? doc.data().title ?? "Untitled Viva Case"),
        ])
      ),
    };

    const plans = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        const selectedContent = data.selectedContent ?? {};
        const accessScopes = data.accessScopes ?? {};
        const courseItems = (Array.isArray(accessScopes?.courseIds)
          ? accessScopes.courseIds
          : []
        )
          .map((id: string) => titleMap.courses[id])
          .filter(Boolean);

        const items = (Object.keys(featureMeta) as Array<keyof typeof featureMeta>)
          .map((key) => {
            const selectionKey = selectionKeyMap[key];
            const ids = Array.isArray(selectedContent?.[selectionKey])
              ? selectedContent[selectionKey]
              : Array.isArray(selectedContent?.[key])
                ? selectedContent[key]
                : [];
            const details = ids.map((id: string) => titleMap[key][id]).filter(Boolean);

            if (details.length === 0) {
              return null;
            }

            return {
              key,
              label: details.length === 1 ? featureMeta[key].label : featureMeta[key].plural,
              count: details.length,
              details,
            };
          })
          .filter(Boolean) as PricingPlanCard["items"];

        const versions = Array.isArray(data.versions)
          ? data.versions
              .map((version: any, index: number) => ({
                id: String(version?.id ?? `version-${index + 1}`),
                months: Number(version?.months ?? 0),
                price: Number(version?.price ?? version?.originalPrice ?? 0),
                originalPrice: Number(
                  version?.originalPrice ?? version?.price ?? data.originalPrice ?? data.price ?? 0
                ),
                discountedPrice: Number(
                  version?.discountedPrice ?? version?.price ?? data.discountedPrice ?? data.price ?? 0
                ),
                embeddedLink: String(version?.embeddedLink ?? "").trim(),
                couponCode: String(version?.couponCode ?? "").trim(),
                billingLabel: String(version?.billingLabel ?? "").trim(),
                durationLabel: String(version?.durationLabel ?? "").trim(),
              }))
              .filter((version: any) => Number.isFinite(version.months) && version.months > 0)
          : [];

        return {
          id: doc.id,
          name: String(data.name ?? "Untitled Plan"),
          category: String(data.category ?? "").trim(),
          tag: String(data.tag ?? "").trim(),
          versions:
            versions.length > 0
              ? versions
              : [
                  {
                    id: "legacy-default",
                    months: Number(data.expiryMonths ?? 1),
                    price: Number(data.price ?? 0),
                    originalPrice: Number(data.originalPrice ?? data.price ?? 0),
                    discountedPrice: Number(data.discountedPrice ?? data.price ?? 0),
                    embeddedLink: String(data.embeddedLink ?? "").trim(),
                    couponCode: String(data.couponCode ?? "").trim(),
                    billingLabel: String(data.billingLabel ?? "").trim(),
                    durationLabel: String(data.durationLabel ?? "").trim(),
                  },
                ],
          price: Number(data.price ?? 0),
          originalPrice: Number(data.originalPrice ?? data.price ?? 0),
          discountedPrice: Number(data.discountedPrice ?? data.price ?? 0),
          embeddedLink: String(data.embeddedLink ?? "").trim(),
          couponCode: String(data.couponCode ?? "").trim(),
          subtitle: String(data.description ?? "").trim(),
          featureBullets: Array.isArray(data.featureBullets) ? data.featureBullets : [],
          billingLabel: String(data.billingLabel ?? "").trim(),
          availabilityNote: String(data.availabilityNote ?? "").trim(),
          vivaMinutes: Number(data.vivaMinutes ?? 0),
          courseItems,
          items,
          expiryMonths: Number(data.expiryMonths ?? 1),
          durationLabel: String(data.durationLabel ?? "").trim(),
          sortOrder: Number(data.sortOrder ?? 0),
          isActive: data.isActive !== false,
        };
      })
      .sort((a, b) => {
        const orderDelta = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
        if (orderDelta !== 0) return orderDelta;
        return a.price - b.price;
      });

    if (plans.length > 0) {
      return plans;
    }
  } catch (error) {
    console.error("Pricing page plans fetch error:", error);
  }

  return [];
}

export default async function PricingPage() {
  const plans = await getPricingPlans();
  const groupedPlans = groupPlansByCategory(plans);
  const offerCatalogSchema = {
    "@context": "https://schema.org",
    "@type": "OfferCatalog",
    name: "Urologics Pricing Plans",
    url: absoluteUrl("/pricing"),
    itemListElement: plans.map((plan, index) => ({
      "@type": "OfferCatalog",
      position: index + 1,
      name: plan.name,
      category: plan.category || "Programs",
      itemListElement: plan.versions.map((version, versionIndex) => ({
        "@type": "Offer",
        position: versionIndex + 1,
        name: `${plan.name} - ${version.months} Months`,
        description: plan.subtitle || "Urologics learning access plan",
        priceCurrency: "GBP",
        price: String(version.discountedPrice ?? version.price ?? 0),
        url: version.embeddedLink || plan.embeddedLink || absoluteUrl("/pricing"),
      })),
    })),
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-cyan-50 px-6 py-10 text-[#071014]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(offerCatalogSchema),
        }}
      />
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 flex items-start justify-between gap-6">
          <div className="max-w-4xl">
            <Link
              href="/"
              className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-[#0f7896] transition hover:text-[#0b5f77]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>

            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#0f7896]">
              Pricing
            </p>

            <h1 className="mt-4 text-5xl font-semibold tracking-[-0.05em] text-[#071014] sm:text-6xl">
              Simple plans for serious FRCS preparation.
            </h1>
          </div>

        </div>

        {plans.length === 0 ? (
          <div className="rounded-[32px] border border-[#0f7896]/12 bg-white p-10 shadow-[0_18px_50px_rgba(15,120,150,0.08)]">
            <p className="text-lg font-semibold text-[#071014]">No pricing plans published yet.</p>
           
          </div>
        ) : (
          <PricingCategoryAccordion groupedPlans={groupedPlans} />
        )}
      </div>
    </main>
  );
}

function TopStat({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[24px] border border-[#0f7896]/12 bg-white p-5 shadow-[0_14px_36px_rgba(15,120,150,0.08)]">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#0f7896]/10 text-[#0f7896]">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-lg font-semibold tracking-[-0.03em] text-[#071014]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[#071014]/62">{text}</p>
    </div>
  );
}
