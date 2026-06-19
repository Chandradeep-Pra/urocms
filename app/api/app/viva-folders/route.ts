import { NextRequest, NextResponse } from "next/server";
import { requireAppUser } from "@/lib/server/appSession";
import { listVivaFolders } from "@/lib/server/vivaService";

export async function GET(req: NextRequest) {
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;

  try {
    return NextResponse.json({
      folders: await listVivaFolders(),
    });
  } catch (error) {
    console.error("App viva folders fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch viva folders" }, { status: 500 });
  }
}
