import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdminSession } from "@/lib/server/adminAccess";

export async function GET(req: NextRequest) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const [videoSectionsSnap, chaptersSnap, mocksSnap, vivaCasesSnap] = await Promise.all([
      adminDb.collection("videoSections").get(),
      adminDb.collection("chapters").where("isActive", "==", true).get(),
      adminDb.collection("mocks").get(),
      adminDb.collection("vivaCases").where("isActive", "==", true).get(),
    ]);

    const videoSections = videoSectionsSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: String(data.title || "Untitled Video Section"),
        subtitle: `Access: ${data.accessTier === "paid" ? "Paid" : "Free"}`,
      };
    });

    const chapterQuizzes = chaptersSnap.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: String(data.title || doc.id),
          nodeType: String(data.nodeType || "TEST"),
          parentId: data.parentId || null,
          difficulty: data.difficulty || null,
        };
      })
      .map((item) => ({
        id: item.id,
        title: item.title,
        subtitle:
          item.nodeType === "GROUP"
            ? "Full chapter group"
            : item.parentId
              ? `Quiz node inside ${item.parentId}`
              : item.difficulty
                ? `Quiz node • ${item.difficulty}`
                : "Quiz node",
      }));

    const mocks = mocksSnap.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: String(data.title || "Untitled Mock"),
          type: String(data.type || "mock"),
        };
      })
      .filter((item) => item.type === "mock")
      .map((item) => ({
        id: item.id,
        title: item.title,
        subtitle: "Mock",
      }));

    const grandMocks = mocksSnap.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: String(data.title || "Untitled Grand Mock"),
          type: String(data.type || "mock"),
        };
      })
      .filter((item) => item.type === "grand-mock")
      .map((item) => ({
        id: item.id,
        title: item.title,
        subtitle: "Grand Mock",
      }));

    const aiVivas = vivaCasesSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: String(data?.case?.title || "Untitled AI Viva"),
        subtitle: data.folderName
          ? `Folder: ${String(data.folderName)}`
          : "AI Viva case",
      };
    });

    return NextResponse.json({
      catalog: {
        videos: videoSections,
        "chapter-quizzes": chapterQuizzes,
        mocks,
        "grand-mocks": grandMocks,
        "ai-vivas": aiVivas,
      },
    });
  } catch (error) {
    console.error("Course content catalog fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch course content catalog" }, { status: 500 });
  }
}
