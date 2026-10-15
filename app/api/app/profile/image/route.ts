import { NextRequest, NextResponse } from "next/server";
import { requireAppUser } from "@/lib/server/appSession";
import { uploadBase64ToCloudinary } from "@/lib/server/cloudinaryService";

export async function POST(req: NextRequest) {
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) return NextResponse.json({ error: "Choose a JPG, PNG, WebP or GIF image." }, { status: 400 });
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Choose an image smaller than 5 MB." }, { status: 400 });
    const image = Buffer.from(await file.arrayBuffer()).toString("base64");
    const result = await uploadBase64ToCloudinary(`data:${file.type};base64,${image}`, `urologics-profile/${auth.user.uid}`);
    if (!result?.url) throw new Error("Cloudinary did not return an image URL");
    return NextResponse.json({ url: result.url }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Profile image upload error:", error);
    return NextResponse.json({ error: "Unable to upload your profile image." }, { status: 500 });
  }
}
