import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

const USER_SCOPED_ITEM_COLLECTIONS = [
  "bookmarks",
  "mockAttempts",
  "quizAttempts",
  "videoProgress",
  "vivaAttempts",
];

async function deleteCollectionItems(
  collectionRef: FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>
) {
  const batchSize = 300;

  while (true) {
    const snapshot = await collectionRef.limit(batchSize).get();
    if (snapshot.empty) {
      return;
    }

    const batch = adminDb.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}

async function deleteUserScopedDoc(collectionName: string, uid: string) {
  const docRef = adminDb.collection(collectionName).doc(uid);
  await deleteCollectionItems(docRef.collection("items"));
  await docRef.delete();
}

async function deleteAppDevicesForUid(uid: string) {
  while (true) {
    const snapshot = await adminDb
      .collection("appDevices")
      .where("uid", "==", uid)
      .limit(300)
      .get();

    if (snapshot.empty) {
      return;
    }

    const batch = adminDb.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}

async function deleteFirebaseAuthUser(uid: string) {
  try {
    await adminAuth.deleteUser(uid);
  } catch (error: unknown) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    if (code !== "auth/user-not-found") {
      throw error;
    }
  }
}

export async function deleteAppAccount(params: {
  authUid: string;
  canonicalUid: string;
  email?: string | null;
}) {
  const userIds = Array.from(new Set([params.authUid, params.canonicalUid].filter(Boolean)));

  await Promise.all(
    userIds.flatMap((uid) => [
      adminDb.collection("users").doc(uid).delete(),
      adminDb.collection("userStats").doc(uid).delete(),
      deleteAppDevicesForUid(uid),
      ...USER_SCOPED_ITEM_COLLECTIONS.map((collectionName) =>
        deleteUserScopedDoc(collectionName, uid)
      ),
    ])
  );

  await deleteFirebaseAuthUser(params.authUid);

  return {
    success: true,
    deletedUserIds: userIds,
  };
}
