import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import type { AppUserSession } from "@/lib/server/appSession";

export type CourseAccessTier = "free" | "members";

export type CourseMemberUser = {
  id: string;
  name: string;
  email: string;
};

export function normalizeCourseAccessTier(value: unknown): CourseAccessTier {
  return value === "members" || value === "paid" ? "members" : "free";
}

export function createCourseSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function shapeCourseDoc(
  doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot
) {
  const data = doc.data() ?? {};

  return {
    id: doc.id,
    title: String(data.title || ""),
    description: String(data.description || ""),
    slug: String(data.slug || ""),
    accessTier: normalizeCourseAccessTier(data.accessTier),
    showOnApp: Boolean(data.showOnApp),
    memberUserIds: Array.isArray(data.memberUserIds) ? data.memberUserIds : [],
    memberUsers: Array.isArray(data.memberUsers) ? data.memberUsers : [],
    sections: Array.isArray(data.sections) ? data.sections : [],
  };
}

export function parseCreateCourseInput(body: any) {
  return {
    title: String(body?.title || "").trim(),
    description: String(body?.description || "").trim(),
    accessTier: normalizeCourseAccessTier(body?.accessTier),
    showOnApp: Boolean(body?.showOnApp),
  };
}

export function parseUpdateCourseInput(body: any) {
  return {
    title: String(body?.title || "").trim(),
    description: String(body?.description || "").trim(),
    accessTier: normalizeCourseAccessTier(body?.accessTier),
    showOnApp: Boolean(body?.showOnApp),
    sections: Array.isArray(body?.sections) ? body.sections : [],
    memberUserIds: Array.isArray(body?.memberUserIds) ? body.memberUserIds : [],
  };
}

export async function listCourses() {
  const snapshot = await adminDb.collection("courses").orderBy("createdAt", "asc").get();
  return snapshot.docs.map((doc) => shapeCourseDoc(doc));
}

export async function getCourseById(id: string) {
  const doc = await adminDb.collection("courses").doc(id).get();
  if (!doc.exists) return null;
  return shapeCourseDoc(doc);
}

export async function createCourse(input: ReturnType<typeof parseCreateCourseInput>) {
  const slug = createCourseSlug(input.title);

  const docRef = await adminDb.collection("courses").add({
    title: input.title,
    description: input.description,
    slug,
    accessTier: input.accessTier,
    showOnApp: input.showOnApp,
    memberUserIds: [],
    memberUsers: [],
    sections: [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return {
    id: docRef.id,
    title: input.title,
    description: input.description,
    slug,
    accessTier: input.accessTier,
    showOnApp: input.showOnApp,
    memberUserIds: [],
    memberUsers: [],
    sections: [],
  };
}

async function resolveCourseMemberUsers(memberUserIds: string[]) {
  if (!memberUserIds.length) return [];

  const users = await Promise.all(
    memberUserIds.map(async (userId) => {
      const userDoc = await adminDb.collection("users").doc(userId).get();
      if (!userDoc.exists) return null;
      const user = userDoc.data() ?? {};

      return {
        id: userDoc.id,
        name: String(user.name || "").trim(),
        email: String(user.email || "").trim(),
      };
    })
  );

  return users.filter(Boolean) as CourseMemberUser[];
}

export async function updateCourse(
  id: string,
  input: ReturnType<typeof parseUpdateCourseInput>
) {
  const previousDoc = await adminDb.collection("courses").doc(id).get();
  if (!previousDoc.exists) {
    throw new Error("Course not found");
  }

  const previousData = previousDoc.data() ?? {};
  const previousMemberUserIds = Array.isArray(previousData.memberUserIds)
    ? previousData.memberUserIds
    : [];
  const memberUsers = await resolveCourseMemberUsers(input.memberUserIds);

  await adminDb.collection("courses").doc(id).update({
    title: input.title,
    description: input.description,
    slug: createCourseSlug(input.title),
    accessTier: input.accessTier,
    showOnApp: input.showOnApp,
    memberUserIds: input.memberUserIds,
    memberUsers,
    sections: input.sections,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const addedUserIds = input.memberUserIds.filter((userId) => !previousMemberUserIds.includes(userId));
  const removedUserIds = previousMemberUserIds.filter((userId: string) => !input.memberUserIds.includes(userId));

  await Promise.all([
    ...addedUserIds.map((userId) =>
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
}

export async function deleteCourse(id: string) {
  await adminDb.collection("courses").doc(id).delete();
}

export async function loadCourseContentCatalog() {
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
      subtitle: data.folderName ? `Folder: ${String(data.folderName)}` : "AI Viva case",
    };
  });

  return {
    videos: videoSections,
    "chapter-quizzes": chapterQuizzes,
    mocks,
    "grand-mocks": grandMocks,
    "ai-vivas": aiVivas,
  };
}

export async function loadCourseMembersCatalog() {
  const snapshot = await adminDb.collection("users").orderBy("createdAt", "desc").get();

  return snapshot.docs.map((doc) => {
    const data = doc.data() ?? {};
    return {
      id: doc.id,
      name: String(data.name || "").trim(),
      email: String(data.email || "").trim(),
      tier: data.tier === "paid" ? "paid" : data.tier === "free" ? "free" : "guest",
      activeCourseIds: Array.isArray(data.activeCourseIds) ? data.activeCourseIds : [],
    };
  });
}

export async function listAppCoursesForUser(user: AppUserSession) {
  const snapshot = await adminDb
    .collection("courses")
    .where("showOnApp", "==", true)
    .orderBy("createdAt", "asc")
    .get();

  return snapshot.docs
    .map((doc) => {
      const course = shapeCourseDoc(doc);
      const isAllowed =
        course.accessTier === "free"
          ? user.tier !== "guest"
          : user.activeCourseIds.includes(doc.id);

      return {
        id: course.id,
        title: course.title,
        description: course.description,
        slug: course.slug,
        accessTier: course.accessTier,
        showOnApp: true,
        sectionCount: course.sections.length,
        sections: course.sections,
        access: {
          allowed: isAllowed,
          required: course.accessTier === "free" ? "free-account" : "course-membership",
        },
      };
    })
    .filter((course) => course.access.allowed);
}
