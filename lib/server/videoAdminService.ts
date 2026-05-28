import { adminDb } from "@/lib/firebaseAdmin";
import { playVideoFromFirestore, syncDriveVideoToStorage } from "@/lib/server/firestoreVideoService";
import {
  createDrivePermission,
  deleteDrivePermission,
  getConfiguredDriveVideoFolderId,
  listAccessibleDriveFolders,
  listDriveFolderContents,
  listDriveItemPermissions,
  updateDrivePermissionRole,
} from "@/lib/server/googleDrive";

function normalizeSortOrder(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

export async function loadAdminVideoLibrary(params: {
  sectionId?: string | null;
  userId: string;
}) {
  let query = adminDb.collection("videoItems");

  if (params.sectionId) {
    query = query.where("sectionId", "==", params.sectionId);
  }

  const [userDoc, snapshot, sectionsSnapshot] = await Promise.all([
    adminDb.collection("users").doc(params.userId).get(),
    query.get(),
    adminDb.collection("videoSections").get(),
  ]);
  const tier = userDoc.exists ? userDoc.data()?.tier ?? "guest" : "guest";
  const sectionOrderMap = new Map(
    sectionsSnapshot.docs.map((doc, index) => [
      doc.id,
      normalizeSortOrder(doc.data().sortOrder, index + 1),
    ])
  );

  const videos = snapshot.docs
    .map((doc, index) => ({
      id: doc.id,
      ...doc.data(),
      accessTier: doc.data().accessTier === "paid" ? "paid" : "free",
      sortOrder: normalizeSortOrder(doc.data().sortOrder, index + 1),
    }))
    .sort((a, b) => {
      const sectionA = sectionOrderMap.get(String(a.sectionId || "")) ?? Number.MAX_SAFE_INTEGER;
      const sectionB = sectionOrderMap.get(String(b.sectionId || "")) ?? Number.MAX_SAFE_INTEGER;

      if (sectionA !== sectionB) {
        return sectionA - sectionB;
      }

      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }

      return String(a.title || "").localeCompare(String(b.title || ""));
    });

  return { tier, videos };
}

export async function loadDriveFoldersCatalog() {
  const folders = await listAccessibleDriveFolders();
  const configuredFolderId = getConfiguredDriveVideoFolderId() || null;

  return {
    configuredFolderId,
    folders,
  };
}

export async function loadDriveFolderLibrary(folderId?: string | null) {
  const resolvedFolderId = folderId?.trim() || getConfiguredDriveVideoFolderId();

  if (!resolvedFolderId) {
    throw new Error("Drive folder id is required");
  }

  const { folders, videos } = await listDriveFolderContents(resolvedFolderId);

  return {
    folderId: resolvedFolderId,
    folderCount: folders.length,
    count: videos.length,
    folders,
    videos,
  };
}

export async function loadDriveItemPermissions(itemId: string) {
  const normalizedItemId = itemId.trim();
  if (!normalizedItemId) {
    throw new Error("Drive item id is required");
  }

  const permissions = await listDriveItemPermissions(normalizedItemId);

  return {
    itemId: normalizedItemId,
    count: permissions.length,
    permissions,
  };
}

export async function createDriveItemPermission(input: {
  itemId: string;
  emailAddress: string;
  role: string;
}) {
  const itemId = input.itemId.trim();
  const emailAddress = input.emailAddress.trim();
  const role = input.role.trim();

  if (!itemId || !emailAddress || !role) {
    throw new Error("itemId, emailAddress and role are required");
  }

  await createDrivePermission({ itemId, emailAddress, role });
  return {
    success: true,
    permissions: await listDriveItemPermissions(itemId),
  };
}

export async function updateDriveItemPermission(input: {
  itemId: string;
  permissionId: string;
  role: string;
}) {
  const itemId = input.itemId.trim();
  const permissionId = input.permissionId.trim();
  const role = input.role.trim();

  if (!itemId || !permissionId || !role) {
    throw new Error("itemId, permissionId and role are required");
  }

  await updateDrivePermissionRole({ itemId, permissionId, role });
  return {
    success: true,
    permissions: await listDriveItemPermissions(itemId),
  };
}

export async function removeDriveItemPermission(input: {
  itemId: string;
  permissionId: string;
}) {
  const itemId = input.itemId.trim();
  const permissionId = input.permissionId.trim();

  if (!itemId || !permissionId) {
    throw new Error("itemId and permissionId are required");
  }

  await deleteDrivePermission({ itemId, permissionId });
  return {
    success: true,
    permissions: await listDriveItemPermissions(itemId),
  };
}

export async function prepareAdminVideoPlayback(videoId: string) {
  return playVideoFromFirestore({
    videoId,
    mode: "admin",
  });
}

export async function syncAdminVideoToStorage(videoId: string) {
  return syncDriveVideoToStorage(videoId);
}
