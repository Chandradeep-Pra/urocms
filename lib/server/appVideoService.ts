import { playVideoFromFirestore } from "@/lib/server/firestoreVideoService";
import { type AppUserSession } from "@/lib/server/appSession";

export async function resolvePlayableVideoForUser(params: {
  videoId: string;
  user: AppUserSession;
}) {
  return playVideoFromFirestore({
    videoId: params.videoId,
    user: params.user,
    mode: "app",
  });
}
