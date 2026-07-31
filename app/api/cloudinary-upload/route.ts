import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function inferImageMimeType(file: File) {
  const explicitType = typeof file.type === "string" ? file.type.trim().toLowerCase() : "";
  if (explicitType.startsWith("image/")) {
    return explicitType;
  }

  const name = typeof file.name === "string" ? file.name.trim().toLowerCase() : "";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".gif")) return "image/gif";
  if (name.endsWith(".heic")) return "image/heic";
  if (name.endsWith(".heif")) return "image/heif";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  return "";
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const folder = (formData.get("folder") as string) || "urocms";

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (typeof (file as File).arrayBuffer !== "function") {
      return NextResponse.json(
        { error: "Unsupported upload payload" },
        { status: 400 }
      );
    }

    const normalizedFile = file as File;
    const mimeType = inferImageMimeType(normalizedFile);

    // Validate file type
    if (!mimeType) {
      return NextResponse.json(
        { error: "Only image files are allowed" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await normalizedFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary using stream
    return new Promise<NextResponse>((resolve) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          resource_type: "auto",
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload error:", error);
            resolve(
              NextResponse.json(
                { error: "Upload failed" },
                { status: 500 }
              )
            );
          } else {
            resolve(
              NextResponse.json({
                url: result?.secure_url,
                public_id: result?.public_id,
              })
            );
          }
        }
      );

      stream.end(buffer);
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message
            ? error.message
            : "Upload failed",
      },
      { status: 500 }
    );
  }
}
