// app/api/viva-cases/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server/adminAccess";
import { requireAppUser } from "@/lib/server/appSession";
import {
  createVivaCase,
  listVivaCases,
  listVivaCasesForCourseIds,
} from "@/lib/server/vivaService";
import { publishNotification } from "@/lib/server/notificationService";

/* ───────── GET ALL CASES ───────── */
export async function GET(req: NextRequest) {
  const admin = await requireAdminSession(req);
  if (!admin.response) {
    try {
      return NextResponse.json({ cases: await listVivaCases() });
    } catch (err) {
      console.error(err);
      return NextResponse.json(
        { error: "Failed to fetch cases" },
        { status: 500 }
      );
    }
  }

  const appAuth = await requireAppUser(req);
  if ("response" in appAuth) return appAuth.response;

  try {
    const allCases = await listVivaCases();
    const courseCases = await listVivaCasesForCourseIds(appAuth.user.activeCourseIds);
    const courseCaseIds = new Set(courseCases.map((item: any) => item?.id).filter(Boolean));
    const paidUnlocked = appAuth.user.tier === "paid";
    const cases = allCases.map((item: any) => {
      const isPublic = item?.accessType === "public";
      const courseGranted = courseCaseIds.has(item.id);
      const allowed = isPublic || paidUnlocked || courseGranted;

      return {
        ...item,
        accessType: isPublic ? "public" : "restricted",
        access: {
          tier: appAuth.user.tier,
          allowed,
          mode: allowed ? (isPublic ? "public" : "full") : "locked",
          requiredTier: isPublic ? null : "paid",
          reason: allowed
            ? null
            : "AI viva is available only for paid users unless a course grants access.",
          courseGranted,
          isPublic,
        },
      };
    });

    return NextResponse.json({
      cases,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch cases" },
      { status: 500 }
    );
  }
}

/* ───────── CREATE CASE ───────── */
export async function POST(req: NextRequest) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const result = await createVivaCase(await req.json());
    await publishNotification({
      kind: "ai-viva",
      title: "New AI Viva Case Posted",
      body: result.title || "A new AI viva case is now available.",
      sourceId: result.id,
      sourceType: "vivaCase",
      deepLink: `/ai-viva/${result.id}`,
      audience: "all",
    });
    return NextResponse.json({
      success: true,
      id: result.id,
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create case";
    console.error(err);
    return NextResponse.json(
      { error: message },
      { status: message === "Title & stem required" ? 400 : 500 }
    );
  }
} 
