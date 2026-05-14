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

export async function loadAdminVideoLibrary(params: {
  sectionId?: string | null;
  userId: string;
}) {
  let query = adminDb.collection("videoItems");

  if (params.sectionId) {
    query = query.where("sectionId", "==", params.sectionId);
  }

  const [userDoc, snapshot] = await Promise.all([
    adminDb.collection("users").doc(params.userId).get(),
    query.get(),
  ]);
  const tier = userDoc.exists ? userDoc.data()?.tier ?? "guest" : "guest";

  const videos = snapshot.docs.map((doc) => ({
    id: doc.id,
    accessTier: "free",
    ...doc.data(),
  }));

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
