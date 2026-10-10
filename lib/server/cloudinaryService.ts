import { v2 as cloudinary } from "cloudinary";

let isConfigured = false;

function ensureCloudinaryConfig() {
  if (isConfigured) return;

  const cloud_name =
    process.env.CLOUDINARY_CLOUD_NAME ||
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;

  if (cloud_name && api_key && api_secret) {
    cloudinary.config({
      cloud_name,
      api_key,
      api_secret,
      secure: true,
    });
    isConfigured = true;
  }
}

/**
 * Uploads a base64 Data URI or buffer to existing Cloudinary and returns the secure URL.
 */
export async function uploadBase64ToCloudinary(
  base64DataUri: string,
  folder = "daily-quiz"
): Promise<{ url: string; public_id?: string } | null> {
  ensureCloudinaryConfig();

  if (!base64DataUri || typeof base64DataUri !== "string") {
    return null;
  }

  try {
    const result = await cloudinary.uploader.upload(base64DataUri, {
      folder,
      resource_type: "image",
    });

    if (result?.secure_url) {
      return {
        url: result.secure_url,
        public_id: result.public_id,
      };
    }

    return null;
  } catch (error) {
    console.error("Cloudinary base64 upload error:", error);
    return null;
  }
}

export { cloudinary };

