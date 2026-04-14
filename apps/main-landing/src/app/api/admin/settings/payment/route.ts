import { NextRequest, NextResponse } from "next/server";
import { getAdminIdentity, enforceAdminScopes } from "@/lib/admin-auth";
import { getPlatformSetting, upsertPlatformSetting } from "@factory/database";

type PaymentPlatformSettings = {
  defaultPaymentCapability: "none" | "checkout";
  checkoutEnabled: boolean;
  callbackBaseUrl: string;
};

const DEFAULT_SETTINGS: PaymentPlatformSettings = {
  defaultPaymentCapability: "none",
  checkoutEnabled: true,
  callbackBaseUrl: ""
};

function validatePayload(payload: unknown): payload is PaymentPlatformSettings {
  if (!payload || typeof payload !== "object") return false;
  const row = payload as Record<string, unknown>;
  return (
    (row.defaultPaymentCapability === "none" || row.defaultPaymentCapability === "checkout") &&
    typeof row.checkoutEnabled === "boolean" &&
    typeof row.callbackBaseUrl === "string"
  );
}

export async function GET(request: NextRequest) {
  const authError = await enforceAdminScopes(request, ["metrics:read"]);
  if (authError) {
    return authError;
  }

  try {
    const value = await getPlatformSetting<PaymentPlatformSettings>("payment");
    return NextResponse.json({ ok: true, item: value ?? DEFAULT_SETTINGS });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get payment settings";
    return NextResponse.json({ ok: false, code: "INTERNAL_ERROR", error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const authError = await enforceAdminScopes(request, ["settings:write"]);
  if (authError) {
    return authError;
  }

  try {
    const identity = await getAdminIdentity(request);
    const body = (await request.json()) as unknown;
    if (!validatePayload(body)) {
      return NextResponse.json(
        { ok: false, code: "MANIFEST_INVALID", error: "Invalid payment settings payload" },
        { status: 400 }
      );
    }

    const saved = await upsertPlatformSetting({
      key: "payment",
      value: body,
      updatedBy: identity?.userId === "token-admin" ? null : identity?.userId ?? null
    });

    return NextResponse.json({ ok: true, item: saved.value_json });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update payment settings";
    return NextResponse.json({ ok: false, code: "INTERNAL_ERROR", error: message }, { status: 500 });
  }
}
