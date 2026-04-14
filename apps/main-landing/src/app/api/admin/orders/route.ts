import { NextRequest, NextResponse } from "next/server";
import { listOrders } from "@factory/database";
import { enforceAdminScopes } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const authError = await enforceAdminScopes(request, ["orders:read"]);
  if (authError) {
    return authError;
  }

  try {
    const appRegistryId = request.nextUrl.searchParams.get("appRegistryId") ?? undefined;
    const userId = request.nextUrl.searchParams.get("userId") ?? undefined;
    const status = request.nextUrl.searchParams.get("status") as
      | "pending"
      | "paid"
      | "canceled"
      | "refunded"
      | null;

    const items = await listOrders({
      appRegistryId,
      userId,
      status: status ?? undefined
    });

    return NextResponse.json({ ok: true, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list orders";
    return NextResponse.json({ ok: false, code: "INTERNAL_ERROR", error: message }, { status: 500 });
  }
}
