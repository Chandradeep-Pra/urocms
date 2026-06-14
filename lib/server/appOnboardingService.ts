import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { normalizeEmail } from "@/lib/server/userIdentity";

type UserTier = "guest" | "free" | "paid";

type EnsureGuestInput = {
  uid: string;
  authEmail?: string | null;
  requestedEmail?: string | null;
  source?: string | null;
  firebaseName?: string | null;
};

type CompleteProfileInput = {
  uid: string;
  authEmail?: string | null;
  authName?: string | null;
  name?: string | null;
  phone?: string | null;
  country?: string | null;
  medicalInstitution?: string | null;
  googleAccessEmail?: string | null;
  profileImageUrl?: string | null;
};

function normalizeTier(value: unknown): UserTier {
  return value === "paid" || value === "free" || value === "guest" ? value : "guest";
}

function normalizeOptionalString(value: unknown) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

function getLocalPhoneDigits(phone: string | null) {
  if (!phone) return "";
  const trimmedPhone = phone.trim();

  if (trimmedPhone.startsWith("+")) {
    const [, ...localParts] = trimmedPhone.split(/\s+/);
    return localParts.join("").replace(/\D/g, "");
  }

  return trimmedPhone.replace(/\D/g, "");
}

function resolveGuestIdentity(input: EnsureGuestInput) {
  const authEmail = normalizeEmail(input.authEmail);
  const requestedEmail = normalizeEmail(input.requestedEmail);
  const email = requestedEmail || authEmail || null;

  return {
    email,
    googleAccessEmail: email,
    source: normalizeOptionalString(input.source) || "mobile-app",
    name: normalizeOptionalString(input.firebaseName) || "Guest User",
  };
}

export async function ensureGuestAppUser(input: EnsureGuestInput) {
  const now = new Date().toISOString();
  const identity = resolveGuestIdentity(input);
  const userRef = adminDb.collection("users").doc(input.uid);
  const usersCollection = adminDb.collection("users");

  const result = await adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(userRef);
    const current = snapshot.data() ?? {};
    const currentTier = normalizeTier(current.tier);
    const resolvedTier = currentTier === "paid" || currentTier === "free" ? currentTier : "guest";
    const normalizedCurrentEmail = normalizeEmail(current.email);
    const existingCanonicalUserId = normalizeOptionalString(current.canonicalUserId);
    const shouldLookupExistingGuest =
      Boolean(identity.email) &&
      (!existingCanonicalUserId || existingCanonicalUserId === input.uid) &&
      (!snapshot.exists || !normalizedCurrentEmail || normalizedCurrentEmail !== identity.email);

    let canonicalGuestId =
      existingCanonicalUserId && existingCanonicalUserId !== input.uid
        ? existingCanonicalUserId
        : input.uid;
    let canonicalGuestData: Record<string, unknown> | null = null;

    if (canonicalGuestId !== input.uid) {
      const canonicalSnapshot = await transaction.get(usersCollection.doc(canonicalGuestId));
      if (canonicalSnapshot.exists) {
        canonicalGuestData = canonicalSnapshot.data() ?? {};
      }
    }

    if (shouldLookupExistingGuest && identity.email) {
      const sameEmailSnapshot = await transaction.get(
        usersCollection.where("email", "==", identity.email)
      );

      const existingGuestDoc = sameEmailSnapshot.docs.find((doc) => {
        if (doc.id === input.uid) return false;
        const data = doc.data() ?? {};
        return data.isShadowDuplicate !== true && normalizeTier(data.tier) === "guest";
      });

      if (existingGuestDoc) {
        canonicalGuestId = existingGuestDoc.id;
        canonicalGuestData = existingGuestDoc.data() ?? {};
      }
    }

    const nextPayload: Record<string, unknown> = {
      tier: resolvedTier,
      updatedAt: now,
      canonicalUserId: canonicalGuestId,
      isShadowDuplicate: canonicalGuestId !== input.uid,
      source: current.source ?? identity.source,
      createdAt: current.createdAt ?? now,
    };

    if (!normalizeOptionalString(current.name) || canonicalGuestId !== input.uid) {
      nextPayload.name = identity.name;
    }

    if ((!normalizeOptionalString(current.email) || canonicalGuestId !== input.uid) && identity.email) {
      nextPayload.email = identity.email;
    }

    if (
      (!normalizeOptionalString(current.googleAccessEmail) || canonicalGuestId !== input.uid) &&
      identity.googleAccessEmail
    ) {
      nextPayload.googleAccessEmail = identity.googleAccessEmail;
    }

    if (canonicalGuestId !== input.uid) {
      nextPayload.linkedExistingUserId = canonicalGuestId;
    }

    transaction.set(userRef, nextPayload, { merge: true });

    if (canonicalGuestId !== input.uid) {
      transaction.set(
        usersCollection.doc(canonicalGuestId),
        {
          updatedAt: now,
          email: normalizeOptionalString(canonicalGuestData?.email) ?? identity.email,
          googleAccessEmail:
            normalizeOptionalString(canonicalGuestData?.googleAccessEmail) ??
            identity.googleAccessEmail,
          canonicalUserId: canonicalGuestId,
          isShadowDuplicate: false,
          name: normalizeOptionalString(canonicalGuestData?.name) ?? identity.name,
          source: normalizeOptionalString(canonicalGuestData?.source) ?? identity.source,
          createdAt: normalizeOptionalString(canonicalGuestData?.createdAt) ?? now,
        },
        { merge: true }
      );
    }

    return {
      id: canonicalGuestId,
      tier: resolvedTier,
      email: normalizeOptionalString(canonicalGuestData?.email) ?? identity.email,
      name:
        normalizeOptionalString(canonicalGuestData?.name) ??
        normalizeOptionalString(current.name) ??
        identity.name,
      source:
        normalizeOptionalString(canonicalGuestData?.source) ??
        normalizeOptionalString(current.source) ??
        identity.source,
      existing: snapshot.exists,
      reusedExistingGuest: canonicalGuestId !== input.uid,
      canonicalUserId: canonicalGuestId,
    };
  });

  return result;
}

