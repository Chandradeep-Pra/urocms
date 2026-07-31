import {
  FREE_AI_VIVA_MINUTES,
  FREE_CHAPTER_PREVIEW_LIMIT,
  type QuizType,
} from "@/lib/appAccess";
import { getAdminDb } from "@/lib/firebaseAdmin";
import {
  resolveAppPlanAccess,
} from "@/lib/server/appPlanAccess";
import type { AppUserSession } from "@/lib/server/appSession";

type CourseSectionGrant = {
  sectionId: string;
  accessMode: "full" | "partial";
  contentIds: string[];
  vivaMinutes: number;
};

type CourseMemberGrant = {
  userId: string;
  email?: string;
  sectionGrants: CourseSectionGrant[];
};

type CourseRecord = {
  id: string;
  title: string;
  description: string;
  slug: string;
  sortOrder: number | null;
  accessTier: "free" | "members";
  showOnApp: boolean;
  memberUserIds: string[];
  memberAccessGrants: CourseMemberGrant[];
  sections: any[];
};

type AccessMode = "full" | "preview" | "locked";

export type ResolvedItemAccess = {
  allowed: boolean;
  mode: AccessMode;
  previewLimit: number | null;
  reason: string | null;
  courseIds: string[];
  source:
    | "free-course"
    | "course-membership"
    | "plan-course"
    | "plan-content"
    | "public"
    | "preview"
    | "free-content"
    | "locked";
};

export type ResolvedCourseAccess = {
  allowed: boolean;
  mode: "full" | "partial" | "locked";
  reason: string | null;
};

export type VivaCreditSummary = {
  totalMinutes: number;
  usedMinutes: number;
  remainingMinutes: number;
  percentRemaining: number;
};

function normalizeString(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeIdList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => normalizeString(item)).filter(Boolean);
}

function normalizeCourseAccessTier(value: unknown): "free" | "members" {
  return value === "members" || value === "paid" ? "members" : "free";
}

