# TypeScript Build Error Log

Last verified: 2026-07-31

Verification command:

```powershell
npx tsc --noEmit --pretty false
```

Current result: passes with zero TypeScript errors.

Production build verification:

```powershell
npm run build
```

Current result: passes successfully with standalone output enabled. During the
sandboxed verification run, the pricing and testimonial prerenderers logged
caught Firestore connection warnings because outbound access was unavailable;
these warnings did not fail the build.

| Error | Fix | Route / File |
|---|---|---|
| `TS2344`: Next.js route handler returned `Promise<unknown>` | Declared the handler return type as `Promise<NextResponse>` and typed the upload promise as `Promise<NextResponse>`. | `app/api/cloudinary-upload/route.ts` |
| `TS2367`: compared an already-narrowed access mode with `"locked"` | Removed the unreachable comparison after the locked-access guard and set `requiredTier` to `null` in the allowed response. | `app/api/app/mocks/[id]/route.ts` |
| `TS2740`: Firestore `Query` assigned to a `CollectionReference` variable | Declared filtered query variables as `Query<DocumentData>`, because `.where()` returns a `Query`. | `app/api/app/videos/library/route.ts`, `app/api/public/videos/library/route.ts`, `lib/server/videoAdminService.ts`, `lib/server/videoItemService.ts` |
| `TS2339`: video fields such as `sectionId`, `provider`, `storagePath`, and `title` missing after `doc.data()` spread | Introduced explicit `VideoDocument` types for Firestore data before mapping and sorting. | `app/api/app/videos/library/route.ts`, `app/api/public/videos/library/route.ts`, `lib/server/videoAdminService.ts`, `lib/server/videoItemService.ts` |
| `TS2339`: viva fields missing because the result was inferred as `{ id: string }` | Added a typed `VivaCaseDocument` return value to `getVivaCaseById`. | `lib/server/vivaService.ts`, `app/api/app/viva-cases/[id]/route.ts`, `app/api/viva-cases/[id]/route.ts` |
| `TS2339`: daily-quiz attempt fields missing after a Firestore spread | Typed the attempt document fields before constructing the returned record. | `lib/server/dailyQuizService.ts` |
| `TS2322`: `accessMode` widened from a literal union to `string` | Used `CourseSectionGrant` validation and preserved `"partial"` as a literal. | `app/dashboard/curriculum/courses/[id]/page.tsx` |
| `TS2322`: video section access tier widened to `string` | Added an explicit `VideoSectionRecord` return type to the mapping callback. | `lib/server/videoSectionService.ts` |
| `TS18047` / `TS2345`: Firebase user could become `null` inside an async closure | Captured the already-validated user in a non-null local variable before entering the async function. | `components/landing-page/Header.tsx` |
| `TS18047`: nullable country options used by the sort callback | Replaced `.filter(Boolean)` with a type-predicate filter before sorting. | `components/landing-page/WaitlistDialog.tsx` |
| `TS2339`: `window.setTimeout` narrowed to `never` | Used `globalThis.setTimeout` for the fallback branch. | `components/LazyToaster.tsx` |
| `TS2339`: `sortOrder` missing from one union member | Added an explicit optional `sortOrder` property to the synthetic “All Videos” item. | `components/videos/SelectionSidebar.tsx` |
| `TS2339`: provider-specific playback fields missing from union members | Added a discriminated `ParsedVideo` union and narrowed `provider` before reading `youtubeId` or `streamUrl`. | `components/videos/VideoPlayerLayout.tsx` |
| `TS7006`: callback parameters implicitly had `any` types | Typed viva participants, course section grants, Drive files, and Drive permissions. | `components/viva/types.ts`, `lib/server/appContentAccess.ts`, `lib/server/googleDrive.ts` |
| `TS2367`: `"guest"` comparison was unreachable after an earlier guard | Removed the unreachable branches and returned the remaining preview response directly. | `lib/appAccess.ts` |
| `TS2722` / `TS2769`: optional Firestore timestamp method and invalid `Date` overload | Narrowed `Date`, string, `toDate()` timestamp, and `_seconds` timestamp variants in separate branches. | `lib/server/dailyQuizService.ts` |
| `TS2345`: Node and DOM `ReadableStream` definitions were incompatible | Kept runtime conversion through `Readable.fromWeb` / `Readable.toWeb` and isolated the library-definition boundary at the conversion call. | `lib/server/firestoreVideoService.ts`, `lib/server/videoStreamService.ts` |
| `TS2345`: inferred response headers could contain `undefined` | Constructed a `Headers` object and copied only string-valued headers. | `lib/server/videoStreamService.ts` |

## Reusable patterns

### Filtered Firestore query

```ts
import type { DocumentData, Query } from "firebase-admin/firestore";

let query: Query<DocumentData> = adminDb.collection("items");
query = query.where("isActive", "==", true);
```

### Typed Firestore document

```ts
type ItemDocument = Record<string, unknown> & {
  title?: unknown;
  sectionId?: unknown;
};

const data = doc.data() as ItemDocument;
```

### Nullable array filtering

```ts
items.filter((item): item is Item => item !== null);
```

### Literal-union preservation

```ts
const grant = {
  accessMode: "partial" as const,
};
```