export async function completeAppUserProfile(input: CompleteProfileInput) {
  const now = new Date().toISOString();
  const userRef = adminDb.collection("users").doc(input.uid);

  const normalizedName = normalizeOptionalString(input.name) || normalizeOptionalString(input.authName);
  if (!normalizedName) {
    throw new Error("Name is required");
  }

  const normalizedPhone = normalizeOptionalString(input.phone);
  if (normalizedPhone && getLocalPhoneDigits(normalizedPhone).length !== 10) {
    throw new Error("Phone number should be exactly 10 digits");
  }

  const normalizedCountry = normalizeOptionalString(input.country);
  const normalizedMedicalInstitution = normalizeOptionalString(input.medicalInstitution);
  const normalizedProfileImageUrl = normalizeOptionalString(input.profileImageUrl);
  const normalizedGoogleAccessEmail = normalizeEmail(
    input.googleAccessEmail || input.authEmail || ""
  );
  const normalizedAuthEmail = normalizeEmail(input.authEmail);

  const result = await adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(userRef);
    const current = snapshot.data() ?? {};
    const canonicalUserId = normalizeOptionalString(current.canonicalUserId);
    const targetUserId =
      canonicalUserId && canonicalUserId !== input.uid ? canonicalUserId : input.uid;
    const targetRef = adminDb.collection("users").doc(targetUserId);
    const targetSnapshot = targetUserId === input.uid ? snapshot : await transaction.get(targetRef);
    const targetCurrent = targetSnapshot.data() ?? current;
    const currentTier = normalizeTier(targetCurrent.tier);
    const resolvedTier: UserTier = currentTier === "paid" ? "paid" : "free";

    const payload: Record<string, unknown> = {
      name: normalizedName,
      phone: normalizedPhone,
      country: normalizedCountry,
      medicalInstitution: normalizedMedicalInstitution,
      profileImageUrl: normalizedProfileImageUrl,
      tier: resolvedTier,
      email:
        normalizeOptionalString(targetCurrent.email) ??
        normalizeOptionalString(current.email) ??
        normalizedAuthEmail ??
        null,
      googleAccessEmail:
        normalizedGoogleAccessEmail ||
        normalizeEmail(targetCurrent.googleAccessEmail) ||
        normalizeEmail(current.googleAccessEmail) ||
        normalizedAuthEmail ||
        null,
      canonicalUserId: targetUserId,
      isShadowDuplicate: false,
      profileCompletedAt: targetCurrent.profileCompletedAt ?? now,
      upgradedAt: targetCurrent.upgradedAt ?? now,
      updatedAt: now,
      createdAt: targetCurrent.createdAt ?? current.createdAt ?? now,
      source: targetCurrent.source ?? current.source ?? "mobile-app",
    };

    transaction.set(targetRef, payload, { merge: true });

    if (targetUserId !== input.uid) {
      transaction.set(
        userRef,
        {
          email: normalizeOptionalString(current.email) ?? normalizeOptionalString(payload.email),
          googleAccessEmail:
            normalizeOptionalString(current.googleAccessEmail) ??
            normalizeOptionalString(payload.googleAccessEmail),
          canonicalUserId: targetUserId,
          linkedExistingUserId: targetUserId,
          isShadowDuplicate: true,
          updatedAt: now,
        },
        { merge: true }
      );
    }

    return {
      tier: resolvedTier,
      googleAccessEmail: String(payload.googleAccessEmail ?? "").trim() || null,
    };
  });

  return result;
}

export async function consumeVivaMinutes(uid: string, minutes: number) {
  if (!Number.isFinite(minutes) || minutes <= 0) return;

  await adminDb.collection("users").doc(uid).set(
    {
      vivaMinutesUsed: FieldValue.increment(minutes),
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}