function normalizeSortOrder(value: unknown): number | null {
  if (typeof value === "string" && !value.trim()) return null;
  if (value === null || typeof value === "undefined") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getCreatedAtMillis(value: unknown) {
  if (!value) return Number.MAX_SAFE_INTEGER;
  if (value instanceof Date) return value.getTime();
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().getTime();
  }

  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

function toSet(values: string[]) {
  return new Set(values.map((value) => normalizeString(value)).filter(Boolean));
}

function hasAny(values: Iterable<string>, target: Set<string>) {
  for (const value of values) {
    if (target.has(normalizeString(value))) {
      return true;
    }
  }

  return false;
}

function isSignedIn(user: AppUserSession) {
  return user.tier !== "guest";
}

function normalizeQuizType(type: QuizType) {
  return String(type ?? "").trim().toLowerCase().replace(/[_\s]+/g, "-");
}

function isPreviewableQuizType(type: QuizType) {
  const normalized = normalizeQuizType(type);

  return (
    normalized === "chapter" ||
    normalized === "quiz" ||
    normalized === "chapter-quiz" ||
    normalized === "chapter-wise" ||
    normalized === "chapter-wise-test" ||
    normalized === "chapterwise" ||
    normalized.includes("chapter")
  );
}

function getPreviewLimit(type: QuizType) {
  return isPreviewableQuizType(type) ? FREE_CHAPTER_PREVIEW_LIMIT : 0;
}

async function loadVisibleCourses() {
  const snapshot = await getAdminDb()
    .collection("courses")
    .where("showOnApp", "==", true)
    .orderBy("createdAt", "asc")
    .get();

  const sortedDocs = [...snapshot.docs].sort((left, right) => {
    const leftData = left.data() ?? {};
    const rightData = right.data() ?? {};
    const leftSort = normalizeSortOrder(leftData.sortOrder);
    const rightSort = normalizeSortOrder(rightData.sortOrder);

    if (leftSort !== null || rightSort !== null) {
      const sortDelta =
        (leftSort ?? Number.MAX_SAFE_INTEGER) - (rightSort ?? Number.MAX_SAFE_INTEGER);
      if (sortDelta !== 0) return sortDelta;
    }

    const createdDelta =
      getCreatedAtMillis(leftData.createdAt) - getCreatedAtMillis(rightData.createdAt);
    if (createdDelta !== 0) return createdDelta;

    return left.id.localeCompare(right.id);
  });

  return sortedDocs.map((doc) => {
    const data = doc.data() ?? {};

    return {
      id: doc.id,
      title: normalizeString(data.title),
      description: normalizeString(data.description),
      slug: normalizeString(data.slug),
      sortOrder: normalizeSortOrder(data.sortOrder),
      accessTier: normalizeCourseAccessTier(data.accessTier),
      showOnApp: Boolean(data.showOnApp),
      memberUserIds: normalizeIdList(data.memberUserIds),
      memberAccessGrants: Array.isArray(data.memberAccessGrants)
        ? data.memberAccessGrants.map((grant: any) => ({
            userId: normalizeString(grant?.userId),
            email: normalizeString(grant?.email).toLowerCase(),
            sectionGrants: Array.isArray(grant?.sectionGrants)
              ? grant.sectionGrants
                  .map((sectionGrant: any) => ({
                    sectionId: normalizeString(sectionGrant?.sectionId),
                    accessMode:
                      sectionGrant?.accessMode === "partial" ? "partial" : "full",
                    contentIds: normalizeIdList(sectionGrant?.contentIds),
                    vivaMinutes: Number.isFinite(Number(sectionGrant?.vivaMinutes))
                      ? Math.max(0, Number(sectionGrant?.vivaMinutes))
                      : 0,
                  }))
                  .filter((sectionGrant: CourseSectionGrant) => Boolean(sectionGrant.sectionId))
              : [],
          }))
        : [],
      sections: Array.isArray(data.sections) ? data.sections : [],
    } satisfies CourseRecord;
  });
}

function courseMatchesVideo(course: CourseRecord, videoId: string, sectionId: string) {
  return course.sections.some((section) => {
    if (section?.contentType !== "videos") return false;
    const linkedIds = normalizeIdList(section?.linkedContentIds);
    return linkedIds.includes(videoId) || linkedIds.includes(sectionId);
  });
}

function courseMatchesQuiz(course: CourseRecord, quizId: string, bankIds: string[]) {
  return course.sections.some((section) => {
    if (section?.contentType !== "chapter-quizzes") return false;
    const linkedIds = toSet(normalizeIdList(section?.linkedContentIds));
    if (linkedIds.has(quizId)) return true;
    return bankIds.some((bankId) => linkedIds.has(bankId));
  });
}

function courseMatchesMock(course: CourseRecord, mockId: string) {
  return course.sections.some((section) => {
    if (section?.contentType !== "mocks" && section?.contentType !== "grand-mocks") {
      return false;
    }

    return normalizeIdList(section?.linkedContentIds).includes(mockId);
  });
}

function courseMatchesViva(course: CourseRecord, vivaId: string) {
  return course.sections.some((section) => {
    if (section?.contentType !== "ai-vivas") return false;
    return normalizeIdList(section?.linkedContentIds).includes(vivaId);
  });
}

export async function buildAppContentAccessContext(user: AppUserSession) {
  const [planAccess, courses] = await Promise.all([
    resolveAppPlanAccess(user),
    loadVisibleCourses(),
  ]);

  const entitlements = planAccess.entitlements;
  const activeCourseIds = toSet(user.activeCourseIds);
  const planCourseIds = toSet(entitlements.courses);
  const freeCourseIds = new Set(
    courses
      .filter((course) => course.accessTier === "free")
      .map((course) => course.id)
  );
  const userSectionGrantMap = new Map(
    courses.map((course) => [
      course.id,
      course.memberAccessGrants.find((grant) => grant.userId === user.uid) ?? null,
    ])
  );
  const sectionScopedCourseIds = new Set(
    Array.from(userSectionGrantMap.entries())
      .filter(([, grant]) => Boolean(grant))
      .map(([courseId]) => courseId)
  );
  const explicitlyGrantedCourseIds = new Set(
    courses
      .filter(
        (course) =>
          course.memberUserIds.includes(user.uid) && !sectionScopedCourseIds.has(course.id)
      )
      .map((course) => course.id)
  );
  const fullCourseIds = new Set([
    ...Array.from(explicitlyGrantedCourseIds),
    ...courses
      .filter((course) => {
        const hasSectionGrant = course.memberAccessGrants.some(
          (grant) => grant.userId === user.uid
        );
        return activeCourseIds.has(course.id) && !hasSectionGrant;
      })
      .map((course) => course.id),
    ...Array.from(planCourseIds),
    ...Array.from(freeCourseIds),
  ]);
  const vivaMinutesFromGrants = courses.reduce((total, course) => {
    const grant = userSectionGrantMap.get(course.id);
    if (!grant) return total;

    return (
      total +
       grant.sectionGrants.reduce((sectionTotal: number, sectionGrant: CourseSectionGrant) => {
        const section = course.sections.find(
          (item: any) =>
            item?.id === sectionGrant.sectionId && item?.contentType === "ai-vivas"
        );
        if (!section) return sectionTotal;
        return sectionTotal + Math.max(0, sectionGrant.vivaMinutes || 0);
      }, 0)
    );
  }, 0);
  const planVivaMinutes =
    typeof planAccess.plan?.vivaMinutes === "number" && planAccess.plan.vivaMinutes > 0
      ? planAccess.plan.vivaMinutes
      : 0;
  const baseFreeVivaMinutes = user.tier === "free" ? FREE_AI_VIVA_MINUTES : 0;
  const totalVivaMinutes = baseFreeVivaMinutes + vivaMinutesFromGrants + planVivaMinutes;
  const usedVivaMinutes =
    Number.isFinite(Number((user as AppUserSession & { vivaMinutesUsed?: unknown }).vivaMinutesUsed))
      ? Math.max(0, Number((user as AppUserSession & { vivaMinutesUsed?: unknown }).vivaMinutesUsed))
      : 0;
  const remainingVivaMinutes =
    totalVivaMinutes > 0 ? Math.max(0, totalVivaMinutes - usedVivaMinutes) : 0;

  function getCourseIdsForVideo(videoId: string, sectionId: string) {
    return courses
      .filter((course) => courseMatchesVideo(course, videoId, sectionId))
      .map((course) => course.id);
  }

  function getCourseIdsForQuiz(quizId: string, bankIds: string[]) {
    return courses
      .filter((course) => courseMatchesQuiz(course, quizId, bankIds))
      .map((course) => course.id);
  }

  function getCourseIdsForMock(mockId: string) {
    return courses
      .filter((course) => courseMatchesMock(course, mockId))
      .map((course) => course.id);
  }

  function getCourseIdsForViva(vivaId: string) {
    return courses
      .filter((course) => courseMatchesViva(course, vivaId))
      .map((course) => course.id);
  }

  function hasFullCourseAccess(courseId: string) {
    return fullCourseIds.has(courseId);
  }

  function hasFullCourseAccessIn(courseIds: string[]) {
    return courseIds.some((courseId) => hasFullCourseAccess(courseId));
  }

  function getUserSectionGrant(courseId: string, sectionId: string) {
    const grant = userSectionGrantMap.get(courseId);
    if (!grant) return null;
    return (
      grant.sectionGrants.find((sectionGrant: CourseSectionGrant) => sectionGrant.sectionId === sectionId) ??
      null
    );
  }

  function resolveSectionGrantAccess(params: {
    courseId: string;
    sectionId: string;
    contentId: string;
  }) {
    const grant = getUserSectionGrant(params.courseId, params.sectionId);
    if (!grant) return false;
    if (grant.accessMode === "full") return true;
    return grant.contentIds.includes(params.contentId);
  }

  function getVideoAccess(input: {
    id: string;
    sectionId?: string | null;
    effectiveAccessTier?: string | null;
    accessTier?: string | null;
  }): ResolvedItemAccess {
    const sectionId = normalizeString(input.sectionId);
    const courseIds = getCourseIdsForVideo(input.id, sectionId);
    const fullViaCourse = hasFullCourseAccessIn(courseIds);
    const fullViaPlan =
      entitlements.videos.includes(input.id) ||
      (sectionId ? entitlements.videoSections.includes(sectionId) : false);

    if (fullViaCourse) {
      return {
        allowed: true,
        mode: "full",
        previewLimit: null,
        reason: null,
        courseIds,
        source: courseIds.some((id) => freeCourseIds.has(id))
          ? "free-course"
          : courseIds.some((id) => activeCourseIds.has(id))
            ? "course-membership"
            : "plan-course",
      };
    }

    if (fullViaPlan) {
      return {
        allowed: true,
        mode: "full",
        previewLimit: null,
        reason: null,
        courseIds,
        source: "plan-content",
      };
    }

    const sectionGranted = courses.some((course) =>
      course.sections.some((section: any) => {
        if (section?.contentType !== "videos") return false;
        const linkedIds = normalizeIdList(section?.linkedContentIds);
        if (!linkedIds.includes(input.id) && !linkedIds.includes(sectionId)) return false;
        return resolveSectionGrantAccess({
          courseId: course.id,
          sectionId: section.id,
          contentId: linkedIds.includes(input.id) ? input.id : sectionId,
        });
      })
    );

    if (sectionGranted) {
      return {
        allowed: true,
        mode: "full",
        previewLimit: null,
        reason: null,
        courseIds,
        source: "plan-content",
      };
    }

    if (!courseIds.length && normalizeString(input.effectiveAccessTier || input.accessTier) !== "paid") {
      return {
        allowed: true,
        mode: "full",
        previewLimit: null,
        reason: null,
        courseIds,
        source: "free-content",
      };
    }

    return {
      allowed: false,
      mode: "locked",
      previewLimit: null,
      reason: "This video is locked until the matching course or section is unlocked.",
      courseIds,
      source: "locked",
    };
  }

  function getQuizAccess(input: {
    id: string;
    bankIds: string[];
    type?: QuizType;
  }): ResolvedItemAccess {
    const bankIds = normalizeIdList(input.bankIds);
    const type = input.type ?? "chapter";
    const courseIds = getCourseIdsForQuiz(input.id, bankIds);
    const fullViaCourse = hasFullCourseAccessIn(courseIds);
    const fullViaPlan =
      entitlements.quizzes.includes(input.id) ||
      bankIds.some((bankId) => entitlements.chapters.includes(bankId)) ||
      bankIds.some((bankId) => entitlements.chapterGroups.includes(bankId));

    if (fullViaCourse) {
      return {
        allowed: true,
        mode: "full",
        previewLimit: null,
        reason: null,
        courseIds,
        source: courseIds.some((id) => freeCourseIds.has(id))
          ? "free-course"
          : courseIds.some((id) => activeCourseIds.has(id))
            ? "course-membership"
            : "plan-course",
      };
    }

    if (fullViaPlan) {
      return {
        allowed: true,
        mode: "full",
        previewLimit: null,
        reason: null,
        courseIds,
        source: "plan-content",
      };
    }

    const sectionGranted = courses.some((course) =>
      course.sections.some((section: any) => {
        if (section?.contentType !== "chapter-quizzes") return false;
        const linkedIds = normalizeIdList(section?.linkedContentIds);
        const matchingBankId = bankIds.find((bankId) => linkedIds.includes(bankId));
        if (!linkedIds.includes(input.id) && !matchingBankId) return false;
        return resolveSectionGrantAccess({
          courseId: course.id,
          sectionId: section.id,
          contentId: linkedIds.includes(input.id) ? input.id : matchingBankId || "",
        });
      })
    );

    if (sectionGranted) {
      return {
        allowed: true,
        mode: "full",
        previewLimit: null,
        reason: null,
        courseIds,
        source: "plan-content",
      };
    }

    if (user.tier === "free" && isPreviewableQuizType(type)) {
      return {
        allowed: true,
        mode: "preview",
        previewLimit: getPreviewLimit(type),
        reason: `Preview mode: first ${getPreviewLimit(type)} questions only.`,
        courseIds,
        source: "preview",
      };
    }

    return {
      allowed: false,
      mode: "locked",
      previewLimit: null,
      reason:
        user.tier === "guest"
          ? "Complete your profile to unlock the free chapter quiz preview."
          : "This quiz is locked until it is included in your active plan.",
      courseIds,
      source: "locked",
    };
  }

  function getMockAccess(input: {
    id: string;
    type?: QuizType;
    accessType?: string | null;
  }): ResolvedItemAccess {
    if (normalizeString(input.accessType) === "public") {
      return {
        allowed: true,
        mode: "full",
        previewLimit: null,
        reason: null,
        courseIds: [],
        source: "public",
      };
    }

    const type = input.type ?? "mock";
    const courseIds = getCourseIdsForMock(input.id);
    const fullViaCourse = hasFullCourseAccessIn(courseIds);
    const fullViaPlan = entitlements.mocks.includes(input.id);

    if (fullViaCourse) {
      return {
        allowed: true,
        mode: "full",
        previewLimit: null,
        reason: null,
        courseIds,
        source: courseIds.some((id) => freeCourseIds.has(id))
          ? "free-course"
          : courseIds.some((id) => activeCourseIds.has(id))
            ? "course-membership"
            : "plan-course",
      };
    }

    if (fullViaPlan) {
      return {
        allowed: true,
        mode: "full",
        previewLimit: null,
        reason: null,
        courseIds,
        source: "plan-content",
      };
    }

    const sectionGranted = courses.some((course) =>
      course.sections.some((section: any) => {
        if (section?.contentType !== "mocks" && section?.contentType !== "grand-mocks") {
          return false;
        }
        const linkedIds = normalizeIdList(section?.linkedContentIds);
        if (!linkedIds.includes(input.id)) return false;
        return resolveSectionGrantAccess({
          courseId: course.id,
          sectionId: section.id,
          contentId: input.id,
        });
      })
    );

    if (sectionGranted) {
      return {
        allowed: true,
        mode: "full",
        previewLimit: null,
        reason: null,
        courseIds,
        source: "plan-content",
      };
    }

    if (user.tier === "guest") {
      return {
        allowed: false,
        mode: "locked",
        previewLimit: null,
        reason: "Complete your profile to unlock the free chapter quiz preview.",
        courseIds,
        source: "locked",
      };
    }

    return {
      allowed: false,
      mode: "locked",
      previewLimit: null,
      reason: "This mock is locked until the matching course or section is unlocked.",
      courseIds,
      source: "locked",
    };
  }

  function getVivaAccess(input: {
    id: string;
    folderId?: string | null;
    accessType?: string | null;
  }): ResolvedItemAccess {
    const folderId = normalizeString(input.folderId);
    const courseIds = getCourseIdsForViva(input.id);

    if (normalizeString(input.accessType) === "public") {
      return {
        allowed: true,
        mode: "full",
        previewLimit: null,
        reason: null,
        courseIds,
        source: "public",
      };
    }

    const quotaLockedReason =
      totalVivaMinutes <= 0 || remainingVivaMinutes <= 0
        ? "You are out of AI viva quota credits. Please contact admin."
        : null;

    function allowViva(source: ResolvedItemAccess["source"]): ResolvedItemAccess {
      if (quotaLockedReason) {
        return {
          allowed: false,
          mode: "locked",
          previewLimit: null,
          reason: quotaLockedReason,
          courseIds,
          source: "locked",
        };
      }

      return {
        allowed: true,
        mode: "full",
        previewLimit: null,
        reason: null,
        courseIds,
        source,
      };
    }

    const fullViaCourse = hasFullCourseAccessIn(courseIds);
    const fullViaPlan =
      entitlements.vivaCases.includes(input.id) ||
      (folderId ? entitlements.vivaFolders.includes(folderId) : false);

    if (fullViaCourse) {
      return allowViva(
        courseIds.some((id) => freeCourseIds.has(id))
          ? "free-course"
          : courseIds.some((id) => activeCourseIds.has(id))
            ? "course-membership"
            : "plan-course"
      );
    }

    if (fullViaPlan) {
      return allowViva("plan-content");
    }

    const sectionGranted = courses.some((course) =>
      course.sections.some((section: any) => {
        if (section?.contentType !== "ai-vivas") return false;
        const linkedIds = normalizeIdList(section?.linkedContentIds);
        if (!linkedIds.includes(input.id)) return false;
        return resolveSectionGrantAccess({
          courseId: course.id,
          sectionId: section.id,
          contentId: input.id,
        });
      })
    );

    if (sectionGranted) {
      return allowViva("plan-content");
    }

    return {
      allowed: false,
      mode: "locked",
      previewLimit: null,
      reason: "Please join Urologics member to get this Viva case.",
      courseIds,
      source: "locked",
    };
  }

  function getCourseAccess(course: CourseRecord): ResolvedCourseAccess {
    if (hasFullCourseAccess(course.id)) {
      return {
        allowed: true,
        mode: "full",
        reason: null,
      };
    }

    const hasPartial = course.sections.some((section) => {
      if (getUserSectionGrant(course.id, section.id)) return true;
      const linkedIds = normalizeIdList(section?.linkedContentIds);
      if (!linkedIds.length) return false;

      if (section?.contentType === "videos") {
        return hasAny(linkedIds, toSet(entitlements.videoSections)) || hasAny(linkedIds, toSet(entitlements.videos));
      }

      if (section?.contentType === "chapter-quizzes") {
        return (
          hasAny(linkedIds, toSet(entitlements.quizzes)) ||
          hasAny(linkedIds, toSet(entitlements.chapters)) ||
          hasAny(linkedIds, toSet(entitlements.chapterGroups))
        );
      }

      if (section?.contentType === "mocks" || section?.contentType === "grand-mocks") {
        return hasAny(linkedIds, toSet(entitlements.mocks));
      }

      if (section?.contentType === "ai-vivas") {
        return hasAny(linkedIds, toSet(entitlements.vivaCases));
      }

      return false;
    });

    if (hasPartial) {
      return {
        allowed: true,
        mode: "partial",
        reason: "Only part of this course is unlocked for the current learner.",
      };
    }

    return {
      allowed: false,
      mode: "locked",
      reason: "This course is locked until it is assigned or purchased.",
    };
  }

  function getSectionAccess(course: CourseRecord, section: any): ResolvedCourseAccess {
    if (
      section?.contentType === "ai-vivas" &&
      (totalVivaMinutes <= 0 || remainingVivaMinutes <= 0)
    ) {
      return {
        allowed: false,
        mode: "locked",
        reason: "You are out of AI viva quota credits. Please contact admin.",
      };
    }

    if (hasFullCourseAccess(course.id)) {
      return {
        allowed: true,
        mode: "full",
        reason: null,
      };
    }

    const userSectionGrant = getUserSectionGrant(course.id, section.id);
    if (userSectionGrant) {
      return {
        allowed: true,
        mode: userSectionGrant.accessMode === "full" ? "full" : "partial",
        reason:
          userSectionGrant.accessMode === "full"
            ? null
            : "Selected content in this section is unlocked for the current learner.",
      };
    }

    const linkedIds = normalizeIdList(section?.linkedContentIds);
    if (!linkedIds.length) {
      return {
        allowed: false,
        mode: "locked",
        reason: "No linked content found for this section.",
      };
    }

    let allowed = false;

    if (section?.contentType === "videos") {
      allowed =
        hasAny(linkedIds, toSet(entitlements.videoSections)) ||
        hasAny(linkedIds, toSet(entitlements.videos));
    } else if (section?.contentType === "chapter-quizzes") {
      allowed =
        hasAny(linkedIds, toSet(entitlements.quizzes)) ||
        hasAny(linkedIds, toSet(entitlements.chapters)) ||
        hasAny(linkedIds, toSet(entitlements.chapterGroups));
    } else if (section?.contentType === "mocks" || section?.contentType === "grand-mocks") {
      allowed = hasAny(linkedIds, toSet(entitlements.mocks));
    } else if (section?.contentType === "ai-vivas") {
      allowed =
        hasAny(linkedIds, toSet(entitlements.vivaCases)) ||
        hasAny(linkedIds, toSet(entitlements.vivaFolders));
    }

    return allowed
      ? {
          allowed: true,
          mode: "partial",
          reason: "Some linked items in this section are unlocked.",
        }
      : {
          allowed: false,
          mode: "locked",
          reason: "This section is locked until the matching content is unlocked.",
        };
  }

  return {
    user,
    courses,
    planAccess,
    entitlements,
    fullCourseIds,
    vivaCredit: {
      totalMinutes: totalVivaMinutes,
      usedMinutes: usedVivaMinutes,
      remainingMinutes: remainingVivaMinutes,
      percentRemaining:
        totalVivaMinutes > 0
          ? Number(((remainingVivaMinutes / totalVivaMinutes) * 100).toFixed(2))
          : 0,
    } satisfies VivaCreditSummary,
    getCourseAccess,
    getSectionAccess,
    getVideoAccess,
    getQuizAccess,
    getMockAccess,
    getVivaAccess,
  };
}

export type AppContentAccessContext = Awaited<
  ReturnType<typeof buildAppContentAccessContext>
>;
