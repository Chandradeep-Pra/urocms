import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server/adminAccess";
import { requireAppUser } from "@/lib/server/appSession";
import {
  updateVivaFolderOrder,
  createVivaFolder,
  deleteVivaFolder,
  listVivaFolders,
} from "@/lib/server/vivaService";

export async function GET(req: NextRequest) {
  const admin = await requireAdminSession(req);
  if (!admin.response) {
    try {
      return NextResponse.json({ folders: await listVivaFolders() });
    } catch (error) {
      console.error("Failed to fetch viva folders:", error);
      return NextResponse.json({ error: "Failed to fetch folders" }, { status: 500 });
    }
  }

  const appAuth = await requireAppUser(req);
  if ("response" in appAuth) return appAuth.response;

  try {
    return NextResponse.json({
      folders: await listVivaFolders(),
    });
  } catch (error) {
    console.error("Failed to fetch viva folders:", error);
    return NextResponse.json({ error: "Failed to fetch folders" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    return NextResponse.json({
      success: true,
      ...(await createVivaFolder(await req.json())),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create folder";
    console.error("Failed to create viva folder:", error);
    return NextResponse.json(
      { error: message },
      {
        status:
          (message === "Folder title is required" || message === "Sort order must be a non-negative integer")
            ? 400
            : message === "Folder already exists"
              ? 409
              : 500,
      }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const { response } = await requireAdminSession(req);
  if (response) return response;
  try {
    const body = await req.json();
    return NextResponse.json(await updateVivaFolderOrder(String(body.id || "").trim(), body.sortOrder));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update folder";
    const status = message === "Folder not found" ? 404
      : message === "Folder id is required" || message === "Sort order must be a non-negative integer" ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(req: NextRequest) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  const id = req.nextUrl.searchParams.get("id") || "";

  try {
    return NextResponse.json(await deleteVivaFolder(id));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete folder";
    console.error("Failed to delete viva folder:", error);
    return NextResponse.json(
      { error: message },
      {
        status:
          message === "Folder id is required"
            ? 400
            : message === "Folder not found"
              ? 404
              : 500,
      }
    );
  }
}
