import { FieldValue } from "firebase-admin/firestore";

type VivaCaseDocument = Record<string, unknown> & {
  folderId?: unknown;
  accessType?: unknown;
};
import { getAdminDb } from "@/lib/firebaseAdmin";

type CourseSectionLike = {
  id?: unknown;
  contentType?: unknown;
  linkedContentIds?: unknown;
};

export function withVivaModeQuestionContract<T extends Record<string, unknown>>(data: T): T {
  const modes = data.modes && typeof data.modes === "object"
    ? data.modes as Record<string, unknown>
    : {};
  const calm = modes.calmAndComposed && typeof modes.calmAndComposed === "object"
    ? modes.calmAndComposed as Record<string, unknown>
    : {};
  const fast = modes.fastAndFurious && typeof modes.fastAndFurious === "object"
    ? modes.fastAndFurious as Record<string, unknown>
    : {};
  const normalizeMode = (mode: Record<string, unknown>, fallbackEnabled: boolean) => {
    const questions = Array.isArray(mode.questions) ? mode.questions : [];
    return {
      ...mode,
      enabled: typeof mode.enabled === "boolean" ? mode.enabled : fallbackEnabled,
      questionCount:
        typeof mode.questionCount === "number" ? mode.questionCount : questions.length,
      questions,
    };
  };

  return {
    ...data,
    modes: {
      ...modes,
      calmAndComposed: normalizeMode(calm, true),
      fastAndFurious: normalizeMode(fast, false),
    },
  };
}

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

function normalizeEmailList(value: unknown) {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((email) => String(email || "").trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

function normalizeCourseAllowedUserMap(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([courseId, emails]) => [courseId, normalizeEmailList(emails)])
      .filter(([courseId]) => Boolean(courseId))
  );
}

function getManualAllowedUsers(data: Record<string, unknown>) {
  const allowedUser = normalizeEmailList(data.allowedUser);
  const courseAllowedUserMap = normalizeCourseAllowedUserMap(data.courseAllowedUserMap);
  const courseManagedEmails = new Set(Object.values(courseAllowedUserMap).flat());

  return allowedUser.filter((email) => !courseManagedEmails.has(email));
}

function buildAllowedUsersWithCourseMap(
  manualAllowedUser: string[],
  courseAllowedUserMap: Record<string, string[]>
) {
  return Array.from(
    new Set([...manualAllowedUser, ...Object.values(courseAllowedUserMap).flat()])
  );
}

function extractAiVivaIdsFromSections(sections: unknown) {
  if (!Array.isArray(sections)) return [];

  return Array.from(
    new Set(
      sections
        .filter((section) => section?.contentType === "ai-vivas")
        .flatMap((section) =>
          Array.isArray(section?.linkedContentIds) ? section.linkedContentIds : []
        )
        .map((id) => String(id || "").trim())
        .filter(Boolean)
    )
  );
}

export async function listVivaCases() {
  const snapshot = await getAdminDb()
    .collection("vivaCases")
    .where("isActive", "==", true)
    .orderBy("createdAt", "desc")
    .get();

  return snapshot.docs.map((doc) => ({
    ...withVivaModeQuestionContract(doc.data()),
    id: doc.id,
  }));
}

async function getAiVivaIdsForCourseIds(courseIds: string[]) {
  const uniqueCourseIds = Array.from(
    new Set(courseIds.map((courseId) => String(courseId).trim()).filter(Boolean))
  );

  if (!uniqueCourseIds.length) return [];

  const docs = await Promise.all(
    uniqueCourseIds.map((courseId) => getAdminDb().collection("courses").doc(courseId).get())
  );

  return Array.from(
    new Set(
      docs.flatMap((doc) => extractAiVivaIdsFromSections((doc.data() ?? {}).sections))
    )
  );
}

