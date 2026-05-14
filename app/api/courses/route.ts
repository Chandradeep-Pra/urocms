import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

function normalizeCourseAccessTier(value: unknown) {
  return value === "members" ? "members" : value === "paid" ? "members" : "free";
}

export async function GET() {
  try {
    const snapshot = await adminDb.collection("courses").orderBy("createdAt", "asc").get();

    const courses = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      accessTier: normalizeCourseAccessTier(doc.data().accessTier),
      memberUserIds: Array.isArray(doc.data().memberUserIds) ? doc.data().memberUserIds : [],
      memberUsers: Array.isArray(doc.data().memberUsers) ? doc.data().memberUsers : [],
    }));

    return NextResponse.json({ courses });
  } catch (error) {
    console.error("Courses fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const title = String(body?.title || "").trim();
    const description = String(body?.description || "").trim();
    const accessTier = normalizeCourseAccessTier(body?.accessTier);
    const showOnApp = Boolean(body?.showOnApp);

    if (!title) {
      return NextResponse.json({ error: "Course title is required" }, { status: 400 });
    }

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const docRef = await adminDb.collection("courses").add({
      title,
      description,
      slug,
      accessTier,
      showOnApp,
      memberUserIds: [],
      memberUsers: [],
      sections: [],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      course: {
        id: docRef.id,
        title,
        description,
        slug,
        accessTier,
        showOnApp,
        memberUserIds: [],
        memberUsers: [],
        sections: [],
      },
    });
  } catch (error) {
    console.error("Course create error:", error);
    return NextResponse.json({ error: "Failed to create course" }, { status: 500 });
  }
}
