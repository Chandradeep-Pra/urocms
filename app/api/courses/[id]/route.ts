import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdminSession } from "@/lib/server/adminAccess";

function normalizeCourseAccessTier(value: unknown) {
  return value === "members" ? "members" : value === "paid" ? "members" : "free";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const { id } = await params;
    const doc = await adminDb.collection("courses").doc(id).get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    return NextResponse.json({
      course: {
        id: doc.id,
        ...doc.data(),
        accessTier: normalizeCourseAccessTier(doc.data()?.accessTier),
        memberUserIds: Array.isArray(doc.data()?.memberUserIds) ? doc.data()?.memberUserIds : [],
        memberUsers: Array.isArray(doc.data()?.memberUsers) ? doc.data()?.memberUsers : [],
      },
    });
  } catch (error) {
    console.error("Course fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch course" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const { id } = await params;
    const body = await req.json();
    const title = String(body?.title || "").trim();
    const description = String(body?.description || "").trim();
    const accessTier = normalizeCourseAccessTier(body?.accessTier);
    const showOnApp = Boolean(body?.showOnApp);
    const sections = Array.isArray(body?.sections) ? body.sections : [];
    const memberUserIds = Array.isArray(body?.memberUserIds) ? body.memberUserIds : [];
    const previousDoc = await adminDb.collection("courses").doc(id).get();
    const previousData = previousDoc.data() ?? {};
    const previousMemberUserIds = Array.isArray(previousData.memberUserIds)
      ? previousData.memberUserIds
      : [];

    const memberUsers = memberUserIds.length
      ? (
          await Promise.all(
            memberUserIds.map(async (userId: string) => {
              const userDoc = await adminDb.collection("users").doc(userId).get();
              if (!userDoc.exists) return null;
              const user = userDoc.data() ?? {};
              return {
                id: userDoc.id,
                name: String(user.name || "").trim(),
                email: String(user.email || "").trim(),
              };
            })
          )
        ).filter(Boolean)
      : [];

    if (!title) {
      return NextResponse.json({ error: "Course title is required" }, { status: 400 });
    }

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    await adminDb.collection("courses").doc(id).update({
      title,
      description,
      slug,
      accessTier,
      showOnApp,
      memberUserIds,
      memberUsers,
      sections,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const addedUserIds = memberUserIds.filter((userId: string) => !previousMemberUserIds.includes(userId));
    const removedUserIds = previousMemberUserIds.filter((userId: string) => !memberUserIds.includes(userId));

    await Promise.all([
      ...addedUserIds.map((userId: string) =>
        adminDb.collection("users").doc(userId).set(
          {
            activeCourseIds: FieldValue.arrayUnion(id),
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        )
      ),
      ...removedUserIds.map((userId: string) =>
        adminDb.collection("users").doc(userId).set(
          {
            activeCourseIds: FieldValue.arrayRemove(id),
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        )
      ),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Course update error:", error);
    return NextResponse.json({ error: "Failed to update course" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const { id } = await params;
    await adminDb.collection("courses").doc(id).delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Course delete error:", error);
    return NextResponse.json({ error: "Failed to delete course" }, { status: 500 });
  }
}