export async function listVivaCasesForCourseIds(courseIds: string[]) {
  const allowedIds = await getAiVivaIdsForCourseIds(courseIds);
  if (!allowedIds.length) return [];

  const cases = await Promise.all(
    allowedIds.map(async (caseId) => {
      const doc = await getAdminDb().collection("vivaCases").doc(caseId).get();
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
      const doc = await getAdminDb().collection("vivaFolders").doc(folderId).get();
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
  const accessType = input.accessType === "public" ? "public" : "restricted";
  const docRef = await getAdminDb().collection("vivaCases").add({
    ...input,
    ...folder,
    accessType,
    attemptsCount: 0,
    publicParticipants: [],
    isActive: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return {
    id: docRef.id,
    title: String(caseData.title).trim(),
  };
}

export async function getVivaCaseById(id: string): Promise<VivaCaseDocument & { id: string }> {
  const doc = await getAdminDb().collection("vivaCases").doc(id).get();
  if (!doc.exists) {
    throw new Error("Case not found");
  }

  const data = doc.data() as VivaCaseDocument;
  return {
    ...withVivaModeQuestionContract(data),
    id: doc.id,
  };
}

export async function updateVivaCase(id: string, input: Record<string, unknown>) {
  const folder = normalizeVivaCaseFolder(input);
  const accessType = input.accessType === "public" ? "public" : "restricted";

  await getAdminDb().collection("vivaCases").doc(id).update({
    ...input,
    folderId: folder.folderId,
    folderName: folder.folderName,
    accessType,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { success: true };
}

export async function softDeleteVivaCase(id: string) {
  await getAdminDb().collection("vivaCases").doc(id).update({
    isActive: false,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { success: true };
}

export async function getPublicVivaCaseById(id: string) {
  const doc = await getAdminDb().collection("vivaCases").doc(id).get();
  if (!doc.exists) {
    throw new Error("Case not found");
  }

  const data = doc.data() ?? {};
  if (data.isActive === false || data.accessType !== "public") {
    throw new Error("Case not found");
  }

  return {
    ...withVivaModeQuestionContract(data),
    id: doc.id,
  };
}

export async function listVivaFolders() {
  const snapshot = await getAdminDb()
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

  const duplicate = await getAdminDb()
    .collection("vivaFolders")
    .where("title", "==", folder.title)
    .limit(1)
    .get();
  if (!duplicate.empty) {
    throw new Error("Folder already exists");
  }

  const docRef = await getAdminDb().collection("vivaFolders").add({
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

export async function deleteVivaFolder(id: string) {
  const folderId = String(id || "").trim();
  if (!folderId) {
    throw new Error("Folder id is required");
  }

  const folderRef = getAdminDb().collection("vivaFolders").doc(folderId);
  const folderDoc = await folderRef.get();
  if (!folderDoc.exists) {
    throw new Error("Folder not found");
  }

  const linkedCasesSnap = await getAdminDb()
    .collection("vivaCases")
    .where("folderId", "==", folderId)
    .get();

  const docsToUpdate = linkedCasesSnap.docs;
  const batches = [];

  for (let index = 0; index < docsToUpdate.length; index += 450) {
    const batch = getAdminDb().batch();
    docsToUpdate.slice(index, index + 450).forEach((doc) => {
      batch.update(doc.ref, {
        folderId: "",
        folderName: "",
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    batches.push(batch.commit());
  }

  await Promise.all(batches);
  await folderRef.delete();

  return {
    success: true,
    movedCount: docsToUpdate.length,
  };
}

export async function syncCourseVivaAllowedUsers(params: {
  courseId: string;
  previousSections: unknown;
  nextSections: unknown;
  fullMemberUsers: Array<{ email?: string | null }>;
  memberAccessGrants: Array<{
    userId: string;
    email?: string | null;
    sectionGrants?: Array<{
      sectionId: string;
      accessMode: "full" | "partial";
      contentIds: string[];
    }>;
  }>;
}) {
  const previousVivaIds = extractAiVivaIdsFromSections(params.previousSections);
  const nextVivaIds = extractAiVivaIdsFromSections(params.nextSections);
  const targetVivaIds = Array.from(new Set([...previousVivaIds, ...nextVivaIds]));

  if (!targetVivaIds.length) return;

  const nextSections: CourseSectionLike[] = Array.isArray(params.nextSections)
    ? params.nextSections
    : [];
  const fullMemberEmails = normalizeEmailList(
    params.fullMemberUsers.map((user) => String(user?.email || ""))
  );
  const vivaEmailMap = new Map<string, string[]>();

  nextSections.forEach((section) => {
    if (section?.contentType !== "ai-vivas") return;
    const linkedIds = Array.isArray(section?.linkedContentIds) ? section.linkedContentIds : [];
    linkedIds.forEach((vivaId: string) => {
      vivaEmailMap.set(
        String(vivaId),
        normalizeEmailList([
          ...(vivaEmailMap.get(String(vivaId)) ?? []),
          ...fullMemberEmails,
        ])
      );
    });
  });

  params.memberAccessGrants.forEach((grant) => {
    const email = String(grant?.email || "").trim().toLowerCase();
    if (!email) return;

    (grant.sectionGrants || []).forEach((sectionGrant) => {
      const section = nextSections.find(
        (item) => item?.id === sectionGrant.sectionId && item?.contentType === "ai-vivas"
      );
      if (!section) return;

      const sectionLinkedIds = Array.isArray(section?.linkedContentIds)
        ? section.linkedContentIds.map((id: unknown) => String(id || "").trim()).filter(Boolean)
        : [];
      const targetIds =
        sectionGrant.accessMode === "partial" && sectionGrant.contentIds.length > 0
          ? sectionGrant.contentIds
          : sectionLinkedIds;

      targetIds.forEach((vivaId) => {
        if (!sectionLinkedIds.includes(vivaId)) return;
        vivaEmailMap.set(
          vivaId,
          normalizeEmailList([...(vivaEmailMap.get(vivaId) ?? []), email])
        );
      });
    });
  });

  await Promise.all(
    targetVivaIds.map(async (vivaId) => {
      const docRef = getAdminDb().collection("vivaCases").doc(vivaId);
      const doc = await docRef.get();
      if (!doc.exists) return;

      const data = (doc.data() ?? {}) as Record<string, unknown>;
      const courseAllowedUserMap = normalizeCourseAllowedUserMap(data.courseAllowedUserMap);
      const manualAllowedUsers = getManualAllowedUsers(data);

      const courseEmails = vivaEmailMap.get(vivaId) ?? [];

      if (nextVivaIds.includes(vivaId) && courseEmails.length > 0) {
        courseAllowedUserMap[params.courseId] = courseEmails;
      } else {
        delete courseAllowedUserMap[params.courseId];
      }

      await docRef.update({
        allowedUser: buildAllowedUsersWithCourseMap(
          manualAllowedUsers,
          courseAllowedUserMap
        ),
        courseAllowedUserMap,
        updatedAt: FieldValue.serverTimestamp(),
      });
    })
  );
}
