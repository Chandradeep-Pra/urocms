import { auth } from "@/lib/firebaseClient";

type AdminFetchInit = RequestInit & {
  headers?: HeadersInit;
};

export async function adminFetch(input: RequestInfo | URL, init: AdminFetchInit = {}) {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("Admin session missing. Please sign in again.");
  }

  const token = await currentUser.getIdToken();
  const headers = new Headers(init.headers || {});

  if (!headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(input, {
    ...init,
    headers,
    cache: init.cache ?? "no-store",
  });
}
