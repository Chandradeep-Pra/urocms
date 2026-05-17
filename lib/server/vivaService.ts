import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";

function normalizeFolderInput(input: { title?: unknown; description?: unknown }) {
  return {
    title: String(input.title || "").trim(),
    description: String(input.description || "").trim(),
  };
}

function normalizeVivaCaseFolder(input: Record<string, unknown>) {
  return {
    folderId: typeof input.folderId === "string" ? input.folderId : "",
    folderName: typeof input.folderName === "string" ? input.folderName : "",
  };
}

export async function listVivaCases() {
  const snapshot = await adminDb
    .collection("vivaCases")
    .where("isActive", "==", true)
    .orderBy("createdAt", "desc")
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

async function getAiVivaIdsForCourseIds(courseIds: string[]) {
  const uniqueCourseIds = Array.from(
    new Set(courseIds.map((courseId) => String(courseId).trim()).filter(Boolean))
  );

  if (!uniqueCourseIds.length) return [];

  const docs = await Promise.all(
    uniqueCourseIds.map((courseId) => adminDb.collection("courses").doc(courseId).get())
  );

  return Array.from(
    new Set(
      docs.flatMap((doc) => {
        const data = doc.data() ?? {};
        const sections = Array.isArray(data.sections) ? data.sections : [];

        return sections
          .filter((section) => section?.contentType === "ai-vivas")
          .flatMap((section) =>
            Array.isArray(section?.linkedContentIds) ? section.linkedContentIds : []
          )
          .map((id) => String(id).trim())
          .filter(Boolean);
      })
    )
  );
}

export async function listVivaCasesForCourseIds(courseIds: string[]) {
  const allowedIds = await getAiVivaIdsForCourseIds(courseIds);
  if (!allowedIds.length) return [];

  const cases = await Promise.all(
    allowedIds.map(async (caseId) => {
      const doc = await adminDb.collection("vivaCases").doc(caseId).get();
      if (!doc.exists) return null;

      const data = doc.data() ?? {};
      if (data.isActive === false) return null;

      return {
        id: doc.id,
        ...data,
      };
    })
  );

  return cases.filter(Boolean);
}

export async function listVivaFoldersForCourseIds(courseIds: string[]) {
  const cases = await listVivaCasesForCourseIds(courseIds);
  const folderIds = Array.from(
    new Set(
      cases
        .map((item) => {
          const vivaCase = item as { folderId?: unknown } | null;
          return String(vivaCase?.folderId || "").trim();
        })
        .filter(Boolean)
    )
  );

  if (!folderIds.length) return [];

  const folders = await Promise.all(
    folderIds.map(async (folderId) => {
      const doc = await adminDb.collection("vivaFolders").doc(folderId).get();
      if (!doc.exists) return null;

      return {
        id: doc.id,
        ...doc.data(),
      };
    })
  );

  return folders.filter(Boolean);
}

export async function canAccessVivaCaseFromCourseIds(id: string, courseIds: string[]) {
  const allowedIds = await getAiVivaIdsForCourseIds(courseIds);
  return allowedIds.includes(id);
}

export async function createVivaCase(input: Record<string, unknown>) {
  const caseData = input.case as { title?: unknown; stem?: unknown } | undefined;
  if (!caseData?.title || !caseData?.stem) {
    throw new Error("Title & stem required");
  }

  const folder = normalizeVivaCaseFolder(input);
  const docRef = await adminDb.collection("vivaCases").add({
    ...input,
    ...folder,
    attemptsCount: 0,
    isActive: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return {
    id: docRef.id,
    title: String(caseData.title).trim(),
  };
}

export async function getVivaCaseById(id: string) {
  const doc = await adminDb.collection("vivaCases").doc(id).get();
  if (!doc.exists) {
    throw new Error("Case not found");
  }

  return {
    id: doc.id,
    ...doc.data(),
  };
}

export async function updateVivaCase(id: string, input: Record<string, unknown>) {
  const folder = normalizeVivaCaseFolder(input);

  await adminDb.collection("vivaCases").doc(id).update({
    ...input,
    folderId: folder.folderId,
    folderName: folder.folderName,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { success: true };
}

export async function softDeleteVivaCase(id: string) {
  await adminDb.collection("vivaCases").doc(id).update({
    isActive: false,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { success: true };
}

export async function listVivaFolders() {
  const snapshot = await adminDb
    .collection("vivaFolders")
    .orderBy("createdAt", "asc")
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

export async function createVivaFolder(input: { title?: unknown; description?: unknown }) {
  const folder = normalizeFolderInput(input);
  if (!folder.title) {
    throw new Error("Folder title is required");
  }

  const duplicate = await adminDb
    .collection("vivaFolders")
    .where("title", "==", folder.title)
    .limit(1)
    .get();
  if (!duplicate.empty) {
    throw new Error("Folder already exists");
  }

  const docRef = await adminDb.collection("vivaFolders").add({
    title: folder.title,
    description: folder.description,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return {
    folder: {
      id: docRef.id,
      title: folder.title,
      description: folder.description,
    },
  };
}
