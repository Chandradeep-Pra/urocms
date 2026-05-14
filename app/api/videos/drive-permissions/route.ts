import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server/adminAccess";
import {
  createDriveItemPermission,
  loadDriveItemPermissions,
  removeDriveItemPermission,
  updateDriveItemPermission,
} from "@/lib/server/videoAdminService";

export async function GET(req: NextRequest) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const { searchParams } = new URL(req.url);
    return NextResponse.json(
      await loadDriveItemPermissions(searchParams.get("itemId") || "")
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch Drive permissions";
    const status = message === "Drive item id is required" ? 400 : 500;
    console.error("Drive permissions fetch error:", error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    return NextResponse.json(await createDriveItemPermission(await req.json()));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create Drive permission";
    const status =
      message === "itemId, emailAddress and role are required" ? 400 : 500;
    console.error("Drive permission create error:", error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: NextRequest) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    return NextResponse.json(await updateDriveItemPermission(await req.json()));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update Drive permission";
    const status =
      message === "itemId, permissionId and role are required" ? 400 : 500;
    console.error("Drive permission update error:", error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(req: NextRequest) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const { searchParams } = new URL(req.url);
    return NextResponse.json(
      await removeDriveItemPermission({
        itemId: searchParams.get("itemId") || "",
        permissionId: searchParams.get("permissionId") || "",
      })
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete Drive permission";
    const status = message === "itemId and permissionId are required" ? 400 : 500;
    console.error("Drive permission delete error:", error);
    return NextResponse.json({ error: message }, { status });
  }
}
