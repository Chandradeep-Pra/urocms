import packageJson from "@/package.json";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    { status: "ok", timestamp: new Date().toISOString(), version: packageJson.version },
    { headers: { "Cache-Control": "no-store" } },
  );
}
