import { NextRequest, NextResponse } from "next/server";
import {
  createDrivePermission,
  deleteDrivePermission,
  listDriveItemPermissions,
  updateDrivePermissionRole,
} from "@/lib/server/googleDrive";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get("itemId")?.trim();

    if (!itemId) {
      return NextResponse.json(
        { error: "Drive item id is required" },
        { status: 400 }
      );
    }

    const permissions = await listDriveItemPermissions(itemId);

    return NextResponse.json({
      itemId,
      count: permissions.length,
      permissions,
    });
  } catch (error) {
    console.error("Drive permissions fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch Drive permissions" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { itemId, emailAddress, role } = await req.json();

    if (!itemId || !emailAddress || !role) {
      return NextResponse.json(
        { error: "itemId, emailAddress and role are required" },
        { status: 400 }
      );
    }

    await createDrivePermission({ itemId, emailAddress, role });
    const permissions = await listDriveItemPermissions(itemId);

    return NextResponse.json({
      success: true,
      permissions,
    });
  } catch (error) {
    console.error("Drive permission create error:", error);
    return NextResponse.json(
      { error: "Failed to create Drive permission" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { itemId, permissionId, role } = await req.json();

    if (!itemId || !permissionId || !role) {
      return NextResponse.json(
        { error: "itemId, permissionId and role are required" },
        { status: 400 }
      );
    }

    await updateDrivePermissionRole({ itemId, permissionId, role });
    const permissions = await listDriveItemPermissions(itemId);

    return NextResponse.json({
      success: true,
      permissions,
    });
  } catch (error) {
    console.error("Drive permission update error:", error);
    return NextResponse.json(
      { error: "Failed to update Drive permission" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get("itemId")?.trim();
    const permissionId = searchParams.get("permissionId")?.trim();

    if (!itemId || !permissionId) {
      return NextResponse.json(
        { error: "itemId and permissionId are required" },
        { status: 400 }
      );
    }

    await deleteDrivePermission({ itemId, permissionId });
    const permissions = await listDriveItemPermissions(itemId);

    return NextResponse.json({
      success: true,
      permissions,
    });
  } catch (error) {
    console.error("Drive permission delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete Drive permission" },
      { status: 500 }
    );
  }
}
