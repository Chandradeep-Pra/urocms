export function getFriendlyFirebaseAuthError(error: unknown, fallback: string) {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code || "")
      : "";
  const message = error instanceof Error ? error.message : "";
  const source = `${code} ${message}`.toLowerCase();

  if (source.includes("auth/email-already-in-use")) {
    return "Account already exists. Please sign in to continue.";
  }

  if (
    source.includes("auth/user-not-found") ||
    source.includes("auth/invalid-credential") ||
    source.includes("auth/invalid-login-credentials")
  ) {
    return "No account found with these details. Please sign up or check your email and password.";
  }

  if (source.includes("auth/wrong-password")) {
    return "Wrong email or password. Please try again.";
  }

  if (source.includes("auth/invalid-email")) {
    return "Please enter a valid email address.";
  }

  if (source.includes("auth/weak-password")) {
    return "Password should be at least 6 characters.";
  }

  if (source.includes("auth/too-many-requests")) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  if (source.includes("auth/popup-closed-by-user")) {
    return "Google sign-in was closed before completion.";
  }

  if (source.includes("auth/popup-blocked")) {
    return "Popup was blocked. Please allow popups and try again.";
  }

  if (source.includes("auth/network-request-failed")) {
    return "Network error. Please check your internet connection and try again.";
  }

  if (source.includes("auth/account-exists-with-different-credential")) {
    return "An account already exists with this email using a different sign-in method.";
  }

  return fallback;
}
