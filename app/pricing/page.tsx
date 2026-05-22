import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  Brain,
  CheckCircle2,
  Clock3,
  FileQuestion,
  Gift,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminDb } from "@/lib/firebaseAdmin";
import { absoluteUrl, siteConfig } from "@/lib/site";

export const dynamic = "force-dynamic";

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
};

type PricingCoupon = {
  id: string;
  code: string;
  description?: string;
  discountType: "percent" | "amount";
  discountValue: number;
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

function formatGbp(price: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(price);
}

function pluralize(value: number, singular: string, plural = `${singular}s`) {
  return `${value} ${value === 1 ? singular : plural}`;
}

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
        adminDb.collection("pricingPlans").where("isActive", "==", true).get(),
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

        return {
          id: doc.id,
          name: String(data.name ?? "Untitled Plan"),
          category: String(data.category ?? "").trim(),
          tag: String(data.tag ?? "").trim(),
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

async function getActiveCoupons(): Promise<PricingCoupon[]> {
  try {
    const snapshot = await adminDb.collection("pricingCoupons").where("isActive", "==", true).get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<PricingCoupon, "id">),
    }));
  } catch (error) {
    console.error("Pricing page coupons fetch error:", error);
    return [];
  }
}

export default async function PricingPage() {
  const [plans, coupons] = await Promise.all([getPricingPlans(), getActiveCoupons()]);
  const groupedPlans = groupPlansByCategory(plans);
  const offerCatalogSchema = {
    "@context": "https://schema.org",
    "@type": "OfferCatalog",
    name: "Urologics Pricing Plans",
    url: absoluteUrl("/pricing"),
    itemListElement: plans.map((plan, index) => ({
      "@type": "Offer",
      position: index + 1,
      name: plan.name,
      description: plan.subtitle || "Urologics learning access plan",
      priceCurrency: "GBP",
      price: String(plan.discountedPrice ?? plan.price ?? 0),
      url: plan.embeddedLink || absoluteUrl("/pricing"),
      category: plan.category || "Programs",
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

            {/* <p className="mt-5 max-w-3xl text-lg leading-8 text-[#071014]/65">
              Choose structured access to Urologics courses, tests, analytics, and AI viva preparation.
            </p> */}
          </div>

          <Button
            asChild
            className="hidden rounded-full bg-[#0f7896] px-5 text-white hover:bg-[#0b647d] md:inline-flex"
          >
            <Link href="/">Return Home</Link>
          </Button>
        </div>

        {/* Coupons  */}
        {/* {coupons.length ? (
          <div className="mb-8 grid gap-4">
            {coupons.map((coupon) => (
              <div
                key={coupon.id}
                className="rounded-[28px] border border-[#0f7896]/12 bg-white p-5 shadow-[0_14px_36px_rgba(15,120,150,0.08)]"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0f7896]/10 text-[#0f7896]">
                      <Gift className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0f7896]">
                        Coupon Live
                      </p>
                      <p className="mt-1 text-lg font-semibold text-[#071014]">{coupon.code}</p>
                      <p className="mt-1 text-sm text-[#071014]/62">
                        {coupon.description ||
                          (coupon.discountType === "percent"
                            ? `${coupon.discountValue}% off selected enrolments.`
                            : `£${coupon.discountValue} off selected enrolments.`)}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-full bg-[#0f7896] px-4 py-2 text-sm font-semibold text-white">
                    {coupon.discountType === "percent"
                      ? `${coupon.discountValue}% OFF`
                      : `£${coupon.discountValue} OFF`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null} */}

        {/* <div className="mb-12 grid gap-4 md:grid-cols-3">
          <TopStat icon={Video} title="Video + quiz" text="Structured learning, not scattered revision." />
          <TopStat icon={BadgeCheck} title="Mocks + analytics" text="Track what is improving clearly." />
          <TopStat icon={Brain} title="AI viva system" text="Practice closer to the real exam room." />
        </div> */}

        {plans.length === 0 ? (
          <div className="rounded-[32px] border border-[#0f7896]/12 bg-white p-10 shadow-[0_18px_50px_rgba(15,120,150,0.08)]">
            <p className="text-lg font-semibold text-[#071014]">No pricing plans published yet.</p>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#071014]/65">
              Plans created and marked active in Plan Creator will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {groupedPlans.map((group) => (
              <section key={group.category} className="space-y-5">
                <div className="flex items-end justify-between gap-4 border-b border-[#0f7896]/10 pb-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0f7896]">
                      Category
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#071014]">
                      {group.category}
                    </h2>
                  </div>
                  <p className="text-sm text-[#071014]/55">
                    {group.plans.length} plan{group.plans.length > 1 ? "s" : ""}
                  </p>
                </div>

                <div className="grid gap-5 lg:grid-cols-3">
                  {group.plans.map((plan) => (
                    <article
                      key={plan.id}
                      className="flex h-full flex-col rounded-[28px] border border-[#0f7896]/12 bg-white p-6 shadow-[0_14px_36px_rgba(15,120,150,0.08)]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-2xl font-semibold tracking-[-0.04em] text-[#071014]">
                            {plan.name}
                          </h3>
                          {plan.tag ? (
                            <span className="mt-3 inline-flex rounded-full bg-[#0f7896]/10 px-3 py-1 text-xs font-semibold text-[#0f7896]">
                              {plan.tag}
                            </span>
                          ) : null}
                        </div>
                        {plan.availabilityNote ? (
                          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                            {plan.availabilityNote}
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-4 text-sm leading-7 text-[#071014]/62">
                        {plan.subtitle || "Custom access plan built from selected Urologics content."}
                      </p>

                      <div className="mt-6 flex-1 space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0f7896]">
                          Access Included
                        </p>

                        {plan.featureBullets.map((feature) => (
                          <AccessLine key={`${plan.id}-${feature}`} text={feature} />
                        ))}

                        {plan.courseItems.map((course) => (
                          <AccessLine
                            key={`${plan.id}-${course.id}`}
                            text={course.title}
                            meta={`${course.sectionsCount} sections • ${course.accessTier === "paid" ? "Paid course" : "Free course"}`}
                          />
                        ))}

                        {plan.featureBullets.length === 0 && plan.courseItems.length === 0
                          ? plan.items.map((item) => (
                              <AccessLine
                                key={`${plan.id}-${item.key}`}
                                text={`${item.count} ${item.label}`}
                                meta={
                                  item.details.length > 0
                                    ? `${item.details.slice(0, 3).join(", ")}${
                                        item.details.length > 3 ? ` +${item.details.length - 3} more` : ""
                                      }`
                                    : undefined
                                }
                              />
                            ))
                          : null}

                        {plan.featureBullets.length === 0 &&
                        plan.courseItems.length === 0 &&
                        plan.items.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-[#0f7896]/12 bg-cyan-50 px-4 py-3 text-sm text-[#071014]/55">
                            Custom access bundle
                          </div>
                        ) : null}

                        <div className="rounded-2xl bg-cyan-50 px-4 py-3 text-sm text-[#071014]/62">
                          <div className="flex items-center gap-2 font-medium text-[#0f7896]">
                            <Clock3 className="h-4 w-4" />
                            <span>
                              {plan.durationLabel
                                ? plan.durationLabel
                                : `Valid for ${pluralize(plan.expiryMonths, "month")}`}
                            </span>
                          </div>
                          {plan.billingLabel ? <p className="mt-2">{plan.billingLabel}</p> : null}
                          {plan.vivaMinutes ? (
                            <p className="mt-2">Includes {plan.vivaMinutes} AI viva minutes</p>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-8 border-t border-[#0f7896]/10 pt-5">
                        {typeof plan.originalPrice === "number" &&
                        typeof plan.discountedPrice === "number" &&
                        plan.discountedPrice < plan.originalPrice ? (
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-[#071014]/45 line-through">
                              {formatGbp(plan.originalPrice)}
                            </p>
                            <p className="text-3xl font-semibold tracking-[-0.04em] text-[#071014]">
                              {formatGbp(plan.discountedPrice)}
                            </p>
                          </div>
                        ) : (
                          <p className="text-3xl font-semibold tracking-[-0.04em] text-[#071014]">
                            {formatGbp(plan.discountedPrice ?? plan.price)}
                          </p>
                        )}
                        {plan.couponCode ? (
                          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                            Coupon applied: {plan.couponCode}
                          </p>
                        ) : null}
                        <Button
                          asChild={Boolean(plan.embeddedLink)}
                          className="mt-4 w-full rounded-full bg-[#0f7896] text-white hover:bg-[#0b647d]"
                        >
                          {plan.embeddedLink ? (
                            <a href={plan.embeddedLink} target="_blank" rel="noreferrer">
                              Register Now
                            </a>
                          ) : (
                            <span>Register Now</span>
                          )}
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
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

function AccessLine({ text, meta }: { text: string; meta?: string }) {
  return (
    <div className="rounded-2xl border border-[#0f7896]/10 bg-cyan-50 px-4 py-3">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#0f7896]" />
        <div>
          <p className="text-sm font-semibold text-[#071014]">{text}</p>
          {meta ? <p className="mt-1 text-xs leading-6 text-[#071014]/55">{meta}</p> : null}
        </div>
      </div>
    </div>
  );
}
