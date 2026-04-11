import { NextResponse } from "next/server";
import { loadHostRegistry } from "@/lib/host-runtime";

export async function GET() {
  try {
    const manifests = await loadHostRegistry();
    return NextResponse.json({
      ok: true,
      items: manifests.map((item) => ({
        id: item.manifest.id,
        slug: item.manifest.slug,
        version: item.manifest.version,
        categoryId: item.manifest.categoryId,
        entryPath: item.manifest.entryPath,
        accessScopeType: item.manifest.access.scopeType,
        paymentCapability: item.manifest.capabilities.payment,
        status: item.status
      }))
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load app registry";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
