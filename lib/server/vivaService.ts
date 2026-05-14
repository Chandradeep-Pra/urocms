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

  return { id: docRef.id };
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
